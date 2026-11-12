-- Ciclo de vida de los datos del estudiante (sección 3.4 del reporte, DEC-27, DEC-94, DEC-95).
-- FN-ANONIMIZAR, FN-LIMPIEZA y FN-EXPORTAR. Errores con la misma convención que logica_intentos:
--   EC404 NO_ENCONTRADO
--
-- fn_anonimizar_usuario y fn_limpieza_diaria son SECURITY DEFINER: se ejecutan con los permisos de su
-- dueño (echo_propietario) porque echo_app no puede modificar aceptaciones ni borrar usuarios. Por eso:
--   * llevan search_path fijo (public, pg_temp), para que nadie las desvíe con objetos propios;
--   * solo echo_app puede ejecutarlas, y el backend siempre pasa el alumno de la sesión (INV-07).

-- ============================================================================
-- fn_anonimizar_usuario(usuario): eliminar cuenta = anonimizarla (OP-14, DEC-27, INV-01)
-- ============================================================================
-- Borra datos personales, credenciales, sesiones y enlaces, y la IP de sus aceptaciones (conserva
-- fecha, hora y versión, DEC-28). Conserva creado_en, negativa_estadisticas (su historial sigue fuera
-- de las estadísticas) y todo el historial académico.
-- Sobre una cuenta ya anonimizada no hace nada: así se puede repetir tras restaurar un respaldo (DEC-95).
CREATE FUNCTION fn_anonimizar_usuario(p_usuario UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $funcion$
DECLARE
  v_estado TEXT;
BEGIN
  SELECT u.estado
    INTO v_estado
  FROM usuario u
  WHERE u.id = p_usuario
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NO_ENCONTRADO' USING ERRCODE = 'EC404';
  END IF;

  IF v_estado = 'anonimizado' THEN
    RETURN;
  END IF;

  DELETE FROM sesion s WHERE s.usuario_id = p_usuario;
  DELETE FROM token_correo t WHERE t.usuario_id = p_usuario;

  UPDATE aceptacion_documento a
     SET direccion_ip = NULL
  WHERE a.usuario_id = p_usuario;

  UPDATE usuario u
     SET nombre                     = NULL,
         apellidos                  = NULL,
         correo                     = NULL,
         correo_verificado_en       = NULL,
         hash_contrasena            = NULL,
         google_sub                 = NULL,
         intentos_fallidos          = 0,
         bloqueado_hasta            = NULL,
         mayoria_edad_confirmada_en = NULL,
         estado                     = 'anonimizado',
         anonimizado_en             = now()
  WHERE u.id = p_usuario;
END;
$funcion$;

-- ============================================================================
-- fn_limpieza_diaria(): borrado físico de lo que no tiene historial (OP-34, DEC-63, DEC-95)
-- ============================================================================
-- La ejecuta el Cron diario como echo_app. Devuelve cuántas filas borró de cada tipo, sin datos
-- personales, para el registro del proceso.
--   * Cuentas pendientes con más de 24 h sin verificar (DEC-13). Nunca una cuenta con historial;
--     sus enlaces, sesiones y aceptaciones se borran en cascada.
--   * Enlaces vencidos o ya usados (24 h o 30 min, o al usarse).
--   * Sesiones cerradas o con más de 30 minutos sin actividad.
CREATE FUNCTION fn_limpieza_diaria()
RETURNS TABLE (cuentas_pendientes INT, enlaces INT, sesiones INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $funcion$
#variable_conflict use_column
DECLARE
  v_cuentas  INT;
  v_enlaces  INT;
  v_sesiones INT;
BEGIN
  DELETE FROM usuario u
  WHERE u.estado = 'pendiente'
    AND u.creado_en < now() - interval '24 hours'
    AND NOT EXISTS (SELECT 1 FROM intento i WHERE i.usuario_id = u.id)
    AND NOT EXISTS (SELECT 1 FROM progreso_leccion p WHERE p.usuario_id = u.id)
    AND NOT EXISTS (SELECT 1 FROM insignia_usuario iu WHERE iu.usuario_id = u.id);
  GET DIAGNOSTICS v_cuentas = ROW_COUNT;

  DELETE FROM token_correo t
  WHERE t.expira_en < now() OR t.usado_en IS NOT NULL;
  GET DIAGNOSTICS v_enlaces = ROW_COUNT;

  DELETE FROM sesion s
  WHERE s.revocada_en IS NOT NULL
     OR s.ultima_actividad_en < now() - interval '30 minutes';
  GET DIAGNOSTICS v_sesiones = ROW_COUNT;

  RETURN QUERY SELECT v_cuentas, v_enlaces, v_sesiones;
END;
$funcion$;

-- ============================================================================
-- fn_exportar_datos_usuario(usuario): derecho de acceso (OP-41, DEC-94)
-- ============================================================================
-- Devuelve el documento ExportacionDatos de docs/api/openapi.yaml en una sola consulta con vista
-- consistente. Nunca incluye hashes, códigos de sesión o de enlaces ni google_sub (INV-08), ni la
-- respuesta correcta de ninguna pregunta (INV-04): solo lo que el alumno respondió y su puntaje.
-- La zona horaria de la función es UTC: las fechas salen en ISO 8601 con +00:00 (INV-03).
CREATE FUNCTION fn_exportar_datos_usuario(p_usuario UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
SET timezone = 'UTC'
AS $funcion$
DECLARE
  v_documento JSONB;
BEGIN
  SELECT jsonb_build_object(
    'generadoEn', now(),
    'cuenta', jsonb_build_object(
      'nombre', u.nombre,
      'apellidos', u.apellidos,
      'correo', u.correo,
      'metodoAcceso', CASE
                        WHEN u.hash_contrasena IS NOT NULL AND u.google_sub IS NOT NULL THEN 'ambos'
                        WHEN u.google_sub IS NOT NULL THEN 'google'
                        ELSE 'correo'
                      END,
      'registradoEn', u.creado_en,
      'correoVerificadoEn', u.correo_verificado_en,
      'mayoriaEdadConfirmadaEn', u.mayoria_edad_confirmada_en
    ),
    'preferencias', jsonb_build_object(
      'negativaEncuesta', u.negativa_encuesta,
      'negativaEstadisticas', u.negativa_estadisticas
    ),
    'aceptaciones', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'documento', CASE d.tipo WHEN 'aviso_privacidad' THEN 'avisoPrivacidad' ELSE 'terminos' END,
               'version', d.version,
               'aceptadoEn', a.aceptado_en,
               'direccionIp', host(a.direccion_ip)
             ) ORDER BY a.aceptado_en, d.tipo)
      FROM aceptacion_documento a
      JOIN documento_legal d ON d.id = a.documento_id
      WHERE a.usuario_id = u.id
    ), '[]'::jsonb),
    'sesiones', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'iniciadaEn', s.creada_en,
               'ultimaActividadEn', s.ultima_actividad_en,
               'cerradaEn', CASE
                              WHEN s.revocada_en IS NOT NULL THEN s.revocada_en
                              WHEN s.ultima_actividad_en + interval '30 minutes' <= now()
                                THEN s.ultima_actividad_en + interval '30 minutes'
                            END,
               'navegador', s.agente_usuario
             ) ORDER BY s.creada_en)
      FROM sesion s
      WHERE s.usuario_id = u.id
    ), '[]'::jsonb),
    'progreso', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'leccion', jsonb_build_object('slug', l.slug, 'titulo', l.titulo),
               'curso', jsonb_build_object('slug', c.slug, 'titulo', c.titulo),
               'abiertaEn', p.abierta_en,
               'ultimaSeccion', p.ultima_seccion,
               'terminadaEn', p.terminada_en
             ) ORDER BY p.abierta_en)
      FROM progreso_leccion p
      JOIN leccion l ON l.id = p.leccion_id
      JOIN curso c ON c.id = l.curso_id
      WHERE p.usuario_id = u.id
    ), '[]'::jsonb),
    'intentos', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'id', i.id,
               'tipo', q.tipo,
               'cuestionario', jsonb_build_object('id', q.id, 'titulo', q.titulo),
               'numero', i.numero,
               'estado', CASE i.estado WHEN 'en_curso' THEN 'enCurso' ELSE 'enviado' END,
               'iniciadoEn', i.iniciado_en,
               'enviadoEn', i.enviado_en,
               'calificacion', i.calificacion,
               'aprobado', i.aprobado,
               'respuestas', coalesce((
                 SELECT jsonb_agg(r.respuesta ORDER BY r.orden)
                 FROM (
                   -- Opción múltiple, verdadero/falso y decisión: el texto elegido.
                   SELECT pr.orden,
                          jsonb_build_object(
                            'preguntaId', pr.id,
                            'enunciado', pr.enunciado,
                            'respuesta', jsonb_build_array(o.texto),
                            'puntaje', ro.puntaje
                          ) AS respuesta
                   FROM respuesta_opcion ro
                   JOIN pregunta pr ON pr.id = ro.pregunta_id
                   JOIN opcion o ON o.id = ro.opcion_id
                   WHERE ro.intento_id = i.id
                   UNION ALL
                   -- Relación de columnas: «izquierda → derecha» de cada unión que hizo el alumno.
                   SELECT pr.orden,
                          jsonb_build_object(
                            'preguntaId', pr.id,
                            'enunciado', pr.enunciado,
                            'respuesta', jsonb_agg(iz.texto_izquierdo || ' → ' || de.texto_derecho ORDER BY iz.orden),
                            'puntaje', CASE
                                         WHEN i.estado = 'enviado' THEN round(
                                           count(*) FILTER (WHERE rp.pareja_derecha_id = rp.pareja_izquierda_id)::NUMERIC
                                           / (SELECT count(*) FROM pareja t WHERE t.pregunta_id = pr.id), 2)
                                       END
                          )
                   FROM respuesta_pareja rp
                   JOIN pareja iz ON iz.id = rp.pareja_izquierda_id
                   JOIN pareja de ON de.id = rp.pareja_derecha_id
                   JOIN pregunta pr ON pr.id = iz.pregunta_id
                   WHERE rp.intento_id = i.id
                   GROUP BY pr.id, pr.orden, pr.enunciado
                 ) r
               ), '[]'::jsonb)
             ) ORDER BY i.iniciado_en)
      FROM intento i
      JOIN cuestionario q ON q.id = i.cuestionario_id
      WHERE i.usuario_id = u.id
    ), '[]'::jsonb),
    'insignias', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'modulo', jsonb_build_object('slug', m.slug, 'titulo', m.titulo),
               'nombre', s.nombre,
               'obtenidaEn', iu.otorgada_en
             ) ORDER BY iu.otorgada_en)
      FROM insignia_usuario iu
      JOIN insignia s ON s.id = iu.insignia_id
      JOIN modulo m ON m.id = s.modulo_id
      WHERE iu.usuario_id = u.id
    ), '[]'::jsonb)
  )
    INTO v_documento
  FROM usuario u
  WHERE u.id = p_usuario
    AND u.estado <> 'anonimizado';

  IF v_documento IS NULL THEN
    RAISE EXCEPTION 'NO_ENCONTRADO' USING ERRCODE = 'EC404';
  END IF;

  RETURN v_documento;
END;
$funcion$;

-- ============================================================================
-- Permisos: solo echo_app ejecuta estas funciones
-- ============================================================================
REVOKE ALL ON FUNCTION
  fn_anonimizar_usuario(UUID),
  fn_limpieza_diaria(),
  fn_exportar_datos_usuario(UUID)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
  fn_anonimizar_usuario(UUID),
  fn_limpieza_diaria(),
  fn_exportar_datos_usuario(UUID)
TO echo_app;
