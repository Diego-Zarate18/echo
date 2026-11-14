import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { LimitePorIp } from '../../../comun/decoradores/limite-por-ip';
import { Publica } from '../../../comun/decoradores/publica';
import { CorreoEntrada } from '../registro/registro.dto';
import { RestablecimientoEntrada } from './contrasena.dto';
import { ContrasenaService } from './contrasena.service';

/** Recuperación de la contraseña (OP-06, OP-07). REQUIERE REVISIÓN HUMANA. */
@Controller('contrasena')
export class ContrasenaController {
  constructor(private readonly contrasena: ContrasenaService) {}

  /** solicitarRecuperacion: siempre 202 (DEC-77). */
  @Post('recuperacion')
  @HttpCode(202)
  @Publica()
  @LimitePorIp()
  async solicitar(@Body() entrada: CorreoEntrada): Promise<void> {
    await this.contrasena.solicitar(entrada.correo);
  }

  /** restablecerContrasena: 204 y todas las sesiones cerradas. */
  @Post('restablecimiento')
  @HttpCode(204)
  @Publica()
  async restablecer(@Body() entrada: RestablecimientoEntrada): Promise<void> {
    await this.contrasena.restablecer(entrada.codigo, entrada.contrasena);
  }
}
