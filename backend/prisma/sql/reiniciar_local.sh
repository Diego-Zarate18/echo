#!/usr/bin/env bash
# Reinicia la base LOCAL de desarrollo: la borra, la crea, aplica las migraciones, instala los disparadores de eventos
# de la auditoría y carga la semilla. Nunca se usa en Railway.
#
#   npm run bd:reiniciar        (o directo: bash prisma/sql/reiniciar_local.sh)
#
# Reemplaza a «prisma migrate reset»: con los disparadores de eventos instalados (DEC-97), Prisma ya no puede borrar
# el esquema, porque esos disparadores son del superusuario. Por eso aquí se borra la base completa con postgres.
# Requisitos: psql en el PATH, los roles creados con prisma/sql/roles.sql y el .env con las URL de cada rol.
# psql pide la contraseña de postgres en cada paso; para no escribirla tres veces: export PGPASSWORD='…'
set -euo pipefail
cd "$(dirname "$0")/../.."

echo "1/4 Borrando y creando la base echo…"
psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q \
  -c 'DROP DATABASE IF EXISTS echo WITH (FORCE);' \
  -c "CREATE DATABASE echo OWNER echo_propietario TEMPLATE template0 ENCODING 'UTF8' LOCALE_PROVIDER icu ICU_LOCALE 'es-MX';"

echo "2/4 Aplicando las migraciones…"
npm run --silent prisma:desplegar

echo "3/4 Instalando los disparadores de eventos de la auditoría…"
psql -U postgres -d echo -v ON_ERROR_STOP=1 -q -f prisma/sql/auditoria_ddl.sql > /dev/null

echo "4/4 Cargando la semilla…"
node prisma/semilla/cargar.mjs

echo "Base local lista."
