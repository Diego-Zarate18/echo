import type { NextConfig } from "next";

/**
 * URL interna del backend (DEC-85): el navegador solo habla con este dominio y /api/* se reescribe hacia ella.
 * Es solo de servidor; nunca NEXT_PUBLIC_* (INV-29). En desarrollo apunta a la API simulada (npm run simulador).
 */
const apiUrlInterna = process.env.API_URL_INTERNA?.replace(/\/$/, "");

/**
 * En producción (`next build` y `next start`) la compilación falla sin ella. `next typegen` (npm run tipos) también
 * carga esta configuración en modo producción, pero no usa la API: ahí no se exige.
 */
function exigirApiUrlInterna() {
  const generandoTipos = process.argv.includes("typegen");
  if (!apiUrlInterna && process.env.NODE_ENV === "production" && !generandoTipos) {
    throw new Error(
      "Falta la variable de entorno API_URL_INTERNA (la URL interna del backend, por ejemplo http://localhost:4000 " +
        "con la API simulada). Cópiala de frontend/.env.example a .env.local o defínela en Railway.",
    );
  }
}

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    exigirApiUrlInterna();
    if (!apiUrlInterna) return [];
    return [{ source: "/api/:ruta*", destination: `${apiUrlInterna}/api/:ruta*` }];
  },
};

export default nextConfig;
