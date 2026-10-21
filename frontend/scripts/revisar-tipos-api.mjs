// Revisa que src/lib/api/esquema.d.ts esté al día con docs/api/openapi.yaml: lo regenera en una carpeta temporal
// y lo compara. Si difiere, `npm run tipos` falla y pide correr `npm run api:tipos`.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("..", import.meta.url));
const carpeta = mkdtempSync(join(tmpdir(), "echo-tipos-api-"));
const generado = join(carpeta, "esquema.d.ts");
try {
  execFileSync(process.execPath, [join(raiz, "node_modules/openapi-typescript/bin/cli.js"), join(raiz, "../docs/api/openapi.yaml"), "-o", generado], {
    stdio: "pipe",
  });
  const normalizar = (texto) => texto.replace(/\r\n/g, "\n");
  const actual = normalizar(readFileSync(join(raiz, "src/lib/api/esquema.d.ts"), "utf8"));
  if (normalizar(readFileSync(generado, "utf8")) !== actual) {
    console.error("src/lib/api/esquema.d.ts no coincide con docs/api/openapi.yaml. Corre «npm run api:tipos».");
    process.exit(1);
  }
  console.log("Tipos de la API al día con docs/api/openapi.yaml.");
} finally {
  rmSync(carpeta, { recursive: true, force: true });
}
