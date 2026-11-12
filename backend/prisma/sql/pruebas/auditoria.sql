-- Pruebas de la migración auditoria (DEC-97, INV-31).
-- Se ejecutan con el superusuario, con o sin la semilla cargada, dentro de una transacción que se deshace al final:
-- no dejan datos ni registros de auditoría. Cada comprobación imprime «OK …»; la primera que falla detiene todo.
-- SET LOCAL SESSION AUTHORIZATION hace que session_user sea el rol probado, como si se hubiera conectado con él.
--
--   psql -U postgres -d echo -v ON_ERROR_STOP=1 -f prisma/sql/pruebas/auditoria.sql
--
-- La prueba 11 (DDL) solo corre si ya se instaló prisma/sql/auditoria_ddl.sql.

\set QUIET on
BEGIN;

-- Marca: lo que se registre desde aquí es de esta prueba.
SELECT set_config('prueba.base', coalesce(max(id), 0)::text, true) AS ignorar FROM auditoria_bd \gset

-- ---------------------------------------------------------------------------
-- 01 · echo_app no se audita (ni directo ni dentro de una función SECURITY DEFINER)
-- ---------------------------------------------------------------------------
SET LOCAL SESSION AUTHORIZATION echo_app;
INSERT INTO usuario (nombre, apellidos, correo, hash_contrasena, mayoria_edad_confirmada_en)
VALUES ('Prueba', 'Auditoria', 'auditoria@echo.test', 'hash-secreto-auditoria', now());
UPDATE usuario SET apellidos = 'Auditoría' WHERE correo = 'auditoria@echo.test';
INSERT INTO usuario (nombre, apellidos, correo, hash_contrasena, mayoria_edad_confirmada_en)
VALUES ('Para', 'Anonimizar', 'anonimizar@echo.test', 'hash-x', now());
SELECT fn_anonimizar_usuario(id) AS ignorar FROM usuario WHERE correo = 'anonimizar@echo.test' \gset
RESET SESSION AUTHORIZATION;

DO $prueba$
BEGIN
  IF EXISTS (SELECT 1 FROM auditoria_bd WHERE id > current_setting('prueba.base')::BIGINT) THEN
    RAISE EXCEPTION 'FALLO: lo que hace echo_app no debe auditarse';
  END IF;
  RAISE NOTICE 'OK 01 echo_app no se audita, tampoco dentro de fn_anonimizar_usuario (SECURITY DEFINER)';
END
$prueba$;

-- ---------------------------------------------------------------------------
-- 02 y 03 · echo_contenido: alta, cambio y baja con valores; motivo
-- ---------------------------------------------------------------------------
SET LOCAL SESSION AUTHORIZATION echo_contenido;
SET LOCAL echo.motivo = 'Prueba de auditoría';
INSERT INTO modulo (slug, titulo, descripcion, orden, publicado) VALUES ('prueba-auditoria', 'Antes', 'd', 999, false);
UPDATE modulo SET titulo = 'Después' WHERE slug = 'prueba-auditoria';
SET LOCAL echo.motivo = '';
DELETE FROM modulo WHERE slug = 'prueba-auditoria';
RESET SESSION AUTHORIZATION;

DO $prueba$
DECLARE
  base BIGINT := current_setting('prueba.base')::BIGINT;
  a RECORD; m RECORD; b RECORD;
BEGIN
  SELECT * INTO a FROM auditoria_bd WHERE id > base AND tabla = 'modulo' AND tipo_evento = 'INSERT';
  SELECT * INTO m FROM auditoria_bd WHERE id > base AND tabla = 'modulo' AND tipo_evento = 'UPDATE';
  SELECT * INTO b FROM auditoria_bd WHERE id > base AND tabla = 'modulo' AND tipo_evento = 'DELETE';
  IF a.id IS NULL OR m.id IS NULL OR b.id IS NULL THEN
    RAISE EXCEPTION 'FALLO: faltan registros de INSERT, UPDATE o DELETE en modulo';
  END IF;
  IF a.rol_sesion <> 'echo_contenido' OR a.rol_efectivo <> 'echo_contenido'
     OR a.datos_nuevos ->> 'titulo' <> 'Antes' OR a.registro_id <> a.datos_nuevos ->> 'id' THEN
    RAISE EXCEPTION 'FALLO: registro de INSERT incorrecto: %', row_to_json(a);
  END IF;
  IF m.columnas_cambiadas <> ARRAY['titulo'] OR m.datos_anteriores ->> 'titulo' <> 'Antes'
     OR m.datos_nuevos ->> 'titulo' <> 'Después' THEN
    RAISE EXCEPTION 'FALLO: registro de UPDATE incorrecto: %', row_to_json(m);
  END IF;
  IF b.datos_anteriores ->> 'titulo' <> 'Después' OR b.datos_nuevos IS NOT NULL THEN
    RAISE EXCEPTION 'FALLO: registro de DELETE incorrecto: %', row_to_json(b);
  END IF;
  IF a.id_transaccion <> b.id_transaccion OR a.ocurrido_en > b.ocurrido_en THEN
    RAISE EXCEPTION 'FALLO: los cambios de una transacción deben compartir id_transaccion';
  END IF;
  RAISE NOTICE 'OK 02 echo_contenido: alta, cambio (solo la columna cambiada) y baja, con valores y rol';

  IF a.motivo <> 'Prueba de auditoría' OR m.motivo <> 'Prueba de auditoría' OR b.motivo IS NOT NULL THEN
    RAISE EXCEPTION 'FALLO: motivo esperado en alta y cambio, y nulo tras vaciarlo (obtuvo %, %, %)', a.motivo, m.motivo, b.motivo;
  END IF;
  RAISE NOTICE 'OK 03 motivo con SET LOCAL echo.motivo; vacío = sin motivo y la operación no falla';
END
$prueba$;

-- ---------------------------------------------------------------------------
-- 04 y 05 · echo_admin: datos personales protegidos; SET ROLE queda como rol efectivo
-- ---------------------------------------------------------------------------
SET LOCAL SESSION AUTHORIZATION echo_admin;
UPDATE usuario SET nombre = 'Nombre Secreto', hash_contrasena = 'hash-nuevo-secreto' WHERE correo = 'auditoria@echo.test';
INSERT INTO progreso_leccion (usuario_id, leccion_id)
SELECT u.id, (SELECT min(id) FROM leccion) FROM usuario u
WHERE u.correo = 'auditoria@echo.test' AND EXISTS (SELECT 1 FROM leccion);
SET LOCAL ROLE echo_propietario;
UPDATE usuario SET apellidos = 'Como dueño' WHERE correo = 'auditoria@echo.test';
RESET ROLE;
RESET SESSION AUTHORIZATION;

DO $prueba$
DECLARE
  base BIGINT := current_setting('prueba.base')::BIGINT;
  r RECORD;
  texto TEXT;
BEGIN
  SELECT * INTO r FROM auditoria_bd
  WHERE id > base AND tabla = 'usuario' AND rol_sesion = 'echo_admin' AND rol_efectivo = 'echo_admin';
  texto := row_to_json(r)::text;
  IF r.id IS NULL OR NOT (r.columnas_cambiadas @> ARRAY['nombre', 'hash_contrasena'])
     OR texto LIKE '%Secreto%' OR texto LIKE '%hash-%' OR texto LIKE '%auditoria@echo.test%'
     OR r.datos_nuevos ->> 'nombre' <> '[protegido]' THEN
    RAISE EXCEPTION 'FALLO: en usuario solo deben quedar los nombres de las columnas: %', texto;
  END IF;
  RAISE NOTICE 'OK 04 echo_admin en usuario: columnas cambiadas sin valores, hashes ni correo (DEC-27)';

  IF NOT EXISTS (SELECT 1 FROM auditoria_bd WHERE id > base AND tabla = 'usuario'
                 AND rol_sesion = 'echo_admin' AND rol_efectivo = 'echo_propietario') THEN
    RAISE EXCEPTION 'FALLO: con SET ROLE el rol efectivo debe ser echo_propietario y la sesión echo_admin';
  END IF;
  RAISE NOTICE 'OK 05 con SET ROLE: rol_sesion = echo_admin y rol_efectivo = echo_propietario';

  IF EXISTS (SELECT 1 FROM leccion) THEN
    SELECT * INTO r FROM auditoria_bd WHERE id > base AND tabla = 'progreso_leccion';
    IF r.registro_id IS NULL OR r.registro_id NOT LIKE '%/%' THEN
      RAISE EXCEPTION 'FALLO: llave compuesta esperada con «/»: %', r.registro_id;
    END IF;
    RAISE NOTICE 'OK 06 llave compuesta en registro_id: %', r.registro_id;
  ELSE
    RAISE NOTICE 'OK 06 omitida: la base no tiene lecciones para probar una llave compuesta';
  END IF;
END
$prueba$;

-- ---------------------------------------------------------------------------
-- 07 · Nadie modifica ni borra la auditoría, ni el superusuario (INV-31)
-- ---------------------------------------------------------------------------
DO $prueba$
BEGIN
  BEGIN
    UPDATE auditoria_bd SET motivo = 'alterado' WHERE id = (SELECT max(id) FROM auditoria_bd);
    RAISE EXCEPTION 'FALLO: se pudo modificar la auditoría';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    DELETE FROM auditoria_bd WHERE id = (SELECT max(id) FROM auditoria_bd);
    RAISE EXCEPTION 'FALLO: se pudo borrar de la auditoría';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    TRUNCATE auditoria_bd;
    RAISE EXCEPTION 'FALLO: se pudo vaciar la auditoría';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'OK 07 UPDATE, DELETE y TRUNCATE sobre auditoria_bd rechazados, también al superusuario';
END
$prueba$;

-- ---------------------------------------------------------------------------
-- 08 · Permisos sobre la tabla
-- ---------------------------------------------------------------------------
DO $prueba$
DECLARE
  rol TEXT;
BEGIN
  IF NOT has_table_privilege('echo_admin', 'auditoria_bd', 'SELECT') THEN
    RAISE EXCEPTION 'FALLO: echo_admin debe leer la auditoría';
  END IF;
  -- echo_migracion no entra: actúa como echo_propietario, dueño de la tabla, y un dueño siempre tiene permisos sobre
  -- ella (sin eso las migraciones no podrían crearla ni cambiarla). Lo que la protege es trg_auditoria_inmutable.
  FOREACH rol IN ARRAY ARRAY['echo_app', 'echo_contenido', 'echo_lectura'] LOOP
    IF has_table_privilege(rol, 'auditoria_bd', 'SELECT') THEN
      RAISE EXCEPTION 'FALLO: % no debe leer la auditoría', rol;
    END IF;
  END LOOP;
  FOREACH rol IN ARRAY ARRAY['echo_admin', 'echo_app', 'echo_contenido', 'echo_lectura'] LOOP
    IF has_table_privilege(rol, 'auditoria_bd', 'INSERT') OR has_table_privilege(rol, 'auditoria_bd', 'UPDATE')
       OR has_table_privilege(rol, 'auditoria_bd', 'DELETE') THEN
      RAISE EXCEPTION 'FALLO: % no debe escribir directo en la auditoría', rol;
    END IF;
  END LOOP;
  IF NOT has_table_privilege('echo_admin', 'usuario', 'UPDATE') OR has_table_privilege('echo_admin', 'usuario', 'TRUNCATE') THEN
    RAISE EXCEPTION 'FALLO: echo_admin debe tener SELECT, INSERT, UPDATE y DELETE (y no TRUNCATE) en las tablas';
  END IF;
  RAISE NOTICE 'OK 08 solo echo_admin lee la auditoría; nadie escribe directo en ella';
END
$prueba$;

-- ---------------------------------------------------------------------------
-- 09 · Acción manual: solo echo_admin, sin elegir fecha ni rol
-- ---------------------------------------------------------------------------
SET LOCAL SESSION AUTHORIZATION echo_admin;
SELECT set_config('prueba.manual', fn_registrar_accion_manual('RESPALDO', 'Respaldo semanal de prueba')::text, true) AS ignorar \gset
DO $prueba$
BEGIN
  BEGIN
    PERFORM fn_registrar_accion_manual('   ');
    RAISE EXCEPTION 'FALLO: un comando vacío debe rechazarse';
  EXCEPTION WHEN SQLSTATE 'EC400' THEN NULL;
  END;
END
$prueba$;
RESET SESSION AUTHORIZATION;

DO $prueba$
DECLARE
  r RECORD;
BEGIN
  SELECT * INTO r FROM auditoria_bd WHERE id = current_setting('prueba.manual')::BIGINT;
  IF r.tipo_evento <> 'MANUAL' OR r.comando <> 'RESPALDO' OR r.rol_sesion <> 'echo_admin'
     OR r.motivo <> 'Respaldo semanal de prueba' OR r.registro_id IS NOT NULL THEN
    RAISE EXCEPTION 'FALLO: registro manual incorrecto: %', row_to_json(r);
  END IF;
  IF has_function_privilege('echo_contenido', 'fn_registrar_accion_manual(text, text)', 'EXECUTE')
     OR has_function_privilege('echo_app', 'fn_registrar_accion_manual(text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FALLO: solo echo_admin registra acciones manuales';
  END IF;
  RAISE NOTICE 'OK 09 acción manual de echo_admin registrada; comando vacío rechazado; nadie más puede registrarlas';
END
$prueba$;

-- ---------------------------------------------------------------------------
-- 10 · TRUNCATE por sentencia
-- ---------------------------------------------------------------------------
TRUNCATE sesion;
DO $prueba$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auditoria_bd WHERE id > current_setting('prueba.base')::BIGINT
                 AND tipo_evento = 'TRUNCATE' AND tabla = 'sesion' AND registro_id IS NULL) THEN
    RAISE EXCEPTION 'FALLO: TRUNCATE no quedó registrado';
  END IF;
  RAISE NOTICE 'OK 10 TRUNCATE registrado por sentencia';
END
$prueba$;

-- ---------------------------------------------------------------------------
-- 11 · Cambios de estructura (si los disparadores de eventos están instalados)
-- ---------------------------------------------------------------------------
CREATE INDEX ix_prueba_auditoria ON modulo (titulo);
COMMENT ON INDEX ix_prueba_auditoria IS 'PASSWORD ''no-debe-quedar''';
DROP INDEX ix_prueba_auditoria;

DO $prueba$
DECLARE
  base BIGINT := current_setting('prueba.base')::BIGINT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_event_trigger WHERE evtname IN ('evt_auditoria_ddl', 'evt_auditoria_ddl_borrado')) THEN
    RAISE NOTICE 'OK 11 omitida: falta instalar prisma/sql/auditoria_ddl.sql';
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auditoria_bd WHERE id > base AND tipo_evento = 'DDL' AND comando = 'CREATE INDEX'
                 AND tabla = 'public.ix_prueba_auditoria')
     OR NOT EXISTS (SELECT 1 FROM auditoria_bd WHERE id > base AND tipo_evento = 'DDL' AND comando = 'DROP INDEX') THEN
    RAISE EXCEPTION 'FALLO: CREATE INDEX y DROP INDEX deben quedar registrados';
  END IF;
  IF EXISTS (SELECT 1 FROM auditoria_bd WHERE id > base AND sentencia LIKE '%no-debe-quedar%')
     OR NOT EXISTS (SELECT 1 FROM auditoria_bd WHERE id > base AND sentencia LIKE '%[protegido]%') THEN
    RAISE EXCEPTION 'FALLO: la contraseña de la sentencia debe quedar como [protegido]';
  END IF;
  RAISE NOTICE 'OK 11 CREATE, COMMENT y DROP registrados; la contraseña de la sentencia queda [protegido]';
END
$prueba$;

ROLLBACK;
\echo 'Todas las pruebas de auditoria pasaron; la transacción se deshizo.'
