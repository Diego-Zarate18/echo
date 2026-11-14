import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Publica } from '../../../comun/decoradores/publica';
import { ErrorApi } from '../../../comun/errores/error-api';
import { aIsoUtc } from '../../../comun/utilidades/fechas';
import {
  esCodigoBienFormado,
  huellaDeCodigo,
} from '../../../infraestructura/seguridad/codigos';
import { CifradoService } from '../../../infraestructura/seguridad/cifrado.service';
import {
  COOKIE_REGISTRO_GOOGLE,
  borrarCookieTemporal,
  leerRegistroGoogle,
  traeRegistroGoogle,
} from '../google/cookies-google';
import { borrarCookieSesion, leerCookieSesion } from '../sesion/cookie-sesion';
import { entregarSesion } from '../sesion/entregar-sesion';
import { aSesionSalida } from '../sesion/sesion.dto';
import type { SesionSalida } from '../sesion/sesion.dto';
import { SesionService } from '../sesion/sesion.service';
import { AceptacionEntrada } from './aceptacion.dto';
import { AceptacionService } from './aceptacion.service';

/**
 * Aceptación del aviso y los términos (OP-13). REQUIERE REVISIÓN HUMANA.
 * Las dos rutas son @Publica porque sirven también sin sesión (registro con Google); por eso aquí se valida
 * la sesión a mano cuando viene.
 */
@Controller('cuenta')
export class AceptacionController {
  constructor(
    private readonly aceptacion: AceptacionService,
    private readonly sesiones: SesionService,
    private readonly cifrado: CifradoService,
  ) {}

  /** obtenerRegistroGoogle: lo que SCR-19 muestra antes de crear la cuenta. Nunca devuelve el sub de Google. */
  @Get('registro-google')
  @Publica()
  obtenerRegistroGoogle(
    @Req() peticion: Request,
    @Res({ passthrough: true }) respuesta: Response,
  ): { nombre: string; correo: string; expiraEn: string } {
    const google = leerRegistroGoogle(peticion, this.cifrado);
    if (!google) {
      if (traeRegistroGoogle(peticion)) {
        borrarCookieTemporal(respuesta, COOKIE_REGISTRO_GOOGLE);
      }
      throw new ErrorApi('REGISTRO_GOOGLE_VENCIDO');
    }
    return {
      nombre: google.nombre,
      correo: google.correo,
      expiraEn: new Date(google.expiraEn).toISOString(),
    };
  }

  /** aceptarDocumentos: caso 2 con sesión válida; si no, caso 1 con la cookie temporal de Google. */
  @Post('aceptacion')
  @HttpCode(200)
  @Publica()
  async aceptar(
    @Body() entrada: AceptacionEntrada,
    @Req() peticion: Request,
    @Res({ passthrough: true }) respuesta: Response,
  ): Promise<SesionSalida> {
    const codigo = leerCookieSesion(peticion);
    const huella = esCodigoBienFormado(codigo) ? huellaDeCodigo(codigo) : null;
    const alumno = huella ? await this.sesiones.validarYRenovar(huella) : null;

    if (alumno && huella) {
      await this.aceptacion.aceptarPendientes(alumno, entrada, peticion);
      const actualizado =
        (await this.sesiones.validarYRenovar(huella)) ?? alumno;
      respuesta.setHeader('X-Sesion-Expira', aIsoUtc(actualizado.expiraEn));
      return aSesionSalida(actualizado);
    }

    const google = leerRegistroGoogle(peticion, this.cifrado);
    if (!google) {
      if (codigo !== null) borrarCookieSesion(respuesta);
      if (traeRegistroGoogle(peticion)) {
        borrarCookieTemporal(respuesta, COOKIE_REGISTRO_GOOGLE);
        throw new ErrorApi('REGISTRO_GOOGLE_VENCIDO');
      }
      throw new ErrorApi('NO_AUTENTICADO');
    }

    const sesion = await this.aceptacion.crearCuentaGoogle(
      google,
      entrada,
      peticion,
    );
    borrarCookieTemporal(respuesta, COOKIE_REGISTRO_GOOGLE);
    return entregarSesion(this.sesiones, respuesta, sesion);
  }
}
