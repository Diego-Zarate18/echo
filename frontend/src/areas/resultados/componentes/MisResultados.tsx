import Link from "next/link";
import { ErrorDePantalla } from "@/componentes/estructura/ErrorDePantalla";
import { Boton } from "@/componentes/ui/Boton";
import { IconoCirculoCheck } from "@/componentes/ui/iconos/iconos";
import { apiServidor } from "@/lib/api/servidor";
import type { components } from "@/lib/api/esquema";
import { formatearFecha, formatearHora, formatearPorcentaje } from "@/lib/fechas";

type ResultadoIntento = components["schemas"]["ResultadoIntento"];
type Tipo = ResultadoIntento["tipo"];

const TIPOS: Record<Tipo, string> = { actividad: "Actividad", caso: "Caso práctico", examen: "Examen" };
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** El filtro se escribe como DD/MM/AAAA (o llega AAAA-MM-DD en un enlace) y se manda como AAAA-MM-DD, solo si el día existe. */
function diaDeFiltro(valor: string): string {
  const dma = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(valor.trim());
  const iso = dma ? `${dma[3]}-${dma[2].padStart(2, "0")}-${dma[1].padStart(2, "0")}` : valor.trim();
  if (!FECHA.test(iso)) return "";
  const dia = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(dia.getTime()) && dia.toISOString().startsWith(iso) ? iso : "";
}
const aDiaMesAnio = (iso: string) => (iso ? iso.split("-").reverse().join("/") : "");

export function MisResultadosCargando() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div className="h-12 w-72 rounded-fila bg-superficie-hundida" />
      <div className="h-[120px] rounded-tarjeta bg-superficie-hundida" />
      <div className="h-[360px] rounded-tarjeta bg-superficie-hundida" />
    </div>
  );
}

/** En un caso la calificación dice qué tan buena fue la decisión (100 óptima, >0 aceptable, 0 riesgosa). */
function Calificacion({ resultado: { tipo, calificacion } }: { resultado: ResultadoIntento }) {
  if (tipo !== "caso") return <span className="font-titulo font-extrabold">{formatearPorcentaje(calificacion)}</span>;
  const [texto, color] =
    calificacion === 100
      ? ["Decisión óptima", "border-marca-bosque text-marca-bosque"]
      : calificacion > 0
        ? ["Decisión aceptable", "border-marca-cafe text-marca-cafe"]
        : ["Decisión riesgosa", "border-estado-riesgosa text-estado-riesgosa"];
  return <span className={`inline-flex min-h-8 items-center rounded-full border-[1.5px] px-3 font-titulo text-detalle font-bold whitespace-nowrap ${color}`}>{texto}</span>;
}

/** «Intento N» y, debajo, si es el que cuenta: el mejor en actividades y exámenes, el primero en casos (C-08). */
function Intento({ resultado }: { resultado: ResultadoIntento }) {
  return (
    <span className="flex flex-col gap-0.5">
      <span>Intento {resultado.numero}</span>
      {resultado.destacado ? (
        <span className="inline-flex items-center gap-1 text-detalle font-bold text-marca-bosque">
          <IconoCirculoCheck className="size-4" />
          {resultado.tipo === "caso" ? "Cuenta el primero" : "Mejor intento"}
        </span>
      ) : null}
    </span>
  );
}

const claseSelector =
  "h-12 w-full rounded-fila border-[1.5px] border-texto-secundario bg-superficie-elevada px-3 text-menor text-marca-cafe focus-visible:border-marca-bosque focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-marca-bosque";

/**
 * Contenido de SCR-15. Los filtros son un formulario GET: funcionan sin JavaScript y la URL se puede compartir o recargar.
 * Valores que no cumplen el contrato se ignoran en vez de mandar un 422.
 */
export async function MisResultados({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const crudos = await searchParams;
  const leer = (llave: string) => (typeof crudos[llave] === "string" ? (crudos[llave] as string) : "");
  const modulo = SLUG.test(leer("modulo")) ? leer("modulo") : "";
  const tipo = leer("tipo") in TIPOS ? (leer("tipo") as Tipo) : "";
  const desde = diaDeFiltro(leer("desde"));
  const hasta = diaDeFiltro(leer("hasta"));
  const hayFiltros = Boolean(modulo || tipo || desde || hasta);

  const [resultado, modulos] = await Promise.all([
    apiServidor.listarResultados({ consulta: { modulo: modulo || undefined, tipo: tipo || undefined, desde: desde || undefined, hasta: hasta || undefined } }),
    apiServidor.listarModulos(),
  ]);
  if (!resultado.ok && resultado.error.estado === 401) return null;
  if (!resultado.ok) {
    return <ErrorDePantalla titulo="No pudimos cargar tus resultados" error={resultado.error} salida={{ texto: "Ir a Módulos", href: "/modulos" }} />;
  }
  const { resultados } = resultado.datos;
  const opcionesModulo = modulos.ok ? modulos.datos.modulos : [];

  if (!hayFiltros && resultados.length === 0) {
    return (
      <>
        <h1 className="font-titulo text-entrada font-extrabold text-marca-cafe">Mis resultados</h1>
        <section className="mt-8 flex flex-col items-start gap-4 rounded-tarjeta bg-superficie-elevada p-8 shadow-relieve">
          <h2 className="font-titulo text-tarjeta font-extrabold text-marca-cafe">Todavía no tienes resultados</h2>
          <p className="max-w-[560px] text-cuerpo text-marca-cafe">Aquí verás cada actividad, caso práctico y examen que envíes, con su calificación y la fecha.</p>
          <Boton variante="cafe" href="/modulos">Ir a Módulos</Boton>
        </section>
      </>
    );
  }

  return (
    <>
      <h1 className="font-titulo text-entrada font-extrabold text-marca-cafe">Mis resultados</h1>
      <p className="mt-3 max-w-[800px] text-cuerpo text-marca-cafe">
        Todo lo que has enviado: actividades, casos prácticos y exámenes. Se marca tu mejor intento; en los casos cuenta el primero.
      </p>

      <form method="get" action="/mis-resultados" aria-label="Filtrar resultados" className="mt-8 grid gap-4 rounded-tarjeta bg-superficie-elevada p-5 shadow-relieve sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto] lg:items-end md:p-6">
        <label className="flex flex-col gap-2 text-detalle font-bold text-marca-cafe">
          Módulo
          <select name="modulo" defaultValue={modulo} className={claseSelector}>
            <option value="">Todos los módulos</option>
            {opcionesModulo.map((m) => (
              <option key={m.slug} value={m.slug}>{m.titulo}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-detalle font-bold text-marca-cafe">
          Tipo
          <select name="tipo" defaultValue={tipo} className={claseSelector}>
            <option value="">Todos los tipos</option>
            {(Object.keys(TIPOS) as Tipo[]).map((t) => (
              <option key={t} value={t}>{TIPOS[t]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-detalle font-bold text-marca-cafe">
          Desde<span className="sr-only"> (día, mes y año)</span>
          {/* Texto y no type="date": el selector nativo sigue el idioma del navegador (mm/dd/yyyy en inglés). */}
          <input type="text" inputMode="numeric" name="desde" placeholder="DD/MM/AAAA" autoComplete="off" maxLength={10} defaultValue={aDiaMesAnio(desde)} className={claseSelector} />
        </label>
        <label className="flex flex-col gap-2 text-detalle font-bold text-marca-cafe">
          Hasta<span className="sr-only"> (día, mes y año)</span>
          <input type="text" inputMode="numeric" name="hasta" placeholder="DD/MM/AAAA" autoComplete="off" maxLength={10} defaultValue={aDiaMesAnio(hasta)} className={claseSelector} />
        </label>
        <div className="flex flex-wrap gap-3 sm:col-span-2 lg:col-span-1">
          <button type="submit" className="inline-flex h-12 items-center rounded-full bg-marca-cafe px-6 font-titulo text-menor font-bold text-marca-crema focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-marca-bosque">
            Aplicar
          </button>
          {hayFiltros ? (
            <Link href="/mis-resultados" className="inline-flex h-12 items-center px-2 font-titulo text-menor font-bold text-marca-cafe underline underline-offset-4">
              Limpiar filtros
            </Link>
          ) : null}
        </div>
      </form>

      <p role="status" className="mt-6 text-detalle text-texto-secundario">
        {resultados.length === 1 ? "1 resultado" : `${resultados.length} resultados`}
        {hayFiltros ? " con estos filtros" : ""} · más recientes primero
      </p>

      {resultados.length === 0 ? (
        <section className="mt-4 flex flex-col items-start gap-3 rounded-tarjeta bg-superficie-elevada p-8 shadow-relieve">
          <h2 className="font-titulo text-tarjeta font-extrabold text-marca-cafe">Ningún resultado coincide</h2>
          <p className="text-cuerpo text-marca-cafe">Prueba con otro módulo, tipo o rango de fechas.</p>
          <Link href="/mis-resultados" className="inline-flex min-h-11 items-center font-titulo text-menor font-bold text-marca-cafe underline underline-offset-4">
            Limpiar filtros
          </Link>
        </section>
      ) : (
        <>
          <table className="mt-4 w-full overflow-hidden rounded-tarjeta bg-superficie-elevada text-left shadow-relieve max-md:hidden">
            <caption className="sr-only">Tus intentos enviados, del más reciente al más antiguo</caption>
            <thead className="bg-superficie-hundida text-detalle text-texto-secundario">
              <tr>
                {["Fecha", "Módulo", "Curso", "Tipo", "Título", "Calificación", "Intento"].map((columna) => (
                  <th key={columna} scope="col" className="px-4 py-3 font-bold">
                    {columna}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resultados.map((r) => (
                <tr key={r.intentoId} className="border-t border-marca-cafe/10 text-detalle text-marca-cafe">
                  <td className="px-4 py-4">
                    {formatearFecha(r.enviadoEn)} · {formatearHora(r.enviadoEn)}
                  </td>
                  <td className="px-4 py-4">{r.modulo.titulo}</td>
                  <td className="px-4 py-4">{r.curso.titulo}</td>
                  <td className="px-4 py-4">{TIPOS[r.tipo]}</td>
                  <td className="px-4 py-4">
                    {/* El título lleva al detalle (Figma 93:2714): sin columna aparte de «Ver detalle». */}
                    <Link href={`/mis-resultados/${r.intentoId}`} className="inline-flex min-h-11 items-center font-titulo font-bold underline underline-offset-4">
                      {r.titulo}
                      <span className="sr-only">, intento {r.numero}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-4">
                    <Calificacion resultado={r} />
                  </td>
                  <td className="px-4 py-4">
                    <Intento resultado={r} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="mt-4 flex flex-col gap-3 md:hidden">
            {resultados.map((r) => (
              <li key={r.intentoId}>
                <Link href={`/mis-resultados/${r.intentoId}`} className="flex flex-col gap-2 rounded-tarjeta bg-superficie-elevada p-5 text-marca-cafe shadow-relieve">
                  <span className="flex flex-wrap items-center justify-between gap-2 text-detalle text-texto-secundario">
                    <span>{TIPOS[r.tipo]}</span>
                    <span>{formatearFecha(r.enviadoEn)} · {formatearHora(r.enviadoEn)}</span>
                  </span>
                  <span className="font-titulo text-cuerpo font-extrabold">{r.titulo}</span>
                  <span className="text-detalle text-texto-secundario">{r.modulo.titulo} · {r.curso.titulo}</span>
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <Calificacion resultado={r} />
                    <Intento resultado={r} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-detalle text-texto-secundario">Abre el título de un intento para ver cada pregunta, tu respuesta y su retroalimentación.</p>
        </>
      )}
    </>
  );
}
