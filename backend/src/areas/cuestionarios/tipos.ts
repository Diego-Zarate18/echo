/** Formas de las preguntas en la API (docs/api/openapi.yaml). */
export type TipoPreguntaApi =
  'opcionMultiple' | 'verdaderoFalso' | 'relacion' | 'decision';

export const TIPO_PREGUNTA_API: Record<string, TipoPreguntaApi> = {
  opcion_multiple: 'opcionMultiple',
  verdadero_falso: 'verdaderoFalso',
  relacion: 'relacion',
  decision: 'decision',
};

export interface Union {
  izquierdaId: number;
  derechaClave: string;
}

/** PreguntaParaResponder: nunca trae valores, la respuesta correcta ni la retroalimentación (INV-04). */
export type PreguntaParaResponder =
  | {
      id: number;
      tipo: 'opcionMultiple' | 'verdaderoFalso' | 'decision';
      enunciado: string;
      opciones: { id: number; texto: string }[];
    }
  | {
      id: number;
      tipo: 'relacion';
      enunciado: string;
      izquierda: { id: number; texto: string }[];
      derecha: { clave: string; texto: string }[];
    };

export interface Fundamento {
  tipo: 'ley' | 'norma' | 'principio' | 'codigo';
  nombre: string;
  articulo: string | null;
  descripcion: string;
  referencia: string | null;
}

export type EtiquetaDecision = 'optima' | 'aceptable' | 'riesgosa';

/** PreguntaCalificada: la retroalimentación completa, solo después de enviar. */
export interface PreguntaCalificada {
  id: number;
  tipo: TipoPreguntaApi;
  enunciado: string;
  puntaje: number;
  correcta: boolean;
  retroalimentacion: string | null;
  fundamento: Fundamento | null;
  opciones?: {
    id: number;
    texto: string;
    elegida: boolean;
    correcta: boolean;
    retroalimentacion: string | null;
  }[];
  uniones?: {
    izquierda: string;
    derechaElegida: string | null;
    derechaCorrecta: string;
    correcta: boolean;
  }[];
  decision?: {
    opcionElegida: string;
    etiqueta: EtiquetaDecision;
    consecuencia: string | null;
    retroalimentacion: string | null;
    fundamento: Fundamento | null;
  };
}

/** Respuestas ya traducidas a ids de la base, listas para guardarse. */
export interface RespuestasInternas {
  opciones: { preguntaId: number; opcionId: number }[];
  parejas: { izquierdaId: number; derechaId: number }[];
}
