import { Inject, Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { CONFIGURACION } from '../configuracion/configuracion';
import type { Configuracion } from '../configuracion/configuracion';

/**
 * Clave opaca de la columna derecha en las preguntas de relacionar columnas (DEC-91, INV-04).
 * La API nunca expone el id de la pareja en la columna derecha, porque coincide con el de la izquierda y
 * revelaría la respuesta. En su lugar manda HMAC-SHA-256(secreto, alumno + pregunta + pareja): cambia por
 * alumno y por pregunta, y sin el secreto no se puede calcular ni invertir.
 */
@Injectable()
export class ClaveOpacaService {
  private readonly secreto: Buffer;

  constructor(@Inject(CONFIGURACION) configuracion: Configuracion) {
    this.secreto = configuracion.secretoClaveOpaca;
  }

  generar(usuarioId: string, preguntaId: number, parejaId: number): string {
    return createHmac('sha256', this.secreto)
      .update(`${usuarioId}\n${preguntaId}\n${parejaId}`, 'utf8')
      .digest('base64url');
  }

  /**
   * Traduce la clave que mandó el alumno al id de la pareja, buscando entre las parejas de la pregunta.
   * Devuelve null si no corresponde a ninguna.
   */
  resolver(
    usuarioId: string,
    preguntaId: number,
    idsDePareja: readonly number[],
    clave: string,
  ): number | null {
    const recibida = Buffer.from(clave, 'utf8');
    let encontrada: number | null = null;
    for (const parejaId of idsDePareja) {
      const esperada = Buffer.from(
        this.generar(usuarioId, preguntaId, parejaId),
        'utf8',
      );
      if (
        esperada.length === recibida.length &&
        timingSafeEqual(esperada, recibida)
      ) {
        encontrada = parejaId;
      }
    }
    return encontrada;
  }
}
