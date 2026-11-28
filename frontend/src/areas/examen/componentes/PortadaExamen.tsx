import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ErrorDePantalla } from "@/componentes/estructura/ErrorDePantalla";
import { Boton } from "@/componentes/ui/Boton";
import { Migas } from "@/componentes/ui/Migas";
import { Pastilla } from "@/componentes/ui/Pastilla";
import {
  IconoCirculoCheck,
  IconoCirculoPunto,
  IconoInsignia,
  IconoLibro,
  IconoLista,
  IconoReloj,
  IconoSinReloj,
  IconoBaseDeDatos,
} from "@/componentes/ui/iconos/iconos";
import { apiServidor } from "@/lib/api/servidor";
import { formatearFecha, formatearHora, formatearPorcentaje } from "@/lib/fechas";
import { cargarPortada, cargarUbicacion, idDeCuestionario } from "../datos";

export function PortadaExamenCargando() {
  return (
    <div aria-hidden="true" className="esqueleto flex flex-col gap-8">
      <div className="h-5 w-96 max-w-full rounded-full bg-superficie-hundida" />
      <div className="h-[260px] rounded-hero bg-marca-cafe/90" />
      <div className="h-[380px] rounded-tarjeta bg-superficie-hundida" />
    </div>
  );
}

const REGLAS: [ReactNode, string, string][] = [
  [<IconoSinReloj key="r" className="size-5" />, "No hay cronómetro", "Tómate el tiempo que necesites."],
  [<IconoBaseDeDatos key="g" className="size-5" />, "Cada respuesta se guarda al elegirla", "Si sales o pierdes la conexión, continúas donde te quedaste."],
  [<IconoLista key="l" className="size-5" />, "Responde todas las preguntas para enviar", "Puedes moverte entre preguntas y cambiar tus respuestas antes de enviar."],
  [<IconoReloj key="e" className="size-5" />, "Si no apruebas, espera 20 minutos", "Verás qué preguntas fallaste y qué lección repasar, sin las respuestas correctas."],
  [<IconoCirculoCheck key="a" className="size-5" />, "Si apruebas, el examen se cierra", "Completas el curso y ya no se puede repetir."],
];

/**
 * Contenido de SCR-11 · Examen: portada (OP-24). La acción principal cambia con el estado que calcula el servidor:
 * disponible («Empezar examen»), intento a medias («Continuar examen»), en espera (cuenta y lecciones para repasar) o
 * aprobado (ya no se repite, DEC-20). Un examen bloqueado responde 403.
 */
export async function PortadaExamen({ params }: { params: Promise<{ cuestionario: string }> }) {
  const id = idDeCuestionario((await params).cuestionario);
  const resultado = await cargarPortada(id);
  if (!resultado.ok && resultado.error.estado === 401) return null;
  if (!resultado.ok && resultado.error.estado === 404) notFound();
  if (!resultado.ok) {
    return (
      <ErrorDePantalla
        titulo="No pudimos abrir este examen"
        error={resultado.error}
        migas={[{ texto: "Módulos", href: "/modulos" }]}
        salida={{ texto: "Volver a Módulos", href: "/modulos" }}
      />
    );
  }

  const examen = resultado.datos;
  const ubicacion = await cargarUbicacion(examen.curso.slug);
  const rutaCurso = ubicacion?.rutaCurso ?? "/modulos";
  const previos = [...examen.intentosPrevios].sort((a, b) => b.numero - a.numero);

  // En espera: las lecciones a repasar salen del último intento (OP-30); si falla, solo se muestra la espera.
  let repaso: { slug: string; titulo: string }[] = [];
  if (examen.estado === "enEspera" && previos[0]) {
    const detalle = await apiServidor.obtenerDetalleIntento({ ruta: { intento: previos[0].id } });
    if (detalle.ok && detalle.datos.solucion === "oculta") {
      const vistas = new Map<string, string>();
      for (const p of detalle.datos.preguntas) if (!p.correcta && p.leccionRepaso) vistas.set(p.leccionRepaso.slug, p.leccionRepaso.titulo);
      repaso = [...vistas].map(([slug, titulo]) => ({ slug, titulo }));
    }
  }

  return (
    <>
      <Migas
        elementos={[
          { texto: "Módulos", href: "/modulos" },
          ...(ubicacion
            ? [
                { texto: ubicacion.modulo.titulo, href: ubicacion.rutaModulo },
                { texto: ubicacion.curso.titulo, href: rutaCurso },
              ]
            : []),
          { texto: "Examen" },
        ]}
      />

      <section
        aria-labelledby="titulo-examen"
        data-fondo="oscuro"
        className="mt-[33px] grid gap-8 rounded-hero bg-marca-cafe px-6 py-8 shadow-hero md:px-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
      >
        <div className="flex min-w-0 flex-col gap-3">
          <p className="font-titulo text-menor font-semibold text-marca-menta">Examen del curso · {examen.curso.titulo}</p>
          <h1 id="titulo-examen" className="font-titulo text-entrada font-extrabold text-marca-crema">
            {examen.titulo}
          </h1>
          <p className="max-w-[640px] text-cuerpo text-marca-crema/85">{examen.instrucciones}</p>
        </div>
        <dl className="grid grid-cols-3 gap-3 rounded-panel border border-marca-crema/24 bg-marca-crema/8 p-5 text-marca-crema">
          {[
            [String(examen.numeroPreguntas), "preguntas"],
            [formatearPorcentaje(examen.calificacionMinima), "calificación mínima"],
            [String(examen.intentosPrevios.length), examen.intentosPrevios.length === 1 ? "intento previo" : "intentos previos"],
          ].map(([valor, etiqueta]) => (
            <div key={etiqueta} className="flex flex-col">
              <dd className="order-1 font-titulo text-[1.75rem] font-extrabold">{valor}</dd>
              <dt className="order-2 text-nota text-marca-crema/85">{etiqueta}</dt>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <EstadoDelExamen examen={examen} rutaCurso={rutaCurso} repaso={repaso} rutaCursoSlug={ubicacion ? rutaCurso : null} />

        <section aria-labelledby="titulo-intentos" className="rounded-tarjeta bg-superficie-elevada p-6 shadow-relieve">
          <h2 id="titulo-intentos" className="font-titulo text-tarjeta font-extrabold text-marca-cafe">
            Intentos previos
          </h2>
          {previos.length ? (
            <ul className="mt-4 flex flex-col gap-2.5">
              {previos.map((intento) => (
                <li key={intento.id}>
                  <Link
                    href={`/mis-resultados/${intento.id}`}
                    className="flex items-center justify-between gap-4 rounded-fila bg-superficie-hundida px-4 py-3 transition-[background-color] duration-150 ease-(--ease-respuesta) hover:bg-superficie-hundida/70"
                  >
                    <span className="flex flex-col">
                      <span className="font-titulo text-menor font-bold text-marca-cafe">Intento {intento.numero}</span>
                      <span className="text-nota text-texto-secundario">
                        {formatearFecha(intento.enviadoEn)} · {formatearHora(intento.enviadoEn)}
                      </span>
                    </span>
                    <span className="flex flex-col items-end">
                      <span className="font-titulo text-cuerpo font-extrabold text-marca-cafe">{formatearPorcentaje(intento.calificacion)}</span>
                      <span className={`text-nota ${intento.aprobado ? "text-marca-bosque" : "text-texto-secundario"}`}>
                        {intento.aprobado ? "Aprobado" : "No aprobado"}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-detalle text-texto-secundario">Aún no has presentado este examen.</p>
          )}
        </section>
      </div>
    </>
  );
}

type PortadaDatos = Extract<Awaited<ReturnType<typeof cargarPortada>>, { ok: true }>["datos"];

function EstadoDelExamen({
  examen,
  rutaCurso,
  repaso,
  rutaCursoSlug,
}: {
  examen: PortadaDatos;
  rutaCurso: string;
  repaso: { slug: string; titulo: string }[];
  rutaCursoSlug: string | null;
}) {
  const resolver = `/examenes/${examen.id}/resolver`;

  if (examen.estado === "enCurso") {
    return (
      <Tarjeta pastilla={<Pastilla tono="bosque" icono={<IconoCirculoPunto className="size-4" />}>En curso</Pastilla>} titulo="Tienes un intento a medias">
        <p className="text-detalle text-texto-secundario">Tus respuestas están guardadas: continúas donde te quedaste.</p>
        <Acciones>
          <Boton variante="contornoClaro" tamano="mediano" href={rutaCurso}>Volver al curso</Boton>
          <Boton variante="cafe" tamano="mediano" href={resolver}>Continuar examen</Boton>
        </Acciones>
      </Tarjeta>
    );
  }

  if (examen.estado === "enEspera") {
    const hora = examen.disponibleEn ? formatearHora(examen.disponibleEn) : "";
    const minutos = examen.minutosRestantes;
    return (
      <Tarjeta
        pastilla={<Pastilla tono="terracota" icono={<IconoReloj className="size-4 text-marca-terracota" />}>En espera</Pastilla>}
        titulo={hora ? `Podrás intentarlo de nuevo a las ${hora}` : "Podrás intentarlo de nuevo en unos minutos"}
      >
        <p className="text-detalle text-texto-secundario">Mientras esperas, repasa las lecciones que te sugerimos.</p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {minutos !== null ? (
            <p className="flex w-fit flex-col items-center rounded-fila bg-marca-cafe px-6 py-3 text-marca-crema">
              <span className="font-titulo text-[1.75rem] font-extrabold">{minutos} min</span>
              <span className="text-nota">restantes</span>
            </p>
          ) : null}
          {repaso.length && rutaCursoSlug ? (
            <div className="flex flex-col gap-1.5">
              <p className="font-titulo text-detalle font-bold text-marca-cafe">Lecciones para repasar</p>
              {repaso.map((l) => (
                <Link key={l.slug} href={`${rutaCursoSlug}/${l.slug}`} className="flex items-center gap-2 text-detalle text-marca-cafe underline underline-offset-4 hover:decoration-2">
                  <IconoLibro className="size-[18px] text-marca-bosque" />
                  {l.titulo}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
        <Acciones>
          <Boton variante="contornoClaro" tamano="mediano" href={rutaCurso}>Volver al curso</Boton>
        </Acciones>
      </Tarjeta>
    );
  }

  if (examen.estado === "aprobado") {
    const mejor = [...examen.intentosPrevios].filter((i) => i.aprobado).sort((a, b) => b.calificacion - a.calificacion)[0];
    return (
      <Tarjeta
        pastilla={<Pastilla tono="bosqueRelleno" icono={<IconoInsignia className="size-4" />}>Aprobado</Pastilla>}
        titulo={mejor ? `Aprobaste con ${formatearPorcentaje(mejor.calificacion)}` : "Aprobaste este examen"}
      >
        <p className="text-detalle text-texto-secundario">
          {mejor ? `${formatearFecha(mejor.enviadoEn)} · ${formatearHora(mejor.enviadoEn)}. ` : ""}Un examen aprobado ya no se repite.
        </p>
        <Acciones>
          {mejor ? <Boton variante="contornoClaro" tamano="mediano" href={`/mis-resultados/${mejor.id}`}>Ver detalle del intento</Boton> : null}
          <Boton variante="cafe" tamano="mediano" href={rutaCurso}>Volver al curso</Boton>
        </Acciones>
      </Tarjeta>
    );
  }

  // Disponible: las reglas antes de empezar.
  return (
    <section aria-labelledby="titulo-reglas" className="rounded-tarjeta bg-superficie-elevada p-6 shadow-relieve md:p-7">
      <h2 id="titulo-reglas" className="font-titulo text-tarjeta font-extrabold text-marca-cafe">Antes de empezar</h2>
      <ul className="mt-5 flex flex-col gap-4">
        {REGLAS.map(([icono, titulo, texto]) => (
          <li key={titulo} className="flex items-start gap-3.5">
            <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-superficie-hundida text-marca-bosque">
              {icono}
            </span>
            <span className="flex flex-col">
              <span className="font-titulo text-cuerpo font-bold text-marca-cafe">{titulo}</span>
              <span className="text-detalle text-texto-secundario">{texto}</span>
            </span>
          </li>
        ))}
      </ul>
      <Acciones>
        <Boton variante="contornoClaro" tamano="mediano" href={rutaCurso}>Volver al curso</Boton>
        <Boton variante="cafe" tamano="mediano" href={resolver}>Empezar examen</Boton>
      </Acciones>
    </section>
  );
}

function Tarjeta({ pastilla, titulo, children }: { pastilla: ReactNode; titulo: string; children: ReactNode }) {
  return (
    <section aria-labelledby="titulo-estado" className="flex flex-col gap-3 rounded-tarjeta bg-superficie-elevada p-6 shadow-relieve md:p-7">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-detalle font-bold text-marca-cafe">Examen del curso</p>
        {pastilla}
      </div>
      <h2 id="titulo-estado" className="font-titulo text-elemento font-extrabold text-marca-cafe">{titulo}</h2>
      {children}
    </section>
  );
}

function Acciones({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex flex-col gap-3 border-t border-marca-cafe/14 pt-6 sm:flex-row sm:justify-between">{children}</div>;
}
