import Image from "next/image";
import Link from "next/link";
import { PreguntaConSolucion, PreguntaSinRespuestaCorrecta, type PreguntaCalificada, type PreguntaSinSolucion } from "@/componentes/cuestionario/Retroalimentacion";
import { Moris } from "@/componentes/marca/Moris";
import { Boton } from "@/componentes/ui/Boton";
import { IconoLibro } from "@/componentes/ui/iconos/iconos";
import type { components } from "@/lib/api/esquema";
import { formatearFecha, formatearHora, formatearPorcentaje } from "@/lib/fechas";

export type DatosResultado = {
  titulo: string;
  intento: { numero: number; enviadoEn: string; calificacion: number };
  calificacionMinima: number | null;
  aprobado: boolean;
  /** Solo al enviar (OP-27): la insignia que se acaba de obtener. */
  insigniaNueva: components["schemas"]["Insignia"] | null;
  leccionesRepaso: { slug: string; titulo: string }[];
  disponibleEn: string | null;
  minutosEspera: number | null;
  /** Aprobado: con solución (DEC-11). No aprobado: sin la respuesta correcta (INV-04). */
  preguntas: { conSolucion: true; lista: PreguntaCalificada[] } | { conSolucion: false; lista: PreguntaSinSolucion[] };
  /** `/modulos/m/c`: para el curso y las lecciones de repaso. `null` si no se pudo leer. */
  rutaCurso: string | null;
};

/**
 * SCR-13 · Resultado del examen. Lo usan el envío (con todo lo que devuelve OP-27) y la página del intento (OP-30, al
 * volver más tarde). No aprobado: calificación, lecciones para repasar, la espera y las preguntas falladas sin la
 * respuesta correcta. Aprobado: la insignia nueva, si la hay, y la retroalimentación completa.
 */
export function ResultadoDeExamen({ datos }: { datos: DatosResultado }) {
  const { intento, aprobado, preguntas } = datos;
  const aciertos = preguntas.lista.filter((p) => p.correcta).length;
  const errores = preguntas.lista.length - aciertos;
  const titulo = aprobado
    ? `¡Aprobaste con ${formatearPorcentaje(intento.calificacion)}!`
    : `Obtuviste ${formatearPorcentaje(intento.calificacion)}.${datos.calificacionMinima !== null ? ` El mínimo es ${formatearPorcentaje(datos.calificacionMinima)}` : ""}`;
  const falladas = preguntas.conSolucion ? [] : preguntas.lista.filter((p) => !p.correcta);

  return (
    <>
      <section
        aria-labelledby="titulo-resultado"
        data-fondo="oscuro"
        className="mt-[33px] grid gap-6 rounded-hero bg-marca-cafe px-6 py-8 shadow-hero md:px-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
      >
        <div className="flex min-w-0 flex-col gap-4">
          <p className="font-titulo text-menor font-semibold text-marca-menta">
            {datos.titulo} · intento {intento.numero} · {formatearFecha(intento.enviadoEn)} · {formatearHora(intento.enviadoEn)}
          </p>
          <h1 id="titulo-resultado" tabIndex={-1} className="font-titulo text-entrada font-extrabold text-marca-crema outline-none">
            {titulo}
          </h1>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [String(aciertos), aciertos === 1 ? "correcta" : "correctas"],
              [String(errores), errores === 1 ? "incorrecta" : "incorrectas"],
              [formatearPorcentaje(intento.calificacion), "calificación"],
              ...(datos.calificacionMinima !== null ? [[formatearPorcentaje(datos.calificacionMinima), "mínima"]] : []),
            ].map(([valor, etiqueta]) => (
              <div key={etiqueta} className="flex flex-col rounded-fila border border-marca-crema/24 bg-marca-crema/8 px-4 py-3 text-marca-crema">
                <dd className="order-1 font-titulo text-[1.5rem] font-extrabold">{valor}</dd>
                <dt className="order-2 text-nota text-marca-crema/85">{etiqueta}</dt>
              </div>
            ))}
          </dl>
        </div>
        <Moris expresion={aprobado ? "feliz" : "triste"} alt="" sizes="140px" className="w-[140px] max-lg:hidden" />
      </section>

      {aprobado && datos.insigniaNueva ? (
        <section aria-labelledby="titulo-insignia" className="mt-6 flex flex-col items-center gap-4 rounded-tarjeta border-2 border-marca-bosque bg-superficie-elevada p-7 text-center shadow-relieve md:flex-row md:text-left">
          <Image
            src={datos.insigniaNueva.imagen.ruta}
            alt={datos.insigniaNueva.imagen.textoAlternativo}
            width={120}
            height={120}
            className="size-[120px] shrink-0 rounded-full bg-superficie-hundida object-contain motion-safe:animate-[encender_500ms_var(--ease-llegada)_both]"
          />
          <div className="flex flex-col gap-2">
            <p className="font-titulo text-detalle font-bold text-marca-bosque">Insignia nueva</p>
            <h2 id="titulo-insignia" className="font-titulo text-elemento font-extrabold text-marca-cafe">
              Obtuviste la insignia «{datos.insigniaNueva.nombre}»
            </h2>
            <p className="text-cuerpo text-texto-secundario">{datos.insigniaNueva.descripcion}</p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <Boton variante="contornoClaro" tamano="mediano" href="/mi-progreso">Ver mi progreso</Boton>
              <Boton variante="cafe" tamano="mediano" href="/modulos">Ir a Módulos</Boton>
            </div>
          </div>
        </section>
      ) : null}

      {!aprobado ? (
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
          {datos.leccionesRepaso.length ? (
            <section aria-labelledby="titulo-repaso" className="rounded-tarjeta bg-superficie-elevada p-6 shadow-relieve">
              <h2 id="titulo-repaso" className="font-titulo text-tarjeta font-extrabold text-marca-cafe">Lecciones para repasar</h2>
              <ul className="mt-4 flex flex-col gap-2">
                {datos.leccionesRepaso.map((l) => (
                  <li key={l.slug}>
                    {datos.rutaCurso ? (
                      <Link href={`${datos.rutaCurso}/${l.slug}`} className="flex items-center gap-3 rounded-fila bg-superficie-hundida px-4 py-3 font-titulo text-menor font-bold text-marca-cafe hover:underline">
                        <IconoLibro className="size-5 shrink-0 text-marca-bosque" />
                        {l.titulo}
                      </Link>
                    ) : (
                      <p className="flex items-center gap-3 rounded-fila bg-superficie-hundida px-4 py-3 font-titulo text-menor font-bold text-marca-cafe">
                        <IconoLibro className="size-5 shrink-0 text-marca-bosque" />
                        {l.titulo}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {datos.disponibleEn ? (
            <section aria-labelledby="titulo-espera" className="flex items-center gap-5 rounded-tarjeta bg-superficie-elevada p-6 shadow-relieve">
              {datos.minutosEspera !== null ? (
                <p className="flex shrink-0 flex-col items-center rounded-fila bg-marca-cafe px-5 py-3 text-marca-crema">
                  <span className="font-titulo text-[1.5rem] font-extrabold">{datos.minutosEspera} min</span>
                  <span className="text-nota">de espera</span>
                </p>
              ) : null}
              <div className="flex flex-col gap-1">
                <h2 id="titulo-espera" className="font-titulo text-tarjeta font-extrabold text-marca-cafe">
                  Podrás intentarlo de nuevo a las {formatearHora(datos.disponibleEn)}
                </h2>
                <p className="text-detalle text-texto-secundario">Aprovecha la espera para repasar. Tus actividades y casos no tienen espera.</p>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      <section aria-labelledby="titulo-revision" className="mt-8">
        <h2 id="titulo-revision" className="font-titulo text-elemento font-extrabold text-marca-cafe">
          {preguntas.conSolucion ? "Retroalimentación" : "Preguntas que fallaste"}
        </h2>
        {preguntas.conSolucion ? null : (
          <p className="mt-2 max-w-[720px] text-cuerpo text-texto-secundario">
            Te mostramos tu respuesta y qué lección repasar. La respuesta correcta no se muestra para que puedas volver a intentarlo.
          </p>
        )}
        <div className="mt-5 flex flex-col gap-4">
          {preguntas.conSolucion
            ? preguntas.lista.map((p, i) => <PreguntaConSolucion key={p.id} pregunta={p} numero={i + 1} total={preguntas.lista.length} />)
            : falladas.map((p) => (
                <PreguntaSinRespuestaCorrecta
                  key={p.id}
                  pregunta={p}
                  numero={preguntas.lista.indexOf(p) + 1}
                  total={preguntas.lista.length}
                  hrefLeccion={p.leccionRepaso && datos.rutaCurso ? `${datos.rutaCurso}/${p.leccionRepaso.slug}` : null}
                />
              ))}
        </div>
      </section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Boton variante="contornoClaro" tamano="mediano" href="/mis-resultados">Ver Mis resultados</Boton>
        <Boton variante="cafe" tamano="mediano" href={datos.rutaCurso ?? "/modulos"}>Volver al curso</Boton>
      </div>
    </>
  );
}
