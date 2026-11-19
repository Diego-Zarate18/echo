"use client";

import { useEffect } from "react";

/** Bloques del inicio que declaran su fondo: el hero, las secciones de `main` y el pie. */
const BLOQUES = "#portada, main#contenido > section[data-fondo], body footer[data-fondo]";

/** Un color manda solo cuando cubre al menos este tanto de la zona medida. */
export const UMBRAL_CARRIL = 0.75;

type Fondo = "oscuro" | "claro";

/**
 * El carril de la barra de desplazamiento sigue el fondo de lo que se ve (ajuste 2): café sobre lo café, crema sobre lo
 * crema. La zona medida es la franja visible bajo la barra fija (o toda la ventana sobre el hero, donde no hay barra).
 *
 * Histéresis: el carril cambia solo cuando un color cubre al menos el 75 % de la zona; si ninguno llega (una frontera
 * entre secciones a la mitad), se queda como estaba. Así nunca cambia con una sección a medias ni parpadea al ir y
 * volver cerca del borde. Se suman las secciones del mismo color que se tocan (el llamado y el pie son café), y se cuenta
 * lo que una sección ocupa de la zona, no de sí misma: una sección más alta que la ventana cuenta 100 %.
 *
 * Saltos por ancla (el menú, «Ver cómo funciona» o un cambio de `#`): la persona eligió la sección, así que al terminar el
 * desplazamiento el carril toma su fondo aunque no llegue al 75 % (por ejemplo, «Qué es Echo» en 1440 × 900 llena el 71 %).
 * Mientras dura el salto no se mide, para no cambiar en el camino.
 *
 * Escribe `data-carril` en `<html>`; sin JavaScript, el CSS deja el carril café de siempre. El cambio es instantáneo
 * (no se anima), así que `prefers-reduced-motion` no aplica.
 */
export function CarrilSegunFondo() {
  useEffect(() => {
    const raiz = document.documentElement;
    let cuadro = 0;
    /** Bloque al que lleva un ancla, mientras dura el salto. */
    let destino: HTMLElement | null = null;
    let esperaDestino = 0;

    function medir() {
      const barra = document.querySelector<HTMLElement>('header[data-flotante="true"] > div');
      const arriba = barra ? Math.max(0, barra.getBoundingClientRect().bottom) : 0;
      const abajo = window.innerHeight;
      const alto = abajo - arriba;
      if (alto <= 0) return;
      const cubierto: Record<Fondo, number> = { oscuro: 0, claro: 0 };
      for (const bloque of document.querySelectorAll<HTMLElement>(BLOQUES)) {
        const fondo = bloque.dataset.fondo as Fondo | undefined;
        if (fondo !== "oscuro" && fondo !== "claro") continue;
        const caja = bloque.getBoundingClientRect();
        cubierto[fondo] += Math.max(0, Math.min(caja.bottom, abajo) - Math.max(caja.top, arriba));
      }
      if (cubierto.claro / alto >= UMBRAL_CARRIL) raiz.dataset.carril = "claro";
      else if (cubierto.oscuro / alto >= UMBRAL_CARRIL) raiz.dataset.carril = "oscuro";
    }

    function alMoverse() {
      if (destino) return;
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(medir);
    }

    function aplicarDestino() {
      window.clearTimeout(esperaDestino);
      const fondo = destino?.dataset.fondo;
      destino = null;
      if (fondo === "oscuro" || fondo === "claro") raiz.dataset.carril = fondo;
    }

    function alTerminar() {
      if (destino) aplicarDestino();
      else alMoverse();
    }

    function irHacia(id: string) {
      const bloque = id ? document.getElementById(decodeURIComponent(id))?.closest<HTMLElement>(BLOQUES) : null;
      if (!bloque) return;
      destino = bloque;
      // Si no hay desplazamiento (ya estaba ahí), no llega `scrollend`: se aplica igual.
      window.clearTimeout(esperaDestino);
      esperaDestino = window.setTimeout(aplicarDestino, 1500);
    }

    function alHacerClic(evento: MouseEvent) {
      const enlace = (evento.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (enlace) irHacia(enlace.getAttribute("href")!.slice(1));
    }

    function alCambiarAncla() {
      irHacia(window.location.hash.slice(1));
    }

    medir();
    window.addEventListener("scroll", alMoverse, { passive: true });
    window.addEventListener("resize", alMoverse);
    // La barra fija aparece al salir del hero y cambia la zona: se vuelve a medir al terminar cada desplazamiento.
    window.addEventListener("scrollend", alTerminar);
    document.addEventListener("click", alHacerClic);
    window.addEventListener("hashchange", alCambiarAncla);
    return () => {
      cancelAnimationFrame(cuadro);
      window.clearTimeout(esperaDestino);
      document.removeEventListener("click", alHacerClic);
      window.removeEventListener("hashchange", alCambiarAncla);
      window.removeEventListener("scroll", alMoverse);
      window.removeEventListener("resize", alMoverse);
      window.removeEventListener("scrollend", alTerminar);
      delete raiz.dataset.carril;
    };
  }, []);

  return null;
}
