# Respaldos de la base de datos

Procedimiento del respaldo manual cifrado (OP-37, DEC-69) y de su restauración (DEC-95). Railway guarda además sus
propios respaldos automáticos durante 6 días; este respaldo no los sustituye.

## Reglas (DEC-69)

1. Se cifra al crearse, con `gpg` (AES-256) y una contraseña. El volcado sin cifrar nunca toca el disco.
2. Se guarda fuera del repositorio. Ningún `.dump`, `.backup`, `.7z` ni `.gpg` entra a Git (INV-24).
3. Solo sirve para restaurar producción: nunca se carga en desarrollo (INV-14).
4. Se conservan los 7 respaldos más recientes; el script borra los anteriores.
5. Lo hace una persona designada del equipo.
6. Se toma antes de cada migración, antes de cada carga de contenido y una vez por semana.
7. Se prueba restaurarlo al menos una vez en una base local vacía.
8. La versión de `pg_dump` debe ser la 18, la misma del servidor.

La contraseña del respaldo se guarda en el gestor de contraseñas del equipo. Sin ella, el respaldo no se puede abrir.

## Hacer un respaldo

Requisitos: PostgreSQL 18 en el `PATH` (`pg_dump --version` debe decir 18), `gpg` (viene con Git para Windows) y
`DATABASE_URL_MIGRACION` de producción en el `.env`. En `backend/`:

```bash
bash prisma/sql/respaldo.sh "/c/Users/tu-usuario/echo-respaldos"
```

El script:

1. Comprueba que la carpeta esté fuera del repositorio y que `pg_dump` sea el 18.
2. Hace `pg_dump --format=custom` como `echo_migracion` y lo cifra al vuelo: `echo-AAAAMMDDTHHMMSSZ.dump.gpg`.
   `gpg` pide la contraseña dos veces.
3. Lo descifra y lee su índice con `pg_restore --list`, para confirmar que se puede abrir (pide la contraseña otra vez).
4. Borra los respaldos que pasen de 7.
5. Muestra la línea con la que se registra en la auditoría (DEC-97). Hay que ejecutarla como `echo_admin`:

```sql
SELECT fn_registrar_accion_manual('RESPALDO', 'pg_dump echo-20261114T203702Z.dump.gpg');
```

## Restaurar

Restaurar reemplaza la base de producción por una copia anterior. Se pierden los cambios hechos después del
respaldo, y las cuentas que se eliminaron (anonimizaron) después volverían a tener sus datos personales. Por eso
se siguen estos pasos en orden, con el servicio detenido.

1. **Detén el servicio web** en Railway, para que nadie escriba durante la restauración.
2. **Guarda la lista de cuentas anonimizadas después del respaldo**, solo su UUID (DEC-95). Como `echo_admin`, en la
   base actual (cambia la fecha por la del nombre del archivo):

   ```sql
   \copy (SELECT id FROM usuario WHERE estado = 'anonimizado' AND anonimizado_en >= '2026-11-14T20:37:02Z') TO 'anonimizadas.csv' CSV
   ```

   Guarda `anonimizadas.csv` fuera del repositorio y bórralo al terminar.
3. **Restaura en una base vacía.** Crea la base vacía con el superusuario, como en `reiniciar_local.sh`, y luego:

   ```bash
   gpg --decrypt "/c/Users/tu-usuario/echo-respaldos/echo-20261114T203702Z.dump.gpg" \
     | pg_restore --dbname="$URL_DE_LA_BASE_VACIA" --no-owner --exit-on-error
   ```

   Después vuelve a instalar los disparadores de eventos de la auditoría (`prisma/sql/auditoria_ddl.sql`) y comprueba
   con `npm run prisma:estado` que las migraciones aplicadas coincidan.
4. **Vuelve a anonimizar las cuentas de la lista**, antes de abrir el servicio. `echo_admin` solo puede hacerlo
   actuando como dueño (DEC-97), así que cambia de rol de forma explícita. Para cada UUID:

   ```sql
   SET ROLE echo_propietario;
   SELECT fn_anonimizar_usuario('…uuid…');
   RESET ROLE;
   ```

   Sobre una cuenta que ya estaba anonimizada no hace nada, así que se puede repetir sin riesgo.
5. **Registra la restauración** y vuelve a abrir el servicio:

   ```sql
   SELECT fn_registrar_accion_manual('RESTAURACION', 'pg_restore echo-20261114T203702Z.dump.gpg');
   ```

## Probar la restauración (regla 7)

Una vez, y cada vez que cambie la versión de PostgreSQL: restaura el respaldo más reciente en una base local vacía
llamada distinto de `echo` (por ejemplo `echo_prueba_restauracion`). Comprueba que tenga las tablas y que los conteos
se vean razonables, y bórrala al terminar. Esa base contiene datos reales: no la uses para desarrollar (INV-14).
