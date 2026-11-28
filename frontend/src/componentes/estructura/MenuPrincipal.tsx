"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { IconoModulos, IconoProgreso, IconoResultados } from "@/componentes/ui/iconos/iconos";
import type { PropsIcono } from "@/componentes/ui/iconos/Icono";

type Seccion = {
  href: string;
  texto: string;
  Icono: ComponentType<PropsIcono>;
  /** Rutas que pertenecen a la sección: el menú marca «Módulos» también dentro de una lección o un examen. */
  prefijos: readonly string[];
};

/** Las tres secciones del menú (SCR-06 › comunes): arriba en escritorio y abajo en móvil (DEC-80, por debajo de 768 px). */
export const SECCIONES: readonly Seccion[] = [
  { href: "/modulos", texto: "Módulos", Icono: IconoModulos, prefijos: ["/modulos", "/actividades", "/examenes"] },
  { href: "/mi-progreso", texto: "Mi progreso", Icono: IconoProgreso, prefijos: ["/mi-progreso"] },
  { href: "/mis-resultados", texto: "Mis resultados", Icono: IconoResultados, prefijos: ["/mis-resultados"] },
];

function perteneceA(ruta: string, prefijos: readonly string[]) {
  return prefijos.some((prefijo) => ruta === prefijo || ruta.startsWith(`${prefijo}/`));
}

/**
 * Menú principal del encabezado de escritorio. La sección actual lleva la píldora y `aria-current="page"`.
 * La píldora no es solo color: tiene forma, anillo y el texto pasa a negritas. Al cambiar de sección, la nueva crece
 * desde el 90 % con un fundido (200 ms) y la anterior se va igual; con movimiento reducido solo se funde.
 */
export function MenuPrincipal() {
  const ruta = usePathname();
  return (
    <nav aria-label="Principal" className="hidden items-center gap-1 md:flex lg:gap-1.5">
      {SECCIONES.map(({ href, texto, Icono, prefijos }) => {
        const activa = perteneceA(ruta, prefijos);
        return (
          <Link
            key={href}
            href={href}
            aria-current={ruta === href ? "page" : undefined}
            className={[
              "relative isolate inline-flex min-h-11 items-center gap-2 rounded-full px-3 font-titulo text-menor whitespace-nowrap text-marca-crema transition-[background-color] duration-150 ease-(--ease-respuesta)",
              activa ? "font-extrabold" : "font-semibold hover:bg-marca-crema/10",
            ].join(" ")}
          >
            <span
              aria-hidden="true"
              data-indicador
              className={[
                "pointer-events-none absolute inset-0 -z-10 rounded-full bg-marca-crema/14 ring-1 ring-marca-crema/26 ring-inset",
                "transition-[opacity,scale] duration-200 ease-(--ease-respuesta) motion-reduce:scale-100 motion-reduce:transition-opacity",
                activa ? "scale-100 opacity-100" : "scale-90 opacity-0",
              ].join(" ")}
            />
            <Icono className="size-5" />
            {texto}
          </Link>
        );
      })}
    </nav>
  );
}
