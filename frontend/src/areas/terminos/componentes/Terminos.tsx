import { PaginaDeDocumentoLegal } from "@/componentes/estructura/PaginaDeDocumentoLegal";
import { IconoAlerta, IconoArchivo, IconoInfo, IconoLlave, IconoUsuario } from "@/componentes/ui/iconos/iconos";
import { leerTextoLegal } from "@/lib/markdown/leer-texto-legal";
import { ARCHIVO_TERMINOS, CORREOS_DE_LOS_TERMINOS } from "@/areas/terminos/contenido";

/** Íconos del resumen de los términos, en el orden de sus puntos (Figma 170:5216). */
const ICONOS_DEL_RESUMEN = [
  <IconoInfo key="info" className="size-5" />,
  <IconoArchivo key="archivo" className="size-5" />,
  <IconoAlerta key="alerta" className="size-5" />,
  <IconoLlave key="llave" className="size-5" />,
  <IconoUsuario key="usuario" className="size-5" />,
];

/**
 * SCR-20 · Términos y condiciones de uso con descargo de responsabilidad v1.0 (Figma 170:5216 y 150:5454; DEC-98).
 * La frase bajo el título es de Figma: el archivo no la trae.
 */
export function Terminos() {
  return (
    <PaginaDeDocumentoLegal
      documento={leerTextoLegal(ARCHIVO_TERMINOS)}
      subtitulo="Las reglas para usar Echo, en claro."
      tituloDelResumen="Resumen de los Términos y condiciones"
      iconosDelResumen={ICONOS_DEL_RESUMEN}
      correos={CORREOS_DE_LOS_TERMINOS}
    />
  );
}
