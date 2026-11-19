/**
 * Un correo dentro de un párrafo, sin partirlo a la mitad. Es una caja en línea: si no cabe en el renglón, baja
 * completo a uno propio; solo se parte si es más ancho que toda la columna (correos muy largos en 320 px).
 */
export function CorreoEnTexto({ correo }: { correo: string }) {
  return <strong className="inline-block max-w-full font-semibold text-marca-cafe [overflow-wrap:anywhere]">{correo}</strong>;
}
