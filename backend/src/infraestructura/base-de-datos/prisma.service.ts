import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import { CONFIGURACION } from '../configuracion/configuracion';
import type { Configuracion } from '../configuracion/configuracion';

/**
 * Cliente de Prisma del servidor. Se conecta con DATABASE_URL (rol echo_app).
 * Al arrancar comprueba que el rol sea echo_app (INV-09) y que la sesión esté en UTC (INV-03).
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(@Inject(CONFIGURACION) configuracion: Configuracion) {
    super({
      adapter: new PrismaPg({
        connectionString: configuracion.urlBaseDatos,
        // El adaptador de Prisma lee los timestamptz como si la sesión estuviera en UTC: descarta el
        // desfase que manda PostgreSQL. Con otra zona en la sesión, todas las fechas saldrían corridas.
        options: '-c timezone=UTC',
      }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    const [sesion] = await this.$queryRaw<
      { esperado: boolean; zona: string }[]
    >`
      SELECT (rolname = 'echo_app' AND NOT (rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb)) AS esperado,
             current_setting('TimeZone') AS zona
      FROM pg_roles WHERE rolname = current_user`;
    if (!sesion?.esperado) {
      await this.$disconnect();
      throw new Error(
        'DATABASE_URL debe usar el rol echo_app: el servidor nunca se conecta con otro rol (INV-09)',
      );
    }
    if (sesion.zona !== 'UTC') {
      await this.$disconnect();
      throw new Error(
        'La sesión con la base debe estar en UTC: quita el parámetro «options» de DATABASE_URL',
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
