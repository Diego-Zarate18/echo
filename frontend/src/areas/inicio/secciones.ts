/** Anclas del encabezado público, en el orden de Figma (84:492). */
export const seccionesInicio = [
  { id: "que-es-echo", texto: "Qué es Echo" },
  { id: "que-encontraras", texto: "Qué encontrarás" },
  { id: "por-que-echo", texto: "Por qué Echo" },
  { id: "quienes-somos", texto: "Quiénes somos" },
] as const;

export type SeccionInicio = (typeof seccionesInicio)[number];
