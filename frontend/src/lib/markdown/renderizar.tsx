import type { ReactNode } from "react";
import { textoPlano, type Bloque, type Texto } from "./analizar";

export type OpcionesDeDibujo = {
  /** Prefijo único de la sección: los ids internos (por ejemplo, el título de una cita) lo llevan. */
  prefijo: string;
  /** Título de la sección: es el `caption` de las tablas que no tienen un título más cercano. */
  tituloDeSeccion: string;
  /** Correos que se vuelven enlaces `mailto:` donde aparezcan. */
  correos?: readonly string[];
  /** Ícono de casilla vacía para las listas `- [ ]` (decorativo; se dibuja con `aria-hidden`). */
  iconoDeCasilla: ReactNode;
};

const escapar = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Texto con sus correos convertidos en enlaces. */
function conCorreos(valor: string, correos: readonly string[], clave: string): ReactNode {
  if (!correos.length) return valor;
  const patron = new RegExp(`(${correos.map(escapar).join("|")})`, "g");
  const partes = valor.split(patron);
  if (partes.length === 1) return valor;
  return partes.map((parte, i) =>
    correos.includes(parte) ? (
      <a key={`${clave}-${i}`} href={`mailto:${parte}`} className="font-semibold underline underline-offset-4 hover:decoration-2">
        {parte}
      </a>
    ) : (
      parte
    ),
  );
}

export function dibujarTexto(textos: Texto[], opciones: Pick<OpcionesDeDibujo, "correos">, clave = "t"): ReactNode[] {
  return textos.map((texto, i) =>
    texto.tipo === "texto" ? (
      <span key={`${clave}-${i}`}>{conCorreos(texto.valor, opciones.correos ?? [], `${clave}-${i}`)}</span>
    ) : (
      <strong key={`${clave}-${i}`} className="font-bold">
        {dibujarTexto(texto.hijos, opciones, `${clave}-${i}`)}
      </strong>
    ),
  );
}

/** Ancho mínimo de la tabla según sus columnas: en pantallas angostas se desplaza dentro de su contenedor. */
const ANCHO_MINIMO = ["", "", "min-w-[30rem]", "min-w-[40rem]", "min-w-[48rem]"];

function Tabla({ bloque, titulo, opciones }: { bloque: Extract<Bloque, { tipo: "tabla" }>; titulo: string; opciones: OpcionesDeDibujo }) {
  const deDosColumnas = bloque.encabezados.length === 2;
  return (
    // Desplazamiento propio en pantallas angostas (WCAG 1.4.10 lo permite en tablas); se enfoca con el teclado.
    <div role="region" aria-label={titulo} tabIndex={0} className="w-full max-w-full overflow-x-auto rounded-fila border border-marca-cafe/16 bg-superficie-elevada">
      <table className={`w-full border-collapse text-left text-base leading-[1.55] ${ANCHO_MINIMO[Math.min(bloque.encabezados.length, 4)]}`}>
        <caption className="sr-only">{titulo}</caption>
        <thead>
          <tr>
            {bloque.encabezados.map((celda, i) => (
              <th key={i} scope="col" className="bg-superficie-hundida px-4 py-3 align-bottom font-titulo text-menor font-bold">
                {dibujarTexto(celda, opciones, `${bloque.linea}-e${i}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bloque.filas.map((fila, f) => (
            <tr key={f} className="border-t border-marca-cafe/12">
              {fila.map((celda, c) =>
                c === 0 && deDosColumnas ? (
                  <th key={c} scope="row" className="px-4 py-3 align-top font-semibold">
                    {dibujarTexto(celda, opciones, `${bloque.linea}-${f}-${c}`)}
                  </th>
                ) : (
                  <td key={c} className="px-4 py-3 align-top">
                    {dibujarTexto(celda, opciones, `${bloque.linea}-${f}-${c}`)}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Una cita es un recuadro aparte. Si empieza con un párrafo todo en negritas, ese párrafo es su título. */
function Cita({ bloque, opciones }: { bloque: Extract<Bloque, { tipo: "cita" }>; opciones: OpcionesDeDibujo }) {
  const [primero, ...resto] = bloque.bloques;
  const titulada = primero?.tipo === "parrafo" && primero.contenido.length === 1 && primero.contenido[0].tipo === "negrita";
  const idTitulo = `${opciones.prefijo}-cita-${bloque.linea}`;
  return (
    <aside
      aria-labelledby={titulada ? idTitulo : undefined}
      aria-label={titulada ? undefined : "Nota"}
      className="flex max-w-[62ch] flex-col gap-3 rounded-globo border border-marca-cafe/22 bg-superficie-elevada px-5 py-5 md:px-6"
    >
      {titulada ? (
        <p id={idTitulo} className="font-titulo text-tarjeta font-extrabold">
          {textoPlano(primero.contenido)}
        </p>
      ) : null}
      {dibujarBloques(titulada ? resto : bloque.bloques, opciones)}
    </aside>
  );
}

/** Dibuja los bloques de una sección. Las tablas toman como `caption` el título más cercano que tengan arriba. */
export function dibujarBloques(bloques: Bloque[], opciones: OpcionesDeDibujo): ReactNode[] {
  let tituloCercano = opciones.tituloDeSeccion;
  return bloques.map((bloque) => {
    const clave = `${bloque.tipo}-${bloque.linea}`;
    switch (bloque.tipo) {
      case "titulo": {
        tituloCercano = bloque.texto;
        const contenido = dibujarTexto(bloque.contenido, opciones, clave);
        if (bloque.nivel === 3) return <h3 key={clave} className="mt-6 font-titulo text-tarjeta font-bold text-balance">{contenido}</h3>;
        if (bloque.nivel === 4) return <h4 key={clave} className="mt-3 font-titulo text-cuerpo font-extrabold">{contenido}</h4>;
        return <h2 key={clave} className="font-titulo text-elemento font-extrabold text-balance">{contenido}</h2>;
      }
      case "parrafo":
        return (
          <p key={clave} className="max-w-[58ch]">
            {dibujarTexto(bloque.contenido, opciones, clave)}
          </p>
        );
      case "lista": {
        const elementos = bloque.elementos.map((elemento) => (
          <li key={elemento.linea} className={bloque.casillas ? "flex items-start gap-3" : "pl-1"}>
            {bloque.casillas ? (
              <>
                <span aria-hidden="true" className="mt-[0.3em] shrink-0 text-marca-terracota">
                  {opciones.iconoDeCasilla}
                </span>
                <span>{dibujarTexto(elemento.contenido, opciones, `${clave}-${elemento.linea}`)}</span>
              </>
            ) : (
              dibujarTexto(elemento.contenido, opciones, `${clave}-${elemento.linea}`)
            )}
          </li>
        ));
        if (bloque.casillas) return <ul key={clave} className="flex max-w-[58ch] flex-col gap-2">{elementos}</ul>;
        if (bloque.ordenada) {
          return (
            <ol key={clave} start={bloque.inicio} className="flex max-w-[58ch] list-decimal flex-col gap-2 pl-6 marker:font-titulo marker:font-bold">
              {elementos}
            </ol>
          );
        }
        return <ul key={clave} className="flex max-w-[58ch] list-disc flex-col gap-2 pl-6 marker:text-marca-terracota">{elementos}</ul>;
      }
      case "cita":
        return <Cita key={clave} bloque={bloque} opciones={opciones} />;
      case "tabla":
        return <Tabla key={clave} bloque={bloque} titulo={tituloCercano} opciones={opciones} />;
    }
  });
}
