"use client";

import type { components } from "@/lib/api/esquema";
import { IconoAlerta, IconoChevronAbajo } from "@/componentes/ui/iconos/iconos";

export type PreguntaParaResponder = components["schemas"]["PreguntaParaResponder"];
export type Union = components["schemas"]["Union"];
/** Lo que el alumno eligió en una pregunta: una opción o las parejas de la relación de columnas. */
export type Respuesta = { opcionId: number } | { uniones: Union[] };

const TIPOS: Record<PreguntaParaResponder["tipo"], string> = {
  opcionMultiple: "Opción múltiple",
  verdaderoFalso: "Verdadero o falso",
  relacion: "Relación de columnas",
  decision: "Caso práctico",
};

/** Una pregunta está completa con una opción elegida o, en la relación, con todas las filas unidas. */
export function estaRespondida(pregunta: PreguntaParaResponder, respuesta: Respuesta | undefined): boolean {
  if (!respuesta) return false;
  if (pregunta.tipo === "relacion") return "uniones" in respuesta && respuesta.uniones.length === pregunta.izquierda.length;
  return "opcionId" in respuesta;
}

type PropsPregunta = {
  pregunta: PreguntaParaResponder;
  numero: number;
  total: number;
  respuesta: Respuesta | undefined;
  alCambiar: (respuesta: Respuesta) => void;
  /** Se intentó enviar sin responderla. */
  pendiente?: boolean;
  deshabilitada?: boolean;
};

/**
 * Pregunta para responder (SCR-10 y SCR-12). Opciones con radios nativos dentro de un `fieldset`; la relación de
 * columnas con una lista desplegable por fila, sin arrastrar nada (INV-13). Nunca recibe la respuesta correcta (INV-04).
 */
export function Pregunta({ pregunta, numero, total, respuesta, alCambiar, pendiente = false, deshabilitada = false }: PropsPregunta) {
  const id = `pregunta-${pregunta.id}`;
  const idError = `${id}-pendiente`;
  return (
    <fieldset
      id={id}
      tabIndex={-1}
      aria-describedby={pendiente ? idError : undefined}
      className={`flex flex-col gap-4 rounded-tarjeta bg-superficie-elevada p-6 shadow-relieve outline-none md:p-7 ${pendiente ? "border-[1.5px] border-estado-riesgosa" : ""}`}
    >
      <legend className="flex flex-col gap-3">
        <span className="block text-detalle font-bold text-texto-secundario">
          Pregunta {numero} de {total} · {TIPOS[pregunta.tipo]}
        </span>
        <span className="block font-titulo text-tarjeta font-extrabold text-marca-cafe">{pregunta.enunciado}</span>
      </legend>

      {pregunta.tipo === "relacion" ? (
        <div className="flex flex-col gap-3">
          <p className="text-detalle text-texto-secundario">Elige una opción en cada lista. No necesitas arrastrar nada.</p>
          {pregunta.izquierda.map((izquierda) => {
            const actual = respuesta && "uniones" in respuesta ? respuesta.uniones.find((u) => u.izquierdaId === izquierda.id) : undefined;
            const idSelect = `${id}-izq-${izquierda.id}`;
            return (
              <div key={izquierda.id} className="grid gap-2 md:grid-cols-2 md:items-center md:gap-3">
                <label htmlFor={idSelect} className="rounded-fila bg-superficie-hundida px-4 py-3 font-titulo text-menor font-bold text-marca-cafe">
                  {izquierda.texto}
                </label>
                <span className="relative">
                  <select
                    id={idSelect}
                    disabled={deshabilitada}
                    value={actual?.derechaClave ?? ""}
                    onChange={(evento) => {
                      const previas = respuesta && "uniones" in respuesta ? respuesta.uniones : [];
                      const otras = previas.filter((u) => u.izquierdaId !== izquierda.id);
                      const uniones = evento.target.value ? [...otras, { izquierdaId: izquierda.id, derechaClave: evento.target.value }] : otras;
                      alCambiar({ uniones });
                    }}
                    className="h-12 w-full cursor-pointer appearance-none rounded-fila border-[1.5px] border-marca-cafe bg-superficie-elevada pr-11 pl-4 text-menor text-marca-cafe disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">Elige una opción</option>
                    {pregunta.derecha.map((derecha) => (
                      <option key={derecha.clave} value={derecha.clave}>
                        {derecha.texto}
                      </option>
                    ))}
                  </select>
                  <IconoChevronAbajo aria-hidden="true" className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-marca-cafe" />
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {pregunta.opciones.map((opcion) => {
            const elegida = respuesta && "opcionId" in respuesta && respuesta.opcionId === opcion.id;
            return (
              <label
                key={opcion.id}
                className={[
                  "flex min-h-12 cursor-pointer items-center gap-3 rounded-fila border-[1.5px] px-4 py-3 text-menor text-marca-cafe transition-[background-color,border-color] duration-150 ease-(--ease-respuesta)",
                  elegida ? "border-marca-bosque bg-superficie-hundida/60" : "border-marca-cafe/60 hover:bg-superficie-hundida",
                  deshabilitada ? "cursor-not-allowed opacity-60" : "",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name={id}
                  value={opcion.id}
                  checked={Boolean(elegida)}
                  disabled={deshabilitada}
                  onChange={() => alCambiar({ opcionId: opcion.id })}
                  className="size-5 shrink-0 accent-marca-bosque"
                />
                {opcion.texto}
              </label>
            );
          })}
        </div>
      )}

      {pendiente ? (
        <p id={idError} className="flex items-center gap-2 font-titulo text-detalle font-bold text-estado-riesgosa">
          <IconoAlerta className="size-[18px]" />
          {pregunta.tipo === "relacion" ? "Elige una opción en cada lista." : "Elige una respuesta para esta pregunta."}
        </p>
      ) : null}
    </fieldset>
  );
}
