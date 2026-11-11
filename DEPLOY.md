# Развёртывание WaterFix на одном хостинге

Сейчас проект разложен на три сервиса:

- **Vercel** — фронтенд (`waterfix/`);
- **Render** — ASP.NET Core API (`WaterFix.API/`);
- **Neon** — PostgreSQL.

Из-за этого данные не грузятся без VPN, а бесплатный PostgreSQL на Render живёт всего 30 дней. Ниже — как собрать всё в **один контейнер**: фронтенд и API раздаются с одного домена, база и фото лежат рядом, TLS настраивается автоматически.

---

## Что уже подготовлено в проекте

| Файл | Назначение |
|---|---|
| `Dockerfile` | Многоступенчатая сборка: React → `wwwroot`, затем .NET 8 |
| `docker-compose.yml` | Приложение + PostgreSQL 16 + Caddy (HTTPS) |
| `Caddyfile` | Автоматический TLS и reverse proxy |
| `.env.example` | Шаблон переменных окружения |
| `waterfix/src/api/config.ts` | Если `VITE_API_URL` пуст — запросы идут на `/api` этого же домена |
| `WaterFix.API/Program.cs` | Раздача SPA и fallback на `index.html` |

Фронтенд больше не требует отдельного адреса API: по умолчанию он обращается к тому же домену, где открыт сайт.

---

## Вариант 1. Российский VPS + Docker Compose (рекомендую)

Один сервер, один домен, всё под контролем. Подойдёт Timeweb Cloud, reg.ru, Aeza и любой другой VPS с Ubuntu.

**Минимальные характеристики:** 1–2 ГБ RAM, 10–20 ГБ SSD, Ubuntu 24.04.

### 1. Купить VPS и настроить DNS

В панели reg.ru домен `water-fix.ru` сейчас, скорее всего, делегирован на nameservers Vercel. Проверить:

```bash
nslookup -type=NS water-fix.ru
```

Два варианта:

1. **Оставить DNS в Vercel** — в Vercel → Domains добавить/изменить записи:
   - `A @ → <IP VPS>`
   - `A www → <IP VPS>`
2. **Вернуть NS на reg.ru** — в панели reg.ru сменить nameservers на `ns1.reg.ru` / `ns2.reg.ru`, затем создать те же A-записи в DNS-панели reg.ru.

После переезда домен из проекта Vercel можно удалить.

### 2. Установить Docker

```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
```

### 3. Загрузить проект

```bash
git clone https://github.com/CJloHuk01/dip.git /opt/waterfix
cd /opt/waterfix
```

Если репозиторий станет приватным — используйте SSH-ключ или GitHub token.

### 4. Создать `.env`

```bash
cp .env.example .env
nano .env
```

Обязательно заполнить:

```env
SITE_DOMAIN=water-fix.ru
POSTGRES_DB=waterfix
POSTGRES_USER=waterfix
POSTGRES_PASSWORD=<длинный пароль>
JWT_SECRET=<openssl rand -base64 48>
```

Сгенерировать пароли:

```bash
openssl rand -hex 24      # пароль БД (без ; и кавычек)
openssl rand -base64 48   # JWT_SECRET
```

Пароль БД лучше делать из латиницы и цифр: он подставляется в строку подключения, и символы `;` или кавычки её сломают.

Почту можно оставить пустой — тогда заявки будут создаваться, но письмо админу не отправится (в логах появится предупреждение). На VPS и Amvera Gmail SMTP работает, на Render Free — нет: там исходящие порты 25/465/587 заблокированы.

### 5. Запустить

```bash
docker compose up -d --build
docker compose logs -f app
```

Caddy сам получит сертификат Let's Encrypt, когда DNS уже указывает на сервер и открыты порты 80/443.

Проверка:

```bash
docker compose ps
curl -I https://water-fix.ru
```

### 6. Файрвол

```bash
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
```

### 7. Обновления

```bash
cd /opt/waterfix
git pull
docker compose up -d --build
```

---

## Вариант 2. Amvera (российский PaaS)

Плюс: не нужно администрировать сервер. Минус: платно, дешевле VPS только на минимальных тарифах.

- Приложение: от **170 ₽/мес** (0.1 ГБ RAM) или **290 ₽/мес** (0.5 ГБ RAM).
- Managed PostgreSQL: от **170 ₽/мес**.
- Есть пробный баланс, домен и бесплатный SSL.

Порядок:

1. Создать проект типа **Docker**.
2. Подключить GitHub-репозиторий `CJloHuk01/dip`.
3. Указать, что `Dockerfile` лежит в корне, порт — **8080**.
4. Добавить managed PostgreSQL и скопировать строку подключения.
5. Прописать переменные окружения:

```env
ConnectionStrings__DefaultConnection=Host=...;Port=5432;Database=...;Username=...;Password=...
JwtSettings__Secret=<длинный секрет>
JwtSettings__Issuer=WaterFix
JwtSettings__Audience=WaterFix
EmailSettings__SenderEmail=<gmail>
EmailSettings__Password=<app password>
```

6. Привязать домен и включить SSL.

Caddy в этом варианте не нужен: TLS и проксирование берёт на себя платформа.

> Точный формат `amvera.yaml` зависит от текущей версии платформы — сверьтесь с их документацией. Для сборки достаточно корневого `Dockerfile`.

---

## Вариант 3. Остаться на Render, но платно

Можно, но невыгодно:

- бесплатная БД удаляется через 30 дней;
- бесплатный web-сервис засыпает и не имеет постоянного диска;
- бесплатный тариф блокирует исходящую почту (порты 25/465/587);
- PostgreSQL — от **$6/мес**, плюс persistent disk.

Если платить всё равно — дешевле взять VPS и держать там всё сразу.

---

## Почта и уведомления

Письма о новых заявках отправляются через SMTP (для Gmail нужен «пароль приложения», а не обычный пароль). На VPS и Amvera порты 587/465 открыты.

На **Render Free** исходящие SMTP-порты 25/465/587 заблокированы с 26.09.2025 — письма не уйдут даже с правильными данными. Варианты: платный инстанс Render или внешний сервис рассылки, который принимает письма по HTTPS API.

В коде уведомления ставятся в очередь и отправляются в фоне (до 3 попыток). Если SMTP не настроен, приложение продолжает работать, а в логах появляется предупреждение:

```bash
docker compose logs -f app | grep -i email
```

Для домена `water-fix.ru` позже лучше завести почтовый ящик у почтового провайдера (Яндекс 360, Mail.ru для бизнеса и т.п.) и использовать его SMTP вместо Gmail.

---

## Перенос базы из Neon

Neon доступен только через VPN — включите его перед командами.

### Дамп

```bash
pg_dump "postgresql://neondb_owner:<ПАРОЛЬ>@ep-soft-fire-asgub5h7-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require" \
  --no-owner --no-privileges -Fc -f waterfix.dump
```

### Восстановление на сервере

```bash
cd /opt/waterfix
docker compose cp waterfix.dump db:/tmp/waterfix.dump
docker compose exec db pg_restore \
  -U waterfix -d waterfix \
  --clean --if-exists --no-owner /tmp/waterfix.dump
```

Либо обычный SQL-дамп:

```bash
pg_dump ... > waterfix.sql
docker compose exec -T db psql -U waterfix -d waterfix < waterfix.sql
```

Если база нужна «с нуля», ничего восстанавливать не надо: при старте приложение само применит миграции и создаст тестовые данные (`DbSeeder`).

---

## Перенос загруженных фото

Сейчас фото лежат в `WaterFix.API/wwwroot/uploads/` и, к сожалению, **закоммичены в публичный репозиторий**. После переезда их нужно положить в volume:

```bash
cd /opt/waterfix
docker compose cp ./WaterFix.API/wwwroot/uploads/. app:/app/wwwroot/uploads/
docker compose exec app ls -la /app/wwwroot/uploads/avatars
```

Проверить, что аватары и фото заявок открываются на сайте.

---

## Переменные окружения

| Переменная | Обязательна | Описание |
|---|---|---|
| `SITE_DOMAIN` | да (для Caddy) | Домен без `https://` |
| `POSTGRES_DB` | да | Имя базы |
| `POSTGRES_USER` | да | Пользователь БД |
| `POSTGRES_PASSWORD` | да | Пароль БД |
| `JWT_SECRET` | да | Минимум 32 символа |
| `SMTP_HOST` / `SMTP_PORT` | нет | По умолчанию `smtp.gmail.com:587` |
| `SMTP_USER` | нет | Gmail-адрес отправителя |
| `SMTP_PASSWORD` | нет | App password Gmail |
| `VITE_API_URL` | нет | Оставьте пустым при одном домене |

Для отдельного фронтенда на Vercel `VITE_API_URL` должен указывать на API, например `https://api.water-fix.ru`.

---

## Локальная разработка

1. `WaterFix.API/appsettings.Development.json` уже содержит локальные настройки (Neon, JWT, SMTP). Файл в `.gitignore`.
2. Бэкенд:

```bash
dotnet run --project WaterFix.API
# http://localhost:5000
```

3. Фронтенд:

```bash
cd waterfix
npm install
npm run dev
# http://localhost:5173
```

Vite проксирует `/api` и `/uploads` на `http://localhost:5000`, поэтому `.env` больше не нужен.

Neon по-прежнему требует VPN. Для полностью локальной работы можно поднять PostgreSQL в Docker:

```bash
docker run -d --name waterfix-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=waterfix -p 5432:5432 postgres:16-alpine
```

и указать в `appsettings.Development.json`:

```
Host=localhost;Port=5432;Database=waterfix;Username=postgres;Password=postgres
```

---

## Безопасность — сделать до публикации

Репозиторий **публичный**, и в его истории уже находятся:

- пароль от Neon;
- app password от Gmail `payturkey123231@gmail.com`;
- JWT-секрет;
- фотографии пользователей (аватары и фото заявок).

Даже после очистки текущих файлов всё это остаётся в истории Git. Поэтому:

1. **Сменить пароль Neon** в консоли Neon.
2. **Отозвать app password Gmail** и создать новый.
3. **Сменить `JWT_SECRET`** — после этого все пользователи разлогинятся.
4. Сделать репозиторий приватным **или** вычистить историю (`git filter-repo` / BFG) и force-push.
5. Перестать отслеживать артефакты и загрузки:

```bash
git rm -r --cached WaterFix.API/bin WaterFix.API/obj WaterFix.API/wwwroot/uploads
git rm --cached waterfix/.env
git commit -m "Stop tracking build artifacts, uploads and local env"
git push
```

Файлы останутся на диске — удалится только отслеживание.

6. Проверить, что в новых коммитах нет `appsettings.Development.json` и `.env`.

### Бэкапы

```bash
docker compose exec -T db pg_dump -U waterfix waterfix -Fc > backup-$(date +%F).dump
```

Добавьте команду в cron, например раз в сутки, и храните копии вне сервера.

---

## Чек-лист после переезда

- [ ] Регистрация и вход работают
- [ ] Загрузка аватара и фото заявки
- [ ] Создание и редактирование заявки
- [ ] Админ-панель, статистика, чат
- [ ] Cookie-баннер и юридические страницы
- [ ] Письмо о новой заявке приходит на почту админа (при ошибке смотреть логи)
- [ ] HTTPS без предупреждений
- [ ] `docker compose ps` — все сервисы `running`
- [ ] Секреты сменены, репозиторий закрыт
