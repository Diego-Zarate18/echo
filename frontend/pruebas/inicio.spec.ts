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

    expect(await hrefsPorTexto("Crear cuenta")).toEqual(["/crear-cuenta"]);
    expect(await hrefsPorTexto("Iniciar sesión")).toEqual(["/iniciar-sesion"]);
    expect(await hrefsPorTexto("Ya tengo cuenta")).toEqual(["/iniciar-sesion"]);
    expect(await hrefsPorTexto("Ayuda")).toEqual(["/ayuda"]);
    expect(await hrefsPorTexto("Aviso de privacidad")).toEqual(["/aviso-de-privacidad"]);
    expect(await hrefsPorTexto("Términos y condiciones")).toEqual(["/terminos-y-condiciones"]);
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

  test("las ondas del hero terminan invisibles: en reposo no queda ningún borde", async ({ page }) => {
    await page.goto("/");
    const reposo = await page.evaluate(async () => {
      const ondas = [...document.querySelectorAll<HTMLElement>(".onda")];
      await Promise.all(ondas.flatMap((onda) => onda.getAnimations().map((animacion) => animacion.finished)));
      return ondas.map((onda) => getComputedStyle(onda).opacity);
    });
    expect(reposo).toEqual(["0", "0", "0"]);
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
    await page.evaluate(() => document.getElementById("por-que-echo")!.scrollIntoView({ block: "start", behavior: "instant" }));
    await expect(page.getByRole("banner")).toHaveAttribute("data-flotante", "true");
    // Solo opacidad: el fundido de la entrada o la transición de opacidad de la barra.
    const animacionesEncabezado = await page
      .getByRole("banner")
      .evaluate((encabezado) =>
        encabezado
          .getAnimations()
          .map((a) => (a as CSSAnimation).animationName || (a as CSSTransition).transitionProperty),
      );
    expect(animacionesEncabezado.every((nombre) => nombre === "desvanecer" || nombre === "opacity"), animacionesEncabezado.join(", ")).toBe(true);
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

test.describe("SCR-18 · Barra de desplazamiento", () => {
  test("en el inicio el carril es café; en las páginas claras sigue el hundido", async ({ page }) => {
    const color = () => page.evaluate(() => getComputedStyle(document.documentElement).scrollbarColor);
    await page.goto("/");
    // Pulgar superficie/hundida (#f1e6d7) sobre carril marca/cafe (#3d2213).
    expect(await color()).toBe("rgb(241, 230, 215) rgb(61, 34, 19)");
    await page.goto("/aviso-de-privacidad");
    // Pulgar texto/secundario (#6b4a36) sobre carril superficie/hundida (#f1e6d7).
    expect(await color()).toBe("rgb(107, 74, 54) rgb(241, 230, 215)");
  });
});

test.describe("SCR-18 · Carril que sigue el fondo de la sección (ajuste 2)", () => {
  const carril = (page: Page) => page.evaluate(() => document.documentElement.dataset.carril ?? null);

  /** Desplaza al instante y espera a que se mida (un cuadro después del evento de desplazamiento). */
  async function irA(page: Page, y: number) {
    await page.evaluate(async (destino) => {
      window.scrollTo({ top: destino, behavior: "instant" });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }, y);
  }

  /** Cuánto de la zona bajo la barra fija ocupa la sección crema de «Lo que encontrarás», con la página en `y`. */
  async function scrollParaCobertura(page: Page, cobertura: number) {
    return page.evaluate((fraccion) => {
      const barra = document.querySelector('header[data-flotante="true"] > div')!.getBoundingClientRect().bottom;
      const zona = window.innerHeight - barra;
      const crema = document.getElementById("que-encontraras")!.closest("section")!;
      const arribaCrema = crema.getBoundingClientRect().top + window.scrollY;
      // La frontera café → crema queda donde la crema ocupa `fraccion` de la zona (contando desde abajo).
      return Math.round(arribaCrema - (window.innerHeight - zona * fraccion));
    }, cobertura);
  }

  for (const [ancho, alto] of [[1536, 705], [1440, 900], [390, 844]]) {
    test(`${ancho}×${alto}: cada ancla deja el carril del fondo de su sección, sin cambios a medias`, async ({ page }, info) => {
      test.skip(info.project.name !== "escritorio", "Cada prueba fija su ventana");
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize({ width: ancho, height: alto });
      await page.goto("/");
      await irA(page, 0);
      // El atributo lo escribe el componente al hidratarse.
      await expect.poll(() => carril(page), { message: "sobre el hero" }).toBe("oscuro");

      // Por ancla, en un orden que alterna café y crema.
      for (const id of ["que-encontraras", "que-es-echo", "quienes-somos", "por-que-echo", "que-encontraras"]) {
        await page.evaluate((i) => {
          window.location.hash = i;
        }, id);
        const fondo = await page.evaluate((i) => document.getElementById(i)!.closest("section")!.dataset.fondo, id);
        await expect.poll(() => carril(page), { timeout: 3000, message: `#${id}` }).toBe(fondo);
      }

      // Frontera café («Qué es Echo») → crema («Lo que encontrarás»), bajando desde lo café (café al 95 % de la zona).
      await irA(page, await scrollParaCobertura(page, 0.05));
      expect(await carril(page)).toBe("oscuro");
      await irA(page, await scrollParaCobertura(page, 0.5));
      expect(await carril(page), "frontera a la mitad: no cambia").toBe("oscuro");
      await irA(page, await scrollParaCobertura(page, 0.8));
      expect(await carril(page), "crema al 80 %: cambia").toBe("claro");

      // Ida y vuelta de unos píxeles alrededor del 75 %: no oscila.
      const punto = await scrollParaCobertura(page, 0.75);
      const vistos = new Set<string | null>();
      for (const desplazamiento of [-4, 4, -3, 3, -2, 2, -1, 1, 0]) {
        await irA(page, punto + desplazamiento);
        vistos.add(await carril(page));
      }
      expect([...vistos], "se queda en crema").toEqual(["claro"]);
      // De regreso hacia lo café, con la frontera a la mitad: sigue crema.
      await irA(page, await scrollParaCobertura(page, 0.5));
      expect(await carril(page)).toBe("claro");
      await irA(page, await scrollParaCobertura(page, 0.2));
      expect(await carril(page), "café al 80 %: vuelve a café").toBe("oscuro");

      // Al final de la página, el llamado y el pie (café) mandan.
      await irA(page, await page.evaluate(() => document.documentElement.scrollHeight));
      expect(await carril(page)).toBe("oscuro");
    });
  }

  test("con el menú, el carril queda con el fondo de la sección destino", async ({ page }, info) => {
    test.skip(info.project.name !== "escritorio", "Las anclas del encabezado se ven desde 1280 px");
    await page.goto("/");
    for (const [texto, fondo] of [["Qué encontrarás", "claro"], ["Por qué Echo", "oscuro"], ["Quiénes somos", "claro"], ["Qué es Echo", "oscuro"]]) {
      await page.getByRole("banner").getByRole("link", { name: texto }).click();
      await expect.poll(() => carril(page), { timeout: 3000, message: texto }).toBe(fondo);
    }
  });

  test("las demás páginas no tienen data-carril", async ({ page }) => {
    await page.goto("/ayuda");
    expect(await carril(page)).toBeNull();
  });
});

test.describe("SCR-18 · Encabezado fijo", () => {
  test("se queda fijo al salir del hero y marca la sección actual", async ({ page }, info) => {
    test.skip(info.project.name !== "escritorio", "Las anclas del encabezado solo se ven desde 1280 px");
    await page.goto("/");
    const encabezado = page.getByRole("banner");
    await expect(encabezado).toHaveAttribute("data-flotante", "false");

    await page.evaluate(() => document.getElementById("por-que-echo")!.scrollIntoView({ block: "start", behavior: "instant" }));
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
    await page.evaluate(() => document.getElementById("titulo-llamado")!.scrollIntoView({ block: "center", behavior: "instant" }));
    await expect(encabezado.locator("[aria-current]")).toHaveCount(0);

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect(encabezado).toHaveAttribute("data-flotante", "false");
    await expect(encabezado.locator("[aria-current]")).toHaveCount(0);
  });
});

test.describe("SCR-18 · Barra fija siempre visible", () => {
  const anclas = [
    { id: "que-es-echo", texto: "Qué es Echo" },
    { id: "que-encontraras", texto: "Qué encontrarás" },
    { id: "por-que-echo", texto: "Por qué Echo" },
    { id: "quienes-somos", texto: "Quiénes somos" },
  ];

  /**
   * Rectángulo de la barra fija y su opacidad; `null` sobre el hero (ahí es el encabezado normal).
   * Espera a que terminen las transiciones del encabezado (220 ms): con la máquina ocupada, la espera fija tras la
   * rueda no siempre alcanza y se medía la barra a medio aparecer (opacidad 0.9999).
   */
  async function barra(page: Page) {
    return page.evaluate(async () => {
      const encabezado = document.querySelector("header")!;
      await Promise.all(encabezado.getAnimations({ subtree: true }).map((animacion) => animacion.finished.catch(() => null)));
      if (encabezado.dataset.flotante !== "true") return null;
      const caja = encabezado.querySelector(":scope > div")!.getBoundingClientRect();
      return { arriba: caja.top, abajo: caja.bottom, alto: caja.height, opacidad: getComputedStyle(encabezado).opacity };
    });
  }

  for (const reducido of [false, true]) {
    test(`después del hero la barra no desaparece y no tapa anclas ni foco${reducido ? " · movimiento reducido" : ""}`, async ({ page }, info) => {
      test.setTimeout(360_000);
      if (reducido) await page.emulateMedia({ reducedMotion: "reduce" });
      const tamanos = info.project.name === "movil" ? [[390, 844]] : [[1536, 705], [1440, 900]];

      for (const [ancho, alto] of tamanos) {
        const medida = `${ancho}×${alto}`;
        await page.setViewportSize({ width: ancho, height: alto });
        await page.goto("/");
        const encabezado = page.getByRole("banner");
        await page.mouse.move(ancho / 2, alto * 0.6);

        // 1. Bajar con la rueda hasta el pie: fuera del hero, la barra siempre está visible y compacta.
        let anterior = -1;
        let pasosConBarra = 0;
        while (true) {
          await page.mouse.wheel(0, 200);
          await page.waitForTimeout(320);
          const y = await page.evaluate(() => Math.round(window.scrollY));
          const estado = await barra(page);
          if (estado) {
            pasosConBarra++;
            expect(estado, `${medida}, scrollY ${y}`).toMatchObject({ arriba: 8, opacidad: "1" });
            expect(estado.alto, `${medida}, scrollY ${y}`).toBeLessThanOrEqual(62);
          }
          if (y === anterior) break;
          anterior = y;
        }
        expect(pasosConBarra).toBeGreaterThan(3);

        // 2. Al subir sigue visible.
        await page.mouse.wheel(0, -300);
        await page.waitForTimeout(320);
        expect(await barra(page)).toMatchObject({ arriba: 8, opacidad: "1" });

        // 3. Cada ancla deja el título completo y con aire debajo de la barra.
        for (const ancla of anclas) {
          if (info.project.name === "movil") {
            await encabezado.getByRole("button", { name: "Abrir menú" }).click();
            await page.locator("#menu-movil").getByRole("link", { name: ancla.texto }).click();
          } else {
            await encabezado.getByRole("link", { name: ancla.texto }).click();
          }
          await page.waitForTimeout(reducido ? 300 : 1400);
          const titulo = await page.locator(`#${ancla.id} h2`).evaluate((h2) => h2.getBoundingClientRect().top);
          const estado = await barra(page);
          expect(estado, `${medida}, ${ancla.texto}`).not.toBeNull();
          expect(titulo, `${medida}, ${ancla.texto}`).toBeGreaterThanOrEqual(estado!.abajo + 16);
        }

        // 4. Con Tab, el control con foco nunca queda debajo de la barra.
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
        await page.locator("body").focus();
        for (let paso = 0; paso < 60; paso++) {
          await page.keyboard.press("Tab");
          // Se mide con la página quieta: el control puede cruzar la barra mientras el navegador lo lleva a la vista.
          await page.evaluate(
            () =>
              new Promise<void>((resolver) => {
                let anterior = -1;
                let quieto = 0;
                const inicio = performance.now();
                const mirar = () => {
                  const y = window.scrollY;
                  quieto = y === anterior ? quieto + 1 : 0;
                  anterior = y;
                  if (quieto >= 12 || performance.now() - inicio > 2000) resolver();
                  else requestAnimationFrame(mirar);
                };
                requestAnimationFrame(mirar);
              }),
          );
          const choque = await page.evaluate(() => {
            const activo = document.activeElement as HTMLElement | null;
            const encabezado = document.querySelector("header")!;
            if (!activo || activo === document.body || encabezado.contains(activo)) return null;
            if (encabezado.dataset.flotante !== "true" || activo.closest(".sr-only")) return null;
            const barra = encabezado.querySelector(":scope > div")!.getBoundingClientRect();
            const caja = activo.getBoundingClientRect();
            const debajo = caja.top < barra.bottom && caja.bottom > barra.top && caja.left < barra.right && caja.right > barra.left;
            return debajo ? `${(activo.textContent ?? "").trim().slice(0, 40)} (top ${Math.round(caja.top)})` : null;
          });
          expect(choque, `${medida}, Tab ${paso + 1}`).toBeNull();
        }
      }
    });
  }
});

test.describe("SCR-18 · Aire de las secciones", () => {
  test("cada sección deja aire arriba y su título queda completo bajo la barra al bajar", async ({ page }, info) => {
    test.skip(info.project.name !== "escritorio", "Se revisa en 1536 × 705 y 1440 × 900");
    for (const [ancho, alto] of [[1536, 705], [1440, 900]]) {
      const medida = `${ancho}×${alto}`;
      await page.setViewportSize({ width: ancho, height: alto });
      await page.goto("/");
      // El id de cada ancla está en el bloque del título; se mide la sección que lo contiene.
      const ids = await page.locator("main section .ancla-seccion").evaluateAll((bloques) => bloques.map((b) => b.id));
      expect(ids).toHaveLength(4);

      // Aire entre el borde de arriba de la sección y su título.
      for (const id of ids) {
        const aire = await page.evaluate((idSeccion) => {
          const seccion = document.getElementById(idSeccion)!.closest("section")!;
          return seccion.querySelector("h2")!.getBoundingClientRect().top - seccion.getBoundingClientRect().top;
        }, id);
        expect(aire, `${medida}, #${id}`).toBeGreaterThanOrEqual(64);
      }

      // Bajar con la rueda hasta que cada sección toca el borde inferior de la barra: su título queda completo debajo.
      await page.mouse.move(ancho / 2, alto * 0.6);
      await page.mouse.wheel(0, 400);
      await expect(page.getByRole("banner")).toHaveAttribute("data-flotante", "true");
      for (const id of ids) {
        const { distancia } = await page.evaluate((idSeccion) => {
          const barra = document.querySelector("header > div")!.getBoundingClientRect();
          const seccion = document.getElementById(idSeccion)!.closest("section")!;
          return { distancia: Math.round(seccion.getBoundingClientRect().top - barra.bottom) };
        }, id);
        await page.mouse.wheel(0, distancia);
        await page.waitForTimeout(400);
        const medidas = await page.evaluate((idSeccion) => {
          const barra = document.querySelector("header > div")!.getBoundingClientRect();
          const seccion = document.getElementById(idSeccion)!.closest("section")!.getBoundingClientRect();
          const titulo = document.querySelector(`#${idSeccion} h2`)!.getBoundingClientRect();
          return { bordeSeccion: seccion.top - barra.bottom, tituloArriba: titulo.top - barra.bottom, tituloAbajo: titulo.bottom };
        }, id);
        expect(Math.abs(medidas.bordeSeccion), `${medida}, #${id}: la sección toca la barra`).toBeLessThanOrEqual(2);
        expect(medidas.tituloArriba, `${medida}, #${id}: título bajo la barra`).toBeGreaterThanOrEqual(0);
        expect(medidas.tituloAbajo, `${medida}, #${id}: título completo`).toBeLessThanOrEqual(alto);
      }
    }
  });
});

test.describe("SCR-18 · Ajustes de la Tarea 03", () => {
  test.beforeEach(async ({ page }, info) => {
    test.skip(info.project.name !== "escritorio", "Cada prueba fija sus propios anchos");
    // Sin la escala de la animación `eco`: se mide la posición final.
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("«ÉTICA» queda centrada en la tarjeta del hero", async ({ page }) => {
    for (const ancho of [1024, 1280, 1440, 1536, 1920, 2560]) {
      await page.setViewportSize({ width: ancho, height: 900 });
      await page.goto("/");
      const medidas = await page.evaluate(() => {
        const tarjeta = document.getElementById("portada")!.getBoundingClientRect();
        const palabra = [...document.querySelectorAll("#portada span")].find((s) => s.textContent === "ÉTICA")!;
        const caja = palabra.getBoundingClientRect();
        return {
          desfase: caja.left + caja.width / 2 - (tarjeta.left + tarjeta.width / 2),
          proporcion: caja.width / tarjeta.width,
          alto: caja.height / tarjeta.height,
        };
      });
      expect(Math.abs(medidas.desfase), `${ancho} px: centro`).toBeLessThanOrEqual(4);
      // 69.9 % de la tarjeta, como en Figma, salvo que lo limite el alto del hero (37 % del alto).
      expect(medidas.proporcion, `${ancho} px: ancho`).toBeLessThanOrEqual(0.71);
      expect(Math.max(medidas.proporcion / 0.699, medidas.alto / 0.37), `${ancho} px: tamaño`).toBeGreaterThan(0.97);
    }
  });

  test("el hero deja el mismo margen a los dos lados y no hay desbordamiento horizontal", async ({ page }) => {
    for (const ancho of [390, 768, 1024, 1280, 1536, 1920]) {
      await page.setViewportSize({ width: ancho, height: 900 });
      await page.goto("/");
      const medidas = await page.evaluate(() => {
        const raiz = document.documentElement;
        const tarjeta = document.getElementById("portada")!.getBoundingClientRect();
        return {
          izquierda: tarjeta.left,
          derecha: raiz.clientWidth - tarjeta.right,
          sobrante: raiz.scrollWidth - raiz.clientWidth,
        };
      });
      expect(Math.abs(medidas.izquierda - 8), `${ancho} px: izquierda`).toBeLessThanOrEqual(1);
      expect(Math.abs(medidas.derecha - 8), `${ancho} px: derecha`).toBeLessThanOrEqual(1);
      expect(medidas.sobrante, `${ancho} px: scrollWidth`).toBe(0);
    }
  });

  test("la barra fija coincide con los bordes del contenido (y a 8 px en móvil)", async ({ page }) => {
    for (const ancho of [390, 1280, 1440, 1536]) {
      await page.setViewportSize({ width: ancho, height: 900 });
      await page.goto("/");
      await page.evaluate(() =>
        document.getElementById("por-que-echo")!.scrollIntoView({ block: "start", behavior: "instant" }),
      );
      const encabezado = page.getByRole("banner");
      await expect(encabezado).toHaveAttribute("data-flotante", "true");
      await expect(encabezado).toHaveCSS("opacity", "1");
      const medidas = await page.evaluate(() => {
        const barra = document.querySelector("header > div")!.getBoundingClientRect();
        const contenido = document.getElementById("por-que-echo")!.getBoundingClientRect();
        return {
          barra: { izquierda: barra.left, derecha: barra.right, alto: barra.height },
          contenido: { izquierda: contenido.left, derecha: contenido.right },
          pagina: document.documentElement.clientWidth,
        };
      });
      const esperado =
        ancho < 1024 ? { izquierda: 8, derecha: medidas.pagina - 8 } : medidas.contenido;
      expect(Math.abs(medidas.barra.izquierda - esperado.izquierda), `${ancho} px: izquierda`).toBeLessThanOrEqual(2);
      expect(Math.abs(medidas.barra.derecha - esperado.derecha), `${ancho} px: derecha`).toBeLessThanOrEqual(2);
      expect(medidas.barra.alto, `${ancho} px: alto`).toBeLessThanOrEqual(62);
    }
  });

  test("al usar cada ancla se ve la sección completa bajo la barra", async ({ page }) => {
    const anclas = ["Qué es Echo", "Qué encontrarás", "Por qué Echo", "Quiénes somos"];
    for (const [ancho, alto] of [[1536, 705], [1440, 900]]) {
      const medida = `${ancho}×${alto}`;
      await page.setViewportSize({ width: ancho, height: alto });
      await page.goto("/");
      for (const texto of anclas) {
        const enlace = page.getByRole("navigation", { name: "Secciones de la página" }).getByRole("link", { name: texto });
        const id = (await enlace.getAttribute("href"))!.slice(1);
        await enlace.click();
        await expect(page.getByRole("banner")).toHaveAttribute("data-flotante", "true");
        await page.waitForTimeout(300);
        const medidas = await page.evaluate((idBloque) => {
          const barra = document.querySelector("header > div")!.getBoundingClientRect();
          const bloque = document.getElementById(idBloque)!;
          return {
            titulo: bloque.querySelector("h2")!.getBoundingClientRect().top - barra.bottom,
            sobrante: window.innerHeight - bloque.getBoundingClientRect().bottom,
          };
        }, id);
        expect(medidas.titulo, `${medida}, ${texto}: h2 bajo la barra`).toBeGreaterThanOrEqual(16);
        expect(medidas.sobrante, `${medida}, ${texto}: último elemento a la vista`).toBeGreaterThanOrEqual(0);
      }
    }
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
    const respuesta = await page.goto("/pagina-que-no-existe");
    expect(respuesta?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("No encontramos esta página.");
    await expect(page.getByRole("link", { name: "Ir al inicio" })).toHaveAttribute("href", "/");
    await expect(page).toHaveTitle("Página no encontrada · Echo");
    await revisarAccesibilidad(page);
  });
});
