"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SECCIONES } from "./MenuPrincipal";

function perteneceA(ruta: string, prefijos: readonly string[]) {
  return prefijos.some((prefijo) => ruta === prefijo || ruta.startsWith(`${prefijo}/`));
}

/**
 * Barra inferior de móvil y tableta (DEC-80): Módulos, Mi progreso y Mis resultados. El Perfil va en el encabezado.
 * Solo se ve por debajo de `md` (768 px, DEC-80); ahí el menú del encabezado se oculta. Respeta el área segura del teléfono.
 */
export function BarraInferior() {
  const ruta = usePathname();
  return (
    <nav
      aria-label="Principal"
      data-fondo="oscuro"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-marca-crema/14 bg-marca-cafe pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto flex max-w-xl">
        {SECCIONES.map(({ href, texto, Icono, prefijos }) => {
          const activa = perteneceA(ruta, prefijos);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={ruta === href ? "page" : undefined}
                className={[
                  "flex min-h-16 flex-col items-center justify-center gap-1 px-2 font-titulo text-nota text-marca-crema",
                  activa ? "font-bold" : "font-semibold opacity-80",
                ].join(" ")}
              >
                <span
                  className={`flex h-8 w-14 items-center justify-center rounded-full transition-[background-color] duration-150 ease-(--ease-respuesta) ${activa ? "bg-marca-crema/18" : ""}`}
                >
                  <Icono className="size-5" />
                </span>
                {texto}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
