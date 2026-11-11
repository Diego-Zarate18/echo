import type { Metadata } from "next";
import { RecuperarContrasena } from "@/areas/cuenta/componentes/RecuperarContrasena";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
  description: "Pide un enlace para crear una contraseña nueva en Echo.",
};

/** SCR-04, paso 1. Página estática. */
export default function PaginaRecuperarContrasena() {
  return <RecuperarContrasena />;
}
