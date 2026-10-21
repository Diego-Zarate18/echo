import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, request, type APIRequestContext, type APIResponse } from "@playwright/test";

/** Las pruebas de API pasan por el rewrite de Next (puerto 3100), no directo al simulador (DEC-85). */
export const URL_APP = "http://localhost:3100";
/** Solo para las rutas de control (/__simulador), que el rewrite no expone. */
export const URL_SIMULADOR = "http://localhost:4000";
export const CONTRASENA = "Ejemplo2026";
export const ALUMNA = "alumno@example.com";
export const OTRA_ALUMNA = "otra.alumna@example.com";

export const raizFrontend = join(__dirname, "..", "..");
export const rutaContrato = join(raizFrontend, "..", "docs", "api", "openapi.yaml");
export const leerTexto = (ruta: string) => readFileSync(ruta, "utf8");

/** Importa un módulo del simulador (JavaScript puro) desde las pruebas. */
export const importarDelSimulador = <T>(archivo: string): Promise<T> =>
  import(pathToFileURL(join(raizFrontend, "simulador", archivo)).href) as Promise<T>;

type Opciones = { cuerpo?: unknown; encabezados?: Record<string, string>; origen?: string | null; redirecciones?: number };

/** Un navegador de mentira: su propio almacén de cookies y el `Origin` del frontend en las mutaciones. */
export class Alumno {
  private constructor(readonly contexto: APIRequestContext) {}

  static async nuevo() {
    return new Alumno(await request.newContext({ baseURL: URL_APP }));
  }

  async pedir(metodo: string, ruta: string, { cuerpo, encabezados = {}, origen = URL_APP, redirecciones = 0 }: Opciones = {}) {
    const headers: Record<string, string> = { ...encabezados };
    if (metodo !== "GET" && origen) headers.origin = origen;
    return this.contexto.fetch(ruta, { method: metodo, data: cuerpo, headers, maxRedirects: redirecciones, failOnStatusCode: false });
  }

  async json<T = Record<string, unknown>>(metodo: string, ruta: string, opciones: Opciones = {}) {
    const respuesta = await this.pedir(metodo, ruta, opciones);
    const texto = await respuesta.text();
    return { estado: respuesta.status(), cuerpo: (texto ? JSON.parse(texto) : null) as T, respuesta };
  }

  async entrar(correo = ALUMNA, contrasena = CONTRASENA) {
    const { estado } = await this.json("POST", "/api/sesion", { cuerpo: { correo, contrasena } });
    expect(estado, `iniciar sesión como ${correo}`).toBe(200);
    return this;
  }

  cerrar() {
    return this.contexto.dispose();
  }
}

/** Rutas de control del simulador (fuera de /api). */
export async function control(metodo: "GET" | "POST", ruta: string, cuerpo?: unknown) {
  const contexto = await request.newContext({ baseURL: URL_SIMULADOR });
  const respuesta = await contexto.fetch(ruta, { method: metodo, data: cuerpo, failOnStatusCode: false });
  const texto = await respuesta.text();
  await contexto.dispose();
  expect(respuesta.status(), `${metodo} ${ruta}`).toBeLessThan(300);
  return texto ? JSON.parse(texto) : null;
}

export const reiniciarSimulador = () => control("POST", "/__simulador/reiniciar");
export const escenario = (nombre: string) => control("POST", "/__simulador/escenario", { nombre });
export const correos = async () => (await control("GET", "/__simulador/correos")).correos as { para: string; tipo: string; codigo: string | null }[];
export const aceptaciones = async () =>
  (await control("GET", "/__simulador/aceptaciones")).aceptaciones as {
    usuario: string | null;
    documento: string;
    version: string;
    aceptadoEn: string;
    direccionIp: string | null;
  }[];

/** Busca en cualquier nivel de un JSON las llaves que no deben aparecer (INV-04). */
export function llavesPresentes(valor: unknown, prohibidas: readonly string[], camino = "$"): string[] {
  if (Array.isArray(valor)) return valor.flatMap((v, i) => llavesPresentes(v, prohibidas, `${camino}[${i}]`));
  if (valor && typeof valor === "object") {
    return Object.entries(valor).flatMap(([llave, v]) => [
      ...(prohibidas.includes(llave) ? [`${camino}.${llave}`] : []),
      ...llavesPresentes(v, prohibidas, `${camino}.${llave}`),
    ]);
  }
  return [];
}

export const encabezadosSetCookie = (respuesta: APIResponse) =>
  respuesta.headersArray().filter((h) => h.name.toLowerCase() === "set-cookie").map((h) => h.value);
