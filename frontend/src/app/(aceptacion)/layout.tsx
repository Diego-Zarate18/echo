import { redirect } from "next/navigation";
import { Suspense } from "react";
import { casoDeAceptacion } from "@/areas/cuenta/casoDeAceptacion";
import { SaltarAlContenido } from "@/componentes/estructura/SaltarAlContenido";

/** Solo redirige: sin pendiente va a /modulos; con la sesión vencida, a Iniciar sesión (SCR-19, DEC-85). */
async function ValidacionDeAceptacion() {
  const caso = await casoDeAceptacion();
  if (caso.tipo === "redirigir") redirect(caso.a);
  return null;
}

/**
 * `/aceptar` va en su propio grupo, fuera de `(app)`: el layout de `(app)` manda aquí por la aceptación pendiente y,
 * si este viviera dentro, sería un ciclo. Valida la sesión o el registro con Google, pero no redirige por pendiente.
 */
export default function LayoutAceptacion({ children }: LayoutProps<"/">) {
  return (
    <>
      <Suspense fallback={null}>
        <ValidacionDeAceptacion />
      </Suspense>
      <SaltarAlContenido />
      {children}
    </>
  );
}
