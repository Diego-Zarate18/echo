import Link from "next/link";
import { Moris } from "@/componentes/marca/Moris";
import { Estado } from "@/componentes/ui/Estado";
import { cargarModulo, type ResultadoBusqueda, type ResumenModulo } from "../datos/modulos";

const tipos = { modulo: "Módulo", curso: "Curso", leccion: "Lección" } as const;

type Enlaces = { cursos: Map<string, string>; lecciones: Map<string, string> };

/**
 * El resultado trae el título de lo que lo contiene, no su ruta. Para armar el enlace se busca ese título entre los
 * módulos y cursos que el alumno puede abrir (solo se leen los detalles si hay cursos o lecciones entre los resultados).
 */
async function armarEnlaces(resultados: ResultadoBusqueda[], modulos: ResumenModulo[]): Promise<Enlaces> {
  const enlaces: Enlaces = { cursos: new Map(), lecciones: new Map() };
  const necesitaCursos = resultados.some((r) => r.tipo !== "modulo");
  if (!necesitaCursos) return enlaces;

  const abiertos = modulos.filter((m) => m.estado !== "bloqueado");
  const detalles = await Promise.all(abiertos.map((m) => cargarModulo(m.slug)));
  detalles.forEach((detalle, indice) => {
    if (!detalle.ok) return;
    const modulo = abiertos[indice];
    enlaces.cursos.set(modulo.titulo, modulo.slug);
    for (const curso of detalle.datos.cursos) enlaces.lecciones.set(curso.titulo, `${modulo.slug}/${curso.slug}`);
  });
  return enlaces;
}

function rutaDe(resultado: ResultadoBusqueda, enlaces: Enlaces): string | null {
  if (resultado.estado === "bloqueado") return null;
  if (resultado.tipo === "modulo") return `/modulos/${resultado.slug}`;
  if (resultado.tipo === "curso") {
    const modulo = resultado.contexto ? enlaces.cursos.get(resultado.contexto) : undefined;
    return modulo ? `/modulos/${modulo}/${resultado.slug}` : null;
  }
  const curso = resultado.contexto ? enlaces.lecciones.get(resultado.contexto) : undefined;
  return curso ? `/modulos/${curso}/${resultado.slug}` : null;
}

function FilaResultado({ resultado, ruta }: { resultado: ResultadoBusqueda; ruta: string | null }) {
  const contenido = (
    <>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-detalle font-semibold text-texto-secundario">
          {tipos[resultado.tipo]}
          {resultado.contexto ? ` · ${resultado.contexto}` : ""}
        </span>
        <span className="font-titulo text-tarjeta font-extrabold text-marca-cafe">{resultado.titulo}</span>
      </span>
      <Estado estado={resultado.estado} className="shrink-0" />
    </>
  );
  const base = "flex items-center justify-between gap-4 rounded-tarjeta px-6 py-5 shadow-relieve";
  return ruta ? (
    <Link
      href={ruta}
      className={`${base} bg-superficie-elevada transition-[background-color] duration-150 ease-(--ease-respuesta) hover:bg-marca-crema`}
    >
      {contenido}
    </Link>
  ) : (
    <div className={`${base} bg-superficie-hundida`}>{contenido}</div>
  );
}

type PropsResultadosBusqueda = {
  consulta: string;
  resultados: ResultadoBusqueda[];
  modulos: ResumenModulo[];
};

/** Resultados de `?q=` en lugar de la lista de módulos. Sin coincidencias: Moris y la salida a todos los módulos. */
export async function ResultadosBusqueda({ consulta, resultados, modulos }: PropsResultadosBusqueda) {
  if (resultados.length === 0) {
    return (
      <section aria-labelledby="titulo-resultados" className="mt-10">
        <div className="flex flex-col items-center gap-4 rounded-tarjeta bg-superficie-elevada px-6 py-10 text-center shadow-relieve sm:flex-row sm:text-left">
          <Moris expresion="curioso" alt="" sizes="96px" className="w-24 shrink-0" />
          <div className="flex flex-col gap-2">
            <h2 id="titulo-resultados" className="font-titulo text-elemento font-extrabold text-marca-cafe">
              No encontramos resultados para «{consulta}»
            </h2>
            <p className="text-cuerpo text-texto-secundario">
              Prueba con otra palabra. Buscamos en los títulos y descripciones de módulos, cursos y lecciones.
            </p>
            <Link
              href="/modulos"
              className="inline-flex min-h-11 items-center font-titulo text-menor font-bold text-marca-cafe underline underline-offset-4 hover:decoration-2 max-sm:justify-center"
            >
              Ver todos los módulos
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const enlaces = await armarEnlaces(resultados, modulos);
  return (
    <section aria-labelledby="titulo-resultados" className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <h2 id="titulo-resultados" className="font-titulo text-[2rem] leading-[1.1] font-extrabold text-marca-cafe">
          {resultados.length === 1 ? "1 resultado" : `${resultados.length} resultados`} para «{consulta}»
        </h2>
        <Link
          href="/modulos"
          className="inline-flex min-h-11 items-center font-titulo text-menor font-bold text-marca-cafe underline underline-offset-4 hover:decoration-2"
        >
          Ver todos los módulos
        </Link>
      </div>
      <ul className="mt-6 flex flex-col gap-4">
        {resultados.map((resultado) => (
          <li key={`${resultado.tipo}-${resultado.slug}`}>
            <FilaResultado resultado={resultado} ruta={rutaDe(resultado, enlaces)} />
          </li>
        ))}
      </ul>
    </section>
  );
}
