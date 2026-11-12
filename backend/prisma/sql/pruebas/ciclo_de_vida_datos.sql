-- Pruebas de la migración ciclo_de_vida_datos.
-- Se ejecutan con el superusuario con o sin la semilla cargada, dentro de una transacción que
-- se deshace al final: no dejan datos. Cada comprobación imprime «OK …»; la primera que falla detiene todo.
--
--   psql -U postgres -d echo -v ON_ERROR_STOP=1 -f prisma/sql/pruebas/ciclo_de_vida_datos.sql

\set QUIET on
BEGIN;

-- ---------------------------------------------------------------------------
-- Contenido mínimo y documentos legales, como echo_contenido
-- ---------------------------------------------------------------------------
SET LOCAL ROLE echo_contenido;

-- Si la base ya tiene la semilla u otro contenido, se despublica dentro de esta transacción (se deshace al final)
-- para que el desbloqueo y los órdenes de la prueba no choquen con él.
UPDATE modulo SET publicado = false WHERE slug NOT LIKE 'prueba-%';

INSERT INTO imagen (ruta, texto_alternativo) VALUES ('prueba/insignia.png', 'Insignia de prueba');
INSERT INTO modulo (slug, titulo, descripcion, orden, publicado) VALUES ('prueba-m1', 'Módulo 1', 'd', 901, true);
INSERT INTO curso (modulo_id, slug, titulo, descripcion, orden, publicado)
VALUES ((SELECT id FROM modulo WHERE slug = 'prueba-m1'), 'prueba-c1', 'Curso 1', 'd', 1, true);
INSERT INTO leccion (curso_id, slug, titulo, orden, publicado, publicado_en)
VALUES ((SELECT id FROM curso WHERE slug = 'prueba-c1'), 'prueba-l1', 'Lección 1', 1, true, now());
INSERT INTO cuestionario (tipo, leccion_id, curso_id, orden, titulo, instrucciones) VALUES
  ('actividad', (SELECT id FROM leccion WHERE slug = 'prueba-l1'), NULL, 1, 'prueba-a1', 'i'),
  ('examen', NULL, (SELECT id FROM curso WHERE slug = 'prueba-c1'), NULL, 'prueba-e1', 'i');
INSERT INTO pregunta (cuestionario_id, tipo, enunciado, orden) VALUES
  ((SELECT id FROM cuestionario WHERE titulo = 'prueba-a1'), 'opcion_multiple', 'a1-p1', 1),
  ((SELECT id FROM cuestionario WHERE titulo = 'prueba-e1'), 'relacion', 'e1-p1', 1);
INSERT INTO opcion (pregunta_id, texto, valor, orden) VALUES
  ((SELECT id FROM pregunta WHERE enunciado = 'a1-p1'), 'a1-bien', 1, 1),
  ((SELECT id FROM pregunta WHERE enunciado = 'a1-p1'), 'a1-mal', 0, 2);
INSERT INTO pareja (pregunta_id, texto_izquierdo, texto_derecho, orden) VALUES
  ((SELECT id FROM pregunta WHERE enunciado = 'e1-p1'), 'iz-1', 'de-1', 1),
  ((SELECT id FROM pregunta WHERE enunciado = 'e1-p1'), 'iz-2', 'de-2', 2);
INSERT INTO insignia (modulo_id, nombre, descripcion, imagen_id) VALUES
  ((SELECT id FROM modulo WHERE slug = 'prueba-m1'), 'Insignia 1', 'd',
   (SELECT id FROM imagen WHERE ruta = 'prueba/insignia.png'));
INSERT INTO documento_legal (tipo, version, huella_contenido, resumen_cambios) VALUES
  ('aviso_privacidad', '9.0', repeat('a', 64), 'Versión de prueba'),
  ('terminos',         '9.0', repeat('b', 64), 'Versión de prueba');

-- ---------------------------------------------------------------------------
-- Alumnos de prueba, como echo_app
-- ---------------------------------------------------------------------------
SET LOCAL ROLE echo_app;

-- Ana: activa, con historial, sesiones, enlace y aceptaciones con IP
INSERT INTO usuario (nombre, apellidos, correo, correo_verificado_en, estado, hash_contrasena,
                     google_sub, mayoria_edad_confirmada_en, negativa_estadisticas)
VALUES ('Ana', 'Prueba', 'ana@echo.test', now(), 'activo', 'hash-secreto-ana',
        'google-sub-ana', now(), true);
-- Beto: pendiente (se ajusta su fecha más abajo para que tenga más de 24 h)
INSERT INTO usuario (nombre, apellidos, correo, hash_contrasena, mayoria_edad_confirmada_en)
VALUES ('Beto', 'Prueba', 'beto@echo.test', 'hash-beto', now());
-- Caro: pendiente recién creada (no debe borrarse)
INSERT INTO usuario (nombre, apellidos, correo, hash_contrasena, mayoria_edad_confirmada_en)
VALUES ('Caro', 'Prueba', 'caro@echo.test', 'hash-caro', now());

INSERT INTO aceptacion_documento (usuario_id, documento_id, direccion_ip)
SELECT u.id, d.id, '203.0.113.7'::inet
FROM usuario u CROSS JOIN documento_legal d
WHERE u.correo IN ('ana@echo.test', 'beto@echo.test') AND d.version = '9.0';

INSERT INTO sesion (usuario_id, token_hash, agente_usuario) VALUES
  ((SELECT id FROM usuario WHERE correo = 'ana@echo.test'), 'sesion-hash-abierta', 'Navegador de prueba'),
  ((SELECT id FROM usuario WHERE correo = 'ana@echo.test'), 'sesion-hash-cerrada', 'Navegador de prueba');
UPDATE sesion SET revocada_en = now() WHERE token_hash = 'sesion-hash-cerrada';

INSERT INTO token_correo (usuario_id, tipo, token_hash, correo_destino, expira_en) VALUES
  ((SELECT id FROM usuario WHERE correo = 'ana@echo.test'), 'recuperacion', 'enlace-hash-ana', 'ana@echo.test', now() + interval '30 minutes'),
  ((SELECT id FROM usuario WHERE correo = 'caro@echo.test'), 'verificacion', 'enlace-hash-caro', 'caro@echo.test', now() + interval '24 hours');

-- Historial de Ana: lección leída, actividad enviada y examen en curso con una relación respondida
INSERT INTO progreso_leccion (usuario_id, leccion_id, terminada_en)
VALUES ((SELECT id FROM usuario WHERE correo = 'ana@echo.test'), (SELECT id FROM leccion WHERE slug = 'prueba-l1'), now());

DO $prueba$
DECLARE
  u UUID := (SELECT id FROM usuario WHERE correo = 'ana@echo.test');
  i RECORD;
BEGIN
  SELECT * INTO i FROM fn_iniciar_intento(u, (SELECT id FROM cuestionario WHERE titulo = 'prueba-a1'));
  INSERT INTO respuesta_opcion (intento_id, pregunta_id, opcion_id)
  VALUES (i.intento_id, (SELECT id FROM pregunta WHERE enunciado = 'a1-p1'), (SELECT id FROM opcion WHERE texto = 'a1-bien'));
  PERFORM fn_enviar_intento(i.intento_id, u);

  SELECT * INTO i FROM fn_iniciar_intento(u, (SELECT id FROM cuestionario WHERE titulo = 'prueba-e1'));
  INSERT INTO respuesta_pareja (intento_id, pareja_izquierda_id, pareja_derecha_id) VALUES
    (i.intento_id, (SELECT id FROM pareja WHERE texto_izquierdo = 'iz-1'), (SELECT id FROM pareja WHERE texto_izquierdo = 'iz-1'));
END
$prueba$;

-- ---------------------------------------------------------------------------
-- Exportación
-- ---------------------------------------------------------------------------
DO $prueba$
DECLARE
  u     UUID := (SELECT id FROM usuario WHERE correo = 'ana@echo.test');
  doc   JSONB;
  texto TEXT;
  claves TEXT;
BEGIN
  doc := fn_exportar_datos_usuario(u);
  texto := doc::text;

  SELECT string_agg(k, ',' ORDER BY k) INTO claves FROM jsonb_object_keys(doc) k;
  IF claves <> 'aceptaciones,cuenta,generadoEn,insignias,intentos,preferencias,progreso,sesiones' THEN
    RAISE EXCEPTION 'FALLO: claves del documento: %', claves;
  END IF;
  RAISE NOTICE 'OK 01 la exportación tiene exactamente las claves de ExportacionDatos';

  IF texto LIKE '%hash-secreto-ana%' OR texto LIKE '%google-sub-ana%'
     OR texto LIKE '%sesion-hash%' OR texto LIKE '%enlace-hash%' THEN
    RAISE EXCEPTION 'FALLO: la exportación contiene hashes, códigos o google_sub';
  END IF;
  RAISE NOTICE 'OK 02 sin hashes, códigos ni google_sub (INV-08)';

  IF doc #>> '{cuenta,metodoAcceso}' <> 'ambos' OR doc #>> '{cuenta,correo}' <> 'ana@echo.test' THEN
    RAISE EXCEPTION 'FALLO: cuenta exportada incorrecta: %', doc -> 'cuenta';
  END IF;
  IF jsonb_array_length(doc -> 'aceptaciones') <> 2
     OR doc #>> '{aceptaciones,0,direccionIp}' <> '203.0.113.7' THEN
    RAISE EXCEPTION 'FALLO: aceptaciones exportadas: %', doc -> 'aceptaciones';
  END IF;
  RAISE NOTICE 'OK 03 cuenta (método «ambos») y aceptaciones con su IP';

  IF jsonb_array_length(doc -> 'sesiones') <> 2
     OR (SELECT count(*) FROM jsonb_array_elements(doc -> 'sesiones') s WHERE s -> 'cerradaEn' = 'null'::jsonb) <> 1 THEN
    RAISE EXCEPTION 'FALLO: sesiones exportadas: %', doc -> 'sesiones';
  END IF;
  RAISE NOTICE 'OK 04 dos sesiones: una abierta (cerradaEn nulo) y una cerrada (DEC-94)';

  IF doc #>> '{generadoEn}' NOT LIKE '%+00:00' THEN
    RAISE EXCEPTION 'FALLO: las fechas deberían salir en UTC: %', doc #>> '{generadoEn}';
  END IF;
  RAISE NOTICE 'OK 05 fechas en ISO 8601 UTC';

  IF jsonb_array_length(doc -> 'intentos') <> 2
     OR texto LIKE '%a1-mal%'
     OR NOT EXISTS (
       SELECT 1 FROM jsonb_array_elements(doc -> 'intentos') x
       WHERE x ->> 'estado' = 'enCurso'
         AND x #>> '{respuestas,0,respuesta,0}' = 'iz-1 → de-1'
         AND x #> '{respuestas,0,puntaje}' = 'null'::jsonb) THEN
    RAISE EXCEPTION 'FALLO: intentos exportados: %', doc -> 'intentos';
  END IF;
  RAISE NOTICE 'OK 06 intentos con lo respondido, sin la opción no elegida y sin puntaje mientras está en curso';
END
$prueba$;

-- ---------------------------------------------------------------------------
-- Limpieza diaria
-- ---------------------------------------------------------------------------
RESET ROLE;
UPDATE usuario SET creado_en = now() - interval '25 hours' WHERE correo = 'beto@echo.test';
-- Ana tiene una sesión inactiva hace más de 30 min
INSERT INTO sesion (usuario_id, token_hash, ultima_actividad_en)
VALUES ((SELECT id FROM usuario WHERE correo = 'ana@echo.test'), 'sesion-hash-vencida', now() - interval '31 minutes');
SET LOCAL ROLE echo_app;

DO $prueba$
DECLARE
  r RECORD;
BEGIN
  SELECT * INTO r FROM fn_limpieza_diaria();
  -- Con la semilla u otros datos de desarrollo puede borrar más filas: se exige al menos lo de la prueba.
  IF r.cuentas_pendientes < 1 OR r.sesiones < 2 THEN
    RAISE EXCEPTION 'FALLO: limpieza esperada de al menos 1 cuenta y 2 sesiones (obtuvo %, %, %)',
      r.cuentas_pendientes, r.enlaces, r.sesiones;
  END IF;
  IF EXISTS (SELECT 1 FROM usuario WHERE correo = 'beto@echo.test')
     OR NOT EXISTS (SELECT 1 FROM usuario WHERE correo = 'caro@echo.test')
     OR NOT EXISTS (SELECT 1 FROM sesion WHERE token_hash = 'sesion-hash-abierta') THEN
    RAISE EXCEPTION 'FALLO: la limpieza borró de más o de menos';
  END IF;
  RAISE NOTICE 'OK 07 limpieza: borra la cuenta pendiente vieja y sesiones cerradas o vencidas; respeta lo vigente';

  BEGIN
    DELETE FROM usuario WHERE correo = 'caro@echo.test';
    RAISE EXCEPTION 'FALLO: echo_app no debería poder borrar usuarios';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'OK 08 echo_app sigue sin poder borrar usuarios directamente';
  END;
END
$prueba$;

-- La cuenta pendiente nunca se borra si tuviera historial (candado de la limpieza)
RESET ROLE;
UPDATE usuario SET creado_en = now() - interval '25 hours' WHERE correo = 'caro@echo.test';
INSERT INTO progreso_leccion (usuario_id, leccion_id)
VALUES ((SELECT id FROM usuario WHERE correo = 'caro@echo.test'), (SELECT id FROM leccion WHERE slug = 'prueba-l1'));
SET LOCAL ROLE echo_app;

DO $prueba$
BEGIN
  PERFORM fn_limpieza_diaria();
  IF NOT EXISTS (SELECT 1 FROM usuario WHERE correo = 'caro@echo.test') THEN
    RAISE EXCEPTION 'FALLO: la limpieza borró una cuenta con historial';
  END IF;
  RAISE NOTICE 'OK 09 la limpieza nunca borra una cuenta con historial';
END
$prueba$;

-- ---------------------------------------------------------------------------
-- Anonimización
-- ---------------------------------------------------------------------------
DO $prueba$
DECLARE
  u         UUID := (SELECT id FROM usuario WHERE correo = 'ana@echo.test');
  intentos0 BIGINT := (SELECT count(*) FROM intento WHERE usuario_id = u);
  r         RECORD;
BEGIN
  PERFORM fn_anonimizar_usuario(u);

  SELECT * INTO r FROM usuario WHERE id = u;
  IF r.estado <> 'anonimizado' OR r.anonimizado_en IS NULL
     OR r.nombre IS NOT NULL OR r.apellidos IS NOT NULL OR r.correo IS NOT NULL
     OR r.hash_contrasena IS NOT NULL OR r.google_sub IS NOT NULL
     OR r.correo_verificado_en IS NOT NULL OR r.mayoria_edad_confirmada_en IS NOT NULL THEN
    RAISE EXCEPTION 'FALLO: quedaron datos personales: %', row_to_json(r);
  END IF;
  IF NOT r.negativa_estadisticas THEN
    RAISE EXCEPTION 'FALLO: debería conservarse negativa_estadisticas';
  END IF;
  RAISE NOTICE 'OK 10 cuenta anonimizada: sin datos personales; conserva negativa_estadisticas';

  IF EXISTS (SELECT 1 FROM sesion WHERE usuario_id = u) OR EXISTS (SELECT 1 FROM token_correo WHERE usuario_id = u) THEN
    RAISE EXCEPTION 'FALLO: quedaron sesiones o enlaces';
  END IF;
  IF (SELECT count(*) FROM aceptacion_documento WHERE usuario_id = u AND direccion_ip IS NULL) <> 2 THEN
    RAISE EXCEPTION 'FALLO: las aceptaciones deberían conservarse sin IP';
  END IF;
  RAISE NOTICE 'OK 11 sin sesiones ni enlaces; aceptaciones conservadas sin IP (DEC-28)';

  IF (SELECT count(*) FROM intento WHERE usuario_id = u) <> intentos0 OR intentos0 = 0
     OR NOT EXISTS (SELECT 1 FROM progreso_leccion WHERE usuario_id = u) THEN
    RAISE EXCEPTION 'FALLO: el historial debería conservarse';
  END IF;
  RAISE NOTICE 'OK 12 historial académico intacto (INV-01)';

  PERFORM fn_anonimizar_usuario(u);
  RAISE NOTICE 'OK 13 anonimizar dos veces no falla (restauración de respaldos, DEC-95)';

  BEGIN
    PERFORM fn_exportar_datos_usuario(u);
    RAISE EXCEPTION 'FALLO: una cuenta anonimizada no debería exportarse';
  EXCEPTION WHEN SQLSTATE 'EC404' THEN
    RAISE NOTICE 'OK 14 exportar una cuenta anonimizada da NO_ENCONTRADO';
  END;

  BEGIN
    PERFORM fn_anonimizar_usuario('00000000-0000-0000-0000-000000000000');
    RAISE EXCEPTION 'FALLO: un usuario inexistente debería dar NO_ENCONTRADO';
  EXCEPTION WHEN SQLSTATE 'EC404' THEN
    RAISE NOTICE 'OK 15 anonimizar un usuario inexistente da NO_ENCONTRADO';
  END;

  INSERT INTO usuario (nombre, apellidos, correo, hash_contrasena, mayoria_edad_confirmada_en)
  VALUES ('Ana', 'Nueva', 'ana@echo.test', 'hash-nuevo', now());
  RAISE NOTICE 'OK 16 el correo queda libre para una cuenta nueva (DEC-27)';
END
$prueba$;

-- ---------------------------------------------------------------------------
-- Seguridad de las funciones
-- ---------------------------------------------------------------------------
RESET ROLE;
DO $prueba$
BEGIN
  IF has_function_privilege('echo_lectura', 'fn_anonimizar_usuario(uuid)', 'EXECUTE')
     OR has_function_privilege('echo_contenido', 'fn_limpieza_diaria()', 'EXECUTE')
     OR has_function_privilege('echo_lectura', 'fn_exportar_datos_usuario(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('echo_app', 'fn_anonimizar_usuario(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FALLO: solo echo_app debería ejecutar las funciones del ciclo de vida';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.proname IN ('fn_anonimizar_usuario', 'fn_limpieza_diaria')
      AND (NOT p.prosecdef
           OR p.proconfig IS NULL
           OR NOT ('search_path=public, pg_temp' = ANY (p.proconfig))
           OR pg_get_userbyid(p.proowner) <> 'echo_propietario')) THEN
    RAISE EXCEPTION 'FALLO: las funciones SECURITY DEFINER deben tener search_path fijo y ser de echo_propietario';
  END IF;
  RAISE NOTICE 'OK 17 solo echo_app las ejecuta; las SECURITY DEFINER tienen search_path fijo y dueño echo_propietario';
END
$prueba$;

ROLLBACK;
\echo 'Todas las pruebas de ciclo_de_vida_datos pasaron; la transacción se deshizo.'
