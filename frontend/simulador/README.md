# API simulada de Echo

Servidor de desarrollo que cumple el contrato `docs/api/openapi.yaml` (DEC-90). Con él, el frontend hace exactamente lo
que hará con el backend de NestJS: el rewrite de `/api`, la cookie `__Host-echo_sesion` y peticiones de red reales.
Cuando exista el backend, solo cambia `API_URL_INTERNA`.

## Uso
Dos terminales, desde `frontend/`:

```bash
npm run simulador
```

```bash
npm run dev
```

`npm run dev` necesita `API_URL_INTERNA=http://localhost:4000` en `frontend/.env.local` (copia `.env.example`).

Variables opcionales del simulador:
- `PUERTO` (4000);
- `ORIGENES_PERMITIDOS` (`http://localhost:3000,http://localhost:3100`), los únicos `Origin` aceptados en mutaciones;
- `LIMITE_POR_IP` (60 cada 10 minutos en inicio de sesión, registro, reenvío, recuperación y cambio de correo).
- `PROXIES_CONFIABLES` (`0`): cuántos proxies propios agregan una entrada a `X-Forwarded-For` entre el navegador y el
  simulador. La IP del cliente es la entrada que agregó el primero, contando desde la derecha (DEC-92); la primera la
  escribe el cliente y nunca se usa. En desarrollo es `0`: `next start` reenvía el encabezado tal como llega y no agrega
  la suya, así que se usa la dirección del socket (la de Next, que es la del mismo equipo).

## Por qué `.mjs` con JSDoc y no `.ts`
Node 22.15 solo ejecuta TypeScript con la bandera experimental `--experimental-strip-types`. Con `.mjs` corre con
`node` sin banderas ni dependencias (`node:http` y `node:crypto`), y las pruebas lo importan directo.

## Datos de ejemplo (INV-14, INV-24)
Todo es inventado y vive en memoria; cada reinicio vuelve al inicio.

| Cuenta | Contraseña | Estado |
|---|---|---|
| `alumno@example.com` (Alma Ejemplo Pérez) | `Ejemplo2026` | Activa. Es la alumna de los escenarios |
| `otra.alumna@example.com` (Berta Muestra López) | `Ejemplo2026` | Activa; ya envió una actividad (sirve para probar INV-07) |
| `pendiente@example.com` (Ciro Prueba) | `Ejemplo2026` | Sin verificar |
| Google simulado: `google.alumna@example.com` (Gala Ejemplo) | — | Sin cuenta: «Continuar con Google» lleva a `/aceptar` |

**Contenido:**
- **2 módulos.** «Ética profesional en TI» tiene 2 cursos; «Propiedad intelectual», 1.
- **Cursos:** cada uno con 2 lecciones de 2 a 4 secciones en Markdown, con subtítulos, listas e imágenes con texto
  alternativo.
- **Evaluables:**
  - una actividad por lección;
  - un caso práctico con decisiones de valor 1, 0.5 y 0;
  - un examen por curso; el del curso 1 tiene 5 preguntas, con una relación de columnas.
- **Documentos legales:** aviso y términos v1.0 publicados el 21/10/2026. Su huella SHA-256 se calcula al arrancar
  desde `docs/legal/` (DEC-28).

Todos los textos dicen «Contenido de ejemplo».

## Reglas que cumple de verdad
- Avance lineal (DEC-03) y avance en porcentaje (DEC-14).
- Calificación solo al enviar (INV-04, DEC-07); la columna derecha de la relación con claves opacas.
- Un intento abierto que se retoma (DEC-19), con orden mezclado por semilla (DEC-09).
- Espera de 20 minutos tras reprobar (DEC-21); un examen aprobado no se repite (DEC-20).
- Mensajes que no delatan cuentas, con la pausa de 15 minutos tras 5 fallos (DEC-77, DEC-26). Siempre se calcula un hash,
  exista o no la cuenta. Aquí es scrypt de `node:crypto`; el backend usará Argon2id (DEC-72).
- Sesión de 30 minutos sin actividad con `X-Sesion-Expira` (DEC-12). En la memoria solo queda la huella SHA-256 del
  código (INV-08).
- Verificación de `Origin` en las mutaciones (DEC-85).
- El alumno solo ve lo suyo (INV-07).
- Aceptaciones con fecha, hora, IP (de `X-Forwarded-For`, nunca del cuerpo) y versión, y bloqueo con
  `ACEPTACION_PENDIENTE` (INV-30).

## Rutas de control (fuera de `/api`: el rewrite de Next nunca las expone)
| Ruta | Para qué |
|---|---|
| `GET /__simulador/salud` | Saber si está arriba |
| `POST /__simulador/reiniciar` | Volver a los datos iniciales |
| `POST /__simulador/escenario` con `{ "nombre": "…" }` | Cambiar el avance de `alumno@example.com` (ver abajo) |
| `GET /__simulador/correos` | Los correos que se habrían enviado, con su enlace y su código (no se envía nada) |
| `GET /__simulador/aceptaciones` | Las aceptaciones registradas: correo, documento, versión, `aceptadoEn` e IP |
| `POST /__simulador/google` | Cambiar la identidad que devuelve el Google simulado (`sub`, `correo`, `nombre`, `apellidos`) |

**Escenarios:**
- `nuevo`: sin avance.
- `a-medias`: lección 1 leída, con su actividad y su caso enviados; la lección 2 va en la sección 1.
- `examen-en-espera`: curso 1 completo y examen reprobado hace 5 minutos (faltan 15).
- `curso-completo`: curso 1 aprobado ayer; el curso 2 queda disponible.
- `sesion-por-expirar`: las sesiones duran 150 s, así que el aviso de 2 minutos aparece a los 30 s de la última petición.
- `version-nueva`: publica el aviso 1.1, que requiere aceptación.

## Nunca entra al build
Nada de `src/` lo importa:
- la regla `no-restricted-imports` de ESLint lo impide;
- `pruebas/build.spec.ts` busca su marca (`SIMULADOR_ECHO_NO_PRODUCCION`) en `.next/`.
