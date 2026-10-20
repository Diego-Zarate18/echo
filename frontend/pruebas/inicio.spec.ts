import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const ETIQUETAS_WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function revisarAccesibilidad(pagina: Page) {
  // Con movimiento reducido no hay apariciones al desplazarse: todo el contenido está visible
  // y axe puede revisar el contraste de cada elemento. Luego espera a que terminen los fundidos.
  await pagina.emulateMedia({ reducedMotion: "reduce" });
  await pagina.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animacion) => animacion.timeline instanceof DocumentTimeline)
        .map((animacion) => animacion.finished),
    ),
  );
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

test.describe("SCR-18 · Movimiento", () => {
  test("con movimiento reducido la entrada es un fundido corto, sin desplazamientos", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const animaciones = await page.evaluate(() =>
      document.getAnimations().map((animacion) => ({
        nombre: (animacion as CSSAnimation).animationName,
        duracion: animacion.effect?.getTiming().duration,
      })),
    );
    expect(animaciones.length).toBeGreaterThan(0);
    for (const animacion of animaciones) {
      expect(animacion).toEqual({ nombre: "desvanecer", duracion: 250 });
    }
  });

  test("con movimiento reducido nada nuevo se mueve: Moris, íconos, cierre ni encabezado", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const moris = page.locator(".saludo");
    await expect(moris).toHaveCSS("animation-name", "none");

    // Moris no sigue al puntero.
    await page.mouse.move(1200, 200);
    await page.mouse.move(1260, 240);
    await expect(moris).not.toHaveAttribute("style", /translate/);

    // Los íconos no se marcan para dibujarse: se ven completos.
    await expect(page.locator("[data-dibujo]")).toHaveCount(0);

    // Moris del cierre no se inclina.
    await page.locator(".boton-llamado").focus();
    await expect(page.locator(".moris-cierre")).toHaveCSS("translate", "none");

    // El encabezado fijo solo se funde.
    await page.evaluate(() => document.getElementById("por-que-echo")!.scrollIntoView({ block: "start" }));
    await expect(page.getByRole("banner")).toHaveAttribute("data-flotante", "true");
    const animacionesEncabezado = await page
      .getByRole("banner")
      .evaluate((encabezado) => encabezado.getAnimations().map((a) => (a as CSSAnimation).animationName));
    expect(animacionesEncabezado.every((nombre) => nombre === "desvanecer")).toBe(true);
  });
});

test.describe("SCR-18 · Retícula", () => {
  test("el hero llega a 8 px del borde y el contenido no pasa de 1424 px", async ({ page }, info) => {
    test.skip(info.project.name !== "escritorio", "Se revisa en anchos de escritorio");
    for (const ancho of [1536, 2560]) {
      await page.setViewportSize({ width: ancho, height: 900 });
      await page.goto("/");
      const medidas = await page.evaluate(() => {
        const tarjeta = document.getElementById("portada")!.getBoundingClientRect();
        const contenido = document.querySelector("#portada > div")!.getBoundingClientRect();
        return { izquierda: tarjeta.left, derecha: window.innerWidth - tarjeta.right, contenido: contenido.width };
      });
      expect(medidas, `${ancho} px`).toEqual({ izquierda: 8, derecha: 8, contenido: 1424 });
    }
  });

  test("las tarjetas del equipo miden lo mismo en cada fila", async ({ page }) => {
    await page.goto("/");
    const filas = await page.locator("#quienes-somos ul > li").evaluateAll((tarjetas) => {
      const porFila = new Map<number, number[]>();
      for (const tarjeta of tarjetas) {
        const caja = tarjeta.getBoundingClientRect();
        const fila = Math.round(caja.top);
        porFila.set(fila, [...(porFila.get(fila) ?? []), Math.round(caja.height)]);
      }
      return [...porFila.values()];
    });
    expect(filas.length).toBeGreaterThan(0);
    for (const alturas of filas) {
      expect(new Set(alturas).size, `alturas de una fila: ${alturas.join(", ")}`).toBe(1);
    }
  });
});

test.describe("SCR-18 · Encabezado fijo", () => {
  test("se queda fijo al salir del hero y marca la sección actual", async ({ page }, info) => {
    test.skip(info.project.name !== "escritorio", "Las anclas del encabezado solo se ven desde 1280 px");
    await page.goto("/");
    const encabezado = page.getByRole("banner");
    await expect(encabezado).toHaveAttribute("data-flotante", "false");

    await page.evaluate(() => document.getElementById("por-que-echo")!.scrollIntoView({ block: "start" }));
    await expect(encabezado).toHaveAttribute("data-flotante", "true");
    await expect(encabezado).toHaveCSS("position", "fixed");
    await expect(encabezado.getByRole("link", { name: "Por qué Echo" })).toHaveAttribute("aria-current", "location");
    // Un solo indicador deslizante, visible, recortado sobre el ancla actual.
    const indicador = encabezado.locator("[data-indicador]");
    await expect(indicador).toHaveCount(1);
    await expect(indicador).toHaveCSS("opacity", "1");
    await expect(indicador).toHaveAttribute("style", /clip-path: inset\(/);
    await expect(encabezado.getByRole("link", { name: "Crear cuenta" })).toBeVisible();

    // En el cierre no hay sección del menú: no queda marcada la anterior.
    await page.evaluate(() => document.getElementById("titulo-llamado")!.scrollIntoView({ block: "center" }));
    await expect(encabezado.locator("[aria-current]")).toHaveCount(0);

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect(encabezado).toHaveAttribute("data-flotante", "false");
    await expect(encabezado.locator("[aria-current]")).toHaveCount(0);
  });
});

test.describe("SCR-18 · Barra fija al leer", () => {
  test("sigue a la vista al bajar y al subir, y cubre lo que pasa por debajo de borde a borde", async ({ page }) => {
    await page.goto("/");
    const encabezado = page.getByRole("banner");
    await page.mouse.move(200, 400);
    for (const delta of [900, 600, -200]) {
      await page.mouse.wheel(0, delta);
      await expect(encabezado).toHaveAttribute("data-flotante", "true");
      await expect(encabezado.getByRole("link", { name: "Echo, inicio" })).toBeInViewport();
    }
    // Franja opaca de borde a borde: nada asoma a los lados de la barra.
    const franja = await encabezado.evaluate((elemento) => {
      const caja = elemento.getBoundingClientRect();
      return { izquierda: caja.left, derecha: window.innerWidth - caja.right, fondo: getComputedStyle(elemento).backgroundColor };
    });
    expect(franja).toEqual({ izquierda: 0, derecha: 0, fondo: "rgb(251, 243, 233)" });
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
