import { Injectable, OnModuleDestroy } from '@nestjs/common';

/** DEC-26: 60 peticiones cada 10 minutos por IP en las rutas de cuenta. */
export const LIMITE_PETICIONES = 60;
export const VENTANA_MS = 10 * 60 * 1000;
/** Tope de IP en memoria; al llegar se descartan las ventanas vencidas. */
const MAXIMO_DE_ENTRADAS = 100_000;

interface Ventana {
  inicio: number;
  peticiones: number;
}

export type ResultadoLimite =
  { permitida: true } | { permitida: false; reintentarEnSegundos: number };

/**
 * Límite de peticiones por IP en la memoria del servidor (DEC-26). Ventana fija de 10 minutos que empieza con
 * la primera petición de la IP. Vive en memoria: se reinicia con el servidor y no se comparte entre instancias
 * (el servidor corre en una sola).
 */
@Injectable()
export class LimitePorIpService implements OnModuleDestroy {
  private readonly ventanas = new Map<string, Ventana>();
  private readonly limpieza: NodeJS.Timeout;

  constructor() {
    this.limpieza = setInterval(() => this.descartarVencidas(), 60_000);
    this.limpieza.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.limpieza);
    this.ventanas.clear();
  }

  registrar(ip: string, ahora = Date.now()): ResultadoLimite {
    let ventana = this.ventanas.get(ip);
    if (!ventana || ahora - ventana.inicio >= VENTANA_MS) {
      if (this.ventanas.size >= MAXIMO_DE_ENTRADAS) {
        this.descartarVencidas(ahora);
      }
      ventana = { inicio: ahora, peticiones: 0 };
      this.ventanas.set(ip, ventana);
    }
    ventana.peticiones += 1;
    if (ventana.peticiones <= LIMITE_PETICIONES) return { permitida: true };
    const restante = ventana.inicio + VENTANA_MS - ahora;
    return {
      permitida: false,
      reintentarEnSegundos: Math.max(1, Math.ceil(restante / 1000)),
    };
  }

  private descartarVencidas(ahora = Date.now()): void {
    for (const [ip, ventana] of this.ventanas) {
      if (ahora - ventana.inicio >= VENTANA_MS) this.ventanas.delete(ip);
    }
  }
}
