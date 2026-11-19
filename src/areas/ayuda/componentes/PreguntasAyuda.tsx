"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { IconoChevronAbajo } from "@/componentes/ui/iconos/iconos";

export type PreguntaConRespuesta = {
  /** Ancla de la pregunta en la URL y en el índice. */
  id: string;
  titulo: string;
  respuesta: ReactNode;
};

type PropsPreguntasAyuda = {
  preguntas: readonly PreguntaConRespuesta[];
  abiertasAlInicio: readonly string[];
};

/**
 * Abre la pregunta a la que lleva un ancla: al cargar con `/ayuda#…`, al cambiar el ancla (atrás y adelante)
 * y al usar un enlace de la página (el índice). Con el enlace, además, el foco pasa al botón de la pregunta;
 * el navegador ya la lleva a la vista, así que el foco no vuelve a desplazar la página.
 */
function useAbrirDesdeAncla(ids: readonly string[], abrir: (id: string) => void) {
  useEffect(() => {
    const idDe = (hash: string) => {
      const id = decodeURIComponent(hash.slice(1));
      return ids.includes(id) ? id : null;
    };

    const alCargar = idDe(window.location.hash);
    if (alCargar) abrir(alCargar);

    function alCambiarAncla() {
      const id = idDe(window.location.hash);
      if (id) abrir(id);
    }

    function alHacerClic(evento: MouseEvent) {
      const enlace = (evento.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      const id = enlace && idDe(enlace.getAttribute("href")!);
      if (!id) return;
      abrir(id);
      // Después de que el navegador siga el ancla: al seguirla, Chromium quita el foco del enlace.
      window.setTimeout(() => document.getElementById(`boton-${id}`)?.focus({ preventScroll: true }));
    }

    window.addEventListener("hashchange", alCambiarAncla);
    document.addEventListener("click", alHacerClic);
    return () => {
      window.removeEventListener("hashchange", alCambiarAncla);
      document.removeEventListener("click", alHacerClic);
    };
  }, [ids, abrir]);
}

/**
 * Acordeón de la Ayuda (84:813), con el patrón de acordeón de WAI-ARIA: cada pregunta es un `h2` con un
 * `button` (`aria-expanded`, `aria-controls`) y su respuesta es una región etiquetada por ese botón.
 * Se eligió sobre `<details>`: el lector de pantalla anuncia el `h2` (con `summary` se pierde el nivel de
 * título en varios lectores) y el alto se anima y se puede interrumpir en cualquier navegador.
 * Abrir y cerrar anima solo el alto (220 ms, `.respuesta-acordeon`) y el giro del chevrón; con movimiento
 * reducido el cambio es instantáneo. La respuesta cerrada no se lee ni recibe el foco (`visibility: hidden`).
 */
export function PreguntasAyuda({ preguntas, abiertasAlInicio }: PropsPreguntasAyuda) {
  const [abiertas, setAbiertas] = useState<ReadonlySet<string>>(() => new Set(abiertasAlInicio));
  const ids = useMemo(() => preguntas.map((pregunta) => pregunta.id), [preguntas]);
  const abrir = useCallback((id: string) => {
    setAbiertas((anteriores) => (anteriores.has(id) ? anteriores : new Set(anteriores).add(id)));
  }, []);
  useAbrirDesdeAncla(ids, abrir);

  function alternar(id: string) {
    setAbiertas((anteriores) => {
      const siguientes = new Set(anteriores);
      if (!siguientes.delete(id)) siguientes.add(id);
      return siguientes;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {preguntas.map(({ id, titulo, respuesta }) => {
        const abierta = abiertas.has(id);
        return (
          <div
            key={id}
            id={id}
            data-abierta={abierta}
            className="rounded-globo border border-transparent bg-superficie-elevada pb-2.5 shadow-relieve data-[abierta=true]:border-marca-cafe/22 data-[abierta=true]:shadow-none"
          >
            <h2 className="font-titulo text-tarjeta font-bold md:text-[1.375rem] md:leading-[1.12] md:tracking-[-0.004em]">
              <button
                type="button"
                id={`boton-${id}`}
                aria-expanded={abierta}
                aria-controls={`respuesta-${id}`}
                onClick={() => alternar(id)}
                className="flex min-h-11 w-full items-center justify-between gap-4 rounded-globo px-5 pt-5 pb-2.5 text-left md:px-6"
              >
                {titulo}
                <IconoChevronAbajo
                  className={`size-[22px] transition-[rotate] duration-220 ease-(--ease-respuesta) motion-reduce:transition-none ${abierta ? "rotate-180" : ""}`}
                />
              </button>
            </h2>
            <div
              id={`respuesta-${id}`}
              role="region"
              aria-labelledby={`boton-${id}`}
              data-abierta={abierta}
              className="respuesta-acordeon"
            >
              <div>
                <div className="flex flex-col items-start gap-3 px-5 pb-2.5 md:px-6">{respuesta}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
