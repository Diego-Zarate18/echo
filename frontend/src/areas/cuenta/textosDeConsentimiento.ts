/**
 * Anexo A del aviso de privacidad integral v1.0 (docs/legal/aviso-de-privacidad-v1.0.md), tal cual: el aviso
 * simplificado y las casillas que muestran Crear cuenta (SCR-02) y la aceptación con Google (SCR-19).
 * No se cambia aquí: una prueba (`markdown.spec.ts`) revisa que coincida palabra por palabra con el archivo.
 */
export const AVISO_SIMPLIFICADO = {
  titulo: "Aviso de privacidad simplificado",
  parrafos: [
    "Brian Luis Ruiz Pérez (Echo), con domicilio en Carretera Tuxtla Gutiérrez – Portillo Zaragoza km 21+500, colonia Las Brisas, municipio de Suchiapa, Chiapas, México, C.P. 29145, es responsable del uso y protección de tus datos personales.",
    "Usaremos tu nombre, apellidos, correo y tu avance en la plataforma para crear tu cuenta, autenticarte, registrar y calificar tu progreso, otorgarte insignias, enviarte los correos necesarios de tu cuenta, darte soporte y mantener la seguridad del sistema.",
    "Además, si no te opones, para invitarte una vez a una encuesta de satisfacción al cierre del piloto y para elaborar estadísticas anónimas de uso. Tu negativa no afecta el servicio.",
    "Consulta el aviso de privacidad integral en la sección «Aviso de privacidad» de Echo o pídelo a privacidad.echo@gmail.com.",
  ],
} as const;

/** Casillas del Anexo A, todas sin marcar. La de los términos va aparte, como pide el mismo anexo. */
export const CASILLAS = {
  negativaEncuesta: "No deseo que mis datos se usen para invitarme a la encuesta de satisfacción.",
  negativaEstadisticas: "No deseo que mis datos se usen para estadísticas anónimas de uso.",
  mayorDeEdad: "Confirmo que tengo 18 años o más.",
  aceptaAviso: "He leído y acepto el Aviso de privacidad.",
  aceptaTerminos: "He leído y acepto los Términos y condiciones.",
} as const;

export type NombreCasilla = keyof typeof CASILLAS;
export const CASILLAS_OPCIONALES = ["negativaEncuesta", "negativaEstadisticas"] as const satisfies readonly NombreCasilla[];
export const CASILLAS_OBLIGATORIAS = ["mayorDeEdad", "aceptaAviso", "aceptaTerminos"] as const satisfies readonly NombreCasilla[];
