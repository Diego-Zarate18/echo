-- Pruebas de la migración logica_intentos.
-- Se ejecutan con el superusuario con o sin la semilla cargada, dentro de una transacción que
-- se deshace al final: no dejan datos. Cada comprobación imprime «OK …»; la primera que falla detiene todo.
--
--   psql -U postgres -d echo -v ON_ERROR_STOP=1 -f prisma/sql/pruebas/logica_intentos.sql

\set QUIET on
BEGIN;

-- ---------------------------------------------------------------------------
-- Contenido de prueba, cargado como echo_contenido
-- ---------------------------------------------------------------------------
SET LOCAL ROLE echo_contenido;

-- Si la base ya tiene la semilla u otro contenido, se despublica dentro de esta transacción (se deshace al final)
-- para que el desbloqueo y los órdenes de la prueba no choquen con él.
UPDATE modulo SET publicado = false WHERE slug NOT LIKE 'prueba-%';

INSERT INTO imagen (ruta, texto_alternativo) VALUES ('prueba/insignia.png', 'Insignia de prueba');
INSERT INTO modulo (slug, titulo, descripcion, orden, publicado) VALUES
  ('prueba-m1', 'Módulo 1', 'd', 901, true),
  ('prueba-m2', 'Módulo 2', 'd', 902, true);
INSERT INTO curso (modulo_id, slug, titulo, descripcion, orden, publicado) VALUES
  ((SELECT id FROM modulo WHERE slug = 'prueba-m1'), 'prueba-c1', 'Curso 1', 'd', 1, true),
  ((SELECT id FROM modulo WHERE slug = 'prueba-m2'), 'prueba-c2', 'Curso 2', 'd', 1, true);
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
  ((SELECT id FROM cuestionario WHERE titulo = 'prueba-k1'), 'decision',        'k1-p1', 1),
  ((SELECT id FROM cuestionario WHERE titulo = 'prueba-e1'), 'opcion_multiple', 'e1-p1', 1),
  ((SELECT id FROM cuestionario WHERE titulo = 'prueba-e1'), 'relacion',        'e1-p2', 2);
INSERT INTO opcion (pregunta_id, texto, valor, orden) VALUES
  ((SELECT id FROM pregunta WHERE enunciado = 'a1-p1'), 'a1-bien',  1,   1),
  ((SELECT id FROM pregunta WHERE enunciado = 'a1-p1'), 'a1-mal',   0,   2),
  ((SELECT id FROM pregunta WHERE enunciado = 'k1-p1'), 'k1-media', 0.5, 1),
  ((SELECT id FROM pregunta WHERE enunciado = 'k1-p1'), 'k1-mejor', 1,   2),
  ((SELECT id FROM pregunta WHERE enunciado = 'e1-p1'), 'e1-bien',  1,   1),
  ((SELECT id FROM pregunta WHERE enunciado = 'e1-p1'), 'e1-mal',   0,   2);
INSERT INTO pareja (pregunta_id, texto_izquierdo, texto_derecho, orden) VALUES
  ((SELECT id FROM pregunta WHERE enunciado = 'e1-p2'), 'iz-1', 'de-1', 1),
  ((SELECT id FROM pregunta WHERE enunciado = 'e1-p2'), 'iz-2', 'de-2', 2);
INSERT INTO insignia (modulo_id, nombre, descripcion, imagen_id) VALUES
  ((SELECT id FROM modulo WHERE slug = 'prueba-m1'), 'Insignia 1', 'd',
   (SELECT id FROM imagen WHERE ruta = 'prueba/insignia.png'));

-- ---------------------------------------------------------------------------
-- Alumno de prueba y primera ronda, como echo_app
-- ---------------------------------------------------------------------------
SET LOCAL ROLE echo_app;

INSERT INTO usuario (nombre, apellidos, correo, hash_contrasena, mayoria_edad_confirmada_en)
VALUES ('Prueba', 'Echo', 'prueba@echo.test', 'hash-de-prueba', now());

DO $prueba$
DECLARE
  u  UUID   := (SELECT id FROM usuario WHERE correo = 'prueba@echo.test');
  a1 BIGINT := (SELECT id FROM cuestionario WHERE titulo = 'prueba-a1');
  k1 BIGINT := (SELECT id FROM cuestionario WHERE titulo = 'prueba-k1');
  e1 BIGINT := (SELECT id FROM cuestionario WHERE titulo = 'prueba-e1');
  i  RECORD;
  j  RECORD;
  r  RECORD;
  b  BOOLEAN;
BEGIN
  -- Estado inicial del desbloqueo
  SELECT e.desbloqueado INTO b FROM fn_estado_desbloqueo(u) e
  WHERE e.tipo = 'modulo' AND e.id = (SELECT id FROM modulo WHERE slug = 'prueba-m1');
  IF NOT b THEN RAISE EXCEPTION 'FALLO: el primer módulo debería estar desbloqueado'; END IF;
  SELECT e.desbloqueado INTO b FROM fn_estado_desbloqueo(u) e
  WHERE e.tipo = 'modulo' AND e.id = (SELECT id FROM modulo WHERE slug = 'prueba-m2');
  IF b THEN RAISE EXCEPTION 'FALLO: el segundo módulo debería estar bloqueado'; END IF;
  SELECT e.desbloqueado INTO b FROM fn_estado_desbloqueo(u) e
  WHERE e.tipo = 'leccion' AND e.id = (SELECT id FROM leccion WHERE slug = 'prueba-l2');
  IF b THEN RAISE EXCEPTION 'FALLO: la lección 2 debería estar bloqueada'; END IF;
  RAISE NOTICE 'OK 01 estado inicial: módulo 1 abierto, módulo 2 y lección 2 bloqueados';

  -- Actividad antes de leer la lección
  BEGIN
    PERFORM fn_iniciar_intento(u, a1);
    RAISE EXCEPTION 'FALLO: la actividad no debería abrirse sin leer la lección';
  EXCEPTION WHEN SQLSTATE 'EC403' THEN
    RAISE NOTICE 'OK 02 actividad bloqueada sin leer la lección (BLOQUEADO_POR_AVANCE)';
  END;

  -- Cuestionario inexistente
  BEGIN
    PERFORM fn_iniciar_intento(u, -1);
    RAISE EXCEPTION 'FALLO: un cuestionario inexistente debería dar NO_ENCONTRADO';
  EXCEPTION WHEN SQLSTATE 'EC404' THEN
    RAISE NOTICE 'OK 03 cuestionario inexistente (NO_ENCONTRADO)';
  END;

  INSERT INTO progreso_leccion (usuario_id, leccion_id, ultima_seccion, terminada_en)
  VALUES (u, (SELECT id FROM leccion WHERE slug = 'prueba-l1'), 1, now());

  -- El caso va después de la actividad (cuestionario.orden)
  BEGIN
    PERFORM fn_iniciar_intento(u, k1);
    RAISE EXCEPTION 'FALLO: el caso no debería abrirse antes de enviar la actividad';
  EXCEPTION WHEN SQLSTATE 'EC403' THEN
    RAISE NOTICE 'OK 04 caso bloqueado hasta enviar la actividad';
  END;

  -- Actividad: iniciar, retomar, responder mal, enviar
  SELECT * INTO i FROM fn_iniciar_intento(u, a1);
  IF i.retomado OR i.numero <> 1 THEN RAISE EXCEPTION 'FALLO: primer intento esperado (numero 1)'; END IF;
  SELECT * INTO j FROM fn_iniciar_intento(u, a1);
  IF NOT j.retomado OR j.intento_id <> i.intento_id THEN
    RAISE EXCEPTION 'FALLO: debería retomarse el mismo intento';
  END IF;
  RAISE NOTICE 'OK 05 intento creado con número 1 y retomado en la segunda llamada';

  BEGIN
    PERFORM fn_enviar_intento(i.intento_id, u);
    RAISE EXCEPTION 'FALLO: no debería enviarse sin respuestas';
  EXCEPTION WHEN SQLSTATE 'EC422' THEN
    RAISE NOTICE 'OK 06 envío sin respuestas (RESPUESTAS_INCOMPLETAS)';
  END;

  -- Respuesta con una pregunta de otro cuestionario
  BEGIN
    INSERT INTO respuesta_opcion (intento_id, pregunta_id, opcion_id)
    VALUES (i.intento_id, (SELECT id FROM pregunta WHERE enunciado = 'e1-p1'),
            (SELECT id FROM opcion WHERE texto = 'e1-bien'));
    RAISE EXCEPTION 'FALLO: no debería aceptarse una pregunta de otro cuestionario';
  EXCEPTION WHEN SQLSTATE 'EC400' THEN
    RAISE NOTICE 'OK 07 pregunta de otro cuestionario rechazada (DATOS_INVALIDOS)';
  END;

  -- Intento ajeno
  BEGIN
    PERFORM fn_enviar_intento(i.intento_id, '00000000-0000-0000-0000-000000000000');
    RAISE EXCEPTION 'FALLO: un intento ajeno debería dar NO_ENCONTRADO';
  EXCEPTION WHEN SQLSTATE 'EC404' THEN
    RAISE NOTICE 'OK 08 intento de otro alumno (NO_ENCONTRADO)';
  END;

  -- El cliente no puede fijarse el puntaje: el disparador lo borra al elegir
  INSERT INTO respuesta_opcion (intento_id, pregunta_id, opcion_id, puntaje)
  VALUES (i.intento_id, (SELECT id FROM pregunta WHERE enunciado = 'a1-p1'),
          (SELECT id FROM opcion WHERE texto = 'a1-mal'), 1);
  IF (SELECT puntaje FROM respuesta_opcion WHERE intento_id = i.intento_id) IS NOT NULL THEN
    RAISE EXCEPTION 'FALLO: el puntaje enviado por el cliente debería borrarse';
  END IF;
  RAISE NOTICE 'OK 09 puntaje del cliente descartado';

  SELECT * INTO r FROM fn_enviar_intento(i.intento_id, u);
  IF r.calificacion <> 0 OR r.aprobado IS NOT NULL THEN
    RAISE EXCEPTION 'FALLO: actividad respondida mal: 0.00 y aprobado nulo (obtuvo %, %)', r.calificacion, r.aprobado;
  END IF;
  RAISE NOTICE 'OK 10 actividad calificada 0.00, sin aprobado (DEC-06)';

  BEGIN
    PERFORM fn_enviar_intento(i.intento_id, u);
    RAISE EXCEPTION 'FALLO: no debería enviarse dos veces';
  EXCEPTION WHEN SQLSTATE 'EC411' THEN
    RAISE NOTICE 'OK 11 segundo envío (INTENTO_CERRADO)';
  END;

  BEGIN
    UPDATE respuesta_opcion SET opcion_id = (SELECT id FROM opcion WHERE texto = 'a1-bien')
    WHERE intento_id = i.intento_id;
    RAISE EXCEPTION 'FALLO: no debería cambiarse la respuesta de un intento enviado';
  EXCEPTION WHEN SQLSTATE 'EC411' THEN
    RAISE NOTICE 'OK 12 respuesta en intento enviado rechazada';
  END;

  -- Reintento de la actividad: número 2
  SELECT * INTO j FROM fn_iniciar_intento(u, a1);
  IF j.numero <> 2 THEN RAISE EXCEPTION 'FALLO: el reintento debería ser el número 2'; END IF;
  INSERT INTO respuesta_opcion (intento_id, pregunta_id, opcion_id)
  VALUES (j.intento_id, (SELECT id FROM pregunta WHERE enunciado = 'a1-p1'),
          (SELECT id FROM opcion WHERE texto = 'a1-bien'));
  SELECT * INTO r FROM fn_enviar_intento(j.intento_id, u);
  IF r.calificacion <> 100 THEN RAISE EXCEPTION 'FALLO: reintento correcto debería valer 100'; END IF;
  RAISE NOTICE 'OK 13 reintento número 2 calificado 100.00';

  -- Caso con valor intermedio
  SELECT * INTO i FROM fn_iniciar_intento(u, k1);
  INSERT INTO respuesta_opcion (intento_id, pregunta_id, opcion_id)
  VALUES (i.intento_id, (SELECT id FROM pregunta WHERE enunciado = 'k1-p1'),
          (SELECT id FROM opcion WHERE texto = 'k1-media'));
  SELECT * INTO r FROM fn_enviar_intento(i.intento_id, u);
  IF r.calificacion <> 50 THEN RAISE EXCEPTION 'FALLO: caso con valor 0.5 debería valer 50.00 (obtuvo %)', r.calificacion; END IF;
  RAISE NOTICE 'OK 14 caso ponderado calificado 50.00 (DEC-08)';

  -- Examen antes de terminar la lección 2
  BEGIN
    PERFORM fn_iniciar_intento(u, e1);
    RAISE EXCEPTION 'FALLO: el examen no debería abrirse con lecciones pendientes';
  EXCEPTION WHEN SQLSTATE 'EC403' THEN
    RAISE NOTICE 'OK 15 examen bloqueado con lecciones pendientes';
  END;

  INSERT INTO progreso_leccion (usuario_id, leccion_id, ultima_seccion, terminada_en)
  VALUES (u, (SELECT id FROM leccion WHERE slug = 'prueba-l2'), 1, now());

  -- Examen: incompleto y luego reprobado (1 de 2 = 50 < 70)
  SELECT * INTO i FROM fn_iniciar_intento(u, e1);
  INSERT INTO respuesta_opcion (intento_id, pregunta_id, opcion_id)
  VALUES (i.intento_id, (SELECT id FROM pregunta WHERE enunciado = 'e1-p1'),
          (SELECT id FROM opcion WHERE texto = 'e1-bien'));
  BEGIN
    PERFORM fn_enviar_intento(i.intento_id, u);
    RAISE EXCEPTION 'FALLO: faltaba la relación de columnas';
  EXCEPTION WHEN SQLSTATE 'EC422' THEN
    RAISE NOTICE 'OK 16 relación de columnas sin responder (RESPUESTAS_INCOMPLETAS)';
  END;

  -- Parejas cruzadas: 0 de 2
  INSERT INTO respuesta_pareja (intento_id, pareja_izquierda_id, pareja_derecha_id) VALUES
    (i.intento_id, (SELECT id FROM pareja WHERE texto_izquierdo = 'iz-1'), (SELECT id FROM pareja WHERE texto_izquierdo = 'iz-2')),
    (i.intento_id, (SELECT id FROM pareja WHERE texto_izquierdo = 'iz-2'), (SELECT id FROM pareja WHERE texto_izquierdo = 'iz-1'));
  SELECT * INTO r FROM fn_enviar_intento(i.intento_id, u);
  IF r.calificacion <> 50 OR r.aprobado OR r.insignia_id IS NOT NULL THEN
    RAISE EXCEPTION 'FALLO: examen esperado 50.00 reprobado sin insignia (obtuvo %, %, %)', r.calificacion, r.aprobado, r.insignia_id;
  END IF;
  RAISE NOTICE 'OK 17 examen reprobado con 50.00';

  BEGIN
    PERFORM fn_iniciar_intento(u, e1);
    RAISE EXCEPTION 'FALLO: debería haber espera tras reprobar';
  EXCEPTION WHEN SQLSTATE 'EC409' THEN
    RAISE NOTICE 'OK 18 nuevo intento durante la espera (EN_ESPERA)';
  END;
END
$prueba$;

-- ---------------------------------------------------------------------------
-- Simular que pasaron 21 minutos (solo el superusuario puede mover la fecha)
-- ---------------------------------------------------------------------------
RESET ROLE;
UPDATE intento
   SET iniciado_en = iniciado_en - interval '21 minutes',
       enviado_en  = enviado_en  - interval '21 minutes'
 WHERE cuestionario_id = (SELECT id FROM cuestionario WHERE titulo = 'prueba-e1');

SET LOCAL ROLE echo_app;

DO $prueba$
DECLARE
  u  UUID   := (SELECT id FROM usuario WHERE correo = 'prueba@echo.test');
  e1 BIGINT := (SELECT id FROM cuestionario WHERE titulo = 'prueba-e1');
  i  RECORD;
  r  RECORD;
  b  BOOLEAN;
BEGIN
  SELECT * INTO i FROM fn_iniciar_intento(u, e1);
  IF i.numero <> 2 THEN RAISE EXCEPTION 'FALLO: segundo intento del examen esperado'; END IF;
  RAISE NOTICE 'OK 19 vencida la espera, se abre el intento número 2';

  INSERT INTO respuesta_opcion (intento_id, pregunta_id, opcion_id)
  VALUES (i.intento_id, (SELECT id FROM pregunta WHERE enunciado = 'e1-p1'),
          (SELECT id FROM opcion WHERE texto = 'e1-bien'));
  -- Primero cruzadas y luego corregidas: el cambio también se valida
  INSERT INTO respuesta_pareja (intento_id, pareja_izquierda_id, pareja_derecha_id) VALUES
    (i.intento_id, (SELECT id FROM pareja WHERE texto_izquierdo = 'iz-1'), (SELECT id FROM pareja WHERE texto_izquierdo = 'iz-1')),
    (i.intento_id, (SELECT id FROM pareja WHERE texto_izquierdo = 'iz-2'), (SELECT id FROM pareja WHERE texto_izquierdo = 'iz-2'));

  SELECT * INTO r FROM fn_enviar_intento(i.intento_id, u);
  IF r.calificacion <> 100 OR NOT r.aprobado OR r.insignia_id IS NULL THEN
    RAISE EXCEPTION 'FALLO: examen esperado 100.00 aprobado con insignia (obtuvo %, %, %)', r.calificacion, r.aprobado, r.insignia_id;
  END IF;
  RAISE NOTICE 'OK 20 examen aprobado con 100.00 y la insignia del módulo otorgada (OP-32)';

  BEGIN
    PERFORM fn_iniciar_intento(u, e1);
    RAISE EXCEPTION 'FALLO: un examen aprobado no debería admitir intentos';
  EXCEPTION WHEN SQLSTATE 'EC410' THEN
    RAISE NOTICE 'OK 21 examen aprobado cerrado (EXAMEN_APROBADO)';
  END;

  SELECT e.desbloqueado INTO b FROM fn_estado_desbloqueo(u) e
  WHERE e.tipo = 'leccion' AND e.id = (SELECT id FROM leccion WHERE slug = 'prueba-l3');
  IF NOT b THEN RAISE EXCEPTION 'FALLO: la lección del módulo 2 debería desbloquearse'; END IF;
  RAISE NOTICE 'OK 22 módulo completo: se desbloquea el módulo siguiente';
END
$prueba$;

-- ---------------------------------------------------------------------------
-- Permisos: echo_lectura no puede ejecutar las funciones
-- ---------------------------------------------------------------------------
RESET ROLE;
DO $prueba$
BEGIN
  IF has_function_privilege('echo_lectura', 'fn_iniciar_intento(uuid, bigint)', 'EXECUTE')
     OR has_function_privilege('echo_contenido', 'fn_enviar_intento(uuid, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FALLO: solo echo_app debería ejecutar las funciones de intentos';
  END IF;
  RAISE NOTICE 'OK 23 solo echo_app ejecuta las funciones';
END
$prueba$;

ROLLBACK;
\echo 'Todas las pruebas de logica_intentos pasaron; la transacción se deshizo.'
