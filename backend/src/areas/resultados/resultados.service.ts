import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { ErrorApi } from '../../comun/errores/error-api';
import type { CodigoCampo } from '../../comun/errores/error-api';
import { ZONA_MEXICO } from '../../comun/utilidades/fechas';
import { PrismaService } from '../../infraestructura/base-de-datos/prisma.service';
import { CuestionariosService } from '../cuestionarios/cuestionarios.service';

type Referencia = { slug: string; titulo: string };
const FORMATO_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const TIPOS = ['actividad', 'caso', 'examen'] as const;
type TipoCuestionario = (typeof TIPOS)[number];

export interface FiltrosResultados {
  modulo?: unknown;
  tipo?: unknown;
  desde?: unknown;
  hasta?: unknown;
}

export interface ResultadoIntento {
  intentoId: string;
  enviadoEn: string;
  tipo: TipoCuestionario;
  titulo: string;
  modulo: Referencia;
  curso: Referencia;
  leccion: Referencia | null;
  calificacion: number;
  numero: number;
  destacado: boolean;
}

interface FilaResultado {
  intento_id: string;
  enviado_en: Date;
  tipo: TipoCuestionario;
  titulo: string;
  modulo_slug: string;
  modulo_titulo: string;
  curso_slug: string;
  curso_titulo: string;
  leccion_slug: string | null;
  leccion_titulo: string | null;
  calificacion: Prisma.Decimal;
  numero: number;
  aprobado: boolean | null;
  destacado: boolean;
}

/** Un día AAAA-MM-DD que existe en el calendario. */
function diaValido(texto: unknown): texto is string {
  if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto))
    return false;
  const [anio, mes, dia] = texto.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
}

/**
 * Mis resultados (OP-29, OP-30, C-08): solo los intentos enviados del alumno de la sesión (INV-07). Un intento de
 * otro alumno, o uno que aún no se envía, no existe. El examen reprobado nunca trae soluciones (DEC-11).
 */
@Injectable()
export class ResultadosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cuestionarios: CuestionariosService,
  ) {}

  /** listarResultados (OP-29): del más reciente al más antiguo; los días se toman en hora de México (DEC-30). */
  async listar(
    usuarioId: string,
    filtros: FiltrosResultados,
  ): Promise<{ resultados: ResultadoIntento[] }> {
    const campos: Record<string, CodigoCampo> = {};
    const modulo =
      filtros.modulo === undefined || filtros.modulo === ''
        ? null
        : filtros.modulo;
    const tipo =
      filtros.tipo === undefined || filtros.tipo === '' ? null : filtros.tipo;
    const desde =
      filtros.desde === undefined || filtros.desde === ''
        ? null
        : filtros.desde;
    const hasta =
      filtros.hasta === undefined || filtros.hasta === ''
        ? null
        : filtros.hasta;
    if (modulo !== null) {
      const existe =
        typeof modulo === 'string' &&
        FORMATO_SLUG.test(modulo) &&
        (
          await this.prisma.$queryRaw<
            { id: bigint }[]
          >`SELECT id FROM modulo WHERE slug = ${modulo}`
        ).length > 0;
      if (!existe) campos.modulo = 'FORMATO_INVALIDO';
    }
    if (tipo !== null && !TIPOS.includes(tipo as TipoCuestionario))
      campos.tipo = 'FORMATO_INVALIDO';
    if (desde !== null && !diaValido(desde)) campos.desde = 'FORMATO_INVALIDO';
    if (hasta !== null && !diaValido(hasta)) campos.hasta = 'FORMATO_INVALIDO';
    if (Object.keys(campos).length > 0)
      throw new ErrorApi('DATOS_INVALIDOS', { campos });

    const filas = await this.filas(usuarioId, {
      modulo: modulo as string | null,
      tipo: tipo as string | null,
      desde: desde as string | null,
      hasta: hasta as string | null,
      intento: null,
    });
    return { resultados: filas.map((f) => this.resultado(f)) };
  }

  /** obtenerDetalleIntento (OP-30): en el orden base de las preguntas, como en el simulador. */
  async detalle(usuarioId: string, intentoId: string) {
    const [fila] = await this.filas(usuarioId, {
      modulo: null,
      tipo: null,
      desde: null,
      hasta: null,
      intento: intentoId,
    });
    if (!fila) throw new ErrorApi('NO_ENCONTRADO');
    const resultado = this.resultado(fila);
    if (fila.tipo === 'examen' && fila.aprobado !== true) {
      return {
        solucion: 'oculta' as const,
        resultado,
        preguntas: await this.cuestionarios.sinSolucion(this.prisma, intentoId),
      };
    }
    return {
      solucion: 'completa' as const,
      resultado,
      preguntas: await this.cuestionarios.calificadas(this.prisma, intentoId),
    };
  }

  /**
   * Intentos enviados del alumno con su ruta (módulo, curso, lección). `destacado`: el mejor intento en
   * actividades y exámenes (el primero, si empatan) y el primero en casos (RN-06). Se muestran aunque su contenido
   * se haya retirado después: es su historial.
   */
  private filas(
    usuarioId: string,
    f: {
      modulo: string | null;
      tipo: string | null;
      desde: string | null;
      hasta: string | null;
      intento: string | null;
    },
  ): Promise<FilaResultado[]> {
    return this.prisma.$queryRaw<FilaResultado[]>`
      WITH propios AS (
        SELECT i.id, i.cuestionario_id, i.numero, i.enviado_en, i.calificacion, i.aprobado,
               row_number() OVER (
                 PARTITION BY i.cuestionario_id
                 ORDER BY CASE WHEN q.tipo = 'caso' THEN 0 ELSE -i.calificacion END, i.numero
               ) AS posicion
        FROM intento i JOIN cuestionario q ON q.id = i.cuestionario_id
        WHERE i.usuario_id = ${usuarioId}::uuid AND i.estado = 'enviado'
      )
      SELECT p.id AS intento_id, p.enviado_en, q.tipo, q.titulo,
             m.slug AS modulo_slug, m.titulo AS modulo_titulo,
             c.slug AS curso_slug, c.titulo AS curso_titulo,
             l.slug AS leccion_slug, l.titulo AS leccion_titulo,
             p.calificacion, p.numero, p.aprobado, p.posicion = 1 AS destacado
      FROM propios p
      JOIN cuestionario q ON q.id = p.cuestionario_id
      LEFT JOIN leccion l ON l.id = q.leccion_id
      JOIN curso c ON c.id = coalesce(l.curso_id, q.curso_id)
      JOIN modulo m ON m.id = c.modulo_id
      WHERE (${f.intento}::uuid IS NULL OR p.id = ${f.intento}::uuid)
        AND (${f.modulo}::text IS NULL OR m.slug = ${f.modulo}::text)
        AND (${f.tipo}::text IS NULL OR q.tipo = ${f.tipo}::text)
        AND (${f.desde}::date IS NULL OR p.enviado_en >= (${f.desde}::date)::timestamp AT TIME ZONE ${ZONA_MEXICO})
        AND (${f.hasta}::date IS NULL OR p.enviado_en < (${f.hasta}::date + 1)::timestamp AT TIME ZONE ${ZONA_MEXICO})
      ORDER BY p.enviado_en DESC, p.numero DESC`;
  }

  private resultado(f: FilaResultado): ResultadoIntento {
    return {
      intentoId: f.intento_id,
      enviadoEn: f.enviado_en.toISOString(),
      tipo: f.tipo,
      titulo: f.titulo,
      modulo: { slug: f.modulo_slug, titulo: f.modulo_titulo },
      curso: { slug: f.curso_slug, titulo: f.curso_titulo },
      leccion:
        f.leccion_slug === null
          ? null
          : { slug: f.leccion_slug, titulo: f.leccion_titulo ?? '' },
      calificacion: Number(f.calificacion),
      numero: f.numero,
      destacado: f.destacado,
    };
  }
}
