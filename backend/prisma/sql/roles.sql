-- Roles de base de datos de Echo (DEC-45, INV-09, ROL-*).
-- Se ejecuta UNA vez por entorno con el superusuario (local: postgres; Railway: su superusuario).
-- No contiene contraseñas: llegan como variables de psql y viven solo en el .env / variables de Railway.
-- Es idempotente: crea cada rol si no existe y siempre actualiza su contraseña.
--
-- Uso:
--   psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
--     -v clave_migracion=... -v clave_app=... -v clave_contenido=... -v clave_lectura=... -v clave_admin=... \
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

-- Administrador de la base (DEC-97, ACT-06): rol personal; su contraseña solo vive en su gestor de contraseñas.
SELECT 'CREATE ROLE echo_admin LOGIN'
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'echo_admin') \gexec

-- Atributos: ninguno puede crear roles, bases ni ser superusuario.
ALTER ROLE echo_propietario NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
ALTER ROLE echo_migracion  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'clave_migracion';
ALTER ROLE echo_app        LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'clave_app';
ALTER ROLE echo_contenido  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'clave_contenido';
ALTER ROLE echo_lectura    LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'clave_lectura';
-- echo_admin no hereda privilegios de nadie (NOINHERIT): todo lo suyo se le concede en las migraciones.
ALTER ROLE echo_admin      LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'clave_admin';

-- echo_migracion actúa como echo_propietario: todo lo que creen las migraciones queda a su nombre.
GRANT echo_propietario TO echo_migracion;
ALTER ROLE echo_migracion SET role = 'echo_propietario';

-- echo_admin puede actuar como echo_propietario solo con SET ROLE explícito, para cambiar la estructura;
-- auditoria_bd sigue registrando rol_sesion = echo_admin (DEC-97).
GRANT echo_propietario TO echo_admin WITH INHERIT FALSE, SET TRUE;
