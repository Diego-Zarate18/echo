import type { Metadata } from "next";
import { IniciarSesion } from "@/areas/cuenta/componentes/IniciarSesion";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description: "Entra a Echo con tu correo y contraseña o con tu cuenta de Google.",
};

/**
 * SCR-01 · Iniciar sesión. Página estática: `motivo`, `error` y `volver` se leen en el navegador
 * (`useConsultaDeLaUrl`), así el formulario viene en el HTML. Con sesión, `proxy.ts` lleva a /modulos.
 */
export default function PaginaIniciarSesion() {
  return <IniciarSesion />;
}
