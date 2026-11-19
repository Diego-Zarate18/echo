import Image from "next/image";
import morisPrincipal from "../../../public/marca/moris-principal.png";
import morisFeliz from "../../../public/marca/moris-feliz.png";
import morisSorprendido from "../../../public/marca/moris-sorprendido.png";
import morisCurioso from "../../../public/marca/moris-curioso.png";
import morisTriste from "../../../public/marca/moris-triste.png";

const expresiones = {
  /** Ilustración principal del hero (84:480). */
  principal: morisPrincipal,
  /** Logros e insignias (84:581). */
  feliz: morisFeliz,
  /** Datos y leyes nuevas (84:534). */
  sorprendido: morisSorprendido,
  /** Dilemas y preguntas (84:590). */
  curioso: morisCurioso,
  /** Errores, con empatía (84:599). */
  triste: morisTriste,
} as const;

export type ExpresionMoris = keyof typeof expresiones;

type PropsMoris = {
  expresion: ExpresionMoris;
  /**
   * Texto alternativo obligatorio. Usa "" solo cuando Moris es decorativo
   * porque el texto que lo acompaña ya dice todo.
   */
  alt: string;
  /** Clases de tamaño: fija el ancho; la altura sigue la proporción del archivo. */
  className?: string;
  /** Ancho con el que se muestra, para servir el archivo adecuado. */
  sizes: string;
  preload?: boolean;
};

/** Moris, la mascota de Echo, exportado de Figma. Nunca se deforma, recolorea ni tapa. */
export function Moris({ expresion, alt, className, sizes, preload = false }: PropsMoris) {
  return (
    <Image
      src={expresiones[expresion]}
      alt={alt}
      sizes={sizes}
      preload={preload}
      className={["h-auto select-none", className].filter(Boolean).join(" ")}
      draggable={false}
    />
  );
}
