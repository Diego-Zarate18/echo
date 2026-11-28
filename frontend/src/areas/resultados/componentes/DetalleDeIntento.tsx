import { notFound } from "next/navigation";
import { PreguntaConSolucion, PreguntaSinRespuestaCorrecta } from "@/componentes/cuestionario/Retroalimentacion";
import { ErrorDePantalla } from "@/componentes/estructura/ErrorDePantalla";
import { Alerta } from "@/componentes/ui/Alerta";
import { Boton } from "@/componentes/ui/Boton";
import { Migas } from "@/componentes/ui/Migas";
import { apiServidor } from "@/lib/api/servidor";
import { formatearFecha, formatearHora, formatearPorcentaje } from "@/lib/fechas";

const TIPOS = { actividad: "Actividad", caso: "Caso práctico", examen: "Examen" } as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Detalle de un intento ya enviado (OP-30). El backend solo devuelve intentos del alumno de la sesión (INV-07);
 * uno ajeno o inexistente es 404.
 */
export async function DetalleDeIntento({ params }: { params: Promise<{ intento: string }> }) {
  const { intento } = await params;
  if (!UUID.test(intento)) notFound();
  const detalle = await apiServidor.obtenerDetalleIntento({ ruta: { intento } });
  if (!detalle.ok && detalle.error.estado === 401) return null;
  if (!detalle.ok && detalle.error.estado === 404) notFound();
  if (!detalle.ok) {
    return (
      <ErrorDePantalla
        titulo="No pudimos abrir este intento"
        error={detalle.error}
        migas={[{ texto: "Mis resultados", href: "/mis-resultados" }]}
        salida={{ texto: "Volver a Mis resultados", href: "/mis-resultados" }}
      />
    );
  }

  const { resultado } = detalle.datos;
  const rutaModulo = `/modulos/${resultado.modulo.slug}`;
  const rutaCurso = `${rutaModulo}/${resultado.curso.slug}`;
  const total = detalle.datos.preguntas.length;
  const correctas = detalle.datos.preguntas.filter((p) => p.correcta).length;
  const sinSolucion = detalle.datos.solucion === "oculta";
  // Un examen se muestra con solución solo si se aprobó (DEC-11); las actividades siempre la traen.
  const etiquetaCalificacion = resultado.tipo === "examen" ? (sinSolucion ? "no aprobado" : "aprobado") : "calificación";
  // «Repasar lección N» (Figma 94:2704): la primera lección a repasar, con su número en el curso.
  const repaso = detalle.datos.solucion === "oculta" ? detalle.datos.preguntas.find((p) => !p.correcta && p.leccionRepaso)?.leccionRepaso ?? null : null;
  const curso = repaso ? await apiServidor.obtenerCurso({ ruta: { curso: resultado.curso.slug } }) : null;
  const ordenRepaso = repaso && curso?.ok ? curso.datos.lecciones.find((l) => l.slug === repaso.slug)?.orden : undefined;
  const resumen =
    resultado.tipo === "caso"
      ? resultado.calificacion === 100
        ? "Tomaste la decisión óptima."
        : resultado.calificacion > 0
          ? "Tomaste una decisión aceptable."
          : "Tomaste una decisión riesgosa."
      : `Respondiste bien ${correctas} de ${total}.`;

  return (
    <>
      <Migas
        elementos={[
          { texto: "Mis resultados", href: "/mis-resultados" },
          { texto: `${resultado.titulo} · intento ${resultado.numero}` },
        ]}
      />
      <section
        aria-labelledby="titulo-intento"
        data-fondo="oscuro"
        className="mt-6 flex flex-col gap-6 rounded-hero bg-marca-cafe px-6 py-8 text-marca-crema shadow-hero md:flex-row md:items-center md:justify-between md:px-10"
      >
        <div className="flex flex-col gap-3">
          <p className="text-detalle font-bold text-marca-menta">
            {TIPOS[resultado.tipo]} · intento {resultado.numero} · {formatearFecha(resultado.enviadoEn)} · {formatearHora(resultado.enviadoEn)}
          </p>
          <h1 id="titulo-intento" className="font-titulo text-entrada font-extrabold">{resultado.titulo}</h1>
          <p className="text-menor text-marca-crema/85">
            {resultado.modulo.titulo} · {resultado.curso.titulo}
          </p>
          {resultado.tipo === "caso" ? <p className="text-cuerpo">{resumen}</p> : <p className="sr-only">{resumen}</p>}
        </div>
        {resultado.tipo === "caso" ? null : (
          <dl className="flex flex-wrap gap-3">
            {[
              [formatearPorcentaje(resultado.calificacion), etiquetaCalificacion],
              [String(correctas), "correctas"],
              [String(total - correctas), "incorrectas"],
            ].map(([valor, etiqueta]) => (
              <div key={etiqueta} className="flex min-w-[88px] flex-col-reverse rounded-fila border border-marca-crema/20 bg-marca-crema/6 px-4 py-3">
                <dt className="text-nota text-marca-crema/85">{etiqueta}</dt>
                <dd className="font-titulo text-tarjeta font-extrabold">{valor}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {sinSolucion ? (
        <Alerta tono="aviso" role="status" className="mt-6">
          Como este intento no se aprobó, se muestran tu respuesta y la lección a repasar, sin las respuestas correctas.
        </Alerta>
      ) : null}

      <section aria-label="Preguntas del intento" className="mt-8 flex flex-col gap-5">
        {detalle.datos.solucion === "completa"
          ? detalle.datos.preguntas.map((p, i) => <PreguntaConSolucion key={p.id} pregunta={p} numero={i + 1} total={total} conPuntaje />)
          : detalle.datos.preguntas.map((p, i) => (
              <PreguntaSinRespuestaCorrecta key={p.id} pregunta={p} numero={i + 1} total={total} conPuntaje hrefLeccion={p.leccionRepaso ? `${rutaCurso}/${p.leccionRepaso.slug}` : null} />
            ))}
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Boton variante={repaso ? "contornoClaro" : "cafe"} href="/mis-resultados">Volver a Mis resultados</Boton>
        {repaso ? (
          <Boton variante="cafe" href={`${rutaCurso}/${repaso.slug}`}>
            {ordenRepaso ? `Repasar lección ${ordenRepaso}` : "Repasar la lección"}
          </Boton>
        ) : resultado.leccion ? (
          <Boton variante="contornoClaro" href={`${rutaCurso}/${resultado.leccion.slug}`}>Ir a la lección</Boton>
        ) : (
          <Boton variante="contornoClaro" href={rutaCurso}>Ir al curso</Boton>
        )}
      </div>
    </>
  );
}
