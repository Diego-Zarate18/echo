"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Memoria de la página (no del navegador): pasa a `true` cuando el panel de acceso ya entró una vez. Sobrevive a la
 * navegación del cliente entre pantallas de acceso y se reinicia al recargar. En el servidor siempre es la primera vez.
 */
let panelYaEntro = false;

/**
 * Tiempo mínimo oculto para tratar el regreso como «la persona volvió» (con «Atrás»). El modo estricto de React en
 * desarrollo desmonta y vuelve a montar al instante; eso no cuenta.
 */
const OCULTO_MINIMO_MS = 50;

/** Igual que `--animate-fundido` en globales.css. */
const FUNDIDO_MS = 200;

/** Bloques que ya escuchan el fin de su primera entrada. */
const conEscucha = new WeakSet<HTMLElement>();

export function EntradaDelPanel({
  primera,
  siguientes = "",
  className,
  children,
}: {
  /** Clases de animación de la primera entrada. */
  primera: string;
  /** Clases de animación en las navegaciones siguientes ("" = sin animación). */
  siguientes?: string;
  className: string;
  children: ReactNode;
}) {
  // Se decide al montar y no cambia: si se recalculara, al volver a dibujar tras la entrada el saludo se fundiría otra vez.
  const [yaEntro] = useState(() => typeof window !== "undefined" && panelYaEntro);
  const bloque = useRef<HTMLDivElement>(null);
  const ocultoDesde = useRef<number | null>(null);
  // Al terminar la primera entrada se quita su clase, para que no se repita.
  const [entradaTerminada, setEntradaTerminada] = useState(false);

  useLayoutEffect(() => {
    panelYaEntro = true;
    // Next conserva oculta la pantalla anterior y, al volver a ella (con «Atrás» o con un enlace), la muestra otra vez.
    // Moris no se mueve (su clase ya no tiene animación, ver `alTerminarLaEntrada`); el saludo cambia con el mismo
    // fundido que `animate-fundido` (200 ms, solo opacidad), como en cualquier otra navegación.
    const elemento = bloque.current;
    const volvio = ocultoDesde.current !== null && performance.now() - ocultoDesde.current > OCULTO_MINIMO_MS;
    if (elemento && volvio && !yaEntro && siguientes) {
      const curva = getComputedStyle(elemento).getPropertyValue("--ease-respuesta").trim() || "ease-out";
      elemento.animate({ opacity: [0, 1] }, { duration: FUNDIDO_MS, easing: curva });
    }

    /*
     * La primera entrada termina al acabar (`animationend`) o al ocultarse la pantalla a media entrada: `display: none`
     * cancela la animación CSS (`animationcancel`). En los dos casos se quita la clase; si quedara, el navegador la
     * reiniciaría al volver a mostrar la pantalla y Moris subiría otra vez.
     * Los escuchas se ponen una vez por elemento y no se quitan: `animationcancel` llega después de que React limpia
     * los efectos de la pantalla que oculta (y React no tiene `onAnimationCancel`).
     */
    if (elemento && !yaEntro && !conEscucha.has(elemento)) {
      conEscucha.add(elemento);
      const alTerminarLaEntrada = (evento: AnimationEvent) => {
        // Solo la animación de este bloque, no las de Moris ni las ondas que lleva dentro.
        if (evento.target === elemento) setEntradaTerminada(true);
      };
      elemento.addEventListener("animationend", alTerminarLaEntrada);
      elemento.addEventListener("animationcancel", alTerminarLaEntrada);
    }
    return () => {
      ocultoDesde.current = performance.now();
    };
  }, [yaEntro, siguientes]);

  const animacion = yaEntro ? siguientes : entradaTerminada ? "" : primera;
  return (
    <div ref={bloque} className={`${className} ${animacion}`}>
      {children}
    </div>
  );
}
