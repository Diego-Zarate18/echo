import { Transform } from 'class-transformer';
import { IsInt, IsString, Length, Min } from 'class-validator';
import { recortar } from '../../comun/utilidades/correo';

/** SeccionVistaEntrada (OP-19). */
export class SeccionVistaEntrada {
  @IsInt()
  @Min(1)
  seccion!: number;
}

/** Parámetros de GET /api/busqueda (OP-21). */
export class BusquedaEntrada {
  @Transform(({ value }: { value: unknown }) => recortar(value))
  @IsString()
  @Length(1, 100)
  q!: string;
}
