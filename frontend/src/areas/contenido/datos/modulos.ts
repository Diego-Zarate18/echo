import "server-only";
import { cache } from "react";
import type { components } from "@/lib/api/esquema";
import { apiServidor } from "@/lib/api/servidor";

export type ResumenModulo = components["schemas"]["ResumenModulo"];
export type ResultadoBusqueda = components["schemas"]["ResultadoBusqueda"];
export type DetalleModulo = components["schemas"]["DetalleModulo"];
export type ResumenCurso = components["schemas"]["ResumenCurso"];

/**
 * Lecturas del contenido. `cache` de React evita pedir lo mismo dos veces en una solicitud (la portada y las
 * tarjetas leen la misma lista). Nunca llevan `'use cache'`: todo depende de la sesión del alumno (§3).
 */
export const cargarModulos = cache(() => apiServidor.listarModulos());
export const cargarModulo = cache((modulo: string) => apiServidor.obtenerModulo({ ruta: { modulo } }));
export const cargarCurso = cache((curso: string) => apiServidor.obtenerCurso({ ruta: { curso } }));
export const cargarPortadaExamen = cache((cuestionario: number) => apiServidor.obtenerPortadaExamen({ ruta: { cuestionario } }));

export type PuntoDeContinuacion = {
  href: string;
  /** Posición de la lección dentro de su curso («Lección 3»). */
  orden: number;
  titulo: string;
  /** Solo si ya empezó a leerla: sección donde se quedó y cuántas tiene. */
  seccion: { actual: number; total: number } | null;
};

/**
 * Lección a la que llevar al alumno desde la portada: la que tiene a medias o, si no hay, la primera disponible del
 * primer curso abierto del módulo. Son hasta tres lecturas en cadena (módulo, curso y lección); si alguna falla,
 * devuelve `null` y la portada enlaza al módulo.
 */
export async function localizarLeccion(modulo: ResumenModulo): Promise<PuntoDeContinuacion | null> {
  const detalleModulo = await cargarModulo(modulo.slug);
  if (!detalleModulo.ok) return null;
  const curso =
    detalleModulo.datos.cursos.find((c) => c.estado === "enCurso") ??
    detalleModulo.datos.cursos.find((c) => c.estado === "disponible");
  if (!curso) return null;

  const detalleCurso = await cargarCurso(curso.slug);
  if (!detalleCurso.ok) return null;
  const leccion =
    detalleCurso.datos.lecciones.find((l) => l.estado === "enCurso") ??
    detalleCurso.datos.lecciones.find((l) => l.estado === "disponible");
  if (!leccion) return null;

  let seccion: PuntoDeContinuacion["seccion"] = null;
  if (leccion.estado === "enCurso") {
    const abierta = await apiServidor.abrirLeccion({ ruta: { leccion: leccion.slug } });
    if (abierta.ok) seccion = { actual: abierta.datos.ultimaSeccion, total: abierta.datos.secciones.length };
  }

  return {
    href: `/modulos/${modulo.slug}/${curso.slug}/${leccion.slug}`,
    orden: leccion.orden,
    titulo: leccion.titulo,
    seccion,
  };
}
