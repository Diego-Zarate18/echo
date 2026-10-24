import type { CodigoCampo, CodigoErrorCliente, ErrorApi } from "./errores";

/**
 * Lo que lee el alumno ante cada código de error de la API. El frontend nunca muestra el `mensaje` del backend (§3).
 * El mapa es exhaustivo: si el contrato agrega un código y aquí falta, la compilación falla.
 * CREDENCIALES_INVALIDAS y CORREO_SIN_VERIFICAR son los textos de DEC-77 tal cual.
 */
export const mensajesDeError = {
  NO_AUTENTICADO: "Tu sesión terminó. Inicia sesión de nuevo para continuar.",
  CREDENCIALES_INVALIDAS: "El correo o la contraseña no son correctos. Tras 5 intentos fallidos, el acceso se pausa 15 minutos.",
  CORREO_SIN_VERIFICAR: "Aún no verificas tu correo. Te podemos enviar un enlace nuevo.",
  ENLACE_INVALIDO: "Este enlace ya no sirve: venció o ya se usó. Pide uno nuevo.",
  CONTRASENA_INCORRECTA: "La contraseña no es correcta. Revísala e inténtalo de nuevo.",
  REINGRESO_REQUERIDO: "Para eliminar tu cuenta, vuelve a entrar con Google y confirma de nuevo.",
  REGISTRO_GOOGLE_VENCIDO: "Pasó demasiado tiempo y no se terminó tu registro. Elige de nuevo «Continuar con Google».",
  NO_DISPONIBLE_CON_GOOGLE: "Como entras con Google, esto se cambia en tu cuenta de Google.",
  DATOS_INVALIDOS: "Revisa los campos marcados.",
  RESPUESTAS_INCOMPLETAS: "Te faltan preguntas por responder. Respóndelas para enviar.",
  NO_ENCONTRADO: "No encontramos lo que buscas. Puede que el enlace esté incompleto.",
  BLOQUEADO_POR_AVANCE: "Todavía no se abre. Termina lo anterior para continuar.",
  EN_ESPERA: "Podrás volver a presentar el examen en unos minutos. Mientras, repasa las lecciones que se indican.",
  EXAMEN_APROBADO: "Ya aprobaste este examen. No hace falta repetirlo.",
  INTENTO_CERRADO: "Este intento ya se envió. Revisa tu resultado.",
  ORIGEN_NO_PERMITIDO: "No pudimos procesar la solicitud. Recarga la página e inténtalo de nuevo.",
  DEMASIADAS_SOLICITUDES: "Hiciste muchas solicitudes seguidas. Espera unos minutos e inténtalo de nuevo.",
  ACEPTACION_PENDIENTE: "Actualizamos el Aviso de privacidad o los Términos y condiciones. Revísalos y acéptalos para seguir usando Echo.",
  VERSION_NO_VIGENTE: "El documento cambió mientras lo leías. Revisa la versión nueva y acéptala.",
  ERROR_INTERNO: "Algo falló de nuestro lado. Inténtalo de nuevo en unos minutos.",
  SIN_CONEXION: "No hay conexión. Revisa tu internet e inténtalo de nuevo.",
} as const satisfies Record<CodigoErrorCliente, string>;

/** Texto junto a cada campo en DATOS_INVALIDOS. Exhaustivo, igual que el anterior. */
export const mensajesDeCampo = {
  OBLIGATORIO: "Completa este campo.",
  FORMATO_INVALIDO: "Revisa cómo está escrito.",
  LONGITUD_INVALIDA: "Usa entre 1 y 100 caracteres.",
  CONTRASENA_DEBIL: "Usa 8 caracteres o más, con al menos una letra y un número.",
  CASILLA_OBLIGATORIA: "Marca esta casilla para continuar.",
  FUERA_DE_RANGO: "El valor está fuera del rango permitido.",
} as const satisfies Record<CodigoCampo, string>;

/** Casos en que el campo cambia el texto. */
const mensajesDeCampoPorNombre: Partial<Record<string, Partial<Record<CodigoCampo, string>>>> = {
  correo: { FORMATO_INVALIDO: "Escribe un correo válido, por ejemplo nombre@dominio.com." },
  correoNuevo: { FORMATO_INVALIDO: "Escribe un correo válido, por ejemplo nombre@dominio.com." },
};

/**
 * Avisos que se muestran siempre igual, exista o no la cuenta (DEC-77, textos tal cual del grafo).
 * Son respuestas 202 de la API, no errores.
 */
export const avisosDeCuenta = {
  registroEnviado: "Revisa tu correo. Te enviamos un mensaje para continuar.",
  recuperacionEnviada:
    "Si hay una cuenta con contraseña para ese correo, te enviamos un enlace que vence en 30 minutos. Si entras con Google, no necesitas contraseña.",
  cambioDeCorreoEnviado: "Revisa tu correo nuevo para confirmar el cambio. El enlace vence en 30 minutos.",
} as const;

/** Avisos de Iniciar sesión (SCR-01) que llegan por la URL, no por una respuesta de la API. */
export const avisosDeAcceso = {
  /** `?motivo=expirada`: el layout de `(app)` recibió 401 (§7.2). */
  sesionExpirada: "Tu sesión terminó por inactividad. Inicia sesión de nuevo.",
  /** `?error=google`: Google falló o la persona canceló (OP-03). No dice si el correo tiene cuenta (DEC-77). */
  errorGoogle: "No pudimos entrar con tu cuenta de Google. Inténtalo de nuevo o entra con tu correo y contraseña.",
} as const;

/** Mensaje de un error, con los datos que lo precisan (los minutos de la espera). */
export function mensajeDeError(error: ErrorApi): string {
  if (error.codigo === "EN_ESPERA" && error.minutosRestantes) {
    const minutos = error.minutosRestantes === 1 ? "1 minuto" : `${error.minutosRestantes} minutos`;
    return `Podrás volver a presentar el examen en ${minutos}. Mientras, repasa las lecciones que se indican.`;
  }
  return mensajesDeError[error.codigo];
}

export function mensajeDeCampo(campo: string, codigo: CodigoCampo): string {
  return mensajesDeCampoPorNombre[campo]?.[codigo] ?? mensajesDeCampo[codigo];
}
