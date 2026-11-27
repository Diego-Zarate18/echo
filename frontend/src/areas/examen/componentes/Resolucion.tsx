import { notFound, redirect } from "next/navigation";
import { ErrorDePantalla } from "@/componentes/estructura/ErrorDePantalla";
import { Migas } from "@/componentes/ui/Migas";
import { cargarPortada, cargarUbicacion, idDeCuestionario } from "../datos";
import { ResolverExamen } from "./ResolverExamen";

/**
 * Contenido de SCR-12. Solo se resuelve un examen disponible o a medias; en cualquier otro estado (en espera,
 * aprobado) se vuelve a la portada, que explica por qué. El intento lo crea o lo retoma el navegador (OP-25 es POST).
 */
export async function Resolucion({ params }: { params: Promise<{ cuestionario: string }> }) {
  const id = idDeCuestionario((await params).cuestionario);
  const portada = await cargarPortada(id);
  if (!portada.ok && portada.error.estado === 401) return null;
  if (!portada.ok && portada.error.estado === 404) notFound();
  if (!portada.ok) {
    return (
      <ErrorDePantalla
        titulo="No pudimos abrir este examen"
        error={portada.error}
        migas={[{ texto: "Módulos", href: "/modulos" }]}
        salida={{ texto: "Volver a Módulos", href: "/modulos" }}
      />
    );
  }
  const examen = portada.datos;
  if (examen.estado !== "disponible" && examen.estado !== "enCurso") redirect(`/examenes/${id}`);

  const ubicacion = await cargarUbicacion(examen.curso.slug);
  return (
    <>
      <Migas
        elementos={[
          { texto: "Módulos", href: "/modulos" },
          ...(ubicacion
            ? [
                { texto: ubicacion.modulo.titulo, href: ubicacion.rutaModulo },
                { texto: ubicacion.curso.titulo, href: ubicacion.rutaCurso },
              ]
            : []),
          { texto: "Examen", href: `/examenes/${id}` },
          { texto: "Resolver" },
        ]}
      />
      <ResolverExamen
        cuestionario={id}
        titulo={examen.titulo}
        curso={examen.curso.titulo}
        calificacionMinima={examen.calificacionMinima}
        rutaCurso={ubicacion?.rutaCurso ?? null}
      />
    </>
  );
}
