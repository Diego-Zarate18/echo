/** Correo normalizado (DEC-60): sin espacios y en minúsculas. Un CHECK de la base lo exige. */
export function normalizarCorreo(valor: unknown): unknown {
  return typeof valor === 'string' ? valor.trim().toLowerCase() : valor;
}

/** Forma mínima de un correo: algo antes y después de la @ y un punto en el dominio, sin espacios. */
export const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Quita los espacios de los extremos de un texto; deja igual lo que no es texto. */
export function recortar(valor: unknown): unknown {
  return typeof valor === 'string' ? valor.trim() : valor;
}
