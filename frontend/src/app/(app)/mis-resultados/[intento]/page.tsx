import type { Metadata } from "next";
import { Suspense } from "react";
import { DetalleDeIntento } from "@/areas/resultados/componentes/DetalleDeIntento";
import { MisResultadosCargando } from "@/areas/resultados/componentes/MisResultados";

export const metadata: Metadata = {
  title: "Detalle del intento",
};

/** SCR-15 · Detalle de un intento (OP-30). Un examen reprobado nunca trae la respuesta correcta (DEC-11). */
export default function PaginaDetalleIntento({ params }: PageProps<"/mis-resultados/[intento]">) {
  return (
    <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-[1240px] px-5 pt-[31px] pb-24 outline-none">
      <Suspense fallback={<MisResultadosCargando />}>
        <DetalleDeIntento params={params} />
      </Suspense>
    </main>
  );
}
