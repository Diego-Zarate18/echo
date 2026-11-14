/** Zona horaria del sistema (INV-03): la base y la API usan UTC; las fechas se interpretan en hora de México. */
export const ZONA_MEXICO = 'America/Mexico_City';

const FORMATO_DIA = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_MEXICO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Fecha y hora para la API: ISO 8601 en UTC. */
export function aIsoUtc(fecha: Date): string {
  return fecha.toISOString();
}

/** Día calendario (AAAA-MM-DD) que corresponde a ese instante en hora de México. */
export function diaEnMexico(fecha: Date): string {
  return FORMATO_DIA.format(fecha);
}
