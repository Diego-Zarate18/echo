import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../base-de-datos/prisma.service.js';
import { SeguridadService } from './seguridad.service.js';

const nombreCookieSesion = '__Host-echo_sesion';
const minutosSesion = 30;

type DatosSesion = {
  nombre: string;
  apellidos: string | null;
  metodoAcceso: 'correo' | 'google' | 'ambos';
  expiraEn: string;
  aceptacionPendiente: {
    aviso: boolean;
    terminos: boolean;
  };
};

@Injectable()
export class SesionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seguridad: SeguridadService,
  ) {}

  async crear(usuarioId: string, respuesta: Response): Promise<DatosSesion> {
    const codigo = this.seguridad.generarCodigo();
    const tokenHash = this.seguridad.generarHuella(codigo);
    const sesion = await this.prisma.sesion.create({
      data: {
        usuarioId,
        tokenHash,
        agenteUsuario: null,
      },
    });

    respuesta.setHeader(
      'Set-Cookie',
      this.formarCookie(codigo, minutosSesion * 60),
    );

    return this.obtenerDatos(sesion.id);
  }

  async obtener(codigo: string): Promise<DatosSesion> {
    const sesion = await this.buscarActiva(codigo);
    return this.obtenerDatos(sesion.id);
  }

  async renovar(codigo: string, respuesta: Response): Promise<DatosSesion> {
    const sesion = await this.buscarActiva(codigo);
    const ahora = new Date();
    await this.prisma.sesion.update({
      where: { id: sesion.id },
      data: { ultimaActividadEn: ahora },
    });

    respuesta.setHeader(
      'Set-Cookie',
      this.formarCookie(codigo, minutosSesion * 60),
    );

    return this.obtenerDatos(sesion.id);
  }

  async cerrar(codigo: string, respuesta: Response): Promise<void> {
    const sesion = await this.buscarActiva(codigo);
    await this.prisma.sesion.update({
      where: { id: sesion.id },
      data: { revocadaEn: new Date() },
    });
    this.borrarCookie(respuesta);
  }

  async cerrarTodas(usuarioId: string, respuesta: Response): Promise<void> {
    await this.prisma.sesion.updateMany({
      where: { usuarioId, revocadaEn: null },
      data: { revocadaEn: new Date() },
    });
    this.borrarCookie(respuesta);
  }

  async obtenerUsuarioId(codigo: string): Promise<string> {
    const sesion = await this.buscarActiva(codigo);
    return sesion.usuarioId;
  }

  private async buscarActiva(codigo: string) {
    const tokenHash = this.seguridad.generarHuella(codigo);
    const limite = new Date(Date.now() - minutosSesion * 60 * 1000);
    const sesion = await this.prisma.sesion.findFirst({
      where: {
        tokenHash,
        revocadaEn: null,
        ultimaActividadEn: { gt: limite },
      },
    });

    if (!sesion) {
      throw new UnauthorizedException('La sesión no es válida.');
    }

    return sesion;
  }

  private async obtenerDatos(sesionId: string): Promise<DatosSesion> {
    const sesion = await this.prisma.sesion.findUniqueOrThrow({
      where: { id: sesionId },
      include: { usuario: true },
    });

    const [aviso, terminos] = await Promise.all([
      this.faltaAceptacion(sesion.usuarioId, 'aviso_privacidad'),
      this.faltaAceptacion(sesion.usuarioId, 'terminos'),
    ]);

    const tieneCorreo = sesion.usuario.hashContrasena !== null;
    const tieneGoogle = sesion.usuario.googleSub !== null;

    const datos: DatosSesion = {
      nombre: sesion.usuario.nombre ?? '',
      apellidos: sesion.usuario.apellidos,
      metodoAcceso:
        tieneCorreo && tieneGoogle
          ? 'ambos'
          : tieneGoogle
            ? 'google'
            : 'correo',
      expiraEn: new Date(
        sesion.ultimaActividadEn.getTime() + minutosSesion * 60 * 1000,
      ).toISOString(),
      aceptacionPendiente: { aviso, terminos },
    };

    return datos;
  }

  private async faltaAceptacion(
    usuarioId: string,
    tipo: 'aviso_privacidad' | 'terminos',
  ): Promise<boolean> {
    const documento = await this.prisma.documentoLegal.findFirst({
      where: { tipo, requiereAceptacion: true },
      orderBy: { publicadoEn: 'desc' },
    });

    if (!documento) {
      return false;
    }

    const aceptacion = await this.prisma.aceptacionDocumento.findUnique({
      where: {
        usuarioId_documentoId: {
          usuarioId,
          documentoId: documento.id,
        },
      },
    });

    return aceptacion === null;
  }

  private formarCookie(codigo: string, maxAge: number): string {
    return `${nombreCookieSesion}=${codigo}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax; Path=/`;
  }

  private borrarCookie(respuesta: Response): void {
    respuesta.setHeader(
      'Set-Cookie',
      `${nombreCookieSesion}=; Max-Age=0; HttpOnly; Secure; SameSite=Lax; Path=/`,
    );
  }
}
