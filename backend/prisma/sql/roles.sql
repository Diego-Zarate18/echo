-- Roles de base de datos de Echo (DEC-45, INV-09, ROL-*).
-- Se ejecuta UNA vez por entorno con el superusuario (local: postgres; Railway: su superusuario).
-- No contiene contraseñas: llegan como variables de psql y viven solo en el .env / variables de Railway.
-- Es idempotente: crea cada rol si no existe y siempre actualiza su contraseña.
--
-- Uso:
--   psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
--     -v clave_migracion=... -v clave_app=... -v clave_contenido=... -v clave_lectura=... \
--     -f prisma/sql/roles.sql
--
-- Los permisos sobre tablas, funciones y vistas NO van aquí: van en las migraciones de Prisma.

-- Dueño del esquema y de todos los objetos. No inicia sesión.
SELECT 'CREATE ROLE echo_propietario NOLOGIN'
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'echo_propietario') \gexec

-- Migraciones (prisma migrate). Miembro de echo_propietario.
SELECT 'CREATE ROLE echo_migracion LOGIN'
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'echo_migracion') \gexec

-- Servidor de la aplicación (Prisma Client).
SELECT 'CREATE ROLE echo_app LOGIN'
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'echo_app') \gexec

-- Scripts de carga de contenido del equipo.
SELECT 'CREATE ROLE echo_contenido LOGIN'
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'echo_contenido') \gexec

-- Soporte y análisis, sin datos personales.
SELECT 'CREATE ROLE echo_lectura LOGIN'
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'echo_lectura') \gexec

-- Atributos: ninguno puede crear roles, bases ni ser superusuario.
ALTER ROLE echo_propietario NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
ALTER ROLE echo_migracion  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'clave_migracion';
ALTER ROLE echo_app        LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'clave_app';
ALTER ROLE echo_contenido  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'clave_contenido';
ALTER ROLE echo_lectura    LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'clave_lectura';

-- echo_migracion actúa como echo_propietario: todo lo que creen las migraciones queda a su nombre.
GRANT echo_propietario TO echo_migracion;
ALTER ROLE echo_migracion SET role = 'echo_propietario';
