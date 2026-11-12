-- Lógica de intentos (sección 4.2 del reporte): desbloqueo, inicio, envío y calificación.
-- FN-ESTADO-DESBLOQUEO (nueva, aprobada el 09/11/2026), FN-INICIAR-INTENTO, FN-ENVIAR-INTENTO,
-- TRG-INTENTO-NUMERO y TRG-RESPUESTA-VALIDA. Decisiones: DEC-03, 06, 07, 08, 09, 10, 19, 20, 21.
--
-- Errores: cada función lanza el código de la API como mensaje y un SQLSTATE propio de clase EC,
-- para que el backend los traduzca sin interpretar textos (DEC-85):
--   EC400 DATOS_INVALIDOS         EC404 NO_ENCONTRADO          EC403 BLOQUEADO_POR_AVANCE
--   EC409 EN_ESPERA (DETAIL = disponible_en en ISO 8601)       EC410 EXAMEN_APROBADO
--   EC411 INTENTO_CERRADO         EC422 RESPUESTAS_INCOMPLETAS (DETAIL = ids de pregunta separados por coma)
--
-- Todas son SECURITY INVOKER: se ejecutan con los permisos de echo_app.

-- ============================================================================
-- fn_estado_desbloqueo(usuario): una sola versión de la regla de avance lineal (DEC-03)
-- ============================================================================
-- Devuelve, para el contenido publicado, si cada módulo, curso, lección y cuestionario activo
-- está desbloqueado y completo para el alumno. La usan fn_iniciar_intento y el backend
-- (listados de módulos, cursos y lecciones). El backend la llama siempre con el alumno de la sesión (INV-07).
--
--   Cuestionario (actividad o caso): completo = enviado al menos una vez (DEC-06).
--   Lección:  completa = terminada («Terminé la lección») y todos sus cuestionarios activos enviados.
--   Curso:    completo = su examen aprobado (todo curso publicado tiene examen, regla del script de carga).
--   Módulo:   completo = todos sus cursos publicados completos, o la insignia ya otorgada (DEC-10).
--   Módulo desbloqueado:  todos los módulos anteriores completos.
--   Curso desbloqueado:   su módulo desbloqueado y los cursos anteriores del módulo completos.
--   Lección desbloqueada: su curso desbloqueado y (curso completo o lecciones anteriores completas);
--                         así una lección agregada a un curso ya completado no bloquea nada (DEC-10).
--   Actividad o caso:     su lección desbloqueada y terminada, y los anteriores de la lección enviados.
--   Examen:               su curso desbloqueado y todas las lecciones publicadas del curso completas.
CREATE FUNCTION fn_estado_desbloqueo(p_usuario UUID)
RETURNS TABLE (tipo TEXT, id BIGINT, desbloqueado BOOLEAN, completo BOOLEAN)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $funcion$
  WITH
  modulos AS (
    SELECT m.id, m.orden
    FROM modulo m
    WHERE m.publicado
  ),
  cursos AS (
    SELECT c.id, c.modulo_id, c.orden
    FROM curso c
    JOIN modulos m ON m.id = c.modulo_id
    WHERE c.publicado
  ),
  lecciones AS (
    SELECT l.id, l.curso_id, l.orden
    FROM leccion l
    JOIN cursos c ON c.id = l.curso_id
    WHERE l.publicado
  ),
  enviados AS (
    SELECT DISTINCT i.cuestionario_id
    FROM intento i
    WHERE i.usuario_id = p_usuario AND i.estado = 'enviado'
  ),
  aprobados AS (
    SELECT i.cuestionario_id
    FROM intento i
    WHERE i.usuario_id = p_usuario AND i.aprobado
  ),
  -- Actividades y casos activos de lecciones publicadas.
  practicas AS (
    SELECT q.id, q.leccion_id, q.orden,
           EXISTS (SELECT 1 FROM enviados e WHERE e.cuestionario_id = q.id) AS completo
    FROM cuestionario q
    JOIN lecciones l ON l.id = q.leccion_id
    WHERE q.activo AND q.tipo IN ('actividad', 'caso')
  ),
  lecciones_c AS (
    SELECT l.id, l.curso_id, l.orden,
           (p.terminada_en IS NOT NULL) AS leida,
           (p.terminada_en IS NOT NULL
             AND coalesce((SELECT bool_and(q.completo) FROM practicas q WHERE q.leccion_id = l.id), true)) AS completo
    FROM lecciones l
    LEFT JOIN progreso_leccion p ON p.leccion_id = l.id AND p.usuario_id = p_usuario
  ),
  cursos_c AS (
    SELECT c.id, c.modulo_id, c.orden,
           EXISTS (
             SELECT 1
             FROM cuestionario q
             JOIN aprobados a ON a.cuestionario_id = q.id
             WHERE q.curso_id = c.id AND q.tipo = 'examen'
           ) AS completo
    FROM cursos c
  ),
  modulos_c AS (
    SELECT m.id, m.orden,
           (coalesce((SELECT bool_and(c.completo) FROM cursos_c c WHERE c.modulo_id = m.id), false)
             OR EXISTS (
               SELECT 1
               FROM insignia s
               JOIN insignia_usuario iu ON iu.insignia_id = s.id AND iu.usuario_id = p_usuario
               WHERE s.modulo_id = m.id
             )) AS completo
    FROM modulos m
  ),
  modulos_d AS (
    SELECT m.id, m.completo,
           coalesce(bool_and(m.completo) OVER (
             ORDER BY m.orden ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), true) AS desbloqueado
    FROM modulos_c m
  ),
  cursos_d AS (
    SELECT c.id, c.completo,
           md.desbloqueado
             AND coalesce(bool_and(c.completo) OVER (
               PARTITION BY c.modulo_id ORDER BY c.orden ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), true)
             AS desbloqueado
    FROM cursos_c c
    JOIN modulos_d md ON md.id = c.modulo_id
  ),
  lecciones_d AS (
    SELECT l.id, l.leida, l.completo,
           cd.desbloqueado
             AND (cd.completo
                  OR coalesce(bool_and(l.completo) OVER (
                       PARTITION BY l.curso_id ORDER BY l.orden ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), true))
             AS desbloqueado
    FROM lecciones_c l
    JOIN cursos_d cd ON cd.id = l.curso_id
  ),
  practicas_d AS (
    SELECT q.id, q.completo,
           ld.desbloqueado AND ld.leida
             AND coalesce(bool_and(q.completo) OVER (
               PARTITION BY q.leccion_id ORDER BY q.orden ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), true)
             AS desbloqueado
    FROM practicas q
    JOIN lecciones_d ld ON ld.id = q.leccion_id
  ),
  examenes_d AS (
    SELECT q.id, cd.completo,
           cd.desbloqueado
             AND coalesce((SELECT bool_and(l.completo) FROM lecciones_c l WHERE l.curso_id = q.curso_id), true)
             AS desbloqueado
    FROM cuestionario q
    JOIN cursos_d cd ON cd.id = q.curso_id
    WHERE q.activo AND q.tipo = 'examen'
  )
  SELECT 'modulo'::text, md.id, md.desbloqueado, md.completo FROM modulos_d md
  UNION ALL
  SELECT 'curso', cd.id, cd.desbloqueado, cd.completo FROM cursos_d cd
  UNION ALL
  SELECT 'leccion', ld.id, ld.desbloqueado, ld.completo FROM lecciones_d ld
  UNION ALL
  SELECT 'cuestionario', pd.id, pd.desbloqueado, pd.completo FROM practicas_d pd
  UNION ALL
  SELECT 'cuestionario', ed.id, ed.desbloqueado, ed.completo FROM examenes_d ed;
$funcion$;

-- ============================================================================
-- trg_intento_numero: número consecutivo por alumno y cuestionario
-- ============================================================================
CREATE FUNCTION trg_intento_numero()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $funcion$
BEGIN
  SELECT coalesce(max(i.numero), 0) + 1
    INTO NEW.numero
  FROM intento i
  WHERE i.usuario_id = NEW.usuario_id
    AND i.cuestionario_id = NEW.cuestionario_id;
  RETURN NEW;
END;
$funcion$;

CREATE TRIGGER trg_intento_numero
  BEFORE INSERT ON intento
  FOR EACH ROW EXECUTE FUNCTION trg_intento_numero();

-- ============================================================================
-- trg_respuesta_valida: respuestas solo en intentos abiertos y del mismo cuestionario
-- ============================================================================
-- Que el intento sea del alumno de la sesión lo valida el backend (INV-07): la base no sabe quién pide.
-- Al cambiar la elección se borra el puntaje (solo fn_enviar_intento califica, INV-04) y se renueva
-- respondido_en. Si la elección no cambia (fn_enviar_intento escribiendo el puntaje), solo se exige
-- que el intento siga en curso.
CREATE FUNCTION trg_respuesta_valida()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $funcion$
DECLARE
  v_estado       TEXT;
  v_cuestionario BIGINT;
  v_cambio       BOOLEAN;
  v_valida       BOOLEAN;
BEGIN
  SELECT i.estado, i.cuestionario_id
    INTO v_estado, v_cuestionario
  FROM intento i
  WHERE i.id = NEW.intento_id;

  IF v_estado IS DISTINCT FROM 'en_curso' THEN
    RAISE EXCEPTION 'INTENTO_CERRADO' USING ERRCODE = 'EC411';
  END IF;

  IF TG_TABLE_NAME = 'respuesta_opcion' THEN
    v_cambio := TG_OP = 'INSERT'
                OR NEW.pregunta_id IS DISTINCT FROM OLD.pregunta_id
                OR NEW.opcion_id IS DISTINCT FROM OLD.opcion_id;
    IF v_cambio THEN
      -- La llave foránea compuesta ya garantiza que la opción sea de esa pregunta.
      SELECT EXISTS (
        SELECT 1
        FROM pregunta p
        JOIN opcion o ON o.id = NEW.opcion_id AND o.pregunta_id = p.id
        WHERE p.id = NEW.pregunta_id
          AND p.cuestionario_id = v_cuestionario
          AND p.activa
          AND o.activa
          AND p.tipo IN ('opcion_multiple', 'verdadero_falso', 'decision')
      ) INTO v_valida;
      IF NOT v_valida THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS' USING ERRCODE = 'EC400';
      END IF;
      NEW.puntaje := NULL;
      NEW.respondido_en := now();
    END IF;
  ELSE
    v_cambio := TG_OP = 'INSERT'
                OR NEW.pareja_izquierda_id IS DISTINCT FROM OLD.pareja_izquierda_id
                OR NEW.pareja_derecha_id IS DISTINCT FROM OLD.pareja_derecha_id;
    IF v_cambio THEN
      SELECT EXISTS (
        SELECT 1
        FROM pareja iz
        JOIN pareja de ON de.id = NEW.pareja_derecha_id AND de.pregunta_id = iz.pregunta_id
        JOIN pregunta p ON p.id = iz.pregunta_id
        WHERE iz.id = NEW.pareja_izquierda_id
          AND p.cuestionario_id = v_cuestionario
          AND p.activa
          AND p.tipo = 'relacion'
      ) INTO v_valida;
      IF NOT v_valida THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS' USING ERRCODE = 'EC400';
      END IF;
      NEW.respondido_en := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$funcion$;

CREATE TRIGGER trg_respuesta_valida
  BEFORE INSERT OR UPDATE ON respuesta_opcion
  FOR EACH ROW EXECUTE FUNCTION trg_respuesta_valida();

CREATE TRIGGER trg_respuesta_valida
  BEFORE INSERT OR UPDATE ON respuesta_pareja
  FOR EACH ROW EXECUTE FUNCTION trg_respuesta_valida();

-- ============================================================================
-- fn_iniciar_intento(usuario, cuestionario): única forma de crear intentos (INV-05)
-- ============================================================================
-- Devuelve el intento en curso (retomado = true) o crea uno nuevo. El bloqueo consultivo por
-- alumno y cuestionario dura lo que la transacción: dos pestañas no abren dos intentos (DEC-19).
CREATE FUNCTION fn_iniciar_intento(p_usuario UUID, p_cuestionario BIGINT)
RETURNS TABLE (intento_id UUID, numero INT, semilla INT, iniciado_en TIMESTAMPTZ, retomado BOOLEAN)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $funcion$
#variable_conflict use_column
DECLARE
  v_tipo         TEXT;
  v_espera       INT;
  v_desbloqueado BOOLEAN;
  v_intento      intento%ROWTYPE;
  v_ultimo       intento%ROWTYPE;
  v_disponible   TIMESTAMPTZ;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended('intento:' || p_usuario::text || ':' || p_cuestionario::text, 0));

  -- Solo cuestionarios activos de contenido publicado (si no, NO_ENCONTRADO).
  SELECT e.desbloqueado
    INTO v_desbloqueado
  FROM fn_estado_desbloqueo(p_usuario) e
  WHERE e.tipo = 'cuestionario' AND e.id = p_cuestionario;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NO_ENCONTRADO' USING ERRCODE = 'EC404';
  END IF;

  SELECT q.tipo, q.minutos_espera
    INTO v_tipo, v_espera
  FROM cuestionario q
  WHERE q.id = p_cuestionario;

  -- Intento abierto: se retoma (DEC-19).
  SELECT i.*
    INTO v_intento
  FROM intento i
  WHERE i.usuario_id = p_usuario
    AND i.cuestionario_id = p_cuestionario
    AND i.estado = 'en_curso';

  IF FOUND THEN
    RETURN QUERY SELECT v_intento.id, v_intento.numero, v_intento.semilla, v_intento.iniciado_en, true;
    RETURN;
  END IF;

  IF v_tipo = 'examen' THEN
    -- Examen aprobado: cerrado (DEC-20).
    IF EXISTS (
      SELECT 1 FROM intento i
      WHERE i.usuario_id = p_usuario AND i.cuestionario_id = p_cuestionario AND i.aprobado
    ) THEN
      RAISE EXCEPTION 'EXAMEN_APROBADO' USING ERRCODE = 'EC410';
    END IF;

    -- Espera tras reprobar, con la hora del servidor (DEC-21).
    SELECT i.*
      INTO v_ultimo
    FROM intento i
    WHERE i.usuario_id = p_usuario
      AND i.cuestionario_id = p_cuestionario
      AND i.estado = 'enviado'
    ORDER BY i.enviado_en DESC
    LIMIT 1;

    IF FOUND THEN
      v_disponible := v_ultimo.enviado_en + make_interval(mins => v_espera);
      IF now() < v_disponible THEN
        RAISE EXCEPTION 'EN_ESPERA'
          USING ERRCODE = 'EC409', DETAIL = to_json(v_disponible) #>> '{}';
      END IF;
    END IF;
  END IF;

  IF NOT v_desbloqueado THEN
    RAISE EXCEPTION 'BLOQUEADO_POR_AVANCE' USING ERRCODE = 'EC403';
  END IF;

  -- El número lo asigna trg_intento_numero y la semilla, el valor por defecto (DEC-09).
  INSERT INTO intento (usuario_id, cuestionario_id)
  VALUES (p_usuario, p_cuestionario)
  RETURNING * INTO v_intento;

  RETURN QUERY SELECT v_intento.id, v_intento.numero, v_intento.semilla, v_intento.iniciado_en, false;
END;
$funcion$;

-- ============================================================================
-- fn_enviar_intento(intento, usuario): la única que califica (INV-04, C-07)
-- ============================================================================
-- Toda pregunta activa vale 1 punto (DEC-07): en opción múltiple, V/F y decisión, el valor de la
-- opción elegida (valores intermedios solo en casos, DEC-08); en relación de columnas, parejas
-- acertadas ÷ total de parejas. Calificación = puntos ÷ preguntas × 100, con dos decimales.
-- En exámenes decide si aprobó y, si con eso se completa el módulo, otorga su insignia (OP-32).
CREATE FUNCTION fn_enviar_intento(p_intento UUID, p_usuario UUID)
RETURNS TABLE (calificacion NUMERIC(5, 2), aprobado BOOLEAN, insignia_id BIGINT)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $funcion$
#variable_conflict use_column
DECLARE
  v_intento      intento%ROWTYPE;
  v_cuestionario cuestionario%ROWTYPE;
  v_pendientes   BIGINT[];
  v_total        INT;
  v_puntos       NUMERIC;
  v_calificacion NUMERIC(5, 2);
  v_aprobado     BOOLEAN;
  v_modulo       BIGINT;
  v_insignia     BIGINT;
BEGIN
  SELECT i.*
    INTO v_intento
  FROM intento i
  WHERE i.id = p_intento
  FOR UPDATE;

  -- Un intento ajeno se reporta igual que uno inexistente (INV-07).
  IF NOT FOUND OR v_intento.usuario_id <> p_usuario THEN
    RAISE EXCEPTION 'NO_ENCONTRADO' USING ERRCODE = 'EC404';
  END IF;

  IF v_intento.estado <> 'en_curso' THEN
    RAISE EXCEPTION 'INTENTO_CERRADO' USING ERRCODE = 'EC411';
  END IF;

  SELECT q.*
    INTO v_cuestionario
  FROM cuestionario q
  WHERE q.id = v_intento.cuestionario_id;

  -- Todas las preguntas activas respondidas; en relación, todas sus parejas unidas.
  SELECT array_agg(p.id ORDER BY p.orden)
    INTO v_pendientes
  FROM pregunta p
  WHERE p.cuestionario_id = v_cuestionario.id
    AND p.activa
    AND CASE
          WHEN p.tipo = 'relacion' THEN
            (SELECT count(*)
             FROM respuesta_pareja rp
             JOIN pareja pa ON pa.id = rp.pareja_izquierda_id
             WHERE rp.intento_id = p_intento AND pa.pregunta_id = p.id)
            < (SELECT count(*) FROM pareja pa WHERE pa.pregunta_id = p.id)
          ELSE
            NOT EXISTS (
              SELECT 1 FROM respuesta_opcion r
              WHERE r.intento_id = p_intento AND r.pregunta_id = p.id)
        END;

  IF v_pendientes IS NOT NULL THEN
    RAISE EXCEPTION 'RESPUESTAS_INCOMPLETAS'
      USING ERRCODE = 'EC422', DETAIL = array_to_string(v_pendientes, ',');
  END IF;

  SELECT count(*)
    INTO v_total
  FROM pregunta p
  WHERE p.cuestionario_id = v_cuestionario.id AND p.activa;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'El cuestionario % no tiene preguntas activas', v_cuestionario.id;
  END IF;

  -- Puntaje de cada respuesta de opción (antes de cerrar: el disparador exige intento en curso).
  UPDATE respuesta_opcion r
     SET puntaje = o.valor
  FROM opcion o, pregunta p
  WHERE r.intento_id = p_intento
    AND o.id = r.opcion_id
    AND p.id = r.pregunta_id
    AND p.activa;

  SELECT coalesce(sum(r.puntaje), 0)
    INTO v_puntos
  FROM respuesta_opcion r
  JOIN pregunta p ON p.id = r.pregunta_id
  WHERE r.intento_id = p_intento AND p.activa;

  v_puntos := v_puntos + coalesce((
    SELECT sum(x.aciertos::NUMERIC / x.total)
    FROM (
      SELECT (SELECT count(*) FROM pareja pa WHERE pa.pregunta_id = p.id) AS total,
             (SELECT count(*)
              FROM respuesta_pareja rp
              JOIN pareja pa ON pa.id = rp.pareja_izquierda_id
              WHERE rp.intento_id = p_intento
                AND pa.pregunta_id = p.id
                AND rp.pareja_derecha_id = rp.pareja_izquierda_id) AS aciertos
      FROM pregunta p
      WHERE p.cuestionario_id = v_cuestionario.id AND p.activa AND p.tipo = 'relacion'
    ) x
    WHERE x.total > 0
  ), 0);

  v_calificacion := round(v_puntos / v_total * 100, 2);

  IF v_cuestionario.tipo = 'examen' THEN
    v_aprobado := v_calificacion >= v_cuestionario.calificacion_minima;
  ELSE
    v_aprobado := NULL;  -- Actividades y casos se completan al enviarse (DEC-06).
  END IF;

  UPDATE intento i
     SET estado = 'enviado',
         enviado_en = now(),
         calificacion = v_calificacion,
         aprobado = v_aprobado
  WHERE i.id = p_intento;

  -- Insignia: al aprobar el examen que completa el último curso pendiente del módulo.
  IF v_aprobado THEN
    SELECT c.modulo_id INTO v_modulo FROM curso c WHERE c.id = v_cuestionario.curso_id;

    IF NOT EXISTS (
      SELECT 1
      FROM curso c
      WHERE c.modulo_id = v_modulo
        AND c.publicado
        AND NOT EXISTS (
          SELECT 1
          FROM cuestionario q
          JOIN intento i ON i.cuestionario_id = q.id
          WHERE q.curso_id = c.id
            AND q.tipo = 'examen'
            AND i.usuario_id = p_usuario
            AND i.aprobado)
    ) THEN
      INSERT INTO insignia_usuario (usuario_id, insignia_id)
      SELECT p_usuario, s.id
      FROM insignia s
      WHERE s.modulo_id = v_modulo
      ON CONFLICT DO NOTHING
      RETURNING insignia_usuario.insignia_id INTO v_insignia;
    END IF;
  END IF;

  RETURN QUERY SELECT v_calificacion, v_aprobado, v_insignia;
END;
$funcion$;

-- ============================================================================
-- Permisos: solo echo_app ejecuta estas funciones
-- ============================================================================
REVOKE ALL ON FUNCTION
  fn_estado_desbloqueo(UUID),
  fn_iniciar_intento(UUID, BIGINT),
  fn_enviar_intento(UUID, UUID),
  trg_intento_numero(),
  trg_respuesta_valida()
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
  fn_estado_desbloqueo(UUID),
  fn_iniciar_intento(UUID, BIGINT),
  fn_enviar_intento(UUID, UUID)
TO echo_app;
