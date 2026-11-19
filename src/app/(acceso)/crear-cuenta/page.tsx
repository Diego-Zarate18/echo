import type { Metadata } from "next";
import { CrearCuenta } from "@/areas/cuenta/componentes/CrearCuenta";

export const metadata: Metadata = {
  title: "Crear cuenta",
  description: "Crea tu cuenta de Echo con tu correo o con tu cuenta de Google.",
};

/** SCR-02 · Crear cuenta. Página estática: las versiones vigentes de los documentos se piden en el navegador. */
export default function PaginaCrearCuenta() {
  return <CrearCuenta />;
}
