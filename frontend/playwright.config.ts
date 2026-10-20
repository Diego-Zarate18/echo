import { defineConfig, devices } from "@playwright/test";

const PUERTO = 3100;
const URL_BASE = `http://localhost:${PUERTO}`;

/**
 * Pruebas de extremo a extremo con Playwright y axe.
 * Corren contra la compilación de producción (`next build` + `next start`).
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
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "movil",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
      },
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- --port ${PUERTO}`,
    url: URL_BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
