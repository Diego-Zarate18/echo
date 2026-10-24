import Link from "next/link";
import { Filamentos } from "@/componentes/marca/Filamentos";
import { Logo } from "@/componentes/marca/Logo";
import { Moris } from "@/componentes/marca/Moris";
import { MorisVivo } from "@/componentes/marca/MorisVivo";
import { Ondas } from "@/componentes/marca/Ondas";
import { IconoAyuda } from "@/componentes/ui/iconos/iconos";

type PropsPanelDeAcceso = {
  /** Saludo en dos renglones, como en Figma. */
  saludo: readonly [string, string];
  /** Párrafo bajo el saludo; solo en escritorio. */
  entrada: string;
};

/**
 * Panel café de las pantallas de acceso (SCR-01: 67:42 escritorio, 68:205 móvil). Es el encabezado de la página:
 * el logo lleva al inicio y, en móvil, el botón redondo lleva a Ayuda.
 *
 * Reutiliza las piezas del hero en su versión estática: Moris ya está en su lugar (no brota) y los filamentos ya están
 * trazados. Solo hay una entrada sobria, una vez: Moris y el saludo suben 24 px mientras aparecen. Con ratón, Moris se
 * asoma hacia el puntero y las ondas suenan al pasar sobre él, igual que en el hero.
 */
export function PanelDeAcceso({ saludo, entrada }: PropsPanelDeAcceso) {
  return (
    <header
      data-fondo="oscuro"
      className="relative isolate m-3 flex min-h-[236px] shrink-0 flex-col overflow-hidden rounded-panel bg-marca-cafe p-5 text-marca-crema shadow-hero lg:sticky lg:top-4 lg:m-0 lg:h-[calc(100dvh-2rem)] lg:min-h-[38rem] lg:w-[clamp(25rem,44.4vw,40rem)] lg:rounded-hero lg:px-10 lg:pt-[38px] lg:pb-10"
    >
      {/* «ÉTICA» de fondo (67:43): 230 px al 7 %, recortada por el borde del panel. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-[88px] left-[-13px] -z-10 hidden font-titulo text-[230px] leading-none font-black tracking-[-0.03em] whitespace-nowrap text-marca-crema/7 select-none lg:block"
      >
        ÉTICA
      </span>

      <div className="flex items-start justify-between">
        <Link href="/" className="rounded-logo">
          <Logo fondo="oscuro" preload className="w-28 lg:w-[140px]" />
          <span className="sr-only">, ir al inicio</span>
        </Link>
        <Link
          href="/ayuda"
          aria-label="Ayuda"
          className="-mt-1.5 flex size-11 items-center justify-center rounded-full border border-marca-crema/20 bg-marca-crema/8 transition-[background-color] duration-150 hover:bg-marca-crema/16 lg:hidden"
        >
          <IconoAyuda className="size-5" />
        </Link>
      </div>

      {/*
        Moris (67:45): 244 × 288 a 150 px del borde. En ventanas bajas se achica para no tocar el saludo.
        En móvil (68:212) queda abajo a la derecha, a 110 px de ancho y sin filamentos.
      */}
      <div className="absolute right-5 bottom-[22px] w-[110px] animate-aparecer lg:relative lg:right-auto lg:bottom-auto lg:mt-[clamp(1rem,8dvh,4.5rem)] lg:ml-[19.6%] lg:w-[clamp(160px,calc(100dvh-656px),244px)]">
        <MorisVivo saludo={false}>
          <Ondas alCargar={false} />
          <Moris expresion="principal" alt="" sizes="(min-width: 1024px) 244px, 110px" preload className="w-full" />
          <Filamentos className="top-[36%] left-[94%] hidden w-[81%] text-marca-menta lg:block" />
        </MorisVivo>
      </div>

      <div className="mt-auto flex animate-aparecer flex-col gap-4 [animation-delay:80ms]">
        <p className="max-w-[220px] font-titulo text-[30px] leading-[1.08] font-black tracking-[-0.015em] lg:max-w-[520px] lg:text-[46px]">
          <span className="block">{saludo[0]}</span>
          <span className="block">{saludo[1]}</span>
        </p>
        <p className="hidden max-w-[500px] text-amplio leading-[1.55] text-marca-crema/86 lg:block">{entrada}</p>
      </div>
    </header>
  );
}
