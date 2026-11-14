import { Module } from '@nestjs/common';
import { ContenidoModule } from '../contenido/contenido.module';
import { ProgresoController } from './progreso.controller';
import { ProgresoService } from './progreso.service';

/** Área de progreso (MOD-PROGRESO). Importa el área de contenido por su árbol de avance (DEC-119). */
@Module({
  imports: [ContenidoModule],
  controllers: [ProgresoController],
  providers: [ProgresoService],
})
export class ProgresoModule {}
