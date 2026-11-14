import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { AlumnoActual } from '../../../comun/decoradores/alumno-actual';
import type { AlumnoSesion } from '../../../comun/decoradores/alumno-actual';
import { PermitidaConAceptacionPendiente } from '../../../comun/decoradores/permitida-con-aceptacion-pendiente';
import { aSesionSalida } from './sesion.dto';
import type { SesionSalida } from './sesion.dto';

/**
 * OP-31. La guardia de sesión ya validó y renovó la sesión antes de llegar aquí, así que las dos rutas solo
 * devuelven sus datos. No responden ACEPTACION_PENDIENTE: indican qué documentos faltan por aceptar.
 */
@Controller()
export class SesionController {
  /** obtenerSesion: validar la sesión y saber si hay una aceptación pendiente. */
  @Get('sesion')
  @PermitidaConAceptacionPendiente()
  obtener(@AlumnoActual() alumno: AlumnoSesion): SesionSalida {
    return aSesionSalida(alumno);
  }

  /** renovarSesion: «Seguir conectado». */
  @Post('sesion/renovar')
  @HttpCode(200)
  @PermitidaConAceptacionPendiente()
  renovar(@AlumnoActual() alumno: AlumnoSesion): SesionSalida {
    return aSesionSalida(alumno);
  }
}
