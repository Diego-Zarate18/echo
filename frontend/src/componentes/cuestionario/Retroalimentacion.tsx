import Link from "next/link";
import type { components } from "@/lib/api/esquema";
import { Pastilla } from "@/componentes/ui/Pastilla";
import { IconoAlerta, IconoCirculoCheck, IconoCirculoPunto, IconoInfo, IconoLey, IconoLibro } from "@/componentes/ui/iconos/iconos";

export type PreguntaCalificada = components["schemas"]["PreguntaCalificada"];
export type PreguntaSinSolucion = components["schemas"]["PreguntaSinSolucion"];
type Fundamento = components["schemas"]["Fundamento"];

const TIPOS: Record<PreguntaCalificada["tipo"], string> = {
  opcionMultiple: "Opción múltiple",
  verdaderoFalso: "Verdadero o falso",
  relacion: "Relación de columnas",
  decision: "Caso práctico",
};

const ETIQUETAS = { optima: "Decisión óptima", aceptable: "Decisión aceptable", riesgosa: "Decisión riesgosa" } as const;

/** Correcta o incorrecta: siempre con ícono y texto (WCAG 1.4.1). */
function Veredicto({ correcta }: { correcta: boolean }) {
  return correcta ? (
    <span className="inline-flex items-center gap-1.5 text-detalle font-bold text-marca-bosque">
      <IconoCirculoCheck className="size-[18px]" />
      Correcta
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-detalle font-bold text-estado-riesgosa">
      <IconoAlerta className="size-[18px]" />
      Incorrecta
    </span>
  );
}

function FundamentoLegal({ fundamento }: { fundamento: Fundamento }) {
  return (
    <p className="flex items-start gap-2 text-detalle text-texto-secundario">
      <IconoLey className="mt-0.5 size-[18px] shrink-0 text-marca-bosque" />
      <span>
        <strong className="font-bold text-marca-cafe">
          {fundamento.nombre}
          {fundamento.articulo ? ` · ${fundamento.articulo}` : ""}:
        </strong>{" "}
        {fundamento.descripcion}
      </span>
    </p>
  );
}

function Nota({ texto, correcta }: { texto: string; correcta: boolean }) {
  return (
    <p
      className={`flex items-start gap-2.5 rounded-fila px-4 py-3 text-detalle text-marca-cafe ${correcta ? "bg-superficie-hundida" : "bg-[color-mix(in_srgb,var(--color-estado-riesgosa)_8%,var(--color-superficie-elevada))]"}`}
    >
      <IconoInfo className={`mt-0.5 size-[18px] shrink-0 ${correcta ? "text-marca-bosque" : "text-estado-riesgosa"}`} />
      {texto}
    </p>
  );
}

/**
 * Pregunta ya calificada con su solución (actividad, caso o examen aprobado; DEC-11): lo que eligió el alumno, la
 * respuesta correcta, la retroalimentación y el fundamento. En un caso, la decisión con su etiqueta y su consecuencia.
 */
/** «Puntaje: 1 de 1» del detalle de un intento (Figma 94:2704); cada pregunta vale 1 (los casos pueden dar 0.5). */
function Puntaje({ valor }: { valor: number }) {
  return <span className="text-detalle font-bold text-texto-secundario">Puntaje: {valor.toLocaleString("es-MX")} de 1</span>;
}

export function PreguntaConSolucion({
  pregunta,
  numero,
  total,
  conPuntaje = false,
}: {
  pregunta: PreguntaCalificada;
  numero: number;
  total: number;
  conPuntaje?: boolean;
}) {
  const id = `revision-${pregunta.id}`;
  return (
    <article aria-labelledby={id} className="flex flex-col gap-4 rounded-tarjeta bg-superficie-elevada p-6 shadow-relieve md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-detalle font-bold text-texto-secundario">
          Pregunta {numero} de {total} · {TIPOS[pregunta.tipo]}
        </p>
        <span className="flex flex-wrap items-center gap-3">
          {conPuntaje ? <Puntaje valor={pregunta.puntaje} /> : null}
          {pregunta.decision ? null : <Veredicto correcta={pregunta.correcta} />}
        </span>
      </div>
      <h3 id={id} className="font-titulo text-tarjeta font-extrabold text-marca-cafe">
        {pregunta.enunciado}
      </h3>

      {pregunta.opciones ? (
        <ul className="flex flex-col gap-2.5">
          {pregunta.opciones.map((opcion) => {
            const marca = opcion.correcta ? "correcta" : opcion.elegida ? "incorrecta" : null;
            return (
              <li
                key={opcion.id}
                className={[
                  "flex flex-wrap items-center gap-3 rounded-fila border-[1.5px] px-4 py-3 text-menor text-marca-cafe",
                  marca === "correcta" ? "border-marca-bosque" : marca === "incorrecta" ? "border-estado-riesgosa" : "border-marca-cafe/40",
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  className={`size-4 shrink-0 rounded-full border-2 ${opcion.elegida ? (opcion.correcta ? "border-marca-bosque bg-marca-bosque" : "border-estado-riesgosa bg-estado-riesgosa") : "border-marca-cafe/50"}`}
                />
                <span className="flex-1">
                  {opcion.texto}
                  {opcion.elegida ? <span className="font-bold"> · tu respuesta</span> : null}
                  {opcion.correcta && !opcion.elegida ? <span className="font-bold"> · respuesta correcta</span> : null}
                </span>
                {marca ? <Veredicto correcta={marca === "correcta"} /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {pregunta.uniones ? (
        <ul className="flex flex-col gap-3">
          {pregunta.uniones.map((union) => (
            <li key={union.izquierda} className="grid gap-2 md:grid-cols-2 md:gap-3">
              <span className="rounded-fila bg-superficie-hundida px-4 py-3 font-titulo text-menor font-bold text-marca-cafe">{union.izquierda}</span>
              <span className="flex flex-col gap-1">
                <span
                  className={`flex items-center justify-between gap-3 rounded-fila border-[1.5px] px-4 py-3 text-menor text-marca-cafe ${union.correcta ? "border-marca-bosque" : "border-estado-riesgosa"}`}
                >
                  {union.derechaElegida ?? "Sin respuesta"}
                  <Veredicto correcta={union.correcta} />
                </span>
                {union.correcta ? null : (
                  <span className="text-detalle font-bold text-estado-riesgosa">La respuesta es «{union.derechaCorrecta}»</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {pregunta.decision ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-titulo text-menor font-bold text-marca-cafe">Tu decisión fue</span>
            <Pastilla
              tono={pregunta.decision.etiqueta === "riesgosa" ? "terracota" : "bosque"}
              icono={pregunta.decision.etiqueta === "riesgosa" ? <IconoAlerta className="size-4" /> : <IconoCirculoCheck className="size-4" />}
            >
              {ETIQUETAS[pregunta.decision.etiqueta]}
            </Pastilla>
          </div>
          <p className="flex items-start gap-3 rounded-fila border-[1.5px] border-marca-bosque px-4 py-3 text-menor font-semibold text-marca-cafe">
            <IconoCirculoPunto className="mt-0.5 size-[18px] shrink-0 text-marca-bosque" />
            {pregunta.decision.opcionElegida}
          </p>
          {pregunta.decision.consecuencia ? (
            <div className="flex flex-col gap-1.5">
              <h4 className="font-titulo text-cuerpo font-extrabold text-marca-cafe">Lo que pasa después</h4>
              <p className="text-cuerpo text-marca-cafe">{pregunta.decision.consecuencia}</p>
            </div>
          ) : null}
          {pregunta.decision.retroalimentacion ? (
            <div className="flex flex-col gap-1.5">
              <h4 className="font-titulo text-cuerpo font-extrabold text-marca-cafe">Por qué</h4>
              <p className="text-cuerpo text-marca-cafe">{pregunta.decision.retroalimentacion}</p>
            </div>
          ) : null}
          {pregunta.decision.fundamento ? <FundamentoLegal fundamento={pregunta.decision.fundamento} /> : null}
        </div>
      ) : null}

      {!pregunta.decision && pregunta.retroalimentacion ? <Nota texto={pregunta.retroalimentacion} correcta={pregunta.correcta} /> : null}
      {!pregunta.decision && pregunta.fundamento ? <FundamentoLegal fundamento={pregunta.fundamento} /> : null}
    </article>
  );
}

/**
 * Pregunta de un examen no aprobado (DEC-11, INV-04): solo lo que respondió el alumno, si fue correcta y qué lección
 * repasar. Nunca la respuesta correcta.
 */
export function PreguntaSinRespuestaCorrecta({
  pregunta,
  numero,
  total,
  hrefLeccion,
  conPuntaje = false,
}: {
  pregunta: PreguntaSinSolucion;
  numero: number;
  total: number;
  /** Ruta a la lección de repaso; el contrato solo trae su slug y título. */
  hrefLeccion: string | null;
  conPuntaje?: boolean;
}) {
  const id = `revision-${pregunta.id}`;
  return (
    <article aria-labelledby={id} className="flex flex-col gap-3.5 rounded-tarjeta bg-superficie-elevada p-6 shadow-relieve md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-detalle font-bold text-texto-secundario">
          Pregunta {numero} de {total} · {TIPOS[pregunta.tipo]}
        </p>
        <span className="flex flex-wrap items-center gap-3">
          {conPuntaje ? <Puntaje valor={pregunta.puntaje} /> : null}
          <Veredicto correcta={pregunta.correcta} />
        </span>
      </div>
      <h3 id={id} className="font-titulo text-tarjeta font-extrabold text-marca-cafe">
        {pregunta.enunciado}
      </h3>
      <div
        className={`flex flex-col gap-1 rounded-fila border-[1.5px] px-4 py-3 text-menor text-marca-cafe ${pregunta.correcta ? "border-marca-bosque" : "border-estado-riesgosa"}`}
      >
        <span className="text-detalle text-texto-secundario">Tu respuesta:</span>
        {pregunta.respuestaElegida.length ? pregunta.respuestaElegida.map((texto) => <span key={texto}>{texto}</span>) : <span>Sin respuesta</span>}
      </div>
      {!pregunta.correcta && pregunta.leccionRepaso ? (
        <p className="flex items-center gap-2 text-detalle text-marca-cafe">
          <IconoLibro className="size-[18px] shrink-0 text-marca-bosque" />
          Repasa:{" "}
          {hrefLeccion ? (
            <Link href={hrefLeccion} className="font-bold underline underline-offset-4 hover:decoration-2">
              {pregunta.leccionRepaso.titulo}
            </Link>
          ) : (
            <span className="font-bold">{pregunta.leccionRepaso.titulo}</span>
          )}
        </p>
      ) : null}
    </article>
  );
}
