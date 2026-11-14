import { ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { ErrorApi } from './error-api';
import type { CodigoCampo } from './error-api';

/**
 * Validación de los cuerpos de entrada. Los errores salen como 422 DATOS_INVALIDOS con `campos`:
 * campo del cuerpo en camelCase → CodigoCampo. Las propiedades que el DTO no declara se descartan.
 *
 * El código de cada campo se deduce de la regla que falló. Para los que no se pueden deducir
 * (CONTRASENA_DEBIL, CASILLA_OBLIGATORIA) la regla lo declara: `@Equals(true, { context: { codigo: 'CASILLA_OBLIGATORIA' } })`.
 */
const REGLAS_DE_LONGITUD = new Set([
  'maxLength',
  'minLength',
  'isLength',
  'arrayMinSize',
  'arrayMaxSize',
]);
const REGLAS_DE_TIPO = new Set([
  'isString',
  'isBoolean',
  'isInt',
  'isNumber',
  'isArray',
  'isObject',
]);
const REGLAS_DE_RANGO = new Set(['min', 'max', 'isIn', 'isEnum', 'isPositive']);

function codigoDelCampo(error: ValidationError): CodigoCampo {
  const reglas = Object.keys(error.constraints ?? {});
  const declarados = reglas
    .map(
      (regla) =>
        (error.contexts?.[regla] as { codigo?: CodigoCampo } | undefined)
          ?.codigo,
    )
    .filter((codigo): codigo is CodigoCampo => codigo !== undefined);

  const vacio =
    error.value === undefined || error.value === null || error.value === '';
  if (vacio) {
    return declarados.includes('CASILLA_OBLIGATORIA')
      ? 'CASILLA_OBLIGATORIA'
      : 'OBLIGATORIO';
  }
  if (reglas.some((regla) => REGLAS_DE_TIPO.has(regla))) {
    return 'FORMATO_INVALIDO';
  }
  const medible = typeof error.value === 'string' || Array.isArray(error.value);
  if (medible && reglas.some((regla) => REGLAS_DE_LONGITUD.has(regla))) {
    return 'LONGITUD_INVALIDA';
  }
  if (declarados.length > 0) return declarados[0];
  if (reglas.some((regla) => REGLAS_DE_RANGO.has(regla)))
    return 'FUERA_DE_RANGO';
  return 'FORMATO_INVALIDO';
}

function reunirCampos(
  errores: ValidationError[],
  prefijo: string,
  campos: Record<string, CodigoCampo>,
): void {
  for (const error of errores) {
    const ruta = prefijo ? `${prefijo}.${error.property}` : error.property;
    if (error.constraints && Object.keys(error.constraints).length > 0) {
      campos[ruta] = codigoDelCampo(error);
    }
    if (error.children?.length) reunirCampos(error.children, ruta, campos);
  }
}

export function crearTuberiaDeValidacion(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    transform: true,
    validationError: { target: false },
    exceptionFactory: (errores: ValidationError[]) => {
      const campos: Record<string, CodigoCampo> = {};
      reunirCampos(errores, '', campos);
      return new ErrorApi('DATOS_INVALIDOS', { campos });
    },
  });
}
