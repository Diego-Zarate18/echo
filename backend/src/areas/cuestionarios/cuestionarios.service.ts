import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { ErrorApi } from '../../comun/errores/error-api';
import { PrismaService } from '../../infraestructura/base-de-datos/prisma.service';
import { ClaveOpacaService } from '../../infraestructura/seguridad/clave-opaca.service';
import { mezclar } from './mezclar';
import { TIPO_PREGUNTA_API } from './tipos';
import type {
  EtiquetaDecision,
  Fundamento,
  PreguntaCalificada,
  PreguntaParaResponder,
  RespuestasInternas,
} from './tipos';

type Cliente = Pick<Prisma.TransactionClient, '$queryRaw' | '$executeRaw'>;

const dosDecimales = (numero: number) => Math.round(numero * 100) / 100;
const etiquetaDe = (valor: number): EtiquetaDecision =>
  valor >= 1 ? 'optima' : valor <= 0 ? 'riesgosa' : 'aceptable';
const esEntero = (valor: unknown): valor is number =>
  typeof valor === 'number' && Number.isSafeInteger(valor);
const formatoInvalido = () =>
  new ErrorApi('DATOS_INVALIDOS', {
    campos: { respuestas: 'FORMATO_INVALIDO' },
  });

interface FilaPregunta {
  id: bigint;
  tipo: string;
  enunciado: string;
}

/**
 * Armar, recibir y calificar cuestionarios (C-06, INV-04, DEC-91), compartido por evaluables y examen (DEC-104).
 * REQUIERE REVISIÓN HUMANA: aquí está la frontera entre lo que el alumno puede ver antes y después de enviar.
 */
@Injectable()
export class CuestionariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly claves: ClaveOpacaService,
  ) {}

  /**
   * Preguntas activas para responder. Las consultas solo leen columnas que el alumno puede ver: valor,
   * retroalimentación, consecuencia y fundamento no salen de la base en este camino (INV-04).
   * Sin semilla (actividades y casos) preguntas y opciones van en su orden; con semilla (exámenes, DEC-09) se
   * mezclan. La columna derecha de una relación siempre va mezclada y con claves opacas (DEC-91).
   */
  async paraResponder(
    usuarioId: string,
    cuestionarioId: number,
    semilla: number | null = null,
    cliente: Cliente = this.prisma,
  ): Promise<PreguntaParaResponder[]> {
    const [preguntas, opciones, parejas] = await Promise.all([
      cliente.$queryRaw<FilaPregunta[]>`
        SELECT id, tipo, enunciado FROM pregunta
        WHERE cuestionario_id = ${cuestionarioId} AND activa
        ORDER BY orden`,
      cliente.$queryRaw<{ id: bigint; pregunta_id: bigint; texto: string }[]>`
        SELECT o.id, o.pregunta_id, o.texto
        FROM opcion o JOIN pregunta p ON p.id = o.pregunta_id
        WHERE p.cuestionario_id = ${cuestionarioId} AND p.activa AND o.activa
        ORDER BY o.pregunta_id, o.orden`,
      cliente.$queryRaw<
        {
          id: bigint;
          pregunta_id: bigint;
          texto_izquierdo: string;
          texto_derecho: string;
        }[]
      >`
        SELECT x.id, x.pregunta_id, x.texto_izquierdo, x.texto_derecho
        FROM pareja x JOIN pregunta p ON p.id = x.pregunta_id
        WHERE p.cuestionario_id = ${cuestionarioId} AND p.activa
        ORDER BY x.pregunta_id, x.orden`,
    ]);

    const armadas = preguntas.map((fila): PreguntaParaResponder => {
      const id = Number(fila.id);
      const tipo = TIPO_PREGUNTA_API[fila.tipo];
      if (tipo === 'relacion') {
        const propias = parejas.filter((x) => Number(x.pregunta_id) === id);
        const izquierda = propias.map((x) => ({
          id: Number(x.id),
          texto: x.texto_izquierdo,
        }));
        const derecha = propias.map((x) => ({
          clave: this.claves.generar(usuarioId, id, Number(x.id)),
          texto: x.texto_derecho,
        }));
        const semillaDerecha =
          semilla ?? this.claves.semillaDeOrden(usuarioId, id);
        return {
          id,
          tipo,
          enunciado: fila.enunciado,
          izquierda:
            semilla === null ? izquierda : mezclar(izquierda, semilla + id),
          derecha: mezclar(derecha, semillaDerecha + id * 7),
        };
      }
      const propias = opciones
        .filter((o) => Number(o.pregunta_id) === id)
        .map((o) => ({ id: Number(o.id), texto: o.texto }));
      return {
        id,
        tipo,
        enunciado: fila.enunciado,
        // Verdadero/falso conserva su orden también en exámenes, como en el simulador.
        opciones:
          semilla === null || tipo === 'verdaderoFalso'
            ? propias
            : mezclar(propias, semilla + id),
      };
    });
    return semilla === null ? armadas : mezclar(armadas, semilla);
  }

  /**
   * Traduce las respuestas del cuerpo a ids de la base. Cualquier respuesta que no corresponda al cuestionario
   * (pregunta ajena, opción de otra pregunta, clave inválida, unión repetida) da 422 FORMATO_INVALIDO. Con
   * `completa`, faltar una pregunta o una unión da RESPUESTAS_INCOMPLETAS con las preguntas pendientes.
   */
  async traducirRespuestas(
    usuarioId: string,
    cuestionarioId: number,
    entradas: unknown,
    { completa }: { completa: boolean },
    cliente: Cliente = this.prisma,
  ): Promise<RespuestasInternas> {
    if (!Array.isArray(entradas)) {
      throw new ErrorApi('DATOS_INVALIDOS', {
        campos: { respuestas: 'OBLIGATORIO' },
      });
    }
    const [preguntas, opciones, parejas] = await Promise.all([
      cliente.$queryRaw<{ id: bigint; tipo: string }[]>`
        SELECT id, tipo FROM pregunta
        WHERE cuestionario_id = ${cuestionarioId} AND activa
        ORDER BY orden`,
      cliente.$queryRaw<{ id: bigint; pregunta_id: bigint }[]>`
        SELECT o.id, o.pregunta_id
        FROM opcion o JOIN pregunta p ON p.id = o.pregunta_id
        WHERE p.cuestionario_id = ${cuestionarioId} AND p.activa AND o.activa`,
      cliente.$queryRaw<{ id: bigint; pregunta_id: bigint }[]>`
        SELECT x.id, x.pregunta_id
        FROM pareja x JOIN pregunta p ON p.id = x.pregunta_id
        WHERE p.cuestionario_id = ${cuestionarioId} AND p.activa`,
    ]);
    const tipoDe = new Map(preguntas.map((p) => [Number(p.id), p.tipo]));
    const parejasDe = (preguntaId: number) =>
      parejas
        .filter((x) => Number(x.pregunta_id) === preguntaId)
        .map((x) => Number(x.id));

    const internas: RespuestasInternas = { opciones: [], parejas: [] };
    const respondidas = new Set<number>();
    const incompletas = new Set<number>();
    for (const entrada of entradas as unknown[]) {
      if (!entrada || typeof entrada !== 'object') throw formatoInvalido();
      const { preguntaId, opcionId, uniones } = entrada as Record<
        string,
        unknown
      >;
      if (
        !esEntero(preguntaId) ||
        !tipoDe.has(preguntaId) ||
        respondidas.has(preguntaId)
      ) {
        throw formatoInvalido();
      }
      respondidas.add(preguntaId);

      if (tipoDe.get(preguntaId) === 'relacion') {
        if (!Array.isArray(uniones) || opcionId !== undefined)
          throw formatoInvalido();
        const ids = parejasDe(preguntaId);
        const izquierdas = new Set<number>();
        const derechas = new Set<number>();
        for (const union of uniones as unknown[]) {
          const { izquierdaId, derechaClave } = (union ?? {}) as Record<
            string,
            unknown
          >;
          if (!esEntero(izquierdaId) || !ids.includes(izquierdaId))
            throw formatoInvalido();
          if (typeof derechaClave !== 'string' || derechaClave.length > 100)
            throw formatoInvalido();
          const derechaId = this.claves.resolver(
            usuarioId,
            preguntaId,
            ids,
            derechaClave,
          );
          if (
            derechaId === null ||
            izquierdas.has(izquierdaId) ||
            derechas.has(derechaId)
          ) {
            throw formatoInvalido();
          }
          izquierdas.add(izquierdaId);
          derechas.add(derechaId);
          internas.parejas.push({ izquierdaId, derechaId });
        }
        if (izquierdas.size < ids.length) incompletas.add(preguntaId);
      } else {
        if (uniones !== undefined || !esEntero(opcionId))
          throw formatoInvalido();
        const valida = opciones.some(
          (o) =>
            Number(o.id) === opcionId && Number(o.pregunta_id) === preguntaId,
        );
        if (!valida) throw formatoInvalido();
        internas.opciones.push({ preguntaId, opcionId });
      }
    }

    if (completa) {
      const pendientes = preguntas
        .map((p) => Number(p.id))
        .filter((id) => !respondidas.has(id) || incompletas.has(id));
      if (pendientes.length > 0) {
        throw new ErrorApi('RESPUESTAS_INCOMPLETAS', {
          preguntasPendientes: pendientes,
        });
      }
    }
    return internas;
  }

  /**
   * Guarda las respuestas de un intento en curso; reemplaza las que ya tuviera esas preguntas. echo_app no puede
   * borrar respuestas: solo insertarlas o cambiarlas.
   */
  async guardarRespuestas(
    cliente: Cliente,
    intentoId: string,
    respuestas: RespuestasInternas,
  ): Promise<void> {
    if (respuestas.opciones.length > 0) {
      await cliente.$executeRaw`
        INSERT INTO respuesta_opcion (intento_id, pregunta_id, opcion_id)
        SELECT ${intentoId}::uuid, r.pregunta_id, r.opcion_id
        FROM unnest(${respuestas.opciones.map((r) => r.preguntaId)}::bigint[],
                    ${respuestas.opciones.map((r) => r.opcionId)}::bigint[]) AS r(pregunta_id, opcion_id)
        ON CONFLICT (intento_id, pregunta_id)
        DO UPDATE SET opcion_id = EXCLUDED.opcion_id, respondido_en = now()`;
    }
    if (respuestas.parejas.length > 0) {
      const izquierdas = respuestas.parejas.map((r) => r.izquierdaId);
      await cliente.$executeRaw`
        INSERT INTO respuesta_pareja (intento_id, pareja_izquierda_id, pareja_derecha_id)
        SELECT ${intentoId}::uuid, r.izquierda, r.derecha
        FROM unnest(${izquierdas}::bigint[],
                    ${respuestas.parejas.map((r) => r.derechaId)}::bigint[]) AS r(izquierda, derecha)
        ON CONFLICT (intento_id, pareja_izquierda_id)
        DO UPDATE SET pareja_derecha_id = EXCLUDED.pareja_derecha_id, respondido_en = now()`;
    }
  }

  /**
   * Retroalimentación completa de un intento ya enviado (PreguntaCalificada): en actividades y exámenes
   * aprobados, con la respuesta correcta; en casos, la decisión con su etiqueta (DEC-16). Solo se llama después
   * de fn_enviar_intento, que es quien califica (INV-04).
   */
  async calificadas(
    cliente: Cliente,
    intentoId: string,
  ): Promise<PreguntaCalificada[]> {
    const [preguntas, opciones, parejas, fundamentos] = await Promise.all([
      cliente.$queryRaw<
        {
          id: bigint;
          tipo: string;
          enunciado: string;
          retroalimentacion: string | null;
          fundamento_id: bigint | null;
          opcion_id: bigint | null;
          puntaje: Prisma.Decimal | null;
        }[]
      >`
        SELECT p.id, p.tipo, p.enunciado, p.retroalimentacion, p.fundamento_id, r.opcion_id, r.puntaje
        FROM intento i
        JOIN pregunta p ON p.cuestionario_id = i.cuestionario_id AND p.activa
        LEFT JOIN respuesta_opcion r ON r.intento_id = i.id AND r.pregunta_id = p.id
        WHERE i.id = ${intentoId}::uuid AND i.estado = 'enviado'
        ORDER BY p.orden`,
      cliente.$queryRaw<
        {
          id: bigint;
          pregunta_id: bigint;
          texto: string;
          valor: Prisma.Decimal;
          retroalimentacion: string | null;
          consecuencia: string | null;
          fundamento_id: bigint | null;
        }[]
      >`
        SELECT o.id, o.pregunta_id, o.texto, o.valor, o.retroalimentacion, o.consecuencia, o.fundamento_id
        FROM intento i
        JOIN pregunta p ON p.cuestionario_id = i.cuestionario_id AND p.activa
        JOIN opcion o ON o.pregunta_id = p.id
        WHERE i.id = ${intentoId}::uuid
          AND (o.activa OR EXISTS (SELECT 1 FROM respuesta_opcion r WHERE r.intento_id = i.id AND r.opcion_id = o.id))
        ORDER BY o.pregunta_id, o.orden`,
      cliente.$queryRaw<
        {
          id: bigint;
          pregunta_id: bigint;
          texto_izquierdo: string;
          texto_derecho: string;
          derecha_elegida: bigint | null;
        }[]
      >`
        SELECT x.id, x.pregunta_id, x.texto_izquierdo, x.texto_derecho, rp.pareja_derecha_id AS derecha_elegida
        FROM intento i
        JOIN pregunta p ON p.cuestionario_id = i.cuestionario_id AND p.activa
        JOIN pareja x ON x.pregunta_id = p.id
        LEFT JOIN respuesta_pareja rp ON rp.intento_id = i.id AND rp.pareja_izquierda_id = x.id
        WHERE i.id = ${intentoId}::uuid
        ORDER BY x.pregunta_id, x.orden`,
      cliente.$queryRaw<
        {
          id: bigint;
          tipo: Fundamento['tipo'];
          nombre: string;
          articulo: string | null;
          descripcion: string;
          referencia: string | null;
        }[]
      >`
        SELECT f.id, f.tipo, f.nombre, f.articulo, f.descripcion, f.referencia
        FROM fundamento f
        WHERE f.id IN (
          SELECT p.fundamento_id FROM intento i JOIN pregunta p ON p.cuestionario_id = i.cuestionario_id
          WHERE i.id = ${intentoId}::uuid
          UNION
          SELECT o.fundamento_id FROM intento i
          JOIN pregunta p ON p.cuestionario_id = i.cuestionario_id
          JOIN opcion o ON o.pregunta_id = p.id
          WHERE i.id = ${intentoId}::uuid)`,
    ]);

    const fundamento = (id: bigint | null): Fundamento | null => {
      const f = id === null ? undefined : fundamentos.find((x) => x.id === id);
      return f
        ? {
            tipo: f.tipo,
            nombre: f.nombre,
            articulo: f.articulo,
            descripcion: f.descripcion,
            referencia: f.referencia,
          }
        : null;
    };
    const textoPorPareja = new Map(parejas.map((x) => [x.id, x.texto_derecho]));

    return preguntas.map((p): PreguntaCalificada => {
      const tipo = TIPO_PREGUNTA_API[p.tipo];
      // Las llaves van en el orden de PreguntaCalificada en el contrato.
      const base = (puntaje: number) => ({
        id: Number(p.id),
        tipo,
        enunciado: p.enunciado,
        puntaje,
        correcta: puntaje >= 1,
        retroalimentacion: p.retroalimentacion,
        fundamento: fundamento(p.fundamento_id),
      });
      if (tipo === 'relacion') {
        const propias = parejas.filter((x) => x.pregunta_id === p.id);
        const aciertos = propias.filter(
          (x) => x.derecha_elegida === x.id,
        ).length;
        const puntaje = propias.length
          ? dosDecimales(aciertos / propias.length)
          : 0;
        return {
          ...base(puntaje),
          uniones: propias.map((x) => ({
            izquierda: x.texto_izquierdo,
            derechaElegida:
              x.derecha_elegida === null
                ? null
                : (textoPorPareja.get(x.derecha_elegida) ?? null),
            derechaCorrecta: x.texto_derecho,
            correcta: x.derecha_elegida === x.id,
          })),
        };
      }
      const puntaje = dosDecimales(p.puntaje === null ? 0 : Number(p.puntaje));
      const propias = opciones.filter((o) => o.pregunta_id === p.id);
      if (tipo === 'decision') {
        const elegida = propias.find((o) => o.id === p.opcion_id);
        return {
          ...base(puntaje),
          decision: {
            opcionElegida: elegida?.texto ?? '',
            etiqueta: etiquetaDe(elegida ? Number(elegida.valor) : 0),
            consecuencia: elegida?.consecuencia ?? null,
            retroalimentacion: elegida?.retroalimentacion ?? null,
            fundamento: fundamento(elegida?.fundamento_id ?? p.fundamento_id),
          },
        };
      }
      return {
        ...base(puntaje),
        opciones: propias.map((o) => ({
          id: Number(o.id),
          texto: o.texto,
          elegida: o.id === p.opcion_id,
          correcta: Number(o.valor) >= 1,
          retroalimentacion: o.retroalimentacion,
        })),
      };
    });
  }
}
