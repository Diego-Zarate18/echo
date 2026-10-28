"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Logo } from "@/componentes/marca/Logo";
import { Boton } from "@/componentes/ui/Boton";
import { seccionesInicio } from "@/areas/inicio/secciones";
import { MenuMovil } from "@/componentes/estructura/MenuMovil";

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

    // El ancla está en el bloque del título; la sección actual se mide con la sección completa.
    const secciones = seccionesInicio
      .map((seccion) => document.getElementById(seccion.id)?.closest("section"))
      .filter((elemento): elemento is HTMLElement => elemento != null);
    const observadorSecciones = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          const id = entrada.target.querySelector(".ancla-seccion")!.id;
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

/** Duración de la materialización de la barra, igual a `duration-220` de su transición. */
const DURACION_MATERIALIZAR_MS = 220;

type Fase = "hero" | "entrando" | "fija" | "saliendo";

/**
 * Fases de la barra fija. Siempre está a la vista después del hero; solo cambia al cruzar su borde:
 * - `entrando`: se monta como píldora todavía invisible y al siguiente cuadro pasa a `fija`, así la
 *   transición la materializa (opacidad, escala 0.98 y desenfoque);
 * - `saliendo`: al volver al hero hace la inversa y, al terminar, regresa a su lugar dentro del hero.
 * Si se cambia de dirección a medio camino, la transición se invierte desde donde va.
 */
function useFaseDeLaBarra(flotante: boolean) {
  const [fase, setFase] = useState<Fase>("hero");
  // Estado derivado durante el render, como recomienda React.
  if (flotante && fase === "hero") setFase("entrando");
  if (flotante && fase === "saliendo") setFase("fija");
  if (!flotante && (fase === "entrando" || fase === "fija")) setFase("saliendo");

  useEffect(() => {
    if (fase === "entrando") {
      let segundo = 0;
      const primero = requestAnimationFrame(() => {
        segundo = requestAnimationFrame(() => setFase("fija"));
      });
      return () => {
        cancelAnimationFrame(primero);
        cancelAnimationFrame(segundo);
      };
    }
    if (fase === "saliendo") {
      const espera = setTimeout(() => setFase("hero"), DURACION_MATERIALIZAR_MS);
      return () => clearTimeout(espera);
    }
  }, [fase]);

  return { fija: fase !== "hero", visible: fase === "fija" };
}

/** Aire mínimo entre la barra fija y el control que recibe el foco. */
const AIRE_FOCO = 16;

/** Tiempo después del foco en que se vigila que el control no quede bajo la barra. */
const VENTANA_REVISION_MS = 1000;

/**
 * El control con foco nunca queda debajo de la barra fija (WCAG 2.4.11). El navegador solo desplaza la
 * página si el control está fuera de la ventana; si está a la vista pero debajo de la barra, no lo mueve.
 * Aquí se desplaza al instante lo justo para dejarlo `AIRE_FOCO` px por debajo de ella.
 */
function useFocoSinTapar() {
  const encabezado = useRef<HTMLElement>(null);

  useEffect(() => {
    let espera = 0;
    let alTerminar: (() => void) | null = null;

    function corregir(objetivo: HTMLElement) {
      const elemento = encabezado.current;
      // Se mira en cada revisión: al enfocar algo lejano desde el hero, la barra aparece en el camino.
      if (!elemento || elemento.dataset.flotante !== "true" || document.activeElement !== objetivo) return;
      const barra = elemento.querySelector(":scope > div")?.getBoundingClientRect();
      if (!barra) return;
      const caja = objetivo.getBoundingClientRect();
      const tope = barra.bottom + AIRE_FOCO;
      if (caja.top < tope && caja.bottom > 0) {
        window.scrollBy({ top: caja.top - tope, behavior: "instant" });
      }
    }

    function dejarDeEsperar() {
      window.clearTimeout(espera);
      if (alTerminar) window.removeEventListener("scrollend", alTerminar);
      alTerminar = null;
    }

    function alEnfocar(evento: FocusEvent) {
      const objetivo = evento.target as HTMLElement | null;
      if (!objetivo || encabezado.current?.contains(objetivo)) return;
      corregir(objetivo);
      // El navegador puede seguir llevando el control a la vista con desplazamiento suave y dejarlo de
      // nuevo bajo la barra. Durante el segundo siguiente se revisa al terminar cada desplazamiento
      // (incluido el propio, que no debe consumir la revisión) y una última vez al final.
      dejarDeEsperar();
      const revisar = () => corregir(objetivo);
      alTerminar = revisar;
      window.addEventListener("scrollend", revisar);
      espera = window.setTimeout(() => {
        dejarDeEsperar();
        corregir(objetivo);
      }, VENTANA_REVISION_MS);
    }

    document.addEventListener("focusin", alEnfocar);
    return () => {
      dejarDeEsperar();
      document.removeEventListener("focusin", alEnfocar);
    };
  }, []);

  return encabezado;
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
 * se vuelve una píldora café sólida que se queda siempre a la vista: en móvil flota a 8 px del borde (respeta
 * el marco) y en escritorio sus bordes coinciden con los del contenido de las secciones (1296 px y el mismo
 * relleno de 72 px). Se materializa una vez al aparecer y hace la inversa al volver al hero (opacidad, escala 0.98 y
 * desenfoque, transición interrumpible de 220 ms). Con movimiento reducido solo hay un fundido. En el DOM va antes de `<main>`.
 */
export function EncabezadoPublico() {
  const { flotante, actual } = useEstadoDelEncabezado();
  const { lista, recorte, deslizar } = useIndicador(actual);
  const { fija, visible } = useFaseDeLaBarra(flotante);
  const encabezado = useFocoSinTapar();

  const estiloIndicador: CSSProperties = {
    clipPath: recorte ? `inset(0 ${recorte.derecha}px 0 ${recorte.izquierda}px round 999px)` : undefined,
    opacity: actual && recorte ? 1 : 0,
  };

  return (
    <header
      ref={encabezado}
      data-fondo="oscuro"
      data-flotante={flotante}
      className={[
        "inset-x-2 top-2 z-30",
        fija
          ? "fixed transition-[scale,opacity,filter] duration-220 ease-(--ease-respuesta) lg:inset-x-0 lg:px-[72px]"
          : "absolute px-5 pt-2 md:px-8 md:pt-5 xl:pt-7",
        fija && !visible
          ? "pointer-events-none scale-[0.98] opacity-0 blur-[6px] motion-reduce:scale-100 motion-reduce:blur-none"
          : "",
      ].join(" ")}
    >
      <div
        className={[
          "relative flex items-center justify-between gap-6",
          fija
            ? "mx-auto max-w-[1296px] rounded-full border border-blanco/12 bg-marca-cafe py-1.5 pr-1.5 pl-5 shadow-vidrio"
            : "mx-auto max-w-[1360px]",
        ].join(" ")}
      >
        <Link href="/" aria-label="Echo, inicio" className="flex min-h-11 items-center rounded-logo">
          <Logo
            fondo="oscuro"
            preload
            className={fija ? "w-[96px]" : "w-[118px] xl:w-[152px]"}
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
              fija ? "" : "border border-blanco/16 bg-marca-crema/8 backdrop-blur-vidrio",
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
          <Boton variante="crema" tamano="mediano" href="/crear-cuenta">
            Crear cuenta
          </Boton>
        </div>

        <MenuMovil
          enlaces={seccionesInicio.map((seccion) => ({ href: `#${seccion.id}`, texto: seccion.texto }))}
          etiqueta="Secciones de la página"
          escritorioDesde="xl"
        />
      </div>
    </header>
  );
}
