import { Inject, Injectable, Logger } from '@nestjs/common';
import { CONFIGURACION } from '../configuracion/configuracion';
import type { Configuracion } from '../configuracion/configuracion';
import { armarCorreo } from './plantilla';
import type { ContenidoCorreo } from './plantilla';

const URL_RESEND = 'https://api.resend.com/emails';
const TIEMPO_LIMITE_MS = 10_000;

/** Tipos de correo de DEC-79. Solo sirve para los registros: el texto llega en el contenido. */
export type TipoCorreo =
  | 'verificacion'
  | 'recuperacion'
  | 'cambio_correo'
  | 'aviso_cambio_correo'
  | 'ya_tienes_cuenta'
  | 'cambio_documentos'
  | 'invitacion_encuesta';

/**
 * Envío de correos con Resend (DEC-66) y la plantilla única (DEC-79).
 * En los registros solo se escribe el tipo de correo y el resultado: nunca la dirección ni el enlace, que lleva
 * un código de un solo uso (INV-08).
 */
@Injectable()
export class CorreoService {
  private readonly registro = new Logger('Correo');

  constructor(
    @Inject(CONFIGURACION) private readonly configuracion: Configuracion,
  ) {}

  /**
   * Devuelve true si Resend aceptó el correo. Nunca lanza: quien llama responde igual se haya enviado o no,
   * para no delatar si el correo tiene cuenta (DEC-77).
   */
  async enviar(
    tipo: TipoCorreo,
    para: string,
    contenido: ContenidoCorreo,
  ): Promise<boolean> {
    const { resend, origenFrontend } = this.configuracion;
    if (!resend) {
      this.registro.warn(
        `Correo «${tipo}» sin enviar: falta configurar RESEND_API_KEY y CORREO_REMITENTE`,
      );
      return false;
    }

    const correo = armarCorreo(contenido, origenFrontend);
    try {
      const respuesta = await fetch(URL_RESEND, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resend.clave}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: resend.remitente,
          to: [para],
          subject: correo.asunto,
          html: correo.html,
          text: correo.texto,
        }),
        signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
      });
      if (!respuesta.ok) {
        this.registro.error(
          `Correo «${tipo}» rechazado por Resend (HTTP ${respuesta.status})`,
        );
        return false;
      }
      return true;
    } catch (error) {
      const motivo = error instanceof Error ? error.name : 'error desconocido';
      this.registro.error(`Correo «${tipo}» sin enviar (${motivo})`);
      return false;
    }
  }
}
