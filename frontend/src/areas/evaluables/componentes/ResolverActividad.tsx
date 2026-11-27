"use client";

import { useEffect, useRef, useState } from "react";
import { Pregunta, estaRespondida, type Respuesta } from "@/componentes/cuestionario/Pregunta";
import { PreguntaConSolucion } from "@/componentes/cuestionario/Retroalimentacion";
import { Moris } from "@/componentes/marca/Moris";
import { Alerta } from "@/componentes/ui/Alerta";
import { Boton } from "@/componentes/ui/Boton";
import { IconoAlerta, IconoCirculoCheck, IconoCirculoPunto } from "@/componentes/ui/iconos/iconos";
import type { components } from "@/lib/api/esquema";
import type { ErrorApi } from "@/lib/api/errores";
import { mensajeDeError } from "@/lib/api/mensajes";
import { apiNavegador } from "@/lib/api/navegador";
import { formatearFecha, formatearHora, formatearPorcentaje } from "@/lib/fechas";

type Actividad = components["schemas"]["Actividad"];
type ResultadoActividad = components["schemas"]["ResultadoActividad"];

const ETIQUETAS = { optima: "óptima", aceptable: "aceptable", riesgosa: "riesgosa" } as const;

type Props = {
  actividad: Actividad;
  ubicacion: string;
  rutaLeccion: string;
  rutaCurso: string;
  siguiente: { href: string; texto: string } | null;
};

/**
 * Responder y enviar una actividad o un caso (OP-23). Las respuestas viven solo en esta pantalla hasta enviarlas (las
 * actividades no se guardan a medias). Sin responder todo, no se llama a la API: se marcan las pendientes y el aviso
 * recibe el foco. Al enviar, el servidor califica (INV-04) y se muestra la retroalimentación de cada pregunta.
 */
export function ResolverActividad({ actividad, ubicacion, rutaLeccion, rutaCurso, siguiente }: Props) {
  const [respuestas, setRespuestas] = useState<Record<number, Respuesta>>({});
  const [pendientes, setPendientes] = useState<number[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<ErrorApi | null>(null);
  const [resultado, setResultado] = useState<ResultadoActividad | null>(null);
  const aviso = useRef<HTMLDivElement>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const esCaso = actividad.tipo === "caso";
  const total = actividad.preguntas.length;

  useEffect(() => {
    if (pendientes.length || error) aviso.current?.focus();
  }, [pendientes, error]);
  useEffect(() => {
    if (resultado) titulo.current?.focus();
  }, [resultado]);

  function cambiar(id: number, respuesta: Respuesta) {
    setRespuestas((previas) => ({ ...previas, [id]: respuesta }));
    setPendientes((lista) => lista.filter((p) => p !== id));
  }

  async function enviar() {
    if (enviando) return;
    const faltan = actividad.preguntas.filter((p) => !estaRespondida(p, respuestas[p.id])).map((p) => p.id);
    setError(null);
    if (faltan.length) return setPendientes(faltan);
    setEnviando(true);
    const r = await apiNavegador.enviarActividad({
      ruta: { cuestionario: actividad.id },
      cuerpo: { respuestas: actividad.preguntas.map((p) => ({ preguntaId: p.id, ...respuestas[p.id] })) },
    });
    setEnviando(false);
    if (r.ok) return setResultado(r.datos);
    if (r.error.codigo === "RESPUESTAS_INCOMPLETAS" && r.error.preguntasPendientes?.length) return setPendientes(r.error.preguntasPendientes);
    setError(r.error);
  }

  function reintentar() {
    setRespuestas({});
    setPendientes([]);
    setResultado(null);
    window.scrollTo({ top: 0 });
  }

  // Encabezado: antes de enviar, el nombre y las instrucciones; después, el resultado.
  const aciertos = resultado ? resultado.preguntas.filter((p) => p.correcta).length : 0;
  const decision = resultado?.preguntas.find((p) => p.decision)?.decision;
  const encabezado = resultado
    ? {
        arriba: `${ubicacion} · intento ${resultado.intento.numero} · ${formatearFecha(resultado.intento.enviadoEn)} · ${formatearHora(resultado.intento.enviadoEn)}`,
        titulo: decision
          ? `Tu decisión fue ${ETIQUETAS[decision.etiqueta]}`
          : `Respondiste bien ${aciertos} de ${total} preguntas (${formatearPorcentaje(resultado.intento.calificacion)})`,
        texto: esCaso
          ? "Revisa la consecuencia y el porqué. Puedes volver a intentarlo para explorar otras decisiones; en Mis resultados cuenta tu primer intento."
          : "Revisa la explicación de cada respuesta. Puedes intentarlo de nuevo: se guarda tu mejor resultado.",
      }
    : {
        arriba: ubicacion,
        titulo: actividad.titulo,
        texto: actividad.instrucciones,
      };
  const expresion = !resultado ? "curioso" : (decision ? decision.etiqueta === "riesgosa" : aciertos < total) ? "triste" : "feliz";

  return (
    <>
      <section
        aria-labelledby="titulo-actividad"
        data-fondo="oscuro"
        className="mt-[33px] flex items-center justify-between gap-6 rounded-hero bg-marca-cafe px-6 py-8 shadow-hero md:px-10"
      >
        <div className="flex min-w-0 flex-col gap-3">
          <p className="font-titulo text-menor font-semibold text-marca-menta">{encabezado.arriba}</p>
          <h1 id="titulo-actividad" ref={titulo} tabIndex={-1} className="font-titulo text-entrada font-extrabold text-marca-crema outline-none">
            {encabezado.titulo}
          </h1>
          <p className="max-w-[640px] text-cuerpo text-marca-crema/85">{encabezado.texto}</p>
        </div>
        <Moris expresion={expresion} alt="" sizes="120px" className="w-[120px] shrink-0 max-md:hidden" />
      </section>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside aria-label={resultado ? "Resumen del intento" : "Tus respuestas"} className="rounded-tarjeta bg-superficie-elevada p-5 shadow-relieve lg:sticky lg:top-6">
          <p className="font-titulo text-cuerpo font-extrabold text-marca-cafe">{esCaso && resultado ? "Tus intentos" : "Tus respuestas"}</p>
          {esCaso && resultado ? (
            <p className="mt-2 text-detalle text-texto-secundario">
              {resultado.intento.numero === 1
                ? "Este es tu primer intento: es el que aparece en Mis resultados. Puedes volver a intentarlo para explorar otras decisiones."
                : `Este es tu intento ${resultado.intento.numero}. En Mis resultados cuenta el primero.`}
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2.5">
              {actividad.preguntas.map((p, i) => {
                const calificada = resultado?.preguntas.find((q) => q.id === p.id);
                const respondida = estaRespondida(p, respuestas[p.id]);
                return (
                  <li key={p.id}>
                    <a href={`#${resultado ? `revision-${p.id}` : `pregunta-${p.id}`}`} className="flex items-center gap-2 text-detalle text-marca-cafe hover:underline">
                      {calificada ? (
                        calificada.correcta ? (
                          <IconoCirculoCheck className="size-[18px] text-marca-bosque" />
                        ) : (
                          <IconoAlerta className="size-[18px] text-estado-riesgosa" />
                        )
                      ) : respondida ? (
                        <IconoCirculoCheck className="size-[18px] text-marca-bosque" />
                      ) : (
                        <IconoCirculoPunto className={`size-[18px] ${pendientes.includes(p.id) ? "text-estado-riesgosa" : "text-marca-cafe/50"}`} />
                      )}
                      <span className="font-bold">Pregunta {i + 1}</span>
                      <span className={calificada && !calificada.correcta ? "text-estado-riesgosa" : "text-texto-secundario"}>
                        {calificada ? (calificada.correcta ? "Correcta" : "Incorrecta") : respondida ? "Respondida" : "Sin responder"}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
          {!esCaso && (resultado || actividad.mejorCalificacion !== null) ? (
            <p className="mt-4 border-t border-marca-cafe/14 pt-4 text-detalle text-texto-secundario">
              Tu mejor resultado:{" "}
              <strong className="font-titulo text-marca-cafe">
                {formatearPorcentaje(resultado?.mejorCalificacion ?? actividad.mejorCalificacion ?? 0)}
              </strong>
            </p>
          ) : null}
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          {pendientes.length ? (
            <Alerta ref={aviso} tono="error" role="alert" titulo={pendientes.length === 1 ? "Te falta responder 1 pregunta" : `Te faltan ${pendientes.length} preguntas`}>
              Responde{" "}
              {pendientes
                .map((id) => `la pregunta ${actividad.preguntas.findIndex((p) => p.id === id) + 1}`)
                .join(", ")}{" "}
              para enviar.
            </Alerta>
          ) : null}
          {error ? (
            <Alerta ref={aviso} tono="error" role="alert" titulo="No pudimos enviar tus respuestas">
              {mensajeDeError(error)}
            </Alerta>
          ) : null}

          {resultado
            ? resultado.preguntas.map((p, i) => <PreguntaConSolucion key={p.id} pregunta={p} numero={i + 1} total={resultado.preguntas.length} />)
            : actividad.preguntas.map((p, i) => (
                <Pregunta
                  key={p.id}
                  pregunta={p}
                  numero={i + 1}
                  total={total}
                  respuesta={respuestas[p.id]}
                  alCambiar={(r) => cambiar(p.id, r)}
                  pendiente={pendientes.includes(p.id)}
                  deshabilitada={enviando}
                />
              ))}

          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:justify-between">
            {resultado ? (
              <>
                <Boton variante="contornoClaro" tamano="mediano" onClick={reintentar}>
                  Intentar de nuevo
                </Boton>
                <Boton variante="cafe" tamano="mediano" href={siguiente?.href ?? rutaCurso}>
                  {siguiente?.texto ?? "Volver al curso"}
                </Boton>
              </>
            ) : (
              <>
                <Boton variante="contornoClaro" tamano="mediano" href={rutaLeccion}>
                  Volver a la lección
                </Boton>
                <Boton variante="cafe" tamano="mediano" onClick={enviar} aria-disabled={enviando || undefined}>
                  {enviando ? "Enviando…" : esCaso ? "Enviar decisión" : "Enviar actividad"}
                </Boton>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
