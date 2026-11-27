import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ErrorDePantalla } from "@/componentes/estructura/ErrorDePantalla";
import { Alerta } from "@/componentes/ui/Alerta";
import { Boton } from "@/componentes/ui/Boton";
import { Migas } from "@/componentes/ui/Migas";
import { Pastilla } from "@/componentes/ui/Pastilla";
import { IconoCasilla, IconoCirculoCheck, IconoCirculoPunto, IconoDilema, IconoLista } from "@/componentes/ui/iconos/iconos";
import { formatearFecha } from "@/lib/fechas";
import { analizarMarkdown } from "@/lib/markdown/analizar";
import { dibujarBloques } from "@/lib/markdown/renderizar";
import { cargarCurso, cargarLeccion, cargarModulo } from "../datos/modulos";
import { AvanceDeLeccion, TerminarLeccion } from "./AvanceDeLeccion";

type Consulta = { [llave: string]: string | string[] | undefined };

export function LeccionCargando() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-8">
      <div className="h-5 w-96 max-w-full rounded-full bg-superficie-hundida" />
      <div className="h-[150px] rounded-hero bg-marca-cafe/90" />
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="h-[300px] rounded-tarjeta bg-superficie-hundida max-lg:hidden" />
        <div className="h-[600px] rounded-tarjeta bg-superficie-hundida" />
      </div>
    </div>
  );
}

/** Sección pedida en `?seccion=` si es válida; si no, la última que vio el alumno (retomar). */
function seccionPedida(consulta: Consulta, total: number): number | null {
  const valor = Number(Array.isArray(consulta.seccion) ? consulta.seccion[0] : consulta.seccion);
  return Number.isInteger(valor) && valor >= 1 && valor <= total ? valor : null;
}

/**
 * Contenido de SCR-09 · Lección. Se muestra una sección a la vez; las demás están en la lista «Secciones» (en móvil,
 * plegada). Al abrir una sección se guarda como vista (OP-19, AvanceDeLeccion). En la última, si no se ha terminado,
 * «Terminé la lección» (OP-20) abre la actividad.
 */
export async function Leccion({
  params,
  searchParams,
}: {
  params: Promise<{ modulo: string; curso: string; leccion: string }>;
  searchParams: Promise<Consulta>;
}) {
  const [{ modulo: moduloSlug, curso: cursoSlug, leccion: leccionSlug }, consulta] = await Promise.all([params, searchParams]);
  const [resultado, curso, modulo] = await Promise.all([cargarLeccion(leccionSlug), cargarCurso(cursoSlug), cargarModulo(moduloSlug)]);

  if (!resultado.ok && resultado.error.estado === 401) return null;
  if (!resultado.ok && resultado.error.estado === 404) notFound();
  if (!resultado.ok) {
    return (
      <ErrorDePantalla
        titulo="No pudimos abrir esta lección"
        error={resultado.error}
        migas={[{ texto: "Módulos", href: "/modulos" }]}
        salida={{ texto: "Volver al curso", href: `/modulos/${moduloSlug}/${cursoSlug}` }}
      />
    );
  }

  const leccion = resultado.datos;
  if (leccion.curso.slug !== cursoSlug || leccion.modulo.slug !== moduloSlug) notFound();

  const total = leccion.secciones.length;
  const pedida = seccionPedida(consulta, total);
  const actual = pedida ?? Math.min(Math.max(leccion.ultimaSeccion, 1), total);
  const seccion = leccion.secciones[actual - 1];
  const terminada = leccion.terminadaEn !== null;
  const retomando = pedida === null && !terminada && leccion.ultimaSeccion > 1;
  const base = `/modulos/${moduloSlug}/${cursoSlug}/${leccionSlug}`;

  const enCurso = curso.ok ? curso.datos.lecciones.find((l) => l.slug === leccion.slug) : undefined;
  const cursoOrden = modulo.ok ? modulo.datos.cursos.find((c) => c.slug === cursoSlug)?.orden : null;
  const ubicacion = [
    cursoOrden ? `Curso ${cursoOrden}` : null,
    enCurso && curso.ok ? `Lección ${enCurso.orden} de ${curso.datos.lecciones.length}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <Migas
        elementos={[
          { texto: "Módulos", href: "/modulos" },
          { texto: leccion.modulo.titulo, href: `/modulos/${moduloSlug}` },
          { texto: leccion.curso.titulo, href: `/modulos/${moduloSlug}/${cursoSlug}` },
          { texto: leccion.titulo },
        ]}
      />

      {retomando ? (
        <Alerta tono="correo" role="status" titulo="Retomamos donde te quedaste" className="mt-6">
          Vas en la sección {actual} de {total}. Tu lectura se guarda cada vez que cambias de sección.
        </Alerta>
      ) : null}
      {terminada && leccion.terminadaEn ? (
        <Alerta tono="aviso" role="status" titulo="Ya terminaste esta lección" className="mt-6">
          La terminaste el {formatearFecha(leccion.terminadaEn)}. Puedes volver a leerla cuando quieras.
        </Alerta>
      ) : null}

      <section
        aria-labelledby="titulo-leccion"
        data-fondo="oscuro"
        className="mt-6 flex flex-col gap-6 rounded-hero bg-marca-cafe px-6 py-7 shadow-hero md:flex-row md:items-center md:justify-between md:px-7"
      >
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            {ubicacion ? <p className="font-titulo text-menor font-semibold text-marca-menta">{ubicacion}</p> : null}
            {terminada ? (
              <Pastilla tono="bosqueRelleno" icono={<IconoCirculoCheck className="size-4" />}>
                Leída
              </Pastilla>
            ) : (
              <Pastilla sobreOscuro tono="bosque" icono={<IconoCirculoPunto className="size-4" />}>
                En curso
              </Pastilla>
            )}
          </div>
          <h1 id="titulo-leccion" className="font-titulo text-entrada font-extrabold text-marca-crema">
            {leccion.titulo}
          </h1>
        </div>
        <div className="flex shrink-0 flex-col gap-2.5 md:items-end">
          <div aria-hidden="true" className="flex gap-1.5">
            {leccion.secciones.map((s) => (
              <span key={s.orden} className={`h-1.5 w-11 rounded-full ${s.orden <= actual ? "bg-marca-menta" : "bg-marca-crema/18"}`} />
            ))}
          </div>
          <p className="font-titulo text-detalle font-bold text-marca-crema">
            Sección {actual} de {total} · {seccion.titulo}
          </p>
        </div>
      </section>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <ListaDeSecciones base={base} secciones={leccion.secciones} actual={actual} vistaHasta={terminada ? total : leccion.ultimaSeccion} />

        <article aria-labelledby="titulo-seccion" className="rounded-tarjeta bg-superficie-elevada p-6 shadow-relieve md:p-10">
          <h2 id="titulo-seccion" className="font-titulo text-elemento font-extrabold text-marca-cafe">
            {seccion.titulo}
          </h2>
          <div className="mt-5 flex flex-col gap-4 text-cuerpo text-marca-cafe [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6">
            {dibujarBloques(analizarMarkdown(seccion.cuerpo), {
              prefijo: `seccion-${seccion.orden}`,
              tituloDeSeccion: seccion.titulo,
              iconoDeCasilla: <IconoCasilla className="size-5" />,
            })}
          </div>
          {seccion.imagen ? (
            <figure className="mt-6 flex flex-col gap-2">
              <Image
                src={seccion.imagen.ruta}
                alt={seccion.imagen.textoAlternativo}
                width={940}
                height={520}
                sizes="(min-width: 1024px) 860px, 100vw"
                className="h-auto max-h-[480px] w-full rounded-globo bg-superficie-hundida object-contain"
              />
              {seccion.imagen.pie ? <figcaption className="text-detalle text-texto-secundario">{seccion.imagen.pie}</figcaption> : null}
            </figure>
          ) : null}

          <AvanceDeLeccion leccion={leccion.slug} seccion={actual} />

          <div className="mt-8 border-t border-marca-cafe/14 pt-6">
            {actual === total && !terminada ? (
              <div className="mb-5 flex flex-col gap-1">
                <h3 className="font-titulo text-tarjeta font-extrabold text-marca-cafe">¿Terminaste de leer?</h3>
                <p className="text-detalle text-texto-secundario">
                  Al marcarla como terminada se abre la actividad de la lección. Podrás volver a leerla cuando quieras.
                </p>
              </div>
            ) : null}
            <nav aria-label="Secciones" className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              {actual > 1 ? (
                <Boton variante="contornoClaro" tamano="mediano" href={`${base}?seccion=${actual - 1}`}>
                  Anterior: {leccion.secciones[actual - 2].titulo}
                </Boton>
              ) : (
                <span />
              )}
              {actual < total ? (
                <Boton variante="cafe" tamano="mediano" href={`${base}?seccion=${actual + 1}`}>
                  Siguiente: {leccion.secciones[actual].titulo}
                </Boton>
              ) : terminada ? (
                <Boton variante="cafe" tamano="mediano" href={`/modulos/${moduloSlug}/${cursoSlug}`}>
                  Volver al curso
                </Boton>
              ) : (
                <TerminarLeccion leccion={leccion.slug} />
              )}
            </nav>
          </div>
        </article>
      </div>

      {terminada && leccion.evaluables.length > 0 ? (
        <section aria-labelledby="titulo-practica" className="mt-8">
          <h2 id="titulo-practica" className="font-titulo text-tarjeta font-extrabold text-marca-cafe">
            Practica lo que leíste
          </h2>
          <ul className="mt-4 flex flex-col gap-2">
            {leccion.evaluables.map((evaluable) => {
              const Icono = evaluable.tipo === "actividad" ? IconoLista : IconoDilema;
              const texto = evaluable.tipo === "actividad" ? "Actividad de la lección" : evaluable.titulo;
              return (
                <li key={evaluable.id}>
                  {evaluable.estado === "bloqueado" ? (
                    <p className="flex items-center gap-3 rounded-fila bg-superficie-hundida px-5 py-3.5 text-texto-secundario">
                      <Icono className="size-[22px] shrink-0" />
                      {texto} · se abre después de lo anterior
                    </p>
                  ) : (
                    <Link
                      href={`/actividades/${evaluable.id}`}
                      className="flex items-center gap-3 rounded-fila bg-superficie-elevada px-5 py-3.5 font-titulo font-bold text-marca-cafe shadow-relieve hover:bg-superficie-hundida"
                    >
                      <Icono className="size-[22px] shrink-0 text-marca-bosque" />
                      {texto}
                      {evaluable.estado === "enviado" ? <span className="ml-auto text-detalle font-semibold text-texto-secundario">Enviado</span> : null}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </>
  );
}

/** Lista de secciones: a un lado en escritorio y plegada (`<details>`) en móvil. */
function ListaDeSecciones({
  base,
  secciones,
  actual,
  vistaHasta,
}: {
  base: string;
  secciones: { orden: number; titulo: string }[];
  actual: number;
  vistaHasta: number;
}) {
  const lista = (
    <ol className="flex flex-col gap-1">
      {secciones.map((s) => {
        const esActual = s.orden === actual;
        const leida = s.orden <= vistaHasta && !esActual;
        return (
          <li key={s.orden}>
            <Link
              href={`${base}?seccion=${s.orden}`}
              aria-current={esActual ? "step" : undefined}
              className={[
                "flex min-h-11 items-start gap-3 rounded-[10px] px-3 py-2",
                esActual ? "bg-marca-cafe text-marca-crema" : "text-marca-cafe hover:bg-superficie-hundida",
              ].join(" ")}
            >
              {leida ? (
                <IconoCirculoCheck className="mt-0.5 size-[18px] shrink-0 text-marca-bosque" />
              ) : (
                <IconoCirculoPunto className={`mt-0.5 size-[18px] shrink-0 ${esActual ? "text-marca-menta" : "text-marca-cafe/50"}`} />
              )}
              <span className="flex flex-col">
                <span className="font-titulo text-menor font-semibold">{s.titulo}</span>
                <span className={`text-nota ${esActual ? "text-marca-crema/85" : "text-texto-secundario"}`}>
                  {esActual ? "Leyendo" : leida ? "Leída" : "Por leer"}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
  return (
    <>
      <nav aria-label="Secciones de la lección" className="rounded-tarjeta bg-superficie-elevada p-4 shadow-relieve max-lg:hidden">
        <p className="mb-2 px-3 font-titulo text-cuerpo font-extrabold text-marca-cafe">Secciones</p>
        {lista}
      </nav>
      <details className="rounded-tarjeta bg-superficie-elevada shadow-relieve lg:hidden">
        <summary className="flex min-h-12 cursor-pointer items-center px-5 font-titulo text-menor font-bold text-marca-cafe">
          Secciones de la lección
        </summary>
        <nav aria-label="Secciones de la lección" className="px-3 pb-3">
          {lista}
        </nav>
      </details>
    </>
  );
}
