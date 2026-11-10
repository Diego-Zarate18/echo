// Configuración de Prisma 7 para las migraciones (la usa la CLI, no el servidor).
// Las migraciones se conectan como echo_migracion, que actúa como echo_propietario (prisma/sql/roles.sql).
// DATABASE_URL_SOMBRA solo existe en desarrollo: es la base que usa «prisma migrate dev» para
// aplicar todas las migraciones desde cero y compararlas con el esquema. Producción usa «migrate deploy».
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL_MIGRACION'],
    shadowDatabaseUrl: process.env['DATABASE_URL_SOMBRA'],
  },
});
