# Echo

Plataforma web educativa para aprender ética, principios, leyes y normas del desarrollo de software.
Es lineal, al estilo de los cursos de Cisco, y con bloqueo tipo Duolingo: módulos → cursos → lecciones con actividad → examen por curso.
Proyecto de Ética y Legislación en TI (UP Chiapas). Se prueba con un grupo reducido de estudiantes,
incluidos estudiantes con discapacidad, hasta principios de diciembre de 2026.
Todo el código lo escribe Claude y lo revisa una persona del equipo.

## Fuentes de verdad (léelas en este orden cuando las necesites)
1. `ai/context/grafo-conocimiento.json`: requerimientos con su estado (RF/RN/RNF-*), decisiones (DEC-*), invariantes (INV-*),
   tablas con su diccionario completo (TBL-*), funciones, disparadores y vistas de BD (FN-*, TRG-*, VW-*), roles (ROL-*),
   operaciones (OP-*), consultas (C-*), pantallas y su navegación (SCR-*), fuera de alcance (FDA-*) y pendientes (PEND-*).
   Búscalo con Grep por id (p. ej. `"id": "DEC-19"` o `"id": "TBL-INTENTO"`); no lo leas completo si no hace falta.
   **Antes de empezar, lee los nodos `invariante`.**
2. `docs/echo_db.drawio`: diagrama entidad-relación oficial (21 tablas, 30 relaciones).

El documento de requerimientos original **no se usa**: el grafo lo sustituye (DEC-67). Si un requerimiento aparece
como `parchado` o `descartado`, manda la decisión enlazada con `ajustado_por`, no el texto original.

Si algo no está decidido (estado `propuesto` o `pendiente`) o no aparece en el grafo: **pregunta antes de inventarlo**.
Si una decisión cambia, propón actualizar el grafo (nodo + relaciones + versión e historial en `meta`) y espera aprobación.
Nada de lo que esté en `fuera_de_alcance` se implementa sin aprobación.

## Stack
- Frontend: Next.js (React + TypeScript). Nunca se conecta a la base de datos; todo pasa por la API (INV-26).
- Backend: NestJS (TypeScript), API REST con JSON.
- ORM: **Prisma 7.10.1 exacto** (`prisma` y `@prisma/client` sin `^` ni `~`). Prisma 8 está prohibido sin aprobación (DEC-65).
- Base de datos: PostgreSQL 18 en Railway (UUID v7 con `uuidv7()`), conexión por red privada.
- Correo: Resend. Contraseñas: paquete `argon2` (argon2id, 19456 KiB, t=2, p=1; DEC-72).
- Hosting: Railway, plan Hobby. Servicios: PostgreSQL, backend, frontend (512 MB cada uno) y un Cron diario (DEC-63, DEC-70).
- Accesibilidad: WCAG 2.2 nivel AA en todas las pantallas (DEC-71).

## Comandos

### Frontend (`frontend/`, Node 22 LTS)
Se corren desde `frontend/`:
- `npm install`: instala las dependencias exactas del `package-lock.json` (`.npmrc` con `save-exact=true`).
- `npm run dev`: servidor de desarrollo (Turbopack) en `http://localhost:3000`.
- `npm run build`: compila para producción; muestra la tabla de rutas (`○` estática, `ƒ` dinámica).
- `npm run start`: sirve la compilación de producción.
- `npm run lint`: ESLint (`next lint` ya no existe en Next 16).
- `npm run tipos`: genera los tipos de rutas (`next typegen`) y revisa tipos con `tsc --noEmit`.
- `npm run prueba:e2e`: Playwright + axe en escritorio y móvil; compila y levanta la app por su cuenta.
- `npx playwright install chromium`: descarga el navegador de las pruebas (solo la primera vez).

### Backend
El proyecto de backend aún no existe. Al crearlo, agrega aquí los comandos reales
(compilar, pruebas, lint, migraciones) y usa siempre el Prisma instalado en el proyecto:
- **Nunca** `npx prisma@latest` ni `npx prisma` fuera del proyecto: descargaría la última versión.
- Migraciones de desarrollo: `npx prisma migrate dev --create-only` y luego edita el SQL si hace falta (CHECK, índices parciales,
  GIN, funciones, disparadores, vistas, roles) antes de aplicarla. En producción solo `prisma migrate deploy`.
- Antes de agregar una dependencia, pregunta; no actualices versiones existentes por tu cuenta.

## Base de datos
- El esquema sale de los nodos `tabla` del grafo (columnas, tipos, nulos, valores por defecto, CHECK, UNIQUE e índices)
  y de las aristas `referencia` (FK con su ON DELETE/ON UPDATE). Si el código necesita otra cosa, primero se cambia el grafo.
- Nombres en español, minúsculas, `snake_case`, singular, sin acentos ni ñ (`leccion`, `hash_contrasena`). Los modelos de Prisma
  deben mapear exactamente a esos nombres.
- Listas cerradas como `TEXT` + `CHECK`, nunca ENUM. Contenido con `BIGINT` identity; tablas del alumno con UUID v7.
- Todo cambio de esquema es una migración versionada; nada se cambia a mano (INV-10).
- La app se conecta como `echo_app`, las migraciones como `echo_migracion` y la carga de contenido como `echo_contenido`.
  Nunca uses el superusuario (INV-09).
- La lógica de BD se limita a las 5 funciones, 2 disparadores y 2 vistas del grafo; el backend las invoca con `$queryRaw`.

## Reglas no negociables
1. El historial nunca se borra: eliminar una cuenta es anonimizarla con `fn_anonimizar_usuario` (INV-01).
2. El contenido ya respondido no se edita ni se borra: se retira con `activa = false` (INV-02).
3. La hora la pone el servidor de BD (`now()`, TIMESTAMPTZ en UTC); se muestra en America/Mexico_City (INV-03).
4. Solo `fn_enviar_intento` califica. El cliente nunca recibe `opcion.valor`, la pareja correcta ni la retroalimentación antes de enviar (INV-04).
5. Los intentos se crean solo con `fn_iniciar_intento` (INV-05).
6. El avance lineal se valida en el servidor, nunca solo ocultando botones (INV-06).
7. Toda consulta de desempeño filtra por el alumno de la sesión, nunca por un id recibido del cliente sin verificar (INV-07).
8. Contraseñas solo como Argon2id; códigos de sesión y de enlaces solo como SHA-256. Nunca en respuestas de la API ni en logs (INV-08).
9. Ningún dato de salud ni de discapacidad en tablas, logs ni analítica (INV-22).
10. Toda imagen lleva texto alternativo, y la relación de columnas se puede resolver sin arrastrar (INV-13, DEC-71).
11. Ningún respaldo (.dump, .sql, .7z) entra al repositorio ni se carga en desarrollo; desarrollo usa el seed con datos inventados (INV-14, INV-24).
12. Correos normalizados (sin espacios y en minúsculas) antes de buscarlos o guardarlos; las cuentas de Google se identifican por `google_sub` (INV-12, INV-16).
13. El producto se llama **Echo**; nunca "Codex". Sin rachas, puntos ni vidas (INV-19, INV-20).

## Cómo trabajar
- Una funcionalidad por tarea; modifica solo los archivos que la tarea necesita.
- Antes de implementar una vista, busca su nodo `pantalla` (SCR-*): operaciones que invoca, estados a diseñar y navegación.
  Para cada operación (OP-*), revisa qué recibe y devuelve, qué tablas lee y escribe, y qué decisiones la rigen.
- Para código delicado (autenticación, sesiones, calificación, funciones SQL, anonimización), presenta un plan antes de escribir código.
- Al terminar: compila, corre las pruebas y reporta el resultado real.
- Si tocaste autenticación, sesiones, contraseñas, SQL o datos personales, escribe **"REQUIERE REVISIÓN HUMANA"** en tu resumen.
- Las cifras de dimensionamiento (DEC-70) son estimaciones sobre un supuesto de 100 estudiantes; no las presentes como mediciones.

## Estilo
- **Todo en español** (DEC-76): identificadores (variables, funciones, clases, tipos), nombres de archivos y carpetas,
  comentarios, documentación, textos de la interfaz y mensajes de commit.
- Sin acentos ni ñ en identificadores ni nombres de archivo, igual que la base de datos: `calcularAvance`, `IntentoService`,
  `leccion.controller.ts`, `contrasenaValida`.
- Excepciones: los sufijos y archivos que exige el framework (`Module`, `Service`, `Controller`, `Guard`, `Dto`;
  `page.tsx`, `layout.tsx`, `route.ts`) y las APIs de las librerías, que se usan tal cual.
- Textos de la interfaz en español de México. Mensajes de error claros y sin lenguaje técnico.
  Fechas en formato DD/MM/AAAA y reloj de 24 horas.
