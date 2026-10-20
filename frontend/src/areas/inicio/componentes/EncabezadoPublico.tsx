"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Logo } from "@/componentes/marca/Logo";
import { Boton } from "@/componentes/ui/Boton";
import { seccionesInicio } from "@/areas/inicio/secciones";
import { MenuMovil } from "./MenuMovil";

/**
 * Observa el hero y las secciones:
 * - `flotante`: el borde de arriba del hero ya salió de la ventana (`#centinela-encabezado`).
 *   Se mide ese borde y no el hero completo: la barra fija aparece en cuanto el encabezado del hero empieza
 *   a irse, y al subir solo se quita cuando ese encabezado vuelve a verse completo;
 * - `actual`: la sección que cruza el centro de la ventana (resaltada en el menú, como en Figma 84:493).
 */
function useEstadoDelEncabezado() {
  const [flotante, setFlotante] = useState(false);
  const [actual, setActual] = useState<string | null>(null);

  useEffect(() => {
    const centinela = document.getElementById("centinela-encabezado");
    if (!centinela) return;
    const observadorPortada = new IntersectionObserver(([entrada]) => setFlotante(!entrada.isIntersecting));
    observadorPortada.observe(centinela);

    const secciones = seccionesInicio
      .map((seccion) => document.getElementById(seccion.id))
      .filter((elemento): elemento is HTMLElement => elemento !== null);
    const observadorSecciones = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          const id = entrada.target.id;
          // Al salir de la franja se limpia, para no dejar marcada una sección que ya pasó
          // (por ejemplo, «Quiénes somos» mientras se lee el cierre o el pie).
          setActual((anterior) => (entrada.isIntersecting ? id : anterior === id ? null : anterior));
        }
      },
      // Una franja delgada en el centro de la ventana: la sección que la cruza es la actual.
      { rootMargin: "-45% 0px -54% 0px" },
    );
    secciones.forEach((seccion) => observadorSecciones.observe(seccion));

    return () => {
      observadorPortada.disconnect();
      observadorSecciones.disconnect();
    };
  }, []);

  // Sobre el hero no hay sección actual.
  return { flotante, actual: flotante ? actual : null };
}

type Recorte = { izquierda: number; derecha: number };

/**
 * Indicador de la sección actual: una sola píldora que se desliza entre las anclas
 * (receta «tab indicator» de `animate`: se recorta con `clip-path` en vez de mover el ancho).
 * Al aparecer después de no haber sección actual no se desliza desde la última posición: solo se funde.
 */
function useIndicador(actual: string | null) {
  const lista = useRef<HTMLDivElement>(null);
  const [recorte, setRecorte] = useState<Recorte | null>(null);
  const [deslizar, setDeslizar] = useState(false);
  const anterior = useRef<string | null>(null);

  useLayoutEffect(() => {
    const ul = lista.current;
    function medir() {
      const enlace = actual && ul?.querySelector<HTMLElement>(`a[href="#${actual}"]`);
      if (!ul || !enlace) return;
      setRecorte({
        izquierda: enlace.offsetLeft,
        derecha: ul.clientWidth - enlace.offsetLeft - enlace.offsetWidth,
      });
    }
    setDeslizar(anterior.current !== null && actual !== null);
    anterior.current = actual;
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [actual]);

  return { lista, recorte, deslizar };
}

/**
 * Encabezado del inicio público (84:490 escritorio, 84:719 móvil).
 * Sobre el hero se dibuja dentro de la tarjeta, alineado a la retícula de 1424 px. Al salir del hero
 * se materializa fijo arriba como una barra de vidrio café (sólida con transparencia reducida), para que
 * las anclas y «Crear cuenta» sigan a la mano en toda la página. En el DOM va antes de `<main>`.
 */
export function EncabezadoPublico() {
  const { flotante, actual } = useEstadoDelEncabezado();
  const { lista, recorte, deslizar } = useIndicador(actual);

  const estiloIndicador: CSSProperties = {
    clipPath: recorte ? `inset(0 ${recorte.derecha}px 0 ${recorte.izquierda}px round 999px)` : undefined,
    opacity: actual && recorte ? 1 : 0,
  };

  return (
    <header
      data-fondo="oscuro"
      data-flotante={flotante}
      className={[
        "inset-x-2 top-2 z-30",
        flotante
          ? "fixed mx-auto max-w-[1180px] animate-materializar"
          : "absolute px-5 pt-2 md:px-8 md:pt-5 xl:pt-7",
      ].join(" ")}
    >
      <div
        className={[
          "relative flex items-center justify-between gap-6",
          flotante
            ? "rounded-full border border-blanco/12 bg-marca-cafe/85 py-1.5 pr-1.5 pl-5 shadow-vidrio backdrop-blur-vidrio backdrop-saturate-150 transparencia-reducida:bg-marca-cafe transparencia-reducida:backdrop-blur-none"
            : "mx-auto max-w-[1360px]",
        ].join(" ")}
      >
        <Link href="/" aria-label="Echo, inicio" className="flex min-h-11 items-center rounded-logo">
          <Logo
            fondo="oscuro"
            preload
            className={flotante ? "w-[96px]" : "w-[118px] xl:w-[152px]"}
          />
        </Link>

        <nav
          aria-label="Secciones de la página"
          className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 xl:block"
        >
          <div
            ref={lista}
            className={[
              "relative isolate rounded-full",
              flotante ? "" : "border border-blanco/16 bg-marca-crema/8 backdrop-blur-vidrio",
            ].join(" ")}
          >
            <span
              aria-hidden="true"
              data-indicador
              style={estiloIndicador}
              className={[
                "pointer-events-none absolute inset-0 -z-10 rounded-full bg-marca-crema/14 motion-reduce:transition-none",
                deslizar
                  ? "transition-[clip-path,opacity] duration-250 ease-(--ease-desplazar)"
                  : "transition-opacity duration-200 ease-(--ease-respuesta)",
              ].join(" ")}
            />
            <ul className="flex gap-0.5 p-1.5">
              {seccionesInicio.map((seccion) => (
                <li key={seccion.id}>
                  <a
                    href={`#${seccion.id}`}
                    aria-current={actual === seccion.id ? "location" : undefined}
                    className="flex rounded-full px-[18px] py-2.5 font-titulo text-menor font-semibold whitespace-nowrap text-marca-crema transition-colors duration-200 hover:bg-marca-crema/10"
                  >
                    {seccion.texto}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="hidden items-center gap-6 xl:flex">
          <Link
            href="/iniciar-sesion"
            className="inline-flex min-h-12 items-center rounded-full px-1 font-titulo text-menor font-bold text-marca-crema underline-offset-4 hover:underline"
          >
            Iniciar sesión
          </Link>
          <Boton variante="crema" tamano="mediano" href="/registro">
            Crear cuenta
          </Boton>
        </div>

        <MenuMovil secciones={seccionesInicio} />
      </div>
    </header>
  );
}
