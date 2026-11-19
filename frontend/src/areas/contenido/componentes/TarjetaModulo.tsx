import { Suspense } from "react";
import { Boton } from "@/componentes/ui/Boton";
import { BarraProgreso } from "@/componentes/ui/BarraProgreso";
import { Estado } from "@/componentes/ui/Estado";
import { Insignia } from "@/componentes/ui/Insignia";
import { IconoCandado } from "@/componentes/ui/iconos/iconos";
import { formatearFecha, formatearPorcentaje } from "@/lib/fechas";
import { cargarModulo, type ResumenModulo } from "../datos/modulos";

/** «Te faltan 2 cursos para la insignia». Lee el detalle del módulo; si falla, queda el porcentaje. */
async function CursosPendientes({ modulo }: { modulo: ResumenModulo }) {
  const detalle = await cargarModulo(modulo.slug);
  if (!detalle.ok) return <>Llevas {formatearPorcentaje(modulo.avance)} del módulo</>;
  const faltan = detalle.datos.cursos.filter((curso) => curso.estado !== "completado").length;
  if (faltan === 0) return <>Te falta terminar el módulo</>;
  return <>{faltan === 1 ? "Te falta 1 curso para la insignia" : `Te faltan ${faltan} cursos para la insignia`}</>;
}

function Nota({ modulo }: { modulo: ResumenModulo }) {
  if (modulo.estado === "completado") {
    const fecha = modulo.insignia?.obtenidaEn ? formatearFecha(modulo.insignia.obtenidaEn) : "";
    return <>{fecha ? `Insignia obtenida el ${fecha}` : "Insignia obtenida"}</>;
  }
  if (modulo.estado === "enCurso") {
    return (
      <Suspense fallback={<>Llevas {formatearPorcentaje(modulo.avance)} del módulo</>}>
        <CursosPendientes modulo={modulo} />
      </Suspense>
    );
  }
  return <>Aún no empiezas este módulo</>;
}

type PropsTarjetaModulo = {
  modulo: ResumenModulo;
  /** Todos los módulos: el requisito de uno bloqueado se escribe con el número del que falta completar. */
  modulos: ResumenModulo[];
};

/**
 * Tarjeta de un módulo en SCR-06: insignia, estado, título, descripción y, según el estado, el avance con su botón
 * o lo que falta para desbloquearlo. El botón de «Disponible» dice «Continuar módulo», como en Figma.
 */
export function TarjetaModulo({ modulo, modulos }: PropsTarjetaModulo) {
  const bloqueado = modulo.estado === "bloqueado";
  const idTitulo = `modulo-${modulo.slug}`;
  const requisito = modulo.requisito
    ? (modulos.find((otro) => otro.slug === modulo.requisito?.slug)?.orden ?? null)
    : null;
  const textoRequisito = modulo.requisito
    ? requisito
      ? `Completa el módulo ${requisito} para desbloquearlo.`
      : `Completa «${modulo.requisito.titulo}» para desbloquearlo.`
    : null;

  return (
    <article
      aria-labelledby={idTitulo}
      className={[
        "flex flex-col gap-5 rounded-tarjeta px-6 py-7 shadow-relieve md:flex-row md:items-center md:gap-7 md:py-7.5 md:pr-[60px] md:pl-8",
        bloqueado ? "bg-superficie-hundida" : "bg-superficie-elevada",
      ].join(" ")}
    >
      <Insignia orden={modulo.orden} obtenida={Boolean(modulo.insignia?.obtenidaEn)} />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-detalle font-semibold text-texto-secundario">Módulo {modulo.orden}</p>
          <Estado estado={modulo.estado} />
        </div>
        <h3 id={idTitulo} className="font-titulo text-[1.5625rem] leading-[1.2] font-extrabold text-marca-cafe">
          {modulo.titulo}
        </h3>
        <p className="text-menor text-texto-secundario">{modulo.descripcion}</p>
        {bloqueado && textoRequisito ? (
          <p className="mt-1 flex items-center gap-2 text-menor font-semibold text-marca-cafe">
            <IconoCandado className="size-[18px]" />
            {textoRequisito}
          </p>
        ) : null}
      </div>

      {bloqueado ? null : (
        <div className="flex w-full flex-col gap-3 md:w-[340px] md:items-end">
          <div className="flex w-full items-center gap-3 md:w-[322px]">
            <BarraProgreso valor={modulo.avance} etiqueta={`Avance del módulo ${modulo.orden}`} />
            <span className="min-w-[4ch] shrink-0 text-right font-titulo text-detalle font-bold whitespace-nowrap text-marca-cafe">
              {formatearPorcentaje(modulo.avance)}
            </span>
          </div>
          <p className="text-detalle text-texto-secundario md:text-right">
            <Nota modulo={modulo} />
          </p>
          <Boton
            variante={modulo.estado === "completado" ? "contornoClaro" : "cafe"}
            tamano="compacto"
            href={`/modulos/${modulo.slug}`}
            className="max-md:w-full md:w-[190px]"
          >
            {modulo.estado === "completado" ? "Repasar módulo" : "Continuar módulo"}
          </Boton>
        </div>
      )}
    </article>
  );
}
