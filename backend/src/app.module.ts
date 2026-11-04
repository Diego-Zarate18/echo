import { Module } from '@nestjs/common';
import { AutenticacionModule } from './autenticacion/autenticacion.module.js';
import { PrismaModule } from './base-de-datos/prisma.module.js';
import { SaludModule } from './salud/salud.module.js';

@Module({
  imports: [AutenticacionModule, PrismaModule, SaludModule],
})
export class AppModule {}
