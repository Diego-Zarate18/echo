# Echo · frontend

Interfaz web de **Echo**, la plataforma educativa de ética y legislación en TI de la UP Chiapas: Next.js 16
(App Router), React, TypeScript, Tailwind 4 y pruebas con Playwright y axe. Habla solo con la API (`/api/*`); nunca con
la base de datos.

**¿Vas a continuar el frontend?** Empieza por [`docs/frontend/guia-de-relevo.md`](../docs/frontend/guia-de-relevo.md):
qué hay hecho, qué falta, la forma de trabajo y las notas de quien empezó.

## Correrlo con la API simulada

Necesitas Node 22 (`.nvmrc`). En esta carpeta:

```bash
npm install
cp .env.example .env.local        # API_URL_INTERNA=http://localhost:4000
npm run simulador                 # terminal 1: API simulada en http://localhost:4000
npm run dev                       # terminal 2: app en http://localhost:3000
```

Entra con `alumno@example.com` / `Ejemplo2026`. Las demás cuentas, los escenarios y los correos simulados están en
[`simulador/README.md`](simulador/README.md).

## Comandos

| Comando | Para qué |
|---|---|
| `npm run dev` | Servidor de desarrollo (Turbopack) en el puerto 3000 |
| `npm run simulador` | API simulada en el puerto 4000; cumple `docs/api/openapi.yaml` |
| `npm run build` | Compila para producción (necesita `API_URL_INTERNA`) y muestra la tabla de rutas |
| `npm run start` | Sirve la compilación |
| `npm run lint` | ESLint |
| `npm run tipos` | Tipos de rutas y `tsc`; falla si `src/lib/api/esquema.d.ts` no coincide con el contrato |
| `npm run api:tipos` | Regenera `src/lib/api/esquema.d.ts` desde `docs/api/openapi.yaml` |
| `npm run prueba:e2e` | Playwright + axe en escritorio y móvil, y las pruebas de la API; levanta solo el simulador y la app |

Antes de la primera corrida de pruebas: `npx playwright install chromium`.

## Dónde está cada cosa

- `src/app/`: las rutas, por grupo (`(publico)`, `(acceso)`, `(aceptacion)`, `(app)`).
- `src/areas/`: lo propio de cada área; `src/componentes/`: lo compartido.
- `src/lib/api/`: los clientes de la API, el contrato generado y los textos de error.
- `simulador/`: la API simulada (nunca entra al build).
- `pruebas/`: Playwright.
- [`DESIGN.md`](DESIGN.md): el sistema visual «Tierra».
- [`../docs/frontend/arquitectura.md`](../docs/frontend/arquitectura.md): cómo está hecho.
- [`../CLAUDE.md`](../CLAUDE.md): las reglas del proyecto.
