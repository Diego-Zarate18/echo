/**
 * Datos fijos de los Términos y condiciones (SCR-20, DEC-87). El texto vigente es
 * docs/legal/terminos-y-condiciones-v1.0.md, tal como lo entregó el responsable: se convierte al compilar (lib/markdown).
 */
import { CORREO_PRIVACIDAD, CORREO_SOPORTE } from "@/lib/contacto";

/** Archivo de los términos vigentes (v1.0). */
export const ARCHIVO_TERMINOS = "terminos-y-condiciones-v1.0.md";

/** Correos que se vuelven enlaces `mailto:` en los términos. */
export const CORREOS_DE_LOS_TERMINOS = [CORREO_SOPORTE, CORREO_PRIVACIDAD] as const;
