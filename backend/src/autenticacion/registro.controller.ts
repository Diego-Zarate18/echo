import { Body, Controller, Ip, Post, HttpCode } from '@nestjs/common';
import type { RegistroEntrada } from './registro.dto.js';
import { RegistroService } from './registro.service.js';

@Controller('cuenta')
export class RegistroController {
  constructor(private readonly registro: RegistroService) {}

  @Post('registro')
  @HttpCode(202)
  registrar(
    @Body() entrada: RegistroEntrada,
    @Ip() direccionIp: string,
  ): Promise<{ mensaje: string }> {
    return this.registro.registrar(entrada, direccionIp);
  }
}
