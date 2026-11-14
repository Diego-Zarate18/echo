import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';
import { normalizarCorreo } from '../../../comun/utilidades/correo';

/** CredencialesEntrada. Al iniciar sesión solo se exige que vengan: un formato raro es un correo que no existe. */
export class CredencialesEntrada {
  @Transform(({ value }: { value: unknown }) => normalizarCorreo(value))
  @IsString()
  @Length(1, 254)
  correo!: string;

  @IsString()
  @Length(1, 200)
  contrasena!: string;
}
