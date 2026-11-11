import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ALUMNA, CONTRASENA, aceptaciones, control, correos, escenario, reiniciarSimulador } from "./utilidades/api";

const ETIQUETAS_WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const NUEVA = "dana.nueva@example.com";
const GOOGLE = "google.alumna@example.com";
const OBLIGATORIAS = [
  "Confirmo que tengo 18 años o más.",
  "He leído y acepto el Aviso de privacidad.",
  "He leído y acepto los Términos y condiciones.",
];

async function revisarAccesibilidad(pagina: Page) {
  await pagina.emulateMedia({ reducedMotion: "reduce" });
  const resultado = await new AxeBuilder({ page: pagina }).withTags(ETIQUETAS_WCAG).analyze();
  const resumen = resultado.violations.map((v) => ({ regla: v.id, impacto: v.impact, nodos: v.nodes.map((n) => n.target.join(" ")) }));
  expect(resumen, JSON.stringify(resumen, null, 2)).toEqual([]);
}

const titulo = (pagina: Page) => pagina.getByRole("heading", { level: 1 });
const parametro = (pagina: Page, nombre: string) => new URL(pagina.url()).searchParams.get(nombre);

async function llenarRegistro(pagina: Page, correo: string, { casillas = OBLIGATORIAS } = {}) {
  await pagina.getByLabel("Nombre(s)").fill("Dana");
  await pagina.getByLabel("Apellido(s)").fill("Prueba Nueva");
  await pagina.getByLabel("Correo electrónico").fill(correo);
  await pagina.getByLabel("Contraseña", { exact: true }).fill("Segura2026");
  for (const texto of casillas) await pagina.getByLabel(texto).check();
}

const botonCrear = (pagina: Page) => pagina.getByRole("button", { name: /^(Crear cuenta|Creando tu cuenta…)$/ });

/** El último enlace que el simulador «envió» a un correo. */
async function enlaceDe(correo: string, tipo = "verificacion") {
  const enviados = (await correos()) as { para: string; tipo: string; enlace?: string | null }[];
  return enviados.filter((c) => c.para === correo && c.tipo === tipo).pop()?.enlace ?? null;
}

async function entrar(pagina: Page, correo = ALUMNA) {
  await pagina.goto("/iniciar-sesion");
  await pagina.getByLabel("Correo electrónico").fill(correo);
  await pagina.getByLabel("Contraseña", { exact: true }).fill(CONTRASENA);
  await pagina.getByRole("button", { name: "Iniciar sesión" }).click();
}

test.describe("SCR-02, SCR-03 y SCR-19 · Crear cuenta, verificar correo y aceptación", () => {
  // Un solo simulador para todos: estas pruebas lo reinician y cambian escenarios, así que van una tras otra.
  test.describe.configure({ mode: "default" });

  test.beforeEach(async () => {
    await reiniciarSimulador();
  });

  test("Crear cuenta: estática, con el aviso simplificado y las cinco casillas sin marcar en dos grupos", async ({ page, request }) => {
    const html = await (await request.get("/crear-cuenta")).text();
    expect(html).toContain("Aviso de privacidad simplificado");
    await page.goto("/crear-cuenta");
    await expect(page).toHaveTitle("Crear cuenta · Echo");
    await expect(titulo(page)).toHaveText("Crear cuenta");
    await expect(page.getByRole("group", { name: "Opcionales" }).getByRole("checkbox")).toHaveCount(2);
    await expect(page.getByRole("group", { name: "Obligatorias" }).getByRole("checkbox")).toHaveCount(3);
    for (const casilla of await page.getByRole("checkbox").all()) await expect(casilla).not.toBeChecked();
    await expect(page.getByLabel("Contraseña", { exact: true })).toHaveAttribute("autocomplete", "new-password");
    await expect(page.getByRole("link", { name: "Leer el Aviso de privacidad integral" })).toHaveAttribute("href", "/aviso-de-privacidad");
    await expect(page.getByRole("link", { name: "Inicia sesión" })).toHaveAttribute("href", "/iniciar-sesion");
    // Requisitos de la contraseña en vivo, con texto y no solo color.
    await page.getByLabel("Contraseña", { exact: true }).fill("abcdefgh");
    await expect(page.locator("#registro-requisitos li")).toHaveText(["8 caracteres o más: cumplido", "Al menos una letra: cumplido", "Al menos un número: pendiente"]);
  });

  test("registro correcto: «Revisa tu correo» sin el correo en la URL; guarda negativas, aceptaciones y envía el enlace", async ({ page }) => {
    await page.goto("/crear-cuenta");
    await llenarRegistro(page, NUEVA, { casillas: [...OBLIGATORIAS, "No deseo que mis datos se usen para invitarme a la encuesta de satisfacción."] });
    await botonCrear(page).click();
    await page.waitForURL("**/verificar-correo");
    expect(page.url()).not.toContain("example.com");
    await expect(titulo(page)).toHaveText("Revisa tu correo");
    await expect(page.getByRole("main")).toContainText(`Te enviamos un mensaje a ${NUEVA}.`);

    const suyas = (await aceptaciones()).filter((a) => a.usuario === NUEVA);
    expect(suyas.map((a) => `${a.documento} ${a.version}`).sort()).toEqual(["avisoPrivacidad 1.0", "terminos 1.0"]);
    const enlace = await enlaceDe(NUEVA);
    expect(enlace).toMatch(/^\/verificar-correo\?codigo=/);

    // «Reenviar enlace» no vuelve a pedir el correo y responde siempre lo mismo (DEC-77).
    await page.getByRole("button", { name: "Reenviar enlace" }).click();
    await expect(page.getByRole("status").filter({ hasText: "te enviamos un enlace nuevo" })).toBeVisible();

    // Al verificar, la cuenta queda activa con la negativa a la encuesta que marcó.
    await page.goto(enlace!);
    await expect(titulo(page)).toHaveText("Tu correo está verificado");
    const exportacion = await (await page.request.get("/api/perfil/exportacion")).json();
    expect(exportacion.preferencias).toEqual({ negativaEncuesta: true, negativaEstadisticas: false });
  });

  test("DEC-77: con un correo ya registrado, la misma pantalla y ninguna aceptación nueva", async ({ page }) => {
    const antes = (await aceptaciones()).length;
    await page.goto("/crear-cuenta");
    await llenarRegistro(page, ALUMNA);
    await botonCrear(page).click();
    await page.waitForURL("**/verificar-correo");
    await expect(titulo(page)).toHaveText("Revisa tu correo");
    expect((await aceptaciones()).length).toBe(antes);
    expect(await enlaceDe(ALUMNA)).toBeNull();
  });

  test("sin casilla obligatoria: no llama a la API, el error queda junto a la casilla y el foco va al resumen", async ({ page }) => {
    let llamadas = 0;
    page.on("request", (r) => {
      if (r.url().endsWith("/api/cuenta/registro")) llamadas++;
    });
    await page.goto("/crear-cuenta");
    await llenarRegistro(page, NUEVA, { casillas: ["He leído y acepto el Aviso de privacidad."] });
    await botonCrear(page).click();
    const resumen = page.locator("#respuesta");
    await expect(resumen).toBeFocused();
    await expect(resumen).toContainText("Revisa 2 campos");
    const edad = page.getByLabel("Confirmo que tengo 18 años o más.");
    await expect(edad).toHaveAttribute("aria-invalid", "true");
    await expect(edad).toHaveAccessibleDescription("Marca esta casilla para continuar.");
    await resumen.getByRole("link", { name: /Términos y condiciones/ }).click();
    await expect(page.getByLabel("He leído y acepto los Términos y condiciones.")).toBeFocused();
    expect(llamadas).toBe(0);
    await revisarAccesibilidad(page);
  });

  test("apellido vacío y contraseña débil: su error junto al campo, como en Figma 67:380", async ({ page }) => {
    await page.goto("/crear-cuenta");
    await llenarRegistro(page, NUEVA);
    await page.getByLabel("Apellido(s)").fill("");
    await page.getByLabel("Contraseña", { exact: true }).fill("sinnumero");
    await botonCrear(page).click();
    await expect(page.getByLabel("Apellido(s)")).toHaveAccessibleDescription(/Escribe al menos tu primer apellido\./);
    await expect(page.getByLabel("Contraseña", { exact: true })).toHaveAccessibleDescription(/^Agrega al menos un número\./);
  });

  test("verificación: el enlace verifica, el código sale de la URL; usado y vencido muestran su estado", async ({ page }) => {
    await page.goto("/crear-cuenta");
    await llenarRegistro(page, NUEVA);
    await botonCrear(page).click();
    await page.waitForURL("**/verificar-correo");
    const enlace = (await enlaceDe(NUEVA))!;

    await page.goto(enlace);
    await expect(titulo(page)).toHaveText("Tu correo está verificado");
    expect(new URL(page.url()).search).toBe("");
    await expect(page.getByRole("link", { name: "Ir a Módulos" })).toHaveAttribute("href", "/modulos");

    await page.context().clearCookies();
    await page.goto(enlace);
    await expect(titulo(page)).toHaveText("Este enlace ya se usó");
    expect(new URL(page.url()).search).toBe("");

    await page.goto("/verificar-correo?codigo=codigo-que-no-existe");
    await expect(titulo(page)).toHaveText("Este enlace ya venció");
    await page.getByLabel("Correo electrónico").fill(NUEVA);
    await page.getByRole("button", { name: "Enviar enlace nuevo" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Si hay una cuenta pendiente con ese correo" })).toBeVisible();
    await revisarAccesibilidad(page);
  });

  test("Google: /aceptar dice con qué cuenta, crea la cuenta con las casillas y entra a /modulos", async ({ page }) => {
    await page.goto("/api/auth/google");
    await page.waitForURL("**/aceptar");
    await expect(titulo(page)).toHaveText("Termina de crear tu cuenta");
    await expect(page.getByRole("main")).toContainText(`Entraste con Google como ${GOOGLE}.`);
    await revisarAccesibilidad(page);

    // Sin las obligatorias: el error de Figma 152:5146 y cada casilla marcada en error.
    await page.getByRole("button", { name: "Crear mi cuenta" }).click();
    await expect(page.locator("#respuesta")).toBeFocused();
    await expect(page.locator("#respuesta")).toContainText("Faltan casillas obligatorias");
    await expect(page.getByLabel("He leído y acepto el Aviso de privacidad.")).toHaveAttribute("aria-invalid", "true");
    await revisarAccesibilidad(page);

    for (const texto of OBLIGATORIAS) await page.getByLabel(texto).check();
    await page.getByRole("button", { name: "Crear mi cuenta" }).click();
    await page.waitForURL("**/modulos");
    await expect(titulo(page)).toHaveText("Hola, Gala");
    expect((await aceptaciones()).filter((a) => a.usuario === GOOGLE).map((a) => a.documento).sort()).toEqual(["avisoPrivacidad", "terminos"]);
  });

  test("Google: con la cookie temporal vencida sale «Pasaron más de 10 minutos» (152:5266)", async ({ page }) => {
    await control("POST", "/__simulador/google", { vigenciaMs: 0 });
    await page.goto("/api/auth/google");
    await page.waitForURL("**/aceptar");
    await expect(page.getByRole("status").filter({ hasText: "Pasaron más de 10 minutos" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Continuar con Google" })).toHaveAttribute("href", "/api/auth/google");
    await revisarAccesibilidad(page);
  });

  test("versión nueva: /modulos lleva a /aceptar, el Perfil pasa y al aceptar se entra a /modulos", async ({ page }) => {
    await entrar(page);
    await page.waitForURL("**/modulos");
    await escenario("version-nueva");

    await page.goto("/modulos");
    await page.waitForURL("**/aceptar");
    await expect(titulo(page)).toHaveText("Actualizamos el Aviso de privacidad");
    await expect(page.getByRole("main")).toContainText("Ejemplo: se agrega una finalidad nueva.");
    await expect(page.getByRole("link", { name: "Leer Aviso de privacidad 1.1" })).toHaveAttribute("href", "/aviso-de-privacidad");
    await revisarAccesibilidad(page);

    // El Perfil es la única pantalla con sesión permitida (INV-30): no se redirige a /aceptar. La pantalla aún no existe.
    await page.goto("/perfil");
    await expect(page).toHaveURL(/\/perfil$/);
    await expect(titulo(page)).toHaveText("No encontramos esta página.");

    await page.goto("/aceptar");
    await page.getByRole("button", { name: "Aceptar y continuar" }).click();
    await expect(page.locator("#respuesta")).toBeFocused();
    await page.getByLabel("He leído y acepto el Aviso de privacidad (versión 1.1).").check();
    await page.getByRole("button", { name: "Aceptar y continuar" }).click();
    await page.waitForURL("**/modulos");
    await expect(titulo(page)).toHaveText("Hola, Alma");
    expect((await aceptaciones()).some((a) => a.usuario === ALUMNA && a.version === "1.1")).toBe(true);
  });

  test("ciclos: sin cookie /aceptar va a Iniciar sesión; con sesión y sin pendiente, a /modulos", async ({ page }) => {
    await page.goto("/aceptar");
    await page.waitForURL(/\/iniciar-sesion/);
    expect(parametro(page, "volver")).toBeNull();

    await entrar(page);
    await page.waitForURL("**/modulos");
    await page.goto("/aceptar");
    await page.waitForURL("**/modulos");

    // Con pendiente, /aceptar se queda en /aceptar (no se redirige a sí mismo).
    await escenario("version-nueva");
    const respuesta = await page.goto("/aceptar");
    expect(respuesta?.status()).toBe(200);
    await expect(titulo(page)).toHaveText("Actualizamos el Aviso de privacidad");
    expect(new URL(page.url()).pathname).toBe("/aceptar");
  });

  test("casillas: de al menos 24 px y se marcan con espacio desde el teclado", async ({ page }) => {
    await page.goto("/crear-cuenta");
    const casilla = page.getByLabel("Confirmo que tengo 18 años o más.");
    const caja = await casilla.boundingBox();
    expect(caja!.width).toBeGreaterThanOrEqual(24);
    expect(caja!.height).toBeGreaterThanOrEqual(24);
    await casilla.focus();
    await page.keyboard.press("Space");
    await expect(casilla).toBeChecked();
    await page.keyboard.press("Space");
    await expect(casilla).not.toBeChecked();
    await revisarAccesibilidad(page);
  });
});

test.describe("SCR-04 · Recuperar y restablecer contraseña", () => {
  test.describe.configure({ mode: "default" });

  test.beforeEach(async () => {
    await reiniciarSimulador();
  });

  const NUEVA_CONTRASENA = "Renovada2026";
  const TEXTO_DEC_77 =
    "Si hay una cuenta con contraseña para ese correo, te enviamos un enlace que vence en 30 minutos. Si entras con Google, no necesitas contraseña.";

  async function pedirEnlace(pagina: Page, correo: string) {
    await pagina.goto("/recuperar-contrasena");
    await pagina.getByLabel("Correo electrónico").fill(correo);
    await pagina.getByRole("button", { name: "Enviar enlace" }).click();
    await expect(titulo(pagina)).toHaveText("Revisa tu correo");
  }

  async function guardar(pagina: Page, contrasena: string) {
    await pagina.getByLabel("Contraseña nueva", { exact: true }).fill(contrasena);
    await pagina.getByRole("button", { name: "Guardar contraseña" }).click();
  }

  test("flujo completo: «¿Olvidaste tu contraseña?», correo, contraseña nueva e iniciar sesión con ella", async ({ page }) => {
    await page.goto("/iniciar-sesion");
    await page.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).click();
    await page.waitForURL("**/recuperar-contrasena");
    await expect(titulo(page)).toHaveText("Recupera tu contraseña");
    await revisarAccesibilidad(page);

    await pedirEnlace(page, ` ${ALUMNA.toUpperCase()} `);
    expect(page.url()).not.toContain("example.com");
    await expect(page.getByRole("status").filter({ hasText: "Solicitud enviada" })).toContainText(TEXTO_DEC_77);
    await expect(titulo(page)).toBeFocused();
    await revisarAccesibilidad(page);

    const enlace = await enlaceDe(ALUMNA, "recuperacion");
    expect(enlace).toMatch(/^\/recuperar-contrasena\/nueva\?codigo=/);
    await page.goto(enlace!);
    await expect(titulo(page)).toHaveText("Crea una contraseña nueva");
    await expect.poll(() => new URL(page.url()).search).toBe("");
    await revisarAccesibilidad(page);

    // Los mismos requisitos de Crear cuenta: sin número no se guarda.
    await guardar(page, "sinnumero");
    await expect(page.getByLabel("Contraseña nueva", { exact: true })).toHaveAccessibleDescription(/^Agrega al menos un número\./);

    await guardar(page, NUEVA_CONTRASENA);
    await expect(titulo(page)).toHaveText("Listo, tu contraseña cambió");
    await expect(titulo(page)).toBeFocused();
    await revisarAccesibilidad(page);

    await page.getByRole("link", { name: "Iniciar sesión" }).click();
    await page.waitForURL(/\/iniciar-sesion/);
    await page.getByLabel("Correo electrónico").fill(ALUMNA);
    await page.getByLabel("Contraseña", { exact: true }).fill(NUEVA_CONTRASENA);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await page.waitForURL("**/modulos");
    await expect(titulo(page)).toHaveText("Hola, Alma");
  });

  test("DEC-77: con un correo inexistente, la misma respuesta y ningún correo", async ({ page }) => {
    const antes = (await correos()).length;
    await pedirEnlace(page, "nadie.existe@example.com");
    await expect(page.getByRole("status").filter({ hasText: "Solicitud enviada" })).toContainText(TEXTO_DEC_77);
    expect((await correos()).length).toBe(antes);
  });

  test("enlace ya usado, vencido (inexistente) y sin código: su estado y «Pedir un enlace nuevo»", async ({ page }) => {
    await pedirEnlace(page, ALUMNA);
    const enlace = (await enlaceDe(ALUMNA, "recuperacion"))!;
    await page.goto(enlace);
    await guardar(page, NUEVA_CONTRASENA);
    await expect(titulo(page)).toHaveText("Listo, tu contraseña cambió");

    await page.goto(enlace);
    await guardar(page, "OtraMas2026");
    await expect(titulo(page)).toHaveText("Este enlace ya se usó");
    await expect(page.getByRole("link", { name: "Pedir un enlace nuevo" })).toHaveAttribute("href", "/recuperar-contrasena");
    await revisarAccesibilidad(page);

    await page.goto("/recuperar-contrasena/nueva?codigo=no-existe");
    await guardar(page, "OtraMas2026");
    await expect(titulo(page)).toHaveText("Este enlace ya venció");

    await page.goto("/recuperar-contrasena/nueva");
    await expect(titulo(page)).toHaveText("Este enlace ya no funciona");
  });

  test("OP-07 cierra todas las sesiones: la que estaba abierta en otro navegador deja de valer", async ({ page, browser }) => {
    await entrar(page);
    await page.waitForURL("**/modulos");

    const otro = await browser.newContext();
    const pagina = await otro.newPage();
    await pedirEnlace(pagina, ALUMNA);
    await pagina.goto((await enlaceDe(ALUMNA, "recuperacion"))!);
    await guardar(pagina, NUEVA_CONTRASENA);
    await expect(titulo(pagina)).toHaveText("Listo, tu contraseña cambió");
    await otro.close();

    await page.goto("/modulos");
    await page.waitForURL(/\/iniciar-sesion\?motivo=expirada/);
  });

  test("todo con teclado: pedir el enlace y guardar la contraseña nueva", async ({ page }) => {
    await page.goto("/recuperar-contrasena");
    const enfocado = () => page.evaluate(() => document.activeElement?.id ?? "");
    for (let i = 0; i < 20 && (await enfocado()) !== "recuperar-correo"; i++) await page.keyboard.press("Tab");
    await page.keyboard.type(ALUMNA);
    await page.keyboard.press("Enter");
    await expect(titulo(page)).toHaveText("Revisa tu correo");

    await page.goto((await enlaceDe(ALUMNA, "recuperacion"))!);
    for (let i = 0; i < 20 && (await enfocado()) !== "nueva-contrasena"; i++) await page.keyboard.press("Tab");
    await page.keyboard.type(NUEVA_CONTRASENA);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Mostrar contraseña" })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Enter");
    await expect(titulo(page)).toHaveText("Listo, tu contraseña cambió");
  });
});

test.describe("SCR-19 · El correo de Google no se parte", () => {
  test.beforeEach(async () => {
    await reiniciarSimulador();
  });

  test("un correo largo va completo en su propio renglón a 390 px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const largo = "gala.ejemplo.larga@upchiapas.edu.mx";
    await control("POST", "/__simulador/google", { correo: largo });
    await page.goto("/api/auth/google");
    await page.waitForURL("**/aceptar");
    const correo = page.getByRole("main").locator("strong", { hasText: largo });
    await expect(correo).toBeVisible();
    // Un solo renglón: la caja mide lo que una línea de texto (15 px × 1.5), no dos.
    const { alto, linea } = await correo.evaluate((nodo) => ({
      alto: nodo.getBoundingClientRect().height,
      linea: parseFloat(getComputedStyle(nodo).lineHeight),
    }));
    expect(alto).toBeLessThan(linea * 1.5);
  });
});
