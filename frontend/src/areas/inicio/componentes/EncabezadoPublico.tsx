import Link from "next/link";
import { Logo } from "@/componentes/marca/Logo";
import { Boton } from "@/componentes/ui/Boton";
import { seccionesInicio } from "@/areas/inicio/secciones";
import { MenuMovil } from "./MenuMovil";

/**
 * Encabezado del inicio público (84:490 escritorio, 84:719 móvil).
 * Se dibuja sobre la tarjeta del hero; en el DOM va antes de `<main>`.
 */
export function EncabezadoPublico() {
  return (
    <header
      data-fondo="oscuro"
      className="absolute inset-x-2 top-2 z-30 mx-auto max-w-[1424px] px-5 pt-2 md:px-8 md:pt-5 xl:pt-7"
    >
      <div className="relative flex items-center justify-between gap-6">
        <Logo fondo="oscuro" preload className="w-[118px] xl:w-[152px]" />

        <nav
          aria-label="Secciones de la página"
          className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 xl:block"
        >
          <ul className="flex gap-0.5 rounded-full border border-blanco/16 bg-marca-crema/8 p-1.5 backdrop-blur-vidrio">
            {seccionesInicio.map((seccion) => (
              <li key={seccion.id}>
                <a
                  href={`#${seccion.id}`}
                  className="flex rounded-full px-[18px] py-2.5 font-titulo text-menor font-semibold whitespace-nowrap text-marca-crema transition-colors hover:bg-marca-crema/14"
                >
                  {seccion.texto}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-6 xl:flex">
          <Link
            href="/iniciar-sesion"
            className="inline-flex min-h-12 items-center rounded-full px-1 font-titulo text-menor font-bold text-marca-crema underline-offset-4 hover:underline"
          >
            Iniciar sesión
          </Link>
          <Boton variante="crema" tamano="mediano" href="/registro">
            Crear cuenta
          </Boton>
        </div>

        <MenuMovil secciones={seccionesInicio} />
      </div>
    </header>
  );
}
