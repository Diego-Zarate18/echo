import { Module } from '@nestjs/common';
import { AccesoService } from './acceso.service';
import { SesionController } from './sesion.controller';
import { SesionService } from './sesion.service';

@Module({
  controllers: [SesionController],
  providers: [SesionService, AccesoService],
  exports: [SesionService],
})
export class SesionModule {}
