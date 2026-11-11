import { readFileSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const ETIQUETAS_WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const leer = (archivo: string) => readFileSync(join(__dirname, "..", "..", "docs", "legal", archivo), "utf8");
const sinMarcas = (l: string) => l.replaceAll("**", "").replace(/\s+/g, " ").trim();
/** En la tarjeta, el texto de cada punto empieza con mayúscula (en el archivo va en minúscula tras el título). */
const conMayuscula = (l: string) => l.charAt(0).toLocaleUpperCase("es-MX") + l.slice(1);

/** Las dos páginas y el archivo que muestran (docs/legal, sin tocar). */
const DOCUMENTOS = [
  {
    ruta: "/aviso-de-privacidad",
    archivo: "aviso-de-privacidad-v1.0.md",
    titulo: "Aviso de privacidad · Echo",
    tituloDelResumen: "Resumen del Aviso de privacidad",
    total: 19,
  },
  {
    ruta: "/terminos-y-condiciones",
    archivo: "terminos-y-condiciones-v1.0.md",
    titulo: "Términos y condiciones de uso con descargo de responsabilidad · Echo",
    tituloDelResumen: "Resumen de los Términos y condiciones",
    total: 20,
  },
].map((documento) => {
  const lineas = leer(documento.archivo).split("\n");
  // El bloque «Resumen en cinco puntos» va en la tarjeta, no en el texto: de su primera línea a la nota final.
  const inicioResumen = lineas.indexOf("> **Resumen en cinco puntos**");
  const finResumen = lineas.findIndex((l, i) => i > inicioResumen && l.startsWith("> Este resumen no sustituye"));
  return {
    ...documento,
    h1: lineas[0].replace(/^# /, ""),
    apartados: lineas.filter((l) => l.startsWith("## ")).map((l) => l.slice(3)),
    resumen: {
      puntos: lineas
        .slice(inicioResumen, finResumen)
        .filter((l) => /^> \d\. /.test(l))
        .map((l) => {
          const [, titulo, texto] = /^> \d\. \*\*(.+?):\*\* (.+)$/.exec(l)!;
          return { titulo, texto: conMayuscula(sinMarcas(texto)) };
        }),
      nota: sinMarcas(lineas[finResumen].slice(2)),
    },
    // Cada texto del archivo sin marcas (párrafos, títulos, elementos de lista, citas y celdas), sin el resumen.
    textos: lineas
      .map((l, i) => (i === 2 || (i >= inicioResumen && i <= finResumen) ? "" : l))
      .filter((l) => l.trim() !== "" && l.trim() !== ">" && !/^\|(\s*-+\s*\|)+$/.test(l))
      .flatMap((l) => (l.startsWith("|") ? l.slice(1, -1).split("|") : [l]))
      .map((l) =>
        sinMarcas(
          l
            .replace(/^#{1,4} /, "")
            .replace(/^> ?/, "")
            .replace(/^- \[ \] /, "")
            .replace(/^- /, "")
            .replace(/^\d+\. /, ""),
        ),
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

const apartados = (pagina: Page) => pagina.getByRole("main").locator("#apartados > details");
const abiertos = (pagina: Page) => apartados(pagina).evaluateAll((lista) => lista.map((d) => (d as HTMLDetailsElement).open));
const botonTodos = (pagina: Page) => pagina.getByRole("main").getByRole("button", { name: /^(Abrir|Cerrar) todos$/ });

/** El elemento queda a la vista, bajo el encabezado fijo. */
async function revisarALaVista(pagina: Page, selector: string) {
  await expect
    .poll(() =>
      pagina.evaluate((s) => {
        const encabezado = document.querySelector("header")!.getBoundingClientRect();
        const caja = document.querySelector(s)!.getBoundingClientRect();
        return caja.top >= Math.max(encabezado.bottom, 0) - 1 && caja.bottom <= window.innerHeight;
      }, selector),
    )
    .toBe(true);
}

for (const documento of DOCUMENTOS) {
  test.describe(`${documento.ruta} · texto legal v1.0 (DEC-98)`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(documento.ruta);
    });

    test("un h1, la versión y la fecha, y un apartado cerrado por cada ## del archivo", async ({ page }) => {
      await expect(page).toHaveTitle(documento.titulo);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(documento.h1);
      await expect(page.locator("main header p").last()).toHaveText("Versión 1.0 · Última actualización: 21/10/2026");
      await expect(page.locator("main header time")).toHaveAttribute("datetime", "2026-10-21");
      expect(documento.apartados).toHaveLength(documento.total);
      await expect(page.locator("#apartados > details > summary > h2")).toHaveText(documento.apartados);
      expect(await abiertos(page)).toEqual(documento.apartados.map(() => false));
      // Ya no hay índice: la lista de apartados lo es.
      await expect(page.getByRole("navigation", { name: "En esta página" })).toHaveCount(0);
    });

    test("la tarjeta tiene los cinco puntos del archivo y el bloque no se repite", async ({ page }) => {
      expect(documento.resumen.puntos).toHaveLength(5);
      const tarjeta = page.getByRole("region", { name: documento.tituloDelResumen });
      await expect(tarjeta).toBeVisible();
      const puntos = tarjeta.locator("ol > li");
      await expect(puntos).toHaveCount(5);
      for (const [i, punto] of documento.resumen.puntos.entries()) {
        await expect(puntos.nth(i).locator("p").first()).toHaveText(punto.titulo);
        await expect(puntos.nth(i).locator("p").nth(1)).toHaveText(punto.texto);
        // La primera letra que se muestra va en mayúscula.
        expect(await puntos.nth(i).locator("p").nth(1).innerText()).toMatch(/^\p{Lu}/u);
        await expect(puntos.nth(i).locator(":scope > [aria-hidden=true]")).toHaveCount(1);
      }
      await expect(tarjeta.locator(":scope > p")).toHaveText(documento.resumen.nota);
      const texto = (await page.locator("main").textContent())!.replace(/\s+/g, " ");
      expect(texto).not.toContain("Resumen en cinco puntos");
      for (const punto of documento.resumen.puntos) expect(texto.split(punto.texto)).toHaveLength(2);
      expect(texto.split(documento.resumen.nota)).toHaveLength(2);
    });

    test("el texto completo está en la página aunque los apartados estén cerrados", async ({ page }) => {
      expect(await abiertos(page)).not.toContain(true);
      const texto = (await page.locator("main").textContent())!.replace(/\s+/g, " ");
      const faltan = documento.textos.filter((t) => !texto.includes(t));
      expect(faltan).toEqual([]);
      expect(documento.textos.length).toBeGreaterThan(80);
      await expect(page.locator('main a[href="mailto:privacidad.echo@gmail.com"]').first()).toBeAttached();
      if (documento.ruta === "/terminos-y-condiciones") {
        await expect(page.locator('main a[href="mailto:soporte.echo@gmail.com"]').first()).toBeAttached();
      }
      // El espacio reservado de PEND-12 ya no existe.
      expect(texto).not.toContain("[correo de contacto ARCO");
      expect(texto).not.toContain("PEND-12");
    });

    test("cada apartado se abre con clic, con Enter y con Espacio", async ({ page }) => {
      const [primero, segundo, tercero] = [0, 1, 2].map((i) => apartados(page).nth(i));
      await primero.locator("summary").click();
      await expect(primero).toHaveJSProperty("open", true);
      await primero.locator("summary").click();
      await expect(primero).toHaveJSProperty("open", false);

      await segundo.locator("summary").focus();
      await expect(segundo.locator("summary")).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(segundo).toHaveJSProperty("open", true);

      await tercero.locator("summary").focus();
      await page.keyboard.press("Space");
      await expect(tercero).toHaveJSProperty("open", true);

      // Objetivos de al menos 24 px: los `summary` miden unos 56.
      expect((await tercero.locator("summary").boundingBox())!.height).toBeGreaterThanOrEqual(44);
    });

    test("«Abrir todos» y «Cerrar todos»; el botón sigue al estado real", async ({ page }) => {
      const boton = botonTodos(page);
      await expect(boton).toHaveText("Abrir todos");
      await expect(boton).toHaveAttribute("aria-expanded", "false");
      await expect(boton).toHaveAttribute("aria-controls", "apartados");
      await boton.click();
      await expect.poll(() => abiertos(page)).toEqual(documento.apartados.map(() => true));
      await expect(boton).toHaveText("Cerrar todos");
      await expect(boton).toHaveAttribute("aria-expanded", "true");
      // Si la persona cierra uno, el botón vuelve a ofrecer abrir todos.
      await apartados(page).first().locator("summary").click();
      await expect(boton).toHaveText("Abrir todos");
      await boton.click();
      await expect(boton).toHaveText("Cerrar todos");
      await boton.press("Enter");
      await expect.poll(() => abiertos(page)).toEqual(documento.apartados.map(() => false));
      await expect(boton).toHaveText("Abrir todos");
    });

    test("al imprimir salen todos abiertos y después vuelven como estaban", async ({ page }) => {
      await apartados(page).nth(1).locator("summary").click();
      await expect(apartados(page).nth(1)).toHaveJSProperty("open", true);
      await page.emulateMedia({ media: "print" });
      await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
      expect(await abiertos(page)).toEqual(documento.apartados.map(() => true));
      await expect(apartados(page).last().locator("summary + div")).toBeVisible();
      await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
      await page.emulateMedia({ media: "screen" });
      expect(await abiertos(page)).toEqual(documento.apartados.map((_, i) => i === 1));
    });

    test("cada tabla tiene caption y encabezados con scope, y desplaza dentro de su contenedor", async ({ page }) => {
      await botonTodos(page).click();
      await expect(botonTodos(page)).toHaveText("Cerrar todos");
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

    test("axe no encuentra violaciones con todo cerrado ni con todo abierto", async ({ page }) => {
      await revisarAccesibilidad(page);
      await botonTodos(page).click();
      await expect(botonTodos(page)).toHaveText("Cerrar todos");
      await revisarAccesibilidad(page);
    });
  });
}

test.describe("Aviso de privacidad: anclas, búsqueda y contenido", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("un ancla de apartado al entrar abre solo ese apartado y lo deja a la vista", async ({ page }) => {
    await page.goto("/aviso-de-privacidad#derechos-arco-y-como-ejercerlos");
    await expect(page.locator("#derechos-arco-y-como-ejercerlos")).toHaveJSProperty("open", true);
    await revisarALaVista(page, "#titulo-derechos-arco-y-como-ejercerlos");
    expect((await abiertos(page)).filter(Boolean)).toHaveLength(1);
  });

  test("un ancla de ### abre su apartado y lleva al subtítulo", async ({ page }) => {
    await page.goto("/aviso-de-privacidad#por-correo-electronico");
    await expect(page.locator("#derechos-arco-y-como-ejercerlos")).toHaveJSProperty("open", true);
    await expect(page.locator("#por-correo-electronico")).toHaveText("5.2 Por correo electrónico");
    await revisarALaVista(page, "#por-correo-electronico");
  });

  test("cambiar el hash con la página abierta también abre el apartado", async ({ page }) => {
    await page.goto("/aviso-de-privacidad");
    expect(await abiertos(page)).not.toContain(true);
    await page.evaluate(() => {
      window.location.hash = "conservacion-y-eliminacion-de-los-datos";
    });
    await expect(page.locator("#conservacion-y-eliminacion-de-los-datos")).toHaveJSProperty("open", true);
    await revisarALaVista(page, "#titulo-conservacion-y-eliminacion-de-los-datos");
  });

  test("buscar en la página encuentra el texto de un apartado cerrado y lo abre", async ({ page }, info) => {
    test.skip(info.project.name !== "escritorio", "Basta con una vez en Chromium");
    await page.goto("/aviso-de-privacidad");
    const apartado = page.locator("#medidas-de-seguridad");
    await expect(apartado).toHaveJSProperty("open", false);
    // El texto de un apartado cerrado sigue en la búsqueda de la página.
    const encontrado = await page.evaluate(() => (window as unknown as { find: (texto: string) => boolean }).find("aleatorios de 256 bits"));
    expect(encontrado).toBe(true);
    // Un fragmento de texto (`#:~:text=`) usa la misma búsqueda que Ctrl+F, y Chromium abre el `<details>` que lo
    // contiene (`window.find` no lo abre).
    await page.goto("/aviso-de-privacidad#:~:text=aleatorios%20de%20256%20bits");
    await expect(apartado).toHaveJSProperty("open", true);
  });

  test("las casillas del Anexo A son una ilustración y el apartado 11 explica el piloto", async ({ page }) => {
    await page.goto("/aviso-de-privacidad");
    const anexo = page.locator("#anexo-a-aviso-de-privacidad-simplificado-y-casillas-del-formulario-de-registro");
    await expect(anexo.locator("input")).toHaveCount(0);
    await expect(anexo.locator("li [aria-hidden=true] svg")).toHaveCount(4);
    await expect(page.locator("#conservacion-y-eliminacion-de-los-datos")).toContainText(
      "Echo es un piloto que termina a principios de diciembre de 2026",
    );
  });

  test("los controles dicen «El documento completo · 19 apartados» (en móvil, «19 apartados»)", async ({ page }, info) => {
    await page.goto("/aviso-de-privacidad");
    const controles = page.getByRole("main").locator("p", { hasText: "19 apartados" });
    const esperado = info.project.name === "movil" ? "19 apartados" : "El documento completo · 19 apartados";
    expect((await controles.innerText()).trim()).toBe(esperado);
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
    // Con la suite completa, la navegación puede tardar más de 5 s: primero la URL, con margen.
    await expect(page).toHaveURL(/\/terminos-y-condiciones$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Términos y condiciones de uso con descargo de responsabilidad");
  });
});
