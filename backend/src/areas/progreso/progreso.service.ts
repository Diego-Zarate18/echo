import { Injectable } from '@nestjs/common';
import { ContenidoService } from '../contenido/contenido.service';

/**
 * Mi progreso (OP-28, C-11): avance general, por módulo y por curso, e insignias obtenidas y pendientes. Usa el
 * mismo árbol de contenido que la navegación, para que las dos pantallas digan siempre lo mismo (excepción a
 * DEC-104, ver DEC-119). Siempre del alumno de la sesión (INV-07).
 */
@Injectable()
export class ProgresoService {
  constructor(private readonly contenido: ContenidoService) {}

  async obtener(usuarioId: string) {
    const arbol = await this.contenido.arbol(usuarioId);
    return {
      avanceGeneral: arbol.avanceGeneral(),
      modulos: arbol.modulos.map((m) => ({
        slug: m.slug,
        titulo: m.titulo,
        estado: arbol.estadoModulo(m),
        avance: arbol.avanceModulo(m),
        cursos: arbol.cursosDe(m.id).map((c) => ({
          slug: c.slug,
          titulo: c.titulo,
          estado: arbol.estadoCurso(c),
          avance: arbol.avanceCurso(c),
        })),
      })),
      insignias: arbol.modulos.flatMap((m) => {
        const insignia = arbol.insignia(m);
        if (!insignia) return [];
        const cursosFaltantes = insignia.obtenidaEn
          ? 0
          : arbol
              .cursosDe(m.id)
              .filter((c) => arbol.estadoCurso(c) !== 'completado').length;
        return [{ modulo: arbol.referencia(m), insignia, cursosFaltantes }];
      }),
    };
  }
}
