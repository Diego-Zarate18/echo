import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ALUMNA, Alumno, CONTRASENA, correos, escenario, reiniciarSimulador } from "./utilidades/api";

const ETIQUETAS_WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const PENDIENTE = "pendiente@example.com";
const TEXTO_DEC_77 = "El correo o la contraseña no son correctos. Tras 5 intentos fallidos, el acceso se pausa 15 minutos.";
const TEXTO_EXPIRADA = "Tu sesión terminó por inactividad. Inicia sesión de nuevo.";

async function revisarAccesibilidad(pagina: Page) {
  await pagina.emulateMedia({ reducedMotion: "reduce" });
  const resultado = await new AxeBuilder({ page: pagina }).withTags(ETIQUETAS_WCAG).analyze();
  const resumen = resultado.violations.map((v) => ({ regla: v.id, impacto: v.impact, nodos: v.nodes.map((n) => n.target.join(" ")) }));
  expect(resumen, JSON.stringify(resumen, null, 2)).toEqual([]);
}

const campoCorreo = (pagina: Page) => pagina.getByLabel("Correo electrónico");
const campoContrasena = (pagina: Page) => pagina.getByLabel("Contraseña", { exact: true });
const botonEntrar = (pagina: Page) => pagina.getByRole("button", { name: /Iniciar sesión|Iniciando sesión/ });
const recuadro = (pagina: Page) => pagina.locator("#respuesta");

/** Llena y envía. */
async function entrar(pagina: Page, correo: string, contrasena: string) {
  await campoCorreo(pagina).fill(correo);
  await campoContrasena(pagina).fill(contrasena);
  await botonEntrar(pagina).click();
}

/** Intento fallido: espera la respuesta de `POST /api/sesion` y devuelve el texto del recuadro. */
async function intentoFallido(pagina: Page, correo: string, contrasena: string) {
  const respuesta = pagina.waitForResponse((r) => r.url().endsWith("/api/sesion") && r.request().method() === "POST");
  await entrar(pagina, correo, contrasena);
  expect((await respuesta).ok()).toBe(false);
  await expect(recuadro(pagina)).toBeVisible();
  await expect(botonEntrar(pagina)).not.toHaveAttribute("aria-disabled", "true");
  return (await recuadro(pagina).innerText()).replace(/\s+/g, " ").trim();
}

const parametro = (pagina: Page, nombre: string) => new URL(pagina.url()).searchParams.get(nombre);

test.describe("SCR-01 · Iniciar sesión y sesión del frontend", () => {
  // Un solo simulador para todos: estas pruebas lo reinician y cambian escenarios, así que van una tras otra.
  test.describe.configure({ mode: "default" });

  test.beforeEach(async () => {
    await reiniciarSimulador();
  });

  test("la página es estática y el formulario viene en el HTML, con los atributos de cada campo", async ({ page, request }) => {
    const html = await (await request.get("/iniciar-sesion")).text();
    // React escribe `autoComplete`; en HTML los atributos no distinguen mayúsculas.
    expect(html).toMatch(/autocomplete="current-password"/i);
    expect(html).toContain('type="email"');

    await page.goto("/iniciar-sesion");
    await expect(page).toHaveTitle("Iniciar sesión · Echo");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Iniciar sesión");
    await expect(campoCorreo(page)).toHaveAttribute("type", "email");
    await expect(campoCorreo(page)).toHaveAttribute("inputmode", "email");
    await expect(campoCorreo(page)).toHaveAttribute("autocomplete", "email");
    await expect(campoContrasena(page)).toHaveAttribute("autocomplete", "current-password");
    await expect(page.getByRole("link", { name: "Continuar con Google" })).toHaveAttribute("href", "/api/auth/google");
    await expect(page.getByRole("link", { name: "¿Olvidaste tu contraseña?" })).toHaveAttribute("href", "/recuperar-contrasena");
    await expect(page.getByRole("link", { name: "Crear cuenta" })).toHaveAttribute("href", "/registro");
    // El pie lleva los dos documentos (grafo › SCR-01 › comunes), aunque Figma solo dibuje el aviso.
    const pie = page.getByRole("contentinfo");
    await expect(pie.getByRole("link", { name: "Aviso de privacidad" })).toHaveAttribute("href", "/aviso-de-privacidad");
    await expect(pie.getByRole("link", { name: "Términos y condiciones" })).toHaveAttribute("href", "/terminos-y-condiciones");
  });

  test("inicio correcto: lleva a /modulos con el nombre, y «Cerrar sesión» regresa a Iniciar sesión", async ({ page }) => {
    await page.goto("/iniciar-sesion");
    await entrar(page, ` ${ALUMNA.toUpperCase()} `, CONTRASENA);
    await page.waitForURL("**/modulos");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hola, Alma");
    await expect(page.locator("main[data-provisional]")).toHaveCount(1);

    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await page.waitForURL(/\/iniciar-sesion/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Iniciar sesión");
    // Sin la cookie, /modulos ya no abre.
    await page.goto("/modulos");
    await page.waitForURL(/\/iniciar-sesion/);
  });

  test("DEC-77: el mismo texto para correo inexistente, contraseña equivocada y la cuenta en pausa, sin hora", async ({ page }) => {
    await page.goto("/iniciar-sesion");
    const inexistente = await intentoFallido(page, "nadie@example.com", CONTRASENA);
    expect(inexistente).toBe(`No pudimos iniciar tu sesión ${TEXTO_DEC_77}`);
    await expect(recuadro(page)).toHaveAttribute("role", "alert");

    // Cinco contraseñas equivocadas pausan la cuenta; el sexto intento, ya con la correcta, dice lo mismo.
    for (let intento = 1; intento <= 5; intento++) {
      expect(await intentoFallido(page, ALUMNA, `Equivocada${intento}`), `intento ${intento}`).toBe(inexistente);
    }
    const enPausa = await intentoFallido(page, ALUMNA, CONTRASENA);
    expect(enPausa).toBe(inexistente);
    expect(enPausa).not.toMatch(/\d{1,2}:\d{2}/);
    await expect(page.getByText(/en pausa/i)).toHaveCount(0);
    expect(page.url()).toMatch(/\/iniciar-sesion/);
  });

  test("correo sin verificar: solo con la contraseña correcta, y «Reenviar enlace» envía el correo", async ({ page }) => {
    await page.goto("/iniciar-sesion");
    expect(await intentoFallido(page, PENDIENTE, "Equivocada1")).toContain(TEXTO_DEC_77);
    await expect(page.getByText("Aún no verificas tu correo")).toHaveCount(0);

    await entrar(page, PENDIENTE, CONTRASENA);
    const aviso = page.getByRole("status").filter({ hasText: "Aún no verificas tu correo" });
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText("Te podemos enviar un enlace nuevo.");
    await expect(recuadro(page)).toBeFocused();

    const antes = (await correos()).filter((c) => c.para === PENDIENTE && c.tipo === "verificacion").length;
    await aviso.getByRole("button", { name: "Reenviar enlace" }).click();
    await page.waitForURL("**/verificar-correo");
    expect((await correos()).filter((c) => c.para === PENDIENTE && c.tipo === "verificacion").length).toBe(antes + 1);
  });

  test("protección de rutas: sin cookie a Iniciar sesión con volver; con cookie, / e /iniciar-sesion van a /modulos", async ({ page }) => {
    await page.goto("/modulos");
    await page.waitForURL(/\/iniciar-sesion/);
    expect(parametro(page, "volver")).toBe("/modulos");

    await entrar(page, ALUMNA, CONTRASENA);
    await page.waitForURL("**/modulos");
    await page.goto("/");
    await page.waitForURL("**/modulos");
    await page.goto("/iniciar-sesion");
    await page.waitForURL("**/modulos");
  });

  test("volver: lleva a una ruta interna y se ignora si apunta afuera (redirección abierta)", async ({ page }) => {
    for (const ajeno of ["//evil.example", "https://evil.example/modulos", "/\\evil.example", "javascript:alert(1)"]) {
      await page.context().clearCookies();
      await page.goto(`/iniciar-sesion?volver=${encodeURIComponent(ajeno)}`);
      await entrar(page, ALUMNA, CONTRASENA);
      await page.waitForURL("**/modulos");
      expect(new URL(page.url()).origin, ajeno).toBe("http://localhost:3100");
    }
    await page.context().clearCookies();
    await page.goto(`/iniciar-sesion?volver=${encodeURIComponent("/mi-progreso?vista=1")}`);
    await entrar(page, ALUMNA, CONTRASENA);
    await page.waitForURL("**/mi-progreso?vista=1");
  });

  test("sesión vencida: el layout lleva a Iniciar sesión con el aviso de inactividad y la ruta a la que volver", async ({ page }) => {
    await page.goto("/iniciar-sesion");
    await entrar(page, ALUMNA, CONTRASENA);
    await page.waitForURL("**/modulos");

    // Desde otro navegador se cierran todas las sesiones: la cookie sigue en este, pero ya no vale.
    const otro = await (await Alumno.nuevo()).entrar();
    expect((await otro.pedir("DELETE", "/api/sesiones")).status()).toBe(204);
    await otro.cerrar();

    await page.goto("/modulos?pestana=2");
    await page.waitForURL(/motivo=expirada/);
    expect(parametro(page, "volver")).toBe("/modulos?pestana=2");
    const aviso = page.getByRole("status").filter({ hasText: TEXTO_EXPIRADA });
    await expect(aviso).toBeVisible();
    await revisarAccesibilidad(page);

    // Al entrar de nuevo, regresa a donde estaba.
    await entrar(page, ALUMNA, CONTRASENA);
    await page.waitForURL("**/modulos?pestana=2");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hola, Alma");
  });

  test("aceptación pendiente (INV-30): el formulario y el layout llevan a /aceptar", async ({ page }) => {
    await page.goto("/iniciar-sesion");
    await entrar(page, ALUMNA, CONTRASENA);
    await page.waitForURL("**/modulos");

    await escenario("version-nueva");
    await page.goto("/modulos");
    await page.waitForURL("**/aceptar");

    await page.context().clearCookies();
    await page.goto("/iniciar-sesion");
    await entrar(page, ALUMNA, CONTRASENA);
    await page.waitForURL("**/aceptar");
  });

  test("?error=google muestra un error claro de Google", async ({ page }) => {
    await page.goto("/iniciar-sesion?error=google");
    // El anunciador de rutas de Next también es `role="alert"`: se busca el recuadro por su título.
    const error = page.getByRole("alert").filter({ hasText: "No pudimos iniciar tu sesión" });
    await expect(error).toContainText("No pudimos entrar con tu cuenta de Google.");
    await expect(error).toContainText("entra con tu correo y contraseña");
  });

  test("validación del cliente al salir del campo, ligada con aria-describedby, y resumen al enviar", async ({ page }) => {
    await page.goto("/iniciar-sesion");
    await campoCorreo(page).fill("alma@");
    await campoContrasena(page).focus();
    await expect(campoCorreo(page)).toHaveAttribute("aria-invalid", "true");
    await expect(campoCorreo(page)).toHaveAccessibleDescription("Escribe un correo válido, por ejemplo nombre@dominio.com.");
    // Se quita en cuanto queda bien.
    await campoCorreo(page).fill(ALUMNA);
    await expect(campoCorreo(page)).not.toHaveAttribute("aria-invalid");

    // Enviar vacío no llama a la API: muestra el resumen, que recibe el foco y enlaza a cada campo.
    await campoCorreo(page).fill("");
    await botonEntrar(page).click();
    await expect(recuadro(page)).toBeFocused();
    await expect(recuadro(page)).toContainText("Revisa 2 campos");
    await recuadro(page).getByRole("link", { name: /Contraseña/ }).click();
    await expect(campoContrasena(page)).toBeFocused();
    await expect(campoContrasena(page)).toHaveAccessibleDescription("Completa este campo.");
  });

  test("mostrar la contraseña: botón con nombre, aria-pressed y de al menos 24 px", async ({ page }) => {
    await page.goto("/iniciar-sesion");
    const mostrar = page.getByRole("button", { name: "Mostrar contraseña" });
    await expect(mostrar).toHaveAttribute("aria-pressed", "false");
    await campoContrasena(page).fill("Secreta2026");
    await mostrar.click();
    await expect(mostrar).toHaveAttribute("aria-pressed", "true");
    await expect(campoContrasena(page)).toHaveAttribute("type", "text");
    await mostrar.click();
    await expect(campoContrasena(page)).toHaveAttribute("type", "password");
    const caja = await mostrar.boundingBox();
    expect(caja!.width).toBeGreaterThanOrEqual(24);
    expect(caja!.height).toBeGreaterThanOrEqual(24);
  });

  test("accesibilidad: axe sin violaciones, sin error y con error; el foco va al error", async ({ page }) => {
    await page.goto("/iniciar-sesion");
    await revisarAccesibilidad(page);
    await intentoFallido(page, "nadie@example.com", "Equivocada1");
    await expect(recuadro(page)).toBeFocused();
    await revisarAccesibilidad(page);
    await entrar(page, PENDIENTE, CONTRASENA);
    await expect(page.getByRole("status").filter({ hasText: "Aún no verificas tu correo" })).toBeVisible();
    await revisarAccesibilidad(page);
  });

  test("funciona completa solo con teclado", async ({ page }) => {
    await page.goto("/iniciar-sesion");
    const enfocado = () => page.evaluate(() => document.activeElement?.id ?? "");
    for (let i = 0; i < 20 && (await enfocado()) !== "inicio-correo"; i++) await page.keyboard.press("Tab");
    expect(await enfocado()).toBe("inicio-correo");
    await page.keyboard.type(ALUMNA);
    await page.keyboard.press("Tab");
    expect(await enfocado()).toBe("inicio-contrasena");
    await page.keyboard.type(CONTRASENA);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Mostrar contraseña" })).toBeFocused();
    await page.keyboard.press("Space");
    await expect(page.getByRole("button", { name: "Mostrar contraseña" })).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Mostrar contraseña" })).toHaveAttribute("aria-pressed", "false");
    // Enter dentro de un campo envía el formulario.
    await page.keyboard.press("Shift+Tab");
    expect(await enfocado()).toBe("inicio-contrasena");
    await page.keyboard.press("Enter");
    await page.waitForURL("**/modulos");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hola, Alma");
  });
});
