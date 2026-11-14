import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { ErrorApi } from '../../comun/errores/error-api';
import { PrismaService } from '../../infraestructura/base-de-datos/prisma.service';
import { FuncionesBdService } from '../../infraestructura/base-de-datos/funciones-bd.service';
import { ArbolContenido } from './arbol-contenido';
import type {
  Candado,
  CuestionarioBd,
  CursoBd,
  InsigniaBd,
  IntentosResumen,
  LeccionBd,
  ModuloBd,
  ProgresoBd,
  ResumenEvaluable,
} from './arbol-contenido';

type Cliente = Pick<Prisma.TransactionClient, '$queryRaw'>;

const FORMATO_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAXIMO_TERMINOS = 10;

export interface Seccion {
  orden: number;
  titulo: string;
  cuerpo: string;
  imagen: { ruta: string; textoAlternativo: string; pie: string | null } | null;
}

export interface ResultadoBusqueda {
  tipo: 'modulo' | 'curso' | 'leccion';
  slug: string;
  titulo: string;
  estado: string;
  contexto: string | null;
}

/**
 * Contenido y navegación (OP-15 a OP-21). Solo se muestra lo publicado; los candados y el avance los calcula la
 * base (INV-06) y aquí se combinan. Todo se calcula para el alumno de la sesión (INV-07).
 */
@Injectable()
export class ContenidoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly funciones: FuncionesBdService,
  ) {}

  /** Carga el contenido publicado y el avance del alumno. */
  async arbol(
    usuarioId: string,
    cliente: Cliente = this.prisma,
  ): Promise<ArbolContenido> {
    const [modulos, cursos, lecciones, cuestionarios, insignias] =
      await Promise.all([
        cliente.$queryRaw<
          {
            id: bigint;
            slug: string;
            titulo: string;
            descripcion: string;
            orden: number;
          }[]
        >`
        SELECT id, slug, titulo, descripcion, orden FROM modulo WHERE publicado`,
        cliente.$queryRaw<
          {
            id: bigint;
            modulo_id: bigint;
            slug: string;
            titulo: string;
            descripcion: string;
            orden: number;
          }[]
        >`
        SELECT c.id, c.modulo_id, c.slug, c.titulo, c.descripcion, c.orden
        FROM curso c JOIN modulo m ON m.id = c.modulo_id
        WHERE c.publicado AND m.publicado`,
        cliente.$queryRaw<
          {
            id: bigint;
            curso_id: bigint;
            slug: string;
            titulo: string;
            resumen: string | null;
            orden: number;
            publicado_en: Date | null;
          }[]
        >`
        SELECT l.id, l.curso_id, l.slug, l.titulo, l.resumen, l.orden, l.publicado_en
        FROM leccion l
        JOIN curso c ON c.id = l.curso_id
        JOIN modulo m ON m.id = c.modulo_id
        WHERE l.publicado AND c.publicado AND m.publicado`,
        cliente.$queryRaw<
          {
            id: bigint;
            tipo: 'actividad' | 'caso' | 'examen';
            leccion_id: bigint | null;
            curso_id: bigint | null;
            orden: number | null;
            titulo: string;
            minutos_espera: number;
          }[]
        >`
        SELECT id, tipo, leccion_id, curso_id, orden, titulo, minutos_espera
        FROM cuestionario WHERE activo`,
        cliente.$queryRaw<
          {
            modulo_id: bigint;
            nombre: string;
            descripcion: string;
            ruta: string;
            texto_alternativo: string;
            pie: string | null;
            otorgada_en: Date | null;
          }[]
        >`
        SELECT s.modulo_id, s.nombre, s.descripcion, i.ruta, i.texto_alternativo, i.pie, iu.otorgada_en
        FROM insignia s
        JOIN imagen i ON i.id = s.imagen_id
        LEFT JOIN insignia_usuario iu ON iu.insignia_id = s.id AND iu.usuario_id = ${usuarioId}::uuid`,
      ]);

    const [candados, avances, progresos, intentos, [reloj]] = await Promise.all(
      [
        cliente.$queryRaw<
          {
            tipo: string;
            id: bigint;
            desbloqueado: boolean;
            completo: boolean;
          }[]
        >`
        SELECT tipo, id, desbloqueado, completo FROM fn_estado_desbloqueo(${usuarioId}::uuid)`,
        cliente.$queryRaw<{ curso_id: bigint; avance: Prisma.Decimal }[]>`
        SELECT curso_id, avance FROM v_avance_curso WHERE usuario_id = ${usuarioId}::uuid`,
        cliente.$queryRaw<
          {
            leccion_id: bigint;
            ultima_seccion: number;
            abierta_en: Date;
            terminada_en: Date | null;
          }[]
        >`
        SELECT leccion_id, ultima_seccion, abierta_en, terminada_en
        FROM progreso_leccion WHERE usuario_id = ${usuarioId}::uuid`,
        cliente.$queryRaw<
          {
            cuestionario_id: bigint;
            abierto: boolean;
            enviados: number;
            mejor: Prisma.Decimal | null;
            ultimo: Date | null;
            aprobado_en: Date | null;
          }[]
        >`
        SELECT cuestionario_id,
               bool_or(estado = 'en_curso') AS abierto,
               count(*) FILTER (WHERE estado = 'enviado')::int AS enviados,
               max(calificacion) FILTER (WHERE estado = 'enviado') AS mejor,
               max(enviado_en) FILTER (WHERE estado = 'enviado') AS ultimo,
               min(enviado_en) FILTER (WHERE aprobado) AS aprobado_en
        FROM intento WHERE usuario_id = ${usuarioId}::uuid
        GROUP BY cuestionario_id`,
        cliente.$queryRaw<{ ahora: Date }[]>`SELECT now() AS ahora`,
      ],
    );

    const n = (valor: bigint | null) => (valor === null ? null : Number(valor));
    return new ArbolContenido({
      ahora: reloj.ahora,
      modulos: modulos.map<ModuloBd>((m) => ({ ...m, id: Number(m.id) })),
      cursos: cursos.map<CursoBd>((c) => ({
        id: Number(c.id),
        moduloId: Number(c.modulo_id),
        slug: c.slug,
        titulo: c.titulo,
        descripcion: c.descripcion,
        orden: c.orden,
      })),
      lecciones: lecciones.map<LeccionBd>((l) => ({
        id: Number(l.id),
        cursoId: Number(l.curso_id),
        slug: l.slug,
        titulo: l.titulo,
        resumen: l.resumen,
        orden: l.orden,
        publicadoEn: l.publicado_en,
      })),
      cuestionarios: cuestionarios.map<CuestionarioBd>((q) => ({
        id: Number(q.id),
        tipo: q.tipo,
        leccionId: n(q.leccion_id),
        cursoId: n(q.curso_id),
        orden: q.orden,
        titulo: q.titulo,
        minutosEspera: q.minutos_espera,
      })),
      insignias: insignias.map<InsigniaBd>((s) => ({
        moduloId: Number(s.modulo_id),
        nombre: s.nombre,
        descripcion: s.descripcion,
        imagen: {
          ruta: s.ruta,
          textoAlternativo: s.texto_alternativo,
          pie: s.pie,
        },
        obtenidaEn: s.otorgada_en,
      })),
      candados: new Map<string, Candado>(
        candados.map((c) => [
          `${c.tipo}:${Number(c.id)}`,
          { desbloqueado: c.desbloqueado, completo: c.completo },
        ]),
      ),
      avanceCurso: new Map(
        avances.map((a) => [Number(a.curso_id), Number(a.avance)]),
      ),
      progreso: new Map<number, ProgresoBd>(
        progresos.map((p) => [
          Number(p.leccion_id),
          {
            ultimaSeccion: p.ultima_seccion,
            abiertaEn: p.abierta_en,
            terminadaEn: p.terminada_en,
          },
        ]),
      ),
      intentos: new Map<number, IntentosResumen>(
        intentos.map((i) => [
          Number(i.cuestionario_id),
          {
            abierto: i.abierto,
            enviados: i.enviados,
            mejorCalificacion: i.mejor === null ? null : Number(i.mejor),
            ultimoEnviadoEn: i.ultimo,
            aprobadoEn: i.aprobado_en,
          },
        ]),
      ),
    });
  }

  /** listarModulos (OP-15). */
  async listarModulos(usuarioId: string) {
    const arbol = await this.arbol(usuarioId);
    return {
      avanceGeneral: arbol.avanceGeneral(),
      modulos: arbol.modulos.map((m) => ({
        slug: m.slug,
        titulo: m.titulo,
        descripcion: m.descripcion,
        orden: m.orden,
        estado: arbol.estadoModulo(m),
        avance: arbol.avanceModulo(m),
        insignia: arbol.insignia(m),
        requisito: arbol.requisitoModulo(m),
      })),
    };
  }

  /** obtenerModulo (OP-16). */
  async obtenerModulo(usuarioId: string, slug: string) {
    const arbol = await this.arbol(usuarioId);
    const modulo = FORMATO_SLUG.test(slug) ? arbol.moduloPorSlug(slug) : null;
    if (!modulo) throw new ErrorApi('NO_ENCONTRADO');
    if (!arbol.moduloDisponible(modulo))
      throw new ErrorApi('BLOQUEADO_POR_AVANCE');
    return {
      slug: modulo.slug,
      titulo: modulo.titulo,
      descripcion: modulo.descripcion,
      estado: arbol.estadoModulo(modulo),
      avance: arbol.avanceModulo(modulo),
      insignia: arbol.insignia(modulo),
      cursos: arbol.cursosDe(modulo.id).map((c) => ({
        slug: c.slug,
        titulo: c.titulo,
        descripcion: c.descripcion,
        orden: c.orden,
        estado: arbol.estadoCurso(c),
        avance: arbol.avanceCurso(c),
        requisito: arbol.requisitoCurso(c),
      })),
    };
  }

  /** obtenerCurso (OP-17). */
  async obtenerCurso(usuarioId: string, slug: string) {
    const arbol = await this.arbol(usuarioId);
    const curso = FORMATO_SLUG.test(slug) ? arbol.cursoPorSlug(slug) : null;
    if (!curso) throw new ErrorApi('NO_ENCONTRADO');
    if (!arbol.cursoDisponible(curso))
      throw new ErrorApi('BLOQUEADO_POR_AVANCE');
    const examen = arbol.examenDe(curso.id);
    return {
      slug: curso.slug,
      titulo: curso.titulo,
      descripcion: curso.descripcion,
      modulo: arbol.referencia(arbol.moduloDe(curso)),
      estado: arbol.estadoCurso(curso),
      avance: arbol.avanceCurso(curso),
      lecciones: arbol.leccionesDe(curso.id).map((l) => ({
        slug: l.slug,
        titulo: l.titulo,
        resumen: l.resumen,
        orden: l.orden,
        estado: arbol.estadoLeccion(l),
        nueva: arbol.leccionNueva(l),
        evaluables: arbol
          .evaluablesDe(l.id)
          .map((q) => arbol.resumenEvaluable(q)),
      })),
      examen: examen ? arbol.resumenExamen(examen) : null,
    };
  }

  /**
   * abrirLeccion (OP-18): una lección bloqueada responde BLOQUEADO_POR_AVANCE aunque se pida directo por URL.
   * La primera apertura queda registrada; abrirla otra vez no cambia nada.
   */
  async abrirLeccion(usuarioId: string, slug: string) {
    let arbol = await this.arbol(usuarioId);
    const leccion = this.leccionDisponible(arbol, slug);
    const nueva = !arbol.progresoDe(leccion.id);
    if (nueva) {
      await this.prisma.$executeRaw`
        INSERT INTO progreso_leccion (usuario_id, leccion_id)
        VALUES (${usuarioId}::uuid, ${leccion.id})
        ON CONFLICT (usuario_id, leccion_id) DO NOTHING`;
      arbol = await this.arbol(usuarioId);
    }
    const progreso = arbol.progresoDe(leccion.id)!;
    const curso = arbol.cursoDe(leccion);
    const hermanas = arbol.leccionesDe(curso.id);
    const posicion = hermanas.findIndex((l) => l.id === leccion.id);
    return {
      slug: leccion.slug,
      titulo: leccion.titulo,
      curso: arbol.referencia(curso),
      modulo: arbol.referencia(arbol.moduloDe(curso)),
      secciones: await this.secciones(leccion.id),
      ultimaSeccion: progreso.ultimaSeccion,
      terminadaEn: progreso.terminadaEn?.toISOString() ?? null,
      anterior: posicion > 0 ? arbol.referencia(hermanas[posicion - 1]) : null,
      siguiente:
        posicion < hermanas.length - 1
          ? arbol.referencia(hermanas[posicion + 1])
          : null,
      evaluables: arbol
        .evaluablesDe(leccion.id)
        .map((q) => arbol.resumenEvaluable(q)),
    };
  }

  /** guardarSeccionVista (OP-19): la sección donde va el alumno, para retomar la lectura. */
  async guardarSeccionVista(
    usuarioId: string,
    slug: string,
    seccion: number,
  ): Promise<void> {
    const arbol = await this.arbol(usuarioId);
    const leccion = this.leccionDisponible(arbol, slug);
    const total = (await this.secciones(leccion.id)).length;
    if (seccion > total) {
      throw new ErrorApi('DATOS_INVALIDOS', {
        campos: { seccion: 'FUERA_DE_RANGO' },
      });
    }
    await this.prisma.$executeRaw`
      INSERT INTO progreso_leccion (usuario_id, leccion_id, ultima_seccion)
      VALUES (${usuarioId}::uuid, ${leccion.id}, ${seccion})
      ON CONFLICT (usuario_id, leccion_id) DO UPDATE SET ultima_seccion = EXCLUDED.ultima_seccion`;
  }

  /**
   * terminarLeccion (OP-20): solo desde la última sección (si no, BLOQUEADO_POR_AVANCE). Se registra una vez;
   * repetirla devuelve la misma fecha. Devuelve el estado de su actividad y sus casos, que ya pueden abrirse.
   */
  async terminarLeccion(
    usuarioId: string,
    slug: string,
  ): Promise<{ terminadaEn: string; evaluables: ResumenEvaluable[] }> {
    const arbol = await this.arbol(usuarioId);
    const leccion = this.leccionDisponible(arbol, slug);
    const total = (await this.secciones(leccion.id)).length;
    const [terminada] = await this.prisma.$queryRaw<{ terminada_en: Date }[]>`
      UPDATE progreso_leccion
      SET terminada_en = coalesce(terminada_en, now())
      WHERE usuario_id = ${usuarioId}::uuid AND leccion_id = ${leccion.id}
        AND ultima_seccion >= ${total}
      RETURNING terminada_en`;
    if (!terminada) throw new ErrorApi('BLOQUEADO_POR_AVANCE');
    const actualizado = await this.arbol(usuarioId);
    return {
      terminadaEn: terminada.terminada_en.toISOString(),
      evaluables: actualizado
        .evaluablesDe(leccion.id)
        .map((q) => actualizado.resumenEvaluable(q)),
    };
  }

  /**
   * buscar (OP-21): sin distinguir acentos ni mayúsculas, con la misma expresión que los índices GIN
   * (to_tsvector('spanish', f_unaccent(...))). Cada palabra cuenta como prefijo y deben aparecer todas. Lo
   * bloqueado aparece como bloqueado (DEC-32).
   */
  async buscar(
    usuarioId: string,
    consulta: string,
  ): Promise<{ resultados: ResultadoBusqueda[] }> {
    const terminos = (
      consulta.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []
    ).slice(0, MAXIMO_TERMINOS);
    if (terminos.length === 0) return { resultados: [] };

    const coincidencias = await this.prisma.$queryRaw<
      { tipo: string; id: bigint }[]
    >`
      WITH consulta AS (
        SELECT to_tsquery('spanish', string_agg(public.f_unaccent(t) || ':*', ' & ')) AS q
        FROM unnest(${terminos}::text[]) AS t
      )
      SELECT 'modulo' AS tipo, m.id FROM modulo m, consulta
      WHERE m.publicado
        AND to_tsvector('spanish', public.f_unaccent(m.titulo || ' ' || m.descripcion)) @@ consulta.q
      UNION ALL
      SELECT 'curso', c.id FROM curso c, consulta
      WHERE c.publicado
        AND to_tsvector('spanish', public.f_unaccent(c.titulo || ' ' || c.descripcion)) @@ consulta.q
      UNION ALL
      SELECT 'leccion', l.id FROM leccion l, consulta
      WHERE l.publicado
        AND to_tsvector('spanish', public.f_unaccent(l.titulo || ' ' || coalesce(l.resumen, ''))) @@ consulta.q`;
    const encontrados = new Set(
      coincidencias.map((c) => `${c.tipo}:${Number(c.id)}`),
    );

    const arbol = await this.arbol(usuarioId);
    const resultados: ResultadoBusqueda[] = [];
    for (const m of arbol.modulos) {
      if (encontrados.has(`modulo:${m.id}`)) {
        resultados.push({
          tipo: 'modulo',
          slug: m.slug,
          titulo: m.titulo,
          estado: arbol.estadoModulo(m),
          contexto: null,
        });
      }
      for (const c of arbol.cursosDe(m.id)) {
        if (encontrados.has(`curso:${c.id}`)) {
          resultados.push({
            tipo: 'curso',
            slug: c.slug,
            titulo: c.titulo,
            estado: arbol.estadoCurso(c),
            contexto: m.titulo,
          });
        }
        for (const l of arbol.leccionesDe(c.id)) {
          if (encontrados.has(`leccion:${l.id}`)) {
            resultados.push({
              tipo: 'leccion',
              slug: l.slug,
              titulo: l.titulo,
              estado: arbol.estadoLeccion(l),
              contexto: c.titulo,
            });
          }
        }
      }
    }
    return { resultados };
  }

  private leccionDisponible(arbol: ArbolContenido, slug: string): LeccionBd {
    const leccion = FORMATO_SLUG.test(slug) ? arbol.leccionPorSlug(slug) : null;
    if (!leccion) throw new ErrorApi('NO_ENCONTRADO');
    if (!arbol.leccionDisponible(leccion))
      throw new ErrorApi('BLOQUEADO_POR_AVANCE');
    return leccion;
  }

  private async secciones(leccionId: number): Promise<Seccion[]> {
    const filas = await this.prisma.$queryRaw<
      {
        orden: number;
        titulo: string;
        cuerpo: string;
        ruta: string | null;
        texto_alternativo: string | null;
        pie: string | null;
      }[]
    >`
      SELECT s.orden, s.titulo, s.cuerpo, i.ruta, i.texto_alternativo, i.pie
      FROM seccion s LEFT JOIN imagen i ON i.id = s.imagen_id
      WHERE s.leccion_id = ${leccionId}
      ORDER BY s.orden`;
    return filas.map((s) => ({
      orden: s.orden,
      titulo: s.titulo,
      cuerpo: s.cuerpo,
      imagen:
        s.ruta === null
          ? null
          : {
              ruta: s.ruta,
              textoAlternativo: s.texto_alternativo ?? '',
              pie: s.pie,
            },
    }));
  }
}
