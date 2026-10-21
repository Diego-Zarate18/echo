import { defineConfig, devices } from "@playwright/test";

const PUERTO = 3100;
const URL_BASE = `http://localhost:${PUERTO}`;
const PUERTO_SIMULADOR = 4000;
const URL_SIMULADOR = `http://localhost:${PUERTO_SIMULADOR}`;

/** Pruebas de la API (contrato e invariantes) y del build: cambian el estado del simulador y corren aparte. */
const PRUEBAS_DE_API = /(api|build)\.spec\.ts$/;

/**
 * Pruebas de extremo a extremo con Playwright y axe.
 * Corren contra la compilación de producción (`next build` + `next start`) y la API simulada (DEC-90): las
 * pruebas de API pasan por el rewrite de Next, igual que el navegador.
 */
export default defineConfig({
  testDir: "./pruebas",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: URL_BASE,
    trace: "retain-on-failure",
    locale: "es-MX",
    timezoneId: "America/Mexico_City",
  },
  projects: [
    {
      name: "escritorio",
      testIgnore: PRUEBAS_DE_API,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "movil",
      testIgnore: PRUEBAS_DE_API,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
      },
    },
    {
      name: "api",
      testMatch: PRUEBAS_DE_API,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "npm run simulador",
      url: `${URL_SIMULADOR}/__simulador/salud`,
      reuseExistingServer: !process.env.CI,
      env: { PUERTO: String(PUERTO_SIMULADOR) },
      timeout: 30_000,
    },
    {
      command: `npm run build && npm run start -- --port ${PUERTO}`,
      url: URL_BASE,
      reuseExistingServer: !process.env.CI,
      env: { API_URL_INTERNA: URL_SIMULADOR },
      timeout: 240_000,
    },
  ],
});
