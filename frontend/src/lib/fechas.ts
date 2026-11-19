const ZONA_HORARIA = "America/Mexico_City";

const formatoFecha = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: ZONA_HORARIA,
});

/** Fecha en formato DD/MM/AAAA, en la hora de México (por ejemplo, «12/10/2026»). Si el texto no es una fecha, devuelve «». */
export function formatearFecha(iso: string): string {
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? "" : formatoFecha.format(fecha);
}

/** Porcentaje entero para mostrar. Se trunca (no se redondea) para no anunciar «100 %» antes de terminar. */
export function formatearPorcentaje(valor: number): string {
  return `${Math.floor(Math.min(100, Math.max(0, valor)))}\u00a0%`;
}
