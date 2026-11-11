# Echo · Guía de relevo del frontend

**Para:** la persona del equipo que continúa el frontend.
**Escrita:** 2026-11-10 · sesión de diseño. **Grafo:** 1.6.1.

Esta guía tiene todo lo necesario para construir las pantallas que faltan con la misma forma de trabajo que usamos hasta
ahora: dos asistentes de IA con papeles distintos y tú revisando entre los dos. Léela completa una vez antes de empezar.

---

## 1. Qué es Echo y cuánto falta

Echo es una plataforma web educativa de ética y legislación en TI, lineal (módulos → cursos → lecciones con actividad →
examen por curso) y con bloqueo del avance. El piloto con estudiantes termina a principios de **diciembre de 2026**.

**Ya funciona** (rama `development`), contra la API simulada:

| Ruta | Pantalla |
|---|---|
| `/` | SCR-18 Inicio público |
| `/aviso-de-privacidad`, `/terminos-y-condiciones`, `/ayuda` | SCR-05, SCR-20, SCR-17 |
| `/iniciar-sesion` | SCR-01 |
| `/crear-cuenta` | SCR-02 |
| `/verificar-correo` | SCR-03 |
| `/aceptar` | SCR-19 |
| `/recuperar-contrasena` y `/recuperar-contrasena/nueva` | SCR-04 (Tarea 10) |
| `/modulos` | **Provisional** («Hola, {nombre}» y «Cerrar sesión»); la reemplaza SCR-06 |

**Te toca** (en este orden, porque cada una lleva a la siguiente):

| # | Pantalla | Ruta | Operaciones (OP) | Figma escritorio | Figma móvil |
|---|---|---|---|---|---|
| 1 | SCR-06 Módulos (inicio) + buscador | `/modulos` (`?q=`) | OP-15, OP-21, OP-31 | `85:603`, `85:804` (primer ingreso), `85:1007` (con resultados), `85:1142` (sin resultados) | `98:3327` |
| 2 | Encabezado de la app, pie, barra inferior móvil y aviso de sesión por expirar | todas las de `(app)` | OP-31, OP-05 | componentes `82:463` (Encabezado/Módulos), `82:505`, `82:547`, `82:589` (uno por destino) y `82:630` (Pie de página app); `95:3277` (aviso) | `82:638` (Encabezado móvil); `82:655`, `82:677`, `82:699` (Barra inferior, uno por destino); `149:5480` (aviso como hoja inferior) |
| 3 | SCR-07 Módulo | `/modulos/[modulo]` | OP-16 | `87:910` | `145:4164` |
| 4 | SCR-08 Curso | `/modulos/[modulo]/[curso]` | OP-17 | `87:1051`, `87:1324`, `87:1495` (estados del examen) | `146:4164` |
| 5 | SCR-09 Lección | `/modulos/[modulo]/[curso]/[leccion]` (`?seccion=n`) | OP-18, OP-19, OP-20 | `88:1231`, `88:1377`, `88:1530` | `98:3427` |
| 6 | SCR-10 Actividad o caso práctico | `/actividades/[cuestionario]` | OP-22, OP-23 | `89:1441`, `89:1623`, `89:1808`, `89:1948` | `145:4570`, `145:4744` |
| 7 | SCR-11 Examen: portada | `/examenes/[cuestionario]` | OP-24 | `91:1771`, `91:1910` (estados) | `147:4395` |
| 8 | SCR-12 Examen: resolución | `/examenes/[cuestionario]/resolver` | OP-25, OP-26, OP-27 | `91:1971`, `91:2119` (sin conexión), `91:2275` (pendientes) | `98:3505` |
| 9 | SCR-13 Examen: resultado | `/examenes/[cuestionario]/resultado/[intento]` | OP-27 | `92:2063`, `92:2266` | `147:4526`, `147:4721` |
| 10 | SCR-14 Mi progreso | `/mi-progreso` | OP-28 | `93:2244`, `93:2501` | `98:3588` |
| 11 | SCR-15 Mis resultados y detalle | `/mis-resultados`, `/mis-resultados/[intento]` | OP-29, OP-30 | `93:2714`, `93:2974`, `93:3034`, `94:2704` | `147:4856`, `147:5108`, `147:5160` |
| 12 | SCR-16 Perfil | `/perfil` | OP-05, OP-08 a OP-11, OP-14, OP-39, OP-41 | `94:2882`, `94:3057`, `95:2965`, `95:3107`, `95:3201` | `149:4594`, `149:4727`, `149:4816`, `149:5311`, `149:5404` |

Las carpetas de todas estas rutas ya existen en `frontend/src/app/(app)/` (vacías o con un `page.tsx` provisional), y
cada área tiene su carpeta en `frontend/src/areas/` (`contenido`, `evaluables`, `examen`, `progreso`, `resultados`).

**Figma:** archivo `1zggHPVnKEPlt7khBbtWTt`, página «Vistas de la app» (`66:2`). Pide acceso a Brian. Los móviles están
en las filas «Vistas móviles» al final de la página.

**Ojo con el Perfil (SCR-16):** el escritorio de Figma está desactualizado. Usa el **móvil** (`149:4594`) como
referencia para la sección «Privacidad», «Descargar mis datos» y los requisitos de contraseña (**8 caracteres o más, al
menos una letra y un número**, no 12 caracteres).

---

## 2. Preparar tu computadora

1. **Node 22 LTS** y **git**.
2. Clona y cámbiate a la rama de trabajo:
   ```bash
   git clone https://github.com/Diego-Zarate18/echo.git
   cd echo
   git switch development
   ```
3. Dentro de `frontend/`:
   ```bash
   npm install                      # versiones exactas del package-lock
   npx playwright install chromium  # solo la primera vez, para las pruebas
   cp .env.example .env.local       # API_URL_INTERNA=http://localhost:4000
   ```
   En **PowerShell** de Windows, el tercer paso es `Copy-Item .env.example .env.local`. Los comandos de esta guía
   funcionan tal cual en **Git Bash**.
   `npm install` tarda unos 5 minutos la primera vez y avisa de vulnerabilidades moderadas en dependencias de
   desarrollo. **No corras `npm audit fix`**: cambiaría versiones que están fijas a propósito (`save-exact`); si algo
   hay que actualizar, se pide como tarea.
4. Para trabajar, dos terminales en `frontend/`:
   ```bash
   npm run simulador   # API simulada en http://localhost:4000
   npm run dev         # app en http://localhost:3000
   ```
5. Entra con `alumno@example.com` / `Ejemplo2026`. Cambia el avance de esa cuenta con los escenarios del simulador:
   ```bash
   curl -X POST http://localhost:4000/__simulador/escenario -H "Content-Type: application/json" -d '{"nombre":"a-medias"}'
   ```
   En **PowerShell**, `curl` es otro comando: usa
   `Invoke-RestMethod -Method Post -Uri http://localhost:4000/__simulador/escenario -ContentType "application/json" -Body '{"nombre":"a-medias"}'`.
   Para volver a los datos iniciales: `POST /__simulador/reiniciar` (o reinicia el simulador).
   Escenarios: `nuevo`, `a-medias`, `examen-en-espera`, `curso-completo`, `sesion-por-expirar`, `version-nueva`.
   Todo lo del simulador (cuentas, correos simulados, Google simulado) está en `frontend/simulador/README.md`.

**Comandos que debes conocer** (en `frontend/`):

| Comando | Para qué |
|---|---|
| `npm run lint` | ESLint |
| `npm run tipos` | Tipos de rutas y `tsc`; falla si `esquema.d.ts` no coincide con el contrato |
| `npm run api:tipos` | Regenera los tipos desde `docs/api/openapi.yaml` |
| `npm run build` | Compila y muestra la tabla de rutas (`○` estática, `◐` parcial, `ƒ` dinámica) |
| `npm run prueba:e2e` | Playwright + axe en escritorio y móvil; levanta solo el simulador y la app (≈ 9 min) |

---

## 3. Lo que tienes que leer (y dónde está)

| Archivo | Qué contiene | Cuándo leerlo |
|---|---|---|
| `CLAUDE.md` (raíz) | Reglas del proyecto, stack, comandos, **reglas no negociables** y estilo | Antes de empezar, completo |
| `ai/context/grafo-conocimiento.json` | **La fuente de verdad**: pantallas (SCR-*), operaciones (OP-*), decisiones (DEC-*), invariantes (INV-*), tablas | Por id, cuando lo necesites (busca `"id": "SCR-06"`) |
| `docs/frontend/arquitectura.md` | Cómo está hecho el frontend: carpetas (§4), rutas (§5), servidor o cliente (§6), sesión (§7), formularios (§8), accesibilidad (§10), seguridad (§11) | Antes de la primera pantalla |
| `frontend/DESIGN.md` | Sistema visual «Tierra»: colores con su contraste, tipografía, botones, foco y movimiento | Antes de la primera pantalla |
| `docs/api/openapi.yaml` y `docs/api/README.md` | El contrato de la API: cada operación con su `operationId` y `x-grafo: OP-NN` | Para cada pantalla |
| `frontend/simulador/README.md` | Datos de ejemplo, escenarios y rutas de control | Para probar |
| `frontend/AGENTS.md` | Aviso de Next 16: **leer la guía en `node_modules/next/dist/docs/`** antes de usar una API | Claude Code **no** lo carga solo (solo lee `CLAUDE.md`): pídele en la tarea que lea la guía de Next de lo que vaya a usar |

**Regla de oro:** si Figma y el grafo no coinciden, **manda el grafo** (DEC-84). Las diferencias se anotan, no se
resuelven a gusto.

---

## 4. Cómo está construido el frontend (lo esencial)

**Stack:** Next.js 16.4.2 (App Router, `cacheComponents: true`), React, TypeScript, Tailwind 4, Playwright con axe.
**Sin dependencias nuevas** salvo que se aprueben por nombre.

**Carpetas** (`frontend/src/`):
- `app/(publico)`, `app/(acceso)`, `app/(aceptacion)`, `app/(app)`: los grupos de rutas; cada uno con su layout.
- `areas/<area>/`: lo propio de cada área (componentes, textos, lógica). **Un área no importa piezas de otra**; lo
  compartido sube a `componentes/`.
- `componentes/ui/`: `Boton` (variantes `crema`, `contorno`, `cafe` y `contornoClaro`), `Campo` y `CampoContrasena`
  (con `ayuda` y `describe`), `Casilla`, `Alerta` (tonos `error`, `correo`, `aviso` y `espera`), `ResumenDeErrores`,
  `CorreoEnTexto` e `iconos/`. **Úsalos antes de crear otro.**
- `componentes/estructura/`: `SaltarAlContenido`, `EncabezadoInterno` (páginas públicas internas), `MenuMovil`,
  `PiePublico` (variantes `oscuro`, `claro` y `acceso`), `IndicePagina` y `PaginaDeDocumentoLegal`. **El encabezado,
  el pie y la barra inferior de la app todavía no existen** (fila 2 de la tabla de §1).
- `componentes/marca/`: `Logo`, `Moris`, `MorisVivo`, `Ondas` y `Filamentos`.
- `areas/cuenta/componentes/PantallaDeAcceso.tsx`: el panel café y la columna de las pantallas de acceso; no se usa en
  `(app)`.
- `lib/api/`: `servidor.ts` (componentes de servidor), `navegador.ts` (componentes de cliente), `operaciones.ts`,
  `errores.ts`, `mensajes.ts` (**todos** los textos de error para el alumno) y `esquema.d.ts` (generado, no se edita).
- `lib/sesion.ts` (`obtenerSesion`, `obtenerRegistroGoogle` y `obtenerDocumentosVigentes`, con `cache` de React),
  `lib/rutas.ts` (cookies, `rutaInternaSegura` para `volver`) y `lib/useConsultaDeLaUrl.ts` (leer `?…` en el navegador
  sin volver dinámica la página).
- `estilos/globales.css`: los tokens de color (`@theme`). La paleta de Tailwind está vaciada: **solo existen los colores
  de `DESIGN.md`**.

**Reglas de construcción:**
1. **Nunca se habla con la base de datos**, solo con `/api` (INV-26). El rewrite lleva `/api/*` al backend.
2. **Lecturas** en componentes de servidor con `servidor.ts`, dentro de `<Suspense>` y **sin `'use cache'`** (dependen de
   la sesión). **Mutaciones** desde el cliente con `navegador.ts` y después `router.refresh()`. Sin Server Actions.
3. **La sesión** la valida `(app)/layout.tsx`; `src/proxy.ts` solo revisa que exista la cookie. No dupliques esa lógica.
4. **El avance lineal y la calificación son del servidor** (INV-04, INV-06). La pantalla muestra lo que el backend dice
   que está bloqueado o disponible; nunca lo calcula por su cuenta. El cliente **nunca** recibe la respuesta correcta
   antes de enviar.
5. **Errores:** con el `codigo` que devuelve la API y el texto de `mensajes.ts`. Nunca se muestra un error técnico.
6. **Todo en español**, sin acentos ni ñ en identificadores ni archivos (`verLeccion`, `TarjetaDeCurso.tsx`), salvo
   los nombres que exige el framework (`page.tsx`, `layout.tsx`).
7. **Fechas** DD/MM/AAAA, reloj de 24 h, zona America/Mexico_City.
8. **Sin rachas, puntos ni vidas** (INV-19, INV-20). El producto se llama **Echo**, nunca «Codex».

**Accesibilidad (WCAG 2.2 AA, DEC-71), en cada pantalla:**
- contraste de 4.5:1 en texto y 3:1 en íconos, bordes y foco (ya resuelto si usas los tokens);
- todo funciona con teclado y el foco se ve (anillo de 3 px separado 2 px);
- objetivos de al menos 24 × 24 px;
- etiquetas visibles; cada error ligado a su campo (`aria-describedby`) y un resumen que recibe el foco;
- la relación de columnas se resuelve **sin arrastrar** (lista desplegable o clics; INV-13);
- toda imagen con texto alternativo;
- estados con ícono **y** texto, nunca solo color;
- `prefers-reduced-motion`: sin animaciones, solo fundidos.

**Pruebas:** cada pantalla lleva su archivo en `frontend/pruebas/` con axe en escritorio y móvil, en cada estado, y
recorre el flujo con los escenarios del simulador. Usa como ejemplo `acceso.spec.ts` y `cuenta.spec.ts`.

---

## 5. La forma de trabajo: dos asistentes y tú

Usamos dos asistentes de IA con papeles separados. **Tú eres quien revisa y decide**; ninguno de los dos avanza sin
que tú pases el turno.

| Papel | Herramienta | Qué hace | Qué **no** hace |
|---|---|---|---|
| **Sesión de diseño** (dirección) | Un chat de Claude, en un proyecto con acceso a Figma y a la carpeta del repositorio | Lee el grafo y Figma, escribe cada tarea, revisa el reporte y las capturas, actualiza el grafo cuando cambia una decisión | No escribe el código de la app |
| **Claude Code** (implementación) | Claude Code en tu computadora, dentro del repositorio | Implementa la tarea, corre lint, tipos, build y pruebas, hace los commits y escribe el reporte | No decide alcance ni cambia el grafo por su cuenta |

### 5.1 El buzón `ai/handoff/`

Es una carpeta **local** (no se sube a git) donde los dos se pasan el trabajo. Créala una vez:

```bash
mkdir -p ai/handoff/historial ai/handoff/capturas
echo "ai/handoff/" >> .git/info/exclude
```

Copia ahí `docs/frontend/relevo/README.md` (el reglamento del buzón). Los archivos:

| Archivo | Lo escribe | Contenido |
|---|---|---|
| `siguiente.md` | Sesión de diseño | La tarea: pantallas, nodos de Figma, ids del grafo, estados, pruebas y criterios de terminado |
| `reporte.md` | Claude Code | Commits, resultado real de las pruebas, diferencias con Figma, textos nuevos y dudas |
| `capturas/` | Claude Code | Capturas de cada estado (escritorio 1440 × 900 y móvil 390 × 844) |
| `historial/` | Ambos | `tarea-NN.md` y `reporte-NN.md` de cada ciclo |

Plantillas en `docs/frontend/relevo/plantilla-tarea.md` y `docs/frontend/relevo/plantilla-reporte.md`.
La numeración sigue desde la **Tarea 11**.

### 5.2 El ciclo

1. **Sesión de diseño:** escribe `ai/handoff/siguiente.md` con `Estado: pendiente`.
2. **Tú, en Claude Code:** «sigue con ai/handoff/siguiente.md».
3. **Claude Code:** implementa en commits atómicos, llena `reporte.md`, guarda las capturas, copia el reporte a
   `historial/reporte-NN.md`, cambia el estado a `hecha` y se detiene.
4. **Tú:** abre la app y mira la pantalla tú mismo (también con Tab, sin mouse).
5. **Tú, en la sesión de diseño:** «revisa». Lee el reporte, el código y las capturas, responde las dudas, archiva la
   tarea en `historial/tarea-NN.md` y escribe la siguiente (o una corrección).

**Reglas del ciclo:**
- Una tarea = una pantalla (o un bloque pequeño). Nunca dos tareas encadenadas sin revisión.
- Cada tarea nombra los nodos de Figma y los ids del grafo exactos.
- Si el contrato de la API no alcanza, Claude Code **pregunta antes de cambiarlo** y lo anota en «cambios de contrato».
- Si algo toca sesión, datos personales o calificación, el reporte dice **«REQUIERE REVISIÓN HUMANA»** y tú lo revisas
  con calma.
- Ningún archivo del buzón lleva secretos, llaves ni datos reales de personas.

### 5.3 Cómo arrancar la sesión de diseño

En un chat nuevo de Claude (de preferencia en un proyecto), con acceso a Figma y a la carpeta del repositorio, pega
esto como primer mensaje:

> Eres la **sesión de diseño** del frontend de Echo. Yo reviso y decido; Claude Code implementa en mi computadora.
> Lee `docs/frontend/guia-de-relevo.md`, `CLAUDE.md`, `docs/frontend/arquitectura.md` y `frontend/DESIGN.md` del
> repositorio, y los nodos `invariante` de `ai/context/grafo-conocimiento.json`. Figma: archivo `1zggHPVnKEPlt7khBbtWTt`,
> página `66:2`. Tu trabajo: escribir cada tarea en `ai/handoff/siguiente.md` con la plantilla de
> `docs/frontend/relevo/plantilla-tarea.md`, revisar el reporte cuando te diga «revisa», y proponerme cualquier cambio
> al grafo antes de hacerlo. Si Figma y el grafo no coinciden, manda el grafo. Empieza con la Tarea 11: SCR-06 Módulos.

### 5.4 Cómo trabaja Claude Code

En la raíz del repositorio. Lee `CLAUDE.md` solo al empezar. Si tiene acceso a Figma (servidor MCP de Figma), lee los
nodos con `get_design_context`; si no, toma las capturas de la tarea. Pídele que use, si los tiene instalados, los
skills de diseño y pruebas (`impeccable`, `animate`, `apple-design`, `ui-ux-pro-max`, `webapp-testing`) y que diga en
el reporte qué aportó cada uno.

---

## 6. Cuándo una pantalla está terminada

- Coincide con Figma en escritorio (1440) y móvil (390), salvo las diferencias anotadas y justificadas.
- Tiene **todos** los estados del nodo SCR (`estados_a_disenar` en el grafo): vacío, carga, error, bloqueado, etc.
- `npm run lint`, `npm run tipos`, `npm run build` y `npm run prueba:e2e` pasan; el reporte trae el resultado real.
- axe sin violaciones en cada estado, en escritorio y móvil.
- Se usa completa con teclado.
- Commits atómicos en `development` con mensajes en español (`feat(contenido): Módulos (SCR-06)`), subidos.
  Nada de `ai/handoff/` en los commits.

---

## 7. Detalles por pantalla que conviene saber desde ya

- **SCR-06:** al entrar por primera vez, todo en 0 % (`85:804`). El buscador actualiza `?q=` (OP-21) y busca sin
  acentos. Un módulo bloqueado dice qué falta para abrirlo.
- **Encabezado y barra inferior:** en móvil, la barra inferior tiene Módulos, Mi progreso y Mis resultados; el Perfil va
  en el encabezado. El aviso de sesión (`AvisoSesion`) usa `role="alertdialog"`, aparece 2 minutos antes de que expire
  y ofrece «Seguir conectado» (arquitectura §7.4). Pruébalo con el escenario `sesion-por-expirar`.
- **SCR-08:** el examen del curso tiene cinco estados (bloqueado, disponible, en curso, en espera y aprobado; `87:1495`).
- **SCR-09:** retoma en la última sección vista (OP-19) y «Terminé la lección» (OP-20). El texto llega en Markdown;
  usa el convertidor de `lib/markdown/`.
- **SCR-10 y SCR-12:** la relación de columnas con lista desplegable, nunca arrastrando. Las preguntas sin responder se
  señalan al enviar sin perder lo respondido.
- **SCR-12:** cada respuesta se guarda en el servidor al elegirla (OP-26), con un indicador «Guardado» / «Sin
  conexión». **No** se guardan respuestas en el navegador. **No hay cronómetro** (DEC-18).
- **SCR-13:** si no aprueba, muestra las lecciones a repasar y la espera de 20 minutos, **sin la respuesta correcta**
  (INV-04).
- **SCR-16:** «Eliminar cuenta» pide la contraseña (o volver a entrar con Google) y anonimiza (OP-14).
  «Descargar mis datos» guarda el JSON de OP-41. Con aceptación pendiente, el Perfil **sí** se puede abrir (INV-30).
  Los diálogos de eliminar en móvil son hojas inferiores (`149:5311`, `149:5404`).

---

## 8. A quién preguntar

- **Alcance, grafo y decisiones:** Brian (responsable del proyecto y de la base de datos).
- **Backend:** el resto del equipo lo construye en paralelo con el **mismo contrato** (`docs/api/openapi.yaml`). Si el
  contrato tiene que cambiar, se acuerda con ellos antes: el simulador y el backend deben decir lo mismo.

---

## 9. Notas de quien empezó

Lo que aprendí construyendo las Tareas 01 a 10 y que no está escrito en otro lado. Léelo antes de la primera tarea.

### 9.1 Lo que ya existe para `(app)` y lo que falta
- **Existe:**
  - `(app)/layout.tsx` con `ValidacionDeSesion`: 401 → Iniciar sesión con `?motivo=expirada&volver=`; aceptación
    pendiente → `/aceptar`, **salvo en `/perfil`** (INV-30; no quites esa excepción al hacer el Perfil);
  - `src/proxy.ts` con la lista de rutas protegidas (`matcher`);
  - `/modulos` provisional y `BotonCerrarSesion` (variantes `boton` y `enlace`), que sirve tal cual para el
    encabezado;
  - `lib/api/`: cada respuesta trae `expiraEn` (el encabezado `X-Sesion-Expira`), que es lo que necesita `AvisoSesion`.
- **Falta, sin nada a medias:** el encabezado de escritorio y móvil, el pie de la app (`PiePublico variante="claro"`
  es el de las páginas públicas, no el de la app), la barra inferior (DEC-80) y `AvisoSesion`. Tampoco existe
  `lib/fechas.ts`: el formato DD/MM/AAAA y 24 h está por escribir.

### 9.2 Rutas nuevas en `(app)`
- **Agrega cada ruta nueva al `matcher` de `src/proxy.ts`.** Si no, sin cookie la página no redirige a Iniciar
  sesión: llega al layout, que sí la valida, pero sin `volver` (el proxy es quien escribe `x-echo-ruta`).
- El layout no detiene a `children`: cada página pide sus datos con la misma cookie. Usa `obtenerSesion()` de
  `lib/sesion.ts` si necesitas el nombre: está en `cache` de React y no repite la petición.

### 9.3 `cacheComponents` y páginas estáticas
- Leer `cookies()`, `headers()` o datos del alumno fuera de `<Suspense>` rompe el build. Nunca `'use cache'` en algo que
  dependa de la sesión.
- **`useSearchParams` vuelve la página «solo cliente»**: el formulario ya no viene en el HTML. En las páginas de acceso
  usé `useConsultaDeLaUrl` (`useSyncExternalStore`), que deja la página `○` y lee la consulta al hidratar.
- Para estado que solo existe en el navegador (el correo recién registrado, el código de un enlace), usa también
  `useSyncExternalStore` con un valor de servidor fijo: un `useState(() => window…)` causa diferencias al hidratar.
- Los códigos de enlace se quitan de la URL con `history.replaceState` (ver `VerificarCorreo` y
  `RestablecerContrasena`): guarda el valor **antes** de borrarlo.
- ESLint trae las reglas nuevas de React: no leer `ref.current` al dibujar, los hooks se llaman `use…` (es la única
  excepción al español) y nada de `setState` directo dentro de un efecto.

### 9.4 Pruebas
- **El simulador es uno solo para todas las pruebas.** Las de API (`api.spec.ts`) lo reinician en cada caso. Las
  pantallas que inician sesión, cambian escenarios o reinician el simulador van en los proyectos `acceso-escritorio`
  y `acceso-movil`, que corren **después** de las de API, en serie y con `workers: 1`. **Si tu archivo nuevo usa
  sesión o escenarios, agrégalo a `PRUEBAS_CON_SIMULADOR` en `playwright.config.ts`**; si no, correrá en paralelo con
  las de API y fallará al azar. Por eso la suite tarda unos 9 minutos.
- Reinicia el simulador en el `beforeEach` (`reiniciarSimulador()`): también limpia el límite de 60 peticiones por IP
  en 10 minutos, que si no se agota a la mitad de la suite.
- **Next 16 conserva oculta la página anterior** (Activity) al navegar en el cliente: puede haber dos `main` y dos
  `#contenido` en el DOM. Usa `page.getByRole("main")`, que ignora el oculto; `page.locator("main")` falla.
- El anunciador de rutas de Next también es `role="alert"`: filtra los recuadros por su texto.
- La prueba de movimiento reducido del inicio (`inicio.spec.ts`, «nada nuevo se mueve») falló dos veces en suites
  muy cargadas y nunca sola; si vuelve a fallar, el mensaje dice qué animación encontró.
- Para revisar o capturar a mano, Chromium sin ventana arranca las animaciones de entrada tarde: espera un segundo
  antes de la captura.

### 9.5 Simulador y contrato
- **Escenario nuevo:** agrégalo al objeto `escenarios` de `frontend/simulador/estado.mjs`, descríbelo en
  `frontend/simulador/README.md` y úsalo en las pruebas con `escenario("nombre")`.
- **Orígenes:** el simulador solo acepta mutaciones con `Origin` `http://localhost:3000` o `:3100` (DEC-85). Si sirves
  la app en otro puerto, todo `POST` responde 403 `ORIGEN_NO_PERMITIDO`; cámbialo con `ORIGENES_PERMITIDOS`.
- **Cambiar el contrato** (solo con aprobación): `docs/api/openapi.yaml` → `npm run api:tipos` → la operación en
  `src/lib/api/operaciones.ts` → el manejador en `simulador/rutas.mjs` → `docs/api/README.md`. La prueba de contrato
  revisa que los cuatro coincidan.
- Los correos «enviados» están en `GET /__simulador/correos`, con el enlace listo para abrir.

### 9.6 Otras trampas
- **`turbopack.root`** está fijado en `frontend/` (`next.config.ts`): hay otro `package-lock.json` en la raíz del
  repositorio y, sin eso, Next escribe `.next/` fuera de `frontend/`.
- `docs/legal/` va en LF y su huella SHA-256 se prueba; no lo edites con un editor que cambie los saltos de línea.
  El aviso simplificado de Crear cuenta y de `/aceptar` es una constante con prueba contra el Anexo A.
- En la consola del navegador verás 404 de prefetch hacia rutas que todavía no existen (`/perfil`, etc.): no es un
  error de la página.
- Los íconos se copian de Figma como rutas en `componentes/ui/iconos/iconos.tsx` (trazo 1.75, `currentColor`); no
  se usan imágenes ni otra librería de íconos.
- El equipo pidió que los commits **no** lleven la línea de autoría de Claude Code (`Co-Authored-By`). Díselo en la
  primera tarea.
