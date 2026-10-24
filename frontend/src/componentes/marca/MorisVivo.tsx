"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Desplazamiento máximo hacia el puntero, en píxeles. Poco: Moris se asoma, no persigue. */
const DESPLAZAMIENTO_X = 8;
const DESPLAZAMIENTO_Y = 6;

const CONSULTA_APTA = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

function acotar(valor: number) {
  return Math.max(-1, Math.min(1, valor));
}

/**
 * Moris del hero con vida propia:
 * - al terminar la entrada da un solo salto corto (`.saludo`, solo traslación vertical);
 * - con ratón, se asoma unos píxeles hacia el puntero dentro del hero y vuelve a su lugar al salir.
 *   Es una transición de CSS: cada movimiento nuevo parte del valor actual, así que se interrumpe sin saltos.
 * Con movimiento reducido o pantalla táctil no se mueve. Nunca escala ni rota a Moris.
 */
export function MorisVivo({ children }: { children: ReactNode }) {
  const moris = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const elemento = moris.current;
    const ancla = elemento?.parentElement;
    const portada = elemento?.closest("section");
    if (!elemento || !ancla || !portada) return;

    const apta = window.matchMedia(CONSULTA_APTA);
    let cuadro = 0;

    function asomarse(evento: PointerEvent) {
      if (!apta.matches || evento.pointerType !== "mouse") return;
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(() => {
        // Se mide el contenedor, que no se mueve, para que el desplazamiento no se retroalimente.
        const centro = ancla!.getBoundingClientRect();
        const hero = portada!.getBoundingClientRect();
        const x = acotar((evento.clientX - (centro.left + centro.width / 2)) / (hero.width / 2));
        const y = acotar((evento.clientY - (centro.top + centro.height / 2)) / (hero.height / 2));
        elemento!.style.transform = `translate3d(${(x * DESPLAZAMIENTO_X).toFixed(2)}px, ${(y * DESPLAZAMIENTO_Y).toFixed(2)}px, 0)`;
      });
    }

    function volver() {
      cancelAnimationFrame(cuadro);
      elemento!.style.transform = "";
    }

    portada.addEventListener("pointermove", asomarse);
    portada.addEventListener("pointerleave", volver);
    apta.addEventListener("change", volver);
    return () => {
      cancelAnimationFrame(cuadro);
      portada.removeEventListener("pointermove", asomarse);
      portada.removeEventListener("pointerleave", volver);
      apta.removeEventListener("change", volver);
    };
  }, []);

  return (
    <span
      ref={moris}
      className="saludo relative isolate block transition-transform duration-500 ease-(--ease-respuesta)"
    >
      {children}
    </span>
  );
}
