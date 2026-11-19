import type { Metadata } from "next";
import { Suspense } from "react";
import { Aceptacion } from "@/areas/cuenta/componentes/Aceptacion";

export const metadata: Metadata = {
  title: "Aceptar aviso y términos",
  description: "Acepta el Aviso de privacidad y los Términos y condiciones de Echo para continuar.",
};

/** SCR-19. Depende de las cookies (sesión o registro con Google), así que se dibuja en cada solicitud, dentro de Suspense. */
export default function PaginaAceptar() {
  return (
    <Suspense fallback={null}>
      <Aceptacion />
    </Suspense>
  );
}
