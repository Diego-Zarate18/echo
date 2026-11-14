import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { SesionGuard } from './areas/cuenta/sesion/sesion.guard';
import { SesionModule } from './areas/cuenta/sesion/sesion.module';
import { FiltroErrores } from './comun/errores/filtro-errores';
import { crearTuberiaDeValidacion } from './comun/errores/validacion';
import { LimitePorIpGuard } from './comun/guardias/limite-por-ip.guard';
import { OrigenGuard } from './comun/guardias/origen.guard';
import { BaseDeDatosModule } from './infraestructura/base-de-datos/base-de-datos.module';
import { ConfiguracionModule } from './infraestructura/configuracion/configuracion.module';
import { CorreoModule } from './infraestructura/correo/correo.module';
import { SeguridadModule } from './infraestructura/seguridad/seguridad.module';

@Module({
  imports: [
    ConfiguracionModule,
    BaseDeDatosModule,
    SeguridadModule,
    CorreoModule,
    SesionModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: FiltroErrores },
    { provide: APP_PIPE, useFactory: crearTuberiaDeValidacion },
    // Las guardias globales se ejecutan en este orden: origen, límite por IP y sesión.
    { provide: APP_GUARD, useClass: OrigenGuard },
    { provide: APP_GUARD, useClass: LimitePorIpGuard },
    { provide: APP_GUARD, useClass: SesionGuard },
  ],
})
export class AppModule {}
