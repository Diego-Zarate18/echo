import type { Response } from 'express';
import { ErrorApi } from '../../../comun/errores/error-api';
import { aIsoUtc } from '../../../comun/utilidades/fechas';
import type { CodigoGenerado } from '../../../infraestructura/seguridad/codigos';
import { escribirCookieSesion } from './cookie-sesion';
import { aSesionSalida } from './sesion.dto';
import type { SesionSalida } from './sesion.dto';
import type { SesionService } from './sesion.service';

/**
 * Termina de abrir una sesión recién creada: pone la cookie y X-Sesion-Expira, y devuelve el cuerpo `Sesion`.
 * Se llama después de confirmar la transacción que creó la sesión.
 */
export async function entregarSesion(
  sesiones: SesionService,
  respuesta: Response,
  sesion: CodigoGenerado,
): Promise<SesionSalida> {
  const alumno = await sesiones.validarYRenovar(sesion.huella);
  if (!alumno) {
    // La sesión se acaba de crear para una cuenta activa: no debería pasar.
    throw new ErrorApi('ERROR_INTERNO');
  }
  escribirCookieSesion(respuesta, sesion.codigo);
  respuesta.setHeader('X-Sesion-Expira', aIsoUtc(alumno.expiraEn));
  return aSesionSalida(alumno);
}
