import type { Metadata } from "next";
import { Logo } from "@/componentes/marca/Logo";
import { Moris } from "@/componentes/marca/Moris";
import { Boton } from "@/componentes/ui/Boton";

export const metadata: Metadata = {
  title: "Página no encontrada",
};

/** Página 404 en español con el estilo de «Tierra». */
export default function NoEncontrada() {
  return (
    <div className="flex min-h-dvh flex-col p-2">
      <main
        id="contenido"
        data-fondo="oscuro"
        className="flex flex-1 flex-col rounded-panel bg-marca-cafe px-5 pt-5 pb-10 text-marca-crema shadow-hero md:px-10 lg:rounded-hero lg:px-[72px] lg:pt-7"
      >
        <Logo fondo="oscuro" className="w-[118px] xl:w-[152px]" />
        <div className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col items-center justify-center gap-10 py-12 md:flex-row md:justify-between">
          <div className="flex max-w-[560px] flex-col gap-6">
            <h1 className="font-titulo text-cierre font-black text-balance">
              No encontramos esta página.
            </h1>
            <p className="text-amplio">
              Puede que el enlace esté incompleto o que la página todavía no exista. Desde el inicio
              puedes seguir explorando Echo.
            </p>
            <Boton variante="crema" conFlecha href="/" className="w-full md:w-[200px]">
              Ir al inicio
            </Boton>
          </div>
          <Moris expresion="triste" alt="" sizes="220px" className="w-[160px] md:w-[220px]" />
        </div>
      </main>
    </div>
  );
}
