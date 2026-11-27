import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { apiServidor } from "@/lib/api/servidor";

/** Id del cuestionario de la URL; uno que no es entero positivo es 404. */
export function idDeCuestionario(texto: string): number {
  const id = Number(texto);
  if (!Number.isInteger(id) || id < 1) notFound();
  return id;
}

export const cargarPortada = cache((cuestionario: number) => apiServidor.obtenerPortadaExamen({ ruta: { cuestionario } }));

/**
 * Ruta del curso del examen y del módulo, para las migas y los enlaces a las lecciones de repaso. La portada solo trae
 * el curso; el módulo sale del detalle del curso. Si falla, las migas se quedan cortas y los enlaces van a Módulos.
 */
export const cargarUbicacion = cache(async (cursoSlug: string) => {
  const curso = await apiServidor.obtenerCurso({ ruta: { curso: cursoSlug } });
  if (!curso.ok) return null;
  const modulo = curso.datos.modulo;
  const rutaCurso = `/modulos/${modulo.slug}/${curso.datos.slug}`;
  return { modulo, curso: { slug: curso.datos.slug, titulo: curso.datos.titulo }, rutaCurso, rutaModulo: `/modulos/${modulo.slug}` };
});
