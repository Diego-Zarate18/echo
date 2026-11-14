import type { Request, Response } from 'express';
import { armarCookie, leerCookie } from '../../../comun/utilidades/cookies';

/** Cookie de sesión (DEC-85): __Host-echo_sesion; HttpOnly; Secure; SameSite=Lax; Path=/, sin Domain. */
export const COOKIE_SESION = '__Host-echo_sesion';

/** Valor de la cookie de sesión tal como llegó, o null si la petición no la trae. */
export function leerCookieSesion(peticion: Request): string | null {
  return leerCookie(peticion, COOKIE_SESION);
}

/** Entrega al navegador el código de una sesión recién creada. */
export function escribirCookieSesion(
  respuesta: Response,
  codigo: string,
): void {
  respuesta.append('Set-Cookie', armarCookie(COOKIE_SESION, codigo));
}

/** Borra la cookie de sesión del navegador (Max-Age=0). */
export function borrarCookieSesion(respuesta: Response): void {
  respuesta.append('Set-Cookie', armarCookie(COOKIE_SESION, '', 0));
}
