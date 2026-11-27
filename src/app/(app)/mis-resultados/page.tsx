import type { Metadata } from "next";
import { Suspense } from "react";
import { MisResultados, MisResultadosCargando } from "@/areas/resultados/componentes/MisResultados";

export const metadata: Metadata = {
  title: "Mis resultados",
};

/** SCR-15 · Mis resultados (OP-29): historial de intentos con filtros por módulo, tipo y fechas. */
export default function PaginaMisResultados({ searchParams }: PageProps<"/mis-resultados">) {
  return (
    <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-[1240px] px-5 pt-10 pb-24 outline-none">
      <Suspense fallback={<MisResultadosCargando />}>
        <MisResultados searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
