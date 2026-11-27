import type { Metadata } from "next";
import { Suspense } from "react";
import { Actividad, ActividadCargando } from "@/areas/evaluables/componentes/Actividad";

export const metadata: Metadata = {
  title: "Actividad",
};

/** SCR-10 · Actividad o caso práctico (OP-22, OP-23). `params` se lee dentro de `<Suspense>`. */
export default function PaginaActividad({ params }: PageProps<"/actividades/[cuestionario]">) {
  return (
    <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-[1240px] px-5 pt-[31px] pb-24 outline-none">
      <Suspense fallback={<ActividadCargando />}>
        <Actividad params={params} />
      </Suspense>
    </main>
  );
}
