import type { Metadata } from "next";
import { Ayuda } from "@/areas/ayuda/componentes/Ayuda";
import { EncabezadoInterno } from "@/componentes/estructura/EncabezadoInterno";
import { PiePublico } from "@/componentes/estructura/PiePublico";

export const metadata: Metadata = {
  title: "Ayuda",
  description: "Respuestas breves para usar Echo: ruta de aprendizaje, exámenes, progreso, cuenta, accesibilidad y cierre del piloto.",
};

/** SCR-17 · Ayuda (RNF-11). Contenido fijo y estático. */
export default function PaginaAyuda() {
  return (
    <>
      <EncabezadoInterno actual="/ayuda" />
      <main id="contenido" tabIndex={-1} className="outline-none">
        <Ayuda />
      </main>
      <PiePublico variante="claro" actual="/ayuda" />
    </>
  );
}
