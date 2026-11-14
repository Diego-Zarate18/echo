import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { AlumnoActual } from '../../comun/decoradores/alumno-actual';
import type { AlumnoSesion } from '../../comun/decoradores/alumno-actual';
import { BusquedaEntrada, SeccionVistaEntrada } from './contenido.dto';
import { ContenidoService } from './contenido.service';

/** Contenido y navegación (OP-15 a OP-21). Todas las rutas piden sesión y aceptación al día. */
@Controller()
export class ContenidoController {
  constructor(private readonly contenido: ContenidoService) {}

  /** listarModulos (OP-15). */
  @Get('modulos')
  listarModulos(@AlumnoActual() alumno: AlumnoSesion) {
    return this.contenido.listarModulos(alumno.usuarioId);
  }

  /** obtenerModulo (OP-16). */
  @Get('modulos/:modulo')
  obtenerModulo(
    @AlumnoActual() alumno: AlumnoSesion,
    @Param('modulo') slug: string,
  ) {
    return this.contenido.obtenerModulo(alumno.usuarioId, slug);
  }

  /** obtenerCurso (OP-17). */
  @Get('cursos/:curso')
  obtenerCurso(
    @AlumnoActual() alumno: AlumnoSesion,
    @Param('curso') slug: string,
  ) {
    return this.contenido.obtenerCurso(alumno.usuarioId, slug);
  }

  /** abrirLeccion (OP-18). */
  @Get('lecciones/:leccion')
  abrirLeccion(
    @AlumnoActual() alumno: AlumnoSesion,
    @Param('leccion') slug: string,
  ) {
    return this.contenido.abrirLeccion(alumno.usuarioId, slug);
  }

  /** guardarSeccionVista (OP-19). */
  @Put('lecciones/:leccion/seccion-vista')
  @HttpCode(204)
  async guardarSeccionVista(
    @AlumnoActual() alumno: AlumnoSesion,
    @Param('leccion') slug: string,
    @Body() entrada: SeccionVistaEntrada,
  ): Promise<void> {
    await this.contenido.guardarSeccionVista(
      alumno.usuarioId,
      slug,
      entrada.seccion,
    );
  }

  /** terminarLeccion (OP-20). */
  @Post('lecciones/:leccion/terminar')
  @HttpCode(200)
  terminarLeccion(
    @AlumnoActual() alumno: AlumnoSesion,
    @Param('leccion') slug: string,
  ) {
    return this.contenido.terminarLeccion(alumno.usuarioId, slug);
  }

  /** buscar (OP-21). */
  @Get('busqueda')
  buscar(
    @AlumnoActual() alumno: AlumnoSesion,
    @Query() entrada: BusquedaEntrada,
  ) {
    return this.contenido.buscar(alumno.usuarioId, entrada.q);
  }
}
