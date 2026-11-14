import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { LimitePorIp } from '../../../comun/decoradores/limite-por-ip';
import { Publica } from '../../../comun/decoradores/publica';
import { entregarSesion } from '../sesion/entregar-sesion';
import type { SesionSalida } from '../sesion/sesion.dto';
import { SesionService } from '../sesion/sesion.service';
import {
  CodigoEnlaceEntrada,
  CorreoEntrada,
  RegistroEntrada,
} from './registro.dto';
import { RegistroService } from './registro.service';

/** Registro con correo y verificación (OP-01, OP-02). REQUIERE REVISIÓN HUMANA. */
@Controller('cuenta')
export class RegistroController {
  constructor(
    private readonly registro: RegistroService,
    private readonly sesiones: SesionService,
  ) {}

  /** registrarCuenta: siempre 202, exista o no una cuenta con ese correo (DEC-77). */
  @Post('registro')
  @HttpCode(202)
  @Publica()
  @LimitePorIp()
  async registrar(
    @Body() entrada: RegistroEntrada,
    @Req() peticion: Request,
  ): Promise<void> {
    await this.registro.registrar(entrada, peticion);
  }

  /** verificarCorreo: activa la cuenta e inicia la sesión. */
  @Post('verificacion')
  @HttpCode(200)
  @Publica()
  async verificar(
    @Body() entrada: CodigoEnlaceEntrada,
    @Req() peticion: Request,
    @Res({ passthrough: true }) respuesta: Response,
  ): Promise<SesionSalida> {
    const sesion = await this.registro.verificar(entrada.codigo, peticion);
    return entregarSesion(this.sesiones, respuesta, sesion);
  }

  /** reenviarVerificacion: siempre 202 (DEC-77). */
  @Post('verificacion/reenvio')
  @HttpCode(202)
  @Publica()
  @LimitePorIp()
  async reenviar(@Body() entrada: CorreoEntrada): Promise<void> {
    await this.registro.reenviar(entrada.correo);
  }
}
