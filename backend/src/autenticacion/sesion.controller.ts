import {
  Controller,
  Delete,
  Get,
  Headers,
  Post,
  Res,
  HttpCode,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { SesionService } from './sesion.service.js';

@Controller()
export class SesionController {
  constructor(private readonly sesiones: SesionService) {}

  @Get('sesion')
  async obtener(@Headers('cookie') cookie: string | undefined) {
    return this.sesiones.obtener(this.leerCookie(cookie));
  }

  @Post('sesion/renovar')
  async renovar(
    @Headers('cookie') cookie: string | undefined,
    @Res({ passthrough: true }) respuesta: Response,
  ) {
    return this.sesiones.renovar(this.leerCookie(cookie), respuesta);
  }

  @Delete('sesion')
  @HttpCode(204)
  async cerrar(
    @Headers('cookie') cookie: string | undefined,
    @Res({ passthrough: true }) respuesta: Response,
  ): Promise<void> {
    await this.sesiones.cerrar(this.leerCookie(cookie), respuesta);
  }

  @Delete('sesiones')
  @HttpCode(204)
  async cerrarTodas(
    @Headers('cookie') cookie: string | undefined,
    @Res({ passthrough: true }) respuesta: Response,
  ): Promise<void> {
    const usuarioId = await this.sesiones.obtenerUsuarioId(
      this.leerCookie(cookie),
    );
    await this.sesiones.cerrarTodas(usuarioId, respuesta);
  }

  private leerCookie(cabecera: string | undefined): string {
    const cookie = cabecera
      ?.split(';')
      .map((parte) => parte.trim())
      .find((parte) => parte.startsWith('__Host-echo_sesion='));
    const valor = cookie?.slice('__Host-echo_sesion='.length);

    if (!valor) {
      throw new UnauthorizedException('Falta la sesión.');
    }

    return valor;
  }
}
