import { Inject, Injectable } from '@nestjs/common';
import { ErrorApi } from '../../../comun/errores/error-api';
import { PrismaService } from '../../../infraestructura/base-de-datos/prisma.service';
import { CONFIGURACION } from '../../../infraestructura/configuracion/configuracion';
import type { Configuracion } from '../../../infraestructura/configuracion/configuracion';
import { CorreoService } from '../../../infraestructura/correo/correo.service';
import { ContrasenasService } from '../../../infraestructura/seguridad/contrasenas.service';
import { correoRecuperacion } from '../correos/correos-cuenta';
import { EnlacesService } from '../enlaces/enlaces.service';
import { SesionService } from '../sesion/sesion.service';

/** Recuperación de la contraseña (OP-06, OP-07). REQUIERE REVISIÓN HUMANA. */
@Injectable()
export class ContrasenaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contrasenas: ContrasenasService,
    private readonly enlaces: EnlacesService,
    private readonly sesiones: SesionService,
    private readonly correo: CorreoService,
    @Inject(CONFIGURACION) private readonly configuracion: Configuracion,
  ) {}

  /**
   * solicitarRecuperacion: manda el enlace solo a una cuenta activa con contraseña (DEC-111). La respuesta es
   * la misma siempre y no espera a Resend (DEC-77).
   */
  async solicitar(correo: string): Promise<void> {
    const envio = await this.prisma.$transaction(async (tx) => {
      const [cuenta] = await tx.$queryRaw<{ id: string; nombre: string }[]>`
        SELECT id, nombre FROM usuario
        WHERE correo = ${correo} AND estado = 'activo' AND hash_contrasena IS NOT NULL
        FOR UPDATE`;
      if (!cuenta) return null;
      const codigo = await this.enlaces.crear(
        tx,
        cuenta.id,
        'recuperacion',
        correo,
      );
      return { nombre: cuenta.nombre, codigo };
    });
    if (!envio) return;
    const url = this.enlaces.url(
      this.configuracion.origenFrontend,
      'recuperacion',
      envio.codigo,
    );
    void this.correo.enviar(
      'recuperacion',
      correo,
      correoRecuperacion(envio.nombre, url),
    );
  }

  /**
   * restablecerContrasena: guarda la contraseña nueva, quita la pausa por fallos y cierra todas las sesiones
   * (DEC-12). El hash se calcula antes de abrir la transacción, que no debe esperar a Argon2.
   */
  async restablecer(codigo: string, contrasena: string): Promise<void> {
    const hash = await this.contrasenas.crearHash(contrasena);
    await this.prisma.$transaction(async (tx) => {
      const enlace = await this.enlaces.usar(tx, codigo, 'recuperacion');
      const [cambiada] = await tx.$queryRaw<{ id: string }[]>`
        UPDATE usuario
        SET hash_contrasena = ${hash}, intentos_fallidos = 0, bloqueado_hasta = NULL
        WHERE id = ${enlace.usuarioId}::uuid
          AND estado = 'activo'
          AND hash_contrasena IS NOT NULL
          AND correo = ${enlace.correoDestino}
        RETURNING id`;
      if (!cambiada) {
        throw new ErrorApi('ENLACE_INVALIDO', { motivo: 'vencido' });
      }
      await this.sesiones.revocarTodas(cambiada.id, tx);
    });
  }
}
