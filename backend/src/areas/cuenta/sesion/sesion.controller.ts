import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AlumnoActual } from '../../../comun/decoradores/alumno-actual';
import type { AlumnoSesion } from '../../../comun/decoradores/alumno-actual';
import { LimitePorIp } from '../../../comun/decoradores/limite-por-ip';
import { PermitidaConAceptacionPendiente } from '../../../comun/decoradores/permitida-con-aceptacion-pendiente';
import { Publica } from '../../../comun/decoradores/publica';
import { CredencialesEntrada } from './acceso.dto';
import { AccesoService } from './acceso.service';
import { borrarCookieSesion } from './cookie-sesion';
import { entregarSesion } from './entregar-sesion';
import { aSesionSalida } from './sesion.dto';
import type { SesionSalida } from './sesion.dto';
import { SesionService } from './sesion.service';

/**
 * Sesión del alumno (OP-04, OP-05, OP-31). La guardia global ya validó y renovó la sesión en las rutas que la
 * piden. Ninguna de estas rutas responde ACEPTACION_PENDIENTE.
 */
@Controller()
export class SesionController {
  constructor(
    private readonly acceso: AccesoService,
    private readonly sesiones: SesionService,
  ) {}

  /** obtenerSesion: validar la sesión y saber si hay una aceptación pendiente. */
  @Get('sesion')
  @PermitidaConAceptacionPendiente()
  obtener(@AlumnoActual() alumno: AlumnoSesion): SesionSalida {
    return aSesionSalida(alumno);
  }

  /** iniciarSesion (OP-04). REQUIERE REVISIÓN HUMANA. */
  @Post('sesion')
  @HttpCode(200)
  @Publica()
  @LimitePorIp()
  async iniciar(
    @Body() entrada: CredencialesEntrada,
    @Req() peticion: Request,
    @Res({ passthrough: true }) respuesta: Response,
  ): Promise<SesionSalida> {
    const sesion = await this.acceso.iniciarSesion(
      entrada.correo,
      entrada.contrasena,
      peticion,
    );
    return entregarSesion(this.sesiones, respuesta, sesion);
  }

  /** cerrarSesion (OP-05): cierra solo esta sesión y borra la cookie. */
  @Delete('sesion')
  @HttpCode(204)
  @PermitidaConAceptacionPendiente()
  async cerrar(
    @AlumnoActual() alumno: AlumnoSesion,
    @Res({ passthrough: true }) respuesta: Response,
  ): Promise<void> {
    await this.sesiones.revocar(alumno.sesionId);
    respuesta.removeHeader('X-Sesion-Expira');
    borrarCookieSesion(respuesta);
  }

  /** cerrarTodasLasSesiones (OP-05): cierra todas las sesiones del alumno, en todos sus dispositivos. */
  @Delete('sesiones')
  @HttpCode(204)
  @PermitidaConAceptacionPendiente()
  async cerrarTodas(
    @AlumnoActual() alumno: AlumnoSesion,
    @Res({ passthrough: true }) respuesta: Response,
  ): Promise<void> {
    await this.sesiones.revocarTodas(alumno.usuarioId);
    respuesta.removeHeader('X-Sesion-Expira');
    borrarCookieSesion(respuesta);
  }

  /** renovarSesion: «Seguir conectado». */
  @Post('sesion/renovar')
  @HttpCode(200)
  @PermitidaConAceptacionPendiente()
  renovar(@AlumnoActual() alumno: AlumnoSesion): SesionSalida {
    return aSesionSalida(alumno);
  }
}
