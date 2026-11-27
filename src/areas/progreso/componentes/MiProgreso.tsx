import Link from "next/link";
import { ErrorDePantalla } from "@/componentes/estructura/ErrorDePantalla";
import { BarraProgreso } from "@/componentes/ui/BarraProgreso";
import { Estado } from "@/componentes/ui/Estado";
import { Insignia } from "@/componentes/ui/Insignia";
import { IconoCandado, IconoChevronAbajo, IconoChevronDerecha } from "@/componentes/ui/iconos/iconos";
import { apiServidor } from "@/lib/api/servidor";
import { formatearFecha, formatearPorcentaje } from "@/lib/fechas";

export function MiProgresoCargando() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-8">
      <div className="h-[240px] rounded-hero bg-marca-cafe/90" />
      <div className="h-[400px] rounded-tarjeta bg-superficie-hundida" />
    </div>
  );
}

const plural = (n: number, una: string, varias: string) => (n === 1 ? `1 ${una}` : `${n} ${varias}`);

/**
 * Contenido de SCR-14 · Mi progreso (OP-28). Cada módulo es un `<details>`: el que está en curso se abre solo y muestra
 * sus cursos. Las insignias van al final; las pendientes dicen cuántos cursos faltan.
 */
export async function MiProgreso() {
  const resultado = await apiServidor.obtenerProgreso();
  if (!resultado.ok && resultado.error.estado === 401) return null;
  if (!resultado.ok) {
    return <ErrorDePantalla titulo="No pudimos cargar tu progreso" error={resultado.error} salida={{ texto: "Ir a Módulos", href: "/modulos" }} />;
  }

  const { avanceGeneral, modulos, insignias } = resultado.datos;
  const obtenidas = insignias.filter((i) => i.insignia.obtenidaEn).length;
  const sinAvance = avanceGeneral === 0;

  return (
    <>
      <section
        aria-labelledby="titulo-progreso"
        data-fondo="oscuro"
        className="flex flex-col gap-6 rounded-hero bg-marca-cafe px-6 py-8 shadow-hero md:flex-row md:items-center md:justify-between md:px-10"
      >
        <div className="flex min-w-0 flex-col gap-3">
          <h1 id="titulo-progreso" className="font-titulo text-entrada font-extrabold text-marca-crema">Mi progreso</h1>
          <p className="max-w-[620px] text-cuerpo text-marca-crema/85">
            {sinAvance
              ? "Aún no tienes avance. Empieza por el primer módulo: cada lección leída, actividad enviada y examen aprobado suma."
              : "Tu avance general suma lecciones leídas, actividades y casos enviados y exámenes aprobados de todos los módulos."}
          </p>
          <div className="flex items-center gap-3">
            <BarraProgreso valor={avanceGeneral} etiqueta="Avance general" tono="oscuro" className="min-w-0 md:w-[480px] md:flex-none" />
            <span className="shrink-0 font-titulo text-detalle font-bold text-marca-crema">{formatearPorcentaje(avanceGeneral)}</span>
          </div>
          {sinAvance ? (
            <Link href="/modulos" className="mt-2 inline-flex min-h-11 w-fit items-center font-titulo text-menor font-bold text-marca-crema underline underline-offset-4 hover:decoration-2">
              Ir a Módulos
            </Link>
          ) : null}
        </div>
        <p aria-hidden="true" className="flex shrink-0 flex-col items-center rounded-panel border border-marca-crema/24 bg-marca-crema/8 px-8 py-5 text-marca-crema">
          <span className="font-titulo text-[2.5rem] leading-none font-extrabold">{formatearPorcentaje(avanceGeneral)}</span>
          <span className="mt-2 text-nota text-marca-crema/85">avance general</span>
        </p>
      </section>

      <section aria-labelledby="titulo-por-modulo" className="mt-10">
        <h2 id="titulo-por-modulo" className="font-titulo text-[2rem] leading-[1.1] font-extrabold text-marca-cafe">Avance por módulo</h2>
        <ol className="mt-6 overflow-hidden rounded-tarjeta bg-superficie-elevada shadow-relieve">
          {modulos.map((modulo, i) => {
            const bloqueado = modulo.estado === "bloqueado";
            return (
              <li key={modulo.slug} className="border-b border-marca-cafe/10 last:border-b-0">
                <details open={modulo.estado === "enCurso"} className="group">
                  <summary className="flex min-h-[72px] cursor-pointer list-none flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4 md:px-7">
                    <span
                      aria-hidden="true"
                      className={`flex size-10 shrink-0 items-center justify-center rounded-full font-titulo font-extrabold ${bloqueado ? "bg-superficie-hundida text-texto-secundario" : modulo.estado === "completado" ? "bg-marca-bosque text-marca-crema" : "bg-marca-cafe text-marca-crema"}`}
                    >
                      {bloqueado ? <IconoCandado className="size-[18px]" /> : i + 1}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-nota text-texto-secundario">Módulo {i + 1}</span>
                      <span className="font-titulo text-cuerpo font-extrabold text-marca-cafe">{modulo.titulo}</span>
                    </span>
                    <span className="flex items-center gap-3 max-md:w-full md:w-[240px]">
                      <BarraProgreso valor={modulo.avance} etiqueta={`Avance del módulo ${i + 1}`} />
                      <span className="shrink-0 font-titulo text-detalle font-bold text-marca-cafe">{formatearPorcentaje(modulo.avance)}</span>
                    </span>
                    <Estado estado={modulo.estado} />
                    <IconoChevronAbajo className="size-5 text-marca-cafe transition-[rotate] duration-200 ease-(--ease-respuesta) group-open:rotate-180" />
                  </summary>
                  <div className="flex flex-col gap-2 px-5 pb-5 md:pr-7 md:pl-[83px]">
                    {modulo.cursos.map((curso, j) => (
                      <div key={curso.slug} className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-fila bg-superficie-hundida px-4 py-3">
                        <span className="min-w-0 flex-1 text-detalle text-marca-cafe">
                          Curso {j + 1} · {curso.titulo}
                        </span>
                        <span className="flex items-center gap-3 max-md:w-full md:w-[220px]">
                          <BarraProgreso valor={curso.avance} etiqueta={`Avance del curso ${j + 1}`} />
                          <span className="shrink-0 font-titulo text-detalle font-bold text-marca-cafe">{formatearPorcentaje(curso.avance)}</span>
                        </span>
                        <Estado estado={curso.estado} />
                      </div>
                    ))}
                    {bloqueado ? null : (
                      <Link href={`/modulos/${modulo.slug}`} className="mt-1 inline-flex min-h-11 w-fit items-center gap-1 font-titulo text-detalle font-bold text-marca-cafe underline underline-offset-4">
                        Ir al módulo
                        <IconoChevronDerecha className="size-4" />
                      </Link>
                    )}
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="titulo-insignias" className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="titulo-insignias" className="font-titulo text-[2rem] leading-[1.1] font-extrabold text-marca-cafe">Insignias</h2>
          <p className="font-titulo text-detalle font-bold text-texto-secundario">
            {obtenidas} de {insignias.length} obtenidas
          </p>
        </div>
        <ul className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
          {insignias.map(({ modulo, insignia, cursosFaltantes }) => {
            const orden = modulos.findIndex((m) => m.slug === modulo.slug) + 1;
            const obtenida = Boolean(insignia.obtenidaEn);
            return (
              <li key={modulo.slug} className="flex flex-col items-center gap-2 text-center">
                <Insignia orden={orden || 1} obtenida={obtenida} tamano={96} />
                <span className="font-titulo text-detalle font-bold text-marca-cafe">{modulo.titulo}</span>
                <span className={`text-nota ${obtenida ? "text-marca-bosque" : "text-texto-secundario"}`}>
                  {obtenida && insignia.obtenidaEn
                    ? `Obtenida el ${formatearFecha(insignia.obtenidaEn)}`
                    : `Pendiente: te ${cursosFaltantes === 1 ? "falta" : "faltan"} ${plural(cursosFaltantes, "curso", "cursos")}`}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
