import Link from "next/link";
import { notFound } from "next/navigation";
import { Alerta } from "@/componentes/ui/Alerta";
import { Migas } from "@/componentes/ui/Migas";
import { mensajeDeError } from "@/lib/api/mensajes";
import { cargarModulo, cargarModulos } from "../datos/modulos";
import { PortadaModulo } from "./PortadaModulo";
import { TarjetaCurso } from "./TarjetaCurso";

/** Esqueleto de SCR-07 mientras llegan los datos: mismas medidas que la vista final. */
export function ModuloCargando() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-8">
      <div className="h-5 w-72 rounded-full bg-superficie-hundida" />
      <div className="h-[274px] rounded-hero bg-marca-cafe/90" />
      <div className="flex flex-col gap-4">
        <div className="h-[178px] rounded-tarjeta bg-superficie-hundida" />
        <div className="h-[170px] rounded-tarjeta bg-superficie-hundida" />
        <div className="h-[180px] rounded-tarjeta bg-superficie-hundida" />
      </div>
    </div>
  );
}

/**
 * Contenido de SCR-07 · Módulo (OP-16): cursos en orden con su estado y avance. Lee `params`, por eso la página lo
 * muestra dentro de `<Suspense>`. Un módulo que no existe da 404; uno todavía bloqueado, un aviso con la salida.
 */
export async function Modulo({ params }: { params: Promise<{ modulo: string }> }) {
  const { modulo: slug } = await params;
  const [detalle, lista] = await Promise.all([cargarModulo(slug), cargarModulos()]);

  // Sin sesión válida, `ValidacionDeSesion` (layout) ya está llevando al alumno a Iniciar sesión.
  if (!detalle.ok && detalle.error.estado === 401) return null;
  if (!detalle.ok && detalle.error.estado === 404) notFound();

  if (!detalle.ok) {
    return (
      <div className="flex flex-col items-start gap-4">
        <Migas elementos={[{ texto: "Módulos", href: "/modulos" }]} />
        <Alerta tono="error" role="alert" titulo="No pudimos abrir este módulo" className="w-full">
          {mensajeDeError(detalle.error)}
        </Alerta>
        <Link
          href="/modulos"
          className="inline-flex min-h-11 items-center font-titulo text-menor font-bold text-marca-cafe underline underline-offset-4 hover:decoration-2"
        >
          Volver a Módulos
        </Link>
      </div>
    );
  }

  const modulo = detalle.datos;
  const todos = lista.ok ? lista.datos.modulos : [];
  const posicion = todos.find((otro) => otro.slug === modulo.slug);

  return (
    <>
      <Migas elementos={[{ texto: "Módulos", href: "/modulos" }, { texto: modulo.titulo }]} />
      <div className="mt-[33px]">
        <PortadaModulo modulo={modulo} posicion={posicion ? { orden: posicion.orden, total: todos.length } : null} />
      </div>

      <section aria-labelledby="titulo-cursos" className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <h2 id="titulo-cursos" className="font-titulo text-[2rem] leading-[1.1] font-extrabold text-marca-cafe">
            Cursos
          </h2>
          <p className="text-menor text-texto-secundario">Aprueba el examen de cada curso para abrir el siguiente.</p>
        </div>
        <ul className="mt-[31px] flex flex-col gap-4">
          {modulo.cursos.map((curso) => (
            <li key={curso.slug}>
              <TarjetaCurso curso={curso} cursos={modulo.cursos} moduloSlug={modulo.slug} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
