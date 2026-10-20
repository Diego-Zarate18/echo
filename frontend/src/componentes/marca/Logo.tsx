import Image from "next/image";
import logoOscuro from "../../../public/marca/logo-echo-oscuro.png";
import logoClaro from "../../../public/marca/logo-echo-claro.png";

const logos = {
  /** Vistas de la app (84:491, 84:692): lettering terracota y circuitos en menta. */
  oscuro: logoOscuro,
  /** Página «Identidad» (24:10): versión para fondos claros, circuitos en verde tenue. */
  claro: logoClaro,
} as const;

type PropsLogo = {
  /** Fondo sobre el que se coloca. El logo se usa en la versión que le corresponde. */
  fondo: keyof typeof logos;
  /** Clases de tamaño: fija el ancho; la altura sigue la proporción del archivo. */
  className?: string;
  /** Precarga para el logo que aparece en la primera pantalla. */
  preload?: boolean;
};

/** Logo de Echo exportado de Figma. Nunca se redibuja, deforma ni recolorea. */
export function Logo({ fondo, className, preload = false }: PropsLogo) {
  return (
    <Image
      src={logos[fondo]}
      alt="Echo"
      preload={preload}
      sizes="160px"
      className={["h-auto", className].filter(Boolean).join(" ")}
    />
  );
}
