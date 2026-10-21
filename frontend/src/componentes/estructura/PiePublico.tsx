import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/componentes/marca/Logo";
import upChiapasBlanco from "../../../public/imagenes/inicio/up-chiapas-blanco.png";
import upChiapasCafe from "../../../public/imagenes/inicio/up-chiapas-cafe.png";

type RutaPie = "/ayuda" | "/aviso-de-privacidad" | "/iniciar-sesion";

const enlacesOscuro: readonly { href: RutaPie; texto: string }[] = [
  { href: "/ayuda", texto: "Ayuda" },
  { href: "/aviso-de-privacidad", texto: "Aviso de privacidad" },
  { href: "/iniciar-sesion", texto: "Iniciar sesión" },
];

const enlacesClaro: readonly { href: RutaPie; texto: string }[] = [
  { href: "/ayuda", texto: "Ayuda" },
  { href: "/aviso-de-privacidad", texto: "Aviso de privacidad" },
];

type PropsPiePublico = {
  /**
   * `oscuro`: pie del inicio (84:690).
   * `claro`: pie de las páginas internas y de la app (82:630), sobre crema.
   */
  variante: "oscuro" | "claro";
  /** Ruta de la página actual: su enlace lleva `aria-current="page"`. */
  actual?: RutaPie;
};

/** Pie del sitio público. Lo comparten SCR-18 (oscuro), SCR-05 y SCR-17 (claro). */
export function PiePublico({ variante, actual }: PropsPiePublico) {
  if (variante === "claro") {
    return (
      <footer
        data-fondo="claro"
        className="border-t border-marca-cafe/12 bg-marca-crema px-5 py-7 text-marca-cafe md:px-10"
      >
        <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Logo fondo="claro" className="w-[82px]" />
            <p className="text-detalle text-texto-secundario">Echo 1.0 · Universidad Politécnica de Chiapas</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
            <nav aria-label="Enlaces del pie de página">
              <ul className="flex flex-wrap gap-x-7">
                {enlacesClaro.map((enlace) => (
                  <li key={enlace.href}>
                    <Link
                      href={enlace.href}
                      aria-current={actual === enlace.href ? "page" : undefined}
                      className="inline-flex min-h-11 items-center rounded-sm font-titulo text-detalle font-bold underline underline-offset-4 hover:decoration-2"
                    >
                      {enlace.texto}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <Image
              src={upChiapasCafe}
              alt="Universidad Politécnica de Chiapas"
              sizes="118px"
              className="h-auto w-[118px]"
            />
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer
      data-fondo="oscuro"
      className="border-t border-marca-menta/16 bg-marca-cafe px-5 pt-11 pb-13 text-marca-crema md:px-10 lg:px-[72px]"
    >
      <div className="mx-auto flex w-full max-w-[1296px] flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3">
          <Logo fondo="oscuro" className="w-[132px]" />
          <p className="text-detalle">
            Echo 1.0 · Proyecto académico · Universidad Politécnica de Chiapas · 2026
          </p>
        </div>
        <nav aria-label="Enlaces del pie de página">
          <ul className="flex flex-wrap gap-x-8 gap-y-2">
            {enlacesOscuro.map((enlace) => (
              <li key={enlace.href}>
                <Link
                  href={enlace.href}
                  aria-current={actual === enlace.href ? "page" : undefined}
                  className="inline-flex min-h-11 items-center rounded-sm py-1 font-titulo text-menor font-bold underline-offset-4 hover:underline"
                >
                  {enlace.texto}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <Image
          src={upChiapasBlanco}
          alt="Universidad Politécnica de Chiapas"
          sizes="168px"
          className="h-auto w-[168px]"
        />
      </div>
    </footer>
  );
}
