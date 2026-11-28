import { notFound } from "next/navigation";
import { ErrorDePantalla } from "@/componentes/estructura/ErrorDePantalla";
import { Migas } from "@/componentes/ui/Migas";
import { apiServidor } from "@/lib/api/servidor";
import { cargarPortada, cargarUbicacion, idDeCuestionario } from "../datos";
import { ResultadoDeExamen } from "./ResultadoDeExamen";

/** Mientras carga el resultado: migas, el recuadro café de la calificación y las tarjetas de las preguntas. */
export function ResultadoExamenCargando() {
  return (
    <div aria-hidden="true" className="esqueleto flex flex-col">
      <div className="h-5 w-96 max-w-full rounded-full bg-superficie-hundida" />
      <div className="mt-[33px] h-[260px] rounded-hero bg-marca-cafe/90" />
      <div className="mt-8 flex flex-col gap-4">
        <div className="h-[220px] rounded-tarjeta bg-superficie-hundida" />
        <div className="h-[220px] rounded-tarjeta bg-superficie-hundida" />
        <div className="h-[220px] rounded-tarjeta bg-superficie-hundida" />
      </div>
    </div>
  );
}

/**
 * SCR-13 al volver a un intento (recargar o llegar por enlace). El detalle del intento (OP-30) trae la calificación y
 * las preguntas; la portada (OP-24), la calificación mínima y la espera. La insignia nueva solo se muestra al enviar.
 * El backend solo da intentos del alumno de la sesión (INV-07): uno ajeno es 404.
 */
export async function ResultadoGuardado({ params }: { params: Promise<{ cuestionario: string; intento: string }> }) {
  const { cuestionario, intento } = await params;
  const id = idDeCuestionario(cuestionario);
  const [detalle, portada] = await Promise.all([apiServidor.obtenerDetalleIntento({ ruta: { intento } }), cargarPortada(id)]);

  if (!detalle.ok && detalle.error.estado === 401) return null;
  if (!detalle.ok && detalle.error.estado === 404) notFound();
  if (!detalle.ok) {
    return (
      <ErrorDePantalla
        titulo="No pudimos abrir este resultado"
        error={detalle.error}
        migas={[{ texto: "Módulos", href: "/modulos" }]}
        salida={{ texto: "Ir a Mis resultados", href: "/mis-resultados" }}
      />
    );
  }

  const { resultado } = detalle.datos;
  if (resultado.tipo !== "examen") notFound();
  const ubicacion = await cargarUbicacion(resultado.curso.slug);
  const enEspera = portada.ok && portada.datos.estado === "enEspera";
  const repaso = new Map<string, string>();
  if (detalle.datos.solucion === "oculta") {
    for (const p of detalle.datos.preguntas) if (!p.correcta && p.leccionRepaso) repaso.set(p.leccionRepaso.slug, p.leccionRepaso.titulo);
  }

  return (
    <>
      <Migas
        elementos={[
          { texto: "Módulos", href: "/modulos" },
          { texto: resultado.modulo.titulo, href: `/modulos/${resultado.modulo.slug}` },
          { texto: resultado.curso.titulo, href: ubicacion?.rutaCurso ?? "/modulos" },
          { texto: "Examen", href: `/examenes/${id}` },
          { texto: "Resultado del examen" },
        ]}
      />
      <ResultadoDeExamen
        datos={{
          titulo: `Examen del curso · ${resultado.curso.titulo}`,
          intento: { numero: resultado.numero, enviadoEn: resultado.enviadoEn, calificacion: resultado.calificacion },
          calificacionMinima: portada.ok ? portada.datos.calificacionMinima : null,
          aprobado: detalle.datos.solucion === "completa",
          insigniaNueva: null,
          leccionesRepaso: [...repaso].map(([slug, titulo]) => ({ slug, titulo })),
          disponibleEn: enEspera ? portada.datos.disponibleEn : null,
          minutosEspera: enEspera ? portada.datos.minutosRestantes : null,
          preguntas: detalle.datos.solucion === "completa" ? { conSolucion: true, lista: detalle.datos.preguntas } : { conSolucion: false, lista: detalle.datos.preguntas },
          rutaCurso: ubicacion?.rutaCurso ?? null,
        }}
      />
    </>
  );
}
