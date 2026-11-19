"use client";

import { useEffect, useRef, type CSSProperties } from "react";

/** Retraso entre una onda y la siguiente cuando vuelven a sonar al pasar el puntero. */
const PASO_REPETICION_MS = 220;

/**
 * Ondas que salen de Moris al cargar la página: el sonido que se va y regresa.
 * Tres anillos, una sola vez (sin bucle, WCAG 2.2.2). Con puntero, vuelven a sonar cada vez que
 * el puntero entra en Moris; si la entrada todavía está sonando, no se interrumpe.
 * Con `alCargar={false}` (Iniciar sesión) no suenan al cargar: empiezan terminadas (`.onda-en-reposo`) y solo
 * suenan con el puntero.
 */
export function Ondas({ alCargar = true }: { alCargar?: boolean }) {
  const contenedorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const contenedor = contenedorRef.current;
    const moris = contenedor?.parentElement;
    if (!contenedor || !moris) return;

    const conPuntero = window.matchMedia("(hover: hover)");
    const movimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)");

    function sonar() {
      if (!conPuntero.matches || movimientoReducido.matches) return;
      const animaciones = Array.from(contenedor!.querySelectorAll<HTMLElement>(".onda")).map(
        (onda) => onda.getAnimations()[0],
      );
      if (animaciones.some((animacion) => !animacion || animacion.playState !== "finished")) return;
      animaciones.forEach((animacion, orden) => {
        animacion.effect?.updateTiming({ delay: orden * PASO_REPETICION_MS });
        animacion.currentTime = 0;
        animacion.play();
      });
    }

    moris.addEventListener("pointerenter", sonar);
    return () => moris.removeEventListener("pointerenter", sonar);
  }, []);

  return (
    <span ref={contenedorRef} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      {[0, 1, 2].map((orden) => (
        <span
          key={orden}
          style={{ "--orden": orden } as CSSProperties}
          className={`onda ${alCargar ? "" : "onda-en-reposo "}absolute top-[60%] left-1/2 aspect-square w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-marca-crema/30`}
        />
      ))}
    </span>
  );
}
