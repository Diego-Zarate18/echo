import { SetMetadata } from '@nestjs/common';

export const RUTA_PERMITIDA_CON_ACEPTACION_PENDIENTE =
  'ruta_permitida_con_aceptacion_pendiente';

/**
 * Ruta que responde aunque el alumno tenga pendiente aceptar el aviso o los términos vigentes. El resto de las
 * rutas con sesión responde 403 ACEPTACION_PENDIENTE hasta que acepte.
 */
export const PermitidaConAceptacionPendiente = () =>
  SetMetadata(RUTA_PERMITIDA_CON_ACEPTACION_PENDIENTE, true);
