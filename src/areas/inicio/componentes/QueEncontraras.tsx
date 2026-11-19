import { Moris, type ExpresionMoris } from "@/componentes/marca/Moris";
import {
  IconoBirrete,
  IconoDilema,
  IconoInsignia,
  IconoLibro,
  IconoLista,
} from "@/componentes/ui/iconos/iconos";
import type { PropsIcono } from "@/componentes/ui/iconos/Icono";
import type { ComponentType } from "react";
import { EncabezadoSeccion } from "./EncabezadoSeccion";

type Elemento = {
  titulo: string;
  Icono: ComponentType<PropsIcono>;
  expresion: ExpresionMoris;
  mensajeMoris: string;
};

const elementos: readonly Elemento[] = [
  {
    titulo: "Lecciones breves",
    Icono: IconoLibro,
    expresion: "sorprendido",
    mensajeMoris: "¿Sabías que tu código también tiene derechos de autor?",
  },
  {
    titulo: "Actividades",
    Icono: IconoLista,
    expresion: "feliz",
    mensajeMoris: "¡Bien pensado! Esa fue la mejor decisión.",
  },
  {
    titulo: "Casos prácticos",
    Icono: IconoDilema,
    expresion: "curioso",
    mensajeMoris: "¿Qué harías tú? No siempre hay una sola respuesta.",
  },
  {
    titulo: "Examen por curso",
    Icono: IconoBirrete,
    expresion: "triste",
    mensajeMoris: "Descansa un momento y repasa. En 20 minutos podrás intentarlo de nuevo.",
  },
  {
    titulo: "Progreso e insignias",
    Icono: IconoInsignia,
    expresion: "feliz",
    mensajeMoris: "¡Nueva insignia! Completaste el módulo.",
  },
];

/**
 * Sección «Qué encontrarás» (84:560 escritorio, 150:5259 móvil): cinco filas con el ícono, el nombre y el globo de
 * Moris (SCR-18, grafo 1.6.2: sin la columna de descripción). En escritorio el nombre ocupa el espacio libre y el globo
 * queda a la derecha; en móvil, el ícono de 48 px y el nombre van en una fila y el globo debajo.
 * Tiene el mismo aire arriba y abajo que las demás secciones y las filas el ritmo de Figma (30 px arriba y abajo).
 * En ventanas de escritorio bajas (`ventana-baja`) las filas y el globo se compactan para que, al llegar desde el
 * menú, se vea la sección completa: del título a la última fila.
 */
export function QueEncontraras() {
  return (
    <section
      aria-labelledby="titulo-que-encontraras"
      data-fondo="claro"
      className="bg-marca-crema px-5 py-20 text-marca-cafe md:px-10 md:py-28 lg:px-[72px] lg:pt-[130px] lg:pb-[140px]"
    >
      <div id="que-encontraras" className="ancla-seccion mx-auto w-full max-w-[1296px]">
        <EncabezadoSeccion
          id="titulo-que-encontraras"
          titulo="Lo que encontrarás en Echo"
          entrada="Un mismo camino para todos: módulos que agrupan cursos, cursos que agrupan lecciones y, al final de cada curso, un examen. Moris, la semilla que guía Echo, te acompaña con mensajes breves."
          tono="claro"
          proporcion="apilada"
        />

        <ul className="mt-12 lg:mt-14 ventana-baja:mt-6">
          {elementos.map(({ titulo, Icono, expresion, mensajeMoris }) => (
            <li
              key={titulo}
              className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-x-4 gap-y-4 border-t border-marca-cafe/14 py-[30px] ventana-baja:py-3 md:grid-cols-[4rem_minmax(0,1fr)] md:gap-x-10 xl:grid-cols-[4rem_minmax(0,1fr)_384px]"
            >
              <span data-dibujar className="flex size-12 items-center justify-center rounded-full bg-marca-cafe text-marca-menta md:size-16">
                <Icono className="size-5 md:size-7" />
              </span>
              <h3 className="font-titulo text-elemento font-extrabold">{titulo}</h3>
              <p className="revelar-globo col-span-2 flex items-center gap-3.5 rounded-globo bg-superficie-hundida py-3 pr-5 ventana-baja:py-2 pl-3 text-menor leading-[1.45] font-semibold md:col-span-1 md:col-start-2 md:max-w-[384px] xl:col-start-auto">
                <Moris expresion={expresion} alt="" sizes="42px" className="w-[42px] shrink-0" />
                <span>
                  <span className="sr-only">Moris dice: </span>
                  {mensajeMoris}
                </span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
