"use client";

import { useEffect } from "react";

/** Escalonado entre íconos que entran juntos (`animate`: 30–80 ms). */
const PASO_MS = 60;

/**
 * Dibuja una sola vez los íconos de trazo marcados con `data-dibujar` cuando entran en la ventana.
 * Los que ya están a la vista al cargar se quedan como están; los de más abajo se marcan como
 * pendientes y se dibujan al llegar, escalonados por orden de aparición. Con movimiento reducido o sin
 * IntersectionObserver no hace nada: los íconos se ven completos. No renderiza nada.
 */
export function DibujoDeIconos() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const elementos = Array.from(document.querySelectorAll<HTMLElement>("[data-dibujar]"));
    const observador = new IntersectionObserver(
      (entradas) => {
        const visibles = entradas
          .filter((entrada) => entrada.isIntersecting)
          .map((entrada) => entrada.target as HTMLElement)
          .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
        visibles.forEach((elemento, orden) => {
          elemento.style.setProperty("--retraso", `${orden * PASO_MS}ms`);
          elemento.dataset.dibujo = "dibujado";
          observador.unobserve(elemento);
        });
      },
      { threshold: 0.6 },
    );

    for (const elemento of elementos) {
      if (elemento.getBoundingClientRect().top < window.innerHeight) continue;
      elemento.dataset.dibujo = "pendiente";
      observador.observe(elemento);
    }

    return () => observador.disconnect();
  }, []);

  return null;
}
