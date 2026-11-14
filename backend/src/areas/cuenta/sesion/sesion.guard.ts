import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import type { PeticionConAlumno } from '../../../comun/decoradores/alumno-actual';
import { RUTA_PERMITIDA_CON_ACEPTACION_PENDIENTE } from '../../../comun/decoradores/permitida-con-aceptacion-pendiente';
import { RUTA_PUBLICA } from '../../../comun/decoradores/publica';
import { ErrorApi } from '../../../comun/errores/error-api';
import { aIsoUtc } from '../../../comun/utilidades/fechas';
import {
  esCodigoBienFormado,
  huellaDeCodigo,
} from '../../../infraestructura/seguridad/codigos';
import { borrarCookieSesion, leerCookieSesion } from './cookie-sesion';
import { SesionService } from './sesion.service';

/**
 * Guardia global de sesión (DEC-12, DEC-85). Toda ruta exige una sesión válida, salvo las marcadas con @Publica.
 * - Renueva la sesión en cada petición y manda X-Sesion-Expira en la respuesta.
 * - Sin sesión válida responde 401 NO_AUTENTICADO; si la petición traía la cookie, además la borra.
 * - Con el aviso o los términos vigentes sin aceptar responde 403 ACEPTACION_PENDIENTE, salvo en las rutas
 *   marcadas con @PermitidaConAceptacionPendiente.
 */
@Injectable()
export class SesionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sesiones: SesionService,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const destinos = [contexto.getHandler(), contexto.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(RUTA_PUBLICA, destinos)) {
      return true;
    }

    const http = contexto.switchToHttp();
    const peticion = http.getRequest<PeticionConAlumno>();
    const respuesta = http.getResponse<Response>();

    const codigo = leerCookieSesion(peticion);
    const alumno = esCodigoBienFormado(codigo)
      ? await this.sesiones.validarYRenovar(huellaDeCodigo(codigo))
      : null;

    if (!alumno) {
      if (codigo !== null) borrarCookieSesion(respuesta);
      throw new ErrorApi('NO_AUTENTICADO');
    }

    peticion.alumno = alumno;
    respuesta.setHeader('X-Sesion-Expira', aIsoUtc(alumno.expiraEn));

    const pendiente =
      alumno.aceptacionPendiente.aviso || alumno.aceptacionPendiente.terminos;
    if (
      pendiente &&
      !this.reflector.getAllAndOverride<boolean>(
        RUTA_PERMITIDA_CON_ACEPTACION_PENDIENTE,
        destinos,
      )
    ) {
      throw new ErrorApi('ACEPTACION_PENDIENTE');
    }
    return true;
  }
}
