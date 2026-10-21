// Base en memoria del simulador y sus escenarios. Las cuentas son inventadas (INV-14, INV-24): correos de example.com
// y la contraseña de ejemplo del README. Cada reinicio vuelve a este estado.
import * as contenido from "./contenido.mjs";
import { calificar, leccionesDeCurso, evaluablesDeLeccion, examenDeCurso, preguntasDe, seccionesDeLeccion } from "./reglas.mjs";
import { hashContrasena, semillaAleatoria, uuidv7 } from "./utilidades.mjs";

export const CONTRASENA_DE_EJEMPLO = "Ejemplo2026";
export const CORREO_ALUMNO = "alumno@example.com";
export const DURACION_SESION_MS = 30 * 60_000;

const HASH_DE_EJEMPLO = hashContrasena(CONTRASENA_DE_EJEMPLO);
const MINUTO = 60_000;

/** Identidad que devuelve el Google simulado: una persona sin cuenta (para probar /aceptar). */
export const GOOGLE_DE_EJEMPLO = {
  sub: "google-sub-ejemplo-001",
  correo: "google.alumna@example.com",
  nombre: "Gala",
  apellidos: "Ejemplo",
};

function usuario({ correo, nombre, apellidos, estado = "activo", googleSub = null, conContrasena = true, creadoEn }) {
  return {
    id: uuidv7(),
    nombre,
    apellidos,
    correo,
    correoVerificadoEn: estado === "activo" ? creadoEn : null,
    estado,
    hashContrasena: conContrasena ? HASH_DE_EJEMPLO : null,
    googleSub,
    intentosFallidos: 0,
    bloqueadoHasta: null,
    creadoEn,
    anonimizadoEn: null,
    mayoriaEdadConfirmadaEn: creadoEn,
    negativaEncuesta: false,
    negativaEstadisticas: false,
  };
}

export function crearBase() {
  const creadoEn = "2026-10-21T16:00:00.000Z";
  const bd = {
    documentos: contenido.documentosIniciales.map((d) => ({ ...d })),
    usuarios: new Map(),
    sesiones: new Map(),
    tokens: new Map(),
    progreso: new Map(),
    intentos: new Map(),
    insignias: new Map(),
    aceptaciones: [],
    correos: [],
    limites: new Map(),
    duracionSesionMs: DURACION_SESION_MS,
    identidadGoogle: { ...GOOGLE_DE_EJEMPLO },
  };
  const cuentas = [
    usuario({ correo: CORREO_ALUMNO, nombre: "Alma", apellidos: "Ejemplo Pérez", creadoEn }),
    usuario({ correo: "otra.alumna@example.com", nombre: "Berta", apellidos: "Muestra López", creadoEn }),
    usuario({ correo: "pendiente@example.com", nombre: "Ciro", apellidos: "Prueba", estado: "pendiente", creadoEn }),
  ];
  for (const cuenta of cuentas) {
    bd.usuarios.set(cuenta.id, cuenta);
    for (const documento of bd.documentos) {
      bd.aceptaciones.push({ id: uuidv7(), usuarioId: cuenta.id, documentoId: documento.id, aceptadoEn: creadoEn, direccionIp: "127.0.0.1" });
    }
  }
  // La otra alumna ya envió la primera actividad: sirve para probar que nadie ve intentos ajenos (INV-07).
  const otra = cuentas[1];
  terminarLeccion(bd, otra.id, 1, new Date("2026-10-21T17:00:00.000Z"));
  enviarCuestionario(bd, otra.id, 1, { correctas: true, enviadoEn: new Date("2026-10-21T17:05:00.000Z") });
  return bd;
}

export const usuarioPorCorreo = (bd, correo) =>
  [...bd.usuarios.values()].find((u) => u.estado !== "anonimizado" && u.correo === correo) ?? null;

// ── Ayudantes de los escenarios ─────────────────────────────────────────────────────────────────────────────
function terminarLeccion(bd, usuarioId, leccionId, fecha) {
  const secciones = seccionesDeLeccion(leccionId).length;
  bd.progreso.set(`${usuarioId}:${leccionId}`, { ultimaSeccion: secciones, abiertaEn: fecha.toISOString(), terminadaEn: fecha.toISOString() });
}

function respuestasDe(cuestionarioId, correctas) {
  const respuestas = new Map();
  for (const pregunta of preguntasDe(cuestionarioId)) {
    if (pregunta.tipo === "relacion") {
      const ids = pregunta.parejas.map((p) => p.id);
      const derechas = correctas ? ids : [...ids.slice(1), ids[0]];
      respuestas.set(pregunta.id, { uniones: ids.map((id, i) => ({ izquierdaId: id, derechaId: derechas[i] })), respondidoEn: null });
    } else {
      const ordenadas = [...pregunta.opciones].sort((a, b) => (correctas ? b.valor - a.valor : a.valor - b.valor));
      respuestas.set(pregunta.id, { opcionId: ordenadas[0].id, respondidoEn: null });
    }
  }
  return respuestas;
}

function enviarCuestionario(bd, usuarioId, cuestionarioId, { correctas, enviadoEn }) {
  const previos = [...bd.intentos.values()].filter((i) => i.usuarioId === usuarioId && i.cuestionarioId === cuestionarioId);
  const respuestas = respuestasDe(cuestionarioId, correctas);
  for (const respuesta of respuestas.values()) respuesta.respondidoEn = enviadoEn.toISOString();
  const intento = {
    id: uuidv7(),
    usuarioId,
    cuestionarioId,
    numero: previos.length + 1,
    estado: "enviado",
    semilla: semillaAleatoria(),
    iniciadoEn: new Date(enviadoEn.getTime() - 5 * MINUTO).toISOString(),
    enviadoEn: enviadoEn.toISOString(),
    calificacion: null,
    aprobado: null,
    respuestas,
    puntajes: new Map(),
  };
  calificar(intento);
  bd.intentos.set(intento.id, intento);
  return intento;
}

/** Completa todas las lecciones y evaluables de un curso; con `examen`, aprueba o reprueba su examen. */
function completarCurso(bd, usuarioId, cursoId, inicio, examen = null) {
  let momento = inicio.getTime();
  for (const leccion of leccionesDeCurso(cursoId)) {
    terminarLeccion(bd, usuarioId, leccion.id, new Date((momento += MINUTO)));
    for (const evaluable of evaluablesDeLeccion(leccion.id)) {
      enviarCuestionario(bd, usuarioId, evaluable.id, { correctas: true, enviadoEn: new Date((momento += MINUTO)) });
    }
  }
  if (examen) {
    enviarCuestionario(bd, usuarioId, examenDeCurso(cursoId).id, { correctas: examen.aprobar, enviadoEn: examen.enviadoEn });
  }
}

function limpiarAvance(bd, usuarioId) {
  for (const llave of [...bd.progreso.keys()]) if (llave.startsWith(`${usuarioId}:`)) bd.progreso.delete(llave);
  for (const [id, intento] of [...bd.intentos]) if (intento.usuarioId === usuarioId) bd.intentos.delete(id);
  for (const llave of [...bd.insignias.keys()]) if (llave.startsWith(`${usuarioId}:`)) bd.insignias.delete(llave);
}

/**
 * Escenarios para las vistas y las pruebas. Cambian el avance de la alumna de ejemplo (alumno@example.com);
 * `sesion-por-expirar` y `version-nueva` no tocan su avance.
 */
export const escenarios = {
  nuevo(bd) {
    limpiarAvance(bd, alumna(bd).id);
  },
  "a-medias"(bd) {
    const { id } = alumna(bd);
    limpiarAvance(bd, id);
    const ahora = Date.now();
    terminarLeccion(bd, id, 1, new Date(ahora - 60 * MINUTO));
    enviarCuestionario(bd, id, 1, { correctas: false, enviadoEn: new Date(ahora - 55 * MINUTO) });
    enviarCuestionario(bd, id, 2, { correctas: true, enviadoEn: new Date(ahora - 50 * MINUTO) });
    bd.progreso.set(`${id}:2`, { ultimaSeccion: 1, abiertaEn: new Date(ahora - 40 * MINUTO).toISOString(), terminadaEn: null });
  },
  "examen-en-espera"(bd) {
    const { id } = alumna(bd);
    limpiarAvance(bd, id);
    const ahora = Date.now();
    completarCurso(bd, id, 1, new Date(ahora - 120 * MINUTO), { aprobar: false, enviadoEn: new Date(ahora - 5 * MINUTO) });
  },
  "curso-completo"(bd) {
    const { id } = alumna(bd);
    limpiarAvance(bd, id);
    const ayer = Date.now() - 24 * 60 * MINUTO;
    completarCurso(bd, id, 1, new Date(ayer), { aprobar: true, enviadoEn: new Date(ayer + 60 * MINUTO) });
  },
  /** Sesiones de 150 s: el aviso de 2 minutos aparece a los 30 s de la última petición. */
  "sesion-por-expirar"(bd) {
    bd.duracionSesionMs = 150_000;
  },
  /** Publica el aviso 1.1, que requiere aceptación (OP-13, INV-30). */
  "version-nueva"(bd) {
    if (!bd.documentos.some((d) => d.id === contenido.avisoVersionNueva.id)) {
      bd.documentos.push({ ...contenido.avisoVersionNueva, publicadoEn: new Date().toISOString() });
    }
  },
};

function alumna(bd) {
  return usuarioPorCorreo(bd, CORREO_ALUMNO);
}
