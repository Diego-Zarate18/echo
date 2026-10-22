import { PaginaDeDocumentoLegal } from "@/componentes/estructura/PaginaDeDocumentoLegal";
import { leerTextoLegal } from "@/lib/markdown/leer-texto-legal";
import { ARCHIVO_TERMINOS, CORREOS_DE_LOS_TERMINOS } from "@/areas/terminos/contenido";

/** SCR-20 · Términos y condiciones de uso con descargo de responsabilidad v1.0, con el diseño de SCR-05 (84:783). */
export function Terminos() {
  return <PaginaDeDocumentoLegal documento={leerTextoLegal(ARCHIVO_TERMINOS)} correos={CORREOS_DE_LOS_TERMINOS} />;
}
