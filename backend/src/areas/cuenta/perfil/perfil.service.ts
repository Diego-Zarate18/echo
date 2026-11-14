import { Inject, Injectable } from '@nestjs/common';
import type {
  AlumnoSesion,
  MetodoAcceso,
} from '../../../comun/decoradores/alumno-actual';
import { ErrorApi } from '../../../comun/errores/error-api';
import { esViolacionUnica } from '../../../comun/utilidades/errores-postgres';
import { FuncionesBdService } from '../../../infraestructura/base-de-datos/funciones-bd.service';
import { PrismaService } from '../../../infraestructura/base-de-datos/prisma.service';
import { CONFIGURACION } from '../../../infraestructura/configuracion/configuracion';
import type { Configuracion } from '../../../infraestructura/configuracion/configuracion';
import { CorreoService } from '../../../infraestructura/correo/correo.service';
import { ContrasenasService } from '../../../infraestructura/seguridad/contrasenas.service';
import {
  correoAvisoCambioCorreo,
  correoCambioCorreo,
} from '../correos/correos-cuenta';
import { TIPO_API } from '../documentos/documentos.service';
import type { TipoDocumentoBd } from '../documentos/documentos.service';
import { EnlacesService } from '../enlaces/enlaces.service';
import { SesionService } from '../sesion/sesion.service';
import type { PreferenciasEntrada } from './perfil.dto';

/** Esquema Preferencias. */
export interface PreferenciasSalida {
  negativaEncuesta: boolean;
  negativaEstadisticas: boolean;
}

/** Esquema Perfil. Las aceptaciones no llevan la IP (OP-08). */
export interface PerfilSalida {
  nombre: string;
  apellidos: string | null;
  correo: string;
  metodoAcceso: MetodoAcceso;
  registradoEn: string;
  preferencias: PreferenciasSalida;
  aceptaciones: { documento: string; version: string; aceptadoEn: string }[];
}

interface Cuenta {
  hash: string | null;
  googleSub: string | null;
}

/** Perfil del alumno (OP-08 a OP-12, OP-14, OP-39, OP-41). REQUIERE REVISIÓN HUMANA. Solo datos propios (INV-07). */
@Injectable()
export class PerfilService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly funciones: FuncionesBdService,
    private readonly contrasenas: ContrasenasService,
    private readonly enlaces: EnlacesService,
    private readonly sesiones: SesionService,
    private readonly correo: CorreoService,
    @Inject(CONFIGURACION) private readonly configuracion: Configuracion,
  ) {}

  /** obtenerPerfil. */
  async obtener(usuarioId: string): Promise<PerfilSalida> {
    const [usuario] = await this.prisma.$queryRaw<
      {
        nombre: string;
        apellidos: string | null;
        correo: string;
        creado_en: Date;
        con_contrasena: boolean;
        con_google: boolean;
        negativa_encuesta: boolean;
        negativa_estadisticas: boolean;
      }[]
    >`
      SELECT nombre, apellidos, correo, creado_en,
             (hash_contrasena IS NOT NULL) AS con_contrasena, (google_sub IS NOT NULL) AS con_google,
             negativa_encuesta, negativa_estadisticas
      FROM usuario WHERE id = ${usuarioId}::uuid AND estado = 'activo'`;
    if (!usuario) throw new ErrorApi('NO_AUTENTICADO');
    const aceptaciones = await this.prisma.$queryRaw<
      { tipo: TipoDocumentoBd; version: string; aceptado_en: Date }[]
    >`
      SELECT d.tipo, d.version, a.aceptado_en
      FROM aceptacion_documento a JOIN documento_legal d ON d.id = a.documento_id
      WHERE a.usuario_id = ${usuarioId}::uuid
      ORDER BY a.aceptado_en, d.tipo`;
    return {
      nombre: usuario.nombre,
      apellidos: usuario.apellidos,
      correo: usuario.correo,
      metodoAcceso:
        usuario.con_contrasena && usuario.con_google
          ? 'ambos'
          : usuario.con_google
            ? 'google'
            : 'correo',
      registradoEn: usuario.creado_en.toISOString(),
      preferencias: {
        negativaEncuesta: usuario.negativa_encuesta,
        negativaEstadisticas: usuario.negativa_estadisticas,
      },
      aceptaciones: aceptaciones.map((a) => ({
        documento: TIPO_API[a.tipo],
        version: a.version,
        aceptadoEn: a.aceptado_en.toISOString(),
      })),
    };
  }

  /** editarNombre (OP-09). */
  async editarNombre(
    usuarioId: string,
    nombre: string,
    apellidos: string,
  ): Promise<PerfilSalida> {
    await this.prisma.$executeRaw`
      UPDATE usuario SET nombre = ${nombre}, apellidos = ${apellidos}
      WHERE id = ${usuarioId}::uuid AND estado = 'activo'`;
    return this.obtener(usuarioId);
  }

  /** cambiarPreferenciasPrivacidad (OP-39): aplica de inmediato. */
  async cambiarPreferencias(
    usuarioId: string,
    entrada: PreferenciasEntrada,
  ): Promise<PreferenciasSalida> {
    if (
      entrada.negativaEncuesta === undefined &&
      entrada.negativaEstadisticas === undefined
    ) {
      throw new ErrorApi('DATOS_INVALIDOS', {
        campos: { negativaEncuesta: 'OBLIGATORIO' },
      });
    }
    const encuesta = entrada.negativaEncuesta ?? null;
    const estadisticas = entrada.negativaEstadisticas ?? null;
    const [fila] = await this.prisma.$queryRaw<
      { negativa_encuesta: boolean; negativa_estadisticas: boolean }[]
    >`
      UPDATE usuario
      SET negativa_encuesta = coalesce(${encuesta}::boolean, negativa_encuesta),
          negativa_estadisticas = coalesce(${estadisticas}::boolean, negativa_estadisticas)
      WHERE id = ${usuarioId}::uuid AND estado = 'activo'
      RETURNING negativa_encuesta, negativa_estadisticas`;
    if (!fila) throw new ErrorApi('NO_AUTENTICADO');
    return {
      negativaEncuesta: fila.negativa_encuesta,
      negativaEstadisticas: fila.negativa_estadisticas,
    };
  }

  /**
   * cambiarContrasena (OP-10, DEC-25): solo cuentas con contraseña; pide la actual y cierra las demás sesiones.
   * La sesión desde la que se cambia sigue abierta.
   */
  async cambiarContrasena(
    alumno: AlumnoSesion,
    actual: string,
    nueva: string,
  ): Promise<void> {
    const cuenta = await this.cuenta(alumno.usuarioId);
    if (!cuenta.hash) throw new ErrorApi('NO_DISPONIBLE_CON_GOOGLE');
    await this.exigirContrasena(cuenta.hash, actual);
    const hash = await this.contrasenas.crearHash(nueva);
    await this.prisma.$executeRaw`
      UPDATE usuario SET hash_contrasena = ${hash}
      WHERE id = ${alumno.usuarioId}::uuid AND estado = 'activo'`;
    await this.sesiones.revocarLasDemas(alumno.usuarioId, alumno.sesionId);
  }

  /**
   * cambiarCorreo (OP-11): solo cuentas sin Google; pide la contraseña. La respuesta es la misma siempre (DEC-77):
   * si el correo nuevo ya tiene cuenta, solo se avisa a esa dirección; si no, le llega el enlace de 30 minutos.
   */
  async pedirCambioCorreo(
    alumno: AlumnoSesion,
    correoNuevo: string,
    contrasena: string,
  ): Promise<void> {
    const cuenta = await this.cuenta(alumno.usuarioId);
    if (cuenta.googleSub || !cuenta.hash) {
      throw new ErrorApi('NO_DISPONIBLE_CON_GOOGLE');
    }
    await this.exigirContrasena(cuenta.hash, contrasena);

    const origen = this.configuracion.origenFrontend;
    const codigo = await this.prisma.$transaction(async (tx) => {
      const [ocupado] = await tx.$queryRaw<{ existe: boolean }[]>`
        SELECT EXISTS (SELECT 1 FROM usuario WHERE correo = ${correoNuevo}) AS existe`;
      if (ocupado?.existe) return null;
      return this.enlaces.crear(
        tx,
        alumno.usuarioId,
        'cambio_correo',
        correoNuevo,
      );
    });

    // Sin await: la respuesta no espera a Resend (DEC-77).
    if (codigo) {
      void this.correo.enviar(
        'cambio_correo',
        correoNuevo,
        correoCambioCorreo(
          alumno.nombre,
          this.enlaces.url(origen, 'cambio_correo', codigo),
        ),
      );
    } else {
      void this.correo.enviar(
        'aviso_cambio_correo',
        correoNuevo,
        correoAvisoCambioCorreo(origen),
      );
    }
  }

  /**
   * confirmarCambioCorreo (OP-12): no pide sesión, porque el enlace puede abrirse en otro dispositivo. Si el correo
   * ya no está libre, o la cuenta ya no puede cambiarlo, responde ENLACE_INVALIDO y el enlace no se gasta.
   */
  async confirmarCambioCorreo(codigo: string): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const enlace = await this.enlaces.usar(tx, codigo, 'cambio_correo');
        const [cambiado] = await tx.$queryRaw<{ id: string }[]>`
          UPDATE usuario
          SET correo = ${enlace.correoDestino}, correo_verificado_en = now()
          WHERE id = ${enlace.usuarioId}::uuid
            AND estado = 'activo'
            AND google_sub IS NULL
            AND NOT EXISTS (SELECT 1 FROM usuario otro WHERE otro.correo = ${enlace.correoDestino})
          RETURNING id`;
        if (!cambiado) {
          throw new ErrorApi('ENLACE_INVALIDO', { motivo: 'vencido' });
        }
      });
    } catch (error) {
      if (esViolacionUnica(error)) {
        throw new ErrorApi('ENLACE_INVALIDO', { motivo: 'vencido' });
      }
      throw error;
    }
  }

  /** exportarMisDatos (OP-41, DEC-94): el documento lo arma fn_exportar_datos_usuario. */
  exportar(usuarioId: string): Promise<unknown> {
    return this.funciones.exportarDatosUsuario(usuarioId);
  }

  /**
   * eliminarCuenta (OP-14, DEC-27): con contraseña, la pide; sin contraseña (solo Google), exige el reingreso con
   * Google de menos de 5 minutos, que revisa quien llama (DEC-114). No se puede deshacer.
   */
  async eliminar(
    alumno: AlumnoSesion,
    contrasena: string | undefined,
    reingresoValido: boolean,
  ): Promise<void> {
    const cuenta = await this.cuenta(alumno.usuarioId);
    if (cuenta.hash) {
      if (!contrasena) {
        throw new ErrorApi('DATOS_INVALIDOS', {
          campos: { contrasena: 'OBLIGATORIO' },
        });
      }
      await this.exigirContrasena(cuenta.hash, contrasena);
    } else if (!reingresoValido) {
      throw new ErrorApi('REINGRESO_REQUERIDO');
    }
    await this.funciones.anonimizarUsuario(alumno.usuarioId);
  }

  private async cuenta(usuarioId: string): Promise<Cuenta> {
    const [fila] = await this.prisma.$queryRaw<
      { hash_contrasena: string | null; google_sub: string | null }[]
    >`
      SELECT hash_contrasena, google_sub FROM usuario
      WHERE id = ${usuarioId}::uuid AND estado = 'activo'`;
    if (!fila) throw new ErrorApi('NO_AUTENTICADO');
    return { hash: fila.hash_contrasena, googleSub: fila.google_sub };
  }

  private async exigirContrasena(
    hash: string,
    contrasena: string,
  ): Promise<void> {
    const resultado = await this.contrasenas.verificar(hash, contrasena);
    if (!resultado.valida) throw new ErrorApi('CONTRASENA_INCORRECTA');
  }
}
