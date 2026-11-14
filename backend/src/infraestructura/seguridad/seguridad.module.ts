import { Global, Module } from '@nestjs/common';
import { CifradoService } from './cifrado.service';
import { ClaveOpacaService } from './clave-opaca.service';
import { ContrasenasService } from './contrasenas.service';
import { LimitePorIpService } from './limite-por-ip.service';

@Global()
@Module({
  providers: [
    ContrasenasService,
    ClaveOpacaService,
    LimitePorIpService,
    CifradoService,
  ],
  exports: [
    ContrasenasService,
    ClaveOpacaService,
    LimitePorIpService,
    CifradoService,
  ],
})
export class SeguridadModule {}
