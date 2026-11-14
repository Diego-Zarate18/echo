import { Controller, Get } from '@nestjs/common';
import { Publica } from '../../../comun/decoradores/publica';
import { DocumentosService } from './documentos.service';
import type { DocumentoSalida } from './documentos.service';

@Controller()
export class DocumentosController {
  constructor(private readonly documentos: DocumentosService) {}

  /** obtenerDocumentosVigentes (OP-40): sin sesión; el formulario de registro manda la versión que mostró. */
  @Get('documentos')
  @Publica()
  async obtenerVigentes(): Promise<{ documentos: DocumentoSalida[] }> {
    const vigentes = await this.documentos.vigentes();
    const orden = [vigentes.aviso_privacidad, vigentes.terminos];
    return {
      documentos: orden
        .filter((documento) => documento !== undefined)
        .map((documento) => this.documentos.aSalida(documento)),
    };
  }
}
