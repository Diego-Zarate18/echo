import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../base-de-datos/prisma.service.js';
import { CorreoService } from './correo.service.js';
import { RegistroEntrada } from './registro.dto.js';
import { SeguridadService } from './seguridad.service.js';

const respuestaRegistro = {
  mensaje: 'Revisa tu correo para continuar.',
};

@Injectable()
export class RegistroService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seguridad: SeguridadService,
    private readonly correo: CorreoService,
  ) {}

  async registrar(
    entrada: RegistroEntrada,
    direccionIp: string,
  ): Promise<{
    mensaje: string;
  }> {
    this.validarEntrada(entrada);
    const correo = entrada.correo.trim().toLowerCase();

    const documentos = await this.obtenerDocumentos(
      entrada.versionAviso,
      entrada.versionTerminos,
    );
    const hashContrasena = await this.seguridad.generarHashContrasena(
      entrada.contrasena,
    );
    const codigo = this.seguridad.generarCodigo();
    const tokenHash = this.seguridad.generarHuella(codigo);

    try {
      const resultado = await this.prisma.$transaction(async (tx) => {
        const existente = await tx.usuario.findUnique({ where: { correo } });

        if (existente) {
          return { existente: true };
        }

        const usuario = await tx.usuario.create({
          data: {
            nombre: entrada.nombre.trim(),
            apellidos: entrada.apellidos.trim(),
            correo,
            hashContrasena,
            mayoriaEdadConfirmadaEn: new Date(),
            negativaEncuesta: entrada.negativaEncuesta,
            negativaEstadisticas: entrada.negativaEstadisticas,
          },
        });

        await tx.aceptacionDocumento.createMany({
          data: documentos.map((documento) => ({
            usuarioId: usuario.id,
            documentoId: documento.id,
            direccionIp,
          })),
        });

        await tx.tokenCorreo.create({
          data: {
            usuarioId: usuario.id,
            tipo: 'verificacion',
            tokenHash,
            correoDestino: correo,
            expiraEn: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });

        return { existente: false };
      });

      if (resultado.existente) {
        await this.correo.enviarAvisoCuentaExistente(correo);
        return respuestaRegistro;
      }

      await this.correo.enviarVerificacion(correo, codigo);
      return respuestaRegistro;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return respuestaRegistro;
      }

      throw error;
    }
  }

  private async obtenerDocumentos(
    versionAviso: string,
    versionTerminos: string,
  ) {
    const [aviso, terminos] = await Promise.all([
      this.prisma.documentoLegal.findUnique({
        where: {
          tipo_version: {
            tipo: 'aviso_privacidad',
            version: versionAviso,
          },
        },
      }),
      this.prisma.documentoLegal.findUnique({
        where: {
          tipo_version: {
            tipo: 'terminos',
            version: versionTerminos,
          },
        },
      }),
    ]);

    if (
      !aviso ||
      !terminos ||
      !aviso.requiereAceptacion ||
      !terminos.requiereAceptacion
    ) {
      throw new ConflictException(
        'La versión de los documentos ya no está vigente.',
      );
    }

    return [aviso, terminos];
  }

  private validarEntrada(entrada: RegistroEntrada): void {
    if (
      typeof entrada.nombre !== 'string' ||
      typeof entrada.apellidos !== 'string' ||
      typeof entrada.correo !== 'string' ||
      typeof entrada.contrasena !== 'string' ||
      typeof entrada.versionAviso !== 'string' ||
      typeof entrada.versionTerminos !== 'string' ||
      typeof entrada.aceptaAviso !== 'boolean' ||
      typeof entrada.aceptaTerminos !== 'boolean' ||
      typeof entrada.mayorDeEdad !== 'boolean' ||
      typeof entrada.negativaEncuesta !== 'boolean' ||
      typeof entrada.negativaEstadisticas !== 'boolean'
    ) {
      throw new BadRequestException('Los datos de registro no son válidos.');
    }

    if (
      !entrada.aceptaAviso ||
      !entrada.aceptaTerminos ||
      !entrada.mayorDeEdad
    ) {
      throw new BadRequestException(
        'Debes aceptar los documentos y confirmar que tienes 18 años o más.',
      );
    }

    if (
      entrada.nombre.trim().length < 1 ||
      entrada.nombre.trim().length > 100 ||
      entrada.apellidos.trim().length < 1 ||
      entrada.apellidos.trim().length > 100 ||
      entrada.correo.trim().length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entrada.correo.trim()) ||
      !/^(?=.*[A-Za-z])(?=.*\d).{8,200}$/.test(entrada.contrasena) ||
      !/^\d+\.\d+$/.test(entrada.versionAviso) ||
      !/^\d+\.\d+$/.test(entrada.versionTerminos)
    ) {
      throw new BadRequestException('Los datos de registro no son válidos.');
    }
  }
}
