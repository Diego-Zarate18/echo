import { notFound } from "next/navigation";
import { ErrorDePantalla } from "@/componentes/estructura/ErrorDePantalla";
import { Migas } from "@/componentes/ui/Migas";
import { apiServidor } from "@/lib/api/servidor";
import { ResolverActividad } from "./ResolverActividad";

export function ActividadCargando() {
  return (
    <div aria-hidden="true" className="esqueleto flex flex-col gap-8">
      <div className="h-5 w-96 max-w-full rounded-full bg-superficie-hundida" />
      <div className="h-[200px] rounded-hero bg-marca-cafe/90" />
      <div className="h-[420px] rounded-tarjeta bg-superficie-hundida" />
    </div>
  );
}

/**
 * Contenido de SCR-10 · Actividad o caso práctico (OP-22). La lección (OP-18) da las migas, el número del caso y la
 * ruta de regreso. Una actividad bloqueada responde 403 (INV-06): se avisa y se ofrece volver.
 */
export async function Actividad({ params }: { params: Promise<{ cuestionario: string }> }) {
  const { cuestionario } = await params;
  const id = Number(cuestionario);
  if (!Number.isInteger(id) || id < 1) notFound();

  const resultado = await apiServidor.abrirActividad({ ruta: { cuestionario: id } });
  if (!resultado.ok && resultado.error.estado === 401) return null;
  if (!resultado.ok && resultado.error.estado === 404) notFound();
  if (!resultado.ok) {
    return (
      <ErrorDePantalla
        titulo="No pudimos abrir esta actividad"
        error={resultado.error}
        migas={[{ texto: "Módulos", href: "/modulos" }]}
        salida={{ texto: "Volver a Módulos", href: "/modulos" }}
      />
    );
  }

  const actividad = resultado.datos;
  const leccion = await apiServidor.abrirLeccion({ ruta: { leccion: actividad.leccion.slug } });
  const datos = leccion.ok ? leccion.datos : null;
  const rutaCurso = datos ? `/modulos/${datos.modulo.slug}/${datos.curso.slug}` : "/modulos";
  const rutaLeccion = datos ? `${rutaCurso}/${datos.slug}` : rutaCurso;
  const casos = datos ? datos.evaluables.filter((e) => e.tipo === "caso") : [];
  const numeroDeCaso = casos.findIndex((e) => e.id === actividad.id) + 1;
  const nombre = actividad.tipo === "actividad" ? "Actividad" : numeroDeCaso ? `Caso práctico ${numeroDeCaso}` : "Caso práctico";
  const ubicacion =
    actividad.tipo === "actividad"
      ? `Actividad de la lección · ${actividad.leccion.titulo}`
      : `${nombre}${casos.length ? ` de ${casos.length}` : ""} · ${actividad.leccion.titulo}`;

  // El siguiente evaluable de la lección, para el botón final («Ir al caso práctico 1»).
  const evaluables = datos?.evaluables ?? [];
  const siguiente = evaluables[evaluables.findIndex((e) => e.id === actividad.id) + 1];
  const textoSiguiente = siguiente ? `Ir al caso práctico ${casos.findIndex((e) => e.id === siguiente.id) + 1}` : null;

  return (
    <>
      <Migas
        elementos={[
          { texto: "Módulos", href: "/modulos" },
          ...(datos
            ? [
                { texto: datos.modulo.titulo, href: `/modulos/${datos.modulo.slug}` },
                { texto: datos.curso.titulo, href: rutaCurso },
                { texto: datos.titulo, href: rutaLeccion },
              ]
            : []),
          { texto: nombre },
        ]}
      />
      <ResolverActividad
        actividad={actividad}
        ubicacion={ubicacion}
        rutaLeccion={rutaLeccion}
        rutaCurso={rutaCurso}
        siguiente={siguiente && textoSiguiente ? { href: `/actividades/${siguiente.id}`, texto: textoSiguiente } : null}
      />
    </>
  );
}
