# Echo — Arquitectura del frontend

Se basa en el grafo de conocimiento v1.3.0 del repositorio, en CLAUDE.md y en la página «Vistas de la app» de Figma (dirección «Tierra», DEC-82). Las decisiones marcadas como **[por aprobar]** todavía no están en el grafo. Si se aceptan, se registran como nodos nuevos.

---

## 1. Principios

1. **El frontend solo presenta.** No toca la base de datos (INV-26). No califica, no decide desbloqueos y no calcula avance: lo hace el backend (INV-04, INV-06). Ocultar un botón es solo apariencia; la regla vive en el servidor.
2. **Mismo origen para el navegador.** El navegador solo habla con el dominio del frontend. Las llamadas a la API pasan por `/api/*`, y Next.js las reenvía al backend por la red privada de Railway (ver §3).
3. **Componentes de servidor por defecto.** Solo es componente de cliente lo que tiene interacción: formularios, cuestionarios, menús y el aviso de sesión. Así se manda menos JavaScript, algo que importa con conexiones lentas y lectores de pantalla.
4. **Accesibilidad desde el primer componente.** El objetivo es WCAG 2.2 AA (DEC-71), y se prueba con axe y NVDA (TEC-A11Y). No se deja para el final.
5. **Todo en español** (DEC-76): carpetas, archivos, componentes y funciones, sin acentos ni ñ. Las excepciones son lo que exige Next.js (`page.tsx`, `layout.tsx`, `proxy.ts`, `route.ts`, `not-found.tsx`, etc.).
6. **Pocas dependencias.** Cada dependencia nueva requiere aprobación (CLAUDE.md). La lista está en §12.

---

## 2. Versiones

| Pieza | Versión | Nota |
|---|---|---|
| Next.js | **16.4.2** exacto | Última estable (15/10/2026). App Router, Turbopack por defecto. |
| React / React DOM | 19.3.0 (la que instala Next 16.4.2) | No se instala por separado. |
| TypeScript | 5.x en modo `strict` | |
| Node.js | **22 LTS** (≥ 22.12) | Next 16 pide Node ≥ 20.9. Node 22 tiene soporte hasta abril de 2027, más allá del cierre del piloto. Es la versión que usa el equipo; la misma en local y en Railway (`engines` + `.nvmrc`). |
| Tailwind CSS | 4.x | Viene con `create-next-app`. Los tokens de marca van en `@theme` (§9). |
| Gestor de paquetes | npm con `save-exact=true` | Igual que con Prisma: versiones exactas, sin `^` ni `~`. |

> Con Next 16, el antiguo `middleware.ts` ahora se llama **`proxy.ts`**. Además, `next lint` ya no existe: se usa `eslint` directamente.

---

## 3. Cómo se comunica con el backend

```
Navegador ──HTTPS──▶ Frontend Next.js (echo-web, dominio público)
                      │  /iniciar-sesion, /modulos, ...   → páginas
                      │  /api/*  ──rewrite──┐
                      │                     ▼
                      │        Backend NestJS (red privada: backend.railway.internal)
                      │                     │
                      └─ Componentes de     ▼
                         servidor ──────▶ PostgreSQL 18 (solo el backend)
                         (fetch interno con la cookie del alumno)
```

**Por qué así:**

- **La cookie de sesión no se podría compartir de otro modo.** Railway publica cada servicio en un subdominio de `up.railway.app`. Ese dominio está en la Public Suffix List, así que el navegador no comparte cookies entre `echo-web.up.railway.app` y `echo-api.up.railway.app`. Con el rewrite, la cookie (DEC-12) es del mismo dominio que la página.
- **No hace falta CORS.** Y el backend no necesita dominio público, solo el frontend.
- **Google OAuth funciona igual.** El botón «Continuar con Google» lleva a `/api/auth/google`. El backend redirige a Google, Google vuelve a `/api/auth/google/callback` (mismo dominio), el backend crea la sesión y redirige a `/modulos`.

**La cookie** (la define el backend, aquí solo se documenta):

- Nombre `__Host-echo_sesion`.
- Atributos `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, sin `Domain`.
- El frontend nunca la lee con JavaScript ni la guarda en `localStorage`.

**CSRF:**

- `SameSite=Lax` es la primera barrera.
- Además, el backend rechaza cualquier `POST/PUT/PATCH/DELETE` cuyo `Origin` no sea el dominio del frontend.

**Dos clientes de API** en `src/lib/api/`:

| Cliente | Dónde se usa | A dónde llama | Cookie |
|---|---|---|---|
| `servidor.ts` (`import 'server-only'`) | Componentes de servidor y `layout.tsx` | `API_URL_INTERNA` (red privada) | La reenvía leyendo `cookies()` |
| `navegador.ts` | Componentes de cliente (formularios, cuestionarios) | `/api/...` (mismo origen) | El navegador la manda solo |

Los dos devuelven datos tipados y convierten los errores de la API en un tipo `ErrorApi` con un `codigo`. Los textos para el alumno salen de un solo archivo de mensajes (§10), nunca del texto técnico del backend.

- **Contrato:** `docs/api/openapi.yaml` (DEC-90) es la fuente de verdad de la API hasta que exista el backend.
  `npm run api:tipos` genera `src/lib/api/esquema.d.ts` con `openapi-typescript`; las funciones de los dos clientes se
  llaman como los `operationId`. `servidor.ts` solo expone las lecturas; las mutaciones van desde `navegador.ts`.
- **Resultados sin excepciones:** cada llamada devuelve `{ ok: true, datos, expiraEn }` o `{ ok: false, error }`. Los
  textos de cada `codigo` están en `src/lib/api/mensajes.ts`, que es exhaustivo: si falta un código, no compila.

**En desarrollo, la API simulada** (`frontend/simulador/`, DEC-90) ocupa el lugar del backend:

```
Navegador ──▶ next dev (:3000) ── /api/* ──rewrite──▶ API simulada (:4000, node:http, datos en memoria)
```

- Se corren en dos terminales: `npm run simulador` y `npm run dev`, con `API_URL_INTERNA=http://localhost:4000` en
  `.env.local`.
- Cumple el contrato y sus reglas (avance lineal, calificación al enviar, espera, DEC-77, sesión de 30 minutos, `Origin`,
  aceptaciones) y trae escenarios en `/__simulador/*`, fuera de `/api`, así que el rewrite nunca los expone.
- Nunca entra al build: ESLint prohíbe importarlo desde `src/` y una prueba lo busca en `.next/`.
- Cuando exista el backend de NestJS, solo cambia `API_URL_INTERNA`.

---

## 4. Estructura de carpetas

```
echo/                          ← repositorio Diego-Zarate18/echo
├─ ai/context/grafo-conocimiento.json
├─ CLAUDE.md
├─ backend/                    ← NestJS (se define después)
└─ frontend/
   ├─ .nvmrc  .npmrc (save-exact=true)  next.config.ts  eslint.config.mjs  tsconfig.json
   ├─ DESIGN.md                ← sistema visual «Tierra» (DEC-82), escrito a partir de Figma
   ├─ public/
   │  ├─ marca/                ← logos (claro/oscuro), favicon, Moris (5 expresiones)
   │  └─ imagenes/             ← imágenes de contenido e insignias; la BD guarda su ruta (DEC-31)
   ├─ pruebas/                 ← Playwright: flujos completos + axe por pantalla; api.spec.ts (contrato e invariantes)
   ├─ simulador/               ← API simulada de desarrollo (DEC-90); nunca entra al build
   ├─ scripts/                 ← generar-iconos.mjs, revisar-tipos-api.mjs
   └─ src/
      ├─ app/                  ← solo rutas (§5); cada page.tsx es delgada
      ├─ areas/                ← lógica por área, mismo nombre que los MOD-* del grafo
      │  ├─ aviso/             ← Aviso de privacidad SCR-05: texto de docs/legal (contenido.ts)
      │  ├─ terminos/          ← Términos y condiciones SCR-20: texto de docs/legal (contenido.ts)
      │  ├─ ayuda/             ← Ayuda SCR-17: preguntas fijas (contenido.ts) y acordeón
      │  ├─ inicio/            ← sitio público SCR-18 (DEC-83): Encabezado, Presentacion,
      │  │                        QueEsEcho, QueEncontraras, PorQueEcho, QuienesSomos, Llamado
      │  ├─ cuenta/            ← formularios de acceso, perfil, mensajes de DEC-77
      │  ├─ contenido/         ← tarjetas de módulo/curso, lector de lección, buscador
      │  ├─ evaluables/        ← actividad y casos (SCR-10)
      │  ├─ examen/            ← portada, resolución, resultado (SCR-11..13)
      │  ├─ progreso/          ← barras, insignias (SCR-14)
      │  └─ resultados/        ← historial y filtros (SCR-15)
      │     └─ (cada área: componentes/, acciones.ts, tipos.ts, esquemas.ts)
      ├─ componentes/
      │  ├─ ui/                ← primitivos accesibles: Boton, Campo, CampoContrasena,
      │  │                        Alerta, Dialogo, Menu, Selector, BarraProgreso, Insignia, Estado
      │  ├─ marca/             ← Logo, Moris
      │  └─ estructura/        ← Encabezado, MenuPrincipal, BarraInferior (DEC-80),
      │                           Pie, SaltarAlContenido, AvisoSesion, EncabezadoInterno,
      │                           IndicePagina («En esta página» del aviso, los términos y Ayuda),
      │                           PaginaDeDocumentoLegal (aviso y términos)
      ├─ lib/
      │  ├─ api/               ← esquema.d.ts (generado), operaciones.ts, cliente.ts, servidor.ts,
      │  │                        navegador.ts, errores.ts, mensajes.ts (código de error → texto en español)
      │  ├─ markdown/          ← convertidor mínimo de Markdown a elementos de React (DEC-57)
      │  ├─ contacto.ts        ← correos de soporte y de privacidad (DEC-68)
      │  ├─ sesion.ts          ← obtenerSesion() en el servidor
      │  └─ fechas.ts          ← Intl en es-MX, America/Mexico_City, DD/MM/AAAA, 24 h (INV-03)
      ├─ estilos/
      │  └─ globales.css       ← @import "tailwindcss"; @theme con los tokens de marca
      └─ proxy.ts              ← redirección rápida si no hay cookie (§7)
```

**Reglas de la estructura:**
- `app/` solo arma la página. La lógica y los componentes van en `areas/`.
- Un área no importa archivos internos de otra. Lo que compartan sube a `componentes/` o `lib/`.
- Las áreas `sistema` y `carga` del grafo no tienen pantallas, así que no aparecen aquí.
- `inicio` no es un módulo del grafo: es el sitio público (DEC-83).

---

## 5. Rutas y pantallas

Los grupos entre paréntesis no aparecen en la URL; solo eligen el `layout`.

| Ruta | Pantalla | Grupo / layout | Sesión |
|---|---|---|---|
| `/` | SCR-18 Inicio público | `(publico)` | No |
| `/aviso-de-privacidad` | SCR-05 Aviso | `(publico)` | No |
| `/terminos-y-condiciones` | SCR-20 Términos y condiciones | `(publico)` | No |
| `/ayuda` | SCR-17 Ayuda | `(publico)`; si hay sesión muestra el encabezado de la app | No |
| `/iniciar-sesion` | SCR-01 | `(acceso)` | No (con sesión → `/modulos`) |
| `/registro` | SCR-02 | `(acceso)` | No |
| `/verificar-correo` | SCR-03 («revisa tu correo» y resultado del enlace `?codigo=`) | `(acceso)` | No |
| `/recuperar-contrasena` | SCR-04 paso 1 | `(acceso)` | No |
| `/recuperar-contrasena/nueva?codigo=` | SCR-04 paso 2 | `(acceso)` | No |
| `/modulos` | SCR-06 Módulos (inicio) + buscador `?q=` | `(app)` | Sí |
| `/modulos/[modulo]` | SCR-07 Módulo | `(app)` | Sí |
| `/modulos/[modulo]/[curso]` | SCR-08 Curso | `(app)` | Sí |
| `/modulos/[modulo]/[curso]/[leccion]` | SCR-09 Lección (`?seccion=n`) | `(app)` | Sí |
| `/actividades/[cuestionario]` | SCR-10 Actividad o caso | `(app)` | Sí |
| `/examenes/[cuestionario]` | SCR-11 Portada | `(app)` | Sí |
| `/examenes/[cuestionario]/resolver` | SCR-12 Resolución (intento en curso, lo da el servidor) | `(app)` | Sí |
| `/examenes/[cuestionario]/resultado/[intento]` | SCR-13 Resultado | `(app)` | Sí |
| `/mi-progreso` | SCR-14 | `(app)` | Sí |
| `/mis-resultados` | SCR-15 (filtros en `?modulo=&tipo=&desde=&hasta=`) | `(app)` | Sí |
| `/mis-resultados/[intento]` | SCR-15 detalle | `(app)` | Sí |
| `/perfil` | SCR-16 | `(app)` | Sí |

**Cómo se identifica cada cosa en las rutas:**
- Módulo, curso y lección usan su **slug** (DEC-39), no el id.
- Los cuestionarios usan su id `BIGINT`, que es contenido público.
- Los intentos usan su UUID v7. Aun así, el backend verifica que sean del alumno (INV-07).

Cada grupo tiene sus propios `loading.tsx`, `error.tsx` y `not-found.tsx` en español. `error.tsx` nunca muestra el error técnico.

---

## 6. Servidor o cliente

| Componente de servidor (por defecto) | Componente de cliente (`'use client'`) |
|---|---|
| Inicio público, aviso, ayuda | Formularios de acceso, registro, recuperación y perfil |
| Lista de módulos, módulo, curso | Buscador (actualiza `?q=` en la URL) |
| Lección (el texto llega ya renderizado) | Navegación entre secciones y «Terminé la lección» |
| Portada y resultado de examen | Actividad, caso y resolución de examen |
| Mi progreso, Mis resultados (lista) | Filtros de Mis resultados, menú del nombre, barra inferior |
| Encabezado y pie | `AvisoSesion` (cuenta regresiva y «Seguir conectado») |

**Datos y caché:**
- Todo lo del alumno es dinámico (`cache: 'no-store'`), porque depende de la sesión.
- Las páginas públicas (`/`, aviso, términos, ayuda) son estáticas. Los textos legales se leen de `docs/legal/` al compilar.
- Se conserva `cacheComponents: true`, que trae la plantilla de Next 16.4.2. Las páginas públicas quedan estáticas; las lecturas que dependen de la sesión (`cookies()`, datos del alumno) van dentro de `<Suspense>` y **nunca** se marcan con `'use cache'`. Antes de usarlo, leer `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md`.

**Mutaciones:** desde el cliente con `navegador.ts` (`fetch` a `/api`). Después se llama a `router.refresh()` para que los componentes de servidor vuelvan a leer. **[por aprobar]** No se usan Server Actions. Así hay un solo camino hacia la API, y el `Set-Cookie` del backend llega intacto al navegador.

**Examen (SCR-12):**
- Cada respuesta se guarda en el servidor al elegirla, y un indicador muestra «Guardado» o «Sin conexión».
- No se guardan respuestas en el navegador, así que lo que muestra la pantalla es lo que tiene el servidor.
- Al reconectar se reintenta el último guardado.
- No hay cronómetro.

---

## 7. Sesión y protección de rutas

1. **`proxy.ts`: chequeo optimista.** Si una ruta de `(app)` llega sin la cookie, redirige a `/iniciar-sesion?volver=/ruta`. No valida nada más; solo ahorra una ida al backend.
2. **`(app)/layout.tsx`: validación real.** Llama a `obtenerSesion()`, que hace `GET /api/sesion` por la red privada. Si responde 401, redirige a `/iniciar-sesion?motivo=expirada`, y la pantalla de inicio de sesión muestra «Tu sesión terminó por inactividad».
3. **El backend valida cada petición de nuevo.** El layout no es la seguridad: lo es el backend (INV-06, INV-07).
4. **Aviso de expiración.** La sesión dura 30 minutos sin actividad (DEC-12).
   - `GET /api/sesion` devuelve `expiraEn`, y cada respuesta de la API la actualiza en un encabezado.
   - Dos minutos antes, `AvisoSesion` abre un diálogo accesible: no roba el foco sin avisar y se anuncia con `role="alertdialog"`.
   - El diálogo ofrece «Seguir conectado», que renueva la sesión.
   - Si el tiempo se agota, redirige igual que en el punto 2.
5. **`volver`.** Solo se aceptan rutas internas que empiecen con `/`, para que no se pueda usar como redirección abierta.

---

## 8. Formularios

- Etiqueta visible en todos los campos y error junto al campo, enlazado con `aria-describedby`.
- Al enviar con errores aparece un resumen arriba que recibe el foco, más una región `aria-live`.
- La validación del cliente usa **Zod** **[por aprobar]** y es solo de ayuda; la que manda es la del backend.
- Los textos de seguridad son **exactos**: se copian de `DEC-77 › detalles.textos_sugeridos` del grafo a `lib/api/mensajes.ts`. Por ejemplo:

  | Situación | Texto (DEC-77) |
  |---|---|
  | Cualquier fallo de inicio de sesión, incluida la cuenta bloqueada | «El correo o la contraseña no son correctos. Tras 5 intentos fallidos, el acceso se pausa 15 minutos.» |
  | Registro enviado (siempre) | «Revisa tu correo. Te enviamos un mensaje para continuar.» |
  | Recuperación enviada (siempre) | «Si hay una cuenta con contraseña para ese correo, te enviamos un enlace que vence en 30 minutos. Si entras con Google, no necesitas contraseña.» |

  No existe un estado «cuenta bloqueada» con hora de desbloqueo (DEC-77 revisada en v1.3.0), aunque Figma lo dibuje.

- `CampoContrasena` tiene un botón para mostrar u ocultar la contraseña y muestra la regla de 8 o más caracteres con letra y número (DEC-25) antes de que el alumno se equivoque.
- La etiqueta del campo de apellidos es «Apellidos», con la ayuda «Al menos el primero» (DEC-22).
- Los correos se normalizan antes de enviarlos: sin espacios y en minúsculas (INV-12). El backend los normaliza de nuevo.

---

## 9. Estilos y sistema visual

La dirección visual ya está elegida: **«Tierra» (DEC-82)**. La fuente es Figma, archivo `1zggHPVnKEPlt7khBbtWTt`, página «Vistas de la app» (`66:2`). Los prototipos HTML anteriores (Semilla, Palabras, Ruta, Invernadero) quedan descartados (DEC-84).

- **Tokens:** las variables de Figma pasan a `@theme` de Tailwind 4 en `src/estilos/globales.css`, con el mismo nombre:
  - `marca/cafe` `#3D2213`, `marca/crema` `#FBF3E9`, `marca/menta` `#67EEC9`, `marca/bosque` `#3E6A59`;
  - `texto/secundario` `#6B4A36`, `superficie/hundida` `#F1E6D7`;
  - y las que aparezcan en los componentes de Figma. No se inventan colores fuera de esas variables ni de la página Identidad.
- **Reglas de «Tierra»:**
  - Café como fondo principal y crema en secciones claras, **sin degradados**.
  - Menta solo para íconos y acentos sobre fondo oscuro, nunca como color de texto sobre crema.
  - Botón principal crema con texto café; secundario de contorno crema.
  - Hero como tarjeta redondeada de 32 px; vidrio sutil (crema al 5–8 % con desenfoque).
  - Íconos de trazo 1.75, exportados de Figma.
- **Fuentes** con `next/font/google`: Nunito para títulos y botones, Nunito Sans para lectura. Next las descarga al compilar y las sirve desde el propio dominio, así que el navegador del alumno no hace ninguna petición a Google.
- **Componentes:** los de Figma («Componentes · Acceso» `66:3` y «Componentes · App» `82:253`) se vuelven componentes de `src/componentes/` con los mismos estados.
- `prefers-reduced-motion` desactiva las animaciones que no sean esenciales.
- **DESIGN.md** se escribe en la primera tarea, a partir de las variables y los componentes de Figma.
- **Moris, logos e íconos** se exportan de Figma (SVG cuando se pueda), nunca se redibujan. Moris nunca se deforma, recolorea ni tapa. El logo se usa en la versión que corresponde al fondo.
- **Insignias:** sello con Moris (DEC-81). Si está pendiente: sello atenuado, candado y el texto «Pendiente: te faltan N cursos».

### 9.1 Sitio público (DEC-78, DEC-83, DEC-84)

El sitio web del proyecto **es la ruta `/` de esta misma app**, no un servicio aparte:

- Vive en el grupo `(publico)` junto con el aviso de privacidad y la ayuda, y comparte dominio, fuentes, tokens y pie.
- Se genera **estático** al compilar. No consulta al backend.
- Con sesión activa redirige a `/modulos` (DEC-78). Lo hace `proxy.ts` al ver la cookie; se implementa junto con la sesión.
- `app/(publico)/page.tsx` solo acomoda las secciones de `src/areas/inicio/componentes/`, en el orden de Figma (`84:476`, móvil `84:706`):

  | Componente | Contenido |
  |---|---|
  | `EncabezadoPublico.tsx` | Logo, anclas (Qué es Echo, Qué encontrarás, Por qué Echo, Quiénes somos), «Iniciar sesión» y «Crear cuenta»; en móvil, botón de menú |
  | `Presentacion.tsx` | Hero «Lo que construyes, regresa.», Moris, ejemplo de ruta y botones «Crear cuenta» y «Ver cómo funciona» |
  | `QueEsEcho.tsx` | Qué es Echo, para quién, «¿Sabías que…?» de Moris y fundamentos |
  | `QueEncontraras.tsx` | Lecciones, actividades, casos, examen, progreso e insignias |
  | `PorQueEcho.tsx` | Lo que hace distinta a Echo (seis puntos) |
  | `QuienesSomos.tsx` | Equipo, docente y logos institucionales |
  | `Llamado.tsx` | «Tu primera lección te espera.» con Moris |

- No lleva formulario propio (DEC-78).
- El aviso del piloto académico (vigente hasta diciembre de 2026) **no** va en el inicio: se explica en el Aviso de privacidad (SCR-05) y en la Ayuda (SCR-17, `#cierre-del-piloto`), según DEC-78 v1.3.1.
- Se apaga con todo lo demás al cerrar el proyecto (OP-38).

## 10. Accesibilidad (DEC-71), en concreto

- Enlace «Saltar al contenido» y landmarks: `header`, `nav` (dos, con nombre), `main` y `footer`.
- Un solo `h1` por página.
- Foco visible propio, con contraste de 3:1 contra el fondo.
- Al cambiar de ruta, Next anuncia el título. Cada página exporta su `metadata.title`: «Lección 2 · Curso X · Echo».
- Los estados bloqueado, disponible y completado se muestran siempre con ícono y texto.
- Relación de columnas: un `<select>` por elemento, sin arrastrar (INV-13).
- Áreas táctiles de al menos 24 × 24 px; en la barra inferior, 48 px y quiebre en 768 px (DEC-80).
- Las imágenes usan siempre `next/image` con `alt` obligatorio, que es el texto alternativo de la tabla `imagen`.
- Las fechas se muestran como DD/MM/AAAA, con `<time dateTime>`.
- Pruebas:
  - axe automático en cada pantalla (Playwright).
  - Lighthouse en CI.
  - Prueba manual con NVDA y solo teclado antes de cada entrega a los participantes.

---

## 11. Seguridad del lado del frontend

Encabezados en `next.config.ts`:

- `Content-Security-Policy`:
  - `default-src 'self'`; `img-src 'self' data:`; `frame-ancestors 'none'`; `form-action 'self'`.
  - Para permitir los scripts de Next se usa un nonce generado en `proxy.ts`.
- `Referrer-Policy: no-referrer`, porque los enlaces de verificación y recuperación llevan el código en la URL.
- `X-Content-Type-Options: nosniff`.
- `Permissions-Policy` con cámara, micrófono y ubicación desactivados.

Además:

- Al abrir `?codigo=`, la página lo envía al backend y lo **quita de la URL** con `router.replace`.
- **Sin analítica ni scripts de terceros.** Así se cumple INV-22 y no hay nada que declarar en el aviso de privacidad.
- Solo hay variables de entorno de servidor. No existe ninguna `NEXT_PUBLIC_*`, porque el navegador no necesita la URL del backend.

---

## 12. Dependencias propuestas [por aprobar]

**Aprobadas e instaladas (Tarea 05, 21/10):** `server-only` 0.0.1 y `openapi-typescript` 7.13.0 (desarrollo), con versión exacta.

| Paquete | Para qué | ¿Necesaria? |
|---|---|---|
| `next`, `react`, `react-dom`, `typescript`, `tailwindcss`, `eslint`, `eslint-config-next` | Base de `create-next-app` | Sí |
| `server-only` | Impide que `lib/api/servidor.ts` termine en el navegador | Sí, instalada |
| `zod` | Validar formularios y respuestas de la API | Recomendada |
| `react-aria-components` | Menús, diálogos, selectores y pestañas accesibles, probados con lectores de pantalla. Evita reinventar el manejo del foco | Recomendada |
| `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` | Pruebas de componentes y utilidades | Sí (desarrollo) |
| `@playwright/test`, `@axe-core/playwright` | Flujos completos y accesibilidad automática | Sí (desarrollo) |
| `prettier`, `prettier-plugin-tailwindcss` | Formato uniforme | Recomendada (desarrollo) |
| `openapi-typescript` | Generar los tipos de la API desde `docs/api/openapi.yaml` (después, desde el de Nest) | Sí (desarrollo), instalada |

**Descartadas por ahora:**
- Gestores de estado globales (Redux, Zustand) y TanStack Query: con componentes de servidor no hacen falta.
- Librerías de animación y librerías de íconos completas: los íconos serán SVG propios en `componentes/ui/iconos/`.
- i18n: la app solo está en español de México.

---

## 13. Calidad y despliegue

**Scripts de `package.json`:**
- `dev`, `build`, `start`.
- `lint` (`eslint .`).
- `tipos` (`tsc --noEmit`).
- `prueba` (vitest).
- `prueba:e2e` (playwright).

**CI en GitHub Actions** sobre `development` y en cada PR a `main`: lint, tipos, pruebas, build, y axe sobre las pantallas públicas.

**Railway:**
- Servicio `frontend`:
  - Root directory `frontend/`.
  - `output: 'standalone'` en `next.config.ts`, para una imagen más pequeña y menos memoria dentro de los 512 MB (DEC-70).
  - Arranque con `node .next/standalone/server.js`.
- Variables de entorno: `API_URL_INTERNA=http://backend.railway.internal:<puerto>`.
  - Es la única que hace falta.
  - **Tiene que estar disponible al compilar.** Next escribe el destino del rewrite en `.next/routes-manifest.json`
    durante `next build`, y `next start` no lo vuelve a leer (comprobado el 21/10: con otra URL al arrancar, `/api/*` sigue
    yendo a la del build). Railway pasa las variables del servicio al build, así que basta definirla ahí. Sin ella,
    `next build` falla con un mensaje claro.
- Healthcheck en `/api/salud` (lo responde el backend a través del rewrite) o en una ruta propia `/salud`.

---

## 14. Lo que esta arquitectura le pide al backend

Esto sirve de entrada para definir el backend:

1. **Todas las rutas bajo el prefijo `/api`.** Así el rewrite es directo.
2. **Cookie de sesión** `__Host-echo_sesion` con los atributos de §3, y verificación de `Origin` en las mutaciones.
3. **`GET /api/sesion`.** Devuelve `{ nombre, apellidos, metodoAcceso, expiraEn }`. Más un encabezado con la expiración en cada respuesta, y `POST /api/sesion/renovar`.
4. **Errores con forma fija.** `{ codigo, mensaje }`, donde `codigo` sale de la lista cerrada `CodigoError` de `docs/api/openapi.yaml` (la tabla completa está en `docs/api/README.md`).
5. **Un OpenAPI equivalente al contrato.** Mientras no existe el backend, `docs/api/openapi.yaml` es la fuente de verdad (DEC-90). El que genere Nest debe ser equivalente: mismas rutas, `operationId`, esquemas y códigos. El frontend genera sus tipos con `openapi-typescript`, así un cambio en la API rompe la compilación y no la pantalla.
6. **Google OAuth.** `GET /api/auth/google` y `GET /api/auth/google/callback`. La redirect URI registrada en Google es la del dominio del frontend.
7. **Contenido de lecciones en Markdown (DEC-57).** `seccion.cuerpo` llega como texto Markdown sin HTML. El frontend tiene un convertidor propio en `src/lib/markdown/` que produce elementos de React, nunca HTML en cadena ni `dangerouslySetInnerHTML`. Hoy cubre el subconjunto de los textos legales (títulos, párrafos, negritas, listas, casillas, citas y tablas) y falla con el número de línea ante lo que no reconoce. La vista de Lección lo ampliará con imágenes.

---

## 15. Comandos para crear el proyecto

Probados el 19/10/2026: `create-next-app@16.4.2` con estas opciones y luego `crear-estructura.sh` compilan sin errores (`npm run build`).

Desde la raíz del repositorio (el script vive en `docs/frontend/crear-estructura.sh`; en Windows, desde Git Bash):

```bash
# 1. Versión de Node
node -v            # debe ser v22.x (22.12 o mayor)

# 2. Crear el proyecto con la versión exacta de Next
npx create-next-app@16.4.2 frontend \
  --ts --eslint --tailwind --app --src-dir \
  --import-alias "@/*" --use-npm --disable-git --yes
#   --disable-git: el repositorio ya existe; no se crea otro dentro de frontend/.
#   --yes: acepta lo demás por defecto (Turbopack sí, React Compiler no).

# 3. Estructura de carpetas, versiones exactas y Node 22
cd frontend
bash ../docs/frontend/crear-estructura.sh

# 4. Dependencias (solo las que se aprueben en §12)
npm install server-only zod react-aria-components
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom \
  @playwright/test @axe-core/playwright prettier prettier-plugin-tailwindcss
```

**Qué hace `crear-estructura.sh`** (no borra nada):

- Crea las carpetas de §4 y §5, con `.gitkeep` en las vacías.
- Mueve `src/app/globals.css` a `src/estilos/globales.css` y corrige la importación en `layout.tsx`.
- Escribe `.npmrc` (`save-exact=true`) y `.nvmrc` (`22`).
- Quita `^` y `~` de `package.json` usando las versiones ya instaladas, agrega `engines.node` y actualiza el `package-lock.json`.

No se crea antes de `create-next-app` porque este se niega a trabajar en una carpeta que ya tiene archivos.

**Después:**

1. La página de ejemplo `src/app/page.tsx` atiende `/`. Cuando exista `src/app/(publico)/page.tsx`, hay que borrar la de ejemplo: las dos no pueden servir la misma ruta.
2. `create-next-app` también genera un `AGENTS.md` con indicaciones de Next.js para agentes. Se puede conservar; CLAUDE.md sigue mandando.
3. Agrega los comandos reales a CLAUDE.md (sección «Comandos»).

---

## 16. Cambios al grafo que propone este documento

**Ya registrados en el grafo v1.3.0 (19/10):**

- **DEC-83, sitio público dentro de la app de Next.js.** SCR-18 en la ruta `/`, render estático y redirección con sesión en `proxy.ts`.
- **DEC-84, paso del diseño «Tierra» de Figma a Next.js.** Variables como tokens, componentes de Figma como componentes de React y assets exportados.

**Registrados en el grafo v1.4.0 (21/10):** DEC-85, DEC-86, DEC-90 e INV-29.

**Lo que este documento propuso y ya quedó en el grafo 1.4.0:**

- **DEC-85, frontend con mismo origen.** El rewrite `/api/*` a la red privada, la cookie `__Host-` y la verificación de `Origin`. Depende de DEC-12 y DEC-64.
- **DEC-86, estructura y convenciones del frontend.** Áreas iguales a los MOD-* (más `inicio`), componentes de servidor por defecto, sin Server Actions y versiones exactas.
- **Ruta de cada pantalla.** Se agrega `detalles.ruta` a SCR-01..17 con la tabla de §5 (SCR-18 ya la tiene).
- **Tecnologías nuevas.** Next.js 16.4.2 fijado, Tailwind 4, React Aria, Zod, Vitest y Playwright.
- **INV-29.** Ningún secreto ni dato del alumno en `localStorage`, en variables `NEXT_PUBLIC_*` ni en scripts de terceros.
