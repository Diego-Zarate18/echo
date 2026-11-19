/**
 * Datos fijos del Aviso de privacidad (SCR-05, DEC-28, DEC-68). El texto vigente es docs/legal/aviso-de-privacidad-v1.0.md,
 * tal como lo entregó el responsable: se convierte al compilar (lib/markdown).
 */
import { CORREO_PRIVACIDAD, CORREO_SOPORTE } from "@/lib/contacto";

/** Archivo del aviso integral vigente (v1.0). */
export const ARCHIVO_AVISO = "aviso-de-privacidad-v1.0.md";

/** Correo para solicitudes ARCO (DEC-68). PEND-12 quedó resuelto con él. */
export const CORREO_ARCO = CORREO_PRIVACIDAD;

/** Correos que se vuelven enlaces `mailto:` en el aviso. */
export const CORREOS_DEL_AVISO = [CORREO_ARCO, CORREO_SOPORTE] as const;
