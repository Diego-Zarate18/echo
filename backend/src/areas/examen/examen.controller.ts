import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AlumnoActual } from '../../comun/decoradores/alumno-actual';
import type { AlumnoSesion } from '../../comun/decoradores/alumno-actual';
import { ErrorApi } from '../../comun/errores/error-api';
import { ExamenService } from './examen.service';

const FORMATO_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Un id numérico de la ruta: entero positivo; cualquier otra cosa no existe. */
function idNumerico(texto: string): number {
  if (!/^[1-9]\d{0,17}$/.test(texto)) throw new ErrorApi('NO_ENCONTRADO');
  const id = Number(texto);
  if (!Number.isSafeInteger(id)) throw new ErrorApi('NO_ENCONTRADO');
  return id;
}

function idIntento(texto: string): string {
  if (!FORMATO_UUID.test(texto)) throw new ErrorApi('NO_ENCONTRADO');
  return texto.toLowerCase();
}

/** Exámenes (OP-24 a OP-27). Piden sesión y aceptación al día. */
@Controller()
export class ExamenController {
  constructor(private readonly examenes: ExamenService) {}

  /** obtenerPortadaExamen (OP-24). */
  @Get('examenes/:cuestionario')
  portada(
    @AlumnoActual() alumno: AlumnoSesion,
    @Param('cuestionario') id: string,
  ) {
    return this.examenes.portada(alumno.usuarioId, idNumerico(id));
  }

  /** iniciarIntentoExamen (OP-25): 201 si el intento es nuevo, 200 si se retoma. */
  @Post('examenes/:cuestionario/intentos')
  async iniciar(
    @AlumnoActual() alumno: AlumnoSesion,
    @Param('cuestionario') id: string,
    @Res({ passthrough: true }) respuesta: Response,
  ) {
    const { retomado, intento } = await this.examenes.iniciar(
      alumno.usuarioId,
      idNumerico(id),
    );
    respuesta.status(retomado ? 200 : 201);
    return intento;
  }

  /** guardarRespuesta (OP-26). El cuerpo se valida en el servicio, según el tipo de pregunta. */
  @Put('intentos/:intento/respuestas/:pregunta')
  guardarRespuesta(
    @AlumnoActual() alumno: AlumnoSesion,
    @Param('intento') intento: string,
    @Param('pregunta') pregunta: string,
    @Body() cuerpo: unknown,
  ) {
    return this.examenes.guardarRespuesta(
      alumno.usuarioId,
      idIntento(intento),
      idNumerico(pregunta),
      cuerpo,
    );
  }

  /** enviarExamen (OP-27). */
  @Post('intentos/:intento/envio')
  @HttpCode(200)
  enviar(
    @AlumnoActual() alumno: AlumnoSesion,
    @Param('intento') intento: string,
  ) {
    return this.examenes.enviar(alumno.usuarioId, idIntento(intento));
  }
}
