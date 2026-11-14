# Echo: backend

API de Echo con NestJS 11 y Prisma 7.10.1 sobre PostgreSQL. El contrato está en `docs/api/openapi.yaml` y las reglas
del proyecto, en `CLAUDE.md` (raíz del repositorio).

## Requisitos
- Node 22 (`.nvmrc`).
- PostgreSQL 18 con `psql` en el PATH.

## Puesta en marcha (una sola vez)
Todo se corre desde `backend/`.

1. `npm install`
2. Copia `.env.example` a `.env` y llena los valores. `SECRETO_CLAVE_OPACA` se genera con `openssl rand -hex 32`.
3. Crea los roles de la base con el superusuario, usando las mismas contraseñas que pusiste en el `.env`:
   ```bash
   psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
     -v clave_migracion=... -v clave_app=... -v clave_contenido=... -v clave_lectura=... -v clave_admin=... \
     -f prisma/sql/roles.sql
   ```
4. `npm run bd:reiniciar`: crea la base, aplica las migraciones y carga la semilla de desarrollo.
5. `npm run prisma:generar`: genera el cliente de Prisma en `src/generated/prisma` (no se versiona).

## Uso diario
| Comando | Qué hace |
|---|---|
| `npm run start:dev` | Servidor en modo desarrollo: `http://localhost:4000/api` |
| `npm run build` | Compila a `dist/` |
| `npm run lint` | ESLint con corrección automática |
| `npm run prisma:generar` | Genera el cliente de Prisma (después de `npm install` y de cada cambio al esquema) |
| `npm run prisma:crear-migracion -- --name <nombre>` | Crea una migración sin aplicarla |
| `npm run prisma:desplegar` | Aplica las migraciones pendientes |
| `npm run bd:reiniciar` | Borra y vuelve a crear la base local con la semilla |

Cuentas de la semilla: `alumno@example.com`, `otra.alumna@example.com` y `pendiente@example.com` (sin verificar).
Contraseña: `Ejemplo2026`.

## Estructura de `src/`
- `infraestructura/`: configuración, base de datos, seguridad y correo.
- `comun/`: errores, guardias, decoradores y utilidades que usan todas las áreas.
- `areas/`: una carpeta por módulo funcional (cuenta, contenido, evaluables, desempeño).
- `generated/`: cliente de Prisma generado; no se edita ni se versiona.

## Pruebas
El backend no versiona pruebas automáticas. Las reglas de la base se prueban con SQL, con el superusuario y en una
transacción que se deshace:

```bash
psql -U postgres -d echo -v ON_ERROR_STOP=1 -f prisma/sql/pruebas/<archivo>.sql
```

Archivos: `logica_intentos`, `ciclo_de_vida_datos`, `vistas` y `auditoria`.
