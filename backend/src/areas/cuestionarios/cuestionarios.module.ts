import { Module } from '@nestjs/common';
import { CuestionariosService } from './cuestionarios.service';

/** Cuestionarios (DEC-104): compartido por evaluables y examen; sin controlador. */
@Module({
  providers: [CuestionariosService],
  exports: [CuestionariosService],
})
export class CuestionariosModule {}
