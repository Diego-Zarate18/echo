import { readFileSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const ETIQUETAS_WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const leer = (archivo: string) => readFileSync(join(__dirname, "..", "..", "docs", "legal", archivo), "utf8");

/** Las dos páginas y el archivo que muestran (docs/legal, sin tocar). */
const DOCUMENTOS = [
  { ruta: "/aviso-de-privacidad", archivo: "aviso-de-privacidad-v1.0.md", titulo: "Aviso de privacidad · Echo" },
  {
    ruta: "/terminos-y-condiciones",
    archivo: "terminos-y-condiciones-v1.0.md",
    titulo: "Términos y condiciones de uso con descargo de responsabilidad · Echo",
  },
].map((documento) => {
  const fuente = leer(documento.archivo);
  const lineas = fuente.split("\n");
  return {
    ...documento,
    h1: lineas[0].replace(/^# /, ""),
    apartados: lineas.filter((l) => l.startsWith("## ")).map((l) => l.slice(3)),
    // Cada texto del archivo sin marcas: párrafos, títulos, elementos de lista, citas y celdas.
    textos: lineas
      .filter((l, i) => i !== 2 && l.trim() !== "" && l.trim() !== ">" && !/^\|(\s*-+\s*\|)+$/.test(l))
      .flatMap((l) => (l.startsWith("|") ? l.slice(1, -1).split("|") : [l]))
      .map((l) =>
        l
          .replace(/^#{1,4} /, "")
          .replace(/^> ?/, "")
          .replace(/^- \[ \] /, "")
          .replace(/^- /, "")
          .replace(/^\d+\. /, "")
          .replaceAll("**", "")
          .replace(/\s+/g, " ")
          .trim(),
      )
      .filter(Boolean),
  };
});

async function revisarAccesibilidad(pagina: Page) {
  await pagina.emulateMedia({ reducedMotion: "reduce" });
  // Además de WCAG, que ningún recuadro quede como `complementary` dentro de otro punto de referencia.
  // `withTags` y `withRules` se pisan: la regla se agrega a las etiquetas con `options`.
  const resultado = await new AxeBuilder({ page: pagina })
    .options({
      runOnly: { type: "tag", values: ETIQUETAS_WCAG },
      rules: { "landmark-complementary-is-top-level": { enabled: true } },
    })
    .analyze();
  const corridas = [...resultado.passes, ...resultado.inapplicable, ...resultado.violations].map((r) => r.id);
  expect(corridas).toContain("landmark-complementary-is-top-level");
  const resumen = resultado.violations.map((v) => ({ regla: v.id, impacto: v.impact, nodos: v.nodes.map((n) => n.target.join(" ")) }));
  expect(resumen, JSON.stringify(resumen, null, 2)).toEqual([]);
}

const indice = (pagina: Page) => pagina.getByRole("navigation", { name: "En esta página" });

for (const documento of DOCUMENTOS) {
  test.describe(`${documento.ruta} · texto legal v1.0`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(documento.ruta);
    });

    test("un h1, la versión y la fecha, y una sección por cada ## del archivo", async ({ page }) => {
      await expect(page).toHaveTitle(documento.titulo);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(documento.h1);
      await expect(page.locator("main header p")).toHaveText("Versión 1.0 · Última actualización: 21/10/2026");
      await expect(page.locator("main header time")).toHaveAttribute("datetime", "2026-10-21");
      await expect(page.locator("main section > h2")).toHaveText(documento.apartados);
      await expect(indice(page).getByRole("link")).toHaveText(documento.apartados);
      for (const seccion of await page.locator("main section[id]").all()) {
        const id = await seccion.getAttribute("id");
        await expect(seccion, `#${id}`).toHaveAttribute("aria-labelledby", `titulo-${id}`);
      }
    });

    test("el texto de la página es el del archivo", async ({ page }) => {
      const texto = (await page.locator("main").textContent())!.replace(/\s+/g, " ");
      const faltan = documento.textos.filter((t) => !texto.includes(t));
      expect(faltan).toEqual([]);
      expect(documento.textos.length).toBeGreaterThan(80);
      await expect(page.locator('main a[href="mailto:privacidad.echo@gmail.com"]').first()).toBeVisible();
      if (documento.ruta === "/terminos-y-condiciones") {
        await expect(page.locator('main a[href="mailto:soporte.echo@gmail.com"]').first()).toBeAttached();
      }
      // El espacio reservado de PEND-12 ya no existe.
      expect(texto).not.toContain("[correo de contacto ARCO");
      expect(texto).not.toContain("PEND-12");
    });

    test("cada tabla tiene caption y encabezados con scope, y desplaza dentro de su contenedor", async ({ page }) => {
      // Todo en una sola lectura de la página: el aviso tiene 12 tablas y decenas de encabezados.
      const tablas = await page.locator("main table").evaluateAll((lista) =>
        lista.map((tabla) => ({
          caption: tabla.querySelector("caption")?.textContent?.trim() ?? "",
          sinScope: [...tabla.querySelectorAll("th")].filter((th) => !["col", "row"].includes(th.getAttribute("scope") ?? "")).length,
          contenedor: [tabla.parentElement?.getAttribute("role"), tabla.parentElement?.getAttribute("tabindex")],
        })),
      );
      expect(tablas.length).toBeGreaterThan(0);
      for (const [i, tabla] of tablas.entries()) {
        expect(tabla.caption, `tabla ${i + 1}: caption`).not.toBe("");
        expect(tabla.sinScope, `tabla ${i + 1}: encabezados sin scope`).toBe(0);
        expect(tabla.contenedor, `tabla ${i + 1}: contenedor`).toEqual(["region", "0"]);
      }
      // Ninguna tabla desborda la página: si no cabe, se desplaza dentro de su contenedor.
      const medidas = await page.evaluate(() => ({
        pagina: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        contenedores: [...document.querySelectorAll("main [role=region]")].map((c) => c.getBoundingClientRect().right - document.documentElement.clientWidth),
      }));
      expect(medidas.pagina).toBe(0);
      for (const sobra of medidas.contenedores) expect(sobra).toBeLessThanOrEqual(0.5);
    });

    test("cada enlace del índice lleva a su sección y la deja a la vista bajo el encabezado", async ({ page }) => {
      test.setTimeout(120_000);
      await page.emulateMedia({ reducedMotion: "reduce" });
      const enlaces = indice(page).getByRole("link");
      const total = await enlaces.count();
      for (let i = 0; i < total; i++) {
        const enlace = enlaces.nth(i);
        const id = (await enlace.getAttribute("href"))!.slice(1);
        await enlace.click();
        await page.waitForTimeout(250);
        const medidas = await page.evaluate((idSeccion) => {
          const encabezado = document.querySelector("header")!.getBoundingClientRect();
          const titulo = document.querySelector(`#${idSeccion} h2`)!.getBoundingClientRect();
          return { arriba: titulo.top, debajoDe: Math.max(encabezado.bottom, 0) + 16, abajo: titulo.bottom, alto: window.innerHeight };
        }, id);
        expect(medidas.arriba, `#${id}`).toBeGreaterThanOrEqual(medidas.debajoDe);
        expect(medidas.abajo, `#${id}`).toBeLessThanOrEqual(medidas.alto);
        await expect(enlace, `#${id}`).toHaveAttribute("aria-current", "location");
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      }
    });

    test("axe no encuentra violaciones de WCAG 2.2 AA", async ({ page }) => {
      await revisarAccesibilidad(page);
    });
  });
}

test.describe("Aviso de privacidad: lo que antes era provisional", () => {
  test("las casillas del Anexo A son una ilustración, el resumen es un recuadro y el apartado 11 explica el piloto", async ({ page }) => {
    await page.goto("/aviso-de-privacidad");
    const anexo = page.locator("#anexo-a-aviso-de-privacidad-simplificado-y-casillas-del-formulario-de-registro");
    await expect(anexo.locator("input")).toHaveCount(0);
    await expect(anexo.locator("li [aria-hidden=true] svg")).toHaveCount(4);
    await expect(page.getByRole("note", { name: "Resumen en cinco puntos" })).toBeVisible();
    await expect(page.locator("#conservacion-y-eliminacion-de-los-datos")).toContainText("Echo es un piloto que termina a principios de diciembre de 2026");
  });

  test("en escritorio el índice se queda fijo al bajar y cabe en la ventana", async ({ page }, info) => {
    test.skip(info.project.name !== "escritorio", "En móvil el índice es una lista al inicio");
    await page.setViewportSize({ width: 1536, height: 705 });
    await page.goto("/aviso-de-privacidad");
    await page.mouse.wheel(0, 3000);
    await page.waitForTimeout(500);
    const caja = (await indice(page).boundingBox())!;
    expect(caja.y).toBeGreaterThanOrEqual(0);
    expect(caja.y).toBeLessThan(40);
    expect(caja.y + caja.height).toBeLessThanOrEqual(705);
  });
});

test.describe("Enlaces a los textos legales", () => {
  test("el pie del inicio y el de las páginas internas llevan al aviso y a los términos", async ({ page }) => {
    for (const origen of ["/", "/ayuda", "/aviso-de-privacidad"]) {
      await page.goto(origen);
      const pie = page.getByRole("contentinfo");
      await expect(pie.getByRole("link", { name: "Aviso de privacidad" })).toHaveAttribute("href", "/aviso-de-privacidad");
      await expect(pie.getByRole("link", { name: "Términos y condiciones" })).toHaveAttribute("href", "/terminos-y-condiciones");
    }
    await page.goto("/");
    await page.getByRole("contentinfo").getByRole("link", { name: "Términos y condiciones" }).click();
    await expect(page).toHaveURL(/\/terminos-y-condiciones$/);
    expect((await page.request.get("/terminos-y-condiciones")).status()).toBe(200);
  });

  test("el encabezado de Ayuda (o su menú en móvil) lleva a los términos", async ({ page }, info) => {
    await page.goto("/ayuda");
    const encabezado = page.getByRole("banner");
    if (info.project.name === "movil") {
      await encabezado.getByRole("button", { name: "Abrir menú" }).click();
      await page.locator("#menu-movil").getByRole("link", { name: "Términos y condiciones" }).click();
    } else {
      await encabezado.getByRole("link", { name: "Términos y condiciones" }).click();
    }
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Términos y condiciones de uso con descargo de responsabilidad");
  });
});
