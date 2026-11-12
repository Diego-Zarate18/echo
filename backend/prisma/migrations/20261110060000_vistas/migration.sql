-- Vistas de Echo (sección 4.2 del reporte): VW-AVANCE-CURSO y VW-RESULTADOS-ANONIMOS.
-- No materializadas: el avance debe verse al instante (RF-PROG-04).

-- ============================================================================
-- v_avance_curso: avance de cada alumno en cada curso publicado (DEC-14, C-04)
-- ============================================================================
-- Curso con examen aprobado = 100 % (y se queda así aunque después se agreguen lecciones, DEC-10).
-- Si no: promedio de los componentes que el curso tenga: % lecciones terminadas, % actividades
-- enviadas, % casos enviados y el examen (0 % mientras no se apruebe). Un componente vacío no entra
-- al promedio. El avance del módulo y el general son promedios que calcula el backend.
-- El backend siempre filtra por el alumno de la sesión (INV-07). Con security_invoker la vista se
-- consulta con los permisos de quien la usa (echo_app), no con los de su dueño.
CREATE VIEW v_avance_curso
WITH (security_invoker = true)
AS
WITH
cursos AS (
  SELECT c.id AS curso_id, c.modulo_id
  FROM curso c
  JOIN modulo m ON m.id = c.modulo_id
  WHERE c.publicado AND m.publicado
),
lecciones AS (
  SELECT l.id AS leccion_id, l.curso_id
  FROM leccion l
  JOIN cursos c ON c.curso_id = l.curso_id
  WHERE l.publicado
),
practicas AS (
  SELECT q.id AS cuestionario_id, q.tipo, l.curso_id
  FROM cuestionario q
  JOIN lecciones l ON l.leccion_id = q.leccion_id
  WHERE q.activo AND q.tipo IN ('actividad', 'caso')
),
examenes AS (
  SELECT q.id AS cuestionario_id, q.curso_id
  FROM cuestionario q
  JOIN cursos c ON c.curso_id = q.curso_id
  WHERE q.tipo = 'examen'
),
base AS (
  SELECT
    u.id AS usuario_id,
    c.curso_id,
    c.modulo_id,
    (SELECT count(*) FROM lecciones l WHERE l.curso_id = c.curso_id) AS lecciones_total,
    (SELECT count(*)
     FROM lecciones l
     JOIN progreso_leccion p ON p.leccion_id = l.leccion_id AND p.usuario_id = u.id
     WHERE l.curso_id = c.curso_id AND p.terminada_en IS NOT NULL) AS lecciones_terminadas,
    (SELECT count(*) FROM practicas q WHERE q.curso_id = c.curso_id AND q.tipo = 'actividad') AS actividades_total,
    (SELECT count(*)
     FROM practicas q
     WHERE q.curso_id = c.curso_id AND q.tipo = 'actividad'
       AND EXISTS (SELECT 1 FROM intento i
                   WHERE i.cuestionario_id = q.cuestionario_id AND i.usuario_id = u.id
                     AND i.estado = 'enviado')) AS actividades_enviadas,
    (SELECT count(*) FROM practicas q WHERE q.curso_id = c.curso_id AND q.tipo = 'caso') AS casos_total,
    (SELECT count(*)
     FROM practicas q
     WHERE q.curso_id = c.curso_id AND q.tipo = 'caso'
       AND EXISTS (SELECT 1 FROM intento i
                   WHERE i.cuestionario_id = q.cuestionario_id AND i.usuario_id = u.id
                     AND i.estado = 'enviado')) AS casos_enviados,
    EXISTS (SELECT 1 FROM examenes e WHERE e.curso_id = c.curso_id) AS tiene_examen,
    EXISTS (SELECT 1
            FROM examenes e
            JOIN intento i ON i.cuestionario_id = e.cuestionario_id
            WHERE e.curso_id = c.curso_id AND i.usuario_id = u.id AND i.aprobado) AS examen_aprobado
  FROM usuario u
  CROSS JOIN cursos c
  WHERE u.estado <> 'anonimizado'
)
SELECT
  b.usuario_id,
  b.curso_id,
  b.modulo_id,
  b.lecciones_total::INT,
  b.lecciones_terminadas::INT,
  b.actividades_total::INT,
  b.actividades_enviadas::INT,
  b.casos_total::INT,
  b.casos_enviados::INT,
  b.examen_aprobado,
  CASE
    WHEN b.examen_aprobado THEN 100.00
    ELSE coalesce(round((
        coalesce(b.lecciones_terminadas::NUMERIC / nullif(b.lecciones_total, 0), 0)
      + coalesce(b.actividades_enviadas::NUMERIC / nullif(b.actividades_total, 0), 0)
      + coalesce(b.casos_enviados::NUMERIC / nullif(b.casos_total, 0), 0)
      ) * 100
      / nullif((b.lecciones_total > 0)::INT + (b.actividades_total > 0)::INT
               + (b.casos_total > 0)::INT + b.tiene_examen::INT, 0), 2), 0)
  END::NUMERIC(5, 2) AS avance
FROM base b;

-- ============================================================================
-- v_resultados_anonimos: estadísticas para el informe académico (DEC-48, DEC-88)
-- ============================================================================
-- Intentos enviados con su ubicación en el contenido, tipo, fecha y calificación. Sin nombre, correo
-- ni identificador del alumno, y solo la fecha (sin hora, en hora de México), para que una fila no
-- pueda ligarse a una persona. Excluye a quien marcó la negativa a las estadísticas, también después
-- de anonimizar su cuenta. Solo la lee echo_lectura; como no puede leer las tablas de estudiantes,
-- esta vista usa los permisos de su dueño (comportamiento por defecto).
CREATE VIEW v_resultados_anonimos AS
SELECT
  m.slug   AS modulo,
  c.slug   AS curso,
  l.slug   AS leccion,
  q.tipo,
  q.titulo AS cuestionario,
  i.numero AS numero_intento,
  (i.enviado_en AT TIME ZONE 'America/Mexico_City')::DATE AS fecha,
  i.calificacion,
  i.aprobado
FROM intento i
JOIN usuario u ON u.id = i.usuario_id
JOIN cuestionario q ON q.id = i.cuestionario_id
LEFT JOIN leccion l ON l.id = q.leccion_id
JOIN curso c ON c.id = coalesce(q.curso_id, l.curso_id)
JOIN modulo m ON m.id = c.modulo_id
WHERE i.estado = 'enviado'
  AND NOT u.negativa_estadisticas;

-- ============================================================================
-- Permisos
-- ============================================================================
GRANT SELECT ON v_avance_curso TO echo_app;
GRANT SELECT ON v_resultados_anonimos TO echo_lectura;
