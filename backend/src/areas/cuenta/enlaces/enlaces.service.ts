import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import { ErrorApi } from '../../../comun/errores/error-api';
import {
  esCodigoBienFormado,
  generarCodigo,
  huellaDeCodigo,
} from '../../../infraestructura/seguridad/codigos';

type Cliente = Pick<Prisma.TransactionClient, '$queryRaw' | '$executeRaw'>;

export type TipoEnlace = 'verificacion' | 'recuperacion' | 'cambio_correo';

/** Vigencia de cada enlace (OP-02, OP-06, OP-11). */
const VIGENCIA: Record<TipoEnlace, string> = {
  verificacion: '24 hours',
  recuperacion: '30 minutes',
  cambio_correo: '30 minutes',
};

/** Ruta del frontend que abre cada enlace (SCR-03, SCR-04). */
const RUTA: Record<TipoEnlace, string> = {
  verificacion: '/verificar-correo?codigo=',
  recuperacion: '/recuperar-contrasena/nueva?codigo=',
  cambio_correo: '/verificar-correo?tipo=cambio-correo&codigo=',
};

export interface EnlaceUsado {
  usuarioId: string;
  correoDestino: string;
}

/**
 * Enlaces de un solo uso que se mandan por correo (tabla token_correo, DEC-110). El código solo viaja en el
 * correo; la base guarda su huella SHA-256 (INV-08).
 */
@Injectable()
export class EnlacesService {
  /**
   * Crea un enlace y borra los anteriores del mismo tipo que el alumno no usó: solo el último sirve.
   * Devuelve el código en claro, que solo debe ir en el correo.
   */
  async crear(
    cliente: Cliente,
    usuarioId: string,
    tipo: TipoEnlace,
    correoDestino: string,
  ): Promise<string> {
    const { codigo, huella } = generarCodigo();
    await cliente.$executeRaw`
      DELETE FROM token_correo
      WHERE usuario_id = ${usuarioId}::uuid AND tipo = ${tipo} AND usado_en IS NULL`;
    await cliente.$executeRaw`
      INSERT INTO token_correo (usuario_id, tipo, token_hash, correo_destino, expira_en)
      VALUES (${usuarioId}::uuid, ${tipo}, ${huella}, ${correoDestino},
              now() + ${VIGENCIA[tipo]}::interval)`;
    return codigo;
  }

  /**
   * Marca el enlace como usado y devuelve de quién es. Una sola sentencia: solo lo marca si sigue vigente y sin
   * usar, así que dos clics al mismo tiempo no pueden usarlo dos veces.
   * Si no sirve, lanza ENLACE_INVALIDO con motivo «usado», o «vencido» (también si el código no existe).
   */
  async usar(
    cliente: Cliente,
    codigo: string,
    tipo: TipoEnlace,
  ): Promise<EnlaceUsado> {
    if (!esCodigoBienFormado(codigo)) {
      throw new ErrorApi('ENLACE_INVALIDO', { motivo: 'vencido' });
    }
    const huella = huellaDeCodigo(codigo);
    const [usado] = await cliente.$queryRaw<
      { usuario_id: string; correo_destino: string }[]
    >`
      UPDATE token_correo
      SET usado_en = now()
      WHERE token_hash = ${huella} AND tipo = ${tipo}
        AND usado_en IS NULL AND expira_en > now()
      RETURNING usuario_id, correo_destino`;
    if (usado) {
      return {
        usuarioId: usado.usuario_id,
        correoDestino: usado.correo_destino,
      };
    }
    const [existente] = await cliente.$queryRaw<{ usado: boolean }[]>`
      SELECT (usado_en IS NOT NULL) AS usado
      FROM token_correo
      WHERE token_hash = ${huella} AND tipo = ${tipo}`;
    throw new ErrorApi('ENLACE_INVALIDO', {
      motivo: existente?.usado ? 'usado' : 'vencido',
    });
  }

  /** URL completa del enlace en el frontend. */
  url(origenFrontend: string, tipo: TipoEnlace, codigo: string): string {
    return `${origenFrontend}${RUTA[tipo]}${encodeURIComponent(codigo)}`;
  }
}
