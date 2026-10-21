"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Boton } from "@/componentes/ui/Boton";
import { IconoCerrar, IconoMenu } from "@/componentes/ui/iconos/iconos";

/** Desde qué ancho aparece la navegación de escritorio y se esconde este menú. */
const ESCRITORIO = {
  lg: { consulta: "(min-width: 64rem)", ocultar: "lg:hidden" },
  xl: { consulta: "(min-width: 80rem)", ocultar: "xl:hidden" },
} as const;

export type EnlaceMenu = {
  /** Ruta interna (`/ayuda`) o ancla de la misma página (`#que-es-echo`). */
  href: string;
  texto: string;
  /** Página actual: lleva `aria-current="page"`. */
  actual?: boolean;
};

type PropsMenuMovil = {
  enlaces: readonly EnlaceMenu[];
  /** Nombre del `nav` del panel. */
  etiqueta: string;
  escritorioDesde: keyof typeof ESCRITORIO;
};

/**
 * Menú de los encabezados públicos en móvil y tableta (botón de 84:719).
 * Figma no dibuja el menú abierto: es un panel bajo el encabezado dentro de «Tierra».
 * Se cierra con Escape (el foco vuelve al botón), al elegir un enlace, al tocar fuera
 * y al pasar a escritorio. Lo usan el inicio (SCR-18) y las páginas internas (SCR-05, SCR-17).
 */
export function MenuMovil({ enlaces, etiqueta, escritorioDesde }: PropsMenuMovil) {
  const escritorio = ESCRITORIO[escritorioDesde];
  const [abierto, setAbierto] = useState(false);
  const botonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const cerrar = useCallback((devolverFoco: boolean) => {
    setAbierto(false);
    if (devolverFoco) botonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!abierto) return;

    function alPresionarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        cerrar(true);
      }
    }

    function alTocarFuera(evento: PointerEvent) {
      const objetivo = evento.target as Node;
      if (panelRef.current?.contains(objetivo) || botonRef.current?.contains(objetivo)) return;
      cerrar(false);
    }

    const anchoEscritorio = window.matchMedia(escritorio.consulta);
    function alCambiarAncho(evento: MediaQueryListEvent) {
      if (evento.matches) cerrar(false);
    }

    document.addEventListener("keydown", alPresionarTecla);
    document.addEventListener("pointerdown", alTocarFuera);
    anchoEscritorio.addEventListener("change", alCambiarAncho);
    return () => {
      document.removeEventListener("keydown", alPresionarTecla);
      document.removeEventListener("pointerdown", alTocarFuera);
      anchoEscritorio.removeEventListener("change", alCambiarAncho);
    };
  }, [abierto, cerrar, escritorio.consulta]);

  return (
    <div className={escritorio.ocultar}>
      <button
        ref={botonRef}
        type="button"
        aria-expanded={abierto}
        aria-controls="menu-movil"
        aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
        onClick={() => setAbierto((valor) => !valor)}
        className="flex size-12 items-center justify-center rounded-full border border-blanco/18 bg-marca-crema/8 text-marca-crema backdrop-blur-[10px] transition-colors hover:bg-marca-crema/14"
      >
        {abierto ? <IconoCerrar className="size-[22px]" /> : <IconoMenu className="size-[22px]" />}
      </button>

      <div
        ref={panelRef}
        id="menu-movil"
        hidden={!abierto}
        className="absolute inset-x-2 top-full z-40 mt-3 rounded-panel border border-blanco/16 bg-marca-cafe p-3 shadow-vidrio motion-safe:transition-[opacity,translate] motion-safe:duration-200 motion-safe:ease-out motion-safe:starting:-translate-y-1 motion-safe:starting:opacity-0 md:inset-x-auto md:right-0 md:w-[22rem]"
      >
        <nav aria-label={etiqueta}>
          <ul className="flex flex-col">
            {enlaces.map((enlace) => {
              const clases =
                "flex min-h-12 items-center rounded-full px-4 font-titulo text-cuerpo font-semibold text-marca-crema transition-colors hover:bg-marca-crema/14 aria-[current=page]:bg-marca-crema/14";
              return (
                <li key={enlace.href}>
                  {enlace.href.startsWith("#") ? (
                    <a href={enlace.href} onClick={() => cerrar(false)} className={clases}>
                      {enlace.texto}
                    </a>
                  ) : (
                    <Link
                      href={enlace.href}
                      aria-current={enlace.actual ? "page" : undefined}
                      onClick={() => cerrar(false)}
                      className={clases}
                    >
                      {enlace.texto}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mt-3 flex flex-col gap-2.5 border-t border-marca-crema/16 pt-4">
          <Boton variante="contorno" href="/iniciar-sesion" onClick={() => cerrar(false)} className="w-full">
            Iniciar sesión
          </Boton>
          <Boton variante="crema" conFlecha href="/registro" onClick={() => cerrar(false)} className="w-full">
            Crear cuenta
          </Boton>
        </div>
      </div>
    </div>
  );
}
