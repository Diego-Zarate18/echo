/**
 * Lector del subconjunto de YAML con el que está escrito docs/api/openapi.yaml, para revisar el contrato sin
 * dependencias nuevas: mapas y listas por sangría, `- clave: valor`, escalares simples o entre comillas, listas en
 * línea (`[a, b]`), `{}` vacío y bloques `|` y `>`. La prueba compara su resultado con los tipos que generó
 * openapi-typescript (que sí usa un lector completo), así que si este lector se equivoca, la prueba lo nota.
 */
export function leerYaml(fuente: string): unknown {
  const lineas = fuente.replace(/\r\n/g, "\n").split("\n");
  let i = 0;

  const sangria = (linea: string) => linea.match(/^ */)![0].length;
  const vacia = (linea: string) => /^\s*$/.test(linea) || /^\s*#/.test(linea);
  function saltarVacias() {
    while (i < lineas.length && vacia(lineas[i])) i++;
  }

  function escalar(texto: string): unknown {
    const valor = texto.trim();
    if (valor.startsWith('"')) return JSON.parse(valor);
    if (valor.startsWith("'")) return valor.slice(1, -1).replace(/''/g, "'");
    if (valor === "{}") return {};
    if (valor.startsWith("[")) {
      const interior = valor.slice(1, -1).trim();
      return interior ? interior.split(",").map((parte) => escalar(parte)) : [];
    }
    if (valor === "true") return true;
    if (valor === "false") return false;
    if (valor === "null" || valor === "~") return null;
    if (/^-?\d+(\.\d+)?$/.test(valor)) return Number(valor);
    return valor;
  }

  /** Separa `clave: valor`; la clave puede ir entre comillas. */
  function separar(texto: string): { clave: string; resto: string } | null {
    const coincidencia = texto.match(/^("(?:[^"\\]|\\.)*"|'[^']*'|[^\s"'#\-[{][^:]*?|-[^\s][^:]*?):(?: (.*))?$/);
    if (!coincidencia) return null;
    const clave = coincidencia[1].startsWith('"') || coincidencia[1].startsWith("'") ? String(escalar(coincidencia[1])) : coincidencia[1];
    return { clave, resto: (coincidencia[2] ?? "").trim() };
  }

  function bloqueDeTexto(indicador: string, sangriaPadre: number): string {
    const partes: string[] = [];
    let sangriaBloque = -1;
    while (i < lineas.length && (/^\s*$/.test(lineas[i]) || sangria(lineas[i]) > sangriaPadre)) {
      if (!/^\s*$/.test(lineas[i]) && sangriaBloque < 0) sangriaBloque = sangria(lineas[i]);
      partes.push(/^\s*$/.test(lineas[i]) ? "" : lineas[i].slice(sangriaBloque));
      i++;
    }
    while (partes.length && partes.at(-1) === "") partes.pop();
    if (indicador.startsWith("|")) return partes.join("\n");
    return partes.reduce((texto, parte) => (parte === "" ? `${texto}\n` : texto && !texto.endsWith("\n") ? `${texto} ${parte}` : texto + parte), "");
  }

  function valor(resto: string, sangriaPadre: number): unknown {
    if (/^[|>][-+]?$/.test(resto)) return bloqueDeTexto(resto, sangriaPadre);
    if (resto !== "") return escalar(resto);
    saltarVacias();
    if (i >= lineas.length) return null;
    const siguiente = sangria(lineas[i]);
    if (siguiente > sangriaPadre) return bloque();
    if (siguiente === sangriaPadre && lineas[i].slice(siguiente).startsWith("-")) return lista(siguiente);
    return null;
  }

  function mapa(propia: number): Record<string, unknown> {
    const objeto: Record<string, unknown> = {};
    for (;;) {
      saltarVacias();
      if (i >= lineas.length || sangria(lineas[i]) < propia) return objeto;
      if (sangria(lineas[i]) > propia) throw new Error(`Sangría inesperada en la línea ${i + 1}`);
      const texto = lineas[i].slice(propia);
      if (texto.startsWith("- ") || texto === "-") return objeto;
      const par = separar(texto);
      if (!par) throw new Error(`No es «clave: valor» en la línea ${i + 1}: ${texto}`);
      if (Object.hasOwn(objeto, par.clave)) throw new Error(`Clave repetida «${par.clave}» en la línea ${i + 1}`);
      i++;
      objeto[par.clave] = valor(par.resto, propia);
    }
  }

  function lista(propia: number): unknown[] {
    const elementos: unknown[] = [];
    for (;;) {
      saltarVacias();
      if (i >= lineas.length || sangria(lineas[i]) !== propia || !lineas[i].slice(propia).startsWith("-")) return elementos;
      const texto = lineas[i].slice(propia + 1).replace(/^ /, "");
      if (texto === "") {
        i++;
        elementos.push(bloque());
      } else if (separar(texto)) {
        // «- clave: valor» abre un mapa con la sangría del texto.
        lineas[i] = " ".repeat(propia + 2) + texto;
        elementos.push(mapa(propia + 2));
      } else {
        i++;
        elementos.push(escalar(texto));
      }
    }
  }

  function bloque(): unknown {
    saltarVacias();
    if (i >= lineas.length) return null;
    const propia = sangria(lineas[i]);
    return lineas[i].slice(propia).startsWith("-") ? lista(propia) : mapa(propia);
  }

  const raiz = bloque();
  saltarVacias();
  if (i < lineas.length) throw new Error(`Quedó texto sin leer en la línea ${i + 1}`);
  return raiz;
}
