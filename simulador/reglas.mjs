// Reglas del dominio que el simulador cumple de verdad: desbloqueo lineal (DEC-03, C-02), avance (DEC-14, C-04),
// estado del examen y espera (DEC-20, DEC-21, C-05), mezcla con semilla (DEC-09), calificación (DEC-07, C-07) y
// cómo se arman las preguntas antes y después del envío (INV-04, DEC-11, DEC-16, DEC-17).
// Cada función recibe la base en memoria (`bd`) en lugar de importarla.
import * as contenido from "./contenido.mjs";
import { claveDerecha, dosDecimales, mezclar, semillaDe } from "./utilidades.mjs";

const porOrden = (a, b) => a.orden - b.orden;
const MINUTO = 60_000;

// ── Consultas sobre el contenido ────────────────────────────────────────────────────────────────────────────
export const modulosEnOrden = () => [...contenido.modulos].sort(porOrden);
export const cursosDeModulo = (moduloId) => contenido.cursos.filter((c) => c.moduloId === moduloId).sort(porOrden);
export const leccionesDeCurso = (cursoId) => contenido.lecciones.filter((l) => l.cursoId === cursoId).sort(porOrden);
export const seccionesDeLeccion = (leccionId) => contenido.secciones.filter((s) => s.leccionId === leccionId).sort(porOrden);
export const evaluablesDeLeccion = (leccionId) =>
  contenido.cuestionarios.filter((c) => c.leccionId === leccionId).sort(porOrden);
export const examenDeCurso = (cursoId) => contenido.cuestionarios.find((c) => c.tipo === "examen" && c.cursoId === cursoId) ?? null;
export const preguntasDe = (cuestionarioId) => contenido.preguntas.filter((p) => p.cuestionarioId === cuestionarioId).sort(porOrden);
export const moduloPorSlug = (slug) => contenido.modulos.find((m) => m.slug === slug) ?? null;
export const cursoPorSlug = (slug) => contenido.cursos.find((c) => c.slug === slug) ?? null;
export const leccionPorSlug = (slug) => contenido.lecciones.find((l) => l.slug === slug) ?? null;
export const cuestionarioPorId = (id) => contenido.cuestionarios.find((c) => c.id === id) ?? null;
export const moduloDe = (curso) => contenido.modulos.find((m) => m.id === curso.moduloId);
export const cursoDe = (leccion) => contenido.cursos.find((c) => c.id === leccion.cursoId);
export const leccionPorId = (id) => contenido.lecciones.find((l) => l.id === id) ?? null;
export const cursoPorId = (id) => contenido.cursos.find((c) => c.id === id) ?? null;
export const imagenPorId = (id) => {
  const imagen = contenido.imagenes.find((i) => i.id === id);
  return imagen ? { ruta: imagen.ruta, textoAlternativo: imagen.textoAlternativo, pie: imagen.pie } : null;
};
export const fundamentoPorId = (id) => {
  const fundamento = contenido.fundamentos.find((f) => f.id === id);
  if (!fundamento) return null;
  const { tipo, nombre, articulo, descripcion, referencia } = fundamento;
  return { tipo, nombre, articulo, descripcion, referencia };
};
export const referencia = (elemento) => ({ slug: elemento.slug, titulo: elemento.titulo });

// ── Avance del alumno ───────────────────────────────────────────────────────────────────────────────────────
export const intentosDe = (bd, usuarioId, cuestionarioId) =>
  [...bd.intentos.values()].filter((i) => i.usuarioId === usuarioId && i.cuestionarioId === cuestionarioId);
export const intentosEnviados = (bd, usuarioId, cuestionarioId) =>
  intentosDe(bd, usuarioId, cuestionarioId).filter((i) => i.estado === "enviado").sort((a, b) => a.numero - b.numero);
export const intentoAbierto = (bd, usuarioId, cuestionarioId) =>
  intentosDe(bd, usuarioId, cuestionarioId).find((i) => i.estado === "enCurso") ?? null;
export const evaluableEnviado = (bd, usuarioId, cuestionarioId) => intentosEnviados(bd, usuarioId, cuestionarioId).length > 0;

export const progresoDe = (bd, usuarioId, leccionId) => bd.progreso.get(`${usuarioId}:${leccionId}`) ?? null;
export const leccionTerminada = (bd, usuarioId, leccionId) => Boolean(progresoDe(bd, usuarioId, leccionId)?.terminadaEn);
export const leccionCompletada = (bd, usuarioId, leccionId) =>
  leccionTerminada(bd, usuarioId, leccionId) && evaluablesDeLeccion(leccionId).every((c) => evaluableEnviado(bd, usuarioId, c.id));

export function aprobacionDeCurso(bd, usuarioId, cursoId) {
  const examen = examenDeCurso(cursoId);
  return examen ? intentosEnviados(bd, usuarioId, examen.id).find((i) => i.aprobado) ?? null : null;
}
export const cursoAprobado = (bd, usuarioId, cursoId) => aprobacionDeCurso(bd, usuarioId, cursoId) !== null;
export const moduloCompletado = (bd, usuarioId, moduloId) => cursosDeModulo(moduloId).every((c) => cursoAprobado(bd, usuarioId, c.id));

export function moduloDisponible(bd, usuarioId, modulo) {
  const anterior = modulosEnOrden().filter((m) => m.orden < modulo.orden).at(-1);
  return !anterior || moduloCompletado(bd, usuarioId, anterior.id);
}
export function cursoDisponible(bd, usuarioId, curso) {
  if (!moduloDisponible(bd, usuarioId, moduloDe(curso))) return false;
  const anterior = cursosDeModulo(curso.moduloId).filter((c) => c.orden < curso.orden).at(-1);
  return !anterior || cursoAprobado(bd, usuarioId, anterior.id);
}
export function leccionDisponible(bd, usuarioId, leccion) {
  if (!cursoDisponible(bd, usuarioId, cursoDe(leccion))) return false;
  const anterior = leccionesDeCurso(leccion.cursoId).filter((l) => l.orden < leccion.orden).at(-1);
  return !anterior || leccionCompletada(bd, usuarioId, anterior.id);
}
/** La actividad y los casos se abren con la lección leída y en su orden (DEC-03, OP-22). */
export function evaluableDisponible(bd, usuarioId, cuestionario) {
  const leccion = leccionPorId(cuestionario.leccionId);
  if (!leccion || !leccionDisponible(bd, usuarioId, leccion) || !leccionTerminada(bd, usuarioId, leccion.id)) return false;
  return evaluablesDeLeccion(leccion.id)
    .filter((c) => c.orden < cuestionario.orden)
    .every((c) => evaluableEnviado(bd, usuarioId, c.id));
}
export const examenDisponible = (bd, usuarioId, curso) =>
  cursoDisponible(bd, usuarioId, curso) && leccionesDeCurso(curso.id).every((l) => leccionCompletada(bd, usuarioId, l.id));

/** Lo que falta para desbloquear; el texto lo arma el frontend. */
export function requisitoDeModulo(bd, usuarioId, modulo) {
  if (moduloDisponible(bd, usuarioId, modulo)) return null;
  const anterior = modulosEnOrden().filter((m) => m.orden < modulo.orden).at(-1);
  return { tipo: "modulo", slug: anterior.slug, titulo: anterior.titulo };
}
export function requisitoDeCurso(bd, usuarioId, curso) {
  if (cursoDisponible(bd, usuarioId, curso)) return null;
  const modulo = moduloDe(curso);
  if (!moduloDisponible(bd, usuarioId, modulo)) return requisitoDeModulo(bd, usuarioId, modulo);
  const anterior = cursosDeModulo(curso.moduloId).filter((c) => c.orden < curso.orden).at(-1);
  const examen = examenDeCurso(anterior.id);
  return { tipo: "examen", id: examen.id, titulo: examen.titulo };
}
export function requisitoDeLeccion(bd, usuarioId, leccion) {
  if (leccionDisponible(bd, usuarioId, leccion)) return null;
  const curso = cursoDe(leccion);
  if (!cursoDisponible(bd, usuarioId, curso)) return requisitoDeCurso(bd, usuarioId, curso);
  const anterior = leccionesDeCurso(leccion.cursoId).filter((l) => l.orden < leccion.orden).at(-1);
  return { tipo: "leccion", slug: anterior.slug, titulo: anterior.titulo };
}

export function estadoLeccion(bd, usuarioId, leccion) {
  if (!leccionDisponible(bd, usuarioId, leccion)) return "bloqueado";
  if (leccionCompletada(bd, usuarioId, leccion.id)) return "completado";
  return progresoDe(bd, usuarioId, leccion.id) ? "enCurso" : "disponible";
}

/** DEC-14: examen aprobado = 100 %; si no, promedio de los componentes que existan (el examen cuenta 0 %). */
export function avanceCurso(bd, usuarioId, curso) {
  if (cursoAprobado(bd, usuarioId, curso.id)) return 100;
  const lecciones = leccionesDeCurso(curso.id);
  const evaluables = lecciones.flatMap((l) => evaluablesDeLeccion(l.id));
  const actividades = evaluables.filter((c) => c.tipo === "actividad");
  const casos = evaluables.filter((c) => c.tipo === "caso");
  const componentes = [];
  if (lecciones.length) componentes.push(lecciones.filter((l) => leccionTerminada(bd, usuarioId, l.id)).length / lecciones.length);
  if (actividades.length) componentes.push(actividades.filter((c) => evaluableEnviado(bd, usuarioId, c.id)).length / actividades.length);
  if (casos.length) componentes.push(casos.filter((c) => evaluableEnviado(bd, usuarioId, c.id)).length / casos.length);
  if (examenDeCurso(curso.id)) componentes.push(0);
  return componentes.length ? dosDecimales((componentes.reduce((a, b) => a + b, 0) / componentes.length) * 100) : 0;
}
export function avanceModulo(bd, usuarioId, modulo) {
  const cursos = cursosDeModulo(modulo.id);
  return cursos.length ? dosDecimales(cursos.reduce((suma, c) => suma + avanceCurso(bd, usuarioId, c), 0) / cursos.length) : 0;
}
export function avanceGeneral(bd, usuarioId) {
  const modulos = modulosEnOrden();
  return modulos.length ? dosDecimales(modulos.reduce((suma, m) => suma + avanceModulo(bd, usuarioId, m), 0) / modulos.length) : 0;
}
export function estadoCurso(bd, usuarioId, curso) {
  if (!cursoDisponible(bd, usuarioId, curso)) return "bloqueado";
  if (cursoAprobado(bd, usuarioId, curso.id)) return "completado";
  return avanceCurso(bd, usuarioId, curso) > 0 ? "enCurso" : "disponible";
}
export function estadoModulo(bd, usuarioId, modulo) {
  if (!moduloDisponible(bd, usuarioId, modulo)) return "bloqueado";
  if (moduloCompletado(bd, usuarioId, modulo.id)) return "completado";
  return avanceModulo(bd, usuarioId, modulo) > 0 ? "enCurso" : "disponible";
}

/** C-05: aprobado, en curso, en espera (con minutos restantes con la hora del servidor), bloqueado o disponible. */
export function estadoExamen(bd, usuarioId, examen, ahora = new Date()) {
  const curso = cursoPorId(examen.cursoId);
  const enviados = intentosEnviados(bd, usuarioId, examen.id);
  const vacio = { minutosRestantes: null, disponibleEn: null };
  if (enviados.some((i) => i.aprobado)) return { estado: "aprobado", ...vacio };
  if (intentoAbierto(bd, usuarioId, examen.id)) return { estado: "enCurso", ...vacio };
  const ultimo = enviados.at(-1);
  if (ultimo) {
    const disponible = new Date(new Date(ultimo.enviadoEn).getTime() + examen.minutosEspera * MINUTO);
    if (disponible > ahora) {
      return {
        estado: "enEspera",
        minutosRestantes: Math.max(1, Math.ceil((disponible - ahora) / MINUTO)),
        disponibleEn: disponible.toISOString(),
      };
    }
  }
  return { estado: examenDisponible(bd, usuarioId, curso) ? "disponible" : "bloqueado", ...vacio };
}

export function mejorCalificacion(bd, usuarioId, cuestionarioId) {
  const enviados = intentosEnviados(bd, usuarioId, cuestionarioId);
  return enviados.length ? Math.max(...enviados.map((i) => i.calificacion)) : null;
}

// ── Documentos legales (DEC-28, DEC-87, INV-30) ─────────────────────────────────────────────────────────────
export function documentosVigentes(bd) {
  const vigentes = {};
  for (const documento of bd.documentos) {
    const actual = vigentes[documento.tipo];
    if (!actual || new Date(documento.publicadoEn) > new Date(actual.publicadoEn)) vigentes[documento.tipo] = documento;
  }
  return vigentes;
}
/** Pendiente si la vigente requiere aceptación y el alumno no la aceptó. */
export function aceptacionPendiente(bd, usuarioId) {
  const vigentes = documentosVigentes(bd);
  const aceptada = (documento) =>
    bd.aceptaciones.some((a) => a.usuarioId === usuarioId && a.documentoId === documento.id);
  const pendiente = (documento) => Boolean(documento && documento.requiereAceptacion && !aceptada(documento));
  return { aviso: pendiente(vigentes.avisoPrivacidad), terminos: pendiente(vigentes.terminos) };
}

// ── Preguntas antes y después del envío ─────────────────────────────────────────────────────────────────────
/**
 * Pregunta para responder (INV-04): sin valores, sin la opción o la pareja correcta, sin retroalimentación.
 * Con semilla (exámenes) se mezclan opciones y elementos; la columna derecha siempre va mezclada y con claves opacas.
 */
export function preguntaParaResponder(pregunta, usuarioId, semilla = null) {
  if (pregunta.tipo === "relacion") {
    const semillaDerecha = semilla ?? semillaDe(`${usuarioId}:${pregunta.id}`);
    const izquierda = pregunta.parejas.map((p) => ({ id: p.id, texto: p.izquierdo }));
    const derecha = pregunta.parejas.map((p) => ({ clave: claveDerecha(usuarioId, pregunta.id, p.id), texto: p.derecho }));
    return {
      id: pregunta.id,
      tipo: "relacion",
      enunciado: pregunta.enunciado,
      izquierda: semilla === null ? izquierda : mezclar(izquierda, semilla + pregunta.id),
      derecha: mezclar(derecha, semillaDerecha + pregunta.id * 7),
    };
  }
  const opciones = pregunta.opciones.map((o) => ({ id: o.id, texto: o.texto }));
  return {
    id: pregunta.id,
    tipo: pregunta.tipo,
    enunciado: pregunta.enunciado,
    opciones: semilla === null || pregunta.tipo === "verdaderoFalso" ? opciones : mezclar(opciones, semilla + pregunta.id),
  };
}

/** Convierte la clave opaca de un elemento derecho en el id de su pareja; `null` si no es de esa pregunta. */
export function parejaDeClave(pregunta, usuarioId, clave) {
  return pregunta.parejas.find((p) => claveDerecha(usuarioId, pregunta.id, p.id) === clave)?.id ?? null;
}

/** Respuesta guardada tal como la ve el alumno (con claves opacas). */
export function respuestaVisible(pregunta, usuarioId, respuesta) {
  const base = { preguntaId: pregunta.id, guardadaEn: respuesta.respondidoEn };
  if (pregunta.tipo === "relacion") {
    return {
      ...base,
      uniones: respuesta.uniones.map((u) => ({ izquierdaId: u.izquierdaId, derechaClave: claveDerecha(usuarioId, pregunta.id, u.derechaId) })),
    };
  }
  return { ...base, opcionId: respuesta.opcionId };
}

/** ¿La pregunta tiene respuesta completa? En relación, todos los elementos izquierdos unidos. */
export function respondida(pregunta, respuesta) {
  if (!respuesta) return false;
  if (pregunta.tipo === "relacion") return pregunta.parejas.every((p) => respuesta.uniones?.some((u) => u.izquierdaId === p.id));
  return typeof respuesta.opcionId === "number";
}

/** DEC-07: el punto es el valor de la opción; en relación, parejas acertadas ÷ total. */
export function puntajeDe(pregunta, respuesta) {
  if (!respuesta) return 0;
  if (pregunta.tipo === "relacion") {
    const aciertos = pregunta.parejas.filter((p) => respuesta.uniones.some((u) => u.izquierdaId === p.id && u.derechaId === p.id)).length;
    return aciertos / pregunta.parejas.length;
  }
  return pregunta.opciones.find((o) => o.id === respuesta.opcionId)?.valor ?? 0;
}

/** Solo aquí se califica (el equivalente de fn_enviar_intento, INV-04). */
export function calificar(intento) {
  const cuestionario = cuestionarioPorId(intento.cuestionarioId);
  const preguntas = preguntasDe(cuestionario.id);
  let suma = 0;
  for (const pregunta of preguntas) {
    const puntaje = puntajeDe(pregunta, intento.respuestas.get(pregunta.id));
    intento.puntajes.set(pregunta.id, puntaje);
    suma += puntaje;
  }
  intento.calificacion = dosDecimales((suma / preguntas.length) * 100);
  intento.aprobado = cuestionario.tipo === "examen" ? intento.calificacion >= cuestionario.calificacionMinima : null;
  return intento;
}

const etiquetaDe = (valor) => (valor >= 1 ? "optima" : valor <= 0 ? "riesgosa" : "aceptable");

/** Retroalimentación completa: actividades (con la correcta), casos (la decisión) y exámenes aprobados. */
export function preguntaCalificada(pregunta, respuesta, puntaje) {
  const base = {
    id: pregunta.id,
    tipo: pregunta.tipo,
    enunciado: pregunta.enunciado,
    puntaje: dosDecimales(puntaje),
    correcta: puntaje >= 1,
    retroalimentacion: pregunta.retroalimentacion,
    fundamento: fundamentoPorId(pregunta.fundamentoId),
  };
  if (pregunta.tipo === "relacion") {
    return {
      ...base,
      uniones: pregunta.parejas.map((p) => {
        const union = respuesta?.uniones.find((u) => u.izquierdaId === p.id);
        const elegida = union ? pregunta.parejas.find((q) => q.id === union.derechaId) : null;
        return { izquierda: p.izquierdo, derechaElegida: elegida?.derecho ?? null, derechaCorrecta: p.derecho, correcta: union?.derechaId === p.id };
      }),
    };
  }
  if (pregunta.tipo === "decision") {
    const opcion = pregunta.opciones.find((o) => o.id === respuesta?.opcionId);
    return {
      ...base,
      decision: {
        opcionElegida: opcion?.texto ?? "",
        etiqueta: etiquetaDe(opcion?.valor ?? 0),
        consecuencia: opcion?.consecuencia ?? null,
        retroalimentacion: opcion?.retroalimentacion ?? null,
        fundamento: fundamentoPorId(opcion?.fundamentoId ?? pregunta.fundamentoId),
      },
    };
  }
  return {
    ...base,
    opciones: pregunta.opciones.map((o) => ({
      id: o.id,
      texto: o.texto,
      elegida: o.id === respuesta?.opcionId,
      correcta: o.valor >= 1,
      retroalimentacion: o.retroalimentacion ?? null,
    })),
  };
}

/** Examen reprobado (DEC-11): qué falló y qué lección repasar, sin la respuesta correcta ni la retroalimentación. */
export function preguntaSinSolucion(pregunta, respuesta, puntaje) {
  let respuestaElegida = [];
  if (pregunta.tipo === "relacion") {
    respuestaElegida = (respuesta?.uniones ?? []).map((u) => {
      const izquierda = pregunta.parejas.find((p) => p.id === u.izquierdaId)?.izquierdo;
      const derecha = pregunta.parejas.find((p) => p.id === u.derechaId)?.derecho;
      return `${izquierda} → ${derecha}`;
    });
  } else {
    const opcion = pregunta.opciones.find((o) => o.id === respuesta?.opcionId);
    respuestaElegida = opcion ? [opcion.texto] : [];
  }
  const leccion = leccionPorId(pregunta.leccionRepasoId);
  return {
    id: pregunta.id,
    tipo: pregunta.tipo,
    enunciado: pregunta.enunciado,
    puntaje: dosDecimales(puntaje),
    correcta: puntaje >= 1,
    respuestaElegida,
    leccionRepaso: leccion ? referencia(leccion) : null,
  };
}

export function insigniaDeModulo(bd, usuarioId, moduloId) {
  const insignia = contenido.insignias.find((i) => i.moduloId === moduloId);
  if (!insignia) return null;
  return {
    nombre: insignia.nombre,
    descripcion: insignia.descripcion,
    imagen: imagenPorId(insignia.imagenId),
    obtenidaEn: bd.insignias.get(`${usuarioId}:${insignia.id}`) ?? null,
  };
}

/** OP-32: al completar el módulo se otorga su insignia, una sola vez y para siempre (INV-15). */
export function otorgarInsigniaSiCorresponde(bd, usuarioId, moduloId, ahora) {
  const insignia = contenido.insignias.find((i) => i.moduloId === moduloId);
  const llave = insignia && `${usuarioId}:${insignia.id}`;
  if (!insignia || bd.insignias.has(llave) || !moduloCompletado(bd, usuarioId, moduloId)) return null;
  bd.insignias.set(llave, ahora.toISOString());
  return insigniaDeModulo(bd, usuarioId, moduloId);
}
