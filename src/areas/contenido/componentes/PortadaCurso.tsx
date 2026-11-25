import { BarraProgreso } from "@/componentes/ui/BarraProgreso";
import { formatearPorcentaje } from "@/lib/fechas";
import type { DetalleCurso } from "../datos/modulos";

type PropsPortadaCurso = {
  curso: DetalleCurso;
  /** «Módulo 2»: sale de la lista de módulos. */
  moduloOrden: number | null;
  /** «Curso 2 de 3»: sale del detalle del módulo. */
  posicion: { orden: number; total: number } | null;
};

/** Conteos del panel de la derecha: lecciones leídas, actividades y casos enviados, y el examen. */
function resumenDelCurso(curso: DetalleCurso) {
  const evaluables = curso.lecciones.flatMap((leccion) => leccion.evaluables);
  const actividades = evaluables.filter((e) => e.tipo === "actividad");
  const casos = evaluables.filter((e) => e.tipo === "caso");
  const enviados = (lista: typeof evaluables) => lista.filter((e) => e.estado === "enviado").length;
  return [
    ["Lecciones leídas", `${curso.lecciones.filter((l) => l.estado === "completado").length} de ${curso.lecciones.length}`],
    ["Actividades enviadas", `${enviados(actividades)} de ${actividades.length}`],
    ["Casos enviados", `${enviados(casos)} de ${casos.length}`],
    ["Examen", curso.examen?.estado === "aprobado" ? "Aprobado" : "Pendiente"],
  ] as const;
}

/**
 * Tarjeta café de SCR-08: «Módulo 2 · Curso 2 de 3», título, descripción y avance; a la derecha, el resumen del curso.
 * Con el curso completado (incluso si luego se agrega una lección nueva) el resumen ya no hace falta y no se muestra.
 */
export function PortadaCurso({ curso, moduloOrden, posicion }: PropsPortadaCurso) {
  const conResumen = curso.estado !== "completado";
  const ubicacion = [
    moduloOrden ? `Módulo ${moduloOrden}` : null,
    posicion ? `Curso ${posicion.orden} de ${posicion.total}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section
      aria-labelledby="titulo-curso"
      data-fondo="oscuro"
      className={[
        "grid items-center gap-8 rounded-hero bg-marca-cafe px-6 py-8 shadow-hero md:px-10 md:py-9",
        conResumen ? "lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10" : "",
      ].join(" ")}
    >
      <div className="flex min-w-0 flex-col">
        {ubicacion ? <p className="mb-[15px] font-titulo text-menor font-semibold text-marca-menta">{ubicacion}</p> : null}
        <h1 id="titulo-curso" className="mb-[11px] font-titulo text-[2.5rem] leading-[1.12] font-extrabold tracking-[-0.006em] text-marca-crema">
          {curso.titulo}
        </h1>
        <p className="mb-2.5 text-cuerpo text-marca-crema/85">{curso.descripcion}</p>
        <div className="flex items-center gap-3">
          <BarraProgreso
            valor={curso.avance}
            etiqueta={`Avance del curso ${posicion?.orden ?? ""}`.trim()}
            tono="oscuroTenue"
            className="min-w-0 md:w-[500px] md:flex-none"
          />
          <span className="shrink-0 font-titulo text-detalle font-bold whitespace-nowrap text-marca-crema">
            {formatearPorcentaje(curso.avance)}
          </span>
        </div>
      </div>

      {conResumen ? (
        <section aria-label="Resumen del curso" className="rounded-panel border border-marca-crema/24 bg-marca-crema/8 p-6">
          <dl className="flex flex-col gap-[11px] text-menor">
            {resumenDelCurso(curso).map(([etiqueta, valor]) => (
              <div key={etiqueta} className="flex items-baseline justify-between gap-4">
                <dt className="text-marca-crema/85">{etiqueta}</dt>
                <dd className="font-titulo font-bold text-marca-crema">{valor}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </section>
  );
}
