import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const ETIQUETAS_WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function revisarAccesibilidad(pagina: Page) {
  const resultado = await new AxeBuilder({ page: pagina }).withTags(ETIQUETAS_WCAG).analyze();
  const resumen = resultado.violations.map((v) => ({
    regla: v.id,
    impacto: v.impact,
    nodos: v.nodes.map((n) => n.target.join(" ")),
  }));
  expect(resumen, JSON.stringify(resumen, null, 2)).toEqual([]);
}

test.describe("SCR-18 · Inicio público", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("tiene un solo h1 con el título del hero", async ({ page }) => {
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lo que construyes, regresa.");
  });

  test("tiene los landmarks y el enlace para saltar al contenido", async ({ page }) => {
    await expect(page.getByRole("banner")).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("contentinfo")).toHaveCount(1);
    await expect(page.getByRole("navigation", { name: "Enlaces del pie de página" })).toBeVisible();

    await page.keyboard.press("Tab");
    const saltar = page.getByRole("link", { name: "Saltar al contenido" });
    await expect(saltar).toBeFocused();
    await expect(saltar).toHaveAttribute("href", "#contenido");
  });

  test("cada ancla lleva a una sección que existe", async ({ page }) => {
    const destinos = await page.locator('a[href^="#"]').evaluateAll((enlaces) =>
      enlaces.map((enlace) => enlace.getAttribute("href")!.slice(1)),
    );
    expect(destinos).toEqual(
      expect.arrayContaining(["contenido", "que-es-echo", "que-encontraras", "por-que-echo", "quienes-somos"]),
    );
    for (const id of new Set(destinos)) {
      await expect(page.locator(`[id="${id}"]`), `#${id}`).toHaveCount(1);
    }
  });

  test("los enlaces de cuenta y del pie apuntan a sus rutas", async ({ page }) => {
    const hrefsPorTexto = async (texto: string) =>
      page
        .getByRole("link", { name: texto, exact: true, includeHidden: true })
        .evaluateAll((enlaces) => [...new Set(enlaces.map((e) => e.getAttribute("href")))]);

    expect(await hrefsPorTexto("Crear cuenta")).toEqual(["/registro"]);
    expect(await hrefsPorTexto("Iniciar sesión")).toEqual(["/iniciar-sesion"]);
    expect(await hrefsPorTexto("Ya tengo cuenta")).toEqual(["/iniciar-sesion"]);
    expect(await hrefsPorTexto("Ayuda")).toEqual(["/ayuda"]);
    expect(await hrefsPorTexto("Aviso de privacidad")).toEqual(["/aviso-de-privacidad"]);
    expect(await hrefsPorTexto("Ver cómo funciona")).toEqual(["#que-encontraras"]);
    await expect(
      page.getByRole("link", { name: "Saber más sobre el cierre del piloto", includeHidden: true }).first(),
    ).toHaveAttribute("href", "/ayuda#cierre-del-piloto");
  });

  test("las imágenes tienen texto alternativo", async ({ page }) => {
    const sinAlt = await page.locator("img:not([alt])").count();
    expect(sinAlt).toBe(0);
    await expect(page.getByRole("img", { name: /^Moris, la mascota de Echo/ })).toBeVisible();
    await expect(page.getByRole("img", { name: "Universidad Politécnica de Chiapas" }).first()).toBeAttached();
  });

  test("axe no encuentra violaciones de WCAG 2.2 AA", async ({ page }) => {
    await revisarAccesibilidad(page);
  });
});

test.describe("SCR-18 · Menú móvil", () => {
  test.beforeEach(async ({ page }, info) => {
    test.skip(info.project.name !== "movil", "El menú solo existe por debajo de 1280 px");
    await page.goto("/");
  });

  test("abre con Enter y cierra con Escape devolviendo el foco al botón", async ({ page }) => {
    const boton = page.getByRole("button", { name: "Abrir menú" });
    const panel = page.locator("#menu-movil");
    await expect(boton).toHaveAttribute("aria-expanded", "false");
    await expect(boton).toHaveAttribute("aria-controls", "menu-movil");
    await expect(panel).toBeHidden();

    await boton.focus();
    await page.keyboard.press("Enter");
    const botonCerrar = page.getByRole("button", { name: "Cerrar menú" });
    await expect(botonCerrar).toHaveAttribute("aria-expanded", "true");
    await expect(panel).toBeVisible();
    for (const texto of ["Qué es Echo", "Qué encontrarás", "Por qué Echo", "Quiénes somos", "Iniciar sesión", "Crear cuenta"]) {
      await expect(panel.getByRole("link", { name: texto, exact: true })).toBeVisible();
    }

    await page.keyboard.press("Tab");
    await expect(panel.getByRole("link", { name: "Qué es Echo" })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(page.getByRole("button", { name: "Abrir menú" })).toBeFocused();
    await expect(page.getByRole("button", { name: "Abrir menú" })).toHaveAttribute("aria-expanded", "false");
  });

  test("se cierra al elegir un enlace", async ({ page }) => {
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await page.locator("#menu-movil").getByRole("link", { name: "Por qué Echo" }).click();
    await expect(page.locator("#menu-movil")).toBeHidden();
    await expect(page).toHaveURL(/#por-que-echo$/);
  });

  test("se cierra al pasar a escritorio", async ({ page }) => {
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await expect(page.locator("#menu-movil")).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.locator("#menu-movil")).toBeHidden();
    await expect(page.getByRole("navigation", { name: "Secciones de la página" })).toBeVisible();
  });

  test("axe no encuentra violaciones con el menú abierto", async ({ page }) => {
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await expect(page.locator("#menu-movil")).toBeVisible();
    await revisarAccesibilidad(page);
  });
});

test.describe("Página no encontrada", () => {
  test("responde 404 en español con enlace al inicio", async ({ page }) => {
    const respuesta = await page.goto("/registro");
    expect(respuesta?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("No encontramos esta página.");
    await expect(page.getByRole("link", { name: "Ir al inicio" })).toHaveAttribute("href", "/");
    await expect(page).toHaveTitle("Página no encontrada · Echo");
    await revisarAccesibilidad(page);
  });
});
