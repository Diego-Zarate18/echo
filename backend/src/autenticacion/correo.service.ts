import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class CorreoService {
  async enviarVerificacion(correo: string, codigo: string): Promise<void> {
    const configuracion = this.obtenerConfiguracion();
    await this.enviar(
      configuracion,
      correo,
      'Verifica tu correo en Echo',
      `${configuracion.urlFrontend}/verificar-correo?codigo=${encodeURIComponent(codigo)}`,
    );
  }

  async enviarAvisoCuentaExistente(correo: string): Promise<void> {
    const configuracion = this.obtenerConfiguracion();
    await this.enviar(
      configuracion,
      correo,
      'Tu correo ya tiene una cuenta en Echo',
      'Este correo ya tiene una cuenta en Echo. Si no reconoces esta acción, puedes ignorar este mensaje.',
    );
  }

  private obtenerConfiguracion(): {
    resend: Resend;
    remitente: string;
    urlFrontend: string;
  } {
    const apiKey = process.env.RESEND_API_KEY;
    const remitente = process.env.CORREO_REMITENTE;
    const urlFrontend = process.env.URL_FRONTEND;

    if (!apiKey || !remitente || !urlFrontend) {
      throw new Error(
        'Faltan RESEND_API_KEY, CORREO_REMITENTE o URL_FRONTEND.',
      );
    }

    return {
      resend: new Resend(apiKey),
      remitente,
      urlFrontend: urlFrontend.replace(/\/$/, ''),
    };
  }

  private async enviar(
    configuracion: {
      resend: Resend;
      remitente: string;
      urlFrontend: string;
    },
    correo: string,
    asunto: string,
    texto: string,
  ): Promise<void> {
    const { error } = await configuracion.resend.emails.send({
      from: configuracion.remitente,
      to: correo,
      subject: asunto,
      text: texto,
    });

    if (error) {
      throw new Error(`Resend rechazó el correo: ${error.message}`);
    }
  }
}
