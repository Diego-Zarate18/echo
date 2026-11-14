import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  CampoCasillaObligatoria,
  CampoContrasenaActual,
  CampoContrasenaNueva,
  CampoCorreo,
  CampoTexto,
} from '../../../comun/decoradores/campos';

/** NombreEntrada (OP-09). */
export class NombreEntrada {
  @CampoTexto()
  nombre!: string;

  @CampoTexto()
  apellidos!: string;
}

/** PreferenciasEntrada (OP-39): al menos una de las dos. */
export class PreferenciasEntrada {
  @IsOptional()
  @IsBoolean()
  negativaEncuesta?: boolean;

  @IsOptional()
  @IsBoolean()
  negativaEstadisticas?: boolean;
}

/** CambioContrasenaEntrada (OP-10). */
export class CambioContrasenaEntrada {
  @CampoContrasenaActual()
  contrasenaActual!: string;

  @CampoContrasenaNueva()
  contrasenaNueva!: string;
}

/** CambioCorreoEntrada (OP-11). */
export class CambioCorreoEntrada {
  @CampoCorreo()
  correoNuevo!: string;

  @CampoContrasenaActual()
  contrasena!: string;
}

/** EliminacionEntrada (OP-14). La contraseña es obligatoria si la cuenta tiene; eso lo revisa el servicio. */
export class EliminacionEntrada {
  @CampoCasillaObligatoria()
  confirmacion!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contrasena?: string;
}
