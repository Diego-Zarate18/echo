import type { Metadata } from "next";
import { AvisoPrivacidad } from "@/areas/aviso/componentes/AvisoPrivacidad";
import { EncabezadoInterno } from "@/componentes/estructura/EncabezadoInterno";
import { PiePublico } from "@/componentes/estructura/PiePublico";

export const metadata: Metadata = {
  title: "Aviso de privacidad",
  description: "Cómo cuida Echo tus datos personales: responsable, datos, finalidades, derechos ARCO y conservación.",
};

/** SCR-05 · Aviso de privacidad (DEC-28, DEC-68). Contenido fijo y estático. */
export default function PaginaAvisoDePrivacidad() {
  return (
    <>
      <EncabezadoInterno actual="/aviso-de-privacidad" />
      <main id="contenido" tabIndex={-1} className="outline-none">
        <AvisoPrivacidad />
      </main>
      <PiePublico variante="claro" actual="/aviso-de-privacidad" />
    </>
  );
}
