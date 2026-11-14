import { Controller, Get, Logger, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import { Publica } from '../../../comun/decoradores/publica';
import {
  ErrorGoogle,
  GoogleService,
} from '../../../infraestructura/google/google.service';
import { CifradoService } from '../../../infraestructura/seguridad/cifrado.service';
import { compararEnTiempoConstante } from '../../../infraestructura/seguridad/codigos';
import { escribirCookieSesion } from '../sesion/cookie-sesion';
import { AccesoGoogleService } from './acceso-google.service';
import { PrismaService } from '../../../infraestructura/base-de-datos/prisma.service';
import {
  esCodigoBienFormado,
  huellaDeCodigo,
} from '../../../infraestructura/seguridad/codigos';
import { leerCookieSesion } from '../sesion/cookie-sesion';
import { SesionService } from '../sesion/sesion.service';
import {
  COOKIE_ESTADO_GOOGLE,
  COOKIE_REGISTRO_GOOGLE,
  COOKIE_REINGRESO_GOOGLE,
  VIGENCIA_MS,
  VIGENCIA_REINGRESO_MS,
  borrarCookieTemporal,
  escribirCookieTemporal,
  leerEstadoGoogle,
} from './cookies-google';
import type { PropositoGoogle } from './cookies-google';
import type { IdentidadGoogle } from '../../../infraestructura/google/google.service';

const RUTA_ERROR = '/iniciar-sesion?error=google';
const RUTA_REINGRESO = '/perfil?reingreso=google';
const RUTA_ERROR_REINGRESO = '/perfil?error=google';

const aleatorio = () => randomBytes(32).toString('base64url');

/**
 * Entrar con Google (OP-03). REQUIERE REVISIÓN HUMANA.
 * Las dos rutas son navegaciones del navegador: siempre responden 302, nunca un error en JSON.
 */
@Controller('auth/google')
export class GoogleController {
  private readonly registro = new Logger('Google');

  constructor(
    private readonly google: GoogleService,
    private readonly cifrado: CifradoService,
    private readonly acceso: AccesoGoogleService,
    private readonly sesiones: SesionService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * entrarConGoogle: guarda state, nonce, el verificador PKCE y el propósito en la cookie temporal y manda a
   * Google. Con proposito=eliminar, el regreso cuenta como reingreso para eliminar la cuenta (OP-14).
   */
  @Get()
  @Publica()
  entrar(
    @Query('proposito') propositoRecibido: unknown,
    @Res() respuesta: Response,
  ): void {
    const proposito: PropositoGoogle =
      propositoRecibido === 'eliminar' ? 'eliminar' : 'entrar';
    if (!this.google.disponible) {
      this.registro.warn(
        'Entrar con Google sin configurar: faltan las variables GOOGLE_*',
      );
      respuesta.redirect(
        302,
        proposito === 'eliminar' ? RUTA_ERROR_REINGRESO : RUTA_ERROR,
      );
      return;
    }
    const estado = aleatorio();
    const nonce = aleatorio();
    const verificador = aleatorio();
    const desafio = createHash('sha256')
      .update(verificador)
      .digest('base64url');
    escribirCookieTemporal(respuesta, this.cifrado, COOKIE_ESTADO_GOOGLE, {
      estado,
      nonce,
      verificador,
      proposito,
      expiraEn: Date.now() + VIGENCIA_MS,
    });
    respuesta.redirect(
      302,
      this.google.urlDeConsentimiento(estado, nonce, desafio),
    );
  }

  /** volverDeGoogle: a /modulos con sesión, a /aceptar para crear la cuenta o a /iniciar-sesion?error=google. */
  @Get('callback')
  @Publica()
  async volver(
    @Query('code') codigo: unknown,
    @Query('state') estadoRecibido: unknown,
    @Req() peticion: Request,
    @Res() respuesta: Response,
  ): Promise<void> {
    const guardado = leerEstadoGoogle(peticion, this.cifrado);
    borrarCookieTemporal(respuesta, COOKIE_ESTADO_GOOGLE);

    try {
      if (!guardado) throw new ErrorGoogle('sin cookie de estado o vencida');
      if (typeof codigo !== 'string' || typeof estadoRecibido !== 'string') {
        // También cuando el alumno cancela: Google regresa con error= y sin code.
        throw new ErrorGoogle('regreso sin código');
      }
      if (!compararEnTiempoConstante(estadoRecibido, guardado.estado)) {
        throw new ErrorGoogle('state distinto');
      }
      const identidad = await this.google.identidad(
        codigo,
        guardado.verificador,
        guardado.nonce,
      );
      if (guardado.proposito === 'eliminar') {
        await this.marcarReingreso(identidad, peticion, respuesta);
        return;
      }
      const resultado = await this.acceso.entrar(identidad, peticion);
      if (resultado.tipo === 'sesion') {
        escribirCookieSesion(respuesta, resultado.sesion.codigo);
        respuesta.redirect(302, '/modulos');
        return;
      }
      escribirCookieTemporal(respuesta, this.cifrado, COOKIE_REGISTRO_GOOGLE, {
        ...identidad,
        expiraEn: Date.now() + VIGENCIA_MS,
      });
      respuesta.redirect(302, '/aceptar');
    } catch (error) {
      if (error instanceof ErrorGoogle) {
        this.registro.warn(`No se pudo entrar con Google: ${error.message}`);
      } else {
        const nombre =
          error instanceof Error ? error.name : 'error desconocido';
        this.registro.error(`Error inesperado al volver de Google (${nombre})`);
      }
      respuesta.redirect(
        302,
        guardado?.proposito === 'eliminar' ? RUTA_ERROR_REINGRESO : RUTA_ERROR,
      );
    }
  }

  /**
   * Reingreso para eliminar la cuenta (OP-14, DEC-114): solo cuenta si la petición trae una sesión válida y la
   * identidad de Google es la de esa misma cuenta. No abre otra sesión: deja la marca de 5 minutos y vuelve al perfil.
   */
  private async marcarReingreso(
    identidad: IdentidadGoogle,
    peticion: Request,
    respuesta: Response,
  ): Promise<void> {
    const codigo = leerCookieSesion(peticion);
    const alumno = esCodigoBienFormado(codigo)
      ? await this.sesiones.validarYRenovar(huellaDeCodigo(codigo))
      : null;
    if (!alumno) throw new ErrorGoogle('reingreso sin sesión');
    const [cuenta] = await this.prisma.$queryRaw<
      { google_sub: string | null }[]
    >`
      SELECT google_sub FROM usuario WHERE id = ${alumno.usuarioId}::uuid`;
    if (!cuenta?.google_sub || cuenta.google_sub !== identidad.sub) {
      throw new ErrorGoogle('reingreso con otra cuenta de Google');
    }
    escribirCookieTemporal(respuesta, this.cifrado, COOKIE_REINGRESO_GOOGLE, {
      sesionId: alumno.sesionId,
      usuarioId: alumno.usuarioId,
      expiraEn: Date.now() + VIGENCIA_REINGRESO_MS,
    });
    respuesta.redirect(302, RUTA_REINGRESO);
  }
}
