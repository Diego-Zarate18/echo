import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ALUMNA, CONTRASENA, URL_APP, escenario, reiniciarSimulador } from "./utilidades/api";

const ETIQUETAS_WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function revisarAccesibilidad(pagina: Page) {
  await pagina.emulateMedia({ reducedMotion: "reduce" });
  const resultado = await new AxeBuilder({ page: pagina }).withTags(ETIQUETAS_WCAG).analyze();
  const resumen = resultado.violations.map((v) => ({ regla: v.id, impacto: v.impact, nodos: v.nodes.map((n) => n.target.join(" ")) }));
  expect(resumen, JSON.stringify(resumen, null, 2)).toEqual([]);
}

async function entrar(pagina: Page, nombreEscenario?: string) {
  if (nombreEscenario) await escenario(nombreEscenario);
  await pagina.goto("/iniciar-sesion");
  await pagina.getByLabel("Correo electrónico").fill(ALUMNA);
  await pagina.getByLabel("Contraseña", { exact: true }).fill(CONTRASENA);
  await pagina.getByRole("button", { name: /Iniciar sesión|Iniciando sesión/ }).click();
  await pagina.waitForURL("**/modulos");
}

/** La API con la cookie de la página, como la usaría la alumna (para preparar el avance sin recorrer cada pantalla). */
async function api(pagina: Page, metodo: string, ruta: string, data?: unknown) {
  const respuesta = await pagina.request.fetch(ruta, { method: metodo, data, headers: { origin: URL_APP }, failOnStatusCode: false });
  expect(respuesta.status(), `${metodo} ${ruta}`).toBeLessThan(300);
  const texto = await respuesta.text();
  return texto ? JSON.parse(texto) : null;
}

/** Desde «a-medias»: termina la lección 2 (la de la relación de columnas). */
async function terminarLeccion2(pagina: Page) {
  await api(pagina, "PUT", "/api/lecciones/el-codigo-de-acm/seccion-vista", { seccion: 2 });
  await api(pagina, "POST", "/api/lecciones/el-codigo-de-acm/terminar");
}

/** La actividad 3 con todo bien, para que el examen 4 quede disponible. */
const RELACION: [string, string][] = [
  ["Evitar el daño", "Prever consecuencias negativas"],
  ["Respetar la privacidad", "Usar solo los datos necesarios"],
  ["Ser honesto", "Informar los límites de un sistema"],
];
async function enviarActividad3(pagina: Page) {
  const actividad = await api(pagina, "GET", "/api/actividades/3");
  const respuestas = actividad.preguntas.map((p: { id: number; tipo: string; izquierda?: { id: number; texto: string }[]; derecha?: { clave: string; texto: string }[] }) =>
    p.tipo === "relacion"
      ? { preguntaId: p.id, uniones: p.izquierda!.map((izq) => ({ izquierdaId: izq.id, derechaClave: p.derecha!.find((d) => d.texto === RELACION.find(([i]) => i === izq.texto)![1])!.clave })) }
      : { preguntaId: p.id, opcionId: 9 },
  );
  await api(pagina, "POST", "/api/actividades/3/envios", { respuestas });
}

// Examen 4 (DEC-117: solo opción múltiple y verdadero/falso). Respuestas por enunciado: [correcta, incorrecta].
const EXAMEN_4: [RegExp, string, string][] = [
  [/Qué complementa/, "La ley", "El contrato de trabajo"],
  [/evaluar los riesgos/, "Verdadero", "Falso"],
  [/contraseñas sin cifrar/, "Evitar el daño", "Ser honesto"],
  [/Ante un dilema/, "¿A quién afecta mi decisión?", "¿Cuánto tardaré?"],
  [/usar con teclado/, "Verdadero", "Falso"],
];

/** La resolución muestra una pregunta a la vez y en orden mezclado: pasa por «Pregunta n» hasta ver la que se busca. */
async function elegirEnExamen(pagina: Page, enunciado: RegExp, opcion: string) {
  const radio = pagina.getByRole("group", { name: enunciado }).getByLabel(opcion, { exact: true });
  for (let n = 1; n <= 5 && !(await radio.isVisible()); n++) await pagina.getByRole("button", { name: new RegExp(`^Pregunta ${n},`) }).click();
  await Promise.all([pagina.waitForResponse((r) => /\/respuestas\//.test(r.url()) && r.request().method() === "PUT"), radio.check()]);
}

async function abrirExamen4(pagina: Page) {
  await entrar(pagina, "a-medias");
  await terminarLeccion2(pagina);
  await enviarActividad3(pagina);
  await pagina.goto("/examenes/4");
  await pagina.getByRole("link", { name: "Empezar examen" }).click();
  await pagina.waitForURL("**/examenes/4/resolver");
  await expect(pagina.getByRole("button", { name: /^Pregunta 1,/ })).toBeVisible();
}

test.describe("SCR-10 a SCR-13 · Actividades, casos y examen", () => {
  test.describe.configure({ mode: "default" });
  test.beforeEach(async () => {
    await reiniciarSimulador();
  });

  test("SCR-10 · Enviar una actividad: qué estuvo bien y qué no, con la retroalimentación", async ({ page }) => {
    await entrar(page, "a-medias");
    await page.goto("/actividades/1");
    await expect(page.getByRole("list", { name: "Cómo funciona" })).toContainText("Tus respuestas se guardan al enviar");
    await page.getByRole("group", { name: /código de ética profesional/ }).getByLabel("Orienta cómo actuar ante decisiones profesionales.").check();
    await page.getByRole("group", { name: /exponer datos/ }).getByLabel("Falso").check();
    await page.getByRole("button", { name: "Enviar actividad" }).click();
    await expect(page.getByText("Correcta", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Incorrecta", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Las decisiones técnicas tienen consecuencias en las personas.")).toBeVisible();
    await revisarAccesibilidad(page);
  });

  test("SCR-10 · Enviar un caso: la decisión con su etiqueta y su consecuencia", async ({ page }) => {
    await entrar(page, "a-medias");
    await page.goto("/actividades/2");
    await page.getByLabel("Pregunto si los correos hacen falta antes de enviarlo.").check();
    await page.getByRole("button", { name: "Enviar decisión" }).click();
    await expect(page.getByText("Decisión aceptable").first()).toBeVisible();
    await expect(page.getByText("Se retrasa un poco, pero se evita compartir de más.")).toBeVisible();
    await revisarAccesibilidad(page);
  });

  test("SCR-10 · Relación de columnas con listas, sin arrastrar (INV-13, DEC-71)", async ({ page }) => {
    await entrar(page, "a-medias");
    await terminarLeccion2(page);
    await page.goto("/actividades/3");
    await page.getByRole("group", { name: /principio general/ }).getByLabel("Respetar la privacidad.").check();
    for (const [izquierda, derecha] of RELACION) await page.getByLabel(izquierda, { exact: true }).selectOption({ label: derecha });
    await revisarAccesibilidad(page);
    await page.getByRole("button", { name: "Enviar actividad" }).click();
    await expect(page.getByText("Incorrecta", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Correcta", { exact: true }).first()).toBeVisible();
  });

  test("SCR-12 · Cada respuesta se guarda, se puede cambiar y al recargar sigue la última", async ({ page }) => {
    await abrirExamen4(page);
    await elegirEnExamen(page, /Qué complementa/, "El contrato de trabajo");
    await expect(page.getByText(/^Guardado/)).toBeVisible();
    await elegirEnExamen(page, /Qué complementa/, "La ley");
    await page.reload();
    await expect(page.getByRole("button", { name: /^Pregunta 1,/ })).toBeVisible();
    const radio = page.getByRole("group", { name: /Qué complementa/ }).getByLabel("La ley", { exact: true });
    for (let n = 1; n <= 5 && !(await radio.isVisible()); n++) await page.getByRole("button", { name: new RegExp(`^Pregunta ${n},`) }).click();
    await expect(radio).toBeChecked();
    await expect(page.getByText("1 de 5 respondidas")).toBeVisible();
    await revisarAccesibilidad(page);
  });

  test("SCR-12 · Enviar con preguntas pendientes dice cuáles faltan y no envía", async ({ page }) => {
    await abrirExamen4(page);
    await elegirEnExamen(page, /Qué complementa/, "La ley");
    await page.getByRole("button", { name: "Enviar examen" }).first().click();
    const aviso = page.getByRole("alert").filter({ hasText: "Te faltan 4 preguntas" });
    await expect(aviso).toBeVisible();
    await expect(aviso).toBeFocused();
    expect(new URL(page.url()).pathname).toBe("/examenes/4/resolver");
    await revisarAccesibilidad(page);
  });

  test("SCR-13 · No aprobado: calificación, lecciones para repasar y sin la respuesta correcta (DEC-11)", async ({ page }) => {
    await abrirExamen4(page);
    for (const [enunciado, , incorrecta] of EXAMEN_4) await elegirEnExamen(page, enunciado, incorrecta);
    await page.getByRole("button", { name: "Enviar examen" }).first().click();
    await page.waitForURL("**/examenes/4/resultado/**");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Obtuviste 0 %. El mínimo es 70 %");
    await expect(page.getByRole("heading", { name: "Lecciones para repasar" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Ruta de navegación" })).toContainText("Resultado del examen");
    // Ni la etiqueta de la correcta ni su texto: solo lo que eligió la alumna.
    await expect(page.getByText(/· respuesta correcta/)).toHaveCount(0);
    await expect(page.getByText("La ley", { exact: true })).toHaveCount(0);
    await revisarAccesibilidad(page);
  });

  test("SCR-13 · Aprobado: la retroalimentación completa y el curso completado", async ({ page }) => {
    await abrirExamen4(page);
    for (const [enunciado, correcta] of EXAMEN_4) await elegirEnExamen(page, enunciado, correcta);
    await page.getByRole("button", { name: "Enviar examen" }).first().click();
    await page.waitForURL("**/examenes/4/resultado/**");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("¡Aprobaste con 100 %!");
    await expect(page.getByText("Incorrecta", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Ruta de navegación" })).toContainText("Resultado del examen");
    await revisarAccesibilidad(page);
    // Al recargar, el mismo resultado desde Mis resultados (OP-30), con las mismas migas.
    await page.reload();
    await expect(page.getByRole("navigation", { name: "Ruta de navegación" })).toContainText("Resultado del examen");
  });
});

test.describe("Mis resultados · filtro de fechas DD/MM/AAAA", () => {
  test.beforeEach(async () => {
    await reiniciarSimulador();
  });

  test("la fecha se escribe DD/MM/AAAA, se manda como día y una fecha imposible se ignora", async ({ page }) => {
    await entrar(page, "examen-en-espera");
    await page.goto("/mis-resultados");
    const hoy = new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());
    await page.getByLabel(/^Desde/).fill(hoy);
    await page.getByRole("button", { name: "Aplicar" }).click();
    await page.waitForURL(/desde=/);
    await expect(page.getByLabel(/^Desde/)).toHaveValue(hoy);
    await expect(page.getByRole("status")).toContainText("con estos filtros");
    await page.goto("/mis-resultados?desde=30%2F02%2F2026");
    await expect(page.getByLabel(/^Desde/)).toHaveValue("");
  });
});
