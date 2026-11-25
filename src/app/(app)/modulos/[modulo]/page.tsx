import type { Metadata } from "next";
import { Suspense } from "react";
import { Modulo, ModuloCargando } from "@/areas/contenido/componentes/Modulo";

export const metadata: Metadata = {
  title: "Módulo",
};

/**
 * SCR-07 · Módulo: los cursos del módulo en orden, con su estado y avance (OP-16).
 * `params` es dato de la solicitud, así que se lee dentro de `<Suspense>`, no en la página.
 */
export default function PaginaModulo({ params }: PageProps<"/modulos/[modulo]">) {
  return (
    <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-[1240px] px-5 pt-[31px] pb-24 outline-none">
      <Suspense fallback={<ModuloCargando />}>
        <Modulo params={params} />
      </Suspense>
    </main>
  );
}
