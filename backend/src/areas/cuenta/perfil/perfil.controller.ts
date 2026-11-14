import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AlumnoActual } from '../../../comun/decoradores/alumno-actual';
import type { AlumnoSesion } from '../../../comun/decoradores/alumno-actual';
import { LimitePorIp } from '../../../comun/decoradores/limite-por-ip';
import { PermitidaConAceptacionPendiente } from '../../../comun/decoradores/permitida-con-aceptacion-pendiente';
import { Publica } from '../../../comun/decoradores/publica';
import { diaEnMexico } from '../../../comun/utilidades/fechas';
import { CifradoService } from '../../../infraestructura/seguridad/cifrado.service';
import {
  COOKIE_REINGRESO_GOOGLE,
  borrarCookieTemporal,
  leerReingresoGoogle,
} from '../google/cookies-google';
import { CodigoEnlaceEntrada } from '../registro/registro.dto';
import { borrarCookieSesion } from '../sesion/cookie-sesion';
import {
  CambioContrasenaEntrada,
  CambioCorreoEntrada,
  EliminacionEntrada,
  NombreEntrada,
  PreferenciasEntrada,
} from './perfil.dto';
import { PerfilService } from './perfil.service';
import type { PerfilSalida, PreferenciasSalida } from './perfil.service';

/** Perfil del alumno (SCR-16). REQUIERE REVISIÓN HUMANA. */
@Controller('perfil')
export class PerfilController {
  constructor(
    private readonly perfil: PerfilService,
    private readonly cifrado: CifradoService,
  ) {}

  /** obtenerPerfil (OP-08): disponible aunque haya una aceptación pendiente. */
  @Get()
  @PermitidaConAceptacionPendiente()
  obtener(@AlumnoActual() alumno: AlumnoSesion): Promise<PerfilSalida> {
    return this.perfil.obtener(alumno.usuarioId);
  }

  /** editarNombre (OP-09). */
  @Patch()
  editarNombre(
    @AlumnoActual() alumno: AlumnoSesion,
    @Body() entrada: NombreEntrada,
  ): Promise<PerfilSalida> {
    return this.perfil.editarNombre(
      alumno.usuarioId,
      entrada.nombre,
      entrada.apellidos,
    );
  }

  /** exportarMisDatos (OP-41): se permite con aceptación pendiente, porque es el derecho de acceso. */
  @Get('exportacion')
  @PermitidaConAceptacionPendiente()
  async exportar(
    @AlumnoActual() alumno: AlumnoSesion,
    @Res({ passthrough: true }) respuesta: Response,
  ): Promise<unknown> {
    const datos = await this.perfil.exportar(alumno.usuarioId);
    respuesta.setHeader(
      'Content-Disposition',
      `attachment; filename="echo-mis-datos-${diaEnMexico(new Date())}.json"`,
    );
    return datos;
  }

  /** cambiarPreferenciasPrivacidad (OP-39). */
  @Patch('privacidad')
  cambiarPreferencias(
    @AlumnoActual() alumno: AlumnoSesion,
    @Body() entrada: PreferenciasEntrada,
  ): Promise<PreferenciasSalida> {
    return this.perfil.cambiarPreferencias(alumno.usuarioId, entrada);
  }

  /** cambiarContrasena (OP-10): 204 y las demás sesiones cerradas. */
  @Put('contrasena')
  @HttpCode(204)
  async cambiarContrasena(
    @AlumnoActual() alumno: AlumnoSesion,
    @Body() entrada: CambioContrasenaEntrada,
  ): Promise<void> {
    await this.perfil.cambiarContrasena(
      alumno,
      entrada.contrasenaActual,
      entrada.contrasenaNueva,
    );
  }

  /** cambiarCorreo (OP-11): siempre 202 si la contraseña es correcta (DEC-77). */
  @Post('correo')
  @HttpCode(202)
  @LimitePorIp()
  async cambiarCorreo(
    @AlumnoActual() alumno: AlumnoSesion,
    @Body() entrada: CambioCorreoEntrada,
  ): Promise<void> {
    await this.perfil.pedirCambioCorreo(
      alumno,
      entrada.correoNuevo,
      entrada.contrasena,
    );
  }

  /** confirmarCambioCorreo (OP-12): sin sesión. */
  @Post('correo/confirmacion')
  @HttpCode(204)
  @Publica()
  async confirmarCambioCorreo(
    @Body() entrada: CodigoEnlaceEntrada,
  ): Promise<void> {
    await this.perfil.confirmarCambioCorreo(entrada.codigo);
  }

  /**
   * eliminarCuenta (OP-14): anonimiza la cuenta, cierra sus sesiones y borra la cookie. Disponible aunque haya
   * una aceptación pendiente. Con Google, el reingreso solo vale para esta misma sesión y este alumno (DEC-114).
   */
  @Post('eliminacion')
  @HttpCode(204)
  @PermitidaConAceptacionPendiente()
  async eliminar(
    @AlumnoActual() alumno: AlumnoSesion,
    @Body() entrada: EliminacionEntrada,
    @Req() peticion: Request,
    @Res({ passthrough: true }) respuesta: Response,
  ): Promise<void> {
    const reingreso = leerReingresoGoogle(peticion, this.cifrado);
    const reingresoValido =
      reingreso !== null &&
      reingreso.sesionId === alumno.sesionId &&
      reingreso.usuarioId === alumno.usuarioId;
    await this.perfil.eliminar(alumno, entrada.contrasena, reingresoValido);
    respuesta.removeHeader('X-Sesion-Expira');
    borrarCookieSesion(respuesta);
    if (reingreso) borrarCookieTemporal(respuesta, COOKIE_REINGRESO_GOOGLE);
  }
}
