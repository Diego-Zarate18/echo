import { ErrorApi } from '../../comun/errores/error-api';
import type { CodigoError } from '../../comun/errores/error-api';

/**
 * Traduce los errores de negocio que lanzan las funciones y los triggers de la base (SQLSTATE EC4xx) al error de
 * la API. Los códigos y el significado de DETAIL están en la migración logica_intentos.
 */
const CODIGO_POR_SQLSTATE: Record<string, CodigoError> = {
  EC400: 'DATOS_INVALIDOS',
  EC403: 'BLOQUEADO_POR_AVANCE',
  EC404: 'NO_ENCONTRADO',
  EC409: 'EN_ESPERA',
  EC410: 'EXAMEN_APROBADO',
  EC411: 'INTENTO_CERRADO',
  EC422: 'RESPUESTAS_INCOMPLETAS',
};

interface ErrorPostgres {
  code: string;
  detail?: string;
}

/**
 * Busca el error de PostgreSQL dentro del error de Prisma. El adaptador pg lo deja en
 * meta.driverAdapterError.cause con kind = 'postgres', el SQLSTATE en code y el DETAIL en detail.
 */
function extraerErrorPostgres(error: unknown): ErrorPostgres | null {
  let actual: unknown = error;
  for (
    let nivel = 0;
    nivel < 5 && actual && typeof actual === 'object';
    nivel++
  ) {
    const objeto = actual as Record<string, unknown>;
    if (objeto.kind === 'postgres' && typeof objeto.code === 'string') {
      return {
        code: objeto.code,
        detail: typeof objeto.detail === 'string' ? objeto.detail : undefined,
      };
    }
    const meta = objeto.meta as Record<string, unknown> | undefined;
    actual = meta?.driverAdapterError ?? objeto.cause;
  }
  return null;
}

/** Devuelve el ErrorApi equivalente, o null si el error no es uno de negocio de la base. */
export function traducirErrorBd(
  error: unknown,
  ahora = new Date(),
): ErrorApi | null {
  const errorPostgres = extraerErrorPostgres(error);
  if (!errorPostgres) return null;
  const codigo = CODIGO_POR_SQLSTATE[errorPostgres.code];
  if (!codigo) return null;

  if (codigo === 'EN_ESPERA') {
    const disponible = new Date(errorPostgres.detail ?? '');
    if (Number.isNaN(disponible.getTime())) return new ErrorApi(codigo);
    const minutos = Math.ceil(
      (disponible.getTime() - ahora.getTime()) / 60_000,
    );
    return new ErrorApi(codigo, {
      disponibleEn: disponible.toISOString(),
      minutosRestantes: Math.max(1, minutos),
    });
  }

  if (codigo === 'RESPUESTAS_INCOMPLETAS') {
    const pendientes = (errorPostgres.detail ?? '')
      .split(',')
      .map((texto) => Number(texto.trim()))
      .filter((numero) => Number.isSafeInteger(numero) && numero > 0);
    return new ErrorApi(codigo, { preguntasPendientes: pendientes });
  }

  return new ErrorApi(codigo);
}

/** Ejecuta una operación contra la base y convierte sus errores de negocio en ErrorApi. */
export async function conErroresDeBd<T>(
  operacion: () => Promise<T>,
): Promise<T> {
  try {
    return await operacion();
  } catch (error) {
    throw traducirErrorBd(error) ?? error;
  }
}
