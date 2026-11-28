"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Tras una navegación del cliente (cambia la ruta), lleva el foco al `h1` de la pantalla nueva, para que el teclado y
 * el lector de pantalla empiecen ahí y no en el botón de la pantalla anterior. En la carga completa no hace nada: la
 * primera tabulación sigue siendo «Saltar al contenido». Los cambios de `?búsqueda` o `#ancla` no mueven el foco.
 */
export function FocoAlNavegar() {
  const ruta = usePathname();
  const anterior = useRef(ruta);

  useEffect(() => {
    if (anterior.current === ruta) return;
    anterior.current = ruta;
    let intentos = 0;
    let marco = 0;
    const enfocar = () => {
      // Next deja montada la pantalla anterior con display: none: solo cuenta el h1 visible. El de la página nueva
      // puede llegar en streaming, así que se reintenta unos fotogramas (≈2 s).
      const titulo = Array.from(document.querySelectorAll<HTMLElement>("main h1")).find((h) => h.offsetParent !== null);
      if (!titulo) {
        if (++intentos < 120) marco = requestAnimationFrame(enfocar);
        return;
      }
      if (!titulo.hasAttribute("tabindex")) titulo.tabIndex = -1;
      titulo.focus({ preventScroll: true });
    };
    marco = requestAnimationFrame(enfocar);
    return () => cancelAnimationFrame(marco);
  }, [ruta]);

  return null;
}
