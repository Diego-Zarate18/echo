/**
 * Analizador mínimo de Markdown (DEC-57): convierte el subconjunto que usan los textos legales en un árbol que después
 * se dibuja con elementos de React (renderizar.tsx), nunca con HTML en cadena.
 *
 * Subconjunto: títulos `#` a `####`, párrafos, `**negritas**`, listas `-` y `1.`, casillas `- [ ]`, citas `>` y tablas.
 * Lo que no reconoce lanza un `ErrorDeMarkdown` con su número de línea, para que la compilación falle y nada se pierda
 * en silencio. Para ampliarlo (por ejemplo, imágenes en las lecciones) se agrega un tipo de bloque o de texto aquí y su
 * dibujo en renderizar.tsx.
 */

export type Texto = { tipo: "texto"; valor: string } | { tipo: "negrita"; hijos: Texto[] };

export type ElementoDeLista = { contenido: Texto[]; linea: number };

export type Bloque =
  | { tipo: "titulo"; nivel: 1 | 2 | 3 | 4; contenido: Texto[]; texto: string; linea: number }
  | { tipo: "parrafo"; contenido: Texto[]; linea: number }
  | { tipo: "lista"; ordenada: boolean; inicio: number; casillas: boolean; elementos: ElementoDeLista[]; linea: number }
  | { tipo: "cita"; bloques: Bloque[]; linea: number }
  | { tipo: "tabla"; encabezados: Texto[][]; filas: Texto[][][]; linea: number };

export class ErrorDeMarkdown extends Error {
  constructor(
    readonly linea: number,
    motivo: string,
  ) {
    super(`Markdown no reconocido en la línea ${linea}: ${motivo}`);
    this.name = "ErrorDeMarkdown";
  }
}

const TITULO = /^(#{1,6}) (.+)$/;
const CASILLA = /^- \[( |x|X)\] (.+)$/;
const VINETA = /^- (.+)$/;
const NUMERADA = /^(\d+)\. (.+)$/;
const FILA_DE_TABLA = /^\|.*\|$/;
const SEPARADOR_DE_TABLA = /^\|(\s*:?-{3,}:?\s*\|)+$/;
/** Inicios de bloque fuera del subconjunto. */
const NO_RECONOCIDOS: [RegExp, string][] = [
  [/^\s+\S/, "sangría (listas anidadas o código) fuera del subconjunto"],
  [/^```|^~~~/, "bloque de código"],
  [/^(\*|\+) /, "lista con «*» o «+»; usa «-»"],
  [/^(-{3,}|\*{3,}|_{3,})$/, "línea horizontal"],
  [/^</, "HTML"],
  [/^!\[/, "imagen"],
];

/** Texto en línea: solo `**negritas**`. Enlaces, código, HTML, imágenes y otros énfasis fallan. */
export function analizarTexto(fuente: string, linea: number): Texto[] {
  const partes = fuente.split("**");
  if (partes.length % 2 === 0) throw new ErrorDeMarkdown(linea, "«**» sin cerrar");
  const resultado: Texto[] = [];
  partes.forEach((parte, indice) => {
    if (/\*/.test(parte)) throw new ErrorDeMarkdown(linea, "énfasis con un solo «*»");
    if (/`/.test(parte)) throw new ErrorDeMarkdown(linea, "código en línea");
    if (/!?\[[^\]]*\]\([^)]*\)/.test(parte)) throw new ErrorDeMarkdown(linea, "enlace o imagen");
    if (/<\/?[a-zA-Z]/.test(parte)) throw new ErrorDeMarkdown(linea, "HTML");
    if (!parte) return;
    if (indice % 2 === 1) resultado.push({ tipo: "negrita", hijos: [{ tipo: "texto", valor: parte }] });
    else resultado.push({ tipo: "texto", valor: parte });
  });
  return resultado;
}

const textoPlano = (contenido: Texto[]): string =>
  contenido.map((t) => (t.tipo === "texto" ? t.valor : textoPlano(t.hijos))).join("");

function celdas(fila: string, linea: number): Texto[][] {
  return fila
    .slice(1, -1)
    .split("|")
    .map((celda) => analizarTexto(celda.trim(), linea));
}

/** Analiza líneas ya separadas; `primera` es el número de la primera línea en el archivo (para los mensajes). */
function analizarLineas(lineas: string[], primera: number): Bloque[] {
  const bloques: Bloque[] = [];
  let i = 0;
  const numero = (indice: number) => primera + indice;
  const vacia = (indice: number) => indice < lineas.length && lineas[indice].trim() === "";

  while (i < lineas.length) {
    const linea = lineas[i];
    if (linea.trim() === "") {
      i++;
      continue;
    }
    for (const [patron, motivo] of NO_RECONOCIDOS) if (patron.test(linea)) throw new ErrorDeMarkdown(numero(i), motivo);

    const titulo = linea.match(TITULO);
    if (titulo) {
      if (titulo[1].length > 4) throw new ErrorDeMarkdown(numero(i), "títulos de nivel 5 o 6");
      const contenido = analizarTexto(titulo[2].trim(), numero(i));
      bloques.push({ tipo: "titulo", nivel: titulo[1].length as 1 | 2 | 3 | 4, contenido, texto: textoPlano(contenido), linea: numero(i) });
      i++;
      continue;
    }

    if (linea.startsWith(">")) {
      const inicio = i;
      const interior: string[] = [];
      while (i < lineas.length && lineas[i].startsWith(">")) interior.push(lineas[i++].replace(/^> ?/, ""));
      bloques.push({ tipo: "cita", bloques: analizarLineas(interior, numero(inicio)), linea: numero(inicio) });
      continue;
    }

    if (FILA_DE_TABLA.test(linea)) {
      const inicio = i;
      if (!SEPARADOR_DE_TABLA.test(lineas[i + 1] ?? "")) throw new ErrorDeMarkdown(numero(i + 1), "a la tabla le falta la fila «|---|»");
      const encabezados = celdas(linea, numero(i));
      i += 2;
      const filas: Texto[][][] = [];
      while (i < lineas.length && FILA_DE_TABLA.test(lineas[i])) {
        const fila = celdas(lineas[i], numero(i));
        if (fila.length !== encabezados.length) {
          throw new ErrorDeMarkdown(numero(i), `la fila tiene ${fila.length} celdas y el encabezado ${encabezados.length}`);
        }
        filas.push(fila);
        i++;
      }
      bloques.push({ tipo: "tabla", encabezados, filas, linea: numero(inicio) });
      continue;
    }

    const casilla = linea.match(CASILLA);
    const numerada = linea.match(NUMERADA);
    if (casilla || VINETA.test(linea) || numerada) {
      const inicio = i;
      const ordenada = Boolean(numerada);
      const deCasillas = Boolean(casilla);
      const patron = ordenada ? NUMERADA : deCasillas ? CASILLA : VINETA;
      const elementos: ElementoDeLista[] = [];
      for (;;) {
        const actual = lineas[i].match(patron);
        if (!actual) break;
        if (deCasillas && actual[1] !== " ") throw new ErrorDeMarkdown(numero(i), "casilla marcada; el subconjunto solo dibuja casillas vacías");
        if (!deCasillas && !ordenada && CASILLA.test(lineas[i])) throw new ErrorDeMarkdown(numero(i), "casilla dentro de una lista de viñetas");
        elementos.push({ contenido: analizarTexto(actual[2] ?? actual[1], numero(i)), linea: numero(i) });
        i++;
        // Una línea en blanco no corta la lista si sigue otro elemento del mismo tipo (lista «suelta»).
        let siguiente = i;
        while (vacia(siguiente)) siguiente++;
        if (siguiente < lineas.length && patron.test(lineas[siguiente]) && (deCasillas || !CASILLA.test(lineas[siguiente]))) i = siguiente;
        else break;
      }
      bloques.push({ tipo: "lista", ordenada, inicio: ordenada ? Number(numerada![1]) : 1, casillas: deCasillas, elementos, linea: numero(inicio) });
      continue;
    }

    // Párrafo: líneas seguidas hasta una vacía o el inicio de otro bloque.
    const inicio = i;
    const texto: string[] = [];
    while (
      i < lineas.length &&
      lineas[i].trim() !== "" &&
      (i === inicio || !(TITULO.test(lineas[i]) || lineas[i].startsWith(">") || FILA_DE_TABLA.test(lineas[i]) || VINETA.test(lineas[i]) || NUMERADA.test(lineas[i])))
    ) {
      for (const [patron, motivo] of NO_RECONOCIDOS) if (patron.test(lineas[i])) throw new ErrorDeMarkdown(numero(i), motivo);
      texto.push(lineas[i].trim());
      i++;
    }
    bloques.push({ tipo: "parrafo", contenido: analizarTexto(texto.join(" "), numero(inicio)), linea: numero(inicio) });
  }
  return bloques;
}

export function analizarMarkdown(fuente: string): Bloque[] {
  if (fuente.includes("\r")) throw new ErrorDeMarkdown(1, "fin de línea CRLF; los textos van en LF");
  return analizarLineas(fuente.replace(/\n$/, "").split("\n"), 1);
}

export { textoPlano };
