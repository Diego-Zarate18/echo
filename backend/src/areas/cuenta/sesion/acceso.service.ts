import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ErrorApi } from '../../../comun/errores/error-api';
import { PrismaService } from '../../../infraestructura/base-de-datos/prisma.service';
import type { CodigoGenerado } from '../../../infraestructura/seguridad/codigos';
import { ContrasenasService } from '../../../infraestructura/seguridad/contrasenas.service';
import { SesionService } from './sesion.service';

/** DEC-26: tras 5 fallos seguidos, la cuenta se pausa 15 minutos. */
const FALLOS_ANTES_DE_PAUSA = 5;

/**
 * Inicio de sesión con correo y contraseña (OP-04). REQUIERE REVISIÓN HUMANA.
 *
 * Reglas (DEC-26, DEC-77, INV-28):
 * - Correo inexistente, cuenta sin contraseña, contraseña equivocada y cuenta en pausa dan el mismo error,
 *   CREDENCIALES_INVALIDAS, y siempre se calcula un hash Argon2 para que el tiempo no delate nada.
 * - El intento se cuenta ANTES de revisar la contraseña, en una sola sentencia que también pone la pausa al
 *   llegar a 5. Así, aunque lleguen muchas peticiones al mismo tiempo, ninguna revisa la contraseña después
 *   del 5.º fallo. Si la contraseña resulta correcta, el contador vuelve a cero.
 * - Durante la pausa no se revisa la contraseña ni se alarga el plazo.
 * - CORREO_SIN_VERIFICAR solo con la contraseña correcta y sin pausa.
 */
@Injectable()
export class AccesoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contrasenas: ContrasenasService,
    private readonly sesiones: SesionService,
  ) {}

  async iniciarSesion(
    correo: string,
    contrasena: string,
    peticion: Request,
  ): Promise<CodigoGenerado> {
    const [cuenta] = await this.prisma.$queryRaw<
      { id: string; estado: string; hash_contrasena: string | null }[]
    >`
      SELECT id, estado, hash_contrasena FROM usuario
      WHERE correo = ${correo} AND estado IN ('activo', 'pendiente')`;

    if (!cuenta?.hash_contrasena) {
      await this.contrasenas.verificarContraRelleno(contrasena);
      throw new ErrorApi('CREDENCIALES_INVALIDAS');
    }

    // Cuenta el intento si la cuenta no está en pausa. Un bloqueo vencido reinicia el contador.
    const [intento] = await this.prisma.$queryRaw<{ fallos: number }[]>`
      UPDATE usuario
      SET intentos_fallidos =
            (CASE WHEN bloqueado_hasta <= now() THEN 0 ELSE intentos_fallidos END) + 1,
          bloqueado_hasta = CASE
            WHEN (CASE WHEN bloqueado_hasta <= now() THEN 0 ELSE intentos_fallidos END) + 1
                 >= ${FALLOS_ANTES_DE_PAUSA}
              THEN now() + interval '15 minutes'
            ELSE NULL
          END
      WHERE id = ${cuenta.id}::uuid
        AND (bloqueado_hasta IS NULL OR bloqueado_hasta <= now())
      RETURNING intentos_fallidos AS fallos`;

    if (!intento) {
      // En pausa: no se revisa la contraseña, pero se gasta el mismo tiempo.
      await this.contrasenas.verificarContraRelleno(contrasena);
      throw new ErrorApi('CREDENCIALES_INVALIDAS');
    }

    const resultado = await this.contrasenas.verificar(
      cuenta.hash_contrasena,
      contrasena,
    );
    if (!resultado.valida) throw new ErrorApi('CREDENCIALES_INVALIDAS');

    // Contraseña correcta: no cuenta como fallo, aunque el correo no esté verificado.
    const nuevoHash = resultado.requiereRehash
      ? await this.contrasenas.crearHash(contrasena)
      : null;
    await this.prisma.$executeRaw`
      UPDATE usuario
      SET intentos_fallidos = 0,
          bloqueado_hasta = NULL,
          hash_contrasena = coalesce(${nuevoHash}, hash_contrasena)
      WHERE id = ${cuenta.id}::uuid`;

    if (cuenta.estado !== 'activo') throw new ErrorApi('CORREO_SIN_VERIFICAR');

    await this.sesiones.revocarLaDeLaPeticion(peticion);
    return this.sesiones.crear(this.prisma, cuenta.id, peticion);
  }
}
