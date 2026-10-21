import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { importarDelSimulador, raizFrontend } from "./utilidades/api";

const carpetaBuild = join(raizFrontend, ".next");

function archivos(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    return statSync(ruta).isDirectory() ? archivos(ruta) : [ruta];
  });
}

test.describe("Build de producción", () => {
  test("no incluye nada de la API simulada (DEC-90)", async () => {
    const { MARCA_SIMULADOR } = await importarDelSimulador<{ MARCA_SIMULADOR: string }>("utilidades.mjs");
    const revisados = ["server", "static"].flatMap((carpeta) => archivos(join(carpetaBuild, carpeta))).filter((ruta) => /\.(js|json|html|rsc|map)$/.test(ruta));
    expect(revisados.length).toBeGreaterThan(20);
    const conSimulador = revisados.filter((ruta) => {
      const texto = readFileSync(ruta, "utf8");
      return texto.includes(MARCA_SIMULADOR) || /simulador[\\/](servidor|rutas|estado|reglas|contenido|utilidades)\.mjs/.test(texto);
    });
    expect(conSimulador).toEqual([]);
  });

  test("las páginas públicas y los íconos siguen estáticos", async () => {
    const manifiesto = JSON.parse(readFileSync(join(carpetaBuild, "prerender-manifest.json"), "utf8")) as { routes: Record<string, unknown> };
    for (const ruta of ["/", "/aviso-de-privacidad", "/ayuda", "/icon.png", "/icon1.png", "/apple-icon.png"]) {
      expect(Object.keys(manifiesto.routes), ruta).toContain(ruta);
    }
  });

  test("el rewrite lleva /api/* a API_URL_INTERNA", async () => {
    const rutas = JSON.parse(readFileSync(join(carpetaBuild, "routes-manifest.json"), "utf8")) as {
      rewrites: { beforeFiles: { source: string; destination: string }[]; afterFiles: { source: string; destination: string }[] } | { source: string; destination: string }[];
    };
    const lista = Array.isArray(rutas.rewrites) ? rutas.rewrites : [...rutas.rewrites.beforeFiles, ...rutas.rewrites.afterFiles];
    expect(lista).toContainEqual(expect.objectContaining({ source: "/api/:ruta*", destination: "http://localhost:4000/api/:ruta*" }));
  });
});
