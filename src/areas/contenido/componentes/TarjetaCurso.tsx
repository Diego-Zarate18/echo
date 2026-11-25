import { Suspense } from "react";
import { BarraProgreso } from "@/componentes/ui/BarraProgreso";
import { Boton } from "@/componentes/ui/Boton";
import { Estado } from "@/componentes/ui/Estado";
import { IconoCandado } from "@/componentes/ui/iconos/iconos";
import { formatearPorcentaje } from "@/lib/fechas";
import { cargarCurso, cargarPortadaExamen, type ResumenCurso } from "../datos/modulos";

/** «Examen aprobado con 90 %»: la mejor calificación aprobada, de la portada del examen. Si falla, queda sin número. */
async function ExamenAprobado({ curso }: { curso: ResumenCurso }) {
  const detalle = await cargarCurso(curso.slug);
  if (!detalle.ok || !detalle.datos.examen) return <>Examen aprobado</>;
  const portada = await cargarPortadaExamen(detalle.datos.examen.id);
  if (!portada.ok) return <>Examen aprobado</>;
  const aprobadas = portada.datos.intentosPrevios.filter((intento) => intento.aprobado).map((intento) => intento.calificacion);
  if (aprobadas.length === 0) return <>Examen aprobado</>;
  return <>Examen aprobado con {formatearPorcentaje(Math.max(...aprobadas))}</>;
}

/** «Lección 3 de 4 · Derechos ARCO»: la lección a medias o, si no hay, la primera disponible. */
async function LeccionActual({ curso }: { curso: ResumenCurso }) {
  const detalle = await cargarCurso(curso.slug);
  if (!detalle.ok) return <>Llevas {formatearPorcentaje(curso.avance)} del curso</>;
  const lecciones = detalle.datos.lecciones;
  const actual = lecciones.find((l) => l.estado === "enCurso") ?? lecciones.find((l) => l.estado === "disponible");
  if (!actual) return <>Llevas {formatearPorcentaje(curso.avance)} del curso</>;
  return (
    <>
      Lección {actual.orden} de {lecciones.length} · {actual.titulo}
    </>
  );
}

function Nota({ curso }: { curso: ResumenCurso }) {
  const alternativa = <>Llevas {formatearPorcentaje(curso.avance)} del curso</>;
  if (curso.estado === "completado") {
    return (
      <Suspense fallback={<>Examen aprobado</>}>
        <ExamenAprobado curso={curso} />
      </Suspense>
    );
  }
  if (curso.estado === "enCurso") {
    return (
      <Suspense fallback={alternativa}>
        <LeccionActual curso={curso} />
      </Suspense>
    );
  }
  return <>Aún no empiezas este curso</>;
}

/** Círculo con el número del curso: bosque si está completado, café si se puede abrir y de contorno con candado si no. */
function NumeroDeCurso({ orden, estado }: { orden: number; estado: ResumenCurso["estado"] }) {
  if (estado === "bloqueado") {
    return (
      <span
        aria-hidden="true"
        className="flex size-14 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[color-mix(in_srgb,var(--color-marca-cafe)_38%,var(--color-superficie-hundida))] text-texto-secundario"
      >
        <IconoCandado className="size-5" />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`flex size-14 shrink-0 items-center justify-center rounded-full font-titulo text-[1.375rem] font-extrabold text-marca-crema ${estado === "completado" ? "bg-marca-bosque" : "bg-marca-cafe"}`}
    >
      {orden}
    </span>
  );
}

type PropsTarjetaCurso = {
  curso: ResumenCurso;
  /** Todos los cursos del módulo: el requisito de uno bloqueado se escribe con el número del curso que falta aprobar. */
  cursos: ResumenCurso[];
  moduloSlug: string;
};

/**
 * Tarjeta de un curso en SCR-07: número, estado, título y descripción; según el estado, el avance con su botón o lo
 * que falta para desbloquearlo. «Repasar curso» es un botón grande de contorno; «Continuar curso», uno mediano café.
 */
export function TarjetaCurso({ curso, cursos, moduloSlug }: PropsTarjetaCurso) {
  const bloqueado = curso.estado === "bloqueado";
  const idTitulo = `curso-${curso.slug}`;
  // El requisito de un curso bloqueado es el examen del curso anterior («Aprueba el examen de cada curso para abrir el
  // siguiente»). La API lo manda como `{ tipo: "examen", id, titulo }`, sin el número del curso: se deduce del orden.
  const ordenRequisito = curso.requisito
    ? (cursos.find((otro) => otro.slug === curso.requisito?.slug)?.orden ?? (curso.requisito.tipo === "examen" && curso.orden > 1 ? curso.orden - 1 : null))
    : null;
  const textoRequisito = curso.requisito
    ? ordenRequisito
      ? `Aprueba el examen del curso ${ordenRequisito} para desbloquearlo.`
      : `Aprueba «${curso.requisito.titulo}» para desbloquearlo.`
    : null;
  const href = `/modulos/${moduloSlug}/${curso.slug}`;

  return (
    <article
      aria-labelledby={idTitulo}
      className={[
        "flex flex-col gap-5 rounded-tarjeta px-6 py-7 md:flex-row md:items-center md:gap-7 md:py-7 md:pr-14 md:pl-8",
        bloqueado ? "bg-superficie-hundida shadow-hundido" : "bg-superficie-elevada shadow-relieve",
      ].join(" ")}
    >
      <NumeroDeCurso orden={curso.orden} estado={curso.estado} />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="mb-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-detalle font-bold text-texto-secundario">
            Curso {curso.orden} de {cursos.length}
          </p>
          <Estado estado={curso.estado} />
        </div>
        <h3 id={idTitulo} className="font-titulo text-[1.5rem] leading-[1.2] font-extrabold tracking-[-0.006em] text-marca-cafe">
          {curso.titulo}
        </h3>
        <p className="text-base text-texto-secundario">{curso.descripcion}</p>
        {bloqueado && textoRequisito ? (
          <p className="mt-1 flex items-center gap-2.5 text-menor font-semibold text-marca-cafe">
            <IconoCandado className="size-4 text-texto-secundario" />
            {textoRequisito}
          </p>
        ) : null}
      </div>

      {bloqueado ? null : (
        <div className="flex w-full flex-col gap-3 md:w-[340px] md:items-end">
          <div className="flex w-full items-center gap-3">
            <BarraProgreso valor={curso.avance} etiqueta={`Avance del curso ${curso.orden}`} className="md:w-[280px] md:flex-none" />
            <span className="shrink-0 font-titulo text-detalle font-bold whitespace-nowrap text-marca-cafe">
              {formatearPorcentaje(curso.avance)}
            </span>
          </div>
          <p className="text-detalle text-texto-secundario md:text-right">
            <Nota curso={curso} />
          </p>
          {curso.estado === "completado" ? (
            <Boton variante="contornoClaro" href={href} className="max-md:w-full md:w-[200px] md:justify-start md:pl-[30px]">
              Repasar curso
            </Boton>
          ) : (
            <Boton variante="cafe" tamano="mediano" href={href} className="max-md:w-full md:w-[170px]">
              {curso.estado === "disponible" ? "Empezar curso" : "Continuar curso"}
            </Boton>
          )}
        </div>
      )}
    </article>
  );
}
