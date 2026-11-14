-- Borrar una cuenta pendiente al registrarse de nuevo con el mismo correo (DEC-109) y al entrar con Google
-- (DEC-93, parte 3B). Gana el último registro: solo quien puede abrir el correo logra activar la cuenta, y la
-- contraseña que puso otra persona nunca se activa (pre-secuestro de cuenta).
--
-- Es SECURITY DEFINER porque echo_app no puede borrar usuarios ni aceptaciones (INV-01, DEC-28), igual que
-- fn_limpieza_diaria; por eso lleva search_path fijo y solo echo_app puede ejecutarla.

-- ============================================================================
-- fn_borrar_cuenta_pendiente(correo): true si borró la cuenta
-- ============================================================================
-- Solo borra una cuenta en estado pendiente y sin historial, con las mismas condiciones que la limpieza
-- diaria. Sus enlaces, sesiones y aceptaciones se borran en cascada. El correo llega ya normalizado (DEC-60).
CREATE FUNCTION fn_borrar_cuenta_pendiente(p_correo TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $funcion$
DECLARE
  v_borradas INT;
BEGIN
  DELETE FROM usuario u
  WHERE u.correo = p_correo
    AND u.estado = 'pendiente'
    AND NOT EXISTS (SELECT 1 FROM intento i WHERE i.usuario_id = u.id)
    AND NOT EXISTS (SELECT 1 FROM progreso_leccion p WHERE p.usuario_id = u.id)
    AND NOT EXISTS (SELECT 1 FROM insignia_usuario iu WHERE iu.usuario_id = u.id);
  GET DIAGNOSTICS v_borradas = ROW_COUNT;
  RETURN v_borradas > 0;
END;
$funcion$;

REVOKE ALL ON FUNCTION fn_borrar_cuenta_pendiente(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_borrar_cuenta_pendiente(TEXT) TO echo_app;
