import { Module } from '@nestjs/common';
import { ContenidoController } from './contenido.controller';
import { ContenidoService } from './contenido.service';

/** Área de contenido (MOD-CONTENIDO): módulos, cursos, lecciones, avance y búsqueda. */
@Module({
  controllers: [ContenidoController],
  providers: [ContenidoService],
  exports: [ContenidoService],
})
export class ContenidoModule {}
