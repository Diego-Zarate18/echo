import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // La API simulada nunca entra al build de producción (DEC-90): nada de src/ la importa.
  {
    files: ["src/**/*.{ts,tsx,js,jsx,mjs}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/simulador", "**/simulador/**"],
              message: "La API simulada es solo para desarrollo y pruebas; la app habla con /api (lib/api).",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generado por openapi-typescript (npm run api:tipos).
    "src/lib/api/esquema.d.ts",
  ]),
]);

export default eslintConfig;
