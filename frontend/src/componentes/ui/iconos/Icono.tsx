import type { ReactNode, SVGProps } from "react";

export type PropsIcono = Omit<SVGProps<SVGSVGElement>, "children"> & {
  /** Texto para lectores de pantalla. Sin él, el ícono es decorativo (aria-hidden). */
  titulo?: string;
};

type PropsIconoBase = PropsIcono & {
  /** Lado del lienzo original del ícono en Figma (viewBox cuadrado). */
  lienzo: number;
  children: ReactNode;
};

/**
 * Base de los íconos de trazo 1.75 de Figma (estilo Lucide).
 * Las rutas vienen exportadas de Figma; el color sale de `currentColor`
 * y el trazo se mantiene en 1.75 px a cualquier tamaño (clase `icono`).
 */
export function Icono({ lienzo, titulo, className, children, ...resto }: PropsIconoBase) {
  return (
    <svg
      viewBox={`0 0 ${lienzo} ${lienzo}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      role={titulo ? "img" : undefined}
      aria-hidden={titulo ? undefined : true}
      className={["icono shrink-0", className].filter(Boolean).join(" ")}
      {...resto}
    >
      {titulo ? <title>{titulo}</title> : null}
      {children}
    </svg>
  );
}
