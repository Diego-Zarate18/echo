import { Inject, Injectable } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from 'node:crypto';
import { CONFIGURACION } from '../configuracion/configuracion';
import type { Configuracion } from '../configuracion/configuracion';

const LARGO_IV = 12;
const LARGO_ETIQUETA = 16;

/**
 * Cifrado y firma de las cookies temporales (DEC-112): AES-256-GCM con una llave derivada de SECRETO_CLAVE_OPACA
 * con HKDF y una etiqueta propia, distinta de la que firma las claves opacas (DEC-91).
 * Cada cookie pasa su nombre como dato asociado: el valor de una no sirve como el de otra.
 */
@Injectable()
export class CifradoService {
  private readonly llave: Buffer;

  constructor(@Inject(CONFIGURACION) configuracion: Configuracion) {
    this.llave = Buffer.from(
      hkdfSync(
        'sha256',
        configuracion.secretoClaveOpaca,
        Buffer.alloc(0),
        'echo:cookies-temporales:v1',
        32,
      ),
    );
  }

  /** Cifra el objeto; devuelve iv + etiqueta + cifrado en base64url. */
  cifrar(datos: unknown, asociado: string): string {
    const iv = randomBytes(LARGO_IV);
    const cifrador = createCipheriv('aes-256-gcm', this.llave, iv);
    cifrador.setAAD(Buffer.from(asociado, 'utf8'));
    const cifrado = Buffer.concat([
      cifrador.update(JSON.stringify(datos), 'utf8'),
      cifrador.final(),
    ]);
    return Buffer.concat([iv, cifrador.getAuthTag(), cifrado]).toString(
      'base64url',
    );
  }

  /** Devuelve el objeto, o null si el valor fue alterado, es de otra cookie o no es válido. */
  descifrar(valor: string, asociado: string): unknown {
    try {
      const bytes = Buffer.from(valor, 'base64url');
      if (bytes.length <= LARGO_IV + LARGO_ETIQUETA) return null;
      const descifrador = createDecipheriv(
        'aes-256-gcm',
        this.llave,
        bytes.subarray(0, LARGO_IV),
      );
      descifrador.setAAD(Buffer.from(asociado, 'utf8'));
      descifrador.setAuthTag(
        bytes.subarray(LARGO_IV, LARGO_IV + LARGO_ETIQUETA),
      );
      const claro = Buffer.concat([
        descifrador.update(bytes.subarray(LARGO_IV + LARGO_ETIQUETA)),
        descifrador.final(),
      ]);
      return JSON.parse(claro.toString('utf8')) as unknown;
    } catch {
      return null;
    }
  }
}
