import type { Metadata } from "next";
import { RestablecerContrasena } from "@/areas/cuenta/componentes/RestablecerContrasena";

export const metadata: Metadata = {
  title: "Crear una contraseña nueva",
  description: "Crea una contraseña nueva para tu cuenta de Echo con el enlace que te enviamos.",
};

/** SCR-04, paso 2. Página estática: el código del enlace se lee y se quita de la URL en el navegador. */
export default function PaginaRestablecerContrasena() {
  return <RestablecerContrasena />;
}
