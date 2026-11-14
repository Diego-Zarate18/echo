import type { Request, Response } from 'express';
import { armarCookie, leerCookie } from '../../../comun/utilidades/cookies';
import type { CifradoService } from '../../../infraestructura/seguridad/cifrado.service';

/**
 * Cookies temporales del inicio con Google, cifradas y firmadas (DEC-112). HttpOnly, Secure, SameSite=Lax,
 * Path=/ y 10 minutos. SameSite=Lax deja que lleguen en la redirección de regreso de Google, que es una
 * navegación GET de primer nivel.
 */
export const COOKIE_ESTADO_GOOGLE = '__Host-echo_google_estado';
export const COOKIE_REGISTRO_GOOGLE = '__Host-echo_registro_google';
/** Reingreso con Google para eliminar la cuenta (OP-14, DEC-114): 5 minutos, atado a la sesión. */
export const COOKIE_REINGRESO_GOOGLE = '__Host-echo_reingreso_google';
export const VIGENCIA_MS = 10 * 60 * 1000;
export const VIGENCIA_REINGRESO_MS = 5 * 60 * 1000;

export type PropositoGoogle = 'entrar' | 'eliminar';

/** Lo que se guarda al ir a Google y se compara al volver. */
export interface EstadoGoogle {
  estado: string;
  nonce: string;
  verificador: string;
  proposito: PropositoGoogle;
  expiraEn: number;
}

/** Marca de que el alumno de esa sesión volvió a entrar con Google hace menos de 5 minutos. */
export interface ReingresoGoogle {
  sesionId: string;
  usuarioId: string;
  expiraEn: number;
}

/** Datos de Google de quien aún no tiene cuenta, hasta que acepte los documentos (OP-13). */
export interface RegistroGoogle {
  sub: string;
  correo: string;
  nombre: string;
  apellidos: string | null;
  expiraEn: number;
}

export function escribirCookieTemporal(
  respuesta: Response,
  cifrado: CifradoService,
  nombre: string,
  datos: EstadoGoogle | RegistroGoogle | ReingresoGoogle,
): void {
  const segundos = Math.max(1, Math.ceil((datos.expiraEn - Date.now()) / 1000));
  respuesta.append(
    'Set-Cookie',
    armarCookie(nombre, cifrado.cifrar(datos, nombre), segundos),
  );
}

export function borrarCookieTemporal(
  respuesta: Response,
  nombre: string,
): void {
  respuesta.append('Set-Cookie', armarCookie(nombre, '', 0));
}

/** Lee y descifra la cookie. null si no viene, fue alterada o ya venció. */
export function leerEstadoGoogle(
  peticion: Request,
  cifrado: CifradoService,
): EstadoGoogle | null {
  const valor = leerCookie(peticion, COOKIE_ESTADO_GOOGLE);
  const datos = valor
    ? (cifrado.descifrar(
        valor,
        COOKIE_ESTADO_GOOGLE,
      ) as Partial<EstadoGoogle> | null)
    : null;
  if (
    !datos ||
    typeof datos.estado !== 'string' ||
    typeof datos.nonce !== 'string' ||
    typeof datos.verificador !== 'string' ||
    (datos.proposito !== 'entrar' && datos.proposito !== 'eliminar') ||
    typeof datos.expiraEn !== 'number' ||
    datos.expiraEn <= Date.now()
  ) {
    return null;
  }
  return datos as EstadoGoogle;
}

export function leerRegistroGoogle(
  peticion: Request,
  cifrado: CifradoService,
): RegistroGoogle | null {
  const valor = leerCookie(peticion, COOKIE_REGISTRO_GOOGLE);
  const datos = valor
    ? (cifrado.descifrar(
        valor,
        COOKIE_REGISTRO_GOOGLE,
      ) as Partial<RegistroGoogle> | null)
    : null;
  if (
    !datos ||
    typeof datos.sub !== 'string' ||
    typeof datos.correo !== 'string' ||
    typeof datos.nombre !== 'string' ||
    (datos.apellidos !== null && typeof datos.apellidos !== 'string') ||
    typeof datos.expiraEn !== 'number' ||
    datos.expiraEn <= Date.now()
  ) {
    return null;
  }
  return datos as RegistroGoogle;
}

/** true si la petición trae la cookie del registro con Google, sea válida o no. */
export function traeRegistroGoogle(peticion: Request): boolean {
  return leerCookie(peticion, COOKIE_REGISTRO_GOOGLE) !== null;
}

export function leerReingresoGoogle(
  peticion: Request,
  cifrado: CifradoService,
): ReingresoGoogle | null {
  const valor = leerCookie(peticion, COOKIE_REINGRESO_GOOGLE);
  const datos = valor
    ? (cifrado.descifrar(
        valor,
        COOKIE_REINGRESO_GOOGLE,
      ) as Partial<ReingresoGoogle> | null)
    : null;
  if (
    !datos ||
    typeof datos.sesionId !== 'string' ||
    typeof datos.usuarioId !== 'string' ||
    typeof datos.expiraEn !== 'number' ||
    datos.expiraEn <= Date.now()
  ) {
    return null;
  }
  return datos as ReingresoGoogle;
}
