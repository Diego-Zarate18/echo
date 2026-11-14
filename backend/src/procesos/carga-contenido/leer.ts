import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { parse } from 'yaml';
import type {
  Contenido,
  Cuestionario,
  Curso,
  Documento,
  Fundamento,
  Imagen,
  Insignia,
  Leccion,
  Modulo,
  Opcion,
  Pareja,
  Pregunta,
  Problema,
  Seccion,
  TipoCuestionario,
} from './modelo';

/** Nombre de carpeta o de archivo: «01-slug», con el número como orden. */
const NOMBRE_CON_ORDEN = /^(\d{1,3})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;
const IMAGEN_MARKDOWN = /^!\[([^\]]+)\]\((\S+?)(?:\s+"([^"]*)")?\)\s*$/;
const TIPOS_PREGUNTA = [
  'opcion_multiple',
  'verdadero_falso',
  'relacion',
  'decision',
];
const TIPOS_FUNDAMENTO = ['ley', 'norma', 'principio', 'codigo'];

type Objeto = Record<string, unknown>;
const esObjeto = (valor: unknown): valor is Objeto =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);

/**
 * Lee la carpeta contenido/ y la convierte en el modelo. No valida las reglas de Echo (eso es validar.ts): solo que
 * cada archivo tenga la forma esperada. Los problemas se acumulan para mostrarlos todos juntos.
 */
export class Lector {
  readonly problemas: Problema[] = [];

  constructor(
    private readonly carpeta: string,
    private readonly raizRepositorio: string,
  ) {}

  leer(): Contenido {
    if (!existsSync(this.carpeta) || !statSync(this.carpeta).isDirectory()) {
      this.problema(this.carpeta, 'no existe la carpeta de contenido');
      return { fundamentos: [], documentos: [], modulos: [] };
    }
    return {
      fundamentos: this.leerFundamentos(),
      documentos: this.leerDocumentos(),
      modulos: this.subcarpetas(this.carpeta).flatMap((nombre) => {
        const modulo = this.leerModulo(join(this.carpeta, nombre), nombre);
        return modulo ? [modulo] : [];
      }),
    };
  }

  // ── Archivos de la raíz ──
  private leerFundamentos(): Fundamento[] {
    const archivo = join(this.carpeta, 'fundamentos.yaml');
    if (!existsSync(archivo)) return [];
    const datos = this.yaml(archivo);
    if (!Array.isArray(datos)) {
      this.problema(archivo, 'debe ser una lista de fundamentos');
      return [];
    }
    return datos.flatMap((d, i): Fundamento[] => {
      const donde = `${this.nombre(archivo)} (fundamento ${i + 1})`;
      if (!esObjeto(d))
        return this.falla(donde, 'cada fundamento es un objeto');
      const tipo = this.texto(d, 'tipo', donde);
      if (tipo && !TIPOS_FUNDAMENTO.includes(tipo)) {
        this.problema(donde, `tipo debe ser ${TIPOS_FUNDAMENTO.join(', ')}`);
      }
      this.llaves(
        d,
        ['clave', 'tipo', 'nombre', 'articulo', 'descripcion', 'referencia'],
        donde,
      );
      return [
        {
          clave: this.texto(d, 'clave', donde) ?? '',
          tipo: tipo as Fundamento['tipo'],
          nombre: this.texto(d, 'nombre', donde) ?? '',
          articulo: this.textoOpcional(d, 'articulo', donde),
          descripcion: this.texto(d, 'descripcion', donde) ?? '',
          referencia: this.textoOpcional(d, 'referencia', donde),
        },
      ];
    });
  }

  private leerDocumentos(): Documento[] {
    const archivo = join(this.carpeta, 'documentos.yaml');
    if (!existsSync(archivo)) return [];
    const datos = this.yaml(archivo);
    if (!Array.isArray(datos)) {
      this.problema(archivo, 'debe ser una lista de documentos');
      return [];
    }
    return datos.flatMap((d, i): Documento[] => {
      const donde = `${this.nombre(archivo)} (documento ${i + 1})`;
      if (!esObjeto(d)) return this.falla(donde, 'cada documento es un objeto');
      this.llaves(
        d,
        [
          'tipo',
          'version',
          'archivo',
          'requiere_aceptacion',
          'resumen',
          'publicado_en',
        ],
        donde,
      );
      const tipo = this.texto(d, 'tipo', donde);
      if (tipo && tipo !== 'aviso_privacidad' && tipo !== 'terminos') {
        this.problema(donde, 'tipo debe ser aviso_privacidad o terminos');
      }
      const ruta = this.texto(d, 'archivo', donde) ?? '';
      const completo = resolve(this.raizRepositorio, ruta);
      let huella = '';
      if (ruta && !existsSync(completo))
        this.problema(donde, `no existe el archivo ${ruta}`);
      else if (ruta)
        huella = createHash('sha256')
          .update(readFileSync(completo))
          .digest('hex');
      const version = d.version;
      if (typeof version !== 'string') {
        this.problema(
          donde,
          'version va entre comillas, por ejemplo version: "1.1"',
        );
      }
      return [
        {
          origen: donde,
          tipo: tipo as Documento['tipo'],
          version: typeof version === 'string' ? version : '',
          archivo: ruta,
          huella,
          requiereAceptacion: this.booleano(
            d,
            'requiere_aceptacion',
            donde,
            true,
          ),
          resumen: this.texto(d, 'resumen', donde) ?? '',
          publicadoEn: this.fecha(d, 'publicado_en', donde),
        },
      ];
    });
  }

  // ── Módulos, cursos y lecciones ──
  private leerModulo(carpeta: string, nombre: string): Modulo | null {
    const partes = this.partes(nombre, carpeta);
    const archivo = join(carpeta, 'modulo.yaml');
    if (!partes) return null;
    if (!existsSync(archivo)) {
      this.problema(carpeta, 'falta modulo.yaml');
      return null;
    }
    const d = this.yaml(archivo);
    const donde = this.nombre(archivo);
    if (!esObjeto(d)) {
      this.problema(
        archivo,
        'debe ser un objeto con titulo, descripcion e insignia',
      );
      return null;
    }
    this.llaves(d, ['titulo', 'descripcion', 'publicado', 'insignia'], donde);
    let insignia: Insignia | null = null;
    if (d.insignia !== undefined && d.insignia !== null) {
      if (!esObjeto(d.insignia)) this.problema(donde, 'insignia es un objeto');
      else {
        this.llaves(
          d.insignia,
          ['nombre', 'descripcion', 'imagen'],
          `${donde} (insignia)`,
        );
        const imagen = this.imagen(d.insignia.imagen, `${donde} (insignia)`);
        if (imagen) {
          insignia = {
            nombre:
              this.texto(d.insignia, 'nombre', `${donde} (insignia)`) ?? '',
            descripcion:
              this.texto(d.insignia, 'descripcion', `${donde} (insignia)`) ??
              '',
            imagen,
          };
        }
      }
    }
    return {
      archivo: donde,
      slug: partes.slug,
      orden: partes.orden,
      titulo: this.texto(d, 'titulo', donde) ?? '',
      descripcion: this.texto(d, 'descripcion', donde) ?? '',
      publicado: this.booleano(d, 'publicado', donde, true),
      insignia,
      cursos: this.subcarpetas(carpeta).flatMap((sub) => {
        const curso = this.leerCurso(join(carpeta, sub), sub);
        return curso ? [curso] : [];
      }),
    };
  }

  private leerCurso(carpeta: string, nombre: string): Curso | null {
    const partes = this.partes(nombre, carpeta);
    const archivo = join(carpeta, 'curso.yaml');
    if (!partes) return null;
    if (!existsSync(archivo)) {
      this.problema(carpeta, 'falta curso.yaml');
      return null;
    }
    const d = this.yaml(archivo);
    const donde = this.nombre(archivo);
    if (!esObjeto(d)) {
      this.problema(
        archivo,
        'debe ser un objeto con titulo, descripcion y examen',
      );
      return null;
    }
    this.llaves(d, ['titulo', 'descripcion', 'publicado', 'examen'], donde);
    const lecciones: Leccion[] = [];
    for (const entrada of readdirSync(carpeta).sort()) {
      if (!entrada.endsWith('.md')) {
        const base = entrada.replace(/\.yaml$/, '');
        if (
          entrada !== 'curso.yaml' &&
          !(
            entrada.endsWith('.yaml') && existsSync(join(carpeta, `${base}.md`))
          )
        ) {
          this.problema(
            join(carpeta, entrada),
            'archivo inesperado: las lecciones son NN-slug.md y su NN-slug.yaml',
          );
        }
        continue;
      }
      const leccion = this.leerLeccion(carpeta, entrada.slice(0, -3));
      if (leccion) lecciones.push(leccion);
    }
    return {
      archivo: donde,
      slug: partes.slug,
      orden: partes.orden,
      titulo: this.texto(d, 'titulo', donde) ?? '',
      descripcion: this.texto(d, 'descripcion', donde) ?? '',
      publicado: this.booleano(d, 'publicado', donde, true),
      examen:
        d.examen === undefined || d.examen === null
          ? null
          : this.cuestionario(d.examen, 'examen', `${donde} (examen)`),
      lecciones,
    };
  }

  private leerLeccion(carpeta: string, nombre: string): Leccion | null {
    const archivoMd = join(carpeta, `${nombre}.md`);
    const partes = this.partes(nombre, archivoMd);
    if (!partes) return null;
    const donde = this.nombre(archivoMd);
    const texto = readFileSync(archivoMd, 'utf8').replace(/\r\n/g, '\n');
    const encabezado = /^---\n([\s\S]*?)\n---\n?/.exec(texto);
    if (!encabezado) {
      this.problema(
        donde,
        'falta el encabezado entre líneas --- (titulo, resumen)',
      );
      return null;
    }
    let datos: unknown;
    try {
      datos = parse(encabezado[1]);
    } catch (error) {
      this.problema(
        donde,
        `encabezado con YAML inválido: ${(error as Error).message.split('\n')[0]}`,
      );
      return null;
    }
    if (!esObjeto(datos)) {
      this.problema(donde, 'el encabezado debe tener titulo y resumen');
      return null;
    }
    this.llaves(
      datos,
      ['titulo', 'resumen', 'publicado', 'publicado_en'],
      donde,
    );
    const secciones = this.secciones(texto.slice(encabezado[0].length), donde);

    let actividad: Cuestionario | null = null;
    let casos: Cuestionario[] = [];
    const archivoYaml = join(carpeta, `${nombre}.yaml`);
    if (existsSync(archivoYaml)) {
      const evaluables = this.yaml(archivoYaml);
      const dondeYaml = this.nombre(archivoYaml);
      if (!esObjeto(evaluables))
        this.problema(dondeYaml, 'debe ser un objeto con actividad y casos');
      else {
        if (
          evaluables.actividad !== undefined &&
          evaluables.actividad !== null
        ) {
          actividad = this.cuestionario(
            evaluables.actividad,
            'actividad',
            `${dondeYaml} (actividad)`,
          );
        }
        if (evaluables.casos !== undefined && evaluables.casos !== null) {
          if (!Array.isArray(evaluables.casos))
            this.problema(dondeYaml, 'casos es una lista');
          else {
            casos = evaluables.casos.flatMap((c, i) => {
              const caso = this.cuestionario(
                c,
                'caso',
                `${dondeYaml} (caso ${i + 1})`,
              );
              return caso ? [caso] : [];
            });
          }
        }
        for (const llave of Object.keys(evaluables)) {
          if (llave !== 'actividad' && llave !== 'casos')
            this.problema(dondeYaml, `llave desconocida: ${llave}`);
        }
      }
    }
    return {
      archivo: donde,
      slug: partes.slug,
      orden: partes.orden,
      titulo: this.texto(datos, 'titulo', donde) ?? '',
      resumen: this.textoOpcional(datos, 'resumen', donde),
      publicado: this.booleano(datos, 'publicado', donde, true),
      publicadoEn: this.fecha(datos, 'publicado_en', donde),
      secciones,
      actividad,
      casos,
    };
  }

  /** Cada «## Título» empieza una sección; si su primera línea es una imagen Markdown, esa es su imagen. */
  private secciones(cuerpo: string, donde: string): Seccion[] {
    const lineas = cuerpo.split('\n');
    const secciones: { titulo: string; lineas: string[] }[] = [];
    for (const linea of lineas) {
      const titulo = /^## (.+)$/.exec(linea);
      if (titulo) secciones.push({ titulo: titulo[1].trim(), lineas: [] });
      else if (secciones.length > 0) secciones.at(-1)!.lineas.push(linea);
      else if (linea.trim() !== '') {
        this.problema(
          donde,
          'hay texto antes de la primera sección: cada sección empieza con «## Título»',
        );
        return [];
      }
    }
    if (secciones.length === 0)
      this.problema(donde, 'la lección no tiene secciones («## Título»)');
    return secciones.map((s) => {
      const lineasCuerpo = [...s.lineas];
      while (lineasCuerpo.length && lineasCuerpo[0].trim() === '')
        lineasCuerpo.shift();
      let imagen: Imagen | null = null;
      const enImagen = lineasCuerpo.length
        ? IMAGEN_MARKDOWN.exec(lineasCuerpo[0])
        : null;
      if (enImagen) {
        imagen = {
          textoAlternativo: enImagen[1],
          ruta: enImagen[2],
          pie: enImagen[3] ?? null,
        };
        lineasCuerpo.shift();
      }
      return {
        titulo: s.titulo,
        cuerpo: lineasCuerpo.join('\n').trim(),
        imagen,
      };
    });
  }

  // ── Cuestionarios y preguntas ──
  private cuestionario(
    d: unknown,
    tipo: TipoCuestionario,
    donde: string,
  ): Cuestionario | null {
    if (!esObjeto(d)) {
      this.problema(
        donde,
        'debe ser un objeto con titulo, instrucciones y preguntas',
      );
      return null;
    }
    if (!Array.isArray(d.preguntas)) {
      this.problema(donde, 'preguntas es una lista');
      return null;
    }
    this.llaves(
      d,
      [
        'titulo',
        'instrucciones',
        'calificacion_minima',
        'minutos_espera',
        'preguntas',
      ],
      donde,
    );
    return {
      origen: donde,
      tipo,
      titulo: this.texto(d, 'titulo', donde) ?? '',
      instrucciones: this.texto(d, 'instrucciones', donde) ?? '',
      calificacionMinima: this.numero(d, 'calificacion_minima', donde, 70),
      minutosEspera: this.numero(d, 'minutos_espera', donde, 20),
      preguntas: d.preguntas.flatMap((p, i) => {
        const pregunta = this.pregunta(p, `${donde}, pregunta ${i + 1}`);
        return pregunta ? [pregunta] : [];
      }),
    };
  }

  private pregunta(d: unknown, donde: string): Pregunta | null {
    if (!esObjeto(d)) {
      this.problema(donde, 'cada pregunta es un objeto');
      return null;
    }
    this.llaves(
      d,
      [
        'tipo',
        'enunciado',
        'retroalimentacion',
        'fundamento',
        'leccion_repaso',
        'opciones',
        'parejas',
      ],
      donde,
    );
    const tipo = this.texto(d, 'tipo', donde);
    if (!tipo || !TIPOS_PREGUNTA.includes(tipo)) {
      this.problema(donde, `tipo debe ser ${TIPOS_PREGUNTA.join(', ')}`);
      return null;
    }
    const opciones: Opcion[] = [];
    const parejas: Pareja[] = [];
    if (tipo === 'relacion') {
      if (!Array.isArray(d.parejas))
        this.problema(donde, 'una pregunta de relación lleva parejas');
      else {
        for (const [i, x] of d.parejas.entries()) {
          if (!esObjeto(x)) {
            this.problema(
              `${donde}, pareja ${i + 1}`,
              'cada pareja tiene izquierda y derecha',
            );
            continue;
          }
          this.llaves(x, ['izquierda', 'derecha'], `${donde}, pareja ${i + 1}`);
          parejas.push({
            izquierda:
              this.texto(x, 'izquierda', `${donde}, pareja ${i + 1}`) ?? '',
            derecha:
              this.texto(x, 'derecha', `${donde}, pareja ${i + 1}`) ?? '',
          });
        }
      }
      if (d.opciones !== undefined)
        this.problema(donde, 'una pregunta de relación no lleva opciones');
    } else {
      if (!Array.isArray(d.opciones))
        this.problema(donde, 'la pregunta lleva opciones');
      else {
        for (const [i, o] of d.opciones.entries()) {
          const dondeOpcion = `${donde}, opción ${i + 1}`;
          if (!esObjeto(o)) {
            this.problema(dondeOpcion, 'cada opción tiene texto y valor');
            continue;
          }
          this.llaves(
            o,
            [
              'texto',
              'valor',
              'retroalimentacion',
              'consecuencia',
              'fundamento',
            ],
            dondeOpcion,
          );
          opciones.push({
            texto: this.texto(o, 'texto', dondeOpcion) ?? '',
            valor: this.numero(o, 'valor', dondeOpcion, Number.NaN),
            retroalimentacion: this.textoOpcional(
              o,
              'retroalimentacion',
              dondeOpcion,
            ),
            consecuencia: this.textoOpcional(o, 'consecuencia', dondeOpcion),
            fundamento: this.textoOpcional(o, 'fundamento', dondeOpcion),
          });
        }
      }
      if (d.parejas !== undefined)
        this.problema(donde, 'solo las preguntas de relación llevan parejas');
    }
    return {
      origen: donde,
      tipo: tipo as Pregunta['tipo'],
      enunciado: this.texto(d, 'enunciado', donde) ?? '',
      retroalimentacion: this.textoOpcional(d, 'retroalimentacion', donde),
      fundamento: this.textoOpcional(d, 'fundamento', donde),
      leccionRepaso: this.textoOpcional(d, 'leccion_repaso', donde),
      opciones,
      parejas,
    };
  }

  private imagen(d: unknown, donde: string): Imagen | null {
    if (!esObjeto(d)) {
      this.problema(donde, 'imagen lleva ruta y texto_alternativo');
      return null;
    }
    this.llaves(d, ['ruta', 'texto_alternativo', 'pie'], donde);
    return {
      ruta: this.texto(d, 'ruta', donde) ?? '',
      textoAlternativo: this.texto(d, 'texto_alternativo', donde) ?? '',
      pie: this.textoOpcional(d, 'pie', donde),
    };
  }

  // ── Ayudantes ──
  /** Una llave mal escrita (por ejemplo «retroalimentacon») se ignoraría sin avisar: se marca como problema. */
  private llaves(d: Objeto, permitidas: string[], donde: string): void {
    for (const llave of Object.keys(d)) {
      if (!permitidas.includes(llave)) {
        this.problema(
          donde,
          `llave desconocida: ${llave} (se esperan ${permitidas.join(', ')})`,
        );
      }
    }
  }

  private yaml(archivo: string): unknown {
    try {
      return parse(readFileSync(archivo, 'utf8'));
    } catch (error) {
      this.problema(
        archivo,
        `YAML inválido: ${(error as Error).message.split('\n')[0]}`,
      );
      return null;
    }
  }

  private subcarpetas(carpeta: string): string[] {
    return readdirSync(carpeta)
      .filter(
        (n) => !n.startsWith('.') && statSync(join(carpeta, n)).isDirectory(),
      )
      .sort();
  }

  private partes(
    nombre: string,
    ruta: string,
  ): { orden: number; slug: string } | null {
    const partes = NOMBRE_CON_ORDEN.exec(nombre);
    if (!partes) {
      this.problema(
        ruta,
        'el nombre debe ser NN-slug: un número, un guion y el slug en minúsculas sin acentos',
      );
      return null;
    }
    const orden = Number(partes[1]);
    if (orden < 1) {
      this.problema(ruta, 'el número del nombre empieza en 01');
      return null;
    }
    return { orden, slug: partes[2] };
  }

  private texto(d: Objeto, llave: string, donde: string): string | null {
    const valor = d[llave];
    if (typeof valor === 'number') return String(valor);
    if (typeof valor !== 'string' || valor.trim() === '') {
      this.problema(donde, `falta ${llave}`);
      return null;
    }
    return valor.trim();
  }

  private textoOpcional(
    d: Objeto,
    llave: string,
    donde: string,
  ): string | null {
    const valor = d[llave];
    if (valor === undefined || valor === null) return null;
    if (typeof valor === 'number') return String(valor);
    if (typeof valor !== 'string') {
      this.problema(donde, `${llave} debe ser texto`);
      return null;
    }
    return valor.trim() === '' ? null : valor.trim();
  }

  private numero(
    d: Objeto,
    llave: string,
    donde: string,
    porDefecto: number,
  ): number {
    const valor = d[llave];
    if (valor === undefined || valor === null) {
      if (Number.isNaN(porDefecto)) this.problema(donde, `falta ${llave}`);
      return porDefecto;
    }
    if (typeof valor !== 'number' || !Number.isFinite(valor)) {
      this.problema(donde, `${llave} debe ser un número`);
      return Number.NaN;
    }
    return valor;
  }

  private booleano(
    d: Objeto,
    llave: string,
    donde: string,
    porDefecto: boolean,
  ): boolean {
    const valor = d[llave];
    if (valor === undefined || valor === null) return porDefecto;
    if (typeof valor !== 'boolean') {
      this.problema(donde, `${llave} debe ser true o false`);
      return porDefecto;
    }
    return valor;
  }

  private fecha(d: Objeto, llave: string, donde: string): Date | null {
    const valor = d[llave];
    if (valor === undefined || valor === null) return null;
    const fecha =
      valor instanceof Date
        ? valor
        : typeof valor === 'string'
          ? new Date(valor)
          : new Date(Number.NaN);
    if (Number.isNaN(fecha.getTime())) {
      this.problema(
        donde,
        `${llave} debe ser una fecha y hora, por ejemplo 2026-12-01T15:00:00Z`,
      );
      return null;
    }
    return fecha;
  }

  private nombre(ruta: string): string {
    return relative(this.raizRepositorio, ruta).replace(/\\/g, '/');
  }

  private problema(ruta: string, mensaje: string): void {
    const archivo =
      ruta.startsWith('/') || /^[A-Za-z]:/.test(ruta)
        ? this.nombre(ruta)
        : ruta;
    this.problemas.push({ archivo, mensaje });
  }

  private falla(donde: string, mensaje: string): never[] {
    this.problema(donde, mensaje);
    return [];
  }
}
