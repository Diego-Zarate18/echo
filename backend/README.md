# Backend de Echo

API REST de Echo construida con NestJS, Prisma 7.10.1 y PostgreSQL.

## Estructura inicial

```text
src/
├── base-de-datos/
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── salud/
│   ├── salud.controller.ts
│   └── salud.module.ts
├── app.module.ts
└── main.ts
```

`base-de-datos` expone `PrismaService` como proveedor global. La API usa
`DATABASE_URL` con el rol `echo_app`; las migraciones usan
`DATABASE_URL_MIGRACION` mediante `prisma7.config.ts`.

## Comandos

```bash
npm install
npm run prisma:generar
npm run prisma:estado
npm run prisma:desplegar
npm run start:dev
npm run lint
npm run build
npm run test
```

## Endpoint de salud

Con el servidor iniciado:

```text
GET http://localhost:3000/api/salud
```

La respuesta correcta es:

```json
{
  "estado": "correcto",
  "baseDeDatos": "conectada"
}
```
