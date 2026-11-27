import type { Metadata } from "next";
import { Suspense } from "react";
import { PortadaExamenCargando } from "@/areas/examen/componentes/PortadaExamen";
import { Resolucion } from "@/areas/examen/componentes/Resolucion";

export const metadata: Metadata = {
  title: "Examen",
};

/** SCR-12 · Examen: resolución (OP-25, OP-26, OP-27). `params` se lee dentro de `<Suspense>`. */
export default function PaginaResolverExamen({ params }: PageProps<"/examenes/[cuestionario]/resolver">) {
  return (
    <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-[1240px] px-5 pt-[31px] pb-24 outline-none">
      <Suspense fallback={<PortadaExamenCargando />}>
        <Resolucion params={params} />
      </Suspense>
    </main>
  );
}
