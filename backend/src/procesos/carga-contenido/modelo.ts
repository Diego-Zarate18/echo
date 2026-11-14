/** El contenido tal como se lee de los archivos de la carpeta contenido/ (formato en docs/backend/contenido.md). */
export type TipoPregunta =
  'opcion_multiple' | 'verdadero_falso' | 'relacion' | 'decision';
export type TipoCuestionario = 'actividad' | 'caso' | 'examen';

export interface Fundamento {
  clave: string;
  tipo: 'ley' | 'norma' | 'principio' | 'codigo';
  nombre: string;
  articulo: string | null;
  descripcion: string;
  referencia: string | null;
}

export interface Imagen {
  ruta: string;
  textoAlternativo: string;
  pie: string | null;
}

export interface Opcion {
  texto: string;
  valor: number;
  retroalimentacion: string | null;
  consecuencia: string | null;
  fundamento: string | null;
}

export interface Pareja {
  izquierda: string;
  derecha: string;
}

export interface Pregunta {
  origen: string;
  tipo: TipoPregunta;
  enunciado: string;
  retroalimentacion: string | null;
  fundamento: string | null;
  leccionRepaso: string | null;
  opciones: Opcion[];
  parejas: Pareja[];
}

export interface Cuestionario {
  origen: string;
  tipo: TipoCuestionario;
  titulo: string;
  instrucciones: string;
  calificacionMinima: number;
  minutosEspera: number;
  preguntas: Pregunta[];
}

export interface Seccion {
  titulo: string;
  cuerpo: string;
  imagen: Imagen | null;
}

export interface Leccion {
  archivo: string;
  slug: string;
  orden: number;
  titulo: string;
  resumen: string | null;
  publicado: boolean;
  publicadoEn: Date | null;
  secciones: Seccion[];
  actividad: Cuestionario | null;
  casos: Cuestionario[];
}

export interface Curso {
  archivo: string;
  slug: string;
  orden: number;
  titulo: string;
  descripcion: string;
  publicado: boolean;
  examen: Cuestionario | null;
  lecciones: Leccion[];
}

export interface Insignia {
  nombre: string;
  descripcion: string;
  imagen: Imagen;
}

export interface Modulo {
  archivo: string;
  slug: string;
  orden: number;
  titulo: string;
  descripcion: string;
  publicado: boolean;
  insignia: Insignia | null;
  cursos: Curso[];
}

export interface Documento {
  origen: string;
  tipo: 'aviso_privacidad' | 'terminos';
  version: string;
  archivo: string;
  huella: string;
  requiereAceptacion: boolean;
  resumen: string;
  publicadoEn: Date | null;
}

export interface Contenido {
  fundamentos: Fundamento[];
  documentos: Documento[];
  modulos: Modulo[];
}

/** Un problema en los archivos: dónde y qué. */
export interface Problema {
  archivo: string;
  mensaje: string;
}
