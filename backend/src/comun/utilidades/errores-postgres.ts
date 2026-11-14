/**
 * true si el error (de Prisma o del adaptador pg) es una violación de una llave única. Si se indica, también
 * comprueba el nombre de la restricción. Recorre el error sin depender de sus clases.
 */
export function esViolacionUnica(
  error: unknown,
  restriccion?: string,
): boolean {
  let actual: unknown = error;
  for (
    let nivel = 0;
    nivel < 6 && actual && typeof actual === 'object';
    nivel++
  ) {
    const objeto = actual as Record<string, unknown>;
    const unica =
      objeto.code === 'P2002' ||
      objeto.code === '23505' ||
      objeto.kind === 'UniqueConstraintViolation';
    if (unica) {
      if (!restriccion) return true;
      return JSON.stringify(objeto).includes(restriccion);
    }
    const meta = objeto.meta as Record<string, unknown> | undefined;
    actual = meta?.driverAdapterError ?? objeto.cause;
  }
  return false;
}
