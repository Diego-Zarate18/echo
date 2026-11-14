import {
  CampoBooleanoOpcional,
  CampoCasillaObligatoria,
  CampoCodigoEnlace,
  CampoContrasenaNueva,
  CampoCorreo,
  CampoTexto,
  CampoVersion,
} from '../../../comun/decoradores/campos';

/** RegistroEntrada (OP-01). */
export class RegistroEntrada {
  @CampoTexto()
  nombre!: string;

  /** Al menos el primer apellido (DEC-22). */
  @CampoTexto()
  apellidos!: string;

  @CampoCorreo()
  correo!: string;

  @CampoContrasenaNueva()
  contrasena!: string;

  @CampoVersion()
  versionAviso!: string;

  @CampoVersion()
  versionTerminos!: string;

  @CampoCasillaObligatoria()
  aceptaAviso!: boolean;

  @CampoCasillaObligatoria()
  aceptaTerminos!: boolean;

  /** DEC-89: solo personas de 18 años o más. */
  @CampoCasillaObligatoria()
  mayorDeEdad!: boolean;

  /** Finalidades secundarias (DEC-88): la casilla marcada es una negativa. */
  @CampoBooleanoOpcional()
  negativaEncuesta?: boolean;

  @CampoBooleanoOpcional()
  negativaEstadisticas?: boolean;
}

/** CodigoEnlaceEntrada. */
export class CodigoEnlaceEntrada {
  @CampoCodigoEnlace()
  codigo!: string;
}

/** CorreoEntrada. */
export class CorreoEntrada {
  @CampoCorreo()
  correo!: string;
}
