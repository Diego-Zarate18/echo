import { Module } from '@nestjs/common';
import { CuestionariosModule } from '../cuestionarios/cuestionarios.module';
import { EvaluablesController } from './evaluables.controller';
import { EvaluablesService } from './evaluables.service';

/** Área de evaluables (MOD-EVALUABLES): actividades y casos prácticos. */
@Module({
  imports: [CuestionariosModule],
  controllers: [EvaluablesController],
  providers: [EvaluablesService],
})
export class EvaluablesModule {}
