import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { Prisma } from '../../../generated/prisma/client';
import type { AlumnoSesion } from '../../../comun/decoradores/alumno-actual';
import { PrismaService } from '../../../infraestructura/base-de-datos/prisma.service';
import {
  esCodigoBienFormado,
  generarCodigo,
  huellaDeCodigo,
} from '../../../infraestructura/seguridad/codigos';
import type { CodigoGenerado } from '../../../infraestructura/seguridad/codigos';
import { leerCookieSesion } from './cookie-sesion';

type Cliente = Pick<Prisma.TransactionClient, '$executeRaw'>;

/** Largo máximo del navegador guardado con la sesión (CHECK chk_sesion_agente_usuario). */
const LARGO_AGENTE = 500;

interface FilaSesion {
  sesion_id: string;
  usuario_id: string;
  nombre: string;
  apellidos: string | null;
  con_contrasena: boolean;
  con_google: boolean;
  expira_en: Date;
  aviso_pendiente: boolean;
  terminos_pendiente: boolean;
}

/**
 * Sesiones guardadas en la base (DEC-12). La cookie lleva un código aleatorio y la tabla sesion solo su huella
 * SHA-256 (INV-08). Una sesión caduca tras 30 minutos sin actividad.
 */
@Injectable()
export class SesionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * C-01: ¿la sesión es válida? Si lo es, renueva su última actividad y devuelve al alumno.
   *
   * Una sola sentencia: el UPDATE solo toca la sesión si no está revocada y su última actividad es de hace
   * menos de 30 minutos, así que validar y renovar no pueden separarse por una carrera entre peticiones.
   * Devuelve null si la sesión no existe, está revocada, caducó o la cuenta no está activa.
   *
   * Aceptación pendiente (por tipo de documento): la versión vigente, que es la última publicada, pide
   * aceptación y el alumno no la ha aceptado.
   */
  async validarYRenovar(huella: string): Promise<AlumnoSesion | null> {
    const filas = await this.prisma.$queryRaw<FilaSesion[]>`
      WITH renovada AS (
        UPDATE sesion
        SET ultima_actividad_en = now()
        WHERE token_hash = ${huella}
          AND revocada_en IS NULL
          AND ultima_actividad_en > now() - interval '30 minutes'
        RETURNING id, usuario_id, ultima_actividad_en
      )
      SELECT
        r.id AS sesion_id,
        u.id AS usuario_id,
        u.nombre,
        u.apellidos,
        (u.hash_contrasena IS NOT NULL) AS con_contrasena,
        (u.google_sub IS NOT NULL) AS con_google,
        r.ultima_actividad_en + interval '30 minutes' AS expira_en,
        coalesce(aviso.pendiente, false) AS aviso_pendiente,
        coalesce(terminos.pendiente, false) AS terminos_pendiente
      FROM renovada r
      JOIN usuario u ON u.id = r.usuario_id AND u.estado = 'activo'
      LEFT JOIN LATERAL (
        SELECT d.requiere_aceptacion AND NOT EXISTS (
          SELECT 1 FROM aceptacion_documento a WHERE a.usuario_id = u.id AND a.documento_id = d.id
        ) AS pendiente
        FROM documento_legal d
        WHERE d.tipo = 'aviso_privacidad' AND d.publicado_en <= now()
        ORDER BY d.publicado_en DESC, d.id DESC
        LIMIT 1
      ) aviso ON true
      LEFT JOIN LATERAL (
        SELECT d.requiere_aceptacion AND NOT EXISTS (
          SELECT 1 FROM aceptacion_documento a WHERE a.usuario_id = u.id AND a.documento_id = d.id
        ) AS pendiente
        FROM documento_legal d
        WHERE d.tipo = 'terminos' AND d.publicado_en <= now()
        ORDER BY d.publicado_en DESC, d.id DESC
        LIMIT 1
      ) terminos ON true`;

    const fila = filas[0];
    if (!fila) return null;
    return {
      usuarioId: fila.usuario_id,
      sesionId: fila.sesion_id,
      nombre: fila.nombre,
      apellidos: fila.apellidos,
      metodoAcceso:
        fila.con_contrasena && fila.con_google
          ? 'ambos'
          : fila.con_google
            ? 'google'
            : 'correo',
      expiraEn: fila.expira_en,
      aceptacionPendiente: {
        aviso: fila.aviso_pendiente,
        terminos: fila.terminos_pendiente,
      },
    };
  }

  /**
   * Abre una sesión nueva para el alumno. Devuelve el código, que solo viaja en la cookie (INV-08); la base guarda
   * su huella. Se puede llamar dentro de una transacción.
   */
  async crear(
    cliente: Cliente,
    usuarioId: string,
    peticion: Request,
  ): Promise<CodigoGenerado> {
    const generado = generarCodigo();
    const agente = (peticion.headers['user-agent'] ?? '').slice(
      0,
      LARGO_AGENTE,
    );
    await cliente.$executeRaw`
      INSERT INTO sesion (usuario_id, token_hash, agente_usuario)
      VALUES (${usuarioId}::uuid, ${generado.huella}, ${agente || null})`;
    return generado;
  }

  /** Cierra la sesión indicada (OP-05). */
  async revocar(sesionId: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE sesion SET revocada_en = now()
      WHERE id = ${sesionId}::uuid AND revocada_en IS NULL`;
  }

  /** Cierra la sesión que trae la petición, si trae una; sirve al iniciar otra encima. */
  async revocarLaDeLaPeticion(peticion: Request): Promise<void> {
    const codigo = leerCookieSesion(peticion);
    if (!esCodigoBienFormado(codigo)) return;
    await this.prisma.$executeRaw`
      UPDATE sesion SET revocada_en = now()
      WHERE token_hash = ${huellaDeCodigo(codigo)} AND revocada_en IS NULL`;
  }

  /** Cierra las demás sesiones del alumno y deja abierta la indicada (OP-10). */
  async revocarLasDemas(usuarioId: string, sesionId: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE sesion SET revocada_en = now()
      WHERE usuario_id = ${usuarioId}::uuid AND id <> ${sesionId}::uuid
        AND revocada_en IS NULL`;
  }

  /** Cierra todas las sesiones abiertas del alumno (OP-05, OP-07). */
  async revocarTodas(
    usuarioId: string,
    cliente: Cliente = this.prisma,
  ): Promise<void> {
    await cliente.$executeRaw`
      UPDATE sesion SET revocada_en = now()
      WHERE usuario_id = ${usuarioId}::uuid AND revocada_en IS NULL`;
  }
}
