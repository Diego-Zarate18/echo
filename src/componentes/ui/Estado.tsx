import type { ReactNode } from "react";
import { IconoCandado, IconoCirculoCheck, IconoCirculoPunto } from "@/componentes/ui/iconos/iconos";

export type EstadoContenido = "bloqueado" | "disponible" | "enCurso" | "completado";

const estados: Record<EstadoContenido, { texto: string; clases: string; icono: ReactNode }> = {
  disponible: {
    texto: "Disponible",
    clases: "border-marca-bosque text-marca-bosque",
    icono: <IconoCirculoPunto className="size-[15px]" />,
  },
  enCurso: {
    texto: "En curso",
    clases: "border-marca-bosque text-marca-bosque",
    icono: <IconoCirculoPunto className="size-[15px]" />,
  },
  completado: {
    texto: "Completado",
    clases: "border-marca-bosque bg-marca-bosque text-marca-crema",
    icono: <IconoCirculoCheck className="size-[15px]" />,
  },
  bloqueado: {
    texto: "Bloqueado",
    clases: "border-marca-cafe/25 text-texto-secundario",
    icono: <IconoCandado className="size-[15px]" />,
  },
};

/** Etiqueta de estado de un módulo, curso o lección. Siempre lleva texto e ícono, nunca solo color (WCAG 1.4.1). */
export function Estado({ estado, className }: { estado: EstadoContenido; className?: string }) {
  const { texto, clases, icono } = estados[estado];
  return (
    <span
      className={[
        "inline-flex h-[30px] items-center gap-1.5 rounded-full border px-3 font-titulo text-nota font-semibold whitespace-nowrap",
        clases,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {icono}
      {texto}
    </span>
  );
}
