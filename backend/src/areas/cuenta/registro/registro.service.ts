import { Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ErrorApi } from '../../../comun/errores/error-api';
import { esViolacionUnica } from '../../../comun/utilidades/errores-postgres';
import { ipDelCliente } from '../../../comun/utilidades/ip-cliente';
import { PrismaService } from '../../../infraestructura/base-de-datos/prisma.service';
import { CONFIGURACION } from '../../../infraestructura/configuracion/configuracion';
import type { Configuracion } from '../../../infraestructura/configuracion/configuracion';
import { CorreoService } from '../../../infraestructura/correo/correo.service';
import type { CodigoGenerado } from '../../../infraestructura/seguridad/codigos';
import { ContrasenasService } from '../../../infraestructura/seguridad/contrasenas.service';
import {
  correoVerificacion,
  correoYaTienesCuenta,
} from '../correos/correos-cuenta';
import { DocumentosService } from '../documentos/documentos.service';
import { EnlacesService } from '../enlaces/enlaces.service';
import { SesionService } from '../sesion/sesion.service';
import type { RegistroEntrada } from './registro.dto';

/** Lo que hay que mandar por correo cuando termina la transacción. */
type Envio =
  | { tipo: 'verificacion'; para: string; nombre: string; codigo: string }
  | {
      tipo: 'ya_tienes_cuenta';
      para: string;
      nombre: string;
      conContrasena: boolean;
    }
  | null;

/**
 * Registro con correo y verificación (OP-01, OP-02). REQUIERE REVISIÓN HUMANA.
 *
 * Los correos se mandan después de confirmar la transacción y sin esperar a Resend: la respuesta tarda lo mismo
 * exista o no la cuenta, y un fallo de Resend no cambia lo que ve el alumno (DEC-77).
 */
@Injectable()
export class RegistroService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contrasenas: ContrasenasService,
    private readonly documentos: DocumentosService,
    private readonly enlaces: EnlacesService,
    private readonly sesiones: SesionService,
    private readonly correo: CorreoService,
    @Inject(CONFIGURACION) private readonly configuracion: Configuracion,
  ) {}

  /**
   * registrarCuenta. La cuenta y sus dos aceptaciones se guardan juntas (INV-30).
   * - Correo con cuenta activa: no se crea nada y se manda «ya tienes cuenta» (DEC-77).
   * - Correo con cuenta pendiente: se borra y se crea la nueva (DEC-109).
   * Siempre se calcula el hash, para que el tiempo de respuesta no delate si el correo tiene cuenta.
   */
  async registrar(entrada: RegistroEntrada, peticion: Request): Promise<void> {
    const vigentes = await this.documentos.vigentes();
    const aviso = vigentes.aviso_privacidad;
    const terminos = vigentes.terminos;
    if (!aviso || !terminos) {
      throw new Error('No hay aviso de privacidad o términos publicados');
    }
    if (
      entrada.versionAviso !== aviso.version ||
      entrada.versionTerminos !== terminos.version
    ) {
      throw new ErrorApi('VERSION_NO_VIGENTE');
    }

    const hash = await this.contrasenas.crearHash(entrada.contrasena);
    const ip = ipDelCliente(peticion, this.configuracion.proxiesConfiables);

    let envio: Envio;
    try {
      envio = await this.prisma.$transaction(async (tx) => {
        const [existente] = await tx.$queryRaw<
          {
            nombre: string;
            estado: string;
            hash_contrasena: string | null;
          }[]
        >`
          SELECT nombre, estado, hash_contrasena FROM usuario
          WHERE correo = ${entrada.correo}
          FOR UPDATE`;

        if (existente) {
          const borrada =
            existente.estado === 'pendiente' &&
            (
              await tx.$queryRaw<{ borrada: boolean }[]>`
                SELECT fn_borrar_cuenta_pendiente(${entrada.correo}) AS borrada`
            )[0]?.borrada;
          if (!borrada) {
            return {
              tipo: 'ya_tienes_cuenta',
              para: entrada.correo,
              nombre: existente.nombre,
              conContrasena: existente.hash_contrasena !== null,
            };
          }
        }

        const [creado] = await tx.$queryRaw<{ id: string }[]>`
          INSERT INTO usuario (nombre, apellidos, correo, estado, hash_contrasena,
                               mayoria_edad_confirmada_en, negativa_encuesta, negativa_estadisticas)
          VALUES (${entrada.nombre}, ${entrada.apellidos}, ${entrada.correo}, 'pendiente', ${hash},
                  now(), ${entrada.negativaEncuesta === true}, ${entrada.negativaEstadisticas === true})
          RETURNING id`;
        await tx.$executeRaw`
          INSERT INTO aceptacion_documento (usuario_id, documento_id, direccion_ip)
          VALUES (${creado.id}::uuid, ${aviso.id}, ${ip}::inet),
                 (${creado.id}::uuid, ${terminos.id}, ${ip}::inet)`;
        const codigo = await this.enlaces.crear(
          tx,
          creado.id,
          'verificacion',
          entrada.correo,
        );
        return {
          tipo: 'verificacion',
          para: entrada.correo,
          nombre: entrada.nombre,
          codigo,
        };
      });
    } catch (error) {
      // Otro registro con el mismo correo ganó la carrera: misma respuesta, sin correo.
      if (esViolacionUnica(error, 'ux_usuario_correo')) return;
      throw error;
    }
    this.mandar(envio);
  }

  /** verificarCorreo: activa la cuenta y abre la sesión. Devuelve la sesión nueva. */
  async verificar(codigo: string, peticion: Request): Promise<CodigoGenerado> {
    return this.prisma.$transaction(async (tx) => {
      const enlace = await this.enlaces.usar(tx, codigo, 'verificacion');
      const [activada] = await tx.$queryRaw<{ id: string }[]>`
        UPDATE usuario
        SET estado = 'activo', correo_verificado_en = now()
        WHERE id = ${enlace.usuarioId}::uuid
          AND estado = 'pendiente'
          AND correo = ${enlace.correoDestino}
        RETURNING id`;
      if (!activada) {
        throw new ErrorApi('ENLACE_INVALIDO', { motivo: 'usado' });
      }
      return this.sesiones.crear(tx, activada.id, peticion);
    });
  }

  /** reenviarVerificacion: solo si hay una cuenta pendiente con ese correo; la respuesta es la misma siempre. */
  async reenviar(correo: string): Promise<void> {
    const envio = await this.prisma.$transaction(async (tx): Promise<Envio> => {
      const [pendiente] = await tx.$queryRaw<{ id: string; nombre: string }[]>`
        SELECT id, nombre FROM usuario
        WHERE correo = ${correo} AND estado = 'pendiente'
        FOR UPDATE`;
      if (!pendiente) return null;
      const codigo = await this.enlaces.crear(
        tx,
        pendiente.id,
        'verificacion',
        correo,
      );
      return {
        tipo: 'verificacion',
        para: correo,
        nombre: pendiente.nombre,
        codigo,
      };
    });
    this.mandar(envio);
  }

  private mandar(envio: Envio): void {
    if (!envio) return;
    const origen = this.configuracion.origenFrontend;
    const contenido =
      envio.tipo === 'verificacion'
        ? correoVerificacion(
            envio.nombre,
            this.enlaces.url(origen, 'verificacion', envio.codigo),
          )
        : correoYaTienesCuenta(envio.nombre, envio.conContrasena, origen);
    // Sin await: CorreoService nunca lanza y la respuesta no debe esperar a Resend.
    void this.correo.enviar(envio.tipo, envio.para, contenido);
  }
}
