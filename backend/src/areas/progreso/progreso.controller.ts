import { Controller, Get } from '@nestjs/common';
import { AlumnoActual } from '../../comun/decoradores/alumno-actual';
import type { AlumnoSesion } from '../../comun/decoradores/alumno-actual';
import { ProgresoService } from './progreso.service';

/** Mi progreso (OP-28). Pide sesión y aceptación al día. */
@Controller('progreso')
export class ProgresoController {
  constructor(private readonly progreso: ProgresoService) {}

  @Get()
  obtener(@AlumnoActual() alumno: AlumnoSesion) {
    return this.progreso.obtener(alumno.usuarioId);
  }
}
