import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Inject,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { traducirErrorBd } from '../../infraestructura/base-de-datos/errores-bd';
import { CONFIGURACION } from '../../infraestructura/configuracion/configuracion';
import type { Configuracion } from '../../infraestructura/configuracion/configuracion';
import { ErrorApi } from './error-api';

/**
 * Convierte cualquier error en la respuesta { codigo, mensaje } del contrato (DEC-85).
 * Un error inesperado responde 500 ERROR_INTERNO sin detalles. En producción solo se registra el tipo de
 * error y dónde ocurrió, nunca su mensaje: los mensajes de Prisma pueden incluir datos de la consulta (INV-08).
 */
@Catch()
export class FiltroErrores implements ExceptionFilter {
  private readonly registro = new Logger('Errores');

  constructor(
    @Inject(CONFIGURACION) private readonly configuracion: Configuracion,
  ) {}

  catch(excepcion: unknown, anfitrion: ArgumentsHost): void {
    const http = anfitrion.switchToHttp();
    const peticion = http.getRequest<Request>();
    const respuesta = http.getResponse<Response>();
    const error = this.convertir(excepcion, peticion);

    if (respuesta.headersSent) return;
    if (error.reintentarEnSegundos !== undefined) {
      respuesta.setHeader('Retry-After', String(error.reintentarEnSegundos));
    }
    respuesta.status(error.estado).json(error.cuerpo());
  }

  private convertir(excepcion: unknown, peticion: Request): ErrorApi {
    if (excepcion instanceof ErrorApi) return excepcion;

    const deLaBase = traducirErrorBd(excepcion);
    if (deLaBase) return deLaBase;

    if (excepcion instanceof HttpException) {
      const estado = excepcion.getStatus();
      if (estado === 404 || estado === 405)
        return new ErrorApi('NO_ENCONTRADO');
      if (estado === 429) return new ErrorApi('DEMASIADAS_SOLICITUDES');
      // Cuerpo que no es JSON válido, demasiado grande o de otro tipo.
      if ([400, 413, 415, 422].includes(estado))
        return new ErrorApi('DATOS_INVALIDOS');
    }

    this.registrar(excepcion, peticion);
    return new ErrorApi('ERROR_INTERNO');
  }

  private registrar(excepcion: unknown, peticion: Request): void {
    const ruta =
      (peticion.route as { path?: string } | undefined)?.path ?? '(sin ruta)';
    const donde = `${peticion.method} ${ruta}`;
    if (!(excepcion instanceof Error)) {
      this.registro.error(`${donde}: error que no es de tipo Error`);
      return;
    }
    const codigo = (excepcion as { code?: unknown }).code;
    const resumen = `${donde}: ${excepcion.name}${typeof codigo === 'string' ? ` (${codigo})` : ''}`;
    if (this.configuracion.entorno === 'production') {
      const marcos = (excepcion.stack ?? '')
        .split('\n')
        .filter((linea) => linea.trimStart().startsWith('at '))
        .slice(0, 8)
        .join('\n');
      this.registro.error(resumen, marcos);
    } else {
      this.registro.error(resumen, excepcion.stack);
    }
  }
}
