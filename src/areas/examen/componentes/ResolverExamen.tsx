"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pregunta, estaRespondida, type Respuesta } from "@/componentes/cuestionario/Pregunta";
import { Alerta } from "@/componentes/ui/Alerta";
import { Boton } from "@/componentes/ui/Boton";
import { IconoBaseDeDatos, IconoSinReloj } from "@/componentes/ui/iconos/iconos";
import type { components } from "@/lib/api/esquema";
import type { ErrorApi } from "@/lib/api/errores";
import { mensajeDeError } from "@/lib/api/mensajes";
import { apiNavegador } from "@/lib/api/navegador";
import { formatearHora, formatearPorcentaje } from "@/lib/fechas";
import { ResultadoDeExamen, type DatosResultado } from "./ResultadoDeExamen";

type Intento = components["schemas"]["IntentoEnCurso"];
type Guardado = { estado: "guardado"; hora: string } | { estado: "guardando" } | { estado: "sinConexion" } | null;

type Props = {
  cuestionario: number;
  titulo: string;
  curso: string;
  calificacionMinima: number;
  rutaCurso: string | null;
};

/**
 * Resolución del examen (SCR-12). Crea o retoma el intento (OP-25), muestra una pregunta a la vez y guarda cada
 * respuesta en el servidor al elegirla (OP-26): nada se guarda en el navegador. Si se pierde la conexión, la respuesta
 * que no se guardó se reintenta al volver. Al enviar (OP-27) muestra el resultado en la misma pantalla. Sin cronómetro.
 */
export function ResolverExamen({ cuestionario, titulo, curso, calificacionMinima, rutaCurso }: Props) {
  const [intento, setIntento] = useState<Intento | null>(null);
  const [errorCarga, setErrorCarga] = useState<ErrorApi | null>(null);
  const [respuestas, setRespuestas] = useState<Record<number, Respuesta>>({});
  const [actual, setActual] = useState(0);
  const [guardado, setGuardado] = useState<Guardado>(null);
  const [pendientes, setPendientes] = useState<number[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<ErrorApi | null>(null);
  const [resultado, setResultado] = useState<DatosResultado | null>(null);
  const sinGuardar = useRef(new Map<number, Respuesta>());
  const aviso = useRef<HTMLDivElement>(null);
  const preguntaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vigente = true;
    apiNavegador.iniciarIntentoExamen({ ruta: { cuestionario } }).then((r) => {
      if (!vigente) return;
      if (!r.ok) return setErrorCarga(r.error);
      const previas: Record<number, Respuesta> = {};
      for (const g of r.datos.respuestas) {
        if (g.opcionId !== undefined) previas[g.preguntaId] = { opcionId: g.opcionId };
        else if (g.uniones) previas[g.preguntaId] = { uniones: g.uniones };
      }
      setRespuestas(previas);
      setIntento(r.datos);
      // Retoma en la primera pregunta sin responder.
      const primera = r.datos.preguntas.findIndex((p) => !estaRespondida(p, previas[p.id]));
      setActual(Math.max(primera, 0));
    });
    return () => {
      vigente = false;
    };
  }, [cuestionario]);

  const guardar = useCallback(
    async (preguntaId: number, respuesta: Respuesta) => {
      if (!intento) return;
      setGuardado({ estado: "guardando" });
      const r = await apiNavegador.guardarRespuesta({ ruta: { intento: intento.id, pregunta: preguntaId }, cuerpo: respuesta });
      if (r.ok) {
        sinGuardar.current.delete(preguntaId);
        setGuardado({ estado: "guardado", hora: formatearHora(r.datos.guardadaEn) });
      } else {
        sinGuardar.current.set(preguntaId, respuesta);
        setGuardado(r.error.codigo === "SIN_CONEXION" ? { estado: "sinConexion" } : null);
        if (r.error.codigo !== "SIN_CONEXION") setErrorEnvio(r.error);
      }
    },
    [intento],
  );

  // Al volver la conexión, se reintenta lo que no se guardó.
  useEffect(() => {
    const reintentar = () => sinGuardar.current.forEach((respuesta, id) => void guardar(id, respuesta));
    window.addEventListener("online", reintentar);
    return () => window.removeEventListener("online", reintentar);
  }, [guardar]);

  useEffect(() => {
    if (pendientes.length || errorEnvio || errorCarga) aviso.current?.focus();
  }, [pendientes, errorEnvio, errorCarga]);

  if (errorCarga) {
    return (
      <Alerta ref={aviso} tono="error" role="alert" titulo="No pudimos abrir tu intento" className="mt-8">
        {mensajeDeError(errorCarga)}{" "}
        <a href={`/examenes/${cuestionario}`} className="font-bold underline underline-offset-4">Volver a la portada del examen</a>
      </Alerta>
    );
  }
  if (resultado) return <ResultadoDeExamen datos={resultado} />;
  if (!intento) {
    return <div aria-hidden="true" className="mt-8 h-[420px] rounded-tarjeta bg-superficie-hundida" />;
  }

  const preguntas = intento.preguntas;
  const pregunta = preguntas[actual];
  const respondidas = preguntas.filter((p) => estaRespondida(p, respuestas[p.id])).length;

  function cambiar(respuesta: Respuesta) {
    setRespuestas((previas) => ({ ...previas, [pregunta.id]: respuesta }));
    setPendientes((lista) => lista.filter((id) => id !== pregunta.id));
    void guardar(pregunta.id, respuesta);
  }

  function ir(indice: number) {
    setActual(indice);
    requestAnimationFrame(() => preguntaRef.current?.querySelector<HTMLElement>("fieldset")?.focus());
  }

  async function enviar() {
    if (enviando || !intento) return;
    setErrorEnvio(null);
    const faltan = preguntas.filter((p) => !estaRespondida(p, respuestas[p.id])).map((p) => p.id);
    if (faltan.length) return setPendientes(faltan);
    setEnviando(true);
    // Primero lo que quedó sin guardar; si sigue sin conexión, no se envía.
    for (const [id, respuesta] of sinGuardar.current) await guardar(id, respuesta);
    if (sinGuardar.current.size) {
      setEnviando(false);
      return setErrorEnvio({ estado: 0, codigo: "SIN_CONEXION" });
    }
    const r = await apiNavegador.enviarExamen({ ruta: { intento: intento.id } });
    setEnviando(false);
    if (!r.ok) {
      if (r.error.codigo === "RESPUESTAS_INCOMPLETAS" && r.error.preguntasPendientes?.length) return setPendientes(r.error.preguntasPendientes);
      return setErrorEnvio(r.error);
    }
    const d = r.datos;
    setResultado({
      titulo: `Examen del curso · ${curso}`,
      intento: d.intento,
      calificacionMinima: d.calificacionMinima,
      aprobado: d.resultado === "aprobado",
      insigniaNueva: d.resultado === "aprobado" ? d.insigniaNueva : null,
      leccionesRepaso: d.resultado === "reprobado" ? d.leccionesRepaso : [],
      disponibleEn: d.resultado === "reprobado" ? d.disponibleEn : null,
      minutosEspera: d.resultado === "reprobado" ? d.minutosEspera : null,
      preguntas: d.resultado === "aprobado" ? { conSolucion: true, lista: d.preguntas } : { conSolucion: false, lista: d.preguntas },
      rutaCurso,
    });
    // La URL queda en la página del intento: al recargar se ve el mismo resultado (OP-30).
    window.history.replaceState(null, "", `/examenes/${cuestionario}/resultado/${d.intento.id}`);
    window.scrollTo({ top: 0 });
  }

  return (
    <>
      <section
        aria-labelledby="titulo-examen"
        data-fondo="oscuro"
        className="mt-[33px] flex flex-col gap-4 rounded-hero bg-marca-cafe px-6 py-6 shadow-hero md:flex-row md:items-center md:justify-between md:px-8"
      >
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-titulo text-detalle font-semibold text-marca-menta">Examen del curso · {curso}</p>
          <h1 id="titulo-examen" className="font-titulo text-tarjeta font-extrabold text-marca-crema md:text-[1.5rem]">
            {titulo}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-detalle text-marca-crema">
          <span className="flex items-center gap-2">
            <IconoSinReloj className="size-5" />
            Sin cronómetro
          </span>
          <p role="status" className="flex min-h-10 items-center gap-2 rounded-full bg-marca-crema/12 px-4 font-titulo font-bold">
            <IconoBaseDeDatos className="size-5 text-marca-menta" />
            {guardado?.estado === "guardado"
              ? `Guardado · ${guardado.hora}`
              : guardado?.estado === "guardando"
                ? "Guardando…"
                : guardado?.estado === "sinConexion"
                  ? "Sin conexión: tus respuestas están a salvo hasta el último guardado"
                  : "Tus respuestas se guardan al elegirlas"}
          </p>
        </div>
      </section>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <nav aria-label="Preguntas del examen" className="rounded-tarjeta bg-superficie-elevada p-5 shadow-relieve lg:sticky lg:top-6">
          <p className="font-titulo text-cuerpo font-extrabold text-marca-cafe">Preguntas</p>
          <ol className="mt-3 grid grid-cols-5 gap-2">
            {preguntas.map((p, i) => {
              const hecha = estaRespondida(p, respuestas[p.id]);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => ir(i)}
                    aria-current={i === actual ? "step" : undefined}
                    aria-label={`Pregunta ${i + 1}, ${hecha ? "respondida" : "sin responder"}`}
                    className={[
                      "flex size-11 items-center justify-center rounded-fila font-titulo text-menor font-bold",
                      i === actual ? "border-[2.5px] border-marca-bosque" : "",
                      hecha ? (i === actual ? "bg-superficie-elevada text-marca-cafe" : "bg-marca-cafe text-marca-crema") : "border-[1.5px] border-dashed border-marca-cafe/50 bg-superficie-hundida text-marca-cafe",
                      pendientes.includes(p.id) ? "border-estado-riesgosa" : "",
                    ].join(" ")}
                  >
                    {i + 1}
                  </button>
                </li>
              );
            })}
          </ol>
          <ul className="mt-4 flex flex-col gap-1.5 text-nota text-texto-secundario">
            <li className="flex items-center gap-2"><span aria-hidden="true" className="size-3.5 rounded-[4px] bg-marca-cafe" />Respondida (relleno)</li>
            <li className="flex items-center gap-2"><span aria-hidden="true" className="size-3.5 rounded-[4px] border-2 border-marca-bosque" />Actual (borde grueso)</li>
            <li className="flex items-center gap-2"><span aria-hidden="true" className="size-3.5 rounded-[4px] border border-dashed border-marca-cafe/60 bg-superficie-hundida" />Sin responder (borde punteado)</li>
          </ul>
          <p className="mt-4 border-t border-marca-cafe/14 pt-4 font-titulo text-detalle font-bold text-marca-cafe">
            {respondidas} de {preguntas.length} respondidas
          </p>
          <Boton variante="cafe" tamano="mediano" onClick={enviar} aria-disabled={enviando || undefined} className="mt-3 w-full">
            {enviando ? "Enviando…" : "Enviar examen"}
          </Boton>
        </nav>

        <div ref={preguntaRef} className="flex min-w-0 flex-col gap-4">
          {pendientes.length ? (
            <Alerta ref={aviso} tono="error" role="alert" titulo={pendientes.length === 1 ? "Te falta responder 1 pregunta" : `Te faltan ${pendientes.length} preguntas`}>
              <span className="flex flex-wrap gap-x-3">
                {pendientes.map((id) => {
                  const i = preguntas.findIndex((p) => p.id === id);
                  return (
                    <button key={id} type="button" onClick={() => ir(i)} className="font-bold underline underline-offset-4">
                      Pregunta {i + 1}
                    </button>
                  );
                })}
              </span>
            </Alerta>
          ) : null}
          {errorEnvio ? (
            <Alerta ref={aviso} tono="error" role="alert" titulo="No pudimos enviar el examen">
              {mensajeDeError(errorEnvio)}
            </Alerta>
          ) : null}

          <Pregunta
            key={pregunta.id}
            pregunta={pregunta}
            numero={actual + 1}
            total={preguntas.length}
            respuesta={respuestas[pregunta.id]}
            alCambiar={cambiar}
            pendiente={pendientes.includes(pregunta.id)}
            deshabilitada={enviando}
          />
          <p className="text-detalle text-texto-secundario">Mínimo para aprobar: {formatearPorcentaje(calificacionMinima)}.</p>

          <div className="flex justify-between gap-3">
            {actual > 0 ? (
              <Boton variante="contornoClaro" tamano="mediano" onClick={() => ir(actual - 1)}>Anterior</Boton>
            ) : (
              <span />
            )}
            {actual < preguntas.length - 1 ? (
              <Boton variante="cafe" tamano="mediano" onClick={() => ir(actual + 1)}>Siguiente</Boton>
            ) : (
              <Boton variante="cafe" tamano="mediano" onClick={enviar} aria-disabled={enviando || undefined}>
                {enviando ? "Enviando…" : "Enviar examen"}
              </Boton>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
