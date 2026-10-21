import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const ETIQUETAS_WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const APARTADOS = [
  "Quién es responsable de tus datos",
  "Qué datos recabamos",
  "Para qué los usamos",
  "Con quién los compartimos",
  "Tus derechos ARCO",
  "Cuánto tiempo los conservamos",
  "Consentimiento y cambios",
];

async function revisarAccesibilidad(pagina: Page) {
  await pagina.emulateMedia({ reducedMotion: "reduce" });
  const resultado = await new AxeBuilder({ page: pagina }).withTags(ETIQUETAS_WCAG).analyze();
  const resumen = resultado.violations.map((v) => ({
    regla: v.id,
    impacto: v.impact,
    nodos: v.nodes.map((n) => n.target.join(" ")),
  }));
  expect(resumen, JSON.stringify(resumen, null, 2)).toEqual([]);
}

function indice(pagina: Page) {
  return pagina.getByRole("navigation", { name: "En esta página" });
}

test.describe("SCR-05 · Aviso de privacidad", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/aviso-de-privacidad");
  });

  test("tiene un h1, un h2 por apartado y el índice lleva a ids que existen", async ({ page }) => {
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Aviso de privacidad");
    await expect(page).toHaveTitle("Aviso de privacidad · Echo");
    await expect(page.locator("main section h2")).toHaveText(APARTADOS);

    const destinos = await indice(page)
      .getByRole("link")
      .evaluateAll((enlaces) => enlaces.map((enlace) => enlace.getAttribute("href")!.slice(1)));
    expect(destinos).toHaveLength(APARTADOS.length);
    for (const id of destinos) {
      await expect(page.locator(`section[id="${id}"] h2`), `#${id}`).toHaveCount(1);
    }
  });

  test("muestra el espacio reservado del correo ARCO y pide apellidos", async ({ page }) => {
    await expect(page.getByText("[correo de contacto ARCO · pendiente]")).toBeVisible();
    await expect(page.locator("#datos")).toContainText("apellidos");
    await expect(page.locator("#conservacion")).toContainText(
      "Echo es un piloto académico de la UP Chiapas vigente hasta diciembre de 2026.",
    );
  });

  test("cada enlace del índice deja su título a 16 px o más bajo el encabezado", async ({ page }, info) => {
    test.setTimeout(90_000);
    const tamanos = info.project.name === "movil" ? [[390, 844]] : [[1536, 705], [1440, 900]];
    for (const [ancho, alto] of tamanos) {
      await page.setViewportSize({ width: ancho, height: alto });
      await page.goto("/aviso-de-privacidad");
      const enlaces = indice(page).getByRole("link");
      for (let i = 0; i < APARTADOS.length; i++) {
        const enlace = enlaces.nth(i);
        const id = (await enlace.getAttribute("href"))!.slice(1);
        await enlace.click();
        await page.waitForTimeout(1200);
        const medidas = await page.evaluate((idSeccion) => {
          const encabezado = document.querySelector("header")!.getBoundingClientRect();
          const titulo = document.querySelector(`#${idSeccion} h2`)!.getBoundingClientRect();
          return { titulo: titulo.top, debajoDe: Math.max(encabezado.bottom, 0) + 16 };
        }, id);
        expect(medidas.titulo, `${ancho}×${alto}, #${id}`).toBeGreaterThanOrEqual(medidas.debajoDe);
        await expect(enlace, `${ancho}×${alto}, #${id}`).toHaveAttribute("aria-current", "location");
        // En móvil el índice está al inicio: se vuelve arriba para usar el siguiente enlace.
        if (info.project.name === "movil") await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      }
    }
  });

  test("en escritorio el índice se queda fijo al bajar", async ({ page }, info) => {
    test.skip(info.project.name !== "escritorio", "En móvil el índice es una lista al inicio");
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(500);
    const caja = await indice(page).boundingBox();
    expect(caja!.y).toBeGreaterThanOrEqual(0);
    expect(caja!.y).toBeLessThan(40);
  });

  test("axe no encuentra violaciones de WCAG 2.2 AA", async ({ page }) => {
    await revisarAccesibilidad(page);
  });
});

test("el enlace «Aviso de privacidad» del pie del inicio lleva a la página", async ({ page }) => {
  await page.goto("/");
  const pie = page.getByRole("contentinfo");
  await pie.getByRole("link", { name: "Aviso de privacidad" }).click();
  await expect(page).toHaveURL(/\/aviso-de-privacidad$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Aviso de privacidad");
  const respuesta = await page.request.get("/aviso-de-privacidad");
  expect(respuesta.status()).toBe(200);
});
