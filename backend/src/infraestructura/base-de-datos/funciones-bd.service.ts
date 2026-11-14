import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { conErroresDeBd } from './errores-bd';
import { PrismaService } from './prisma.service';

/** Cliente con el que se ejecuta una función: el servicio, o la transacción en curso. */
type Cliente = Pick<Prisma.TransactionClient, '$queryRaw'>;

export interface EstadoDesbloqueo {
  tipo: string;
  id: number;
  desbloqueado: boolean;
  completo: boolean;
}

export interface IntentoIniciado {
  intentoId: string;
  numero: number;
  semilla: number;
  iniciadoEn: Date;
  /** true si ya había un intento abierto y se devolvió ese (no se creó otro). */
  retomado: boolean;
}

export interface IntentoCalificado {
  calificacion: number;
  aprobado: boolean;
  /** Insignia otorgada con este envío, si la hubo. */
  insigniaId: number | null;
}

export interface ResumenLimpieza {
  cuentasPendientes: number;
  enlaces: number;
  sesiones: number;
}

/**
 * Único punto de entrada a las funciones de la base (migraciones logica_intentos y ciclo_de_vida_datos).
 * Las reglas viven en la base; aquí solo se llaman, se convierten los tipos (bigint y numeric a number) y se
 * traducen sus errores EC4xx.
 */
@Injectable()
export class FuncionesBdService {
  constructor(private readonly prisma: PrismaService) {}

  /** Avance lineal: qué módulos, cursos y lecciones tiene desbloqueados y completos el alumno. */
  async estadoDesbloqueo(
    usuarioId: string,
    cliente: Cliente = this.prisma,
  ): Promise<EstadoDesbloqueo[]> {
    const filas = await conErroresDeBd(
      () => cliente.$queryRaw<
        { tipo: string; id: bigint; desbloqueado: boolean; completo: boolean }[]
      >`
        SELECT tipo, id, desbloqueado, completo FROM fn_estado_desbloqueo(${usuarioId}::uuid)`,
    );
    return filas.map((fila) => ({ ...fila, id: Number(fila.id) }));
  }

  /** Crea el intento (o devuelve el abierto). Errores: NO_ENCONTRADO, BLOQUEADO_POR_AVANCE, EN_ESPERA, EXAMEN_APROBADO. */
  async iniciarIntento(
    usuarioId: string,
    cuestionarioId: number,
    cliente: Cliente = this.prisma,
  ): Promise<IntentoIniciado> {
    const [fila] = await conErroresDeBd(
      () => cliente.$queryRaw<
        {
          intento_id: string;
          numero: number;
          semilla: number;
          iniciado_en: Date;
          retomado: boolean;
        }[]
      >`
        SELECT intento_id, numero, semilla, iniciado_en, retomado
        FROM fn_iniciar_intento(${usuarioId}::uuid, ${cuestionarioId}::bigint)`,
    );
    return {
      intentoId: fila.intento_id,
      numero: fila.numero,
      semilla: fila.semilla,
      iniciadoEn: fila.iniciado_en,
      retomado: fila.retomado,
    };
  }

  /** Califica y cierra el intento. Errores: NO_ENCONTRADO, INTENTO_CERRADO, RESPUESTAS_INCOMPLETAS. */
  async enviarIntento(
    intentoId: string,
    usuarioId: string,
    cliente: Cliente = this.prisma,
  ): Promise<IntentoCalificado> {
    const [fila] = await conErroresDeBd(
      () => cliente.$queryRaw<
        {
          calificacion: Prisma.Decimal;
          aprobado: boolean;
          insignia_id: bigint | null;
        }[]
      >`
        SELECT calificacion, aprobado, insignia_id
        FROM fn_enviar_intento(${intentoId}::uuid, ${usuarioId}::uuid)`,
    );
    return {
      calificacion: Number(fila.calificacion),
      aprobado: fila.aprobado,
      insigniaId: fila.insignia_id === null ? null : Number(fila.insignia_id),
    };
  }

  /** Borra los datos personales y conserva el historial sin identidad. No se puede deshacer. */
  async anonimizarUsuario(
    usuarioId: string,
    cliente: Cliente = this.prisma,
  ): Promise<void> {
    await conErroresDeBd(
      () =>
        cliente.$queryRaw`SELECT fn_anonimizar_usuario(${usuarioId}::uuid)::text AS resultado`,
    );
  }

  /** Copia de los datos del alumno (derecho de acceso). */
  async exportarDatosUsuario(
    usuarioId: string,
    cliente: Cliente = this.prisma,
  ): Promise<unknown> {
    const [fila] = await conErroresDeBd(
      () => cliente.$queryRaw<{ datos: unknown }[]>`
        SELECT fn_exportar_datos_usuario(${usuarioId}::uuid) AS datos`,
    );
    return fila.datos;
  }

  /** Borra cuentas pendientes vencidas, enlaces vencidos y sesiones viejas. */
  async limpiezaDiaria(
    cliente: Cliente = this.prisma,
  ): Promise<ResumenLimpieza> {
    const [fila] = await conErroresDeBd(
      () => cliente.$queryRaw<
        { cuentas_pendientes: number; enlaces: number; sesiones: number }[]
      >`
        SELECT cuentas_pendientes, enlaces, sesiones FROM fn_limpieza_diaria()`,
    );
    return {
      cuentasPendientes: fila.cuentas_pendientes,
      enlaces: fila.enlaces,
      sesiones: fila.sesiones,
    };
  }
}
