import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';

const opcionesArgon2: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class SeguridadService {
  async generarHashContrasena(contrasena: string): Promise<string> {
    return argon2.hash(contrasena, opcionesArgon2);
  }

  async verificarContrasena(
    hash: string,
    contrasena: string,
  ): Promise<boolean> {
    return argon2.verify(hash, contrasena);
  }

  necesitaActualizarHash(hash: string): boolean {
    return argon2.needsRehash(hash, opcionesArgon2);
  }

  generarCodigo(): string {
    return randomBytes(32).toString('base64url');
  }

  generarHuella(codigo: string): string {
    return createHash('sha256').update(codigo, 'utf8').digest('hex');
  }
}
