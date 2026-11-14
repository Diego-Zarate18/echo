import { Global, Module } from '@nestjs/common';
import { CONFIGURACION, leerConfiguracion } from './configuracion';

/** Expone la configuración validada a todo el servidor. Se lee una sola vez al arrancar. */
@Global()
@Module({
  providers: [
    { provide: CONFIGURACION, useFactory: () => leerConfiguracion() },
  ],
  exports: [CONFIGURACION],
})
export class ConfiguracionModule {}
