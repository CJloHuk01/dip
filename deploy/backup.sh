#!/usr/bin/env bash
# Бэкап базы и файлов WaterFix.
#
#   deploy/backup.sh
#   BACKUP_DIR=/mnt/backup KEEP_DAYS=30 deploy/backup.sh
#
# Кладёт дампы в BACKUP_DIR и удаляет копии старше KEEP_DAYS дней.
# Для запуска по расписанию добавьте в cron:
#   17 3 * * * /opt/waterfix/deploy/backup.sh >> /var/log/waterfix-backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."

BACKUP_DIR="${BACKUP_DIR:-/var/backups/waterfix}"
KEEP_DAYS="${KEEP_DAYS:-14}"

# Читаем только нужные ключи: обычный `source .env` ломается на паролях с пробелами.
read_env() {
  [ -f .env ] || return 0
  grep -E "^$1=" .env | tail -n1 | cut -d= -f2- | tr -d '\r' | sed -e 's/^"//' -e 's/"$//'
}

DB_NAME="$(read_env POSTGRES_DB)"
DB_USER="$(read_env POSTGRES_USER)"
DB_NAME="${DB_NAME:-waterfix}"
DB_USER="${DB_USER:-waterfix}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%F-%H%M)"

echo "==> База $DB_NAME"
docker compose exec -T db pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc \
  > "$BACKUP_DIR/db-$STAMP.dump"

echo "==> Медиа заявок"
docker compose exec -T app tar czf - -C /app/App_Data . \
  > "$BACKUP_DIR/media-$STAMP.tar.gz"

echo "==> Фото водоматов"
docker compose exec -T app tar czf - -C /app/wwwroot/uploads . \
  > "$BACKUP_DIR/uploads-$STAMP.tar.gz"

find "$BACKUP_DIR" -type f -mtime "+$KEEP_DAYS" -delete

echo "Готово: $BACKUP_DIR (копии старше $KEEP_DAYS дней удалены)"
ls -lh "$BACKUP_DIR" | tail -n 5
