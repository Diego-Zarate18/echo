-- auditoria_bd.motivo sin valor por defecto.
-- Prisma no logra comparar la expresión NULLIF(current_setting('echo.motivo', true), '') con el esquema y la marca
-- como diferencia en cada migrate diff. El valor por defecto no hace falta: las tres funciones que escriben en
-- auditoria_bd (fn_auditar_cambio, fn_auditar_ddl y fn_registrar_accion_manual) ponen el motivo de forma explícita,
-- leyendo echo.motivo y guardando nulo si está vacío, y ningún rol puede insertar en la tabla directamente.
ALTER TABLE "auditoria_bd" ALTER COLUMN "motivo" DROP DEFAULT;
