import Link from "next/link";
import type { ReactNode } from "react";
import { PiePublico } from "@/componentes/estructura/PiePublico";
import { IconoAyuda, IconoFlechaIzquierda } from "@/componentes/ui/iconos/iconos";
import { PanelDeAcceso } from "./PanelDeAcceso";

const claseAcceso =
  "inline-flex min-h-6 items-center gap-2 font-titulo text-menor font-bold text-marca-cafe underline underline-offset-4 hover:decoration-2";

type PropsPantallaDeAcceso = {
  saludo: readonly [string, string];
  entrada: string;
  saludoCompacto?: boolean;
  children: ReactNode;
};

/**
 * Estructura de las pantallas de acceso (SCR-01, SCR-02, SCR-03 y SCR-19), de Figma 67:41 y 68:204.
 * Escritorio: panel café a la izquierda y la columna a la derecha, con los accesos arriba y el pie abajo.
 * Móvil: el panel se vuelve una franja arriba con el logo, Ayuda y el saludo.
 */
export function PantallaDeAcceso({ saludo, entrada, saludoCompacto, children }: PropsPantallaDeAcceso) {
  return (
    <div className="lg:flex lg:min-h-dvh lg:p-4">
      <PanelDeAcceso saludo={saludo} entrada={entrada} saludoCompacto={saludoCompacto} />
      <div className="flex flex-1 flex-col lg:min-h-[calc(100dvh-2rem)]">
        {/* En móvil el logo ya lleva al inicio y el botón redondo del panel, a Ayuda. */}
        <nav aria-label="Accesos" className="hidden justify-end gap-7 pt-6 pr-10 lg:flex">
          <Link href="/" className={claseAcceso}>
            <IconoFlechaIzquierda className="size-[18px]" />
            Volver al inicio
          </Link>
          <Link href="/ayuda" className={claseAcceso}>
            <IconoAyuda className="size-[18px]" />
            Ayuda
          </Link>
        </nav>
        <main id="contenido" tabIndex={-1} className="flex flex-1 flex-col justify-center px-5 pt-8 pb-4 outline-none lg:px-10 lg:py-10">
          <div className="mx-auto flex w-full max-w-[440px] flex-col gap-[18px] lg:gap-5">{children}</div>
        </main>
        <PiePublico variante="acceso" />
      </div>
    </div>
  );
}
