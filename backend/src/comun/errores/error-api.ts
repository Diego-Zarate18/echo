/**
 * Errores de la API con la lista cerrada de códigos de docs/api/openapi.yaml (CodigoError) y su estado HTTP
 * (tabla de docs/api/README.md). La respuesta siempre tiene la forma { codigo, mensaje, ...extras } (DEC-85).
 * `mensaje` es texto técnico para registros: el frontend nunca lo muestra.
 */
export const ESTADO_POR_CODIGO = {
  NO_AUTENTICADO: 401,
  CREDENCIALES_INVALIDAS: 401,
  CORREO_SIN_VERIFICAR: 403,
  ENLACE_INVALIDO: 400,
  CONTRASENA_INCORRECTA: 403,
  REINGRESO_REQUERIDO: 403,
  REGISTRO_GOOGLE_VENCIDO: 401,
  NO_DISPONIBLE_CON_GOOGLE: 409,
  DATOS_INVALIDOS: 422,
  RESPUESTAS_INCOMPLETAS: 422,
  NO_ENCONTRADO: 404,
  BLOQUEADO_POR_AVANCE: 403,
  EN_ESPERA: 409,
  EXAMEN_APROBADO: 409,
  INTENTO_CERRADO: 409,
  ORIGEN_NO_PERMITIDO: 403,
  DEMASIADAS_SOLICITUDES: 429,
  ACEPTACION_PENDIENTE: 403,
  VERSION_NO_VIGENTE: 409,
  ERROR_INTERNO: 500,
} as const;

export type CodigoError = keyof typeof ESTADO_POR_CODIGO;

export type CodigoCampo =
  | 'OBLIGATORIO'
  | 'FORMATO_INVALIDO'
  | 'LONGITUD_INVALIDA'
  | 'CONTRASENA_DEBIL'
  | 'CASILLA_OBLIGATORIA'
  | 'FUERA_DE_RANGO';

export interface ExtrasError {
  /** Solo en DATOS_INVALIDOS: campo del cuerpo en camelCase → motivo. */
  campos?: Record<string, CodigoCampo>;
  /** Solo en EN_ESPERA. */
  minutosRestantes?: number;
  disponibleEn?: string;
  /** Solo en RESPUESTAS_INCOMPLETAS. */
  preguntasPendientes?: number[];
  /** Solo en ENLACE_INVALIDO. */
  motivo?: 'vencido' | 'usado';
}

const MENSAJES: Record<CodigoError, string> = {
  NO_AUTENTICADO: 'Sin sesión o sesión vencida',
  CREDENCIALES_INVALIDAS: 'Credenciales inválidas',
  CORREO_SIN_VERIFICAR: 'Correo sin verificar',
  ENLACE_INVALIDO: 'Enlace inválido',
  CONTRASENA_INCORRECTA: 'Contraseña actual incorrecta',
  REINGRESO_REQUERIDO: 'Se requiere volver a entrar con Google',
  REGISTRO_GOOGLE_VENCIDO: 'El registro con Google venció',
  NO_DISPONIBLE_CON_GOOGLE: 'No disponible para cuentas de Google',
  DATOS_INVALIDOS: 'Datos inválidos',
  RESPUESTAS_INCOMPLETAS: 'Faltan respuestas',
  NO_ENCONTRADO: 'No encontrado',
  BLOQUEADO_POR_AVANCE: 'Bloqueado por el avance lineal',
  EN_ESPERA: 'Aún no termina la espera tras reprobar',
  EXAMEN_APROBADO: 'El examen ya está aprobado',
  INTENTO_CERRADO: 'El intento ya se envió',
  ORIGEN_NO_PERMITIDO: 'Origen no permitido',
  DEMASIADAS_SOLICITUDES: 'Demasiadas solicitudes',
  ACEPTACION_PENDIENTE: 'Hay documentos por aceptar',
  VERSION_NO_VIGENTE: 'La versión aceptada ya no es la vigente',
  ERROR_INTERNO: 'Error interno',
};

export class ErrorApi extends Error {
  readonly estado: number;

  constructor(
    readonly codigo: CodigoError,
    readonly extras: ExtrasError = {},
    /** Segundos para el encabezado Retry-After (solo en DEMASIADAS_SOLICITUDES). */
    readonly reintentarEnSegundos?: number,
    mensaje?: string,
  ) {
    super(mensaje ?? MENSAJES[codigo]);
    this.name = 'ErrorApi';
    this.estado = ESTADO_POR_CODIGO[codigo];
  }

  cuerpo(): { codigo: CodigoError; mensaje: string } & ExtrasError {
    return { codigo: this.codigo, mensaje: this.message, ...this.extras };
  }
}
