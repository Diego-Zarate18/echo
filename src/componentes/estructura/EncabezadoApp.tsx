import Link from "next/link";
import { BotonCerrarSesion } from "@/areas/cuenta/componentes/BotonCerrarSesion";
import { Logo } from "@/componentes/marca/Logo";
import { IconoAyuda } from "@/componentes/ui/iconos/iconos";
import { obtenerSesion } from "@/lib/sesion";
import { MenuPrincipal } from "./MenuPrincipal";

/** Iniciales para el avatar: la primera letra del nombre y la del primer apellido («Ana López» → «AL»). */
function iniciales(nombre: string, apellidos: string | null) {
  const primera = (texto: string | null | undefined) => Array.from(texto?.trim() ?? "")[0]?.toLocaleUpperCase("es-MX") ?? "";
  return `${primera(nombre)}${primera(apellidos)}` || "E";
}

const enlaceEncabezado =
  "inline-flex min-h-11 items-center gap-1 font-titulo text-menor font-semibold whitespace-nowrap text-marca-crema decoration-2 underline-offset-4 hover:underline max-lg:min-w-11 max-lg:justify-center";

function Barra({ children }: { children?: React.ReactNode }) {
  return (
    <header data-fondo="oscuro" className="px-2 pt-2">
      <div className="mx-auto flex h-16 max-w-[1424px] items-center justify-between gap-4 rounded-aviso bg-marca-cafe px-4 shadow-barra md:px-8">
        <Link href="/modulos" aria-label="Echo, ir a Módulos" className="flex min-h-11 items-center rounded-logo">
          <Logo fondo="oscuro" preload className="w-[110px] lg:w-[128px]" />
        </Link>
        {children}
      </div>
    </header>
  );
}

/** Mientras llega la sesión, la barra ya está con su logo: la página no se mueve al aparecer el resto. */
export function EncabezadoAppCargando() {
  return <Barra />;
}

/**
 * Encabezado de las vistas con sesión (SCR-06 › comunes). Escritorio: logo, menú Módulos / Mi progreso / Mis
 * resultados, Ayuda, perfil con el nombre y Cerrar sesión. Móvil: logo, Ayuda y el avatar que lleva al Perfil; el menú
 * va abajo (BarraInferior, DEC-80). Lee la sesión: debe ir dentro de `<Suspense>`.
 */
export async function EncabezadoApp() {
  const sesion = await obtenerSesion();
  // Sin sesión válida, `ValidacionDeSesion` (layout) ya está llevando al alumno a Iniciar sesión.
  if (!sesion.ok) return <EncabezadoAppCargando />;
  const { nombre, apellidos } = sesion.datos;
  const nombreCompleto = [nombre, apellidos].filter(Boolean).join(" ");

  return (
    <Barra>
      <MenuPrincipal />
      <div className="flex items-center gap-1 lg:gap-5">
        <Link href="/ayuda" className={enlaceEncabezado}>
          <IconoAyuda className="size-5" />
          <span className="max-lg:sr-only">Ayuda</span>
        </Link>
        <Link
          href="/perfil"
          className="inline-flex min-h-11 items-center gap-2.5 rounded-full border border-marca-crema/28 py-1 pr-1 pl-1 font-titulo text-menor font-bold whitespace-nowrap text-marca-crema transition-[background-color] duration-150 ease-(--ease-respuesta) hover:bg-marca-crema/10 lg:pr-4"
        >
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-full bg-marca-menta text-nota font-extrabold text-marca-cafe"
          >
            {iniciales(nombre, apellidos)}
          </span>
          {/* El nombre accesible sale del contenido (sin aria-label): «Mi perfil, Alma López». En móvil solo se ve el avatar. */}
          <span className="sr-only">Mi perfil, </span>
          <span className="max-lg:sr-only">{nombreCompleto}</span>
        </Link>
        <div className="max-lg:hidden">
          <BotonCerrarSesion como="encabezado" />
        </div>
      </div>
    </Barra>
  );
}
