import { BarraProgreso } from "@/componentes/ui/BarraProgreso";
import { Insignia } from "@/componentes/ui/Insignia";
import { formatearFecha, formatearPorcentaje } from "@/lib/fechas";
import type { DetalleModulo } from "../datos/modulos";

type PropsPortadaModulo = {
  modulo: DetalleModulo;
  /** Posición del módulo (1 a 5) y cuántos hay: sale de la lista de módulos. */
  posicion: { orden: number; total: number } | null;
};

/**
 * Tarjeta café de SCR-07: «Módulo 2 de 5», título, descripción y avance a la izquierda; a la derecha, la insignia del
 * módulo (pendiente con candado u obtenida con su fecha).
 */
export function PortadaModulo({ modulo, posicion }: PropsPortadaModulo) {
  const obtenida = Boolean(modulo.insignia?.obtenidaEn);
  const faltan = modulo.cursos.filter((curso) => curso.estado !== "completado").length;
  const fecha = modulo.insignia?.obtenidaEn ? formatearFecha(modulo.insignia.obtenidaEn) : "";
  const pendiente = faltan === 1 ? "Pendiente: te falta 1 curso" : `Pendiente: te faltan ${faltan} cursos`;

  return (
    <section
      aria-labelledby="titulo-modulo"
      data-fondo="oscuro"
      className="grid items-center gap-8 rounded-hero bg-marca-cafe px-6 py-8 shadow-hero md:px-10 md:py-9 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-10"
    >
      <div className="flex min-w-0 flex-col">
        {posicion ? (
          <p className="mb-[15px] font-titulo text-menor font-semibold text-marca-menta">
            Módulo {posicion.orden} de {posicion.total}
          </p>
        ) : null}
        <h1 id="titulo-modulo" className="mb-[11px] font-titulo text-[2.5rem] leading-[1.12] font-extrabold tracking-[-0.006em] text-marca-crema">
          {modulo.titulo}
        </h1>
        <p className="mb-2.5 text-cuerpo text-marca-crema/85">{modulo.descripcion}</p>
        <div className="flex items-center gap-3">
          <BarraProgreso
            valor={modulo.avance}
            etiqueta={`Avance del módulo ${posicion?.orden ?? ""}`.trim()}
            tono="oscuroTenue"
            className="min-w-0 md:w-[500px] md:flex-none"
          />
          <span className="shrink-0 font-titulo text-detalle font-bold whitespace-nowrap text-marca-crema">
            {formatearPorcentaje(modulo.avance)}
          </span>
        </div>
      </div>

      <section
        aria-label="Insignia del módulo"
        className="flex h-[202px] flex-col items-center justify-center gap-3 rounded-panel border border-marca-crema/24 bg-marca-crema/8 px-5"
      >
        <Insignia orden={posicion?.orden ?? 1} obtenida={obtenida} tamano={96} />
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="font-titulo text-menor font-bold text-marca-crema">Insignia del módulo</p>
          <p className="text-detalle text-marca-crema/85">
            {obtenida ? (fecha ? `Obtenida el ${fecha}` : "Obtenida") : pendiente}
          </p>
        </div>
      </section>
    </section>
  );
}
