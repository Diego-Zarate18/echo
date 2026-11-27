import type { Metadata } from "next";
import { Suspense } from "react";
import { PortadaExamenCargando } from "@/areas/examen/componentes/PortadaExamen";
import { ResultadoGuardado } from "@/areas/examen/componentes/ResultadoGuardado";

export const metadata: Metadata = {
  title: "Resultado del examen",
};

/** SCR-13 · Examen: resultado de un intento ya enviado (OP-30). `params` se lee dentro de `<Suspense>`. */
export default function PaginaResultadoExamen({ params }: PageProps<"/examenes/[cuestionario]/resultado/[intento]">) {
  return (
    <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-[1240px] px-5 pt-[31px] pb-24 outline-none">
      <Suspense fallback={<PortadaExamenCargando />}>
        <ResultadoGuardado params={params} />
      </Suspense>
    </main>
  );
}
