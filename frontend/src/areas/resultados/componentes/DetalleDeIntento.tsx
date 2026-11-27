import { notFound } from "next/navigation";
import { PreguntaConSolucion, PreguntaSinRespuestaCorrecta } from "@/componentes/cuestionario/Retroalimentacion";
import { ErrorDePantalla } from "@/componentes/estructura/ErrorDePantalla";
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
          { texto: `${resultado.titulo} · Intento ${resultado.numero}` },
        ]}
      />
      <section aria-labelledby="titulo-intento" data-fondo="oscuro" className="mt-6 flex flex-col gap-4 rounded-hero bg-marca-cafe px-6 py-8 text-marca-crema shadow-hero md:px-10">
        <p className="text-detalle text-marca-crema/85">
          {TIPOS[resultado.tipo]} · {resultado.modulo.titulo} · {resultado.curso.titulo}
        </p>
        <h1 id="titulo-intento" className="font-titulo text-entrada font-extrabold">{resultado.titulo}</h1>
        <dl className="flex flex-wrap gap-x-10 gap-y-3">
          <div>
            <dt className="text-nota text-marca-crema/85">Intento</dt>
            <dd className="font-titulo text-tarjeta font-extrabold">{resultado.numero}</dd>
          </div>
          <div>
            <dt className="text-nota text-marca-crema/85">Calificación</dt>
            <dd className="font-titulo text-tarjeta font-extrabold">{formatearPorcentaje(resultado.calificacion)}</dd>
          </div>
          <div>
            <dt className="text-nota text-marca-crema/85">Enviado</dt>
            <dd className="font-titulo text-tarjeta font-extrabold">
              {formatearFecha(resultado.enviadoEn)} · {formatearHora(resultado.enviadoEn)}
            </dd>
          </div>
        </dl>
        <p className="text-cuerpo">{resumen}</p>
      </section>

      {detalle.datos.solucion === "oculta" ? (
        <p className="mt-8 max-w-[720px] text-cuerpo text-marca-cafe">
          Este examen no se aprobó, así que no mostramos las respuestas correctas. Repasa las lecciones que te indicamos y vuelve a intentarlo.
        </p>
      ) : null}

      <section aria-label="Preguntas del intento" className="mt-8 flex flex-col gap-5">
        {detalle.datos.solucion === "completa"
          ? detalle.datos.preguntas.map((p, i) => <PreguntaConSolucion key={p.id} pregunta={p} numero={i + 1} total={total} />)
          : detalle.datos.preguntas.map((p, i) => (
              <PreguntaSinRespuestaCorrecta key={p.id} pregunta={p} numero={i + 1} total={total} hrefLeccion={p.leccionRepaso ? `${rutaCurso}/${p.leccionRepaso.slug}` : null} />
            ))}
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Boton variante="cafe" href="/mis-resultados">Volver a Mis resultados</Boton>
        {resultado.leccion ? (
          <Boton variante="contornoClaro" href={`${rutaCurso}/${resultado.leccion.slug}`}>Ir a la lección</Boton>
        ) : (
          <Boton variante="contornoClaro" href={rutaCurso}>Ir al curso</Boton>
        )}
      </div>
    </>
  );
}
