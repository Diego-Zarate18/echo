import Link from "next/link";
import { Logo } from "@/componentes/marca/Logo";
import { Boton } from "@/componentes/ui/Boton";
import { IconoFlechaIzquierda } from "@/componentes/ui/iconos/iconos";
import { MenuMovil } from "./MenuMovil";

type PaginaInterna = "/ayuda" | "/aviso-de-privacidad";

/** Cada página interna enlaza a la otra (84:764 en el aviso, 84:857 en Ayuda). */
const OTRA_PAGINA: Record<PaginaInterna, { href: PaginaInterna; texto: string }> = {
  "/aviso-de-privacidad": { href: "/ayuda", texto: "Ayuda" },
  "/ayuda": { href: "/aviso-de-privacidad", texto: "Aviso de privacidad" },
};

type PropsEncabezadoInterno = {
  /** Página en la que está el encabezado: enlaza a la otra página interna. */
  actual: PaginaInterna;
};

const enlaceTexto =
  "min-h-11 items-center gap-1.5 rounded-sm font-titulo text-menor text-marca-crema underline-offset-4 transition-[text-decoration-color] hover:underline";

/**
 * Encabezado de las páginas internas del sitio público (84:764): Aviso de privacidad (SCR-05) y Ayuda (SCR-17).
 * Franja crema de 8 px con la barra café de 64 px dentro, como el encabezado de la app. No es fijo: en estas
 * páginas se lee y el índice de cada página es el que acompaña al bajar. En móvil, logo y menú.
 * Como en Figma, el aviso enlaza a Ayuda y Ayuda al aviso.
 */
export function EncabezadoInterno({ actual }: PropsEncabezadoInterno) {
  const otra = OTRA_PAGINA[actual];
  return (
    <header data-fondo="oscuro" className="px-2 pt-2">
      <div className="relative mx-auto flex h-16 max-w-[1424px] items-center justify-between gap-6 rounded-aviso bg-marca-cafe px-4 shadow-barra md:px-8">
        <div className="flex items-center gap-7">
          <Link href="/" aria-label="Echo, inicio" className="flex min-h-11 items-center rounded-logo">
            <Logo fondo="oscuro" preload className="w-[110px] lg:w-[128px]" />
          </Link>
          <Link href="/" className={`${enlaceTexto} hidden font-semibold lg:flex`}>
            <IconoFlechaIzquierda className="size-[18px]" />
            Volver al inicio
          </Link>
        </div>

        <nav aria-label="Páginas del sitio" className="hidden items-center gap-5 lg:flex">
          <Link href={otra.href} className={`${enlaceTexto} flex font-semibold underline`}>
            {otra.texto}
          </Link>
          <Link href="/iniciar-sesion" className={`${enlaceTexto} flex font-bold`}>
            Iniciar sesión
          </Link>
          <Boton variante="crema" conFlecha href="/registro" className="w-[200px]">
            Crear cuenta
          </Boton>
        </nav>

        <MenuMovil
          enlaces={[
            { href: "/", texto: "Volver al inicio" },
            { href: otra.href, texto: otra.texto },
          ]}
          etiqueta="Páginas del sitio"
          escritorioDesde="lg"
        />
      </div>
    </header>
  );
}
