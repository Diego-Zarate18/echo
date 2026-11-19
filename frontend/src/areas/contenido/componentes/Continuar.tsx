import { Boton } from "@/componentes/ui/Boton";
import { localizarLeccion, type ResumenModulo } from "../datos/modulos";

/** Esqueleto del botón mientras se busca la lección: guarda el sitio para que la portada no salte. */
export function ContinuarCargando() {
  return <div aria-hidden="true" className="h-14 w-full max-w-[420px] rounded-full bg-marca-crema/10" />;
}

/**
 * Botón principal de la portada y la lección a la que lleva. Va al primer módulo en curso o, si no hay, al primero
 * disponible. Por eso lee el detalle (módulo, curso, lección): se muestra dentro de `<Suspense>`.
 */
export async function Continuar({ modulos }: { modulos: ResumenModulo[] }) {
  const objetivo = modulos.find((m) => m.estado === "enCurso") ?? modulos.find((m) => m.estado === "disponible");
  if (!objetivo) {
    return (
      <p className="text-cuerpo text-marca-crema/85">Completaste todos los módulos. Puedes repasarlos cuando quieras.</p>
    );
  }

  const punto = await localizarLeccion(objetivo);
  const empezando = objetivo.estado === "disponible";
  const texto = empezando ? `Empezar módulo ${objetivo.orden}` : punto ? "Continuar lección" : "Continuar módulo";
  const detalle = punto
    ? `Lección ${punto.orden} · ${punto.titulo}${punto.seccion ? `, sección ${punto.seccion.actual} de ${punto.seccion.total}` : ""}`
    : null;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <Boton variante="crema" conFlecha href={punto?.href ?? `/modulos/${objetivo.slug}`}>
        {texto}
      </Boton>
      {detalle ? <p className="text-menor text-marca-crema/85">{detalle}</p> : null}
    </div>
  );
}
