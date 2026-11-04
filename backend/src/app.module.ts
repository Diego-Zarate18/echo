import { Module } from '@nestjs/common';
import { PrismaModule } from './base-de-datos/prisma.module.js';
import { SaludModule } from './salud/salud.module.js';

@Module({
  imports: [PrismaModule, SaludModule],
})
export class AppModule {}
