import type { Metadata } from "next";
import { Suspense } from "react";
import { MiProgreso, MiProgresoCargando } from "@/areas/progreso/componentes/MiProgreso";

export const metadata: Metadata = {
  title: "Mi progreso",
};

/** SCR-14 · Mi progreso (OP-28): avance general, por módulo y por curso, e insignias. */
export default function PaginaMiProgreso() {
  return (
    <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-[1240px] px-5 pt-10 pb-24 outline-none">
      <Suspense fallback={<MiProgresoCargando />}>
        <MiProgreso />
      </Suspense>
    </main>
  );
}
