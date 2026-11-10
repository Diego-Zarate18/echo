-- Permisos de los roles de base de datos (DEC-45, INV-09, ROL-APP, ROL-CONTENIDO, ROL-LECTURA).
-- Los roles se crean una sola vez por entorno con prisma/sql/roles.sql; aquí solo se conceden permisos.
-- Regla: nadie tiene acceso que no se le haya concedido explícitamente en una migración.

-- ----------------------------------------------------------------------------
-- Base de datos y esquema: se quita todo a PUBLIC
-- ----------------------------------------------------------------------------
DO $permisos$
BEGIN
  EXECUTE format('REVOKE ALL ON DATABASE %I FROM PUBLIC', current_database());
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO echo_app, echo_contenido, echo_lectura', current_database());
END
$permisos$;

REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO echo_app, echo_contenido, echo_lectura;

-- Las funciones que creen migraciones futuras (fn_*) no serán ejecutables por PUBLIC:
-- cada migración concede EXECUTE solo a quien la necesita. f_unaccent y las funciones
-- de la extensión unaccent quedan ejecutables porque el buscador las usa y no exponen datos.
ALTER DEFAULT PRIVILEGES FOR ROLE echo_propietario IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- ----------------------------------------------------------------------------
-- echo_app: servidor de la aplicación
-- ----------------------------------------------------------------------------
-- Contenido y documentos legales: solo lectura.
GRANT SELECT ON
  modulo, curso, leccion, seccion, imagen, fundamento,
  cuestionario, pregunta, opcion, pareja, insignia,
  documento_legal
TO echo_app;

-- Datos del estudiante: leer, crear y actualizar; nunca borrar (el historial es permanente, INV-01).
GRANT SELECT, INSERT, UPDATE ON
  usuario, intento, respuesta_opcion, respuesta_pareja, progreso_leccion, insignia_usuario
TO echo_app;

-- Evidencia del consentimiento: solo leer e insertar (DEC-28, INV-30).
GRANT SELECT, INSERT ON aceptacion_documento TO echo_app;

-- Sesiones y enlaces de un solo uso: acceso completo.
GRANT SELECT, INSERT, UPDATE, DELETE ON sesion, token_correo TO echo_app;

-- ----------------------------------------------------------------------------
-- echo_contenido: scripts de carga de contenido (RN-02)
-- ----------------------------------------------------------------------------
-- Ve y modifica solo contenido y documentos legales. ON DELETE RESTRICT le impide
-- borrar contenido ya respondido o una versión ya aceptada.
GRANT SELECT, INSERT, UPDATE, DELETE ON
  modulo, curso, leccion, seccion, imagen, fundamento,
  cuestionario, pregunta, opcion, pareja, insignia,
  documento_legal
TO echo_contenido;

-- ----------------------------------------------------------------------------
-- echo_lectura: soporte y análisis, sin datos personales
-- ----------------------------------------------------------------------------
-- Solo contenido. v_resultados_anonimos se le concede en la migración de vistas.
GRANT SELECT ON
  modulo, curso, leccion, seccion, imagen, fundamento,
  cuestionario, pregunta, opcion, pareja, insignia
TO echo_lectura;
