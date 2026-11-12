-- Semilla de desarrollo: cuentas de ejemplo (INV-14, INV-24), las mismas de la API simulada.
-- Las carga prisma/semilla/cargar.mjs como echo_app, después del contenido y los documentos legales.
--
--   alumno@example.com       Alma Ejemplo Pérez   activa
--   otra.alumna@example.com  Berta Muestra López  activa; ya envió la actividad 1 (sirve para probar INV-07)
--   pendiente@example.com    Ciro Prueba          sin verificar (la limpieza diaria la borra a las 24 h)
--
-- Contraseña de las tres: Ejemplo2026. El hash es Argon2id con los parámetros de DEC-72 (19456 KiB, t=2, p=1).

INSERT INTO usuario (nombre, apellidos, correo, correo_verificado_en, estado, hash_contrasena, mayoria_edad_confirmada_en)
VALUES
  ('Alma',  'Ejemplo Pérez', 'alumno@example.com',      now(), 'activo',    '$argon2id$v=19$m=19456,t=2,p=1$+i/JIcCkr9NivxNvmI9H1g$XUHNZhLNAlLqi24HZKhZ2Gjjz/1xTRhgsEV9POX5yXM', now()),
  ('Berta', 'Muestra López', 'otra.alumna@example.com', now(), 'activo',    '$argon2id$v=19$m=19456,t=2,p=1$+i/JIcCkr9NivxNvmI9H1g$XUHNZhLNAlLqi24HZKhZ2Gjjz/1xTRhgsEV9POX5yXM', now()),
  ('Ciro',  'Prueba',        'pendiente@example.com',   NULL,  'pendiente', '$argon2id$v=19$m=19456,t=2,p=1$+i/JIcCkr9NivxNvmI9H1g$XUHNZhLNAlLqi24HZKhZ2Gjjz/1xTRhgsEV9POX5yXM', now());

-- Las tres aceptaron el aviso y los términos vigentes al registrarse (INV-30).
INSERT INTO aceptacion_documento (usuario_id, documento_id, direccion_ip)
SELECT u.id, d.id, '127.0.0.1'::INET
FROM usuario u
CROSS JOIN documento_legal d
WHERE u.correo IN ('alumno@example.com', 'otra.alumna@example.com', 'pendiente@example.com');

-- Berta terminó la lección 1 y envió la actividad 1 con las respuestas correctas.
INSERT INTO progreso_leccion (usuario_id, leccion_id, ultima_seccion, terminada_en)
SELECT u.id, 1, 3, now() FROM usuario u WHERE u.correo = 'otra.alumna@example.com';

DO $semilla$
DECLARE
  v_usuario UUID := (SELECT id FROM usuario WHERE correo = 'otra.alumna@example.com');
  v_intento RECORD;
BEGIN
  SELECT * INTO v_intento FROM fn_iniciar_intento(v_usuario, 1);
  INSERT INTO respuesta_opcion (intento_id, pregunta_id, opcion_id) VALUES
    (v_intento.intento_id, 1, 1),
    (v_intento.intento_id, 2, 4);
  PERFORM fn_enviar_intento(v_intento.intento_id, v_usuario);
END
$semilla$;
