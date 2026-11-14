import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Códigos de un solo uso y de sesión (DEC-12, INV-08): 32 bytes aleatorios en base64url. El código solo viaja en
 * la cookie o en el enlace del correo; en la base se guarda su huella SHA-256 y nunca se escribe en los registros.
 */
export interface CodigoGenerado {
  /** Valor que se entrega al alumno (cookie o enlace). No se guarda ni se registra. */
  codigo: string;
  /** Huella SHA-256 en hexadecimal: lo único que se guarda en la base. */
  huella: string;
}

const FORMATO_CODIGO = /^[A-Za-z0-9_-]{43}$/;

export function generarCodigo(): CodigoGenerado {
  const codigo = randomBytes(32).toString('base64url');
  return { codigo, huella: huellaDeCodigo(codigo) };
}

export function huellaDeCodigo(codigo: string): string {
  return createHash('sha256').update(codigo, 'utf8').digest('hex');
}

/** true si el texto tiene la forma de un código generado aquí; evita consultar la base con basura. */
export function esCodigoBienFormado(valor: unknown): valor is string {
  return typeof valor === 'string' && FORMATO_CODIGO.test(valor);
}

/** Compara dos textos sin que el tiempo de respuesta delate en qué posición difieren. */
export function compararEnTiempoConstante(a: string, b: string): boolean {
  const huellaA = createHash('sha256').update(a, 'utf8').digest();
  const huellaB = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(huellaA, huellaB);
}
