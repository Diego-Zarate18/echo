import { Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { AlumnoSesion } from '../../../comun/decoradores/alumno-actual';
import { ErrorApi } from '../../../comun/errores/error-api';
import type { CodigoCampo } from '../../../comun/errores/error-api';
import { esViolacionUnica } from '../../../comun/utilidades/errores-postgres';
import { ipDelCliente } from '../../../comun/utilidades/ip-cliente';
import type { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infraestructura/base-de-datos/prisma.service';
import { CONFIGURACION } from '../../../infraestructura/configuracion/configuracion';
import type { Configuracion } from '../../../infraestructura/configuracion/configuracion';
import type { CodigoGenerado } from '../../../infraestructura/seguridad/codigos';
import { DocumentosService } from '../documentos/documentos.service';
import type {
  DocumentoVigente,
  TipoDocumentoBd,
} from '../documentos/documentos.service';
import type { RegistroGoogle } from '../google/cookies-google';
import { SesionService } from '../sesion/sesion.service';
import type { AceptacionEntrada } from './aceptacion.dto';

const CAMPOS: Record<
  TipoDocumentoBd,
  {
    version: 'versionAviso' | 'versionTerminos';
    casilla: 'aceptaAviso' | 'aceptaTerminos';
  }
> = {
  aviso_privacidad: { version: 'versionAviso', casilla: 'aceptaAviso' },
  terminos: { version: 'versionTerminos', casilla: 'aceptaTerminos' },
};

/**
 * Aceptar el aviso de privacidad y los términos (OP-13, DEC-28, INV-30). REQUIERE REVISIÓN HUMANA.
 * La fecha la pone la base y la IP sale de la petición, nunca del cuerpo.
 */
@Injectable()
export class AceptacionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentos: DocumentosService,
    private readonly sesiones: SesionService,
    @Inject(CONFIGURACION) private readonly configuracion: Configuracion,
  ) {}

  /** Caso 2: versión nueva que pide aceptación, con sesión. Basta aceptar los documentos pendientes. */
  async aceptarPendientes(
    alumno: AlumnoSesion,
    entrada: AceptacionEntrada,
    peticion: Request,
  ): Promise<void> {
    const tipos: TipoDocumentoBd[] = [];
    if (alumno.aceptacionPendiente.aviso) tipos.push('aviso_privacidad');
    if (alumno.aceptacionPendiente.terminos) tipos.push('terminos');
    this.validar(entrada, tipos, false);
    if (tipos.length === 0) return;
    const documentos = await this.vigentesAceptadas(entrada, tipos);
    await this.registrar(this.prisma, alumno.usuarioId, documentos, peticion);
  }

  /**
   * Caso 1: primera entrada con Google. Crea la cuenta activa con sus aceptaciones, la mayoría de edad y las
   * negativas, y abre la sesión, todo en una transacción (INV-30). Una cuenta pendiente con el mismo correo se
   * borra (DEC-93); una activa sin Google se vincula (DEC-23).
   */
  async crearCuentaGoogle(
    google: RegistroGoogle,
    entrada: AceptacionEntrada,
    peticion: Request,
  ): Promise<CodigoGenerado> {
    const tipos: TipoDocumentoBd[] = ['aviso_privacidad', 'terminos'];
    this.validar(entrada, tipos, true);
    const documentos = await this.vigentesAceptadas(entrada, tipos);

    try {
      return await this.prisma.$transaction(async (tx) => {
        let usuarioId: string | null = null;
        const [porSub] = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM usuario
          WHERE google_sub = ${google.sub} AND estado = 'activo'
          FOR UPDATE`;
        usuarioId = porSub?.id ?? null;

        if (!usuarioId) {
          const [porCorreo] = await tx.$queryRaw<
            { id: string; estado: string; google_sub: string | null }[]
          >`
            SELECT id, estado, google_sub FROM usuario
            WHERE correo = ${google.correo}
            FOR UPDATE`;
          if (porCorreo?.estado === 'activo') {
            if (porCorreo.google_sub !== null) {
              throw new ErrorApi('REGISTRO_GOOGLE_VENCIDO');
            }
            await tx.$executeRaw`
              UPDATE usuario SET google_sub = ${google.sub}
              WHERE id = ${porCorreo.id}::uuid`;
            usuarioId = porCorreo.id;
          } else if (porCorreo) {
            await tx.$queryRaw`
              SELECT fn_borrar_cuenta_pendiente(${google.correo})::text AS borrada`;
          }
        }

        if (!usuarioId) {
          const [creado] = await tx.$queryRaw<{ id: string }[]>`
            INSERT INTO usuario (nombre, apellidos, correo, correo_verificado_en, estado, google_sub,
                                 mayoria_edad_confirmada_en, negativa_encuesta, negativa_estadisticas)
            VALUES (${google.nombre}, ${google.apellidos}, ${google.correo}, now(), 'activo', ${google.sub},
                    now(), ${entrada.negativaEncuesta === true}, ${entrada.negativaEstadisticas === true})
            RETURNING id`;
          usuarioId = creado.id;
        }

        await this.registrar(tx, usuarioId, documentos, peticion);
        return this.sesiones.crear(tx, usuarioId, peticion);
      });
    } catch (error) {
      // Otra pestaña creó la cuenta al mismo tiempo: hay que volver a entrar con Google.
      if (esViolacionUnica(error))
        throw new ErrorApi('REGISTRO_GOOGLE_VENCIDO');
      throw error;
    }
  }

  /** Casillas y versiones de los documentos que se aceptan; en el caso de Google, también la mayoría de edad. */
  private validar(
    entrada: AceptacionEntrada,
    tipos: TipoDocumentoBd[],
    conMayoriaDeEdad: boolean,
  ): void {
    const campos: Record<string, CodigoCampo> = {};
    for (const tipo of tipos) {
      const { version, casilla } = CAMPOS[tipo];
      if (entrada[version] === undefined) campos[version] = 'OBLIGATORIO';
      if (entrada[casilla] !== true) campos[casilla] = 'CASILLA_OBLIGATORIA';
    }
    if (conMayoriaDeEdad && entrada.mayorDeEdad !== true) {
      campos.mayorDeEdad = 'CASILLA_OBLIGATORIA';
    }
    if (Object.keys(campos).length > 0) {
      throw new ErrorApi('DATOS_INVALIDOS', { campos });
    }
  }

  /** Las versiones aceptadas deben ser las vigentes (VERSION_NO_VIGENTE). */
  private async vigentesAceptadas(
    entrada: AceptacionEntrada,
    tipos: TipoDocumentoBd[],
  ): Promise<DocumentoVigente[]> {
    const vigentes = await this.documentos.vigentes();
    return tipos.map((tipo) => {
      const vigente = vigentes[tipo];
      if (!vigente) throw new Error(`No hay ${tipo} publicado`);
      if (entrada[CAMPOS[tipo].version] !== vigente.version) {
        throw new ErrorApi('VERSION_NO_VIGENTE');
      }
      return vigente;
    });
  }

  private async registrar(
    cliente: Pick<Prisma.TransactionClient, '$executeRaw'>,
    usuarioId: string,
    documentos: DocumentoVigente[],
    peticion: Request,
  ): Promise<void> {
    const ip = ipDelCliente(peticion, this.configuracion.proxiesConfiables);
    for (const documento of documentos) {
      await cliente.$executeRaw`
        INSERT INTO aceptacion_documento (usuario_id, documento_id, direccion_ip)
        VALUES (${usuarioId}::uuid, ${documento.id}, ${ip}::inet)
        ON CONFLICT (usuario_id, documento_id) DO NOTHING`;
    }
  }
}
