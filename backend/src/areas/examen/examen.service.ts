import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { ErrorApi } from '../../comun/errores/error-api';
import { conErroresDeBd } from '../../infraestructura/base-de-datos/errores-bd';
import { PrismaService } from '../../infraestructura/base-de-datos/prisma.service';
import { CuestionariosService } from '../cuestionarios/cuestionarios.service';
import { mezclar } from '../cuestionarios/mezclar';
import type {
  PreguntaCalificada,
  PreguntaParaResponder,
  PreguntaSinSolucion,
  RespuestaGuardada,
} from '../cuestionarios/tipos';

type Cliente = Pick<Prisma.TransactionClient, '$queryRaw'>;
type Referencia = { slug: string; titulo: string };
type EstadoExamen =
  'bloqueado' | 'disponible' | 'enCurso' | 'enEspera' | 'aprobado';

const MINUTO = 60_000;

interface ExamenBd {
  id: number;
  titulo: string;
  instrucciones: string;
  calificacionMinima: number;
  minutosEspera: number;
  curso: Referencia;
  cursoDesbloqueado: boolean;
  examenDesbloqueado: boolean;
}

interface IntentoBd {
  id: string;
  cuestionarioId: number;
  numero: number;
  estado: 'en_curso' | 'enviado';
  semilla: number;
  iniciadoEn: Date;
}

export interface IntentoEnCurso {
  id: string;
  numero: number;
  iniciadoEn: string;
  examen: { id: number; titulo: string };
  preguntas: PreguntaParaResponder[];
  respuestas: RespuestaGuardada[];
}

interface Insignia {
  nombre: string;
  descripcion: string;
  imagen: { ruta: string; textoAlternativo: string; pie: string | null };
  obtenidaEn: string | null;
}

interface BaseResultado {
  intento: {
    id: string;
    numero: number;
    enviadoEn: string;
    calificacion: number;
  };
  calificacionMinima: number;
  aciertos: number;
  errores: number;
}

export type ResultadoExamen =
  | ({ resultado: 'aprobado' } & BaseResultado & {
        cursoCompletado: Referencia;
        insigniaNueva: Insignia | null;
        preguntas: PreguntaCalificada[];
      })
  | ({ resultado: 'reprobado' } & BaseResultado & {
        leccionesRepaso: Referencia[];
        minutosEspera: number;
        disponibleEn: string;
        preguntas: PreguntaSinSolucion[];
      });

/**
 * Exámenes (OP-24 a OP-27): se abre o retoma un intento, se guarda cada respuesta y se envía al final. Los intentos
 * solo los crea fn_iniciar_intento (INV-05) y solo los califica fn_enviar_intento (INV-04). El orden de preguntas y
 * opciones sale de la semilla del intento (DEC-09). Un intento ajeno es igual que uno inexistente (INV-07).
 * REQUIERE REVISIÓN HUMANA: calificación, intentos y respuestas de los alumnos.
 */
@Injectable()
export class ExamenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cuestionarios: CuestionariosService,
  ) {}

  /** obtenerPortadaExamen (OP-24). */
  async portada(usuarioId: string, cuestionarioId: number) {
    const examen = await this.examen(usuarioId, cuestionarioId);
    if (!examen.cursoDesbloqueado) throw new ErrorApi('BLOQUEADO_POR_AVANCE');
    const [[conteo], [reloj], intentos] = await Promise.all([
      this.prisma.$queryRaw<{ preguntas: number }[]>`
        SELECT count(*)::int AS preguntas FROM pregunta
        WHERE cuestionario_id = ${examen.id} AND activa`,
      this.prisma.$queryRaw<{ ahora: Date }[]>`SELECT now() AS ahora`,
      this.prisma.$queryRaw<
        {
          id: string;
          numero: number;
          estado: string;
          enviado_en: Date | null;
          calificacion: Prisma.Decimal | null;
          aprobado: boolean | null;
        }[]
      >`
        SELECT id, numero, estado, enviado_en, calificacion, aprobado
        FROM intento
        WHERE usuario_id = ${usuarioId}::uuid AND cuestionario_id = ${examen.id}
        ORDER BY numero`,
    ]);
    const enviados = intentos.filter((i) => i.estado === 'enviado');
    const abierto = intentos.find((i) => i.estado === 'en_curso') ?? null;
    return {
      id: examen.id,
      titulo: examen.titulo,
      instrucciones: examen.instrucciones,
      curso: examen.curso,
      numeroPreguntas: conteo.preguntas,
      calificacionMinima: examen.calificacionMinima,
      ...this.estado(examen, enviados, abierto !== null, reloj.ahora),
      intentoEnCurso: abierto?.id ?? null,
      intentosPrevios: enviados.map((i) => ({
        id: i.id,
        numero: i.numero,
        enviadoEn: i.enviado_en!.toISOString(),
        calificacion: Number(i.calificacion),
        aprobado: i.aprobado === true,
      })),
    };
  }

  /**
   * iniciarIntentoExamen (OP-25): retoma el intento abierto o crea uno (fn_iniciar_intento revisa examen aprobado,
   * espera y desbloqueo). `retomado` decide entre 200 y 201.
   */
  async iniciar(
    usuarioId: string,
    cuestionarioId: number,
  ): Promise<{ retomado: boolean; intento: IntentoEnCurso }> {
    const examen = await this.examen(usuarioId, cuestionarioId);
    if (!examen.cursoDesbloqueado) throw new ErrorApi('BLOQUEADO_POR_AVANCE');
    const [creado] = await conErroresDeBd(
      () =>
        this.prisma.$queryRaw<
          {
            intento_id: string;
            numero: number;
            semilla: number;
            iniciado_en: Date;
            retomado: boolean;
          }[]
        >`
        SELECT intento_id, numero, semilla, iniciado_en, retomado
        FROM fn_iniciar_intento(${usuarioId}::uuid, ${examen.id}::bigint)`,
    );
    const preguntas = await this.cuestionarios.paraResponder(
      usuarioId,
      examen.id,
      creado.semilla,
    );
    return {
      retomado: creado.retomado,
      intento: {
        id: creado.intento_id,
        numero: creado.numero,
        iniciadoEn: creado.iniciado_en.toISOString(),
        examen: { id: examen.id, titulo: examen.titulo },
        preguntas,
        respuestas: await this.cuestionarios.respuestasGuardadas(
          usuarioId,
          creado.intento_id,
          preguntas.map((p) => p.id),
        ),
      },
    };
  }

  /**
   * guardarRespuesta (OP-26): mientras el intento siga abierto se puede cambiar cuantas veces se quiera. La
   * respuesta no dice si es correcta (INV-04). Si el intento se envía al mismo tiempo, el disparador de la base
   * responde INTENTO_CERRADO.
   */
  async guardarRespuesta(
    usuarioId: string,
    intentoId: string,
    preguntaId: number,
    cuerpo: unknown,
  ): Promise<RespuestaGuardada> {
    const intento = await this.intentoPropio(usuarioId, intentoId);
    if (intento.estado !== 'en_curso') throw new ErrorApi('INTENTO_CERRADO');
    const [pregunta] = await this.prisma.$queryRaw<{ tipo: string }[]>`
      SELECT tipo FROM pregunta
      WHERE id = ${preguntaId} AND cuestionario_id = ${intento.cuestionarioId} AND activa`;
    if (!pregunta) throw new ErrorApi('NO_ENCONTRADO');

    const datos = (
      cuerpo && typeof cuerpo === 'object' ? cuerpo : {}
    ) as Record<string, unknown>;
    const campo = pregunta.tipo === 'relacion' ? 'uniones' : 'opcionId';
    const respuestas = await this.cuestionarios
      .traducirRespuestas(
        usuarioId,
        intento.cuestionarioId,
        [{ preguntaId, opcionId: datos.opcionId, uniones: datos.uniones }],
        { completa: false },
      )
      .catch((error: unknown) => {
        if (error instanceof ErrorApi && error.codigo === 'DATOS_INVALIDOS') {
          throw new ErrorApi('DATOS_INVALIDOS', {
            campos: { [campo]: 'FORMATO_INVALIDO' },
          });
        }
        throw error;
      });

    await conErroresDeBd(() =>
      this.prisma.$transaction(async (tx) => {
        await this.cuestionarios.guardarRespuestas(tx, intento.id, respuestas);
      }),
    );
    const [guardada] = await this.cuestionarios.respuestasGuardadas(
      usuarioId,
      intento.id,
      [preguntaId],
    );
    return guardada;
  }

  /**
   * enviarExamen (OP-27): fn_enviar_intento revisa que todo esté respondido, califica y otorga la insignia si con
   * este examen se completa el módulo (OP-32). Aprobado: retroalimentación completa. Reprobado: qué falló y qué
   * repasar, sin la respuesta correcta, y cuándo puede volver a intentarlo (DEC-11, DEC-21).
   */
  async enviar(usuarioId: string, intentoId: string): Promise<ResultadoExamen> {
    const intento = await this.intentoPropio(usuarioId, intentoId);
    const [examen] = await this.prisma.$queryRaw<
      {
        tipo: string;
        curso_id: bigint | null;
        calificacion_minima: Prisma.Decimal;
        minutos_espera: number;
      }[]
    >`
      SELECT tipo, curso_id, calificacion_minima, minutos_espera
      FROM cuestionario WHERE id = ${intento.cuestionarioId}`;
    if (!examen || examen.tipo !== 'examen')
      throw new ErrorApi('NO_ENCONTRADO');
    if (intento.estado !== 'en_curso') throw new ErrorApi('INTENTO_CERRADO');

    return conErroresDeBd(() =>
      this.prisma.$transaction(async (tx) => {
        const [calificado] = await tx.$queryRaw<
          {
            calificacion: Prisma.Decimal;
            aprobado: boolean;
            insignia_id: bigint | null;
          }[]
        >`
          SELECT calificacion, aprobado, insignia_id
          FROM fn_enviar_intento(${intento.id}::uuid, ${usuarioId}::uuid)`;
        const [enviado] = await tx.$queryRaw<{ enviado_en: Date }[]>`
          SELECT enviado_en FROM intento WHERE id = ${intento.id}::uuid`;
        const [puntos] = await tx.$queryRaw<
          { total: number; aciertos: number }[]
        >`
          SELECT count(*)::int AS total,
                 count(*) FILTER (WHERE r.puntaje >= 1)::int AS aciertos
          FROM pregunta p
          LEFT JOIN respuesta_opcion r ON r.intento_id = ${intento.id}::uuid AND r.pregunta_id = p.id
          WHERE p.cuestionario_id = ${intento.cuestionarioId} AND p.activa`;
        const aciertosRelacion = await this.aciertosDeRelacion(tx, intento.id);
        const aciertos = puntos.aciertos + aciertosRelacion;
        const calificacionMinima = Number(examen.calificacion_minima);
        const base: BaseResultado = {
          intento: {
            id: intento.id,
            numero: intento.numero,
            enviadoEn: enviado.enviado_en.toISOString(),
            calificacion: Number(calificado.calificacion),
          },
          calificacionMinima,
          aciertos,
          errores: puntos.total - aciertos,
        };

        if (calificado.aprobado) {
          const [curso] = await tx.$queryRaw<Referencia[]>`
            SELECT slug, titulo FROM curso WHERE id = ${examen.curso_id}`;
          return {
            resultado: 'aprobado' as const,
            ...base,
            cursoCompletado: curso,
            insigniaNueva:
              calificado.insignia_id === null
                ? null
                : await this.insignia(
                    tx,
                    usuarioId,
                    Number(calificado.insignia_id),
                  ),
            preguntas: await this.cuestionarios.calificadas(
              tx,
              intento.id,
              intento.semilla,
            ),
          };
        }

        const preguntas = await this.cuestionarios.sinSolucion(tx, intento.id);
        // En el orden base, para sacar las lecciones de las preguntas falladas sin repetir y en el orden del
        // examen; después se muestran en el orden en que el alumno las vio (DEC-09).
        const repaso = new Map<string, Referencia>();
        for (const p of preguntas) {
          if (!p.correcta && p.leccionRepaso)
            repaso.set(p.leccionRepaso.slug, p.leccionRepaso);
        }
        return {
          resultado: 'reprobado' as const,
          ...base,
          leccionesRepaso: [...repaso.values()],
          minutosEspera: examen.minutos_espera,
          disponibleEn: new Date(
            enviado.enviado_en.getTime() + examen.minutos_espera * MINUTO,
          ).toISOString(),
          preguntas: mezclar(preguntas, intento.semilla),
        };
      }),
    );
  }

  /** El examen, si existe, está activo y su curso está publicado; con sus candados (fn_estado_desbloqueo). */
  private async examen(
    usuarioId: string,
    cuestionarioId: number,
    cliente: Cliente = this.prisma,
  ): Promise<ExamenBd> {
    const [fila] = await cliente.$queryRaw<
      {
        id: bigint;
        titulo: string;
        instrucciones: string;
        calificacion_minima: Prisma.Decimal;
        minutos_espera: number;
        curso_slug: string;
        curso_titulo: string;
        curso_desbloqueado: boolean | null;
        examen_desbloqueado: boolean;
      }[]
    >`
      WITH candados AS (SELECT * FROM fn_estado_desbloqueo(${usuarioId}::uuid))
      SELECT q.id, q.titulo, q.instrucciones, q.calificacion_minima, q.minutos_espera,
             c.slug AS curso_slug, c.titulo AS curso_titulo,
             (SELECT k.desbloqueado FROM candados k WHERE k.tipo = 'curso' AND k.id = c.id) AS curso_desbloqueado,
             e.desbloqueado AS examen_desbloqueado
      FROM candados e
      JOIN cuestionario q ON q.id = e.id
      JOIN curso c ON c.id = q.curso_id
      WHERE e.tipo = 'cuestionario' AND e.id = ${cuestionarioId} AND q.tipo = 'examen'`;
    if (!fila) throw new ErrorApi('NO_ENCONTRADO');
    return {
      id: Number(fila.id),
      titulo: fila.titulo,
      instrucciones: fila.instrucciones,
      calificacionMinima: Number(fila.calificacion_minima),
      minutosEspera: fila.minutos_espera,
      curso: { slug: fila.curso_slug, titulo: fila.curso_titulo },
      cursoDesbloqueado: fila.curso_desbloqueado === true,
      examenDesbloqueado: fila.examen_desbloqueado,
    };
  }

  /** C-05, con la hora del servidor: aprobado, en curso, en espera tras reprobar, disponible o bloqueado. */
  private estado(
    examen: ExamenBd,
    enviados: { enviado_en: Date | null; aprobado: boolean | null }[],
    abierto: boolean,
    ahora: Date,
  ): {
    estado: EstadoExamen;
    minutosRestantes: number | null;
    disponibleEn: string | null;
  } {
    const vacio = { minutosRestantes: null, disponibleEn: null };
    if (enviados.some((i) => i.aprobado))
      return { estado: 'aprobado', ...vacio };
    if (abierto) return { estado: 'enCurso', ...vacio };
    const ultimo = enviados
      .map((i) => i.enviado_en!)
      .sort((a, b) => a.getTime() - b.getTime())
      .at(-1);
    if (ultimo) {
      const disponible = new Date(
        ultimo.getTime() + examen.minutosEspera * MINUTO,
      );
      const restante = disponible.getTime() - ahora.getTime();
      if (restante > 0) {
        return {
          estado: 'enEspera',
          minutosRestantes: Math.max(1, Math.ceil(restante / MINUTO)),
          disponibleEn: disponible.toISOString(),
        };
      }
    }
    return {
      estado: examen.examenDesbloqueado ? 'disponible' : 'bloqueado',
      ...vacio,
    };
  }

  /** El intento, solo si es del alumno de la sesión (INV-07). */
  private async intentoPropio(
    usuarioId: string,
    intentoId: string,
  ): Promise<IntentoBd> {
    const [fila] = await this.prisma.$queryRaw<
      {
        id: string;
        cuestionario_id: bigint;
        numero: number;
        estado: 'en_curso' | 'enviado';
        semilla: number;
        iniciado_en: Date;
      }[]
    >`
      SELECT id, cuestionario_id, numero, estado, semilla, iniciado_en
      FROM intento WHERE id = ${intentoId}::uuid AND usuario_id = ${usuarioId}::uuid`;
    if (!fila) throw new ErrorApi('NO_ENCONTRADO');
    return {
      id: fila.id,
      cuestionarioId: Number(fila.cuestionario_id),
      numero: fila.numero,
      estado: fila.estado,
      semilla: fila.semilla,
      iniciadoEn: fila.iniciado_en,
    };
  }

  /** Preguntas de relación con todas sus parejas bien (para contar aciertos; los exámenes no las llevan, DEC-117). */
  private async aciertosDeRelacion(
    cliente: Cliente,
    intentoId: string,
  ): Promise<number> {
    const [fila] = await cliente.$queryRaw<{ aciertos: number }[]>`
      SELECT count(*)::int AS aciertos
      FROM intento i
      JOIN pregunta p ON p.cuestionario_id = i.cuestionario_id AND p.activa AND p.tipo = 'relacion'
      WHERE i.id = ${intentoId}::uuid
        AND NOT EXISTS (
          SELECT 1 FROM pareja x
          LEFT JOIN respuesta_pareja rp ON rp.intento_id = i.id AND rp.pareja_izquierda_id = x.id
          WHERE x.pregunta_id = p.id AND rp.pareja_derecha_id IS DISTINCT FROM x.id)`;
    return fila.aciertos;
  }

  private async insignia(
    cliente: Cliente,
    usuarioId: string,
    insigniaId: number,
  ): Promise<Insignia | null> {
    const [fila] = await cliente.$queryRaw<
      {
        nombre: string;
        descripcion: string;
        ruta: string;
        texto_alternativo: string;
        pie: string | null;
        otorgada_en: Date | null;
      }[]
    >`
      SELECT s.nombre, s.descripcion, i.ruta, i.texto_alternativo, i.pie, iu.otorgada_en
      FROM insignia s
      JOIN imagen i ON i.id = s.imagen_id
      LEFT JOIN insignia_usuario iu ON iu.insignia_id = s.id AND iu.usuario_id = ${usuarioId}::uuid
      WHERE s.id = ${insigniaId}`;
    if (!fila) return null;
    return {
      nombre: fila.nombre,
      descripcion: fila.descripcion,
      imagen: {
        ruta: fila.ruta,
        textoAlternativo: fila.texto_alternativo,
        pie: fila.pie,
      },
      obtenidaEn: fila.otorgada_en?.toISOString() ?? null,
    };
  }
}
