import { Suspense } from "react";
import { ValidacionDeSesion } from "@/areas/cuenta/componentes/ValidacionDeSesion";
import { BarraInferior } from "@/componentes/estructura/BarraInferior";
import { EncabezadoApp, EncabezadoAppCargando } from "@/componentes/estructura/EncabezadoApp";
import { PiePublico } from "@/componentes/estructura/PiePublico";
import { SaltarAlContenido } from "@/componentes/estructura/SaltarAlContenido";

/**
 * Vistas con sesión (§5, §7). `proxy.ts` ya revisó que llegue la cookie; aquí se valida de verdad con el backend.
 * La lectura de la sesión va dentro de `<Suspense>` (cacheComponents) y no detiene a `children`: cada página pide
 * sus datos con la misma cookie y el backend los valida otra vez.
 *
 * Marco común: encabezado de la app arriba, pie claro abajo y, en móvil, la barra inferior (DEC-80). El pie deja
 * sitio a la barra para que no tape los enlaces.
 */
export default function LayoutApp({ children }: LayoutProps<"/">) {
  return (
    <>
      <Suspense fallback={null}>
        <ValidacionDeSesion />
      </Suspense>
      <SaltarAlContenido />
      <Suspense fallback={<EncabezadoAppCargando />}>
        <EncabezadoApp />
      </Suspense>
      {children}
      <div className="pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
        <PiePublico variante="claro" />
      </div>
      {/* `usePathname()` es dato de la solicitud: en rutas dinámicas (`/modulos/[modulo]/[curso]`) debe ir dentro de Suspense. */}
      <Suspense fallback={null}>
        <BarraInferior />
      </Suspense>
    </>
  );
}
