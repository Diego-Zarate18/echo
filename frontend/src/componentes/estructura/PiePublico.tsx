import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/componentes/marca/Logo";
import upChiapasBlanco from "../../../public/imagenes/inicio/up-chiapas-blanco.png";

const enlaces = [
  { href: "/ayuda", texto: "Ayuda" },
  { href: "/aviso-de-privacidad", texto: "Aviso de privacidad" },
  { href: "/iniciar-sesion", texto: "Iniciar sesión" },
] as const;

/** Pie del sitio público (84:690). Lo comparten SCR-18, SCR-05 y SCR-17. */
export function PiePublico() {
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
            {enlaces.map((enlace) => (
              <li key={enlace.href}>
                <Link
                  href={enlace.href}
                  className="inline-flex min-h-6 items-center rounded-sm py-1 font-titulo text-menor font-bold underline-offset-4 hover:underline"
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
