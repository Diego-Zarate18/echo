/**
 * Configuración del servidor, leída y validada una sola vez al arrancar.
 * Si falta una variable o no es válida, el servidor no arranca y el error dice cuál, nunca su valor (INV-08).
 */
export type Entorno = 'development' | 'production' | 'test';

export interface Configuracion {
  entorno: Entorno;
  puerto: number;
  /** DATABASE_URL: conexión de echo_app (Prisma Client). */
  urlBaseDatos: string;
  /** Origen del frontend (esquema, host y puerto): el único aceptado en las mutaciones (DEC-85). */
  origenFrontend: string;
  /** Secreto de las claves opacas de la relación de columnas (DEC-91). */
  secretoClaveOpaca: Buffer;
  /** Proxies propios que agregan una entrada a X-Forwarded-For (DEC-92). */
  proxiesConfiables: number;
  /** Resend; nulo en desarrollo si no está configurado (no se envía nada). */
  resend: { clave: string; remitente: string } | null;
}

export const CONFIGURACION = Symbol('CONFIGURACION');

export class ConfiguracionInvalidaError extends Error {
  constructor(public readonly problemas: string[]) {
    super(`Configuración inválida:\n- ${problemas.join('\n- ')}`);
    this.name = 'ConfiguracionInvalidaError';
  }
}

export function leerConfiguracion(
  variables: NodeJS.ProcessEnv = process.env,
): Configuracion {
  const problemas: string[] = [];
  const texto = (nombre: string): string => (variables[nombre] ?? '').trim();

  const entornoTexto = texto('NODE_ENV') || 'development';
  const entorno: Entorno = ['development', 'production', 'test'].includes(
    entornoTexto,
  )
    ? (entornoTexto as Entorno)
    : (problemas.push('NODE_ENV debe ser development, production o test'),
      'development');
  const produccion = entorno === 'production';

  const puertoTexto = texto('PORT') || '4000';
  const puerto = Number(puertoTexto);
  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
    problemas.push('PORT debe ser un número de puerto entre 1 y 65535');
  }

  const urlBaseDatos = texto('DATABASE_URL');
  if (!/^postgres(ql)?:\/\//.test(urlBaseDatos)) {
    problemas.push(
      'DATABASE_URL es obligatoria y debe empezar con postgresql://',
    );
  }

  let origenFrontend = '';
  try {
    const url = new URL(texto('URL_FRONTEND'));
    if (url.protocol !== 'https:' && url.protocol !== 'http:')
      throw new Error();
    if (produccion && url.protocol !== 'https:') {
      problemas.push('URL_FRONTEND debe usar https en producción');
    }
    origenFrontend = url.origin;
  } catch {
    problemas.push(
      'URL_FRONTEND es obligatoria y debe ser una URL http(s) válida',
    );
  }

  const secreto = texto('SECRETO_CLAVE_OPACA');
  if (!/^[0-9a-fA-F]{64,}$/.test(secreto) || secreto.length % 2 !== 0) {
    problemas.push(
      'SECRETO_CLAVE_OPACA es obligatoria: al menos 32 bytes en hexadecimal (openssl rand -hex 32)',
    );
  }

  const proxiesTexto = texto('PROXIES_CONFIABLES') || '0';
  const proxiesConfiables = Number(proxiesTexto);
  if (
    !Number.isInteger(proxiesConfiables) ||
    proxiesConfiables < 0 ||
    proxiesConfiables > 5
  ) {
    problemas.push('PROXIES_CONFIABLES debe ser un entero entre 0 y 5');
  }

  const claveResend = texto('RESEND_API_KEY');
  const remitente = texto('CORREO_REMITENTE');
  if (produccion && (!claveResend || !remitente)) {
    problemas.push(
      'RESEND_API_KEY y CORREO_REMITENTE son obligatorias en producción',
    );
  }
  if ((claveResend && !remitente) || (!claveResend && remitente)) {
    problemas.push(
      'RESEND_API_KEY y CORREO_REMITENTE van juntas: las dos o ninguna',
    );
  }

  if (problemas.length > 0) throw new ConfiguracionInvalidaError(problemas);

  return {
    entorno,
    puerto,
    urlBaseDatos,
    origenFrontend,
    secretoClaveOpaca: Buffer.from(secreto, 'hex'),
    proxiesConfiables,
    resend: claveResend ? { clave: claveResend, remitente } : null,
  };
}
