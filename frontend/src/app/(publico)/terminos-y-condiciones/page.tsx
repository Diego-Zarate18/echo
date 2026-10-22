import type { Metadata } from "next";
import { Terminos } from "@/areas/terminos/componentes/Terminos";
import { EncabezadoInterno } from "@/componentes/estructura/EncabezadoInterno";
import { PiePublico } from "@/componentes/estructura/PiePublico";

export const metadata: Metadata = {
  title: "Términos y condiciones de uso con descargo de responsabilidad",
  description:
    "Reglas de uso de Echo: descargo de responsabilidad legal, licencia, propiedad intelectual, cuentas, funcionamiento académico y privacidad.",
};

/** SCR-20 · Términos y condiciones (DEC-87). Contenido fijo y estático. */
export default function PaginaTerminos() {
  return (
    <>
      <EncabezadoInterno actual="/terminos-y-condiciones" />
      <main id="contenido" tabIndex={-1} className="outline-none">
        <Terminos />
      </main>
      <PiePublico variante="claro" actual="/terminos-y-condiciones" />
    </>
  );
}
