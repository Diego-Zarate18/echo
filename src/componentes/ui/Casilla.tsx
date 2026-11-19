import type { InputHTMLAttributes, ReactNode, Ref } from "react";
import { IconoAlerta } from "@/componentes/ui/iconos/iconos";

type PropsCasilla = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type" | "className" | "children"> & {
  id: string;
  children: ReactNode;
  /** Texto del error («Marca esta casilla para continuar.»); liga la casilla con `aria-describedby`. */
  error?: string | null;
  ref?: Ref<HTMLInputElement>;
};

/**
 * Casilla (150:5543): sin marcar, marcada y error. Es un `input type="checkbox"` nativo de 24 px dentro de su
 * `label`, así que todo el renglón se puede tocar, funciona con espacio y el lector anuncia su estado. La caja se dibuja
 * con CSS (`appearance-none`) y la palomita de Figma va encima solo cuando está marcada.
 */
export function Casilla({ id, children, error, ref, ...entrada }: PropsCasilla) {
  const idError = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-[15px] leading-normal text-marca-cafe">
        <span className="relative flex size-6 shrink-0">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? idError : undefined}
            className="peer size-6 cursor-pointer appearance-none rounded-[6px] border-2 border-marca-cafe bg-superficie-elevada transition-[background-color,border-color] duration-150 ease-(--ease-respuesta) checked:bg-marca-cafe aria-invalid:border-estado-riesgosa motion-safe:active:scale-[0.92]"
            {...entrada}
          />
          {/* Palomita de la Casilla marcada (150:5530), en crema sobre café. */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            focusable="false"
            className="pointer-events-none absolute inset-0 hidden size-6 text-marca-crema peer-checked:block"
          >
            <path d="M6 12L10 16L18 7.5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="pt-px">{children}</span>
      </label>
      {error ? (
        <p id={idError} className="flex items-center gap-1.5 pl-9 font-titulo text-detalle font-bold text-estado-riesgosa">
          <IconoAlerta className="size-4" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
