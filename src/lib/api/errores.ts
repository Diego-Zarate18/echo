import type { components } from "./esquema";
import { mensajesDeError } from "./mensajes";

/** Códigos del contrato (lista cerrada de `CodigoError` en docs/api/openapi.yaml). */
export type CodigoError = components["schemas"]["CodigoError"];
export type CodigoCampo = components["schemas"]["CodigoCampo"];
/** `SIN_CONEXION` no viene de la API: es cuando la petición ni siquiera llegó. */
export type CodigoErrorCliente = CodigoError | "SIN_CONEXION";

export type ErrorApi = {
  /** Estado HTTP; 0 cuando no hubo respuesta. */
  estado: number;
  codigo: CodigoErrorCliente;
  /** Solo en DATOS_INVALIDOS: motivo por campo del cuerpo. */
  campos?: Partial<Record<string, CodigoCampo>>;
  /** Solo en EN_ESPERA. */
  minutosRestantes?: number;
  disponibleEn?: string;
  /** Solo en RESPUESTAS_INCOMPLETAS. */
  preguntasPendientes?: number[];
  /** Solo en ENLACE_INVALIDO: «vencido» (también el inexistente) o «usado». */
  motivo?: "vencido" | "usado";
};

/** Resultado sin excepciones: los errores esperados de la API son datos, no `throw`. */
export type Resultado<T> =
  | { ok: true; estado: number; datos: T; expiraEn: string | null }
  | { ok: false; error: ErrorApi };

const esCodigoConocido = (codigo: unknown): codigo is CodigoErrorCliente =>
  typeof codigo === "string" && Object.hasOwn(mensajesDeError, codigo);

/** Convierte una respuesta de la API en un `Resultado`. El mensaje técnico del backend se descarta (§3). */
export async function interpretarRespuesta<T>(respuesta: Response): Promise<Resultado<T>> {
  const expiraEn = respuesta.headers.get("x-sesion-expira");
  const esJson = respuesta.headers.get("content-type")?.includes("application/json") ?? false;
  if (respuesta.ok) {
    const datos = (esJson && respuesta.status !== 204 ? await respuesta.json() : null) as T;
    return { ok: true, estado: respuesta.status, datos, expiraEn };
  }
  const cuerpo: Record<string, unknown> | null = esJson ? await respuesta.json().catch(() => null) : null;
  const error: ErrorApi = {
    estado: respuesta.status,
    codigo: esCodigoConocido(cuerpo?.codigo) ? cuerpo.codigo : "ERROR_INTERNO",
  };
  if (cuerpo?.campos && typeof cuerpo.campos === "object") error.campos = cuerpo.campos as ErrorApi["campos"];
  if (typeof cuerpo?.minutosRestantes === "number") error.minutosRestantes = cuerpo.minutosRestantes;
  if (typeof cuerpo?.disponibleEn === "string") error.disponibleEn = cuerpo.disponibleEn;
  if (Array.isArray(cuerpo?.preguntasPendientes)) error.preguntasPendientes = cuerpo.preguntasPendientes as number[];
  if (cuerpo?.motivo === "vencido" || cuerpo?.motivo === "usado") error.motivo = cuerpo.motivo;
  return { ok: false, error };
}

export const sinConexion = (): Resultado<never> => ({ ok: false, error: { estado: 0, codigo: "SIN_CONEXION" } });
