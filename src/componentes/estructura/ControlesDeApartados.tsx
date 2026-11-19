"use client";

import { useEffect, useState } from "react";

type PropsControles = {
  /** Id del contenedor de los `<details>`. */
  idLista: string;
  total: number;
};

const apartadosDe = (idLista: string) =>
  [...(document.getElementById(idLista)?.querySelectorAll<HTMLDetailsElement>(":scope > details") ?? [])];

/** Abre el apartado que contiene el ancla (y los que lo envuelvan) y lo lleva a la vista. */
function abrirAncla(hash: string) {
  const id = decodeURIComponent(hash.replace(/^#/, ""));
  if (!id) return;
  const destino = document.getElementById(id);
  if (!destino) return;
  for (let apartado = destino.closest("details"); apartado; apartado = apartado.parentElement?.closest("details") ?? null) {
    apartado.open = true;
  }
  // Después de abrir, para que el navegador mida con el contenido ya visible.
  requestAnimationFrame(() => destino.scrollIntoView({ block: "start" }));
}

/**
 * Controles de los apartados desplegables de un documento legal (DEC-98): «El documento completo · N apartados» y el
 * botón «Abrir todos» / «Cerrar todos». Además, como los apartados empiezan cerrados:
 * - un enlace con `#ancla` (al cargar o al cambiar el `hash`) abre su apartado y lo lleva a la vista, también si el
 *   ancla es de un `###` dentro de él;
 * - al imprimir se abren todos (`beforeprint`) y al terminar vuelven como estaban.
 * Los `<details>` son HTML del servidor: el texto completo está en la página aunque estén cerrados, y la búsqueda del
 * navegador (Ctrl+F) los abre sola.
 */
export function ControlesDeApartados({ idLista, total }: PropsControles) {
  const [todosAbiertos, setTodosAbiertos] = useState(false);

  useEffect(() => {
    const lista = document.getElementById(idLista);
    if (!lista) return;
    // El botón sigue al estado real: también cambia si la persona abre o cierra los apartados uno por uno.
    const alCambiar = () => setTodosAbiertos(apartadosDe(idLista).every((apartado) => apartado.open));
    lista.addEventListener("toggle", alCambiar, true);

    const alCambiarAncla = () => abrirAncla(window.location.hash);
    alCambiarAncla();
    window.addEventListener("hashchange", alCambiarAncla);

    let antesDeImprimir: boolean[] = [];
    const alImprimir = () => {
      const apartados = apartadosDe(idLista);
      antesDeImprimir = apartados.map((apartado) => apartado.open);
      for (const apartado of apartados) apartado.open = true;
    };
    const despuesDeImprimir = () => {
      apartadosDe(idLista).forEach((apartado, i) => {
        apartado.open = antesDeImprimir[i] ?? apartado.open;
      });
    };
    window.addEventListener("beforeprint", alImprimir);
    window.addEventListener("afterprint", despuesDeImprimir);

    return () => {
      lista.removeEventListener("toggle", alCambiar, true);
      window.removeEventListener("hashchange", alCambiarAncla);
      window.removeEventListener("beforeprint", alImprimir);
      window.removeEventListener("afterprint", despuesDeImprimir);
    };
  }, [idLista]);

  function alternar() {
    const abrir = !todosAbiertos;
    for (const apartado of apartadosDe(idLista)) apartado.open = abrir;
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="font-titulo text-base leading-[1.4] font-bold md:text-[18px]">
        <span className="max-md:hidden">El documento completo · </span>
        {total} apartados
      </p>
      <button
        type="button"
        onClick={alternar}
        aria-controls={idLista}
        aria-expanded={todosAbiertos}
        className="inline-flex min-h-11 shrink-0 items-center rounded-full border-[1.5px] border-marca-cafe px-[18px] font-titulo text-menor leading-[1.4] font-bold transition-[background-color,scale] duration-150 ease-(--ease-respuesta) hover:bg-superficie-hundida motion-safe:active:scale-[0.97]"
      >
        {todosAbiertos ? "Cerrar todos" : "Abrir todos"}
      </button>
    </div>
  );
}
