import { Suspense } from "react";
import { Moris } from "@/componentes/marca/Moris";
import { BarraProgreso } from "@/componentes/ui/BarraProgreso";
import { formatearPorcentaje } from "@/lib/fechas";
import type { ResumenModulo } from "../datos/modulos";
import { Buscador } from "./Buscador";
import { Continuar, ContinuarCargando } from "./Continuar";

type PropsPortada = {
  nombre: string;
  modulos: ResumenModulo[];
  avanceGeneral: number;
  /** Lo que se escribió en el buscador (`?q=`). */
  consulta: string;
};

/**
 * Tarjeta de bienvenida de SCR-06. Al entrar por primera vez (todo en 0 %) saluda con «Te damos la bienvenida» y
 * Moris; después dice «Hola» y recuerda que el avance se guarda solo. A la derecha, el avance general y las insignias.
 */
export function Portada({ nombre, modulos, avanceGeneral, consulta }: PropsPortada) {
  const insigniasObtenidas = modulos.filter((m) => m.insignia?.obtenidaEn).length;
  const primerIngreso = avanceGeneral === 0 && modulos.every((m) => m.estado !== "enCurso" && m.estado !== "completado");

  return (
    <section
      aria-labelledby="titulo-portada"
      data-fondo="oscuro"
      className="grid items-center gap-8 rounded-hero bg-marca-cafe px-6 py-8 shadow-hero md:px-11 md:py-[41px] lg:grid-cols-[minmax(0,1fr)_398px] lg:gap-14"
    >
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-[13px]">
          <h1 id="titulo-portada" className="font-titulo text-entrada font-extrabold tracking-[-0.006em] text-marca-crema">
            {primerIngreso ? `Te damos la bienvenida, ${nombre}` : `Hola, ${nombre}`}
          </h1>
          <p className="text-[1.125rem] text-marca-crema/85">
            {primerIngreso
              ? "Empieza por el primer módulo. Cada paso abre el siguiente."
              : "Continúa donde te quedaste. Tu avance se guarda solo."}
          </p>
        </div>
        <Suspense fallback={<ContinuarCargando />}>
          <Continuar modulos={modulos} />
        </Suspense>
        <Buscador consulta={consulta} />
      </div>

      <section
        aria-label="Tu avance"
        className="flex flex-col rounded-panel border border-marca-crema/24 bg-marca-crema/8 p-6 pb-[26px]"
      >
        {primerIngreso ? (
          <>
            <Moris expresion="feliz" alt="" sizes="110px" className="mb-3 w-[110px]" />
            <p className="mb-3 text-cuerpo leading-[27px] text-marca-crema">
              ¡Hola! Soy Moris. ¡Qué alegría tenerte aquí! Vamos a explorar Echo juntos.
            </p>
          </>
        ) : null}
        <div className="flex flex-col">
          <p id="avance-general" className="mb-[15px] font-titulo text-detalle font-bold text-marca-crema">
            Tu avance general
          </p>
          <div className="mb-3.5 flex items-center gap-3">
            <BarraProgreso valor={avanceGeneral} etiqueta="Tu avance general" tono="oscuro" className="min-w-0 lg:w-[292px] lg:flex-none" />
            <span className="shrink-0 text-left font-titulo text-detalle font-bold whitespace-nowrap text-marca-crema">
              {formatearPorcentaje(avanceGeneral)}
            </span>
          </div>
          <p className="text-detalle text-marca-crema/85">
            {insigniasObtenidas} de {modulos.length} insignias obtenidas
          </p>
        </div>
      </section>
    </section>
  );
}
