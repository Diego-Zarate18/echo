import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

/**
 * AceptacionEntrada (OP-13). Todos los campos son opcionales aquí porque cada caso exige los suyos:
 * el registro con Google exige todo; la versión nueva, solo los documentos pendientes.
 */
export class AceptacionEntrada {
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]+\.[0-9]+$/)
  versionAviso?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]+\.[0-9]+$/)
  versionTerminos?: string;

  @IsOptional()
  @IsBoolean()
  aceptaAviso?: boolean;

  @IsOptional()
  @IsBoolean()
  aceptaTerminos?: boolean;

  @IsOptional()
  @IsBoolean()
  mayorDeEdad?: boolean;

  @IsOptional()
  @IsBoolean()
  negativaEncuesta?: boolean;

  @IsOptional()
  @IsBoolean()
  negativaEstadisticas?: boolean;
}
