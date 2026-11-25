import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ALUMNA, CONTRASENA, escenario, reiniciarSimulador } from "./utilidades/api";

const ETIQUETAS_WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function revisarAccesibilidad(pagina: Page) {
  await pagina.emulateMedia({ reducedMotion: "reduce" });
  const resultado = await new AxeBuilder({ page: pagina }).withTags(ETIQUETAS_WCAG).analyze();
  const resumen = resultado.violations.map((v) => ({ regla: v.id, impacto: v.impact, nodos: v.nodes.map((n) => n.target.join(" ")) }));
  expect(resumen, JSON.stringify(resumen, null, 2)).toEqual([]);
}

/** Inicia sesión por la pantalla y abre SCR-07 del módulo indicado. */
async function entrarYAbrir(pagina: Page, ruta: string) {
  await pagina.goto("/iniciar-sesion");
  await pagina.getByLabel("Correo electrónico").fill(ALUMNA);
  await pagina.getByLabel("Contraseña", { exact: true }).fill(CONTRASENA);
  await pagina.getByRole("button", { name: /Iniciar sesión|Iniciando sesión/ }).click();
  await pagina.waitForURL("**/modulos");
  await pagina.goto(ruta);
}

const tarjeta = (pagina: Page, titulo: string) => pagina.getByRole("article", { name: titulo });
const MODULO = "/modulos/etica-profesional";

test.describe("SCR-07 · Módulo", () => {
  // El simulador es uno solo: cada prueba lo reinicia y puede cambiar el escenario, así que van una tras otra.
  test.describe.configure({ mode: "default" });

  test.beforeEach(async () => {
    await reiniciarSimulador();
  });

  test("módulo nuevo: portada con «Módulo 1 de 2», curso 1 disponible y curso 2 bloqueado con su requisito", async ({ page }) => {
    await entrarYAbrir(page, MODULO);
    await expect(page).toHaveTitle("Módulo · Echo");

    const migas = page.getByRole("navigation", { name: "Ruta de navegación" });
    await expect(migas.getByRole("link", { name: "Módulos" })).toHaveAttribute("href", "/modulos");
    await expect(migas.getByText("Ética profesional en TI")).toHaveAttribute("aria-current", "page");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ética profesional en TI");
    await expect(page.getByText("Módulo 1 de 2")).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Avance del módulo 1" })).toHaveAttribute("aria-valuenow", "0");
    await expect(page.getByText("Pendiente: te faltan 2 cursos")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Cursos" })).toBeVisible();
    await expect(page.getByText("Aprueba el examen de cada curso para abrir el siguiente.")).toBeVisible();

    const primero = tarjeta(page, "Códigos de ética");
    await expect(primero.getByText("Curso 1 de 2")).toBeVisible();
    await expect(primero.getByText("Disponible")).toBeVisible();
    await expect(primero.getByText("Aún no empiezas este curso")).toBeVisible();
    await expect(primero.getByRole("link", { name: "Empezar curso" })).toHaveAttribute("href", "/modulos/etica-profesional/codigos-de-etica");

    const segundo = tarjeta(page, "Privacidad de datos");
    await expect(segundo.getByText("Bloqueado")).toBeVisible();
    await expect(segundo.getByText("Aprueba el examen del curso 1 para desbloquearlo.")).toBeVisible();
    // Un curso bloqueado no se abre: sin enlace ni botón.
    await expect(segundo.getByRole("link")).toHaveCount(0);

    await revisarAccesibilidad(page);
  });

  test("con avance: el curso en curso muestra su lección actual y el botón «Continuar curso»", async ({ page }) => {
    await escenario("a-medias");
    await entrarYAbrir(page, MODULO);
    await expect(page.getByText("Módulo 1 de 2")).toBeVisible();

    const primero = tarjeta(page, "Códigos de ética");
    await expect(primero.getByText("En curso")).toBeVisible();
    await expect(primero.getByText("Lección 2 de 2 · El código de ACM")).toBeVisible();
    await expect(primero.getByRole("link", { name: "Continuar curso" })).toHaveAttribute("href", "/modulos/etica-profesional/codigos-de-etica");
    await expect(tarjeta(page, "Privacidad de datos").getByText("Bloqueado")).toBeVisible();
    await revisarAccesibilidad(page);
  });

  test("curso completado: «Examen aprobado con …», «Repasar curso» y el siguiente curso abierto", async ({ page }) => {
    await escenario("curso-completo");
    await entrarYAbrir(page, MODULO);

    const primero = tarjeta(page, "Códigos de ética");
    await expect(primero.getByText("Completado")).toBeVisible();
    await expect(primero.getByText("Examen aprobado con 100 %")).toBeVisible();
    await expect(primero.getByRole("progressbar", { name: "Avance del curso 1" })).toHaveAttribute("aria-valuenow", "100");
    await expect(primero.getByRole("link", { name: "Repasar curso" })).toBeVisible();

    const segundo = tarjeta(page, "Privacidad de datos");
    await expect(segundo.getByText("Disponible")).toBeVisible();
    await expect(segundo.getByRole("link", { name: "Empezar curso" })).toHaveAttribute("href", "/modulos/etica-profesional/privacidad-de-datos");
    await expect(page.getByText("Pendiente: te falta 1 curso")).toBeVisible();
    await revisarAccesibilidad(page);
  });

  test("un módulo bloqueado avisa y regresa a Módulos; uno que no existe da la página 404", async ({ page }) => {
    await entrarYAbrir(page, "/modulos/propiedad-intelectual");
    await expect(page.getByRole("alert").filter({ hasText: "No pudimos abrir este módulo" })).toBeVisible();
    await expect(page.getByText("Todavía no se abre. Termina lo anterior para continuar.")).toBeVisible();
    await page.getByRole("link", { name: "Volver a Módulos" }).click();
    await page.waitForURL("**/modulos");
    await expect(page.getByRole("heading", { level: 2, name: "Tus módulos" })).toBeVisible();

    await page.goto("/modulos/no-existe");
    await expect(page.getByRole("heading", { level: 1, name: "No encontramos esta página." })).toBeVisible();
  });

  test("desde SCR-06: la tarjeta del módulo abre SCR-07 y las migas regresan", async ({ page }) => {
    await entrarYAbrir(page, "/modulos");
    await tarjeta(page, "Ética profesional en TI").getByRole("link", { name: "Continuar módulo" }).click();
    await page.waitForURL("**/modulos/etica-profesional");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ética profesional en TI");
    await page.getByRole("navigation", { name: "Ruta de navegación" }).getByRole("link", { name: "Módulos" }).click();
    await page.waitForURL((url) => url.pathname === "/modulos");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Te damos la bienvenida, Alma");
  });
});
