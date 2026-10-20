import type { ComponentType } from "react";
import type { PropsIcono } from "@/componentes/ui/iconos/Icono";
import {
  IconoAccesibilidad,
  IconoBalanza,
  IconoEscudo,
  IconoInsignia,
  IconoRuta,
  IconoSinReloj,
} from "@/componentes/ui/iconos/iconos";
import { EncabezadoSeccion } from "./EncabezadoSeccion";

const diferencias: readonly { titulo: string; texto: string; Icono: ComponentType<PropsIcono> }[] = [
  {
    titulo: "Una ruta, no un catálogo.",
    texto:
      "Cada paso desbloquea el siguiente, como en los cursos de certificación. Siempre sabes qué sigue.",
    Icono: IconoRuta,
  },
  {
    titulo: "Sin rachas, puntos ni vidas.",
    texto: "Nada de mecánicas que presionan para volver. Solo tu avance y una insignia por módulo.",
    Icono: IconoInsignia,
  },
  {
    titulo: "Dilemas con fundamento.",
    texto:
      "Cada decisión se califica como óptima, aceptable o riesgosa y cita la ley o el principio que la respalda.",
    Icono: IconoBalanza,
  },
  {
    titulo: "Exámenes sin cronómetro.",
    texto: "Tus respuestas se guardan al elegirlas. Si pierdes la conexión, retomas donde te quedaste.",
    Icono: IconoSinReloj,
  },
  {
    titulo: "Accesible desde el diseño.",
    texto:
      "WCAG 2.2 nivel AA: navegación con teclado, lector de pantalla y relación de columnas sin arrastrar.",
    Icono: IconoAccesibilidad,
  },
  {
    titulo: "Solo los datos necesarios.",
    texto:
      "Te pedimos nombre y correo. Tu historial es solo tuyo y puedes eliminar tu cuenta cuando quieras.",
    Icono: IconoEscudo,
  },
];

/** Sección «Por qué Echo» (84:610): seis diferencias. */
export function PorQueEcho() {
  return (
    <section
      id="por-que-echo"
      aria-labelledby="titulo-por-que-echo"
      data-fondo="oscuro"
      className="border-t border-marca-menta/16 bg-marca-cafe px-5 py-20 text-marca-crema md:px-10 md:py-28 lg:px-[72px] lg:py-[140px]"
    >
      <div className="mx-auto w-full max-w-[1296px]">
        <EncabezadoSeccion
          id="titulo-por-que-echo"
          titulo="Lo que hace distinta a Echo"
          entrada="Echo se diseñó para aprender con calma y con fundamentos, no para competir ni acumular puntos."
          tono="oscuro"
          proporcion="titulo-amplio"
        />

        <ul className="mt-12 grid gap-x-16 md:grid-cols-2 lg:mt-14">
          {diferencias.map(({ titulo, texto, Icono }) => (
            <li key={titulo} className="flex items-start gap-5 border-t border-marca-menta/22 py-8">
              <Icono className="size-[30px] text-marca-menta" />
              <div className="flex flex-col gap-2.5">
                <h3 className="font-titulo text-elemento font-extrabold">{titulo}</h3>
                <p className="max-w-[540px] text-cuerpo">{texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
