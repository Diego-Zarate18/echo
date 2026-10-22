import Link from "next/link";
import { Logo } from "@/componentes/marca/Logo";
import { Boton } from "@/componentes/ui/Boton";
import { IconoFlechaIzquierda } from "@/componentes/ui/iconos/iconos";
import { MenuMovil } from "./MenuMovil";

type PaginaInterna = "/ayuda" | "/aviso-de-privacidad" | "/terminos-y-condiciones";

/** Páginas internas, en orden. Cada una enlaza a las demás (84:764 en el aviso, 84:857 en Ayuda; SCR-20 agrega los términos). */
const PAGINAS_INTERNAS: readonly { href: PaginaInterna; texto: string }[] = [
  { href: "/ayuda", texto: "Ayuda" },
  { href: "/aviso-de-privacidad", texto: "Aviso de privacidad" },
  { href: "/terminos-y-condiciones", texto: "Términos y condiciones" },
];

type PropsEncabezadoInterno = {
  /** Página en la que está el encabezado: enlaza a las demás páginas internas. */
  actual: PaginaInterna;
};

const enlaceTexto =
  "min-h-11 items-center gap-1.5 rounded-sm font-titulo text-menor text-marca-crema underline-offset-4 transition-[text-decoration-color] hover:underline";

/**
 * Encabezado de las páginas internas del sitio público (84:764): Aviso de privacidad (SCR-05), Ayuda (SCR-17) y
 * Términos y condiciones (SCR-20).
 * Franja crema de 8 px con la barra café de 64 px dentro, como el encabezado de la app. No es fijo: en estas
 * páginas se lee y el índice de cada página es el que acompaña al bajar. En móvil, logo y menú.
 * Como en Figma, el aviso enlaza a Ayuda y Ayuda al aviso; además, cada una enlaza a los términos.
 */
export function EncabezadoInterno({ actual }: PropsEncabezadoInterno) {
  const otras = PAGINAS_INTERNAS.filter((pagina) => pagina.href !== actual);
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
          {otras.map((pagina) => (
            <Link key={pagina.href} href={pagina.href} className={`${enlaceTexto} flex font-semibold whitespace-nowrap underline`}>
              {pagina.texto}
            </Link>
          ))}
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
            ...otras,
          ]}
          etiqueta="Páginas del sitio"
          escritorioDesde="lg"
        />
      </div>
    </header>
  );
}
