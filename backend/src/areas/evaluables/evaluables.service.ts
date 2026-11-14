import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { ErrorApi } from '../../comun/errores/error-api';
import { conErroresDeBd } from '../../infraestructura/base-de-datos/errores-bd';
import { PrismaService } from '../../infraestructura/base-de-datos/prisma.service';
import { CuestionariosService } from '../cuestionarios/cuestionarios.service';
import type {
  PreguntaCalificada,
  PreguntaParaResponder,
} from '../cuestionarios/tipos';

type Cliente = Pick<Prisma.TransactionClient, '$queryRaw'>;

interface Evaluable {
  id: number;
  tipo: 'actividad' | 'caso';
  titulo: string;
  instrucciones: string;
  leccion: { slug: string; titulo: string };
}

export interface Actividad extends Evaluable {
  preguntas: PreguntaParaResponder[];
  intentosEnviados: number;
  mejorCalificacion: number | null;
}

export interface ResultadoActividad {
  intento: {
    id: string;
    numero: number;
    enviadoEn: string;
    calificacion: number;
  };
  tipo: 'actividad' | 'caso';
  mejorCalificacion: number;
  preguntas: PreguntaCalificada[];
}

/**
 * Actividades y casos prácticos (OP-22, OP-23). Se abren sin crear intento y se envían de una vez: el intento se
 * crea, se responde y se califica en una sola transacción (fn_iniciar_intento y fn_enviar_intento, INV-04,
 * INV-05). Reintentos ilimitados y sin espera (DEC-17).
 * REQUIERE REVISIÓN HUMANA: calificación y respuestas de los alumnos.
 */
@Injectable()
export class EvaluablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cuestionarios: CuestionariosService,
  ) {}

  /** abrirActividad (OP-22): no crea intento. */
  async abrir(usuarioId: string, cuestionarioId: number): Promise<Actividad> {
    const evaluable = await this.disponible(usuarioId, cuestionarioId);
    const [preguntas, [resumen]] = await Promise.all([
      this.cuestionarios.paraResponder(usuarioId, evaluable.id),
      this.prisma.$queryRaw<
        { enviados: number; mejor: Prisma.Decimal | null }[]
      >`
        SELECT count(*)::int AS enviados, max(calificacion) AS mejor
        FROM intento
        WHERE usuario_id = ${usuarioId}::uuid AND cuestionario_id = ${evaluable.id} AND estado = 'enviado'`,
    ]);
    return {
      ...evaluable,
      preguntas,
      intentosEnviados: resumen.enviados,
      mejorCalificacion: resumen.mejor === null ? null : Number(resumen.mejor),
    };
  }

  /** enviarActividad (OP-23). */
  async enviar(
    usuarioId: string,
    cuestionarioId: number,
    cuerpo: unknown,
  ): Promise<ResultadoActividad> {
    const evaluable = await this.disponible(usuarioId, cuestionarioId);
    const entradas =
      cuerpo && typeof cuerpo === 'object'
        ? (cuerpo as { respuestas?: unknown }).respuestas
        : undefined;
    const respuestas = await this.cuestionarios.traducirRespuestas(
      usuarioId,
      evaluable.id,
      entradas,
      { completa: true },
    );

    return conErroresDeBd(() =>
      this.prisma.$transaction(async (tx) => {
        const [intento] = await tx.$queryRaw<{ intento_id: string }[]>`
          SELECT intento_id FROM fn_iniciar_intento(${usuarioId}::uuid, ${evaluable.id}::bigint)`;
        await this.cuestionarios.guardarRespuestas(
          tx,
          intento.intento_id,
          respuestas,
        );
        await tx.$queryRaw`
          SELECT calificacion FROM fn_enviar_intento(${intento.intento_id}::uuid, ${usuarioId}::uuid)`;

        const [enviado] = await tx.$queryRaw<
          {
            numero: number;
            enviado_en: Date;
            calificacion: Prisma.Decimal;
            mejor: Prisma.Decimal;
          }[]
        >`
          SELECT i.numero, i.enviado_en, i.calificacion,
                 (SELECT max(x.calificacion) FROM intento x
                  WHERE x.usuario_id = i.usuario_id AND x.cuestionario_id = i.cuestionario_id
                    AND x.estado = 'enviado') AS mejor
          FROM intento i WHERE i.id = ${intento.intento_id}::uuid`;
        return {
          intento: {
            id: intento.intento_id,
            numero: enviado.numero,
            enviadoEn: enviado.enviado_en.toISOString(),
            calificacion: Number(enviado.calificacion),
          },
          tipo: evaluable.tipo,
          mejorCalificacion: Number(enviado.mejor),
          preguntas: await this.cuestionarios.calificadas(
            tx,
            intento.intento_id,
          ),
        };
      }),
    );
  }

  /**
   * La actividad o el caso, si existe, está activo, es de contenido publicado y ya se desbloqueó (lección leída
   * y orden de la actividad y los casos, fn_estado_desbloqueo). Un examen por esta ruta no existe.
   */
  private async disponible(
    usuarioId: string,
    cuestionarioId: number,
    cliente: Cliente = this.prisma,
  ): Promise<Evaluable> {
    const [fila] = await cliente.$queryRaw<
      {
        id: bigint;
        tipo: string;
        titulo: string;
        instrucciones: string;
        leccion_slug: string;
        leccion_titulo: string;
        desbloqueado: boolean;
      }[]
    >`
      SELECT q.id, q.tipo, q.titulo, q.instrucciones, l.slug AS leccion_slug, l.titulo AS leccion_titulo,
             e.desbloqueado
      FROM fn_estado_desbloqueo(${usuarioId}::uuid) e
      JOIN cuestionario q ON q.id = e.id
      JOIN leccion l ON l.id = q.leccion_id
      WHERE e.tipo = 'cuestionario' AND e.id = ${cuestionarioId} AND q.tipo IN ('actividad', 'caso')`;
    if (!fila) throw new ErrorApi('NO_ENCONTRADO');
    if (!fila.desbloqueado) throw new ErrorApi('BLOQUEADO_POR_AVANCE');
    return {
      id: Number(fila.id),
      tipo: fila.tipo as 'actividad' | 'caso',
      titulo: fila.titulo,
      instrucciones: fila.instrucciones,
      leccion: { slug: fila.leccion_slug, titulo: fila.leccion_titulo },
    };
  }
}
