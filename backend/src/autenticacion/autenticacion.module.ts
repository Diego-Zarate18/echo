import { Module } from '@nestjs/common';
import { CorreoService } from './correo.service.js';
import { RegistroController } from './registro.controller.js';
import { RegistroService } from './registro.service.js';
import { SeguridadService } from './seguridad.service.js';
import { SesionController } from './sesion.controller.js';
import { SesionService } from './sesion.service.js';

@Module({
  controllers: [RegistroController, SesionController],
  providers: [CorreoService, RegistroService, SeguridadService, SesionService],
  exports: [SeguridadService, SesionService],
})
export class AutenticacionModule {}
