-- Auditoría de la administración de la base de datos (DEC-97, INV-31).
-- auditoria_bd registra lo que hacen en las tablas y en la estructura los roles que no son echo_app:
-- echo_admin, echo_migracion, echo_contenido y el superusuario. Lo que hace echo_app no se audita: la
-- actividad de los estudiantes ya queda en sus propias tablas.
--
-- Requisitos: echo_admin debe existir (prisma/sql/roles.sql con -v clave_admin=…) antes de aplicar esta migración.
-- El disparador de eventos de DDL solo lo puede crear un superusuario: prisma/sql/auditoria_ddl.sql, una vez por
-- entorno, después de aplicar las migraciones.
--
-- Precisiones aprobadas el 12/11/2026 (grafo v1.6.4):
--   * motivo vacío = sin motivo: tras un SET LOCAL, echo.motivo queda como '' y el CHECK haría fallar la operación.
--   * rol_efectivo sale del parámetro role (SET ROLE) y no de current_user: dentro de una función SECURITY DEFINER,
--     current_user es el dueño de la función, no quien hizo el cambio.
--   * trg_auditoria lleva WHEN (session_user <> 'echo_app'): la app no paga el costo de llamar la función.
--   * TRUNCATE se audita con un segundo disparador por sentencia (trg_auditoria_truncate): PostgreSQL no mezcla
--     disparadores por fila y por sentencia.

-- ============================================================================
-- Tabla auditoria_bd (TBL-AUDITORIA-BD): solo crece, sin llaves foráneas
-- ============================================================================
CREATE TABLE "auditoria_bd" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    "ocurrido_en" TIMESTAMPTZ(6) NOT NULL DEFAULT clock_timestamp(),
    "rol_sesion" TEXT NOT NULL DEFAULT session_user,
    "rol_efectivo" TEXT NOT NULL DEFAULT coalesce(nullif(current_setting('role'), 'none'), session_user),
    "direccion_ip" INET DEFAULT inet_client_addr(),
    "aplicacion" TEXT DEFAULT current_setting('application_name'),
    "id_transaccion" BIGINT NOT NULL DEFAULT txid_current(),
    "tipo_evento" TEXT NOT NULL,
    "comando" TEXT,
    "tabla" TEXT,
    "registro_id" TEXT,
    "columnas_cambiadas" TEXT[],
    "datos_anteriores" JSONB,
    "datos_nuevos" JSONB,
    "sentencia" TEXT,
    "motivo" TEXT DEFAULT nullif(current_setting('echo.motivo', true), ''),

    CONSTRAINT "auditoria_bd_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ck_auditoria_tipo_evento"
      CHECK (tipo_evento IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'DDL', 'MANUAL')),
    CONSTRAINT "ck_auditoria_motivo"
      CHECK (motivo IS NULL OR length(motivo) BETWEEN 1 AND 500)
);

CREATE INDEX "ix_auditoria_ocurrido" ON "auditoria_bd" ("ocurrido_en" DESC);
CREATE INDEX "ix_auditoria_tabla_ocurrido" ON "auditoria_bd" ("tabla", "ocurrido_en" DESC);

-- ============================================================================
-- trg_auditoria_inmutable: nadie modifica ni borra la auditoría (INV-31)
-- ============================================================================
CREATE FUNCTION trg_auditoria_inmutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $funcion$
BEGIN
  RAISE EXCEPTION 'auditoria_bd solo crece: no se puede % (INV-31)', lower(TG_OP)
    USING ERRCODE = 'insufficient_privilege';
END;
$funcion$;

CREATE TRIGGER trg_auditoria_inmutable
  BEFORE UPDATE OR DELETE ON "auditoria_bd"
  FOR EACH ROW EXECUTE FUNCTION trg_auditoria_inmutable();

CREATE TRIGGER trg_auditoria_inmutable_truncate
  BEFORE TRUNCATE ON "auditoria_bd"
  FOR EACH STATEMENT EXECUTE FUNCTION trg_auditoria_inmutable();

-- ============================================================================
-- fn_auditar_cambio(): registra cada cambio en las 21 tablas (FN-AUDITAR)
-- ============================================================================
-- SECURITY DEFINER: los roles auditados no pueden insertar en auditoria_bd directamente.
-- Argumentos del disparador: las columnas de la llave primaria, en orden (las compuestas se unen con «/»).
-- En las tablas con datos personales guarda los nombres de las columnas pero no sus valores, para que la
-- anonimización no deje copias (DEC-27); así tampoco quedan hashes ni códigos.
CREATE FUNCTION fn_auditar_cambio()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $funcion$
DECLARE
  v_protegida BOOLEAN := TG_TABLE_NAME IN ('usuario', 'sesion', 'token_correo', 'aceptacion_documento');
  v_efectivo  TEXT := coalesce(nullif(current_setting('role'), 'none'), session_user);
  v_motivo    TEXT := left(nullif(current_setting('echo.motivo', true), ''), 500);
  v_anterior  JSONB;
  v_nuevo     JSONB;
  v_registro  TEXT;
  v_columnas  TEXT[];
BEGIN
  -- Respaldo del WHEN del disparador: lo que hace echo_app nunca se audita.
  IF session_user = 'echo_app' THEN
    RETURN NULL;
  END IF;

  IF TG_LEVEL = 'STATEMENT' THEN
    INSERT INTO auditoria_bd (rol_efectivo, tipo_evento, tabla, motivo)
    VALUES (v_efectivo, TG_OP, TG_TABLE_NAME, v_motivo);
    RETURN NULL;
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_anterior := to_jsonb(OLD);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_nuevo := to_jsonb(NEW);
  END IF;

  SELECT string_agg(coalesce(v_nuevo, v_anterior) ->> a.columna, '/' ORDER BY a.posicion)
    INTO v_registro
  FROM unnest(TG_ARGV) WITH ORDINALITY AS a(columna, posicion);

  IF TG_OP = 'UPDATE' THEN
    SELECT coalesce(array_agg(n.key ORDER BY n.key), '{}')
      INTO v_columnas
    FROM jsonb_each(v_nuevo) n
    WHERE n.value IS DISTINCT FROM v_anterior -> n.key;
  END IF;

  IF v_protegida THEN
    v_anterior := (SELECT jsonb_object_agg(k, '[protegido]') FROM jsonb_object_keys(v_anterior) k);
    v_nuevo    := (SELECT jsonb_object_agg(k, '[protegido]') FROM jsonb_object_keys(v_nuevo) k);
  END IF;

  INSERT INTO auditoria_bd
    (rol_efectivo, tipo_evento, tabla, registro_id, columnas_cambiadas, datos_anteriores, datos_nuevos, motivo)
  VALUES
    (v_efectivo, TG_OP, TG_TABLE_NAME, v_registro, v_columnas, v_anterior, v_nuevo, v_motivo);

  RETURN NULL;
END;
$funcion$;

-- ============================================================================
-- trg_auditoria en las 21 tablas (TRG-AUDITORIA)
-- ============================================================================
CREATE TRIGGER trg_auditoria AFTER INSERT OR UPDATE OR DELETE ON "usuario"
  FOR EACH ROW WHEN (session_user <> 'echo_app') EXECUTE FUNCTION fn_auditar_cambio('id');
CREATE TRIGGER trg_auditoria AFTER INSERT OR UPDATE OR DELETE ON "sesion"
  FOR EACH ROW WHEN (session_user <> 'echo_app') EXECUTE FUNCTION fn_auditar_cambio('id');
CREATE TRIGGER trg_auditoria AFTER INSERT OR UPDATE OR DELETE ON "token_correo"
  FOR EACH ROW WHEN (session_user <> 'echo_app') EXECUTE FUNCTION fn_auditar_cambio('id');
CREATE TRIGGER trg_auditoria AFTER INSERT OR UPDATE OR DELETE ON "documento_legal"
  FOR EACH ROW WHEN (session_user <> 'echo_app') EXECUTE FUNCTION fn_auditar_cambio('id');
CREATE TRIGGER trg_auditoria AFTER INSERT OR UPDATE OR DELETE ON "aceptacion_documento"
  FOR EACH ROW WHEN (session_user <> 'echo_app') EXECUTE FUNCTION fn_auditar_cambio('id');
CREATE TRIGGER trg_auditoria AFTER INSERT OR UPDATE OR DELETE ON "modulo"
  FOR EACH ROW WHEN (session_user <> 'echo_app') EXECUTE FUNCTION fn_auditar_cambio('id');
CREATE TRIGGER trg_auditoria AFTER INSERT OR UPDATE OR DELETE ON "curso"
  FOR EACH ROW WHEN (session_user <> 'echo_app') EXECUTE FUNCTION fn_auditar_cambio('id');
CREATE TRIGGER trg_auditoria AFTER INSERT OR UPDATE OR DELETE ON "leccion"
  FOR EACH ROW WHEN (session_user <> 'echo_app') EXECUTE FUNCTION fn_auditar_cambio('id');
CREATE TRIGGER trg_auditoria AFTER INSERT OR UPDATE OR DELETE ON "seccion"
  FOR EACH ROW WHEN (session_user <> 'echo_app') EXECUTE FUNCTION fn_auditar_cambio('id');
CREATE TRIGGER trg_auditoria AFTER INSERT OR UPDATE OR DELETE ON "imagen"
  FOR EACH ROW WHEN (session_user <> 'echo_app') EXECUTE FUNCTION fn_auditar_cambio('id');
CREATE TRIGGER trg_auditoria AFTER INSERT OR UPDATE OR DELETE ON "fundamento"
  FOR EACH ROW WHEN (session_user <> 'echo_app') EXECUTE FUNCTION fn_auditar_cambio('id');
CREATE TRIGGER trg_auditoria AFTER INSERT OR UPDATE OR DELETE ON "cuestionario"
  FOR EACH ROW WHEN (session_user <> 'echo_app') EXECUTE FUNCTION fn_auditar_cambio('id');
CREATE TRIGGER trg_auditoria AFTER INSERT OR UPDATE OR DELETE ON "pregunta"
  FOR EACH ROW WHEN (session_user <> 'echo_app') EXECUTE FUNCTION fn_auditar_cambio('id');
CREATE TRIGGER trg_auditoria AFTER INSERT OR UPDATE OR DELETE ON "opcion"
  FOR EACH ROW WHEN (session_user <> 'echo_app') EXECUTE FUNCTION fn_auditar_cambio('id');
CREATE TRIGGER trg_auditoria AFTER INSERT OR UPDATE OR DELETE ON "pareja"
  FOR EACH ROW WHEN (session_user <> 'echo_app') EXECUTE FUNCTION fn_auditar_cambio('id');
CREATE TRIGGER trg_auditoria AFTER INSERT OR UPDATE OR DELETE ON "intento"
  FOR EACH ROW WHEN (session_user <> 'echo_app') EXECUTE FUNCTION fn_auditar_cambio('id');
CREATE TRIGGER trg_auditoria AFTER INSERT OR UPDATE OR DELETE ON "respuesta_opcion"
  FOR EACH ROW WHEN (session_user <> 'echo_app') EXECUTE FUNCTION fn_auditar_cambio('intento_id', 'pregunta_id');
CREATE TRIGGER trg_auditoria AFTER INSERT OR UPDATE OR DELETE ON "respuesta_pareja"
  FOR EACH ROW WHEN (session_user <> 'echo_app') EXECUTE FUNCTION fn_auditar_cambio('intento_id', 'pareja_izquierda_id');
CREATE TRIGGER trg_auditoria AFTER INSERT OR UPDATE OR DELETE ON "progreso_leccion"
  FOR EACH ROW WHEN (session_user <> 'echo_app') EXECUTE FUNCTION fn_auditar_cambio('usuario_id', 'leccion_id');
CREATE TRIGGER trg_auditoria AFTER INSERT OR UPDATE OR DELETE ON "insignia"
  FOR EACH ROW WHEN (session_user <> 'echo_app') EXECUTE FUNCTION fn_auditar_cambio('id');
CREATE TRIGGER trg_auditoria AFTER INSERT OR UPDATE OR DELETE ON "insignia_usuario"
  FOR EACH ROW WHEN (session_user <> 'echo_app') EXECUTE FUNCTION fn_auditar_cambio('usuario_id', 'insignia_id');

-- TRUNCATE, por sentencia (sin fila afectada).
DO $auditoria$
DECLARE
  v_tabla TEXT;
BEGIN
  FOREACH v_tabla IN ARRAY ARRAY[
    'usuario', 'sesion', 'token_correo', 'documento_legal', 'aceptacion_documento',
    'modulo', 'curso', 'leccion', 'seccion', 'imagen', 'fundamento',
    'cuestionario', 'pregunta', 'opcion', 'pareja',
    'intento', 'respuesta_opcion', 'respuesta_pareja', 'progreso_leccion', 'insignia', 'insignia_usuario']
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_auditoria_truncate AFTER TRUNCATE ON %I '
      'FOR EACH STATEMENT WHEN (session_user <> ''echo_app'') EXECUTE FUNCTION fn_auditar_cambio()',
      v_tabla);
  END LOOP;
END
$auditoria$;

-- ============================================================================
-- fn_registrar_accion_manual(comando, motivo): acciones fuera de las tablas (FN-ACCION-MANUAL)
-- ============================================================================
-- RESPALDO (pg_dump), RESTAURACION, ALTER ROLE, cambio de contraseña de un rol, activar o desactivar el acceso
-- público. Es la única forma de escribir a mano en auditoria_bd y no permite elegir la fecha ni el rol.
-- Devuelve el id del registro.
CREATE FUNCTION fn_registrar_accion_manual(p_comando TEXT, p_motivo TEXT DEFAULT NULL)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $funcion$
DECLARE
  v_comando TEXT := nullif(btrim(p_comando), '');
  v_motivo  TEXT := nullif(btrim(coalesce(p_motivo, current_setting('echo.motivo', true))), '');
  v_id      BIGINT;
BEGIN
  IF v_comando IS NULL OR length(v_comando) > 100 THEN
    RAISE EXCEPTION 'El comando es obligatorio y tiene a lo más 100 caracteres' USING ERRCODE = 'EC400';
  END IF;
  IF v_motivo IS NOT NULL AND length(v_motivo) > 500 THEN
    RAISE EXCEPTION 'El motivo tiene a lo más 500 caracteres' USING ERRCODE = 'EC400';
  END IF;

  INSERT INTO auditoria_bd (rol_efectivo, tipo_evento, comando, motivo)
  VALUES (coalesce(nullif(current_setting('role'), 'none'), session_user), 'MANUAL', v_comando, v_motivo)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$funcion$;

-- ============================================================================
-- fn_auditar_ddl(): cambios de estructura (FN-AUDITAR-DDL)
-- ============================================================================
-- La ejecutan los disparadores de eventos evt_auditoria_ddl (ddl_command_end) y evt_auditoria_ddl_borrado
-- (sql_drop), que crea el superusuario con prisma/sql/auditoria_ddl.sql. Las contraseñas de la sentencia se
-- reemplazan por [protegido]. Los objetos globales (CREATE o ALTER ROLE) no pasan por aquí: se registran a mano.
CREATE FUNCTION fn_auditar_ddl()
RETURNS EVENT_TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $funcion$
DECLARE
  v_efectivo  TEXT := coalesce(nullif(current_setting('role'), 'none'), session_user);
  v_motivo    TEXT := left(nullif(current_setting('echo.motivo', true), ''), 500);
  v_sentencia TEXT := regexp_replace(current_query(), '(PASSWORD\s+)(''[^'']*''|\S+)', '\1''[protegido]''', 'gi');
  r           RECORD;
BEGIN
  IF TG_EVENT = 'ddl_command_end' THEN
    FOR r IN SELECT * FROM pg_event_trigger_ddl_commands() WHERE NOT in_extension LOOP
      INSERT INTO auditoria_bd (rol_efectivo, tipo_evento, comando, tabla, sentencia, motivo)
      VALUES (v_efectivo, 'DDL', r.command_tag, r.object_identity, v_sentencia, v_motivo);
    END LOOP;
  ELSIF TG_EVENT = 'sql_drop' THEN
    FOR r IN SELECT * FROM pg_event_trigger_dropped_objects() WHERE original AND NOT is_temporary LOOP
      INSERT INTO auditoria_bd (rol_efectivo, tipo_evento, comando, tabla, sentencia, motivo)
      VALUES (v_efectivo, 'DDL', 'DROP ' || upper(r.object_type), r.object_identity, v_sentencia, v_motivo);
    END LOOP;
  END IF;
END;
$funcion$;

-- ============================================================================
-- Permisos (ROL-ADMIN y DEC-97)
-- ============================================================================
-- Nadie escribe directo en auditoria_bd: solo las funciones SECURITY DEFINER. Solo echo_admin la lee.
REVOKE ALL ON "auditoria_bd" FROM PUBLIC;
GRANT SELECT ON "auditoria_bd" TO echo_admin;

REVOKE ALL ON FUNCTION
  fn_auditar_cambio(),
  fn_auditar_ddl(),
  trg_auditoria_inmutable(),
  fn_registrar_accion_manual(TEXT, TEXT)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_registrar_accion_manual(TEXT, TEXT) TO echo_admin;

-- echo_admin: mantenimiento y corrección de datos en las 21 tablas.
DO $auditoria$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO echo_admin', current_database());
END
$auditoria$;
GRANT USAGE ON SCHEMA public TO echo_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  usuario, sesion, token_correo, documento_legal, aceptacion_documento,
  modulo, curso, leccion, seccion, imagen, fundamento,
  cuestionario, pregunta, opcion, pareja,
  intento, respuesta_opcion, respuesta_pareja, progreso_leccion, insignia, insignia_usuario
TO echo_admin;
