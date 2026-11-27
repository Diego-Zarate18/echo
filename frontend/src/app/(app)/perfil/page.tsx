import type { Metadata } from "next";
import { Suspense } from "react";
import { Perfil, PerfilCargando } from "@/areas/cuenta/componentes/Perfil";

export const metadata: Metadata = {
  title: "Perfil",
};

/** SCR-16 · Perfil (OP-08): datos de la cuenta, seguridad, privacidad, descarga de datos y eliminación. */
export default function PaginaPerfil({ searchParams }: PageProps<"/perfil">) {
  return (
    <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-[960px] px-5 pt-10 pb-24 outline-none">
      <Suspense fallback={<PerfilCargando />}>
        <Perfil searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
