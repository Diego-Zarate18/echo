import { Suspense } from "react";
import { Boton } from "@/componentes/ui/Boton";
import { Pastilla } from "@/componentes/ui/Pastilla";
import { IconoCandado, IconoCirculoCheck, IconoCirculoPunto } from "@/componentes/ui/iconos/iconos";
import { formatearFecha, formatearPorcentaje } from "@/lib/fechas";
import { cargarLeccion, type ResumenLeccion } from "../datos/modulos";
import { FilaEvaluable } from "./FilaEvaluable";

/** «Terminada el 14/10/2026» o «Vas en la sección 3 de 5»: salen de la lección abierta. Si falla, queda la versión corta. */
async function DatosDeLaLeccion({ leccion }: { leccion: ResumenLeccion }) {
  const abierta = await cargarLeccion(leccion.slug);
  if (leccion.estado === "completado") {
    const fecha = abierta.ok && abierta.datos.terminadaEn ? formatearFecha(abierta.datos.terminadaEn) : "";
    return <>{fecha ? `Terminada el ${fecha}` : "Terminada"}</>;
  }
  if (!abierta.ok) return <>Lección en curso</>;
  return (
    <>
      Vas en la sección {abierta.datos.ultimaSeccion} de {abierta.datos.secciones.length}
    </>
  );
}

function Nota({ leccion, avanceDelCurso }: { leccion: ResumenLeccion; avanceDelCurso: number }) {
  if (leccion.estado === "completado" || leccion.estado === "enCurso") {
    const corta = leccion.estado === "completado" ? "Terminada" : "Lección en curso";
    return (
      <Suspense fallback={<>{corta}</>}>
        <DatosDeLaLeccion leccion={leccion} />
      </Suspense>
    );
  }
  if (leccion.estado === "bloqueado") return <>Completa la lección, su actividad y sus casos para abrirla.</>;
  if (leccion.nueva) {
    // El contrato no trae la fecha en que se agregó la lección: solo se dice que es nueva y que no cambia el avance.
    return <>Lección nueva. Puedes leerla cuando quieras: tu curso sigue al {formatearPorcentaje(avanceDelCurso)}.</>;
  }
  return <>{leccion.resumen ?? "Aún no empiezas esta lección."}</>;
}

function Numero({ orden, estado }: { orden: number; estado: ResumenLeccion["estado"] }) {
  if (estado === "bloqueado") {
    return (
      <span
        aria-hidden="true"
        className="flex size-12 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[color-mix(in_srgb,var(--color-marca-cafe)_38%,var(--color-superficie-hundida))] text-texto-secundario"
      >
        <IconoCandado className="size-5" />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`flex size-12 shrink-0 items-center justify-center rounded-full font-titulo text-[1.25rem] font-extrabold text-marca-crema ${estado === "completado" ? "bg-marca-bosque" : "bg-marca-cafe"}`}
    >
      {orden}
    </span>
  );
}

function Estados({ leccion }: { leccion: ResumenLeccion }) {
  switch (leccion.estado) {
    case "completado":
      return (
        <Pastilla tono="bosqueRelleno" icono={<IconoCirculoCheck className="size-4" />}>
          Leída
        </Pastilla>
      );
    case "enCurso":
      return (
        <Pastilla tono="bosque" icono={<IconoCirculoPunto className="size-4" />}>
          En curso
        </Pastilla>
      );
    case "disponible":
      return (
        <>
          <Pastilla tono="bosque" icono={<IconoCirculoPunto className="size-4" />}>
            Disponible
          </Pastilla>
          {leccion.nueva ? (
            <Pastilla tono="bosque" icono={<span aria-hidden="true" className="size-1.5 rounded-full border-[1.5px] border-marca-bosque" />}>
              Nueva
            </Pastilla>
          ) : null}
        </>
      );
    default:
      return (
        <Pastilla tono="tenue" icono={<IconoCandado className="size-4" />}>
          Bloqueado
        </Pastilla>
      );
  }
}

const clasesPorEstado: Record<ResumenLeccion["estado"], string> = {
  completado: "bg-superficie-elevada p-5 shadow-relieve md:p-7",
  disponible: "bg-superficie-elevada p-5 shadow-relieve md:p-7",
  // La lección que se está leyendo lleva un borde bosque de 2 px; el relleno baja a 26 px para no mover el contenido.
  enCurso: "border-2 border-marca-bosque bg-superficie-elevada p-[18px] shadow-relieve md:p-[26px]",
  bloqueado: "bg-superficie-hundida p-5 shadow-hundido md:p-7",
};

type PropsTarjetaLeccion = {
  leccion: ResumenLeccion;
  moduloSlug: string;
  cursoSlug: string;
  /** Avance del curso: la nota de una lección nueva dice que el curso sigue igual. */
  avanceDelCurso: number;
};

/**
 * Tarjeta de una lección en SCR-08 (Figma «Curso»): número, estado, título y nota; el botón para leerla y, debajo, las
 * filas de su actividad y sus casos. Leída, en curso, disponible (con o sin «Nueva») o bloqueada.
 */
export function TarjetaLeccion({ leccion, moduloSlug, cursoSlug, avanceDelCurso }: PropsTarjetaLeccion) {
  const bloqueada = leccion.estado === "bloqueado";
  const idTitulo = `leccion-${leccion.slug}`;
  const href = `/modulos/${moduloSlug}/${cursoSlug}/${leccion.slug}`;
  const hayActividad = leccion.evaluables.some((e) => e.tipo === "actividad");
  let casos = 0;
  const filas = bloqueada
    ? []
    : leccion.evaluables.map((evaluable) => {
        if (evaluable.tipo === "caso") casos += 1;
        return { evaluable, numeroDeCaso: evaluable.tipo === "caso" ? casos : 0 };
      });

  return (
    <article aria-labelledby={idTitulo} className={`rounded-tarjeta ${clasesPorEstado[leccion.estado]}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Numero orden={leccion.orden} estado={leccion.estado} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-detalle font-bold text-texto-secundario">Lección {leccion.orden}</p>
              <Estados leccion={leccion} />
            </div>
            <h3 id={idTitulo} className="font-titulo text-[1.375rem] leading-[1.25] font-extrabold tracking-[-0.006em] text-marca-cafe">
              {leccion.titulo}
            </h3>
            <p className="text-detalle text-texto-secundario">
              <Nota leccion={leccion} avanceDelCurso={avanceDelCurso} />
            </p>
          </div>
        </div>
        {leccion.estado === "enCurso" || leccion.estado === "disponible" ? (
          <Boton variante="cafe" tamano="mediano" href={href} className="max-md:w-full">
            {leccion.estado === "enCurso" ? "Continuar lectura" : "Leer lección"}
          </Boton>
        ) : null}
      </div>

      {filas.length > 0 ? (
        <ul aria-label={`Actividad y casos de la lección ${leccion.orden}`} className="mt-5 flex flex-col gap-2 md:mr-6 md:ml-16">
          {filas.map(({ evaluable, numeroDeCaso }) => (
            <li key={evaluable.id}>
              <FilaEvaluable
                evaluable={evaluable}
                numeroDeCaso={numeroDeCaso}
                hayActividad={hayActividad}
                leccionEnCurso={leccion.estado === "enCurso"}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
