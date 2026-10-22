import { PaginaDeDocumentoLegal } from "@/componentes/estructura/PaginaDeDocumentoLegal";
import { leerTextoLegal } from "@/lib/markdown/leer-texto-legal";
import { ARCHIVO_AVISO, CORREOS_DEL_AVISO } from "@/areas/aviso/contenido";

/**
 * SCR-05 · Aviso de privacidad integral v1.0 (Figma 84:783), con el texto de docs/legal. El apartado 11 explica que
 * Echo es un piloto que termina en diciembre de 2026 y qué pasa con los datos al cierre (DEC-78, OP-38).
 */
export function AvisoPrivacidad() {
  return <PaginaDeDocumentoLegal documento={leerTextoLegal(ARCHIVO_AVISO)} correos={CORREOS_DEL_AVISO} />;
}
