import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  FORMATO_CORREO,
  normalizarCorreo,
  recortar,
} from '../utilidades/correo';

/**
 * Reglas de los campos de entrada que se repiten en la cuenta, con los códigos de campo de docs/api/openapi.yaml.
 * Un campo vacío siempre sale como OBLIGATORIO (o CASILLA_OBLIGATORIA en las casillas).
 */

/** Texto obligatorio de 1 a `maximo` caracteres, sin espacios en los extremos (nombre, apellidos). */
export const CampoTexto = (maximo = 100) =>
  applyDecorators(
    Transform(({ value }: { value: unknown }) => recortar(value)),
    IsString(),
    Length(1, maximo),
  );

/** Correo normalizado (DEC-60) con forma válida y 254 caracteres como máximo. */
export const CampoCorreo = () =>
  applyDecorators(
    Transform(({ value }: { value: unknown }) => normalizarCorreo(value)),
    IsString(),
    MaxLength(254),
    Matches(FORMATO_CORREO),
  );

/** Contraseña nueva (DEC-25): de 8 a 200 caracteres con al menos una letra y un número. */
export const CampoContrasenaNueva = () =>
  applyDecorators(
    IsString(),
    Matches(/^(?=.*\p{L})(?=.*\d)[\s\S]{8,200}$/u, {
      context: { codigo: 'CONTRASENA_DEBIL' },
    }),
  );

/** Contraseña que se compara con la guardada: no se valida su forma, solo que venga. */
export const CampoContrasenaActual = () =>
  applyDecorators(IsString(), Length(1, 200));

/** Versión de un documento legal, como «1.0». */
export const CampoVersion = () =>
  applyDecorators(IsString(), Matches(/^[0-9]+\.[0-9]+$/));

/** Casilla que debe venir marcada (aviso, términos, mayoría de edad). */
export const CampoCasillaObligatoria = () =>
  applyDecorators(Equals(true, { context: { codigo: 'CASILLA_OBLIGATORIA' } }));

/** Casilla opcional: si viene, debe ser booleana. */
export const CampoBooleanoOpcional = () =>
  applyDecorators(IsOptional(), IsBoolean());

/** Código de un enlace de correo, tal como llega en la URL. */
export const CampoCodigoEnlace = () =>
  applyDecorators(IsString(), Length(1, 200));
