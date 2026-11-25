import type { ReactNode } from "react";

/**
 * Tonos de la pastilla de estado (SCR-08, «Estados del examen»):
 * - `bosque`: contorno bosque (Disponible, En curso, Enviado).
 * - `bosqueRelleno`: bosque sólido con texto crema (Leída, Aprobado).
 * - `terracota`: contorno terracota y texto café (En espera).
 * - `tenue`: contorno café tenue (Bloqueado).
 */
export type TonoPastilla = "bosque" | "bosqueRelleno" | "terracota" | "tenue";

const tonos: Record<TonoPastilla, string> = {
  bosque: "border-marca-bosque text-marca-bosque",
  bosqueRelleno: "border-marca-bosque bg-marca-bosque text-marca-crema",
  terracota: "border-marca-terracota text-marca-cafe",
  tenue: "border-marca-cafe/25 text-texto-secundario",
};

type PropsPastilla = {
  tono: TonoPastilla;
  /** Siempre lleva ícono y texto: el estado nunca va solo en color (WCAG 1.4.1). */
  icono: ReactNode;
  children: ReactNode;
  /** Sobre una tarjeta café, el contorno lleva fondo crema para conservar el contraste. */
  sobreOscuro?: boolean;
  className?: string;
};

/** Etiqueta de estado de 32 px de alto, como `Estado` pero con el texto y el ícono a elección de quien la usa. */
export function Pastilla({ tono, icono, children, sobreOscuro = false, className }: PropsPastilla) {
  return (
    <span
      className={[
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 font-titulo text-nota font-bold whitespace-nowrap",
        tonos[tono],
        sobreOscuro && tono !== "bosqueRelleno" ? "bg-marca-crema" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {icono}
      {children}
    </span>
  );
}
