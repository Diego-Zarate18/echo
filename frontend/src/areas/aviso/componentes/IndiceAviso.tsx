"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { ApartadoAviso } from "@/areas/aviso/contenido";

type Recorte = { arriba: number; abajo: number };

/** Tiempo en que se respeta el apartado elegido en el índice mientras la página se desplaza hacia él. */
const RESPETAR_ELECCION_MS = 1500;

/** Altura de la ventana (desde arriba) que marca el apartado actual: el último cuyo borde ya la pasó. */
const LINEA_DE_LECTURA = 0.2;

/**
 * Apartado que se está leyendo: el último cuyo borde de arriba ya pasó la línea de lectura. Al principio
 * se marca el primero, como en Figma (84:791); al llegar al final, el último, porque los últimos
 * apartados no alcanzan a subir hasta la línea. Al usar el índice se respeta el elegido mientras la
 * página se desplaza hacia él. La posición se lee una vez por cuadro.
 */
function useApartadoActual(apartados: readonly ApartadoAviso[]) {
  const [actual, setActual] = useState<string>(apartados[0].id);
  // Hasta cuándo manda la elección hecha en el índice sobre lo que se ve al desplazarse.
  const eleccionHasta = useRef(0);

  useEffect(() => {
    const secciones = apartados
      .map((apartado) => document.getElementById(apartado.id))
      .filter((seccion): seccion is HTMLElement => seccion !== null);
    let cuadro = 0;

    function calcular() {
      if (performance.now() < eleccionHasta.current) return;
      const alFinal = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (alFinal) {
        setActual(apartados[apartados.length - 1].id);
        return;
      }
      const linea = window.innerHeight * LINEA_DE_LECTURA;
      let encontrado: string = apartados[0].id;
      for (const seccion of secciones) {
        if (seccion.getBoundingClientRect().top <= linea) encontrado = seccion.id;
      }
      setActual(encontrado);
    }

    function alDesplazar() {
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(calcular);
    }

    // Al terminar el desplazamiento hacia un apartado elegido se vuelve a calcular.
    window.addEventListener("scroll", alDesplazar, { passive: true });
    window.addEventListener("scrollend", alDesplazar);
    return () => {
      cancelAnimationFrame(cuadro);
      window.removeEventListener("scroll", alDesplazar);
      window.removeEventListener("scrollend", alDesplazar);
    };
  }, [apartados]);

  function elegir(id: string) {
    eleccionHasta.current = performance.now() + RESPETAR_ELECCION_MS;
    setActual(id);
  }

  return { actual, elegir };
}

/**
 * Índice «En esta página» del Aviso de privacidad (84:789).
 * En escritorio queda fijo al bajar; en móvil es una lista compacta al inicio. Marca el apartado actual
 * con `aria-current="location"` y un solo indicador que se desliza entre enlaces (recortado con
 * `clip-path`, como el del encabezado del inicio). Con movimiento reducido cambia sin deslizarse.
 */
export function IndiceAviso({ apartados }: { apartados: readonly ApartadoAviso[] }) {
  const { actual, elegir } = useApartadoActual(apartados);
  const lista = useRef<HTMLDivElement>(null);
  const [recorte, setRecorte] = useState<Recorte | null>(null);

  useLayoutEffect(() => {
    const contenedor = lista.current;
    function medir() {
      const enlace = contenedor?.querySelector<HTMLElement>(`a[href="#${actual}"]`);
      if (!contenedor || !enlace) return;
      setRecorte({
        arriba: enlace.offsetTop,
        abajo: contenedor.clientHeight - enlace.offsetTop - enlace.offsetHeight,
      });
    }
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [actual]);

  const estiloIndicador: CSSProperties = {
    clipPath: recorte ? `inset(${recorte.arriba}px 0 ${recorte.abajo}px 0 round 10px)` : undefined,
    opacity: recorte ? 1 : 0,
  };

  return (
    <nav
      aria-labelledby="titulo-indice"
      className="rounded-globo bg-superficie-elevada p-4 shadow-relieve lg:sticky lg:top-6 lg:self-start lg:p-5"
    >
      <p id="titulo-indice" className="font-titulo text-detalle font-bold text-texto-secundario">
        En esta página
      </p>
      <div ref={lista} className="relative isolate mt-1">
        <span
          aria-hidden="true"
          style={estiloIndicador}
          className="pointer-events-none absolute inset-0 -z-10 rounded-[10px] bg-superficie-hundida transition-[clip-path] duration-250 ease-(--ease-desplazar) motion-reduce:transition-none"
        />
        <ul className="flex flex-col gap-0.5 lg:gap-1">
          {apartados.map((apartado) => (
            <li key={apartado.id}>
              <a
                href={`#${apartado.id}`}
                onClick={() => elegir(apartado.id)}
                aria-current={actual === apartado.id ? "location" : undefined}
                className="flex min-h-11 items-center rounded-[10px] px-3 py-1.5 font-titulo text-menor font-semibold text-marca-cafe transition-colors duration-150 hover:bg-superficie-hundida/60 aria-[current=location]:font-bold lg:min-h-0 lg:py-2"
              >
                {apartado.titulo}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
