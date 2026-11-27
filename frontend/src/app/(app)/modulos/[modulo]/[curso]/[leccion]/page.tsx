import type { Metadata } from "next";
import { Suspense } from "react";
import { Leccion, LeccionCargando } from "@/areas/contenido/componentes/Leccion";

export const metadata: Metadata = {
  title: "Lección",
};

/**
 * SCR-09 · Lección (OP-18, OP-19, OP-20): una sección a la vez (`?seccion=n`), retoma donde se quedó el alumno y, en la
 * última, «Terminé la lección». `params` y `searchParams` son datos de la solicitud: se leen dentro de `<Suspense>`.
 */
export default function PaginaLeccion({ params, searchParams }: PageProps<"/modulos/[modulo]/[curso]/[leccion]">) {
  return (
    <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-[1240px] px-5 pt-[31px] pb-24 outline-none">
      <Suspense fallback={<LeccionCargando />}>
        <Leccion params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
