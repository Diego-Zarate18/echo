import { Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { esViolacionUnica } from '../../../comun/utilidades/errores-postgres';
import { PrismaService } from '../../../infraestructura/base-de-datos/prisma.service';
import { ErrorGoogle } from '../../../infraestructura/google/google.service';
import type { IdentidadGoogle } from '../../../infraestructura/google/google.service';
import type { CodigoGenerado } from '../../../infraestructura/seguridad/codigos';
import { SesionService } from '../sesion/sesion.service';

/** Resultado del regreso de Google. */
export type ResultadoGoogle =
  { tipo: 'sesion'; sesion: CodigoGenerado } | { tipo: 'registro' };

/**
 * Entrar con Google (OP-03). REQUIERE REVISIÓN HUMANA.
 * 1. Cuenta activa con ese google_sub: entra y se actualiza su correo (DEC-23, DEC-113).
 * 2. Cuenta activa con ese correo y sin Google: se vincula y entra (DEC-23). Nunca una cuenta pendiente (DEC-93).
 * 3. Si no hay cuenta, no se crea: quien llama guarda los datos en la cookie temporal y lleva a /aceptar (OP-13).
 */
@Injectable()
export class AccesoGoogleService {
  private readonly registro = new Logger('Google');

  constructor(
    private readonly prisma: PrismaService,
    private readonly sesiones: SesionService,
  ) {}

  async entrar(
    identidad: IdentidadGoogle,
    peticion: Request,
  ): Promise<ResultadoGoogle> {
    let usuarioId: string | null;
    try {
      usuarioId = await this.prisma.$transaction(async (tx) => {
        const [porSub] = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM usuario
          WHERE google_sub = ${identidad.sub} AND estado = 'activo'
          FOR UPDATE`;
        if (porSub) return porSub.id;

        const [porCorreo] = await tx.$queryRaw<
          { id: string; google_sub: string | null }[]
        >`
          SELECT id, google_sub FROM usuario
          WHERE correo = ${identidad.correo} AND estado = 'activo'
          FOR UPDATE`;
        if (!porCorreo) return null;
        if (porCorreo.google_sub !== null) {
          // El correo ya está ligado a otra cuenta de Google.
          throw new ErrorGoogle('correo ligado a otra cuenta de Google');
        }
        await tx.$executeRaw`
          UPDATE usuario SET google_sub = ${identidad.sub}
          WHERE id = ${porCorreo.id}::uuid`;
        return porCorreo.id;
      });
    } catch (error) {
      if (esViolacionUnica(error)) {
        throw new ErrorGoogle('carrera al vincular la cuenta');
      }
      throw error;
    }

    if (!usuarioId) return { tipo: 'registro' };

    await this.actualizarCorreo(usuarioId, identidad.correo);
    await this.sesiones.revocarLaDeLaPeticion(peticion);
    const sesion = await this.sesiones.crear(this.prisma, usuarioId, peticion);
    return { tipo: 'sesion', sesion };
  }

  /**
   * DEC-23: el correo de la cuenta sigue al de Google. DEC-113: si ese correo ya lo tiene otra cuenta de Echo, se
   * conserva el anterior y el alumno entra igual.
   */
  private async actualizarCorreo(
    usuarioId: string,
    correo: string,
  ): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        UPDATE usuario SET correo = ${correo}
        WHERE id = ${usuarioId}::uuid
          AND correo IS DISTINCT FROM ${correo}
          AND NOT EXISTS (SELECT 1 FROM usuario otro WHERE otro.correo = ${correo})`;
    } catch (error) {
      if (!esViolacionUnica(error)) throw error;
      this.registro.warn(
        'Correo de Google en uso por otra cuenta: se conserva el anterior',
      );
    }
  }
}
