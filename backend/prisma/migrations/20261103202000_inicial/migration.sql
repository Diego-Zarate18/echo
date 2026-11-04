-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "nombre" TEXT,
    "apellidos" TEXT,
    "correo" TEXT,
    "correo_verificado_en" TIMESTAMPTZ(6),
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "hash_contrasena" TEXT,
    "google_sub" TEXT,
    "intentos_fallidos" INTEGER NOT NULL DEFAULT 0,
    "bloqueado_hasta" TIMESTAMPTZ(6),
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anonimizado_en" TIMESTAMPTZ(6),
    "mayoria_edad_confirmada_en" TIMESTAMPTZ(6),
    "negativa_encuesta" BOOLEAN NOT NULL DEFAULT false,
    "negativa_estadisticas" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesion" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "usuario_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "creada_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultima_actividad_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revocada_en" TIMESTAMPTZ(6),
    "agente_usuario" TEXT,

    CONSTRAINT "sesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_correo" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "usuario_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "correo_destino" TEXT NOT NULL,
    "expira_en" TIMESTAMPTZ(6) NOT NULL,
    "usado_en" TIMESTAMPTZ(6),
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_correo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documento_legal" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    "tipo" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "publicado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requiere_aceptacion" BOOLEAN NOT NULL DEFAULT true,
    "huella_contenido" TEXT NOT NULL,
    "resumen_cambios" TEXT NOT NULL,

    CONSTRAINT "documento_legal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aceptacion_documento" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "usuario_id" UUID NOT NULL,
    "documento_id" BIGINT NOT NULL,
    "aceptado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "direccion_ip" INET,

    CONSTRAINT "aceptacion_documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modulo" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    "slug" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "publicado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "modulo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curso" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    "modulo_id" BIGINT NOT NULL,
    "slug" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "publicado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "curso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leccion" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    "curso_id" BIGINT NOT NULL,
    "slug" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "resumen" TEXT,
    "orden" INTEGER NOT NULL,
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "publicado_en" TIMESTAMPTZ(6),

    CONSTRAINT "leccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seccion" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    "leccion_id" BIGINT NOT NULL,
    "orden" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "imagen_id" BIGINT,

    CONSTRAINT "seccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imagen" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    "ruta" TEXT NOT NULL,
    "texto_alternativo" TEXT NOT NULL,
    "pie" TEXT,

    CONSTRAINT "imagen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fundamento" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    "tipo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "articulo" TEXT,
    "descripcion" TEXT NOT NULL,
    "referencia" TEXT,

    CONSTRAINT "fundamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuestionario" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    "tipo" TEXT NOT NULL,
    "leccion_id" BIGINT,
    "curso_id" BIGINT,
    "orden" INTEGER,
    "titulo" TEXT NOT NULL,
    "instrucciones" TEXT NOT NULL,
    "calificacion_minima" DECIMAL(5,2) NOT NULL DEFAULT 70.00,
    "minutos_espera" INTEGER NOT NULL DEFAULT 20,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "cuestionario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pregunta" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    "cuestionario_id" BIGINT NOT NULL,
    "tipo" TEXT NOT NULL,
    "enunciado" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "fundamento_id" BIGINT,
    "leccion_repaso_id" BIGINT,
    "retroalimentacion" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pregunta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opcion" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    "pregunta_id" BIGINT NOT NULL,
    "texto" TEXT NOT NULL,
    "valor" DECIMAL(3,2) NOT NULL,
    "retroalimentacion" TEXT,
    "consecuencia" TEXT,
    "fundamento_id" BIGINT,
    "orden" INTEGER NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "opcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pareja" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    "pregunta_id" BIGINT NOT NULL,
    "texto_izquierdo" TEXT NOT NULL,
    "texto_derecho" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "pareja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intento" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "usuario_id" UUID NOT NULL,
    "cuestionario_id" BIGINT NOT NULL,
    "numero" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'en_curso',
    "semilla" INTEGER NOT NULL DEFAULT floor(random() * 2147483647)::int,
    "iniciado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviado_en" TIMESTAMPTZ(6),
    "calificacion" DECIMAL(5,2),
    "aprobado" BOOLEAN,

    CONSTRAINT "intento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "respuesta_opcion" (
    "intento_id" UUID NOT NULL,
    "pregunta_id" BIGINT NOT NULL,
    "opcion_id" BIGINT NOT NULL,
    "puntaje" DECIMAL(3,2),
    "respondido_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "respuesta_opcion_pkey" PRIMARY KEY ("intento_id","pregunta_id")
);

-- CreateTable
CREATE TABLE "respuesta_pareja" (
    "intento_id" UUID NOT NULL,
    "pareja_izquierda_id" BIGINT NOT NULL,
    "pareja_derecha_id" BIGINT NOT NULL,
    "respondido_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "respuesta_pareja_pkey" PRIMARY KEY ("intento_id","pareja_izquierda_id")
);

-- CreateTable
CREATE TABLE "progreso_leccion" (
    "usuario_id" UUID NOT NULL,
    "leccion_id" BIGINT NOT NULL,
    "ultima_seccion" INTEGER NOT NULL DEFAULT 1,
    "abierta_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminada_en" TIMESTAMPTZ(6),

    CONSTRAINT "progreso_leccion_pkey" PRIMARY KEY ("usuario_id","leccion_id")
);

-- CreateTable
CREATE TABLE "insignia" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    "modulo_id" BIGINT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "imagen_id" BIGINT NOT NULL,

    CONSTRAINT "insignia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insignia_usuario" (
    "usuario_id" UUID NOT NULL,
    "insignia_id" BIGINT NOT NULL,
    "otorgada_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insignia_usuario_pkey" PRIMARY KEY ("usuario_id","insignia_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_correo_key" ON "usuario"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_google_sub_key" ON "usuario"("google_sub");

-- CreateIndex
CREATE UNIQUE INDEX "sesion_token_hash_key" ON "sesion"("token_hash");

-- CreateIndex
CREATE INDEX "sesion_usuario_id_idx" ON "sesion"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "token_correo_token_hash_key" ON "token_correo"("token_hash");

-- CreateIndex
CREATE INDEX "token_correo_usuario_id_idx" ON "token_correo"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "documento_legal_tipo_version_key" ON "documento_legal"("tipo", "version");

-- CreateIndex
CREATE UNIQUE INDEX "aceptacion_documento_usuario_id_documento_id_key" ON "aceptacion_documento"("usuario_id", "documento_id");

-- CreateIndex
CREATE UNIQUE INDEX "modulo_slug_key" ON "modulo"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "modulo_orden_key" ON "modulo"("orden");

-- CreateIndex
CREATE UNIQUE INDEX "curso_slug_key" ON "curso"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "curso_modulo_id_orden_key" ON "curso"("modulo_id", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "leccion_slug_key" ON "leccion"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "leccion_curso_id_orden_key" ON "leccion"("curso_id", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "seccion_leccion_id_orden_key" ON "seccion"("leccion_id", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "imagen_ruta_key" ON "imagen"("ruta");

-- CreateIndex
CREATE UNIQUE INDEX "opcion_id_pregunta_id_key" ON "opcion"("id", "pregunta_id");

-- CreateIndex
CREATE UNIQUE INDEX "pareja_pregunta_id_orden_key" ON "pareja"("pregunta_id", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "intento_usuario_id_cuestionario_id_numero_key" ON "intento"("usuario_id", "cuestionario_id", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "respuesta_pareja_intento_id_pareja_derecha_id_key" ON "respuesta_pareja"("intento_id", "pareja_derecha_id");

-- CreateIndex
CREATE UNIQUE INDEX "insignia_modulo_id_key" ON "insignia"("modulo_id");

-- AddForeignKey
ALTER TABLE "sesion" ADD CONSTRAINT "sesion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "token_correo" ADD CONSTRAINT "token_correo_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "aceptacion_documento" ADD CONSTRAINT "aceptacion_documento_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "aceptacion_documento" ADD CONSTRAINT "aceptacion_documento_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documento_legal"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "curso" ADD CONSTRAINT "curso_modulo_id_fkey" FOREIGN KEY ("modulo_id") REFERENCES "modulo"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "leccion" ADD CONSTRAINT "leccion_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "seccion" ADD CONSTRAINT "seccion_leccion_id_fkey" FOREIGN KEY ("leccion_id") REFERENCES "leccion"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "seccion" ADD CONSTRAINT "seccion_imagen_id_fkey" FOREIGN KEY ("imagen_id") REFERENCES "imagen"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cuestionario" ADD CONSTRAINT "cuestionario_leccion_id_fkey" FOREIGN KEY ("leccion_id") REFERENCES "leccion"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cuestionario" ADD CONSTRAINT "cuestionario_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pregunta" ADD CONSTRAINT "pregunta_cuestionario_id_fkey" FOREIGN KEY ("cuestionario_id") REFERENCES "cuestionario"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pregunta" ADD CONSTRAINT "pregunta_fundamento_id_fkey" FOREIGN KEY ("fundamento_id") REFERENCES "fundamento"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pregunta" ADD CONSTRAINT "pregunta_leccion_repaso_id_fkey" FOREIGN KEY ("leccion_repaso_id") REFERENCES "leccion"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "opcion" ADD CONSTRAINT "opcion_pregunta_id_fkey" FOREIGN KEY ("pregunta_id") REFERENCES "pregunta"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "opcion" ADD CONSTRAINT "opcion_fundamento_id_fkey" FOREIGN KEY ("fundamento_id") REFERENCES "fundamento"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pareja" ADD CONSTRAINT "pareja_pregunta_id_fkey" FOREIGN KEY ("pregunta_id") REFERENCES "pregunta"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "intento" ADD CONSTRAINT "intento_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "intento" ADD CONSTRAINT "intento_cuestionario_id_fkey" FOREIGN KEY ("cuestionario_id") REFERENCES "cuestionario"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "respuesta_opcion" ADD CONSTRAINT "respuesta_opcion_intento_id_fkey" FOREIGN KEY ("intento_id") REFERENCES "intento"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "respuesta_opcion" ADD CONSTRAINT "respuesta_opcion_pregunta_id_fkey" FOREIGN KEY ("pregunta_id") REFERENCES "pregunta"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "respuesta_opcion" ADD CONSTRAINT "respuesta_opcion_opcion_id_pregunta_id_fkey" FOREIGN KEY ("opcion_id", "pregunta_id") REFERENCES "opcion"("id", "pregunta_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "respuesta_pareja" ADD CONSTRAINT "respuesta_pareja_intento_id_fkey" FOREIGN KEY ("intento_id") REFERENCES "intento"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "respuesta_pareja" ADD CONSTRAINT "respuesta_pareja_pareja_izquierda_id_fkey" FOREIGN KEY ("pareja_izquierda_id") REFERENCES "pareja"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "respuesta_pareja" ADD CONSTRAINT "respuesta_pareja_pareja_derecha_id_fkey" FOREIGN KEY ("pareja_derecha_id") REFERENCES "pareja"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "progreso_leccion" ADD CONSTRAINT "progreso_leccion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "progreso_leccion" ADD CONSTRAINT "progreso_leccion_leccion_id_fkey" FOREIGN KEY ("leccion_id") REFERENCES "leccion"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "insignia" ADD CONSTRAINT "insignia_modulo_id_fkey" FOREIGN KEY ("modulo_id") REFERENCES "modulo"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "insignia" ADD CONSTRAINT "insignia_imagen_id_fkey" FOREIGN KEY ("imagen_id") REFERENCES "imagen"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "insignia_usuario" ADD CONSTRAINT "insignia_usuario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "insignia_usuario" ADD CONSTRAINT "insignia_usuario_insignia_id_fkey" FOREIGN KEY ("insignia_id") REFERENCES "insignia"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- Reglas de integridad del dominio
ALTER TABLE "usuario"
  ADD CONSTRAINT "chk_usuario_acceso"
  CHECK (estado = 'anonimizado' OR hash_contrasena IS NOT NULL OR google_sub IS NOT NULL),
  ADD CONSTRAINT "chk_usuario_datos"
  CHECK (estado = 'anonimizado' OR (nombre IS NOT NULL AND correo IS NOT NULL)),
  ADD CONSTRAINT "chk_usuario_activo"
  CHECK (estado <> 'activo' OR correo_verificado_en IS NOT NULL OR google_sub IS NOT NULL),
  ADD CONSTRAINT "chk_usuario_anonimizado"
  CHECK (estado <> 'anonimizado' OR (anonimizado_en IS NOT NULL AND correo IS NULL AND hash_contrasena IS NULL AND google_sub IS NULL)),
  ADD CONSTRAINT "chk_usuario_mayoria_edad"
  CHECK (estado = 'anonimizado' OR mayoria_edad_confirmada_en IS NOT NULL),
  ADD CONSTRAINT "chk_usuario_estado"
  CHECK (estado IN ('pendiente', 'activo', 'anonimizado')),
  ADD CONSTRAINT "chk_usuario_intentos_fallidos"
  CHECK (intentos_fallidos >= 0);

ALTER TABLE "sesion"
  ADD CONSTRAINT "chk_sesion_agente_usuario"
  CHECK (agente_usuario IS NULL OR length(agente_usuario) <= 500);

ALTER TABLE "token_correo"
  ADD CONSTRAINT "chk_token_correo_tipo"
  CHECK (tipo IN ('verificacion', 'recuperacion', 'cambio_correo')),
  ADD CONSTRAINT "chk_token_correo_expiracion"
  CHECK (expira_en > creado_en);

ALTER TABLE "documento_legal"
  ADD CONSTRAINT "chk_documento_legal_tipo"
  CHECK (tipo IN ('aviso_privacidad', 'terminos')),
  ADD CONSTRAINT "chk_documento_legal_huella"
  CHECK (length(huella_contenido) = 64),
  ADD CONSTRAINT "chk_documento_legal_resumen"
  CHECK (length(resumen_cambios) BETWEEN 1 AND 1000);

ALTER TABLE "modulo"
  ADD CONSTRAINT "chk_modulo_slug"
  CHECK (slug ~ '^[a-z0-9-]+$'),
  ADD CONSTRAINT "chk_modulo_titulo"
  CHECK (length(titulo) BETWEEN 1 AND 150),
  ADD CONSTRAINT "chk_modulo_orden"
  CHECK (orden > 0);

ALTER TABLE "curso"
  ADD CONSTRAINT "chk_curso_slug"
  CHECK (slug ~ '^[a-z0-9-]+$'),
  ADD CONSTRAINT "chk_curso_titulo"
  CHECK (length(titulo) BETWEEN 1 AND 150),
  ADD CONSTRAINT "chk_curso_orden"
  CHECK (orden > 0);

ALTER TABLE "leccion"
  ADD CONSTRAINT "chk_leccion_slug"
  CHECK (slug ~ '^[a-z0-9-]+$'),
  ADD CONSTRAINT "chk_leccion_titulo"
  CHECK (length(titulo) BETWEEN 1 AND 150),
  ADD CONSTRAINT "chk_leccion_orden"
  CHECK (orden > 0),
  ADD CONSTRAINT "chk_leccion_publicada"
  CHECK (NOT publicado OR publicado_en IS NOT NULL);

ALTER TABLE "seccion"
  ADD CONSTRAINT "chk_seccion_titulo"
  CHECK (length(titulo) BETWEEN 1 AND 150),
  ADD CONSTRAINT "chk_seccion_orden"
  CHECK (orden > 0);

ALTER TABLE "imagen"
  ADD CONSTRAINT "chk_imagen_texto_alternativo"
  CHECK (length(texto_alternativo) BETWEEN 1 AND 300);

ALTER TABLE "fundamento"
  ADD CONSTRAINT "chk_fundamento_tipo"
  CHECK (tipo IN ('ley', 'norma', 'principio', 'codigo'));

ALTER TABLE "cuestionario"
  ADD CONSTRAINT "chk_cuestionario_padre"
  CHECK ((leccion_id IS NOT NULL AND curso_id IS NULL) OR (leccion_id IS NULL AND curso_id IS NOT NULL)),
  ADD CONSTRAINT "chk_cuestionario_examen"
  CHECK ((tipo = 'examen') = (curso_id IS NOT NULL)),
  ADD CONSTRAINT "chk_cuestionario_orden"
  CHECK ((orden IS NOT NULL) = (leccion_id IS NOT NULL)),
  ADD CONSTRAINT "chk_cuestionario_tipo"
  CHECK (tipo IN ('actividad', 'caso', 'examen')),
  ADD CONSTRAINT "chk_cuestionario_titulo"
  CHECK (length(titulo) BETWEEN 1 AND 150),
  ADD CONSTRAINT "chk_cuestionario_calificacion"
  CHECK (calificacion_minima BETWEEN 0 AND 100),
  ADD CONSTRAINT "chk_cuestionario_espera"
  CHECK (minutos_espera >= 0);

ALTER TABLE "pregunta"
  ADD CONSTRAINT "chk_pregunta_tipo"
  CHECK (tipo IN ('opcion_multiple', 'verdadero_falso', 'relacion', 'decision')),
  ADD CONSTRAINT "chk_pregunta_orden"
  CHECK (orden > 0);

ALTER TABLE "opcion"
  ADD CONSTRAINT "chk_opcion_valor"
  CHECK (valor BETWEEN 0 AND 1),
  ADD CONSTRAINT "chk_opcion_orden"
  CHECK (orden > 0);

ALTER TABLE "pareja"
  ADD CONSTRAINT "chk_pareja_orden"
  CHECK (orden > 0);

ALTER TABLE "intento"
  ADD CONSTRAINT "chk_intento_numero"
  CHECK (numero > 0),
  ADD CONSTRAINT "chk_intento_estado"
  CHECK (estado IN ('en_curso', 'enviado')),
  ADD CONSTRAINT "chk_intento_calificacion"
  CHECK (calificacion IS NULL OR calificacion BETWEEN 0 AND 100),
  ADD CONSTRAINT "chk_intento_envio"
  CHECK ((estado = 'enviado') = (enviado_en IS NOT NULL AND calificacion IS NOT NULL));

ALTER TABLE "respuesta_opcion"
  ADD CONSTRAINT "chk_respuesta_opcion_puntaje"
  CHECK (puntaje IS NULL OR puntaje BETWEEN 0 AND 1);

ALTER TABLE "progreso_leccion"
  ADD CONSTRAINT "chk_progreso_ultima_seccion"
  CHECK (ultima_seccion > 0),
  ADD CONSTRAINT "chk_progreso_terminada"
  CHECK (terminada_en IS NULL OR terminada_en >= abierta_en);

ALTER TABLE "insignia"
  ADD CONSTRAINT "chk_insignia_nombre"
  CHECK (length(nombre) BETWEEN 1 AND 100);

-- Índices de operación y reglas de unicidad condicional
CREATE UNIQUE INDEX "ux_cuestionario_actividad"
  ON "cuestionario" ("leccion_id") WHERE tipo = 'actividad';
CREATE UNIQUE INDEX "ux_cuestionario_examen"
  ON "cuestionario" ("curso_id") WHERE tipo = 'examen';
CREATE UNIQUE INDEX "ux_cuestionario_leccion_orden"
  ON "cuestionario" ("leccion_id", "orden") WHERE leccion_id IS NOT NULL;
CREATE UNIQUE INDEX "ux_pregunta_cuestionario_orden"
  ON "pregunta" ("cuestionario_id", "orden") WHERE activa = true;
CREATE UNIQUE INDEX "ux_opcion_pregunta_orden"
  ON "opcion" ("pregunta_id", "orden") WHERE activa = true;
CREATE UNIQUE INDEX "ux_intento_en_curso"
  ON "intento" ("usuario_id", "cuestionario_id") WHERE estado = 'en_curso';
CREATE UNIQUE INDEX "ux_intento_aprobado"
  ON "intento" ("usuario_id", "cuestionario_id") WHERE aprobado = true;
CREATE INDEX "ix_sesion_usuario_activa"
  ON "sesion" ("usuario_id") WHERE revocada_en IS NULL;
CREATE INDEX "ix_intento_usuario_cuestionario"
  ON "intento" ("usuario_id", "cuestionario_id", "enviado_en" DESC);
CREATE INDEX "ix_intento_usuario_enviado"
  ON "intento" ("usuario_id", "enviado_en" DESC) WHERE estado = 'enviado';

-- Búsqueda sin distinguir tildes
CREATE FUNCTION "f_unaccent"(texto TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
PARALLEL SAFE
AS $funcion$
  SELECT public.unaccent('public.unaccent', texto);
$funcion$;

CREATE INDEX "ix_modulo_busqueda"
  ON "modulo" USING GIN (to_tsvector('spanish', f_unaccent(titulo || ' ' || descripcion)));
CREATE INDEX "ix_curso_busqueda"
  ON "curso" USING GIN (to_tsvector('spanish', f_unaccent(titulo || ' ' || descripcion)));
CREATE INDEX "ix_leccion_busqueda"
  ON "leccion" USING GIN (to_tsvector('spanish', f_unaccent(titulo || ' ' || coalesce(resumen, ''))));
