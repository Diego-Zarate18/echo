import type { ComponentType } from "react";
import {
  IconoAccesibilidad,
  IconoBalanza,
  IconoBaseDeDatos,
  IconoCandado,
  IconoEscudo,
  IconoInsignia,
  IconoOjo,
} from "@/componentes/ui/iconos/iconos";
import type { PropsIcono } from "@/componentes/ui/iconos/Icono";

type Tono = {
  /** Disco de la insignia que aún no se obtiene: 35 % del color sobre la superficie hundida. */
  pendiente: string;
  obtenida: string;
};

/** Cada módulo tiene su color: café, bosque o terracota, en ese orden y repetido. */
const tonos: readonly Tono[] = [
  {
    pendiente: "bg-[color-mix(in_srgb,var(--color-marca-cafe)_35%,var(--color-superficie-hundida))]",
    obtenida: "bg-marca-cafe",
  },
  {
    pendiente: "bg-[color-mix(in_srgb,var(--color-marca-bosque)_35%,var(--color-superficie-hundida))]",
    obtenida: "bg-marca-bosque",
  },
  {
    pendiente: "bg-[color-mix(in_srgb,var(--color-marca-terracota)_35%,var(--color-superficie-hundida))]",
    obtenida: "bg-marca-terracota",
  },
];

const iconos: Record<number, ComponentType<PropsIcono>> = {
  1: IconoBalanza,
  2: IconoBaseDeDatos,
  3: IconoOjo,
  4: IconoEscudo,
  5: IconoAccesibilidad,
};

/** Los puntos del anillo son siempre café al 38 % sobre la superficie hundida (#AD9886), sea cual sea el color del módulo. */
const TRAZO = "stroke-[color-mix(in_srgb,var(--color-marca-cafe)_38%,var(--color-superficie-hundida))]";

type PropsInsignia = {
  /** Número del módulo (1 a 5): decide el color y el ícono. */
  orden: number;
  obtenida: boolean;
  /** Diámetro: 72 px en las tarjetas de módulo y 96 px en la portada del módulo. Los puntos del anillo miden siempre 3 px. */
  tamano?: 72 | 96;
};

const clasesDeTamano = { 72: "size-[72px]", 96: "size-24" } as const;

/** Cuántos puntos caben en el anillo (un punto de 3 px y su hueco miden unos 6.64 px). */
function puntosDelAnillo(radio: number) {
  const n = Math.round((2 * Math.PI * radio) / 6.64);
  return { punto: 3, hueco: (2 * Math.PI * radio) / n - 3 };
}

/**
 * Insignia de un módulo, con su anillo punteado. Es decorativa (aria-hidden): si se obtuvo o no ya lo dicen el
 * estado del módulo y el texto «Insignia obtenida el…» que van junto a ella.
 * Sin obtener va atenuada y con un candado; obtenida, de color pleno y sin candado.
 */
export function Insignia({ orden, obtenida, tamano = 72 }: PropsInsignia) {
  const tono = tonos[(Math.max(1, orden) - 1) % tonos.length];
  const radio = tamano / 2 - 1.5;
  const { punto, hueco } = puntosDelAnillo(radio);
  const IconoDelSello = iconos[orden] ?? IconoInsignia;
  const trazoIcono = Math.round(tamano * 0.0235 * 100) / 100;
  return (
    <span aria-hidden="true" className={`relative inline-flex shrink-0 items-center justify-center ${clasesDeTamano[tamano]}`}>
      {/* Disco claro y puntos cuadrados de 3 px pegados al borde (33 en el sello de 72 y 44 en el de 96). */}
      <svg viewBox={`0 0 ${tamano} ${tamano}`} className="absolute inset-0 size-full">
        <circle cx={tamano / 2} cy={tamano / 2} r={tamano / 2} className="fill-superficie-hundida" />
        <circle cx={tamano / 2} cy={tamano / 2} r={radio} fill="none" strokeWidth="3" strokeDasharray={`${punto} ${hueco}`} className={TRAZO} />
      </svg>
      <span
        className={`relative flex size-[80.5%] items-center justify-center rounded-full ${obtenida ? tono.obtenida : tono.pendiente}`}
      >
        <span className="absolute inset-[9%] rounded-full border border-marca-crema/45" />
        <IconoDelSello strokeWidth={trazoIcono} className="relative size-[47%] text-marca-crema" />
      </span>
      {obtenida ? null : (
        <span className="absolute -top-0.5 -right-0.5 flex size-[26px] items-center justify-center rounded-full bg-marca-cafe text-marca-crema">
          <IconoCandado className="size-3.5" />
        </span>
      )}
    </span>
  );
}
