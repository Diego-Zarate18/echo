import { ErrorDeMarkdown, analizarMarkdown, type Bloque } from "./analizar";

export type SeccionDeDocumento = { id: string; titulo: string; bloques: Bloque[] };

export type DocumentoLegal = {
  titulo: string;
  version: string;
  /** Fecha de la segunda línea, en DD/MM/AAAA y en ISO para `<time>`. */
  actualizacion: { texto: string; iso: string };
  secciones: SeccionDeDocumento[];
};

/** Id legible en español para el ancla de una sección: sin acentos, sin numeración y en minúsculas. */
export function idDeSeccion(titulo: string): string {
  return titulo
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/^\d+\.\s*/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const METADATOS = /^\*\*Versión:\*\* (\d+\.\d+) · \*\*Última actualización:\*\* (\d{2})\/(\d{2})\/(\d{4})$/;

/**
 * Lee un texto legal de docs/legal (DEC-28, DEC-87): la primera línea es el `#`, la segunda trae la versión y la
 * fecha, y cada `##` abre una sección del índice. Cualquier otra cosa antes del primer `##` rompe la compilación.
 */
export function leerDocumentoLegal(fuente: string): DocumentoLegal {
  const lineas = fuente.split("\n");
  const metadatos = (lineas[2] ?? "").match(METADATOS);
  if (!lineas[0]?.startsWith("# ")) throw new ErrorDeMarkdown(1, "el documento debe empezar con su título «# …»");
  if (!metadatos) throw new ErrorDeMarkdown(3, "falta «**Versión:** x.y · **Última actualización:** DD/MM/AAAA»");

  const bloques = analizarMarkdown(fuente);
  const [titulo, , ...resto] = bloques;
  const secciones: SeccionDeDocumento[] = [];
  for (const bloque of resto) {
    if (bloque.tipo === "titulo" && bloque.nivel === 1) throw new ErrorDeMarkdown(bloque.linea, "un segundo título «#»");
    if (bloque.tipo === "titulo" && bloque.nivel === 2) {
      secciones.push({ id: idDeSeccion(bloque.texto), titulo: bloque.texto, bloques: [] });
      continue;
    }
    if (!secciones.length) throw new ErrorDeMarkdown(bloque.linea, "contenido antes del primer «##»");
    secciones.at(-1)!.bloques.push(bloque);
  }
  const ids = new Set(secciones.map((s) => s.id));
  if (ids.size !== secciones.length) throw new ErrorDeMarkdown(1, "dos secciones «##» con el mismo título");

  const [, version, dia, mes, anio] = metadatos;
  return {
    titulo: titulo.tipo === "titulo" ? titulo.texto : "",
    version,
    actualizacion: { texto: `${dia}/${mes}/${anio}`, iso: `${anio}-${mes}-${dia}` },
    secciones,
  };
}
