-- Disparadores de eventos de la auditoría (TRG-AUDITORIA-DDL, DEC-97).
-- PostgreSQL solo deja crear disparadores de eventos a un superusuario, por eso no van en una migración.
-- Se ejecuta con el superusuario una vez por entorno, DESPUÉS de aplicar las migraciones (necesita fn_auditar_ddl),
-- y otra vez cada que se recrea la base local (prisma/sql/reiniciar_local.sh lo hace solo). Se puede repetir.
--
--   psql -U postgres -d echo -v ON_ERROR_STOP=1 -f prisma/sql/auditoria_ddl.sql
--
-- Son dos porque un disparador de eventos atiende un solo evento: ddl_command_end (CREATE, ALTER, COMMENT…) y
-- sql_drop (DROP). Solo un superusuario puede desactivarlos o borrarlos.

DROP EVENT TRIGGER IF EXISTS evt_auditoria_ddl;
DROP EVENT TRIGGER IF EXISTS evt_auditoria_ddl_borrado;

CREATE EVENT TRIGGER evt_auditoria_ddl
  ON ddl_command_end
  EXECUTE FUNCTION public.fn_auditar_ddl();

CREATE EVENT TRIGGER evt_auditoria_ddl_borrado
  ON sql_drop
  EXECUTE FUNCTION public.fn_auditar_ddl();

-- Este propio cambio queda registrado como acción manual (los disparadores de eventos no se auditan a sí mismos).
SELECT public.fn_registrar_accion_manual('INSTALAR DISPARADORES DE EVENTOS', 'auditoria_ddl.sql');
