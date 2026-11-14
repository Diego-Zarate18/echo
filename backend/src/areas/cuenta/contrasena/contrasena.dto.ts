import {
  CampoCodigoEnlace,
  CampoContrasenaNueva,
} from '../../../comun/decoradores/campos';

/** RestablecimientoEntrada (OP-07). */
export class RestablecimientoEntrada {
  @CampoCodigoEnlace()
  codigo!: string;

  @CampoContrasenaNueva()
  contrasena!: string;
}
