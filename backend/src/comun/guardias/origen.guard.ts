import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { CONFIGURACION } from '../../infraestructura/configuracion/configuracion';
import type { Configuracion } from '../../infraestructura/configuracion/configuracion';
import { ErrorApi } from '../errores/error-api';

const METODOS_DE_LECTURA = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Defensa contra CSRF (DEC-85): toda mutación debe traer el encabezado Origin del frontend. Sin el encabezado
 * también se rechaza: los navegadores siempre lo mandan en POST, PUT, PATCH y DELETE.
 */
@Injectable()
export class OrigenGuard implements CanActivate {
  constructor(
    @Inject(CONFIGURACION) private readonly configuracion: Configuracion,
  ) {}

  canActivate(contexto: ExecutionContext): boolean {
    const peticion = contexto.switchToHttp().getRequest<Request>();
    if (METODOS_DE_LECTURA.has(peticion.method)) return true;
    if (peticion.headers.origin !== this.configuracion.origenFrontend) {
      throw new ErrorApi('ORIGEN_NO_PERMITIDO');
    }
    return true;
  }
}
