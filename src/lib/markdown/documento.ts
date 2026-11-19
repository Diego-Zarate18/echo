import { ErrorDeMarkdown, analizarMarkdown, textoPlano, type Bloque, type Texto } from "./analizar";

export type SeccionDeDocumento = { id: string; titulo: string; bloques: Bloque[] };

/** Un punto del resumen: el título en negritas (sin los dos puntos) y el texto que lo sigue. */
export type PuntoDeResumen = { titulo: string; texto: Texto[] };

/** El bloque «Resumen en cinco puntos» del documento, fuera de su lugar para pintarlo como tarjeta (DEC-98). */
export type ResumenDeDocumento = { puntos: PuntoDeResumen[]; nota: Texto[] };

export type DocumentoLegal = {
  titulo: string;
  version: string;
  /** Fecha de la segunda línea, en DD/MM/AAAA y en ISO para `<time>`. */
  actualizacion: { texto: string; iso: string };
  /** `null` si el documento no trae el bloque «Resumen en cinco puntos». */
  resumen: ResumenDeDocumento | null;
  secciones: SeccionDeDocumento[];
};

const TITULO_DEL_RESUMEN = "Resumen en cinco puntos";

/** Id de un `###` o `####`: como `idDeSeccion`, pero también sin la numeración «2.4». */
export function idDeSubtitulo(titulo: string): string {
  return idDeSeccion(titulo.replace(/^\d+(\.\d+)+\.?\s*/, ""));
}

const esResumen = (bloque: Bloque): bloque is Extract<Bloque, { tipo: "cita" }> => {
  if (bloque.tipo !== "cita") return false;
  const [primero] = bloque.bloques;
  return primero?.tipo === "parrafo" && textoPlano(primero.contenido) === TITULO_DEL_RESUMEN;
};

/**
 * Lee el bloque del resumen: el título, una lista numerada de cinco puntos que empiezan con su título en negritas
 * («**Quiénes somos:** …») y un párrafo final. Si no tiene esa forma, la compilación falla con su línea.
 */
/** La primera letra en mayúscula, con las reglas del español (las letras con acento conservan el acento). */
const conMayuscula = (texto: string) => texto.charAt(0).toLocaleUpperCase("es-MX") + texto.slice(1);

function leerResumen(cita: Extract<Bloque, { tipo: "cita" }>): ResumenDeDocumento {
  const [, lista, nota, ...sobra] = cita.bloques;
  if (lista?.tipo !== "lista" || !lista.ordenada || lista.elementos.length !== 5) {
    throw new ErrorDeMarkdown(cita.linea, "el resumen debe traer una lista numerada de cinco puntos");
  }
  if (nota?.tipo !== "parrafo" || sobra.length) throw new ErrorDeMarkdown(cita.linea, "el resumen debe cerrar con un solo párrafo");
  const puntos = lista.elementos.map((elemento) => {
    const [titulo, ...resto] = elemento.contenido;
    if (titulo?.tipo !== "negrita") throw new ErrorDeMarkdown(elemento.linea, "cada punto del resumen empieza con su título en negritas");
    const [primero, ...demas] = resto;
    // En el archivo el texto sigue a «**Título:**» y empieza en minúscula; en la tarjeta va solo, así que la primera
    // letra que se muestra va en mayúscula (también con acento: «á» → «Á»). El archivo no cambia.
    const texto: Texto[] = primero?.tipo === "texto" ? [{ tipo: "texto", valor: conMayuscula(primero.valor.trimStart()) }, ...demas] : resto;
    return { titulo: textoPlano(titulo.hijos).replace(/:$/, ""), texto };
  });
  return { puntos, nota: nota.contenido };
}

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
 * fecha, y cada `##` abre un apartado. El bloque «Resumen en cinco puntos» (antes del primer `##` o dentro de un
 * apartado) se saca de su lugar y se devuelve aparte, para pintarlo como tarjeta sin duplicarlo (DEC-98). Cualquier otra
 * cosa antes del primer `##` rompe la compilación, igual que un id repetido.
 */
export function leerDocumentoLegal(fuente: string): DocumentoLegal {
  const lineas = fuente.split("\n");
  const metadatos = (lineas[2] ?? "").match(METADATOS);
  if (!lineas[0]?.startsWith("# ")) throw new ErrorDeMarkdown(1, "el documento debe empezar con su título «# …»");
  if (!metadatos) throw new ErrorDeMarkdown(3, "falta «**Versión:** x.y · **Última actualización:** DD/MM/AAAA»");

  const bloques = analizarMarkdown(fuente);
  const [titulo, , ...resto] = bloques;
  const secciones: SeccionDeDocumento[] = [];
  let resumen: ResumenDeDocumento | null = null;
  for (const bloque of resto) {
    if (bloque.tipo === "titulo" && bloque.nivel === 1) throw new ErrorDeMarkdown(bloque.linea, "un segundo título «#»");
    if (esResumen(bloque)) {
      if (resumen) throw new ErrorDeMarkdown(bloque.linea, "un segundo «Resumen en cinco puntos»");
      resumen = leerResumen(bloque);
      continue;
    }
    if (bloque.tipo === "titulo" && bloque.nivel === 2) {
      secciones.push({ id: idDeSeccion(bloque.texto), titulo: bloque.texto, bloques: [] });
      continue;
    }
    if (!secciones.length) throw new ErrorDeMarkdown(bloque.linea, "contenido antes del primer «##»");
    secciones.at(-1)!.bloques.push(bloque);
  }
  // Las anclas deben ser únicas en toda la página: las de los apartados y las de sus «###» y «####».
  const ids = [
    ...secciones.map((s) => ({ id: s.id, linea: 1 })),
    ...secciones.flatMap((s) =>
      s.bloques.flatMap((b) => (b.tipo === "titulo" && b.nivel >= 3 ? [{ id: idDeSubtitulo(b.texto), linea: b.linea }] : [])),
    ),
  ];
  const vistos = new Set<string>();
  for (const { id, linea } of ids) {
    if (vistos.has(id)) throw new ErrorDeMarkdown(linea, `dos títulos con la misma ancla «#${id}»`);
    vistos.add(id);
  }

  const [, version, dia, mes, anio] = metadatos;
  return {
    titulo: titulo.tipo === "titulo" ? titulo.texto : "",
    version,
    actualizacion: { texto: `${dia}/${mes}/${anio}`, iso: `${anio}-${mes}-${dia}` },
    resumen,
    secciones,
  };
}
