import { Module } from '@nestjs/common';
import { CuestionariosModule } from '../cuestionarios/cuestionarios.module';
import { ExamenController } from './examen.controller';
import { ExamenService } from './examen.service';

/** Área de examen (MOD-EXAMEN): portada, intentos, respuestas y envío. */
@Module({
  imports: [CuestionariosModule],
  controllers: [ExamenController],
  providers: [ExamenService],
})
export class ExamenModule {}
