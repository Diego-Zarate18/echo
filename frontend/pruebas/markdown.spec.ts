import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "@playwright/test";
import { ErrorDeMarkdown, analizarMarkdown } from "../src/lib/markdown/analizar";
import { idDeSeccion, leerDocumentoLegal } from "../src/lib/markdown/documento";
import { dibujarBloques } from "../src/lib/markdown/renderizar";

const dibujar = (fuente: string, correos: string[] = []) =>
  renderToStaticMarkup(
    createElement(
      "div",
      null,
      dibujarBloques(analizarMarkdown(fuente), {
        prefijo: "prueba",
        tituloDeSeccion: "Sección de prueba",
        correos,
        iconoDeCasilla: createElement("svg", { "data-casilla": "" }),
      }),
    ),
  );

/** El error dice la línea exacta. */
function fallaEnLinea(fuente: string, linea: number) {
  let error: unknown;
  try {
    analizarMarkdown(fuente);
  } catch (e) {
    error = e;
  }
  expect(error, fuente).toBeInstanceOf(ErrorDeMarkdown);
  expect((error as ErrorDeMarkdown).linea, fuente).toBe(linea);
  expect((error as Error).message).toContain(`línea ${linea}`);
}

test.describe("Convertidor de Markdown (lib/markdown)", () => {
  test("títulos # a ####", () => {
    const bloques = analizarMarkdown("# Uno\n\n## Dos\n\n### Tres\n\n#### Cuatro");
    expect(bloques.map((b) => (b.tipo === "titulo" ? [b.nivel, b.texto] : null))).toEqual([[1, "Uno"], [2, "Dos"], [3, "Tres"], [4, "Cuatro"]]);
    const html = dibujar("### Tres\n\n#### Cuatro");
    expect(html).toContain("<h3");
    expect(html).toContain("<h4");
  });

  test("párrafos (varias líneas se unen) y negritas", () => {
    const html = dibujar("Primera línea\ny segunda con **negrita**.\n\nOtro párrafo.");
    expect(html.match(/<p /g)).toHaveLength(2);
    expect(html).toContain("Primera línea y segunda con ");
    expect(html).toMatch(/<strong[^>]*><span>negrita<\/span><\/strong>/);
  });

  test("listas con viñetas y numeradas, también separadas por líneas en blanco", () => {
    const vinetas = analizarMarkdown("- a\n- b");
    expect(vinetas[0]).toMatchObject({ tipo: "lista", ordenada: false, elementos: [{}, {}] });
    const numeradas = analizarMarkdown("3. tres\n\n4. cuatro");
    expect(numeradas).toHaveLength(1);
    expect(numeradas[0]).toMatchObject({ tipo: "lista", ordenada: true, inicio: 3 });
    expect(dibujar("1. uno\n2. dos")).toMatch(/<ol start="1"[^>]*><li[^>]*>.*uno.*<\/li><li[^>]*>.*dos/);
  });

  test("casillas: ícono decorativo, sin controles", () => {
    const html = dibujar("- [ ] Primera\n- [ ] Segunda");
    expect(html).not.toContain("<input");
    expect(html.match(/aria-hidden="true"[^>]*><svg data-casilla=""/g)).toHaveLength(2);
    expect(html).toContain("Primera");
  });

  test("citas: un recuadro aparte titulado por su primer párrafo en negritas", () => {
    const html = dibujar("> **Resumen**\n>\n> 1. Uno.\n>\n> 2. Dos.");
    expect(html).toMatch(/^<div><aside aria-labelledby="prueba-cita-1"/);
    expect(html).toContain('id="prueba-cita-1"');
    expect(html).toContain("<ol");
  });

  test("tablas: caption del título más cercano, scope de columna y, con dos columnas, de fila", () => {
    const html = dibujar("### Plazos\n\n| Etapa | Plazo |\n|---|---|\n| Respuesta | **20 días** |");
    expect(html).toContain('<caption class="sr-only">Plazos</caption>');
    expect(html).toContain('role="region" aria-label="Plazos" tabindex="0"');
    expect(html.match(/scope="col"/g)).toHaveLength(2);
    expect(html).toContain('<th scope="row"');
    const tres = dibujar("| A | B | C |\n|---|---|---|\n| 1 | 2 | 3 |");
    expect(tres).toContain('<caption class="sr-only">Sección de prueba</caption>');
    expect(tres).not.toContain('scope="row"');
  });

  test("correos como enlaces mailto, también dentro de negritas", () => {
    const html = dibujar("Escribe a **hola@example.com** o a otra@example.com.", ["hola@example.com", "otra@example.com"]);
    expect(html.match(/href="mailto:(hola|otra)@example.com"/g)).toHaveLength(2);
  });

  test("nunca HTML en cadena: el texto con < se escapa", () => {
    expect(dibujar("Uno < dos y 3 > 2.")).toContain("Uno &lt; dos y 3 &gt; 2.");
  });

  test("lo que no reconoce rompe la conversión con su número de línea", () => {
    fallaEnLinea("Texto\n\n##### Cinco", 3);
    fallaEnLinea("Un [enlace](https://example.com).", 1);
    fallaEnLinea("Párrafo\n\nCon *énfasis* simple.", 3);
    fallaEnLinea("Una **negrita sin cerrar.", 1);
    fallaEnLinea("```\ncódigo\n```", 1);
    fallaEnLinea("- uno\n  - anidada", 2);
    fallaEnLinea("- [x] marcada", 1);
    fallaEnLinea("<b>HTML</b>", 1);
    fallaEnLinea("Texto\n\n![imagen](x.png)", 3);
    fallaEnLinea("* viñeta con asterisco", 1);
    fallaEnLinea("---", 1);
    fallaEnLinea("| A | B |\n|---|---|\n| solo una |", 3);
    fallaEnLinea("| A | B |\n| sin separador |", 2);
    fallaEnLinea("> cita con `código`", 1);
    fallaEnLinea("Línea con CRLF\r\n", 1);
  });

  test("documento legal: título, versión, fecha y una sección por cada ##", () => {
    const documento = leerDocumentoLegal("# Aviso\n\n**Versión:** 1.2 · **Última actualización:** 03/11/2026\n\n## 1. Primero\n\nTexto.\n\n### 1.1 Sub\n\n## Anexo A. Otro\n\nMás.\n");
    expect(documento).toMatchObject({ titulo: "Aviso", version: "1.2", actualizacion: { texto: "03/11/2026", iso: "2026-11-03" } });
    expect(documento.secciones.map((s) => [s.id, s.titulo, s.bloques.length])).toEqual([
      ["primero", "1. Primero", 2],
      ["anexo-a-otro", "Anexo A. Otro", 1],
    ]);
    expect(idDeSeccion("2. Datos personales que recabamos")).toBe("datos-personales-que-recabamos");
    expect(() => leerDocumentoLegal("# A\n\nsin versión\n")).toThrow(/línea 3/);
    expect(() => leerDocumentoLegal("# A\n\n**Versión:** 1.0 · **Última actualización:** 01/01/2026\n\nAntes del primer apartado.\n")).toThrow(/línea 5/);
  });
});
