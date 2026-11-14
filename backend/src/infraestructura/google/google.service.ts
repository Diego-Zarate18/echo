import { Inject, Injectable } from '@nestjs/common';
import { CodeChallengeMethod, OAuth2Client } from 'google-auth-library';
import { CONFIGURACION } from '../configuracion/configuracion';
import type { Configuracion } from '../configuracion/configuracion';

/** Identidad que entrega Google, ya verificada (OP-03). */
export interface IdentidadGoogle {
  /** Identificador permanente de la persona en Google (DEC-23). */
  sub: string;
  /** Correo verificado por Google, normalizado (DEC-60). */
  correo: string;
  nombre: string;
  /** Puede faltar (DEC-22). */
  apellidos: string | null;
}

/** Motivo por el que no se pudo entrar con Google; solo para el registro del servidor, sin datos personales. */
export class ErrorGoogle extends Error {
  constructor(motivo: string) {
    super(motivo);
    this.name = 'ErrorGoogle';
  }
}

const LARGO_NOMBRE = 100;
const TIEMPO_LIMITE_MS = 10_000;

/**
 * Cliente de Google OAuth 2.0 / OpenID Connect con google-auth-library (DEC-105). REQUIERE REVISIÓN HUMANA.
 * Flujo de código con PKCE: el servidor canjea el código y verifica el token de identidad (firma, emisor,
 * destinatario y vencimiento); aquí además se comprueban el nonce y que el correo esté verificado.
 */
@Injectable()
export class GoogleService {
  private readonly cliente: OAuth2Client | null;
  private readonly idCliente: string;

  constructor(@Inject(CONFIGURACION) configuracion: Configuracion) {
    const google = configuracion.google;
    this.idCliente = google?.idCliente ?? '';
    this.cliente = google
      ? new OAuth2Client({
          clientId: google.idCliente,
          clientSecret: google.secreto,
          redirectUri: google.urlRegreso,
          // Usa el fetch de Node y no espera más de 10 s a Google.
          transporterOptions: {
            fetchImplementation: (entrada, opciones) =>
              fetch(entrada, opciones),
            timeout: TIEMPO_LIMITE_MS,
          },
        })
      : null;
  }

  get disponible(): boolean {
    return this.cliente !== null;
  }

  /** URL de la pantalla de consentimiento de Google. */
  urlDeConsentimiento(estado: string, nonce: string, desafio: string): string {
    if (!this.cliente) throw new ErrorGoogle('sin configurar');
    return this.cliente.generateAuthUrl({
      scope: ['openid', 'email', 'profile'],
      state: estado,
      nonce,
      code_challenge: desafio,
      code_challenge_method: CodeChallengeMethod.S256,
      prompt: 'select_account',
      access_type: 'online',
    });
  }

  /** Canjea el código del regreso y devuelve la identidad verificada. */
  async identidad(
    codigo: string,
    verificador: string,
    nonce: string,
  ): Promise<IdentidadGoogle> {
    if (!this.cliente) throw new ErrorGoogle('sin configurar');
    let tokenIdentidad: string | null | undefined;
    try {
      const { tokens } = await this.cliente.getToken({
        code: codigo,
        codeVerifier: verificador,
      });
      tokenIdentidad = tokens.id_token;
    } catch {
      throw new ErrorGoogle('canje del código rechazado');
    }
    if (!tokenIdentidad) throw new ErrorGoogle('sin token de identidad');

    let datos;
    try {
      const ticket = await this.cliente.verifyIdToken({
        idToken: tokenIdentidad,
        audience: this.idCliente,
      });
      datos = ticket.getPayload();
    } catch {
      throw new ErrorGoogle('token de identidad inválido');
    }
    if (!datos?.sub) throw new ErrorGoogle('token sin sub');
    if (datos.nonce !== nonce) throw new ErrorGoogle('nonce distinto');
    if (datos.email_verified !== true || !datos.email) {
      throw new ErrorGoogle('correo sin verificar en Google');
    }

    const correo = datos.email.trim().toLowerCase();
    const recortar = (texto?: string) =>
      (texto ?? '').trim().slice(0, LARGO_NOMBRE);
    const nombre =
      recortar(datos.given_name) ||
      recortar(datos.name) ||
      recortar(correo.split('@')[0]);
    const apellidos = recortar(datos.family_name) || null;
    return { sub: datos.sub, correo, nombre, apellidos };
  }
}
