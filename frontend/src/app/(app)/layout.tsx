import { Suspense } from "react";
import { ValidacionDeSesion } from "@/areas/cuenta/componentes/ValidacionDeSesion";
import { SaltarAlContenido } from "@/componentes/estructura/SaltarAlContenido";

/**
 * Vistas con sesión (§5, §7). `proxy.ts` ya revisó que llegue la cookie; aquí se valida de verdad con el backend.
 * La lectura de la sesión va dentro de `<Suspense>` (cacheComponents) y no detiene a `children`: cada página pide
 * sus datos con la misma cookie y el backend los valida otra vez.
 */
export default function LayoutApp({ children }: LayoutProps<"/">) {
  return (
    <>
      <Suspense fallback={null}>
        <ValidacionDeSesion />
      </Suspense>
      <SaltarAlContenido />
      {children}
    </>
  );
}
