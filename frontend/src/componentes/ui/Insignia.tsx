import type { ReactNode } from "react";
import {
  IconoAccesibilidad,
  IconoBalanza,
  IconoBaseDeDatos,
  IconoCandado,
  IconoEscudo,
  IconoInsignia,
  IconoOjo,
} from "@/componentes/ui/iconos/iconos";

type Tono = {
  /** Disco de la insignia que aún no se obtiene: 35 % del color sobre la superficie hundida. */
  pendiente: string;
  trazoPendiente: string;
  obtenida: string;
  trazoObtenida: string;
};

/** Cada módulo tiene su color: café, bosque o terracota, en ese orden y repetido. */
const tonos: readonly Tono[] = [
  {
    pendiente: "bg-[color-mix(in_srgb,var(--color-marca-cafe)_35%,var(--color-superficie-hundida))]",
    trazoPendiente: "stroke-[color-mix(in_srgb,var(--color-marca-cafe)_35%,var(--color-superficie-hundida))]",
    obtenida: "bg-marca-cafe",
    trazoObtenida: "stroke-marca-cafe",
  },
  {
    pendiente: "bg-[color-mix(in_srgb,var(--color-marca-bosque)_35%,var(--color-superficie-hundida))]",
    trazoPendiente: "stroke-[color-mix(in_srgb,var(--color-marca-bosque)_35%,var(--color-superficie-hundida))]",
    obtenida: "bg-marca-bosque",
    trazoObtenida: "stroke-marca-bosque",
  },
  {
    pendiente: "bg-[color-mix(in_srgb,var(--color-marca-terracota)_35%,var(--color-superficie-hundida))]",
    trazoPendiente: "stroke-[color-mix(in_srgb,var(--color-marca-terracota)_35%,var(--color-superficie-hundida))]",
    obtenida: "bg-marca-terracota",
    trazoObtenida: "stroke-marca-terracota",
  },
];

const iconos: Record<number, ReactNode> = {
  1: <IconoBalanza className="relative size-6 text-marca-crema" />,
  2: <IconoBaseDeDatos className="relative size-6 text-marca-crema" />,
  3: <IconoOjo className="relative size-6 text-marca-crema" />,
  4: <IconoEscudo className="relative size-6 text-marca-crema" />,
  5: <IconoAccesibilidad className="relative size-6 text-marca-crema" />,
};

type PropsInsignia = {
  /** Número del módulo (1 a 5): decide el color y el ícono. */
  orden: number;
  obtenida: boolean;
};

/**
 * Insignia de un módulo, con su anillo punteado. Es decorativa (aria-hidden): si se obtuvo o no ya lo dicen el
 * estado del módulo y el texto «Insignia obtenida el…» que van junto a ella.
 * Sin obtener va atenuada y con un candado; obtenida, de color pleno y sin candado.
 */
export function Insignia({ orden, obtenida }: PropsInsignia) {
  const tono = tonos[(Math.max(1, orden) - 1) % tonos.length];
  return (
    <span aria-hidden="true" className="relative inline-flex size-[72px] shrink-0 items-center justify-center">
      <svg viewBox="0 0 72 72" className="absolute inset-0 size-full">
        <circle cx="36" cy="36" r="36" className="fill-superficie-hundida" />
        <circle
          cx="36"
          cy="36"
          r="34"
          fill="none"
          strokeWidth="2"
          strokeDasharray="2.4 3.883"
          className={obtenida ? tono.trazoObtenida : tono.trazoPendiente}
        />
      </svg>
      <span
        className={`relative flex size-[58px] items-center justify-center rounded-full ${obtenida ? tono.obtenida : tono.pendiente}`}
      >
        <span className="absolute inset-[7px] rounded-full border border-marca-crema/45" />
        {iconos[orden] ?? <IconoInsignia className="relative size-6 text-marca-crema" />}
      </span>
      {obtenida ? null : (
        <span className="absolute -top-0.5 -right-0.5 flex size-6 items-center justify-center rounded-full bg-marca-cafe text-marca-crema">
          <IconoCandado className="size-3.5" />
        </span>
      )}
    </span>
  );
}
