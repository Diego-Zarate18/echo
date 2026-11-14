#!/usr/bin/env bash
# Respaldo manual cifrado de la base (OP-37, DEC-69). Lo hace la persona designada antes de cada migración y de cada
# carga de contenido en producción, y una vez por semana.
#
#   bash prisma/sql/respaldo.sh /ruta/a/la/carpeta/de/respaldos
#
# Hace pg_dump 18 (formato custom) con DATABASE_URL_MIGRACION y lo cifra al vuelo con gpg (AES-256, con una
# contraseña que gpg pide en pantalla): el volcado sin cifrar nunca toca el disco. gpg viene con Git para Windows.
# La carpeta debe estar fuera del repositorio (INV-24). Se conservan los 7 respaldos más recientes.
# Al terminar, registra el respaldo en la auditoría con fn_registrar_accion_manual como echo_admin (DEC-97).
set -euo pipefail
cd "$(dirname "$0")/../.."

destino="${1:-}"
if [ -z "$destino" ]; then
  echo "Uso: bash prisma/sql/respaldo.sh /ruta/a/la/carpeta/de/respaldos (fuera del repositorio)" >&2
  exit 1
fi
mkdir -p "$destino"
destino="$(cd "$destino" && pwd -P)"
repositorio="$(git rev-parse --show-toplevel 2>/dev/null || pwd -P)"
repositorio="$(cd "$repositorio" && pwd -P)"
case "$destino/" in
  "$repositorio"/*)
    echo "La carpeta de respaldos está dentro del repositorio ($repositorio). Elige otra (INV-24)." >&2
    exit 1
    ;;
esac

# La URL se lee del .env sin cargar el resto de variables al entorno.
url="${DATABASE_URL_MIGRACION:-$(grep -E '^DATABASE_URL_MIGRACION=' .env 2>/dev/null | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//')}"
if [ -z "$url" ]; then
  echo "Falta DATABASE_URL_MIGRACION en el .env" >&2
  exit 1
fi

version="$(pg_dump --version | grep -oE '[0-9]+' | head -1)"
if [ "$version" != "18" ] && [ "${RESPALDO_PERMITIR_OTRA_VERSION:-}" != "si" ]; then
  echo "Se necesita pg_dump 18 (este es el $version). Revisa que el PATH apunte a PostgreSQL 18 (DEC-69)." >&2
  exit 1
fi
command -v gpg > /dev/null || { echo "No se encontró gpg (viene con Git para Windows)." >&2; exit 1; }

archivo="$destino/echo-$(date -u +%Y%m%dT%H%M%SZ).dump.gpg"
echo "Respaldando en $archivo"
echo "gpg te pedirá dos veces la contraseña del respaldo: guárdala en el gestor de contraseñas del equipo."
pg_dump --dbname="$url" --format=custom --no-owner --no-privileges \
  | gpg --symmetric --cipher-algo AES256 --s2k-digest-algo SHA512 --s2k-count 65011712 --output "$archivo"

# Prueba rápida: el archivo se descifra y pg_restore lee su índice (no restaura nada).
echo "Comprobando el respaldo (gpg vuelve a pedir la contraseña)…"
objetos="$(gpg --quiet --decrypt "$archivo" | pg_restore --list | grep -vc '^;' || true)"
if [ "${objetos:-0}" -lt 1 ]; then
  echo "El respaldo no se pudo leer. Bórralo y vuelve a intentarlo." >&2
  exit 1
fi
echo "Respaldo legible: $objetos objetos."

# Conserva los 7 más recientes (DEC-69, regla 4).
ls -1t "$destino"/echo-*.dump.gpg 2>/dev/null | tail -n +8 | while read -r viejo; do
  echo "Borrando el respaldo antiguo $(basename "$viejo")"
  rm -f -- "$viejo"
done

cat <<FIN

Listo. Falta registrarlo en la auditoría (DEC-97). Entra como echo_admin y ejecuta:

  SELECT fn_registrar_accion_manual('RESPALDO', 'pg_dump $(basename "$archivo")');

FIN
