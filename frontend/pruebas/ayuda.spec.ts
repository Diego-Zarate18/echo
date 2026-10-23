import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const ETIQUETAS_WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const PREGUNTAS = [
  { id: "como-avanzo", titulo: "¿Cómo avanzo en Echo?" },
  { id: "lecciones", titulo: "Lecciones" },
  { id: "actividades-y-casos", titulo: "Actividades y casos prácticos" },
  { id: "examenes", titulo: "Exámenes" },
  { id: "progreso-e-insignias", titulo: "Mi progreso e insignias" },
  { id: "cuenta-y-sesion", titulo: "Mi cuenta y mi sesión" },
  { id: "accesibilidad", titulo: "Accesibilidad" },
  { id: "cierre-del-piloto", titulo: "¿Qué pasa con mis datos en diciembre?" },
];
const ABIERTAS_AL_CARGAR = ["como-avanzo", "cierre-del-piloto"];

async function revisarAccesibilidad(pagina: Page) {
  const resultado = await new AxeBuilder({ page: pagina }).withTags(ETIQUETAS_WCAG).analyze();
  const resumen = resultado.violations.map((v) => ({
    regla: v.id,
    impacto: v.impact,
    nodos: v.nodes.map((n) => n.target.join(" ")),
  }));
  expect(resumen, JSON.stringify(resumen, null, 2)).toEqual([]);
}

const boton = (pagina: Page, id: string) => pagina.locator(`#boton-${id}`);
const indice = (pagina: Page) => pagina.getByRole("navigation", { name: "En esta página" });

test.describe("SCR-17 · Ayuda", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ayuda");
  });

  test("tiene un h1 y 8 preguntas con botón, aria-expanded y región etiquetada", async ({ page }) => {
    await expect(page).toHaveTitle("Ayuda · Echo");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ayuda");
    await expect(page.locator("main h2")).toHaveText(PREGUNTAS.map((p) => p.titulo));

    for (const { id, titulo } of PREGUNTAS) {
      const control = page.getByRole("heading", { level: 2, name: titulo }).getByRole("button", { name: titulo });
      await expect(control).toHaveAttribute("aria-expanded", ABIERTAS_AL_CARGAR.includes(id) ? "true" : "false");
      const idRespuesta = await control.getAttribute("aria-controls");
      const respuesta = page.locator(`[id="${idRespuesta}"]`);
      await expect(respuesta).toHaveAttribute("role", "region");
      await expect(respuesta).toHaveAttribute("aria-labelledby", `boton-${id}`);
      if (ABIERTAS_AL_CARGAR.includes(id)) {
        await expect(page.getByRole("region", { name: titulo })).toBeVisible();
      } else {
        await expect(respuesta).toBeHidden();
      }
    }
  });

  test("con el teclado se llega a cada pregunta y Enter y Espacio la abren y la cierran", async ({ page }) => {
    const vistos = new Set<string>();
    await page.locator("body").focus();
    for (let paso = 0; paso < 40 && vistos.size < PREGUNTAS.length; paso++) {
      await page.keyboard.press("Tab");
      const id = await page.evaluate(() => document.activeElement?.id ?? "");
      if (id.startsWith("boton-")) vistos.add(id.slice("boton-".length));
    }
    expect([...vistos].sort()).toEqual(PREGUNTAS.map((p) => p.id).sort());

    const examenes = boton(page, "examenes");
    await examenes.focus();
    for (const [tecla, esperado] of [["Enter", "true"], ["Enter", "false"], ["Space", "true"], ["Space", "false"]]) {
      await page.keyboard.press(tecla);
      await expect(examenes, `${tecla} → ${esperado}`).toHaveAttribute("aria-expanded", esperado);
    }
  });

  test("cada enlace del índice abre su pregunta, la enfoca y la deja 16 px o más bajo el encabezado", async ({ page }, info) => {
    test.setTimeout(120_000);
    const tamanos = info.project.name === "movil" ? [[390, 844]] : [[1536, 705], [1440, 900]];
    for (const [ancho, alto] of tamanos) {
      await page.setViewportSize({ width: ancho, height: alto });
      await page.goto("/ayuda");
      for (const { id } of PREGUNTAS) {
        const medida = `${ancho}×${alto}, #${id}`;
        // Se cierra antes para comprobar que el índice la abre.
        if ((await boton(page, id).getAttribute("aria-expanded")) === "true") await boton(page, id).click();
        const enlace = indice(page).locator(`a[href="#${id}"]`);
        await enlace.click();
        await page.waitForTimeout(1200);
        await expect(boton(page, id), medida).toHaveAttribute("aria-expanded", "true");
        await expect(boton(page, id), medida).toBeFocused();
        await expect(enlace, medida).toHaveAttribute("aria-current", "location");
        const distancia = await page.evaluate((idPregunta) => {
          const encabezado = document.querySelector("header")!.getBoundingClientRect();
          return document.getElementById(idPregunta)!.getBoundingClientRect().top - (Math.max(encabezado.bottom, 0) + 16);
        }, id);
        expect(distancia, medida).toBeGreaterThanOrEqual(0);
        // En móvil el índice está al inicio: se vuelve arriba para usar el siguiente enlace.
        if (info.project.name === "movil") await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      }
    }
  });

  test("el ancla de la URL abre su pregunta al cargar", async ({ page }) => {
    await page.goto("/ayuda#cierre-del-piloto");
    await expect(boton(page, "cierre-del-piloto")).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("region", { name: "¿Qué pasa con mis datos en diciembre?" })).toBeInViewport();

    // Una pregunta cerrada al cargar también se abre con su ancla.
    await page.goto("/ayuda#examenes");
    await expect(boton(page, "examenes")).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("region", { name: "Exámenes" })).toBeVisible();
  });

  test("muestra el texto del piloto, los números de las decisiones y los contactos", async ({ page }) => {
    const principal = page.locator("main");
    await expect(page.locator("#cierre-del-piloto")).toContainText(
      "Echo es un piloto académico de la UP Chiapas vigente hasta diciembre de 2026.",
    );
    await expect(principal).toContainText("70 %");
    await expect(principal).toContainText("20 minutos");
    await expect(principal).toContainText("30 minutos");
    await expect(page.locator("#cuenta-y-sesion")).toContainText("8 caracteres o más, con al menos una letra y un número");
    await expect(page.locator("#cuenta-y-sesion")).toContainText("vence en 30 minutos, igual que el que confirma un cambio de correo");
    // «Accesibilidad» empieza cerrada: su enlace existe aunque no se vea.
    await expect(page.locator('#accesibilidad a[href="mailto:soporte.echo@gmail.com"]')).toHaveText(
      "soporte.echo@gmail.com",
    );
    await expect(page.locator('#cierre-del-piloto a[href="mailto:privacidad.echo@gmail.com"]')).toHaveText(
      "privacidad.echo@gmail.com",
    );
    await expect(page.locator("#cierre-del-piloto").getByRole("link", { name: "Aviso de privacidad" })).toHaveAttribute(
      "href",
      "/aviso-de-privacidad",
    );
  });

  test("solo se anima el alto y el chevrón, y con movimiento reducido el cambio es instantáneo", async ({ page }) => {
    const respuesta = page.locator("#respuesta-lecciones");
    await expect(respuesta).toHaveCSS("transition-property", "grid-template-rows, visibility");
    await expect(respuesta).toHaveCSS("transition-duration", "0.22s, 0s");
    await expect(boton(page, "lecciones").locator("svg")).toHaveCSS("transition-property", "rotate");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(respuesta).toHaveCSS("transition-duration", "0s");
    await boton(page, "lecciones").click();
    await expect(respuesta).toBeVisible();
    expect(await respuesta.evaluate((r) => r.getAnimations().length)).toBe(0);
  });

  test("axe no encuentra violaciones con todo abierto ni con todo cerrado", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const estado of ["true", "false"]) {
      for (const { id } of PREGUNTAS) {
        if ((await boton(page, id).getAttribute("aria-expanded")) !== estado) await boton(page, id).click();
      }
      await expect(page.locator(`main [aria-expanded="${estado}"]`)).toHaveCount(PREGUNTAS.length);
      await revisarAccesibilidad(page);
    }
  });
});

test.describe("SCR-17 · Enlaces hacia y desde Ayuda", () => {
  test("«Ayuda» del pie del inicio y del aviso responden 200 y llevan a la página", async ({ page }) => {
    for (const origen of ["/", "/aviso-de-privacidad"]) {
      await page.goto(origen);
      const enlace = page.getByRole("contentinfo").getByRole("link", { name: "Ayuda", exact: true });
      await expect(enlace).toHaveAttribute("href", "/ayuda");
      await enlace.click();
      await expect(page).toHaveURL(/\/ayuda$/);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ayuda");
    }
    expect((await page.request.get("/ayuda")).status()).toBe(200);
  });

  test("«Aviso de privacidad» del encabezado de Ayuda lleva al aviso", async ({ page }, info) => {
    await page.goto("/ayuda");
    const encabezado = page.getByRole("banner");
    if (info.project.name === "movil") {
      await encabezado.getByRole("button", { name: "Abrir menú" }).click();
      await page.locator("#menu-movil").getByRole("link", { name: "Aviso de privacidad" }).click();
    } else {
      await encabezado.getByRole("link", { name: "Aviso de privacidad" }).click();
    }
    await expect(page).toHaveURL(/\/aviso-de-privacidad$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Aviso de privacidad integral");
  });
});
