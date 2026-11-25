import Link from "next/link";
import { Suspense } from "react";
import { Pastilla } from "@/componentes/ui/Pastilla";
import { IconoCandado, IconoCheck, IconoChevronDerecha, IconoCirculoPunto, IconoDilema, IconoLista } from "@/componentes/ui/iconos/iconos";
import { formatearPorcentaje } from "@/lib/fechas";
import { cargarActividad, type ResumenEvaluable } from "../datos/modulos";

/** DEC-16: 1 = óptima, entre 0 y 1 = aceptable, 0 = riesgosa. En un caso, la calificación es el valor de su decisión. */
function etiquetaDeDecision(calificacion: number) {
  if (calificacion >= 100) return "óptima";
  return calificacion > 0 ? "aceptable" : "riesgosa";
}

const plural = (n: number) => (n === 1 ? "1 intento" : `${n} intentos`);

/** «Mejor resultado: 80 % · 2 intentos». Los intentos salen de la actividad; si no llegan, queda solo el resultado. */
async function ResultadoDeActividad({ id, mejor }: { id: number; mejor: number }) {
  const actividad = await cargarActividad(id);
  return (
    <>
      Mejor resultado: {formatearPorcentaje(mejor)}
      {actividad.ok ? ` · ${plural(actividad.datos.intentosEnviados)}` : ""}
    </>
  );
}

type PropsFilaEvaluable = {
  evaluable: ResumenEvaluable;
  /** Posición entre los casos de la lección (1, 2…); 0 si es la actividad. */
  numeroDeCaso: number;
  /** La lección tiene actividad: el primer caso se abre después de ella. */
  hayActividad: boolean;
  /** La lección ya se empezó a leer pero no se termina: lo bloqueado dice «Termina la lección». */
  leccionEnCurso: boolean;
};

function titulo({ evaluable, numeroDeCaso }: PropsFilaEvaluable) {
  if (evaluable.tipo === "actividad") return "Actividad de la lección";
  return `Caso práctico ${numeroDeCaso} · ${evaluable.titulo.replace(/^Caso:\s*/i, "")}`;
}

function Subtitulo(props: PropsFilaEvaluable) {
  const { evaluable, numeroDeCaso, hayActividad, leccionEnCurso } = props;
  const esActividad = evaluable.tipo === "actividad";
  if (evaluable.estado === "enviado") {
    if (evaluable.mejorCalificacion === null) return <>{esActividad ? "Actividad enviada" : "Caso enviado"}</>;
    if (!esActividad) return <>Primer intento: decisión {etiquetaDeDecision(evaluable.mejorCalificacion)}</>;
    return (
      <Suspense fallback={<>Mejor resultado: {formatearPorcentaje(evaluable.mejorCalificacion)}</>}>
        <ResultadoDeActividad id={evaluable.id} mejor={evaluable.mejorCalificacion} />
      </Suspense>
    );
  }
  if (evaluable.estado === "disponible") return <>{esActividad ? "Lista para responder" : "Listo para responder"}</>;
  // Bloqueado: qué hay que terminar antes.
  if (esActividad) return <>{leccionEnCurso ? "Termina la lección para abrirla" : "Disponible al terminar la lección"}</>;
  if (numeroDeCaso > 1) return <>Se abre después del caso {numeroDeCaso - 1}</>;
  return <>{hayActividad ? "Se abre después de la actividad" : "Se abre al terminar la lección"}</>;
}

function Estado({ estado }: { estado: ResumenEvaluable["estado"] }) {
  if (estado === "enviado") return <Pastilla tono="bosque" icono={<IconoCheck className="size-4" />}>Enviado</Pastilla>;
  if (estado === "disponible") return <Pastilla tono="bosque" icono={<IconoCirculoPunto className="size-4" />}>Disponible</Pastilla>;
  return <Pastilla tono="tenue" icono={<IconoCandado className="size-4" />}>Bloqueado</Pastilla>;
}

/**
 * Fila de la actividad o de un caso dentro de la tarjeta de una lección (SCR-08). Enviada o disponible, toda la fila es
 * un enlace a `/actividades/[id]`; bloqueada, es solo texto con lo que falta para abrirla.
 */
export function FilaEvaluable(props: PropsFilaEvaluable) {
  const { evaluable } = props;
  const bloqueado = evaluable.estado === "bloqueado";
  const Icono = evaluable.tipo === "actividad" ? IconoLista : IconoDilema;
  const contenido = (
    <>
      <Icono className="size-[22px] shrink-0 text-marca-bosque" />
      <span className="flex min-w-0 flex-1 flex-col max-sm:basis-[calc(100%-38px)]">
        <span className="font-titulo text-cuerpo font-bold text-marca-cafe">{titulo(props)}</span>
        <span className="text-detalle text-texto-secundario">
          <Subtitulo {...props} />
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-3 max-sm:ml-[38px]">
        <Estado estado={evaluable.estado} />
        {bloqueado ? null : <IconoChevronDerecha className="size-[22px] text-marca-cafe max-sm:hidden" />}
      </span>
    </>
  );
  const base = "flex items-center gap-4 rounded-fila px-5 py-3.5 max-sm:flex-wrap max-sm:gap-y-2.5";
  return bloqueado ? (
    <div className={`${base} bg-superficie-hundida`}>{contenido}</div>
  ) : (
    <Link
      href={`/actividades/${evaluable.id}`}
      className={`${base} bg-marca-crema transition-[background-color] duration-150 ease-(--ease-respuesta) hover:bg-superficie-hundida`}
    >
      {contenido}
    </Link>
  );
}
