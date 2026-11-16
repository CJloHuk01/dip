#!/usr/bin/env bash
# Первичная настройка VPS под WaterFix (Ubuntu 22.04/24.04, Debian 12).
#
# Запуск от root:
#   REPO=https://github.com/CJloHuk01/dip.git bash deploy/bootstrap.sh
#   REPO=... BRANCH=qr-rebuild bash deploy/bootstrap.sh   # если нужна конкретная ветка
#
# Скрипт ставит Docker, создаёт swap (если мало RAM), включает файрвол,
# клонирует репозиторий в /opt/waterfix и готовит .env со случайными паролями.
set -euo pipefail

REPO="${REPO:-https://github.com/CJloHuk01/dip.git}"
# Пусто = взять ветку по умолчанию у репозитория (или текущую, если код уже склонирован).
BRANCH="${BRANCH:-}"
APP_DIR="${APP_DIR:-/opt/waterfix}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Запустите от root: sudo bash deploy/bootstrap.sh" >&2
  exit 1
fi

echo "==> Пакеты"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-install-recommends ca-certificates curl git ufw openssl

echo "==> Swap"
mem_mb=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
if [ "$mem_mb" -lt 2000 ] && [ ! -f /swapfile ]; then
  if ! fallocate -l 2G /swapfile 2>/dev/null; then
    dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  fi
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "    swap 2G создан (RAM: ${mem_mb} МБ)"
fi

echo "==> Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

echo "==> Файрвол"
ufw allow 22/tcp >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null

echo "==> Код"
if [ ! -d "$APP_DIR/.git" ]; then
  if [ -n "$BRANCH" ]; then
    git clone --branch "$BRANCH" "$REPO" "$APP_DIR"
  else
    git clone "$REPO" "$APP_DIR"
  fi
elif [ -n "$BRANCH" ]; then
  git -C "$APP_DIR" fetch origin "$BRANCH"
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" pull --ff-only origin "$BRANCH"
else
  git -C "$APP_DIR" pull --ff-only
fi
cd "$APP_DIR"

echo "==> .env"
if [ ! -f .env ]; then
  cp .env.example .env
  pg_pass=$(openssl rand -hex 24)
  jwt=$(openssl rand -base64 48 | tr -d '\n')
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${pg_pass}|" .env
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${jwt}|" .env
  echo "    создан $APP_DIR/.env со случайными паролями"
else
  echo "    .env уже существует — не трогаю"
fi

cat <<EOF

Готово. Осталось:

1. Проверить $APP_DIR/.env
     nano $APP_DIR/.env
   Нужно задать: SITE_DOMAIN, SITE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, SMTP_*.

2. Запустить
     cd $APP_DIR && docker compose up -d --build

3. Проверить
     docker compose ps
     curl -I https://water-fix.ru

Бэкапы — добавить в cron (crontab -e):
  17 3 * * * $APP_DIR/deploy/backup.sh >> /var/log/waterfix-backup.log 2>&1
EOF
