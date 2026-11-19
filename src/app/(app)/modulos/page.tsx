import type { Metadata } from "next";
import { Suspense } from "react";
import { Modulos, ModulosCargando } from "@/areas/contenido/componentes/Modulos";

export const metadata: Metadata = {
  title: "Módulos",
};

/**
 * SCR-06 · Módulos (inicio): lo primero que ve el alumno al iniciar sesión (OP-15, OP-21, OP-31).
 * `searchParams` es dato de la solicitud, así que se lee dentro de `<Suspense>`, no en la página.
 */
export default function PaginaModulos({ searchParams }: PageProps<"/modulos">) {
  return (
    <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-[1240px] px-5 pt-10 pb-24 outline-none">
      <Suspense fallback={<ModulosCargando />}>
        <Modulos searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
