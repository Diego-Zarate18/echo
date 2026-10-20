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
  descripcion: string;
  Icono: ComponentType<PropsIcono>;
  expresion: ExpresionMoris;
  mensajeMoris: string;
};

const elementos: readonly Elemento[] = [
  {
    titulo: "Lecciones breves",
    descripcion: "Temas cortos divididos en secciones. Avanzas, regresas y retomas donde te quedaste.",
    Icono: IconoLibro,
    expresion: "sorprendido",
    mensajeMoris: "¿Sabías que tu código también tiene derechos de autor?",
  },
  {
    titulo: "Actividades",
    descripcion:
      "Opción múltiple, verdadero o falso y relación de columnas sin arrastrar. Repítelas cuando quieras.",
    Icono: IconoLista,
    expresion: "feliz",
    mensajeMoris: "¡Bien pensado! Esa fue la mejor decisión.",
  },
  {
    titulo: "Casos prácticos",
    descripcion:
      "Dilemas reales: cada decisión es óptima, aceptable o riesgosa y muestra su consecuencia y su fundamento.",
    Icono: IconoDilema,
    expresion: "curioso",
    mensajeMoris: "¿Qué harías tú? No siempre hay una sola respuesta.",
  },
  {
    titulo: "Examen por curso",
    descripcion:
      "Sin cronómetro y con guardado automático. Apruebas con 70 %; si no, repasas y lo intentas de nuevo.",
    Icono: IconoBirrete,
    expresion: "triste",
    mensajeMoris: "Descansa un momento y repasa. En 20 minutos podrás intentarlo de nuevo.",
  },
  {
    titulo: "Progreso e insignias",
    descripcion: "Ves tu avance en porcentaje y obtienes una insignia al completar cada módulo.",
    Icono: IconoInsignia,
    expresion: "feliz",
    mensajeMoris: "¡Nueva insignia! Completaste el módulo.",
  },
];

/**
 * Sección «Qué encontrarás» (84:560): cinco filas con su globo de Moris.
 * En escritorio va compacta para que el título y las cinco filas quepan en la ventana al llegar desde el menú.
 */
export function QueEncontraras() {
  return (
    <section
      id="que-encontraras"
      aria-labelledby="titulo-que-encontraras"
      data-fondo="claro"
      className="bg-marca-crema px-5 py-20 text-marca-cafe md:px-10 md:py-28 lg:px-[72px] lg:pt-[130px] lg:pb-[140px] xl:pt-6 xl:pb-24"
    >
      <div className="mx-auto w-full max-w-[1296px]">
        <EncabezadoSeccion
          id="titulo-que-encontraras"
          titulo="Lo que encontrarás en Echo"
          entrada="Un mismo camino para todos: módulos que agrupan cursos, cursos que agrupan lecciones y, al final de cada curso, un examen. Moris, la semilla que guía Echo, te acompaña con mensajes breves."
          tono="claro"
          proporcion="titulo-amplio"
        />

        <ul className="mt-12 lg:mt-14 xl:mt-6">
          {elementos.map(({ titulo, descripcion, Icono, expresion, mensajeMoris }) => (
            <li
              key={titulo}
              className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-x-5 gap-y-3 border-t border-marca-cafe/14 py-[30px] xl:py-2 md:grid-cols-[4rem_minmax(0,1fr)] md:gap-x-10 xl:grid-cols-[4rem_300px_minmax(0,420px)_384px] xl:items-center xl:justify-between"
            >
              <span data-dibujar className="row-span-3 flex size-14 items-center justify-center rounded-full bg-marca-cafe text-marca-menta md:size-16 xl:row-span-1">
                <Icono className="size-6 md:size-7" />
              </span>
              <h3 className="self-center font-titulo text-elemento font-extrabold">{titulo}</h3>
              <p className="col-start-2 max-w-[60ch] text-cuerpo text-texto-secundario xl:col-start-auto">
                {descripcion}
              </p>
              <p className="revelar-globo col-start-2 flex max-w-[384px] items-center gap-3.5 rounded-globo bg-superficie-hundida py-3 pr-5 pl-3 text-menor leading-[1.45] font-semibold xl:col-start-auto">
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
