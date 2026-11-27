import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ALUMNA, CONTRASENA, escenario, reiniciarSimulador } from "./utilidades/api";

const ETIQUETAS_WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const CURSO = "/modulos/etica-profesional/codigos-de-etica";

async function revisarAccesibilidad(pagina: Page) {
  await pagina.emulateMedia({ reducedMotion: "reduce" });
  const resultado = await new AxeBuilder({ page: pagina }).withTags(ETIQUETAS_WCAG).analyze();
  const resumen = resultado.violations.map((v) => ({ regla: v.id, impacto: v.impact, nodos: v.nodes.map((n) => n.target.join(" ")) }));
  expect(resumen, JSON.stringify(resumen, null, 2)).toEqual([]);
}

async function entrar(pagina: Page) {
  await pagina.goto("/iniciar-sesion");
  await pagina.getByLabel("Correo electrónico").fill(ALUMNA);
  await pagina.getByLabel("Contraseña", { exact: true }).fill(CONTRASENA);
  await pagina.getByRole("button", { name: /Iniciar sesión|Iniciando sesión/ }).click();
  await pagina.waitForURL("**/modulos");
}

const titulo1 = (pagina: Page) => pagina.getByRole("heading", { level: 1 });

test.describe("SCR-09 a SCR-16 y aviso de sesión", () => {
  test.describe.configure({ mode: "default" });
  test.beforeEach(async () => {
    await reiniciarSimulador();
  });

  test("SCR-09 · Lección: abre en la última sección vista y avanza a la siguiente", async ({ page }) => {
    await escenario("a-medias");
    await entrar(page);
    await page.goto(`${CURSO}/el-codigo-de-acm`);
    await expect(titulo1(page)).toHaveText("El código de ACM");
    await expect(page.getByText("Sección 1 de 2")).toBeVisible();
    await revisarAccesibilidad(page);
    await page.getByRole("link", { name: /^Siguiente:/ }).click();
    await expect(page.getByText("Sección 2 de 2")).toBeVisible();
    await expect(page.getByRole("button", { name: "Terminé la lección" })).toBeVisible();
  });

  test("SCR-10 · Actividad ya enviada se puede abrir desde la lección", async ({ page }) => {
    await escenario("a-medias");
    await entrar(page);
    await page.goto(`${CURSO}/que-es-un-codigo-de-etica`);
    await page.getByRole("link", { name: /actividad/i }).first().click();
    await page.waitForURL("**/actividades/**");
    await expect(titulo1(page)).toBeVisible();
    await revisarAccesibilidad(page);
  });

  test("SCR-11 · Examen en espera muestra los minutos y las lecciones a repasar", async ({ page }) => {
    await escenario("examen-en-espera");
    await entrar(page);
    await page.goto("/examenes/4");
    await expect(page.getByRole("heading", { name: /Podrás intentarlo de nuevo a las \d{2}:\d{2}/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Empezar examen" })).toHaveCount(0);
    await revisarAccesibilidad(page);
  });

  test("SCR-14 · Mi progreso", async ({ page }) => {
    await escenario("a-medias");
    await entrar(page);
    await page.goto("/mi-progreso");
    await expect(page).toHaveTitle("Mi progreso · Echo");
    await expect(titulo1(page)).toHaveText("Mi progreso");
    await expect(page.getByRole("heading", { name: "Insignias" })).toBeVisible();
    await revisarAccesibilidad(page);
  });

  test("SCR-15 · Mis resultados filtra y abre el detalle de un examen reprobado sin soluciones", async ({ page }) => {
    await escenario("examen-en-espera");
    await entrar(page);
    await page.goto("/mis-resultados");
    await revisarAccesibilidad(page);
    await page.getByLabel("Tipo").selectOption("examen");
    await page.getByRole("button", { name: "Aplicar" }).click();
    await page.waitForURL("**/mis-resultados?**tipo=examen**");
    await expect(page.getByRole("status")).toContainText("con estos filtros");
    await page.getByRole("link", { name: /Ver detalle|Examen/ }).first().click();
    await page.waitForURL(/\/mis-resultados\/[0-9a-f-]{36}$/);
    await expect(page.getByText("no mostramos las respuestas correctas")).toBeVisible();
    await expect(page.getByText("respuesta correcta", { exact: false })).toHaveCount(0);
    await revisarAccesibilidad(page);
  });

  test("SCR-15 · Sin intentos muestra el estado vacío", async ({ page }) => {
    await escenario("nuevo");
    await entrar(page);
    await page.goto("/mis-resultados");
    await expect(page.getByRole("heading", { name: "Todavía no tienes resultados" })).toBeVisible();
  });

  test("SCR-16 · Perfil: guarda el nombre y las preferencias, y pide confirmar para eliminar", async ({ page }) => {
    await entrar(page);
    await page.goto("/perfil");
    await revisarAccesibilidad(page);
    await page.getByLabel("Nombre", { exact: true }).fill("Alma Rosa");
    await page.getByRole("button", { name: "Guardar nombre" }).click();
    await expect(page.getByText("Guardamos tu nombre.")).toBeVisible();
    await page.getByLabel(/encuesta de satisfacción/).check();
    await page.getByRole("button", { name: "Guardar preferencias" }).click();
    await expect(page.getByText("Guardamos tus preferencias.")).toBeVisible();
    await page.getByRole("button", { name: "Eliminar mi cuenta" }).click();
    const dialogo = page.getByRole("dialog", { name: "¿Eliminar tu cuenta?" });
    await expect(dialogo).toBeVisible();
    await dialogo.getByRole("button", { name: "Sí, eliminar mi cuenta" }).click();
    await expect(dialogo.getByText("Marca esta casilla para continuar.")).toBeVisible();
    await dialogo.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialogo).toBeHidden();
  });

  test("Aviso de sesión: aparece antes de expirar y «Seguir conectado» lo cierra", async ({ page }) => {
    test.setTimeout(90_000);
    await escenario("sesion-por-expirar");
    await entrar(page);
    const aviso = page.getByRole("alertdialog", { name: "Tu sesión está por cerrarse" });
    await expect(aviso).toBeVisible({ timeout: 45_000 });
    await expect(aviso.getByRole("button", { name: "Seguir conectado" })).toBeFocused();
    await revisarAccesibilidad(page);
    await aviso.getByRole("button", { name: "Seguir conectado" }).click();
    await expect(aviso).toBeHidden();
  });
});
