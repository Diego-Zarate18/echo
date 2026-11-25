import { Suspense } from "react";
import { Boton } from "@/componentes/ui/Boton";
import { Pastilla } from "@/componentes/ui/Pastilla";
import { IconoBirrete, IconoCandado, IconoCirculoPunto, IconoInsignia, IconoReloj } from "@/componentes/ui/iconos/iconos";
import { formatearFecha, formatearHora, formatearPorcentaje } from "@/lib/fechas";
import { cargarPortadaExamen, type ResumenExamen } from "../datos/modulos";

/** Lo que sale de la portada del examen y el resumen del curso no trae. `null` mientras llega o si falla. */
type Portada = {
  preguntas: number;
  calificacionMinima: number;
  /** El mejor intento aprobado, para «Aprobaste con 90 %». */
  aprobado: { calificacion: number; enviadoEn: string } | null;
} | null;

const minutos = (n: number) => (n === 1 ? "1 minuto" : `${n} minutos`);

/** Título y línea de apoyo de cada estado (Figma «Estados del examen», OP-17, C-05). */
function textos(examen: ResumenExamen, totalLecciones: number, portada: Portada) {
  const datos = portada ? `${portada.preguntas} preguntas · calificación mínima ${formatearPorcentaje(portada.calificacionMinima)}` : null;
  switch (examen.estado) {
    case "bloqueado":
      return {
        titulo: datos ?? examen.titulo,
        apoyo: `Se desbloquea al leer las ${totalLecciones} lecciones y enviar sus actividades y casos.`,
      };
    case "disponible":
      return { titulo: "Listo para presentar", apoyo: datos ? `${datos} · sin cronómetro` : "Sin cronómetro" };
    case "enCurso":
      // El contrato no dice cuántas preguntas lleva respondidas: solo que el intento sigue abierto.
      return {
        titulo: "Tienes un intento a medias",
        apoyo: `${portada ? `${portada.preguntas} preguntas · ` : ""}tus respuestas están guardadas`,
      };
    case "enEspera": {
      const hora = examen.disponibleEn ? formatearHora(examen.disponibleEn) : "";
      const faltan =
        examen.minutosRestantes === null ? "Faltan unos minutos" : examen.minutosRestantes === 1 ? "Falta 1 minuto" : `Faltan ${minutos(examen.minutosRestantes)}`;
      return {
        titulo: hora ? `Podrás intentarlo de nuevo a las ${hora}` : "Podrás intentarlo de nuevo en unos minutos",
        apoyo: `${faltan} · mientras, repasa las lecciones sugeridas`,
      };
    }
    case "aprobado": {
      const a = portada?.aprobado;
      const cuando = a ? `${formatearFecha(a.enviadoEn)} · ${formatearHora(a.enviadoEn)} · ` : "";
      return {
        titulo: a ? `Aprobaste con ${formatearPorcentaje(a.calificacion)}` : "Aprobaste este examen",
        apoyo: `${cuando}Un examen aprobado ya no se repite.`,
      };
    }
  }
}

function Estado({ estado, sobreOscuro }: { estado: ResumenExamen["estado"]; sobreOscuro: boolean }) {
  switch (estado) {
    case "disponible":
      return <Pastilla sobreOscuro={sobreOscuro} tono="bosque" icono={<IconoCirculoPunto className="size-4" />}>Disponible</Pastilla>;
    case "enCurso":
      return <Pastilla sobreOscuro={sobreOscuro} tono="bosque" icono={<IconoCirculoPunto className="size-4" />}>En curso</Pastilla>;
    case "enEspera":
      return (
        <Pastilla sobreOscuro={sobreOscuro} tono="terracota" icono={<IconoReloj className="size-4 text-marca-terracota" />}>
          En espera
        </Pastilla>
      );
    case "aprobado":
      return <Pastilla tono="bosqueRelleno" icono={<IconoInsignia className="size-4" />}>Aprobado</Pastilla>;
    default:
      return <Pastilla tono="tenue" icono={<IconoCandado className="size-4" />}>Bloqueado</Pastilla>;
  }
}

type PropsTarjetaExamen = { examen: ResumenExamen; totalLecciones: number; portada: Portada };

/**
 * Tarjeta del examen del curso en SCR-08. Bloqueado (hundida) y aprobado (clara) son silenciosas; disponible, en curso y
 * en espera van sobre café, y las dos primeras llevan el botón que abre la portada del examen (`/examenes/[id]`).
 */
export function TarjetaExamen({ examen, totalLecciones, portada }: PropsTarjetaExamen) {
  const { titulo, apoyo } = textos(examen, totalLecciones, portada);
  const oscura = examen.estado === "disponible" || examen.estado === "enCurso" || examen.estado === "enEspera";
  const idTitulo = `examen-${examen.id}`;
  const conBoton = examen.estado === "disponible" || examen.estado === "enCurso";

  return (
    <article
      aria-labelledby={idTitulo}
      data-fondo={oscura ? "oscuro" : undefined}
      className={[
        "flex flex-col gap-4 rounded-tarjeta px-5 py-6 md:flex-row md:px-7 md:py-6.5 md:items-center",
        oscura ? "bg-marca-cafe text-marca-crema" : examen.estado === "bloqueado" ? "bg-superficie-hundida shadow-hundido" : "bg-superficie-elevada shadow-relieve",
      ].join(" ")}
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <span
          aria-hidden="true"
          className={[
            "flex size-14 shrink-0 items-center justify-center rounded-full",
            oscura ? "bg-marca-crema/12 text-marca-menta" : examen.estado === "aprobado" ? "bg-superficie-hundida text-marca-bosque" : "text-texto-secundario",
          ].join(" ")}
        >
          {examen.estado === "bloqueado" ? <IconoCandado className="size-6" /> : <IconoBirrete className="size-6" />}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className={`text-detalle font-bold ${oscura ? "text-marca-crema" : "text-marca-cafe"}`}>Examen del curso</p>
            <Estado estado={examen.estado} sobreOscuro={oscura} />
          </div>
          <h3 id={idTitulo} className={`font-titulo text-[1.375rem] leading-[1.25] font-extrabold tracking-[-0.006em] ${oscura ? "text-marca-crema" : "text-marca-cafe"}`}>
            {titulo}
          </h3>
          <p className={`text-detalle ${oscura ? "text-marca-crema/85" : "text-texto-secundario"}`}>{apoyo}</p>
        </div>
      </div>
      {conBoton ? (
        <Boton variante="crema" conFlecha href={`/examenes/${examen.id}`} className="max-md:w-full">
          {examen.estado === "enCurso" ? "Continuar examen" : "Ver examen"}
        </Boton>
      ) : null}
    </article>
  );
}

/** Pide la portada del examen para completar el texto (preguntas, calificación mínima, nota aprobada). */
async function ConPortada({ examen, totalLecciones }: Omit<PropsTarjetaExamen, "portada">) {
  const resultado = await cargarPortadaExamen(examen.id);
  const portada: Portada = resultado.ok
    ? {
        preguntas: resultado.datos.numeroPreguntas,
        calificacionMinima: resultado.datos.calificacionMinima,
        aprobado:
          resultado.datos.intentosPrevios
            .filter((intento) => intento.aprobado)
            .sort((a, b) => b.calificacion - a.calificacion)
            .map(({ calificacion, enviadoEn }) => ({ calificacion, enviadoEn }))[0] ?? null,
      }
    : null;
  return <TarjetaExamen examen={examen} totalLecciones={totalLecciones} portada={portada} />;
}

/** La tarjeta ya está en su lugar con lo que trae el curso; el resto llega después sin que nada se mueva. */
export function TarjetaExamenDelCurso({ examen, totalLecciones }: Omit<PropsTarjetaExamen, "portada">) {
  return (
    <Suspense fallback={<TarjetaExamen examen={examen} totalLecciones={totalLecciones} portada={null} />}>
      <ConPortada examen={examen} totalLecciones={totalLecciones} />
    </Suspense>
  );
}
