import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { AlumnoActual } from '../../comun/decoradores/alumno-actual';
import type { AlumnoSesion } from '../../comun/decoradores/alumno-actual';
import { ErrorApi } from '../../comun/errores/error-api';
import { EvaluablesService } from './evaluables.service';

/** El id del cuestionario: un entero positivo; cualquier otra cosa no existe. */
function idCuestionario(texto: string): number {
  if (!/^[1-9]\d{0,17}$/.test(texto)) throw new ErrorApi('NO_ENCONTRADO');
  const id = Number(texto);
  if (!Number.isSafeInteger(id)) throw new ErrorApi('NO_ENCONTRADO');
  return id;
}

/** Actividades y casos prácticos (OP-22, OP-23). Piden sesión y aceptación al día. */
@Controller('actividades')
export class EvaluablesController {
  constructor(private readonly evaluables: EvaluablesService) {}

  /** abrirActividad (OP-22). */
  @Get(':cuestionario')
  abrir(
    @AlumnoActual() alumno: AlumnoSesion,
    @Param('cuestionario') id: string,
  ) {
    return this.evaluables.abrir(alumno.usuarioId, idCuestionario(id));
  }

  /**
   * enviarActividad (OP-23). El cuerpo se valida en el servicio, contra las preguntas del cuestionario: sus
   * respuestas tienen formas distintas según el tipo de pregunta.
   */
  @Post(':cuestionario/envios')
  @HttpCode(200)
  enviar(
    @AlumnoActual() alumno: AlumnoSesion,
    @Param('cuestionario') id: string,
    @Body() cuerpo: unknown,
  ) {
    return this.evaluables.enviar(alumno.usuarioId, idCuestionario(id), cuerpo);
  }
}
