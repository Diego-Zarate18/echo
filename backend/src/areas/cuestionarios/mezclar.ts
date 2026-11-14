/**
 * Mezcla determinista: la misma semilla da siempre el mismo orden (DEC-09). Fisher-Yates con mulberry32, que basta
 * para ordenar preguntas y opciones; no se usa para nada criptográfico.
 */
function aleatorioConSemilla(semilla: number): () => number {
  let estado = semilla >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mezclar<T>(lista: readonly T[], semilla: number): T[] {
  const azar = aleatorioConSemilla(semilla);
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}
