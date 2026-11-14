import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infraestructura/base-de-datos/prisma.service';

type Cliente = Pick<Prisma.TransactionClient, '$queryRaw'>;

/** Tipo de documento en la base y en la API. */
export const TIPO_API = {
  aviso_privacidad: 'avisoPrivacidad',
  terminos: 'terminos',
} as const;
export type TipoDocumentoBd = keyof typeof TIPO_API;

export interface DocumentoVigente {
  id: bigint;
  tipo: TipoDocumentoBd;
  version: string;
  publicadoEn: Date;
  requiereAceptacion: boolean;
  resumenCambios: string;
}

/** Documento tal como lo devuelve la API (esquema Documento): sin id ni huella del contenido. */
export interface DocumentoSalida {
  tipo: (typeof TIPO_API)[TipoDocumentoBd];
  version: string;
  publicadoEn: string;
  requiereAceptacion: boolean;
  resumenCambios: string;
}

/**
 * Versiones vigentes del aviso de privacidad y de los términos (OP-40, DEC-28): por tipo, la última publicada
 * hasta este momento. Una versión con fecha futura todavía no cuenta.
 */
@Injectable()
export class DocumentosService {
  constructor(private readonly prisma: PrismaService) {}

  async vigentes(
    cliente: Cliente = this.prisma,
  ): Promise<Partial<Record<TipoDocumentoBd, DocumentoVigente>>> {
    const filas = await cliente.$queryRaw<
      {
        id: bigint;
        tipo: TipoDocumentoBd;
        version: string;
        publicado_en: Date;
        requiere_aceptacion: boolean;
        resumen_cambios: string;
      }[]
    >`
      SELECT DISTINCT ON (tipo) id, tipo, version, publicado_en, requiere_aceptacion, resumen_cambios
      FROM documento_legal
      WHERE publicado_en <= now()
      ORDER BY tipo, publicado_en DESC, id DESC`;
    const vigentes: Partial<Record<TipoDocumentoBd, DocumentoVigente>> = {};
    for (const fila of filas) {
      vigentes[fila.tipo] = {
        id: fila.id,
        tipo: fila.tipo,
        version: fila.version,
        publicadoEn: fila.publicado_en,
        requiereAceptacion: fila.requiere_aceptacion,
        resumenCambios: fila.resumen_cambios,
      };
    }
    return vigentes;
  }

  aSalida(documento: DocumentoVigente): DocumentoSalida {
    return {
      tipo: TIPO_API[documento.tipo],
      version: documento.version,
      publicadoEn: documento.publicadoEn.toISOString(),
      requiereAceptacion: documento.requiereAceptacion,
      resumenCambios: documento.resumenCambios,
    };
  }
}
