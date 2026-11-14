import { Injectable, OnModuleInit } from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';

/** Parámetros de DEC-72 (OWASP): argon2id, 19456 KiB, 2 iteraciones, 1 hilo. */
const OPCIONES_ARGON2 = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export interface ResultadoVerificacion {
  valida: boolean;
  /** true si la contraseña es válida pero el hash usa parámetros viejos: hay que guardarlo de nuevo. */
  requiereRehash: boolean;
}

/**
 * Contraseñas solo como hash Argon2id (INV-08). La contraseña en claro nunca se guarda, se devuelve ni se registra.
 */
@Injectable()
export class ContrasenasService implements OnModuleInit {
  /** Hash de una contraseña aleatoria: se verifica contra él cuando el correo no existe (DEC-77). */
  private hashDeRelleno = '';

  async onModuleInit(): Promise<void> {
    this.hashDeRelleno = await this.crearHash(
      randomBytes(32).toString('base64url'),
    );
  }

  crearHash(contrasena: string): Promise<string> {
    return argon2.hash(contrasena, OPCIONES_ARGON2);
  }

  async verificar(
    hash: string,
    contrasena: string,
  ): Promise<ResultadoVerificacion> {
    let valida = false;
    try {
      valida = await argon2.verify(hash, contrasena);
    } catch {
      // Un hash con formato desconocido cuenta como contraseña incorrecta.
      valida = false;
    }
    return {
      valida,
      requiereRehash: valida && argon2.needsRehash(hash, OPCIONES_ARGON2),
    };
  }

  /**
   * Gasta el mismo tiempo que una verificación real cuando no hay hash contra el cual comparar (correo
   * inexistente, cuenta solo de Google o en pausa), para que el tiempo de respuesta no delate nada (DEC-77).
   */
  async verificarContraRelleno(contrasena: string): Promise<void> {
    try {
      await argon2.verify(this.hashDeRelleno, contrasena);
    } catch {
      // Sin efecto: solo importa el tiempo consumido.
    }
  }
}
