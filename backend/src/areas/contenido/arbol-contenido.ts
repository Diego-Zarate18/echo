/**
 * Contenido publicado y avance de un alumno, ya cargados de la base, con las reglas que dan el estado de cada
 * elemento. Los candados (desbloqueado) y lo completo vienen de fn_estado_desbloqueo, y el avance de cada curso
 * de v_avance_curso: aquí solo se combinan para armar las respuestas de la API (INV-06).
 */
export type EstadoAvance =
  'bloqueado' | 'disponible' | 'enCurso' | 'completado';
export type EstadoEvaluable = 'bloqueado' | 'disponible' | 'enviado';
export type EstadoExamen =
  'bloqueado' | 'disponible' | 'enCurso' | 'enEspera' | 'aprobado';

export interface Imagen {
  ruta: string;
  textoAlternativo: string;
  pie: string | null;
}

export interface ModuloBd {
  id: number;
  slug: string;
  titulo: string;
  descripcion: string;
  orden: number;
}
export interface CursoBd extends ModuloBd {
  moduloId: number;
}
export interface LeccionBd {
  id: number;
  cursoId: number;
  slug: string;
  titulo: string;
  resumen: string | null;
  orden: number;
  publicadoEn: Date | null;
}
export interface CuestionarioBd {
  id: number;
  tipo: 'actividad' | 'caso' | 'examen';
  leccionId: number | null;
  cursoId: number | null;
  orden: number | null;
  titulo: string;
  minutosEspera: number;
}
export interface InsigniaBd {
  moduloId: number;
  nombre: string;
  descripcion: string;
  imagen: Imagen;
  obtenidaEn: Date | null;
}
export interface Candado {
  desbloqueado: boolean;
  completo: boolean;
}
export interface IntentosResumen {
  abierto: boolean;
  enviados: number;
  mejorCalificacion: number | null;
  ultimoEnviadoEn: Date | null;
  aprobadoEn: Date | null;
}
export interface ProgresoBd {
  ultimaSeccion: number;
  abiertaEn: Date;
  terminadaEn: Date | null;
}

/** Todo lo que hace falta para responder, cargado una vez por petición. */
export interface DatosContenido {
  ahora: Date;
  modulos: ModuloBd[];
  cursos: CursoBd[];
  lecciones: LeccionBd[];
  cuestionarios: CuestionarioBd[];
  insignias: InsigniaBd[];
  candados: Map<string, Candado>;
  avanceCurso: Map<number, number>;
  progreso: Map<number, ProgresoBd>;
  intentos: Map<number, IntentosResumen>;
}

export interface Referencia {
  slug: string;
  titulo: string;
}
export type Requisito =
  | { tipo: 'modulo' | 'curso' | 'leccion'; slug: string; titulo: string }
  | { tipo: 'examen'; id: number; titulo: string };

export interface InsigniaSalida {
  nombre: string;
  descripcion: string;
  imagen: Imagen;
  obtenidaEn: string | null;
}
export interface ResumenEvaluable {
  id: number;
  tipo: 'actividad' | 'caso';
  titulo: string;
  orden: number;
  estado: EstadoEvaluable;
  mejorCalificacion: number | null;
}
export interface ResumenExamen {
  id: number;
  titulo: string;
  estado: EstadoExamen;
  minutosRestantes: number | null;
  disponibleEn: string | null;
}

const porOrden = (a: { orden: number | null }, b: { orden: number | null }) =>
  (a.orden ?? 0) - (b.orden ?? 0);
const dosDecimales = (numero: number) => Math.round(numero * 100) / 100;
const promedio = (valores: number[]) =>
  valores.length
    ? dosDecimales(valores.reduce((suma, v) => suma + v, 0) / valores.length)
    : 0;
const SIN_CANDADO: Candado = { desbloqueado: false, completo: false };
const MINUTO = 60_000;

export class ArbolContenido {
  constructor(private readonly datos: DatosContenido) {}

  // ── Búsquedas ──
  get modulos(): ModuloBd[] {
    return [...this.datos.modulos].sort(porOrden);
  }
  moduloPorSlug(slug: string): ModuloBd | null {
    return this.datos.modulos.find((m) => m.slug === slug) ?? null;
  }
  cursoPorSlug(slug: string): CursoBd | null {
    return this.datos.cursos.find((c) => c.slug === slug) ?? null;
  }
  leccionPorSlug(slug: string): LeccionBd | null {
    return this.datos.lecciones.find((l) => l.slug === slug) ?? null;
  }
  moduloDe(curso: CursoBd): ModuloBd {
    return this.datos.modulos.find((m) => m.id === curso.moduloId)!;
  }
  cursoDe(leccion: LeccionBd): CursoBd {
    return this.datos.cursos.find((c) => c.id === leccion.cursoId)!;
  }
  cursosDe(moduloId: number): CursoBd[] {
    return this.datos.cursos
      .filter((c) => c.moduloId === moduloId)
      .sort(porOrden);
  }
  leccionesDe(cursoId: number): LeccionBd[] {
    return this.datos.lecciones
      .filter((l) => l.cursoId === cursoId)
      .sort(porOrden);
  }
  evaluablesDe(leccionId: number): CuestionarioBd[] {
    return this.datos.cuestionarios
      .filter((q) => q.leccionId === leccionId && q.tipo !== 'examen')
      .sort(porOrden);
  }
  examenDe(cursoId: number): CuestionarioBd | null {
    return (
      this.datos.cuestionarios.find(
        (q) => q.tipo === 'examen' && q.cursoId === cursoId,
      ) ?? null
    );
  }
  progresoDe(leccionId: number): ProgresoBd | null {
    return this.datos.progreso.get(leccionId) ?? null;
  }
  referencia(elemento: { slug: string; titulo: string }): Referencia {
    return { slug: elemento.slug, titulo: elemento.titulo };
  }

  // ── Candados (fn_estado_desbloqueo) ──
  private candado(tipo: string, id: number): Candado {
    return this.datos.candados.get(`${tipo}:${id}`) ?? SIN_CANDADO;
  }
  moduloDisponible(modulo: ModuloBd): boolean {
    return this.candado('modulo', modulo.id).desbloqueado;
  }
  cursoDisponible(curso: CursoBd): boolean {
    return this.candado('curso', curso.id).desbloqueado;
  }
  leccionDisponible(leccion: LeccionBd): boolean {
    return this.candado('leccion', leccion.id).desbloqueado;
  }

  // ── Avance (v_avance_curso, DEC-14) ──
  avanceCurso(curso: CursoBd): number {
    return this.datos.avanceCurso.get(curso.id) ?? 0;
  }
  avanceModulo(modulo: ModuloBd): number {
    return promedio(this.cursosDe(modulo.id).map((c) => this.avanceCurso(c)));
  }
  avanceGeneral(): number {
    return promedio(this.modulos.map((m) => this.avanceModulo(m)));
  }

  // ── Estados (C-02, C-04, C-05) ──
  estadoModulo(modulo: ModuloBd): EstadoAvance {
    const candado = this.candado('modulo', modulo.id);
    if (!candado.desbloqueado) return 'bloqueado';
    if (candado.completo) return 'completado';
    return this.avanceModulo(modulo) > 0 ? 'enCurso' : 'disponible';
  }
  estadoCurso(curso: CursoBd): EstadoAvance {
    const candado = this.candado('curso', curso.id);
    if (!candado.desbloqueado) return 'bloqueado';
    if (candado.completo) return 'completado';
    return this.avanceCurso(curso) > 0 ? 'enCurso' : 'disponible';
  }
  estadoLeccion(leccion: LeccionBd): EstadoAvance {
    const candado = this.candado('leccion', leccion.id);
    if (!candado.desbloqueado) return 'bloqueado';
    if (candado.completo) return 'completado';
    return this.datos.progreso.has(leccion.id) ? 'enCurso' : 'disponible';
  }

  resumenEvaluable(cuestionario: CuestionarioBd): ResumenEvaluable {
    const intentos = this.datos.intentos.get(cuestionario.id);
    const enviado = (intentos?.enviados ?? 0) > 0;
    const estado: EstadoEvaluable = enviado
      ? 'enviado'
      : this.candado('cuestionario', cuestionario.id).desbloqueado
        ? 'disponible'
        : 'bloqueado';
    return {
      id: cuestionario.id,
      tipo: cuestionario.tipo as 'actividad' | 'caso',
      titulo: cuestionario.titulo,
      orden: cuestionario.orden ?? 0,
      estado,
      mejorCalificacion: intentos?.mejorCalificacion ?? null,
    };
  }

  /** C-05: aprobado, en curso, en espera tras reprobar (hora del servidor), disponible o bloqueado. */
  resumenExamen(examen: CuestionarioBd): ResumenExamen {
    const intentos = this.datos.intentos.get(examen.id);
    const vacio = { minutosRestantes: null, disponibleEn: null };
    const base = { id: examen.id, titulo: examen.titulo };
    if (intentos?.aprobadoEn) return { ...base, estado: 'aprobado', ...vacio };
    if (intentos?.abierto) return { ...base, estado: 'enCurso', ...vacio };
    if (intentos?.ultimoEnviadoEn) {
      const disponible = new Date(
        intentos.ultimoEnviadoEn.getTime() + examen.minutosEspera * MINUTO,
      );
      const restante = disponible.getTime() - this.datos.ahora.getTime();
      if (restante > 0) {
        return {
          ...base,
          estado: 'enEspera',
          minutosRestantes: Math.max(1, Math.ceil(restante / MINUTO)),
          disponibleEn: disponible.toISOString(),
        };
      }
    }
    const estado = this.candado('cuestionario', examen.id).desbloqueado
      ? 'disponible'
      : 'bloqueado';
    return { ...base, estado, ...vacio };
  }

  /** DEC-10: publicada después de que el alumno aprobó el curso; no bloquea nada. */
  leccionNueva(leccion: LeccionBd): boolean {
    const examen = this.examenDe(leccion.cursoId);
    const aprobadoEn = examen
      ? this.datos.intentos.get(examen.id)?.aprobadoEn
      : null;
    return Boolean(
      aprobadoEn && leccion.publicadoEn && leccion.publicadoEn > aprobadoEn,
    );
  }

  insignia(modulo: ModuloBd): InsigniaSalida | null {
    const insignia = this.datos.insignias.find((i) => i.moduloId === modulo.id);
    if (!insignia) return null;
    return {
      nombre: insignia.nombre,
      descripcion: insignia.descripcion,
      imagen: insignia.imagen,
      obtenidaEn: insignia.obtenidaEn?.toISOString() ?? null,
    };
  }

  // ── Requisitos: lo que falta para desbloquear ──
  requisitoModulo(modulo: ModuloBd): Requisito | null {
    if (this.moduloDisponible(modulo)) return null;
    const anterior = this.modulos.filter((m) => m.orden < modulo.orden).at(-1);
    return anterior ? { tipo: 'modulo', ...this.referencia(anterior) } : null;
  }
  requisitoCurso(curso: CursoBd): Requisito | null {
    if (this.cursoDisponible(curso)) return null;
    const modulo = this.moduloDe(curso);
    if (!this.moduloDisponible(modulo)) return this.requisitoModulo(modulo);
    const anterior = this.cursosDe(curso.moduloId)
      .filter((c) => c.orden < curso.orden)
      .at(-1);
    if (!anterior) return null;
    const examen = this.examenDe(anterior.id);
    return examen
      ? { tipo: 'examen', id: examen.id, titulo: examen.titulo }
      : { tipo: 'curso', ...this.referencia(anterior) };
  }
  requisitoLeccion(leccion: LeccionBd): Requisito | null {
    if (this.leccionDisponible(leccion)) return null;
    const curso = this.cursoDe(leccion);
    if (!this.cursoDisponible(curso)) return this.requisitoCurso(curso);
    const anterior = this.leccionesDe(leccion.cursoId)
      .filter((l) => l.orden < leccion.orden)
      .at(-1);
    return anterior ? { tipo: 'leccion', ...this.referencia(anterior) } : null;
  }
}
