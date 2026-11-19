import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { leerDocumentoLegal, type DocumentoLegal } from "./documento";

/**
 * Lee un texto de docs/legal al compilar (las páginas que lo usan son estáticas) y lo convierte. Si el Markdown trae
 * algo fuera del subconjunto, la compilación falla con el archivo y la línea.
 */
export function leerTextoLegal(archivo: string): DocumentoLegal {
  const ruta = join(process.cwd(), "..", "docs", "legal", archivo);
  try {
    return leerDocumentoLegal(readFileSync(ruta, "utf8"));
  } catch (error) {
    throw new Error(`docs/legal/${archivo}: ${(error as Error).message}`, { cause: error });
  }
}
