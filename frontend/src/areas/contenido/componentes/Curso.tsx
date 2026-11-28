import Link from "next/link";
import { notFound } from "next/navigation";
import { Alerta } from "@/componentes/ui/Alerta";
import { Migas } from "@/componentes/ui/Migas";
import { mensajeDeError } from "@/lib/api/mensajes";
import { cargarCurso, cargarModulo, cargarModulos } from "../datos/modulos";
import { PortadaCurso } from "./PortadaCurso";
import { TarjetaExamenDelCurso } from "./TarjetaExamen";
import { TarjetaLeccion } from "./TarjetaLeccion";

/** Esqueleto de SCR-08 mientras llegan los datos: mismas medidas que la vista final. */
export function CursoCargando() {
  return (
    <div aria-hidden="true" className="esqueleto flex flex-col gap-8">
      <div className="h-5 w-96 max-w-full rounded-full bg-superficie-hundida" />
      <div className="h-[240px] rounded-hero bg-marca-cafe/90" />
      <div className="flex flex-col gap-4">
        <div className="h-[306px] rounded-tarjeta bg-superficie-hundida" />
        <div className="h-[135px] rounded-tarjeta bg-superficie-hundida" />
        <div className="h-[130px] rounded-tarjeta bg-superficie-hundida" />
      </div>
    </div>
  );
}

/**
 * Contenido de SCR-08 · Curso (OP-17): las lecciones en orden, cada una con su actividad y sus casos, y el examen al
 * final. Lee `params`, por eso la página lo muestra dentro de `<Suspense>`. Un curso que no existe (o que no es de ese
 * módulo) da 404; uno todavía bloqueado, un aviso con la salida.
 */
export async function Curso({ params }: { params: Promise<{ modulo: string; curso: string }> }) {
  const { modulo: moduloSlug, curso: cursoSlug } = await params;
  const [detalle, detalleModulo, lista] = await Promise.all([cargarCurso(cursoSlug), cargarModulo(moduloSlug), cargarModulos()]);

  // Sin sesión válida, `ValidacionDeSesion` (layout) ya está llevando al alumno a Iniciar sesión.
  if (!detalle.ok && detalle.error.estado === 401) return null;
  if (!detalle.ok && detalle.error.estado === 404) notFound();
  if (!detalleModulo.ok && detalleModulo.error.estado === 404) notFound();

  if (!detalle.ok) {
    return (
      <div className="flex flex-col items-start gap-4">
        <Migas elementos={[{ texto: "Módulos", href: "/modulos" }]} />
        <Alerta tono="error" role="alert" titulo="No pudimos abrir este curso" className="w-full">
          {mensajeDeError(detalle.error)}
        </Alerta>
        <Link
          href={detalleModulo.ok ? `/modulos/${moduloSlug}` : "/modulos"}
          className="inline-flex min-h-11 items-center font-titulo text-menor font-bold text-marca-cafe underline underline-offset-4 hover:decoration-2"
        >
          {detalleModulo.ok ? "Volver al módulo" : "Volver a Módulos"}
        </Link>
      </div>
    );
  }

  const curso = detalle.datos;
  // La URL debe ser la del módulo al que pertenece el curso.
  if (curso.modulo.slug !== moduloSlug) notFound();

  const cursosDelModulo = detalleModulo.ok ? detalleModulo.datos.cursos : [];
  const posicion = cursosDelModulo.find((otro) => otro.slug === curso.slug);
  const modulo = lista.ok ? lista.datos.modulos.find((otro) => otro.slug === moduloSlug) : undefined;

  return (
    <>
      <Migas
        elementos={[
          { texto: "Módulos", href: "/modulos" },
          { texto: curso.modulo.titulo, href: `/modulos/${curso.modulo.slug}` },
          { texto: curso.titulo },
        ]}
      />
      <div className="mt-[33px]">
        <PortadaCurso
          curso={curso}
          moduloOrden={modulo?.orden ?? null}
          posicion={posicion ? { orden: posicion.orden, total: cursosDelModulo.length } : null}
        />
      </div>

      <section aria-labelledby="titulo-contenido" className="mt-8">
        <h2 id="titulo-contenido" className="font-titulo text-[1.875rem] leading-[1.1] font-extrabold text-marca-cafe">
          Contenido del curso
        </h2>
        <ul className="mt-[31px] flex flex-col gap-4">
          {curso.lecciones.map((leccion) => (
            <li key={leccion.slug}>
              <TarjetaLeccion leccion={leccion} moduloSlug={curso.modulo.slug} cursoSlug={curso.slug} avanceDelCurso={curso.avance} />
            </li>
          ))}
          {curso.examen ? (
            <li>
              <TarjetaExamenDelCurso examen={curso.examen} totalLecciones={curso.lecciones.length} />
            </li>
          ) : null}
        </ul>
      </section>
    </>
  );
}
