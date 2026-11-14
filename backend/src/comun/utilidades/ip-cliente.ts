import { isIP } from 'node:net';
import type { Request } from 'express';

/**
 * IP del cliente según DEC-92. Con proxies de confianza se toma de X-Forwarded-For la entrada que agregó el
 * primer proxy propio, contando desde la derecha; nunca la primera, que escribe el cliente y se puede falsificar.
 * Sin proxies de confianza (desarrollo), sin encabezado o con una entrada inválida se usa la dirección del socket.
 */
export function ipDelCliente(
  peticion: Request,
  proxiesConfiables: number,
): string {
  const delSocket =
    normalizarIp(peticion.socket.remoteAddress ?? '') ?? '0.0.0.0';
  if (proxiesConfiables <= 0) return delSocket;

  const encabezado = peticion.headers['x-forwarded-for'];
  const texto = Array.isArray(encabezado)
    ? encabezado.join(',')
    : (encabezado ?? '');
  const entradas = texto
    .split(',')
    .map((entrada) => entrada.trim())
    .filter((entrada) => entrada.length > 0);
  if (entradas.length < proxiesConfiables) return delSocket;

  return (
    normalizarIp(entradas[entradas.length - proxiesConfiables]) ?? delSocket
  );
}

/** Devuelve la IP en forma canónica (IPv4 sin el prefijo ::ffff:), o null si no es una IP. */
export function normalizarIp(valor: string): string | null {
  const sinPrefijo = valor.toLowerCase().startsWith('::ffff:')
    ? valor.slice(7)
    : valor;
  if (isIP(sinPrefijo) === 4) return sinPrefijo;
  if (isIP(valor) === 6) return valor.toLowerCase();
  return null;
}
