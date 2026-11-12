-- Pruebas de la migración vistas.
-- Se ejecutan con el superusuario con o sin la semilla cargada, dentro de una transacción que
-- se deshace al final: no dejan datos. Cada comprobación imprime «OK …»; la primera que falla detiene todo.
--
--   psql -U postgres -d echo -v ON_ERROR_STOP=1 -f prisma/sql/pruebas/vistas.sql

\set QUIET on
BEGIN;

SET LOCAL ROLE echo_contenido;

-- Si la base ya tiene la semilla u otro contenido, se despublica dentro de esta transacción (se deshace al final)
-- para que el desbloqueo y los órdenes de la prueba no choquen con él.
UPDATE modulo SET publicado = false WHERE slug NOT LIKE 'prueba-%';

INSERT INTO modulo (slug, titulo, descripcion, orden, publicado) VALUES ('prueba-m1', 'Módulo 1', 'd', 901, true);
INSERT INTO curso (modulo_id, slug, titulo, descripcion, orden, publicado) VALUES
  ((SELECT id FROM modulo WHERE slug = 'prueba-m1'), 'prueba-c1', 'Curso 1', 'd', 1, true),
  ((SELECT id FROM modulo WHERE slug = 'prueba-m1'), 'prueba-c2', 'Curso 2', 'd', 2, true);
INSERT INTO leccion (curso_id, slug, titulo, orden, publicado, publicado_en) VALUES
  ((SELECT id FROM curso WHERE slug = 'prueba-c1'), 'prueba-l1', 'Lección 1', 1, true, now()),
  ((SELECT id FROM curso WHERE slug = 'prueba-c1'), 'prueba-l2', 'Lección 2', 2, true, now()),
  ((SELECT id FROM curso WHERE slug = 'prueba-c2'), 'prueba-l3', 'Lección 3', 1, true, now());
INSERT INTO cuestionario (tipo, leccion_id, curso_id, orden, titulo, instrucciones) VALUES
  ('actividad', (SELECT id FROM leccion WHERE slug = 'prueba-l1'), NULL, 1, 'prueba-a1', 'i'),
  ('caso',      (SELECT id FROM leccion WHERE slug = 'prueba-l1'), NULL, 2, 'prueba-k1', 'i'),
  ('examen',    NULL, (SELECT id FROM curso WHERE slug = 'prueba-c1'), NULL, 'prueba-e1', 'i');
INSERT INTO pregunta (cuestionario_id, tipo, enunciado, orden) VALUES
  ((SELECT id FROM cuestionario WHERE titulo = 'prueba-a1'), 'opcion_multiple', 'a1-p1', 1),
  ((SELECT id FROM cuestionario WHERE titulo = 'prueba-e1'), 'opcion_multiple', 'e1-p1', 1);
INSERT INTO opcion (pregunta_id, texto, valor, orden) VALUES
  ((SELECT id FROM pregunta WHERE enunciado = 'a1-p1'), 'a1-bien', 1, 1),
  ((SELECT id FROM pregunta WHERE enunciado = 'e1-p1'), 'e1-bien', 1, 1);

SET LOCAL ROLE echo_app;

INSERT INTO usuario (nombre, apellidos, correo, hash_contrasena, mayoria_edad_confirmada_en, negativa_estadisticas) VALUES
  ('Ana',  'Prueba', 'ana@echo.test',  'h', now(), false),
  ('Beto', 'Prueba', 'beto@echo.test', 'h', now(), true);

-- Ana: lección 1 terminada y actividad enviada; Beto: igual, pero rechazó las estadísticas
INSERT INTO progreso_leccion (usuario_id, leccion_id, terminada_en)
SELECT u.id, (SELECT id FROM leccion WHERE slug = 'prueba-l1'), now() FROM usuario u WHERE u.correo LIKE '%@echo.test';

DO $prueba$
DECLARE
  u UUID;
  i RECORD;
BEGIN
  FOR u IN SELECT id FROM usuario WHERE correo LIKE '%@echo.test' LOOP
    SELECT * INTO i FROM fn_iniciar_intento(u, (SELECT id FROM cuestionario WHERE titulo = 'prueba-a1'));
    INSERT INTO respuesta_opcion (intento_id, pregunta_id, opcion_id)
    VALUES (i.intento_id, (SELECT id FROM pregunta WHERE enunciado = 'a1-p1'), (SELECT id FROM opcion WHERE texto = 'a1-bien'));
    PERFORM fn_enviar_intento(i.intento_id, u);
  END LOOP;
END
$prueba$;

DO $prueba$
DECLARE
  ana UUID := (SELECT id FROM usuario WHERE correo = 'ana@echo.test');
  r   RECORD;
BEGIN
  -- Curso 1: lecciones 1/2 = 50 %, actividades 1/1 = 100 %, casos 0/1 = 0 %, examen 0 % → 37.50
  SELECT * INTO r FROM v_avance_curso v
  WHERE v.usuario_id = ana AND v.curso_id = (SELECT id FROM curso WHERE slug = 'prueba-c1');
  IF r.avance <> 37.50 OR r.lecciones_total <> 2 OR r.lecciones_terminadas <> 1
     OR r.actividades_enviadas <> 1 OR r.casos_total <> 1 OR r.examen_aprobado THEN
    RAISE EXCEPTION 'FALLO: avance del curso 1: %', row_to_json(r);
  END IF;
  RAISE NOTICE 'OK 01 avance parcial 37.50 = promedio de lecciones, actividades, casos y examen (DEC-14)';

  -- Curso 2: solo tiene una lección sin terminar y no tiene examen → 0 (componentes vacíos no cuentan)
  SELECT * INTO r FROM v_avance_curso v
  WHERE v.usuario_id = ana AND v.curso_id = (SELECT id FROM curso WHERE slug = 'prueba-c2');
  IF r.avance <> 0 THEN RAISE EXCEPTION 'FALLO: avance del curso 2: %', row_to_json(r); END IF;
  RAISE NOTICE 'OK 02 curso sin componentes cumplidos: 0.00 sin división entre cero';
END
$prueba$;

-- Ana aprueba el examen (se omiten los requisitos de avance: solo se prueba la vista)
RESET ROLE;
INSERT INTO intento (usuario_id, cuestionario_id, estado, enviado_en, calificacion, aprobado)
VALUES ((SELECT id FROM usuario WHERE correo = 'ana@echo.test'),
        (SELECT id FROM cuestionario WHERE titulo = 'prueba-e1'), 'enviado', now(), 100, true);
SET LOCAL ROLE echo_app;

DO $prueba$
DECLARE
  ana UUID := (SELECT id FROM usuario WHERE correo = 'ana@echo.test');
  r   RECORD;
BEGIN
  SELECT * INTO r FROM v_avance_curso v
  WHERE v.usuario_id = ana AND v.curso_id = (SELECT id FROM curso WHERE slug = 'prueba-c1');
  IF r.avance <> 100 OR NOT r.examen_aprobado THEN
    RAISE EXCEPTION 'FALLO: con el examen aprobado el curso vale 100: %', row_to_json(r);
  END IF;
  RAISE NOTICE 'OK 03 examen aprobado = 100.00 aunque falten lecciones (DEC-10, DEC-14)';
END
$prueba$;

-- Resultados anónimos, como echo_lectura
RESET ROLE;
SET LOCAL ROLE echo_lectura;

DO $prueba$
DECLARE
  n INT;
  columnas TEXT;
BEGIN
  SELECT count(*) INTO n FROM v_resultados_anonimos WHERE modulo = 'prueba-m1';
  IF n <> 2 THEN
    RAISE EXCEPTION 'FALLO: se esperaban 2 intentos de Ana (Beto rechazó las estadísticas); hay %', n;
  END IF;
  RAISE NOTICE 'OK 04 excluye a quien rechazó las estadísticas (DEC-88)';

  SELECT string_agg(column_name, ',' ORDER BY ordinal_position) INTO columnas
  FROM information_schema.columns WHERE table_name = 'v_resultados_anonimos';
  IF columnas IS NULL OR columnas ~ '(usuario|nombre|correo|apellido|_id)' THEN
    RAISE EXCEPTION 'FALLO: la vista expone columnas que identifican: %', columnas;
  END IF;
  RAISE NOTICE 'OK 05 sin identificador, nombre ni correo del alumno';

  BEGIN
    PERFORM 1 FROM usuario LIMIT 1;
    RAISE EXCEPTION 'FALLO: echo_lectura no debería leer usuario';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'OK 06 echo_lectura lee la vista pero no la tabla usuario';
  END;

  BEGIN
    PERFORM 1 FROM v_avance_curso LIMIT 1;
    RAISE EXCEPTION 'FALLO: echo_lectura no debería leer v_avance_curso';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'OK 07 echo_lectura no lee v_avance_curso';
  END;
END
$prueba$;

ROLLBACK;
\echo 'Todas las pruebas de vistas pasaron; la transacción se deshizo.'
