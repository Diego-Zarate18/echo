/**
 * Datos fijos de la Ayuda (SCR-17, RNF-11). Las respuestas se redactaron con lo ya decidido en el grafo;
 * cada número sale de aquí y cita su decisión, para cambiarlo en un solo lugar si la decisión cambia.
 */

/** `SCR-17 › detalles.texto_piloto` del grafo v1.3.1 (DEC-78). */
export const TEXTO_PILOTO = "Echo es un piloto académico de la UP Chiapas vigente hasta diciembre de 2026.";

/** Calificación mínima para aprobar un examen, salvo que el examen pida otra (DEC-20). */
export const CALIFICACION_MINIMA = 70;

/** Espera para volver a presentar un examen reprobado (DEC-21). */
export const MINUTOS_ESPERA_EXAMEN = 20;

/** La sesión se cierra tras este tiempo sin actividad (DEC-12, RNF-06). */
export const MINUTOS_SESION = 30;

/** Aviso antes de que expire la sesión, con el botón «Seguir conectado» (DEC-71). */
export const MINUTOS_AVISO_SESION = 2;

/** Vigencia del enlace para confirmar el correo; las cuentas sin confirmar se eliminan pasado este tiempo (DEC-13). */
export const HORAS_VERIFICACION = 24;

/**
 * Preguntas de la Ayuda, en el orden de Figma (84:813). El `id` es el ancla del índice y de la URL;
 * `cierre-del-piloto` es `SCR-17 › detalles.ancla_cierre`.
 */
export const preguntasAyuda = [
  { id: "como-avanzo", titulo: "¿Cómo avanzo en Echo?" },
  { id: "lecciones", titulo: "Lecciones" },
  { id: "actividades-y-casos", titulo: "Actividades y casos prácticos" },
  { id: "examenes", titulo: "Exámenes" },
  { id: "progreso-e-insignias", titulo: "Mi progreso e insignias" },
  { id: "cuenta-y-sesion", titulo: "Mi cuenta y mi sesión" },
  { id: "accesibilidad", titulo: "Accesibilidad" },
  { id: "cierre-del-piloto", titulo: "¿Qué pasa con mis datos en diciembre?" },
] as const;

export type PreguntaAyuda = (typeof preguntasAyuda)[number];

/** Abiertas al cargar, como en Figma: la primera y la última. */
export const PREGUNTAS_ABIERTAS_AL_INICIO: readonly PreguntaAyuda["id"][] = ["como-avanzo", "cierre-del-piloto"];
