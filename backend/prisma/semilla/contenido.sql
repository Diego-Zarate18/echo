-- Semilla de desarrollo: contenido de ejemplo (INV-14, INV-24).
-- Es el mismo contenido de la API simulada del frontend (frontend/simulador/contenido.mjs), con los mismos ids,
-- para que las pantallas y las pruebas vean los mismos datos con el backend real. Todo es inventado.
-- La carga prisma/semilla/cargar.mjs como echo_contenido, en una transacción, sobre una base recién reiniciada
-- (npm run bd:reiniciar). Nunca se carga en producción.

DO $semilla$
BEGIN
  IF EXISTS (SELECT 1 FROM modulo) OR EXISTS (SELECT 1 FROM documento_legal) THEN
    RAISE EXCEPTION 'La base ya tiene contenido. La semilla se carga sobre una base recién reiniciada: npm run bd:reiniciar';
  END IF;
END
$semilla$;

-- imagen: ids 1 a 5
INSERT INTO imagen (ruta, texto_alternativo, pie) VALUES
  ('/marca/moris-curioso.png', 'Moris, la semilla de Echo, con cara de curiosidad.', 'Moris pregunta antes de decidir.'),
  ('/marca/moris-sorprendido.png', 'Moris sorprendido, con los ojos muy abiertos.', NULL),
  ('/marca/moris-feliz.png', 'Moris sonriendo.', NULL),
  ('/marca/moris-principal.png', 'Sello del módulo «Ética profesional en TI»: Moris de frente.', NULL),
  ('/marca/moris-triste.png', 'Sello del módulo «Propiedad intelectual»: Moris pensativo.', NULL);

-- fundamento: ids 1 a 4
INSERT INTO fundamento (tipo, nombre, articulo, descripcion, referencia) VALUES
  ('codigo', 'Código de Ética y Conducta Profesional de ACM', 'Principio 1.6', 'Respetar la privacidad de las personas.', 'https://www.acm.org/code-of-ethics'),
  ('codigo', 'Código de Ética y Conducta Profesional de ACM', 'Principio 2.5', 'Evaluar los sistemas y sus riesgos de forma completa.', 'https://www.acm.org/code-of-ethics'),
  ('ley', 'LFPDPPP', 'Consentimiento', 'Los datos personales se tratan con el consentimiento de su titular. (Ejemplo de cita.)', NULL),
  ('ley', 'Ley Federal del Derecho de Autor', 'Programas de cómputo', 'Los programas de cómputo están protegidos como obras. (Ejemplo de cita.)', NULL);

-- modulo: ids 1 a 2
INSERT INTO modulo (slug, titulo, descripcion, orden, publicado) VALUES
  ('etica-profesional', 'Ética profesional en TI', 'Contenido de ejemplo. Qué es un código de ética y cómo cuida a las personas que usan lo que construyes.', 1, 'true'),
  ('propiedad-intelectual', 'Propiedad intelectual', 'Contenido de ejemplo. Derechos de autor del software y licencias.', 2, 'true');

-- insignia: ids 1 a 2
INSERT INTO insignia (modulo_id, nombre, descripcion, imagen_id) VALUES
  (1, 'Ética profesional', 'Completaste el módulo «Ética profesional en TI».', 4),
  (2, 'Propiedad intelectual', 'Completaste el módulo «Propiedad intelectual».', 5);

-- curso: ids 1 a 3
INSERT INTO curso (modulo_id, slug, titulo, descripcion, orden, publicado) VALUES
  (1, 'codigos-de-etica', 'Códigos de ética', 'Contenido de ejemplo. Para qué sirve un código de ética y qué pide el de ACM.', 1, 'true'),
  (1, 'privacidad-de-datos', 'Privacidad de datos', 'Contenido de ejemplo. Datos personales y derechos ARCO.', 2, 'true'),
  (2, 'derechos-de-autor', 'Derechos de autor del software', 'Contenido de ejemplo. A quién pertenece el código y cómo se comparte.', 1, 'true');

-- leccion: ids 1 a 6
INSERT INTO leccion (curso_id, slug, titulo, resumen, orden, publicado, publicado_en) VALUES
  (1, 'que-es-un-codigo-de-etica', '¿Qué es un código de ética?', 'Contenido de ejemplo. Normas que orientan decisiones profesionales.', 1, 'true', '2026-10-01T15:00:00.000Z'),
  (1, 'el-codigo-de-acm', 'El código de ACM', 'Contenido de ejemplo. Principios generales y responsabilidades.', 2, 'true', '2026-10-01T15:00:00.000Z'),
  (2, 'datos-personales', 'Datos personales', 'Contenido de ejemplo. Qué es un dato personal y quién responde por él.', 1, 'true', '2026-10-01T15:00:00.000Z'),
  (2, 'derechos-arco', 'Derechos ARCO', 'Contenido de ejemplo. Acceso, rectificación, cancelación y oposición.', 2, 'true', '2026-10-01T15:00:00.000Z'),
  (3, 'el-software-es-una-obra', 'El software es una obra', 'Contenido de ejemplo. El código también tiene autor.', 1, 'true', '2026-10-01T15:00:00.000Z'),
  (3, 'licencias-de-software', 'Licencias de software', 'Contenido de ejemplo. Cómo se comparte el código sin perder derechos.', 2, 'true', '2026-10-01T15:00:00.000Z');

-- seccion: ids 1 a 14
INSERT INTO seccion (leccion_id, orden, titulo, cuerpo, imagen_id) VALUES
  (1, 1, 'Para qué sirve', '*Contenido de ejemplo.*

Un **código de ética** reúne las normas que orientan cómo actúa una profesión. No sustituye a la ley: la complementa.

### Lo que vas a ver

- Qué es un código de ética.
- Por qué importa en TI.
- Cómo se usa para decidir.', 1),
  (1, 2, 'Por qué importa en TI', 'El software decide cada vez más cosas sobre las personas. Un error de diseño puede **exponer datos** o **excluir** a quien no fue considerado.

### Ejemplos

1. Una app que guarda contraseñas sin cifrar.
2. Un formulario que no se puede usar con teclado.', NULL),
  (1, 3, 'Cómo se usa para decidir', 'Ante un dilema, el código te ayuda a hacerte tres preguntas:

- ¿A quién afecta mi decisión?
- ¿Qué riesgo corre esa persona?
- ¿Qué principio lo respalda?', NULL),
  (2, 1, 'Principios generales', '*Contenido de ejemplo.*

El código de ACM empieza con principios generales, como **evitar el daño** y **respetar la privacidad**.

### Algunos principios

- Contribuir al bienestar de las personas.
- Ser honesto y digno de confianza.
- Respetar la privacidad.', 2),
  (2, 2, 'Responsabilidades profesionales', 'Además de los principios, el código pide **evaluar los riesgos** de un sistema y **reconocer el trabajo** de otras personas.', NULL),
  (3, 1, 'Qué es un dato personal', '*Contenido de ejemplo.*

Un **dato personal** es cualquier información sobre una persona identificada o identificable: su nombre, su correo o su historial.

### Ejemplos

- Nombre y apellidos.
- Correo electrónico.
- Calificaciones.', 1),
  (3, 2, 'Quién responde por ellos', 'Quien decide para qué se usan los datos es el **responsable**. Debe informar en un **aviso de privacidad** qué datos recaba y para qué.', NULL),
  (4, 1, 'Acceso y rectificación', '*Contenido de ejemplo.*

Puedes **acceder** a tus datos y **rectificarlos** si están mal.', NULL),
  (4, 2, 'Cancelación y oposición', 'Puedes pedir que **cancelen** tus datos o **oponerte** a un uso.

### Recuerda

- La solicitud se hace por escrito.
- El responsable debe responder en un plazo.', 3),
  (4, 3, 'Cómo se ejerce', 'Se escribe al contacto que indica el aviso de privacidad, con lo que pides y cómo te identificas.', NULL),
  (5, 1, 'El código tiene autor', '*Contenido de ejemplo.*

Un programa de cómputo es una **obra**: tiene autor y está protegido desde que se crea.', 2),
  (5, 2, 'Copiar no es lo mismo que aprender', 'Leer código ajeno para aprender está bien. **Copiarlo** sin permiso en tu proyecto, no.

- Revisa la licencia.
- Da crédito.', NULL),
  (6, 1, 'Qué es una licencia', '*Contenido de ejemplo.*

Una **licencia** dice qué puedes hacer con un código: usarlo, modificarlo o compartirlo.', 3),
  (6, 2, 'Licencias libres', 'Algunas licencias piden que **compartas** tus cambios con la misma licencia; otras solo piden **dar crédito**.', NULL);

-- cuestionario: ids 1 a 10
INSERT INTO cuestionario (tipo, leccion_id, curso_id, orden, titulo, instrucciones, calificacion_minima, minutos_espera) VALUES
  ('actividad', 1, NULL, 1, 'Actividad: qué es un código de ética', 'Contenido de ejemplo. Responde las preguntas. Puedes repetir la actividad cuando quieras.', 70, 20),
  ('caso', 1, NULL, 2, 'Caso: el reporte con datos de más', 'Contenido de ejemplo. Lee el caso y elige qué harías.', 70, 20),
  ('actividad', 2, NULL, 1, 'Actividad: el código de ACM', 'Contenido de ejemplo. Responde las preguntas.', 70, 20),
  ('examen', NULL, 1, NULL, 'Examen: Códigos de ética', 'Contenido de ejemplo. Sin cronómetro. Cada respuesta se guarda al elegirla.', 70, 20),
  ('actividad', 3, NULL, 1, 'Actividad: datos personales', 'Contenido de ejemplo. Responde las preguntas.', 70, 20),
  ('actividad', 4, NULL, 1, 'Actividad: derechos ARCO', 'Contenido de ejemplo. Responde las preguntas.', 70, 20),
  ('examen', NULL, 2, NULL, 'Examen: Privacidad de datos', 'Contenido de ejemplo. Sin cronómetro.', 70, 20),
  ('actividad', 5, NULL, 1, 'Actividad: el software es una obra', 'Contenido de ejemplo. Responde las preguntas.', 70, 20),
  ('actividad', 6, NULL, 1, 'Actividad: licencias', 'Contenido de ejemplo. Responde las preguntas.', 70, 20),
  ('examen', NULL, 3, NULL, 'Examen: Derechos de autor del software', 'Contenido de ejemplo. Sin cronómetro.', 70, 20);

-- pregunta: ids 1 a 19
INSERT INTO pregunta (cuestionario_id, tipo, enunciado, orden, fundamento_id, leccion_repaso_id, retroalimentacion) VALUES
  (1, 'opcion_multiple', '¿Qué hace un código de ética profesional?', 1, NULL, 1, 'Un código orienta decisiones; no sustituye a la ley.'),
  (1, 'verdadero_falso', 'Un error de diseño puede exponer datos de las personas.', 2, 1, 1, 'Las decisiones técnicas tienen consecuencias en las personas.'),
  (2, 'decision', 'Te piden un reporte de calificaciones para una junta y la consulta trae también los correos de todo el grupo. ¿Qué haces?', 1, 1, NULL, NULL),
  (3, 'opcion_multiple', '¿Cuál es un principio general del código de ACM?', 1, 1, 2, 'Respetar la privacidad es el principio 1.6.'),
  (3, 'relacion', 'Relaciona cada principio con lo que pide.', 2, 2, 2, 'Cada principio orienta una parte del trabajo.'),
  (4, 'opcion_multiple', '¿Qué complementa un código de ética?', 1, NULL, 1, 'El código complementa a la ley.'),
  (4, 'verdadero_falso', 'El código de ACM pide evaluar los riesgos de un sistema.', 2, 2, 2, 'Es el principio 2.5.'),
  (4, 'opcion_multiple', 'Guardar contraseñas sin cifrar va contra un principio del código de ACM. ¿Cuál?', 3, 1, 2, 'Una contraseña sin cifrar puede exponer a las personas: es un daño evitable.'),
  (4, 'opcion_multiple', 'Ante un dilema, ¿qué conviene preguntarse primero?', 4, NULL, 1, 'Primero, a quién afecta la decisión.'),
  (4, 'verdadero_falso', 'Un formulario que no se puede usar con teclado excluye a algunas personas.', 5, NULL, 1, 'La accesibilidad también es una decisión ética.'),
  (5, 'verdadero_falso', 'El correo electrónico es un dato personal.', 1, 3, 3, 'Identifica a una persona.'),
  (6, 'opcion_multiple', '¿Qué derecho usas para corregir un dato equivocado?', 1, 3, 4, 'Rectificar es corregir.'),
  (7, 'verdadero_falso', 'El aviso de privacidad dice para qué se usan los datos.', 1, 3, 3, 'Informa las finalidades.'),
  (7, 'opcion_multiple', '¿Qué derecho usas para pedir que borren tus datos?', 2, 3, 4, 'Cancelar es pedir que se borren.'),
  (7, 'verdadero_falso', 'Las calificaciones son datos personales.', 3, 3, 3, 'Se refieren a una persona.'),
  (8, 'verdadero_falso', 'Un programa de cómputo está protegido desde que se crea.', 1, 4, 5, 'No hace falta registrarlo para que tenga autor.'),
  (9, 'opcion_multiple', '¿Qué indica una licencia de software?', 1, 4, 6, 'Indica qué puedes hacer con el código.'),
  (10, 'verdadero_falso', 'Copiar código ajeno sin permiso en tu proyecto está bien si lo cambias un poco.', 1, 4, 5, 'Cambiarlo no te da permiso.'),
  (10, 'opcion_multiple', '¿Qué piden casi todas las licencias libres?', 2, 4, 6, 'Dar crédito.');

-- opcion: ids 1 a 41. Las de la pregunta 8 van al final (39 a 41) para no correr los ids de las demás.
INSERT INTO opcion (pregunta_id, texto, valor, retroalimentacion, consecuencia, fundamento_id, orden) VALUES
  (1, 'Orienta cómo actuar ante decisiones profesionales.', 1, 'Correcto: es una guía para decidir.', NULL, NULL, 1),
  (1, 'Sustituye a las leyes del país.', 0, 'No: las complementa.', NULL, NULL, 2),
  (1, 'Solo aplica a empresas grandes.', 0, 'No: aplica a cada profesional.', NULL, NULL, 3),
  (2, 'Verdadero', 1, 'Correcto.', NULL, NULL, 1),
  (2, 'Falso', 0, 'Sí puede: por eso importa la ética en TI.', NULL, NULL, 2),
  (3, 'Quito los correos: la junta solo necesita las calificaciones.', 1, 'Usas solo los datos necesarios.', 'El reporte cumple su propósito sin exponer a nadie.', 1, 1),
  (3, 'Pregunto si los correos hacen falta antes de enviarlo.', 0.5, 'Preguntar ayuda, pero el dato ya viaja en el borrador.', 'Se retrasa un poco, pero se evita compartir de más.', 3, 2),
  (3, 'Lo envío como está; es más rápido.', 0, 'Compartes datos que nadie pidió.', 'Los correos del grupo terminan en manos de personas que no los necesitaban.', 3, 3),
  (4, 'Respetar la privacidad.', 1, 'Correcto.', NULL, NULL, 1),
  (4, 'Entregar siempre a tiempo.', 0, 'Es deseable, pero no es un principio del código.', NULL, NULL, 2),
  (6, 'La ley', 1, 'Correcto.', NULL, NULL, 1),
  (6, 'El contrato de trabajo', 0, 'No es lo que complementa.', NULL, NULL, 2),
  (6, 'El manual de usuario', 0, 'No.', NULL, NULL, 3),
  (7, 'Verdadero', 1, 'Correcto.', NULL, NULL, 1),
  (7, 'Falso', 0, 'Sí lo pide.', NULL, NULL, 2),
  (9, '¿A quién afecta mi decisión?', 1, 'Correcto.', NULL, NULL, 1),
  (9, '¿Cuánto tardaré?', 0, 'Importa, pero no es lo primero.', NULL, NULL, 2),
  (9, '¿Qué herramienta usaré?', 0, 'No es una pregunta ética.', NULL, NULL, 3),
  (10, 'Verdadero', 1, 'Correcto.', NULL, NULL, 1),
  (10, 'Falso', 0, 'Sí las excluye.', NULL, NULL, 2),
  (11, 'Verdadero', 1, 'Correcto.', NULL, NULL, 1),
  (11, 'Falso', 0, 'Sí lo es.', NULL, NULL, 2),
  (12, 'Rectificación', 1, 'Correcto.', NULL, NULL, 1),
  (12, 'Oposición', 0, 'La oposición es para negarte a un uso.', NULL, NULL, 2),
  (13, 'Verdadero', 1, 'Correcto.', NULL, NULL, 1),
  (13, 'Falso', 0, 'Sí lo dice.', NULL, NULL, 2),
  (14, 'Cancelación', 1, 'Correcto.', NULL, NULL, 1),
  (14, 'Acceso', 0, 'El acceso es para conocerlos.', NULL, NULL, 2),
  (15, 'Verdadero', 1, 'Correcto.', NULL, NULL, 1),
  (15, 'Falso', 0, 'Sí lo son.', NULL, NULL, 2),
  (16, 'Verdadero', 1, 'Correcto.', NULL, NULL, 1),
  (16, 'Falso', 0, 'Sí lo está.', NULL, NULL, 2),
  (17, 'Qué puedes hacer con el código', 1, 'Correcto.', NULL, NULL, 1),
  (17, 'Quién lo programó primero', 0, 'No.', NULL, NULL, 2),
  (18, 'Verdadero', 0, 'No: necesitas permiso o una licencia.', NULL, NULL, 1),
  (18, 'Falso', 1, 'Correcto.', NULL, NULL, 2),
  (19, 'Dar crédito a quien escribió el código', 1, 'Correcto.', NULL, NULL, 1),
  (19, 'Pagar una cuota', 0, 'No.', NULL, NULL, 2),
  (8, 'Evitar el daño', 1, 'Correcto.', NULL, NULL, 1),
  (8, 'Ser honesto', 0, 'Ser honesto es informar los límites de un sistema.', NULL, NULL, 2),
  (8, 'Entregar siempre a tiempo', 0, 'Es deseable, pero no es un principio del código.', NULL, NULL, 3);

-- pareja: ids 1 a 3. Los exámenes no llevan relación de columnas (DEC-117): solo la actividad 3 la tiene.
INSERT INTO pareja (pregunta_id, texto_izquierdo, texto_derecho, orden) VALUES
  (5, 'Evitar el daño', 'Prever consecuencias negativas', 1),
  (5, 'Respetar la privacidad', 'Usar solo los datos necesarios', 2),
  (5, 'Ser honesto', 'Informar los límites de un sistema', 3);

-- Los ids deben coincidir con los del simulador (las pruebas del frontend usan /api/actividades/1, /api/examenes/4…).
-- Si la base no se reinició, los contadores de identidad no empiezan en 1 y los ids quedan corridos.
DO $semilla$
BEGIN
  IF (SELECT max(id) FROM modulo) <> 2 OR (SELECT max(id) FROM cuestionario) <> 10
     OR (SELECT id FROM cuestionario WHERE titulo = 'Examen: Códigos de ética') <> 4
     OR (SELECT max(id) FROM opcion) <> 41 OR (SELECT max(id) FROM pareja) <> 3 THEN
    RAISE EXCEPTION 'Los ids del contenido no coinciden con los del simulador. Reinicia la base: npm run bd:reiniciar';
  END IF;
END
$semilla$;
