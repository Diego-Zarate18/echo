import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../base-de-datos/prisma.service.js';

@Controller('salud')
export class SaludController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async consultar(): Promise<{ estado: string; baseDeDatos: string }> {
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      estado: 'correcto',
      baseDeDatos: 'conectada',
    };
  }
}
