import type { Metadata } from "next";
import { Suspense } from "react";
import { Curso, CursoCargando } from "@/areas/contenido/componentes/Curso";

export const metadata: Metadata = {
  title: "Curso",
};

/**
 * SCR-08 · Curso: las lecciones del curso con su actividad y sus casos, y el examen (OP-17). Se llega desde SCR-07
 * (tarjeta del curso) y desde la búsqueda de SCR-06. De aquí se va a la lección, a una actividad o caso, o al examen.
 * `params` es dato de la solicitud, así que se lee dentro de `<Suspense>`, no en la página.
 */
export default function PaginaCurso({ params }: PageProps<"/modulos/[modulo]/[curso]">) {
  return (
    <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-[1240px] px-5 pt-[31px] pb-24 outline-none">
      <Suspense fallback={<CursoCargando />}>
        <Curso params={params} />
      </Suspense>
    </main>
  );
}
