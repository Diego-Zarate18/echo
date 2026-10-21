// Utilidades del simulador: ids, huellas, contraseñas, cookies cifradas, mezcla con semilla y errores.
// Solo usa módulos de Node (node:crypto); nada de esto entra al build de producción.
import crypto from "node:crypto";

/** Marca que la prueba de build busca en `.next`: si aparece, el simulador se coló en producción. */
export const MARCA_SIMULADOR = "SIMULADOR_ECHO_NO_PRODUCCION";

/** Secreto del proceso para las claves opacas de la relación de columnas y la cookie temporal de Google. */
const SECRETO = crypto.randomBytes(32);

/** UUID v7: 48 bits con los milisegundos de la hora y el resto aleatorio (como `uuidv7()` de PostgreSQL 18). */
export function uuidv7() {
  const bytes = crypto.randomBytes(16);
  const ms = BigInt(Date.now());
  for (let i = 0; i < 6; i++) bytes[i] = Number((ms >> BigInt(8 * (5 - i))) & 0xffn);
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Código aleatorio para la cookie de sesión y los enlaces de correo; solo se guarda su huella (INV-08). */
export function codigoAleatorio() {
  return crypto.randomBytes(32).toString("base64url");
}

/** Huella SHA-256 en hexadecimal. */
export function huella(texto) {
  return crypto.createHash("sha256").update(texto).digest("hex");
}

/**
 * Hash de contraseña. El backend usará Argon2id (DEC-72); aquí scrypt de node:crypto, porque el simulador no tiene
 * dependencias. Lo importante para las pruebas es que siempre se calcula uno, exista o no la cuenta (DEC-77).
 */
export function hashContrasena(contrasena, sal = crypto.randomBytes(16)) {
  const derivada = crypto.scryptSync(contrasena, sal, 32, { N: 16384, r: 8, p: 1 });
  return `${sal.toString("hex")}:${derivada.toString("hex")}`;
}

export function contrasenaCoincide(contrasena, hash) {
  const [salHex, derivadaHex] = hash.split(":");
  const calculada = crypto.scryptSync(contrasena, Buffer.from(salHex, "hex"), 32, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(calculada, Buffer.from(derivadaHex, "hex"));
}

/** Hash de relleno: se calcula cuando no hay cuenta para que el tiempo de respuesta no lo delate (DEC-77). */
const HASH_DE_RELLENO = hashContrasena("relleno-sin-cuenta-1");
export function compararConRelleno(contrasena) {
  contrasenaCoincide(String(contrasena ?? ""), HASH_DE_RELLENO);
  return false;
}

/** Clave opaca de un elemento derecho de la relación de columnas: no se puede comparar con el id izquierdo (INV-04). */
export function claveDerecha(usuarioId, preguntaId, parejaId) {
  return crypto.createHmac("sha256", SECRETO).update(`${usuarioId}:${preguntaId}:${parejaId}`).digest("base64url").slice(0, 16);
}

/** Cookie temporal de Google cifrada y firmada (AES-256-GCM), como pide DEC-28. */
const LLAVE_COOKIE = crypto.createHash("sha256").update(SECRETO).update("registro-google").digest();
export function cifrarCookie(datos) {
  const iv = crypto.randomBytes(12);
  const cifrador = crypto.createCipheriv("aes-256-gcm", LLAVE_COOKIE, iv);
  const cifrado = Buffer.concat([cifrador.update(JSON.stringify(datos), "utf8"), cifrador.final()]);
  return Buffer.concat([iv, cifrador.getAuthTag(), cifrado]).toString("base64url");
}
export function descifrarCookie(valor) {
  try {
    const bytes = Buffer.from(valor, "base64url");
    const descifrador = crypto.createDecipheriv("aes-256-gcm", LLAVE_COOKIE, bytes.subarray(0, 12));
    descifrador.setAuthTag(bytes.subarray(12, 28));
    return JSON.parse(Buffer.concat([descifrador.update(bytes.subarray(28)), descifrador.final()]).toString("utf8"));
  } catch {
    return null;
  }
}

/** Generador con semilla (mulberry32): el mismo intento siempre se mezcla igual (DEC-09). */
export function aleatorioConSemilla(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mezclar(lista, semilla) {
  const azar = aleatorioConSemilla(semilla);
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Semilla numérica estable a partir de un texto. */
export function semillaDe(texto) {
  return crypto.createHash("sha256").update(texto).digest().readUInt32BE(0);
}

export function semillaAleatoria() {
  return crypto.randomBytes(4).readUInt32BE(0) & 0x7fffffff;
}

/** Correo normalizado: sin espacios y en minúsculas (INV-12). */
export function normalizarCorreo(correo) {
  return typeof correo === "string" ? correo.trim().toLowerCase() : "";
}

export function correoValido(correo) {
  return correo.length > 0 && correo.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

/** 8 caracteres o más con al menos una letra y un número (DEC-25). */
export function contrasenaFuerte(contrasena) {
  return typeof contrasena === "string" && contrasena.length >= 8 && contrasena.length <= 200
    && /\p{L}/u.test(contrasena) && /\d/.test(contrasena);
}

/** Texto sin acentos y en minúsculas, para la búsqueda (DEC-32). */
export function sinAcentos(texto) {
  return String(texto ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** Redondeo a dos decimales (DEC-07). */
export function dosDecimales(numero) {
  return Math.round(numero * 100) / 100;
}

/** Error de la API con la forma del contrato: `{ codigo, mensaje }` y, según el código, datos extra. */
export class ErrorApi extends Error {
  constructor(estado, codigo, mensaje, extra = {}) {
    super(mensaje);
    this.estado = estado;
    this.codigo = codigo;
    this.extra = extra;
  }
}

export const errores = {
  noAutenticado: () => new ErrorApi(401, "NO_AUTENTICADO", "No hay una sesión válida."),
  credenciales: () => new ErrorApi(401, "CREDENCIALES_INVALIDAS", "Correo o contraseña no válidos."),
  sinVerificar: () => new ErrorApi(403, "CORREO_SIN_VERIFICAR", "El correo de la cuenta no está verificado."),
  enlaceInvalido: () => new ErrorApi(400, "ENLACE_INVALIDO", "El enlace no es válido, ya se usó o venció."),
  contrasenaIncorrecta: () => new ErrorApi(403, "CONTRASENA_INCORRECTA", "La contraseña actual no coincide."),
  reingresoRequerido: () => new ErrorApi(403, "REINGRESO_REQUERIDO", "Falta volver a entrar con Google."),
  registroGoogleVencido: () =>
    new ErrorApi(401, "REGISTRO_GOOGLE_VENCIDO", "La cookie temporal del registro con Google venció o no es válida."),
  noDisponibleConGoogle: () =>
    new ErrorApi(409, "NO_DISPONIBLE_CON_GOOGLE", "La operación no aplica a esta forma de acceso."),
  datosInvalidos: (campos) => new ErrorApi(422, "DATOS_INVALIDOS", "Hay campos con errores.", { campos }),
  respuestasIncompletas: (preguntasPendientes) =>
    new ErrorApi(422, "RESPUESTAS_INCOMPLETAS", "Faltan preguntas por responder.", { preguntasPendientes }),
  noEncontrado: () => new ErrorApi(404, "NO_ENCONTRADO", "No existe o no es tuyo."),
  bloqueado: () => new ErrorApi(403, "BLOQUEADO_POR_AVANCE", "Todavía no se desbloquea."),
  enEspera: (minutosRestantes, disponibleEn) =>
    new ErrorApi(409, "EN_ESPERA", "Hay que esperar para un nuevo intento.", { minutosRestantes, disponibleEn }),
  examenAprobado: () => new ErrorApi(409, "EXAMEN_APROBADO", "El examen ya está aprobado."),
  intentoCerrado: () => new ErrorApi(409, "INTENTO_CERRADO", "El intento ya se envió."),
  origen: () => new ErrorApi(403, "ORIGEN_NO_PERMITIDO", "El origen de la petición no está permitido."),
  demasiadas: (segundos) =>
    new ErrorApi(429, "DEMASIADAS_SOLICITUDES", "Demasiadas solicitudes desde esta dirección.", { segundos }),
  aceptacionPendiente: () =>
    new ErrorApi(403, "ACEPTACION_PENDIENTE", "Hay una versión nueva del aviso o los términos por aceptar."),
  versionNoVigente: () => new ErrorApi(409, "VERSION_NO_VIGENTE", "La versión aceptada ya no es la vigente."),
  interno: () => new ErrorApi(500, "ERROR_INTERNO", "Error inesperado del simulador."),
};
