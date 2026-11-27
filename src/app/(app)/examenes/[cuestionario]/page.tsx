import type { Metadata } from "next";
import { Suspense } from "react";
import { PortadaExamen, PortadaExamenCargando } from "@/areas/examen/componentes/PortadaExamen";

export const metadata: Metadata = {
  title: "Examen",
};

/** SCR-11 · Examen: portada (OP-24). `params` se lee dentro de `<Suspense>`. */
export default function PaginaPortadaExamen({ params }: PageProps<"/examenes/[cuestionario]">) {
  return (
    <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-[1240px] px-5 pt-[31px] pb-24 outline-none">
      <Suspense fallback={<PortadaExamenCargando />}>
        <PortadaExamen params={params} />
      </Suspense>
    </main>
  );
}
