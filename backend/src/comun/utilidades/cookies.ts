import type { Request } from 'express';

/**
 * Lectura y escritura de cookies sin dependencias. Las cookies del servidor usan el prefijo __Host-, que obliga
 * al navegador a aceptarlas solo con Secure, Path=/ y sin Domain (DEC-85).
 */
export function leerCookie(peticion: Request, nombre: string): string | null {
  const encabezado = peticion.headers.cookie;
  if (!encabezado) return null;
  for (const parte of encabezado.split(';')) {
    const separador = parte.indexOf('=');
    if (separador === -1) continue;
    if (parte.slice(0, separador).trim() === nombre) {
      return parte.slice(separador + 1).trim();
    }
  }
  return null;
}

/** Arma el valor de Set-Cookie. Sin maxAgeSegundos la cookie dura lo que la sesión del navegador. */
export function armarCookie(
  nombre: string,
  valor: string,
  maxAgeSegundos?: number,
): string {
  const atributos = [
    `${nombre}=${valor}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ];
  if (maxAgeSegundos !== undefined) atributos.push(`Max-Age=${maxAgeSegundos}`);
  return atributos.join('; ');
}
