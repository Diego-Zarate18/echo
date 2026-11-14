import { Module } from '@nestjs/common';
import { CuestionariosModule } from '../cuestionarios/cuestionarios.module';
import { ResultadosController } from './resultados.controller';
import { ResultadosService } from './resultados.service';

/** Área de resultados (MOD-RESULTADOS): historial de intentos y su detalle. */
@Module({
  imports: [CuestionariosModule],
  controllers: [ResultadosController],
  providers: [ResultadosService],
})
export class ResultadosModule {}
