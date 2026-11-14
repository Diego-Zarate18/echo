import { Global, Module } from '@nestjs/common';
import { ClaveOpacaService } from './clave-opaca.service';
import { ContrasenasService } from './contrasenas.service';
import { LimitePorIpService } from './limite-por-ip.service';

@Global()
@Module({
  providers: [ContrasenasService, ClaveOpacaService, LimitePorIpService],
  exports: [ContrasenasService, ClaveOpacaService, LimitePorIpService],
})
export class SeguridadModule {}
