import type { Metadata } from "next";
import { VerificarCorreo } from "@/areas/cuenta/componentes/VerificarCorreo";

export const metadata: Metadata = {
  title: "Verificar correo",
  description: "Activa tu cuenta de Echo con el enlace que te enviamos por correo.",
};

/** SCR-03 · Verificar correo. Página estática: el código del enlace se lee y se quita de la URL en el navegador. */
export default function PaginaVerificarCorreo() {
  return <VerificarCorreo />;
}
