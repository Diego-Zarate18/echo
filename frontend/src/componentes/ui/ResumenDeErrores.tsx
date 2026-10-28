"use client";

import type { Ref } from "react";
import { Alerta } from "@/componentes/ui/Alerta";

export type ErrorDeCampo = { id: string; etiqueta: string; mensaje: string };

type PropsResumen = {
  errores: readonly ErrorDeCampo[];
  /** Título; por omisión «Revisa N campos» (Figma 69:930). */
  titulo?: string;
  ref?: Ref<HTMLDivElement>;
};

/**
 * Resumen al fallar el envío (§8, Figma 69:930): recibe el foco, va arriba del formulario y cada punto lleva a su
 * campo. Los errores junto a cada campo se conservan.
 */
export function ResumenDeErrores({ errores, titulo, ref }: PropsResumen) {
  return (
    <Alerta
      ref={ref}
      id="respuesta"
      tono="error"
      role="alert"
      titulo={titulo ?? (errores.length === 1 ? "Revisa 1 campo" : `Revisa ${errores.length} campos`)}
    >
      <ul className="flex flex-col gap-0.5">
        {errores.map((error) => (
          <li key={error.id}>
            <a
              href={`#${error.id}`}
              onClick={(evento) => {
                evento.preventDefault();
                document.getElementById(error.id)?.focus();
              }}
              className="underline underline-offset-4 hover:decoration-2"
            >
              {error.etiqueta}: {error.mensaje}
            </a>
          </li>
        ))}
      </ul>
    </Alerta>
  );
}
