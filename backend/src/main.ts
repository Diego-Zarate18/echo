import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { CONFIGURACION } from './infraestructura/configuracion/configuracion';
import type { Configuracion } from './infraestructura/configuracion/configuracion';

async function iniciar(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configuracion = app.get<Configuracion>(CONFIGURACION);

  // Todas las rutas cuelgan de /api: el frontend las reescribe hacia este servidor (DEC-85).
  app.setGlobalPrefix('api');
  app.disable('x-powered-by');
  // La IP del cliente se calcula con PROXIES_CONFIABLES (DEC-92), no con «trust proxy» de Express.
  app.set('trust proxy', false);
  // Las respuestas llevan datos del alumno: ningún intermediario debe guardarlas.
  app.use(
    (_peticion: Request, respuesta: Response, siguiente: NextFunction) => {
      respuesta.setHeader('Cache-Control', 'no-store');
      siguiente();
    },
  );
  // Cierra la conexión con la base cuando la plataforma detiene el proceso.
  app.enableShutdownHooks();

  await app.listen(configuracion.puerto);
}

void iniciar();
