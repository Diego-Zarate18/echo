/**
 * Datos fijos del Aviso de privacidad (SCR-05, DEC-28, DEC-68).
 * El texto legal lo redactó el equipo a partir del grafo; debe revisarlo el docente antes de publicarse.
 */

/**
 * PEND-12: correo de contacto para solicitudes ARCO. Mientras siga pendiente vale `null` y la página
 * muestra el espacio reservado. Cuando se decida, se escribe aquí y en ningún otro lugar.
 */
export const CORREO_ARCO: string | null = null;

/** Texto visible mientras PEND-12 siga pendiente (como en Figma, 84:751). */
export const TEXTO_CORREO_ARCO_PENDIENTE = "[correo de contacto ARCO · pendiente]";

/** Última actualización del aviso (DD/MM/AAAA, como pide CLAUDE.md, y en ISO para `<time>`). */
export const ULTIMA_ACTUALIZACION = { texto: "21/10/2026", iso: "2026-10-21" } as const;

/** `SCR-05 › detalles.texto_piloto` del grafo v1.3.1 (DEC-78). */
export const TEXTO_PILOTO = "Echo es un piloto académico de la UP Chiapas vigente hasta diciembre de 2026.";

/** Apartados del aviso, en el orden de Figma (84:735). El `id` es el ancla del índice. */
export const apartadosAviso = [
  { id: "responsable", titulo: "Quién es responsable de tus datos" },
  { id: "datos", titulo: "Qué datos recabamos" },
  { id: "finalidades", titulo: "Para qué los usamos" },
  { id: "encargados", titulo: "Con quién los compartimos" },
  { id: "derechos-arco", titulo: "Tus derechos ARCO" },
  { id: "conservacion", titulo: "Cuánto tiempo los conservamos" },
  { id: "consentimiento", titulo: "Consentimiento y cambios" },
] as const;

export type ApartadoAviso = (typeof apartadosAviso)[number];
