import { PaginaDeDocumentoLegal } from "@/componentes/estructura/PaginaDeDocumentoLegal";
import { IconoArchivo, IconoInfo, IconoLapiz, IconoLlave, IconoUsuario } from "@/componentes/ui/iconos/iconos";
import { leerTextoLegal } from "@/lib/markdown/leer-texto-legal";
import { ARCHIVO_AVISO, CORREOS_DEL_AVISO } from "@/areas/aviso/contenido";

/** Íconos del resumen, en el orden de sus puntos: quiénes somos, qué datos, para qué, no vendemos y derechos ARCO. */
const ICONOS_DEL_RESUMEN = [
  <IconoUsuario key="usuario" className="size-5" />,
  <IconoArchivo key="archivo" className="size-5" />,
  <IconoInfo key="info" className="size-5" />,
  <IconoLlave key="llave" className="size-5" />,
  <IconoLapiz key="lapiz" className="size-5" />,
];

/**
 * SCR-05 · Aviso de privacidad integral v1.0 (Figma 84:783 y 150:4959; DEC-98), con el texto de docs/legal. El
 * apartado 11 explica que Echo es un piloto que termina en diciembre de 2026 y qué pasa con los datos al cierre
 * (DEC-78, OP-38). La frase bajo el título es de Figma: el archivo no la trae.
 */
export function AvisoPrivacidad() {
  return (
    <PaginaDeDocumentoLegal
      documento={leerTextoLegal(ARCHIVO_AVISO)}
      subtitulo="Cómo cuidamos tus datos personales en Echo."
      tituloDelResumen="Resumen del Aviso de privacidad"
      iconosDelResumen={ICONOS_DEL_RESUMEN}
      correos={CORREOS_DEL_AVISO}
    />
  );
}
