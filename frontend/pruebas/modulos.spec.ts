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

/** Inicia sesión por la pantalla y espera a SCR-06. */
async function entrarAModulos(pagina: Page) {
  await pagina.goto("/iniciar-sesion");
  await pagina.getByLabel("Correo electrónico").fill(ALUMNA);
  await pagina.getByLabel("Contraseña", { exact: true }).fill(CONTRASENA);
  await pagina.getByRole("button", { name: /Iniciar sesión|Iniciando sesión/ }).click();
  await pagina.waitForURL("**/modulos");
}

const tarjeta = (pagina: Page, titulo: string) => pagina.getByRole("article", { name: titulo });
const titulo1 = (pagina: Page) => pagina.getByRole("heading", { level: 1 });

test.describe("SCR-06 · Módulos (inicio) y buscador", () => {
  // El simulador es uno solo: cada prueba lo reinicia y puede cambiar el escenario, así que van una tras otra.
  test.describe.configure({ mode: "default" });

  test.beforeEach(async () => {
    await reiniciarSimulador();
  });

  test("primer ingreso: bienvenida con Moris, 0 %, módulo 1 disponible y el resto bloqueado con su requisito", async ({ page }) => {
    await entrarAModulos(page);
    await expect(page).toHaveTitle("Módulos · Echo");
    // Next deja montada la pantalla anterior (Iniciar sesión) oculta con display: none: se cuentan solo las visibles.
    await expect(page.locator("h1:visible")).toHaveCount(1);
    await expect(titulo1(page)).toHaveText("Te damos la bienvenida, Alma");
    await expect(page.getByText("Empieza por el primer módulo. Cada paso abre el siguiente.")).toBeVisible();
    await expect(page.getByText("¡Hola! Soy Moris. ¡Qué alegría tenerte aquí! Vamos a explorar Echo juntos.")).toBeVisible();
    await expect(page.getByText("0 de 2 insignias obtenidas")).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Tu avance general" })).toHaveAttribute("aria-valuenow", "0");

    // El botón de la portada lleva a la primera lección y dice cuál es.
    await expect(page.getByRole("link", { name: "Empezar módulo 1" })).toHaveAttribute(
      "href",
      "/modulos/etica-profesional/codigos-de-etica/que-es-un-codigo-de-etica",
    );
    await expect(page.getByText("Lección 1 · ¿Qué es un código de ética?")).toBeVisible();

    const primero = tarjeta(page, "Ética profesional en TI");
    await expect(primero.getByText("Módulo 1")).toBeVisible();
    await expect(primero.getByText("Disponible")).toBeVisible();
    await expect(primero.getByText("Aún no empiezas este módulo")).toBeVisible();
    await expect(primero.getByRole("progressbar", { name: "Avance del módulo 1" })).toHaveAttribute("aria-valuenow", "0");
    await expect(primero.getByRole("link", { name: "Continuar módulo" })).toHaveAttribute("href", "/modulos/etica-profesional");

    const segundo = tarjeta(page, "Propiedad intelectual");
    await expect(segundo.getByText("Bloqueado")).toBeVisible();
    await expect(segundo.getByText("Completa el módulo 1 para desbloquearlo.")).toBeVisible();
    // Un módulo bloqueado no se abre: sin enlace ni botón.
    await expect(segundo.getByRole("link")).toHaveCount(0);

    await revisarAccesibilidad(page);
  });

  test("con avance: saluda con «Hola», retoma la lección donde se quedó y cuenta los cursos que faltan", async ({ page }) => {
    await escenario("a-medias");
    await entrarAModulos(page);
    await expect(titulo1(page)).toHaveText("Hola, Alma");
    await expect(page.getByText("Continúa donde te quedaste. Tu avance se guarda solo.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Continuar lección" })).toBeVisible();
    await expect(page.getByText("Lección 2 · El código de ACM, sección 1 de 2")).toBeVisible();

    const primero = tarjeta(page, "Ética profesional en TI");
    await expect(primero.getByText("En curso")).toBeVisible();
    await expect(primero.getByText("Te faltan 2 cursos para la insignia")).toBeVisible();
    await revisarAccesibilidad(page);
  });

  test("buscador: resultados, sin resultados, escribir actualiza la URL y «Limpiar búsqueda» vuelve a la lista", async ({ page }) => {
    await entrarAModulos(page);

    await page.goto("/modulos?q=privacidad");
    await expect(page.getByRole("heading", { level: 2, name: "1 resultado para «privacidad»" })).toBeVisible();
    await expect(page.getByText("Privacidad de datos")).toBeVisible();
    await expect(page.getByLabel("Buscar en Echo")).toHaveValue("privacidad");
    await revisarAccesibilidad(page);

    // La búsqueda no distingue acentos.
    await page.goto("/modulos?q=etica");
    await expect(page.getByRole("heading", { level: 2, name: /resultados? para «etica»/ })).toBeVisible();

    // Escribir busca solo, sin enviar el formulario.
    await page.goto("/modulos");
    await page.getByLabel("Buscar en Echo").fill("blockchain");
    await page.waitForURL(/\/modulos\?q=blockchain/);
    await expect(page.getByRole("heading", { level: 2, name: "No encontramos resultados para «blockchain»" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver todos los módulos" })).toHaveAttribute("href", "/modulos");
    await revisarAccesibilidad(page);

    await page.getByRole("button", { name: "Limpiar búsqueda" }).click();
    await page.waitForURL((url) => url.pathname === "/modulos" && url.search === "");
    await expect(page.getByRole("heading", { level: 2, name: "Tus módulos" })).toBeVisible();
    await expect(page.getByLabel("Buscar en Echo")).toHaveValue("");
    await expect(page.getByLabel("Buscar en Echo")).toBeFocused();
  });

  test("encabezado: Módulos marcado como página actual, Perfil con las iniciales y salto al contenido", async ({ page }) => {
    await entrarAModulos(page);
    const menu = page.getByRole("navigation", { name: "Principal" });
    await expect(menu.getByRole("link", { name: "Módulos" })).toHaveAttribute("aria-current", "page");
    await expect(menu.getByRole("link", { name: "Mi progreso" })).toHaveAttribute("href", "/mi-progreso");
    await expect(menu.getByRole("link", { name: "Mis resultados" })).toHaveAttribute("href", "/mis-resultados");
    await expect(page.getByRole("link", { name: /^Mi perfil, Alma/ })).toHaveAttribute("href", "/perfil");
    await expect(page.getByRole("link", { name: "Ayuda" }).first()).toHaveAttribute("href", "/ayuda");
    await expect(page.locator("main#contenido:visible")).toHaveCount(1);

    // La primera tabulación llega al enlace «Saltar al contenido» en la carga completa (tras navegar, el foco va al h1).
    await page.reload();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Saltar al contenido" })).toBeFocused();
  });

  test("DEC-80: desde 768 px el menú va arriba, sin barra inferior, y «Cerrar sesión» siempre está en el encabezado", async ({ page }) => {
    await entrarAModulos(page);
    await page.setViewportSize({ width: 800, height: 900 });
    await expect(page.getByRole("banner").getByRole("navigation", { name: "Principal" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Principal" }).filter({ visible: true })).toHaveCount(1);
    await expect(page.getByRole("banner").getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
    // El encabezado cabe sin desbordar la página.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(800);
    await page.setViewportSize({ width: 767, height: 900 });
    await expect(page.getByRole("banner").getByRole("navigation", { name: "Principal" })).toBeHidden();
    await expect(page.getByRole("banner").getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
  });
});
