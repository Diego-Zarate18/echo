"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/componentes/marca/Logo";
import { Boton } from "@/componentes/ui/Boton";
import { seccionesInicio } from "@/areas/inicio/secciones";
import { MenuMovil } from "./MenuMovil";

/**
 * Observa el hero y las secciones:
 * - `flotante`: el hero ya salió de la ventana y el encabezado se queda fijo arriba;
 * - `actual`: la sección que cruza el centro de la ventana (resaltada en el menú, como en Figma 84:493).
 */
function useEstadoDelEncabezado() {
  const [flotante, setFlotante] = useState(false);
  const [actual, setActual] = useState<string | null>(null);

  useEffect(() => {
    const portada = document.getElementById("portada");
    if (!portada) return;
    const observadorPortada = new IntersectionObserver(
      ([entrada]) => setFlotante(!entrada.isIntersecting),
      { rootMargin: "-96px 0px 0px 0px" },
    );
    observadorPortada.observe(portada);

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

/**
 * Encabezado del inicio público (84:490 escritorio, 84:719 móvil).
 * Sobre el hero se dibuja dentro de la tarjeta; al salir del hero se queda fijo arriba como una
 * barra de vidrio café, para que las anclas y «Crear cuenta» sigan a la mano en toda la página.
 * En el DOM va antes de `<main>`.
 */
export function EncabezadoPublico() {
  const { flotante, actual } = useEstadoDelEncabezado();

  return (
    <header
      data-fondo="oscuro"
      data-flotante={flotante}
      className={[
        "group/encabezado inset-x-2 z-30 mx-auto",
        flotante
          ? "fixed top-2 max-w-[1180px] motion-safe:animate-bajar"
          : "absolute top-2 max-w-[1424px] px-5 pt-2 md:px-8 md:pt-5 xl:pt-7",
      ].join(" ")}
    >
      <div
        className={[
          "relative flex items-center justify-between gap-6",
          flotante
            ? "rounded-full border border-blanco/12 bg-marca-cafe py-1.5 pr-1.5 pl-5 shadow-vidrio"
            : "",
        ].join(" ")}
      >
        <Link href="/" aria-label="Echo, inicio" className="rounded-logo">
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
          <ul
            className={[
              "flex gap-0.5 rounded-full p-1.5",
              flotante ? "" : "border border-blanco/16 bg-marca-crema/8 backdrop-blur-vidrio",
            ].join(" ")}
          >
            {seccionesInicio.map((seccion) => {
              const esActual = actual === seccion.id;
              return (
                <li key={seccion.id}>
                  <a
                    href={`#${seccion.id}`}
                    aria-current={esActual ? "location" : undefined}
                    className="flex rounded-full px-[18px] py-2.5 font-titulo text-menor font-semibold whitespace-nowrap text-marca-crema transition-colors duration-200 hover:bg-marca-crema/10 aria-[current]:bg-marca-crema/14"
                  >
                    {seccion.texto}
                  </a>
                </li>
              );
            })}
          </ul>
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
