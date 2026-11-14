import { Controller, Get, Param, Query } from '@nestjs/common';
import { AlumnoActual } from '../../comun/decoradores/alumno-actual';
import type { AlumnoSesion } from '../../comun/decoradores/alumno-actual';
import { ErrorApi } from '../../comun/errores/error-api';
import { ResultadosService } from './resultados.service';
import type { FiltrosResultados } from './resultados.service';

const FORMATO_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Mis resultados (OP-29, OP-30). Piden sesión y aceptación al día. */
@Controller('resultados')
export class ResultadosController {
  constructor(private readonly resultados: ResultadosService) {}

  /** listarResultados (OP-29). Los filtros se validan en el servicio (el módulo tiene que existir). */
  @Get()
  listar(
    @AlumnoActual() alumno: AlumnoSesion,
    @Query() filtros: FiltrosResultados,
  ) {
    return this.resultados.listar(alumno.usuarioId, filtros);
  }

  /** obtenerDetalleIntento (OP-30). */
  @Get(':intento')
  detalle(
    @AlumnoActual() alumno: AlumnoSesion,
    @Param('intento') intento: string,
  ) {
    if (!FORMATO_UUID.test(intento)) throw new ErrorApi('NO_ENCONTRADO');
    return this.resultados.detalle(alumno.usuarioId, intento.toLowerCase());
  }
}
