import Link from "next/link";
import { Alerta } from "@/componentes/ui/Alerta";
import { mensajeDeError } from "@/lib/api/mensajes";
import { apiServidor } from "@/lib/api/servidor";
import { obtenerSesion } from "@/lib/sesion";
import { cargarModulos } from "../datos/modulos";
import { Portada } from "./Portada";
import { ResultadosBusqueda } from "./ResultadosBusqueda";
import { TarjetaModulo } from "./TarjetaModulo";

type Consulta = { [llave: string]: string | string[] | undefined };

/** `?q=` limpio: sin espacios sobrantes y con el máximo que acepta la API (100). */
function leerBusqueda(parametros: Consulta): string {
  const valor = Array.isArray(parametros.q) ? parametros.q[0] : parametros.q;
  return (valor ?? "").trim().slice(0, 100);
}

/** Esqueleto de SCR-06 mientras llegan la sesión y los módulos: mismas medidas que la vista final. */
export function ModulosCargando() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-10">
      <div className="h-[433px] rounded-hero bg-marca-cafe/90" />
      <div className="flex flex-col gap-5">
        <div className="h-[178px] rounded-tarjeta bg-superficie-hundida" />
        <div className="h-[185px] rounded-tarjeta bg-superficie-hundida" />
        <div className="h-[185px] rounded-tarjeta bg-superficie-hundida" />
      </div>
    </div>
  );
}

/**
 * Contenido de SCR-06 · Módulos (inicio). Pide la sesión, los módulos y, si hay `?q=`, la búsqueda (OP-31, OP-15,
 * OP-21) al mismo tiempo. Lee `searchParams`, por eso la página lo muestra dentro de `<Suspense>`.
 */
export async function Modulos({ searchParams }: { searchParams: Promise<Consulta> }) {
  const consulta = leerBusqueda(await searchParams);
  const [sesion, modulos, busqueda] = await Promise.all([
    obtenerSesion(),
    cargarModulos(),
    consulta ? apiServidor.buscar({ consulta: { q: consulta } }) : null,
  ]);

  // Sin sesión válida, `ValidacionDeSesion` (layout) ya está llevando al alumno a Iniciar sesión.
  if (!sesion.ok || (!modulos.ok && modulos.error.estado === 401)) return null;

  if (!modulos.ok) {
    return (
      <div className="flex flex-col items-start gap-4">
        <Alerta tono="error" role="alert" titulo="No pudimos cargar tus módulos" className="w-full">
          {mensajeDeError(modulos.error)}
        </Alerta>
        <Link
          href="/modulos"
          className="inline-flex min-h-11 items-center font-titulo text-menor font-bold text-marca-cafe underline underline-offset-4 hover:decoration-2"
        >
          Intentar de nuevo
        </Link>
      </div>
    );
  }

  const { avanceGeneral, modulos: lista } = modulos.datos;

  return (
    <>
      <Portada nombre={sesion.datos.nombre} modulos={lista} avanceGeneral={avanceGeneral} consulta={consulta} />
      {/* Región viva fija: al cambiar la búsqueda, el lector de pantalla anuncia cuántos resultados hay. */}
      <p role="status" className="sr-only">
        {consulta && busqueda?.ok
          ? busqueda.datos.resultados.length === 0
            ? `No hay resultados para ${consulta}`
            : `${busqueda.datos.resultados.length} ${busqueda.datos.resultados.length === 1 ? "resultado" : "resultados"} para ${consulta}`
          : ""}
      </p>

      {consulta && busqueda ? (
        busqueda.ok ? (
          <ResultadosBusqueda consulta={consulta} resultados={busqueda.datos.resultados} modulos={lista} />
        ) : (
          <Alerta tono="error" role="alert" titulo="No pudimos buscar" className="mt-10">
            {mensajeDeError(busqueda.error)}
          </Alerta>
        )
      ) : (
        <section aria-labelledby="titulo-modulos" className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <h2 id="titulo-modulos" className="font-titulo text-[2rem] leading-[1.1] font-extrabold text-marca-cafe">
              Tus módulos
            </h2>
            <p className="text-menor text-texto-secundario">Completa cada módulo para desbloquear el siguiente.</p>
          </div>
          <ul className="mt-10 flex flex-col gap-4">
            {lista.map((modulo) => (
              <li key={modulo.slug}>
                <TarjetaModulo modulo={modulo} modulos={lista} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
