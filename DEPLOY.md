# Развёртывание WaterFix

Приложение собирается в **один Docker-образ**: React-сборка кладётся в `wwwroot` ASP.NET Core, рядом работают PostgreSQL и Caddy. Один домен — `water-fix.ru` — отдаёт и сайт, и API, и админку.

```
Интернет → Caddy (443, TLS) → app (ASP.NET + React) → PostgreSQL
                                    ↓
                        volume: фото водоматов и медиа заявок
```

Ничего внешнего не нужно: ни Vercel, ни Render, ни Neon.

---

## Требования к размещению

В заявках есть телефон/почта/соцсеть и фото-видео — это персональные данные граждан РФ. По 152-ФЗ основная база должна физически находиться в России. Поэтому сервер (вместе с PostgreSQL и папкой медиа) размещается в российском дата-центре.

Дополнительно нужно:

- уведомление в Роскомнадзор о том, что вы оператор персональных данных (подаётся бесплатно через сайт РКН);
- опубликованная политика конфиденциальности — она уже есть в приложении.

---

## Вариант 1. VPS в reg.ru

Домен `water-fix.ru` уже там, DNS-панель тоже — меньше всего движений.

### 1. Заказать VPS

reg.ru → **Облачные серверы** → VPS. ОС — **Ubuntu 24.04**.

Ориентиры по цене (ноябрь 2026, тариф + публичный IPv4):

| Тариф | Конфигурация | Примерно в месяц |
|---|---|---|
| Std C1-M1-D10 | 1 vCPU · 1 ГБ RAM · 10 ГБ SSD | ~680 ₽ |
| **Std C2-M2-D40** | **2 vCPU · 2 ГБ RAM · 40 ГБ SSD** | **~1390 ₽** |

Берите **2 ГБ**: сборка образа (`npm ci` + `dotnet publish`) на 1 ГБ упирается в память. Если всё же берёте 1 ГБ — скрипт ниже создаст 2 ГБ swap, но сборка будет медленной.

После создания сервера запишите **IP-адрес** и root-пароль (или добавьте SSH-ключ).

### 2. Настроить DNS в reg.ru

Домен делегирован на `ns1.reg.ru` / `ns2.reg.ru`, поэтому записи меняются в панели reg.ru → **Домены → water-fix.ru → DNS-серверы и зона**.

Удалите записи, которые ведут на Vercel:

- `A @ → 216.198.79.1`
- `CNAME www → 9d5cd9f3fd51d2f2.vercel-dns-017.com`

Добавьте вместо них (TTL 300):

- `A @ → <IP вашего VPS>`
- `A www → <IP вашего VPS>`

Проверить, что DNS обновился:

```bash
nslookup water-fix.ru
nslookup www.water-fix.ru
```

Оба адреса должны показывать IP сервера. Caddy выпустит сертификат Let's Encrypt только после этого, поэтому DNS стоит поправить первым делом.

### 3. Настроить сервер

Подключитесь и запустите скрипт из репозитория:

```bash
ssh root@<IP>
apt-get update && apt-get install -y git
git clone --branch qr-rebuild https://github.com/CJloHuk01/dip.git /opt/waterfix
bash /opt/waterfix/deploy/bootstrap.sh
```

`deploy/bootstrap.sh`:

- ставит Docker и `docker compose`;
- создаёт swap, если RAM меньше 2 ГБ;
- открывает порты 22/80/443 в `ufw`;
- клонирует/обновляет код в `/opt/waterfix`;
- создаёт `.env` со случайными `POSTGRES_PASSWORD` и `JWT_SECRET`.

Если репозиторий станет приватным — клонируйте по SSH или через токен.

### 4. Заполнить `.env`

```bash
nano /opt/waterfix/.env
```

Обязательно проверить:

```env
SITE_DOMAIN=water-fix.ru
SITE_URL=https://water-fix.ru
ADMIN_EMAIL=admin@water-fix.ru
ADMIN_PASSWORD=<длинный пароль>
```

`POSTGRES_PASSWORD` и `JWT_SECRET` уже сгенерированы скриптом.

Админ создаётся **только при первом запуске**, когда таблица `Admins` пуста. Если поменять `ADMIN_EMAIL` позже, старый админ останется, новый не появится.

### 5. Запустить

```bash
cd /opt/waterfix
docker compose up -d --build
docker compose logs -f app
```

Первая сборка занимает 5–15 минут. Когда в логах появится `Now listening on: http://+:8080`, а Caddy получит сертификат, откройте:

- `https://water-fix.ru` — публичная страница;
- `https://water-fix.ru/admin/login` — вход в админку.

### 6. Проверить

```bash
docker compose ps                  # все сервисы running
curl -I https://water-fix.ru       # 200
```

Дальше в админке: добавить водоматы на карте, скачать QR-коды, распечатать.

### 7. Обновления

```bash
cd /opt/waterfix
git pull
docker compose up -d --build
```

Миграции применяются автоматически при старте контейнера.

---

## Почта и уведомления

Письма о новых заявках уходят на `ADMIN_EMAIL`. Если SMTP не настроен, заявки всё равно создаются — просто без писем (в логах будет предупреждение).

### Яндекс 360 для домена (рекомендуется)

Даёт ящик вида `admin@water-fix.ru` — адрес совпадает с доменом сайта.

1. Подключить домен `water-fix.ru` в Яндекс 360 и подтвердить владение (TXT-запись в reg.ru).
2. Создать ящик, например `admin@water-fix.ru`.
3. В Яндекс ID включить **пароли приложений** и создать пароль для «Почты».
4. В `.env`:

```env
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_USER=admin@water-fix.ru
SMTP_PASSWORD=<пароль приложения>
```

Не забыть добавить `MX`-записи Яндекса в reg.ru — иначе почта на домен приходить не будет.

### Gmail

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASSWORD=<пароль приложения Google>
```

Нужен именно «пароль приложения», обычный пароль от аккаунта не подойдёт.

Проверить отправку:

```bash
docker compose logs -f app | grep -i -E "email|smtp"
```

---

## Бэкапы

```bash
/opt/waterfix/deploy/backup.sh
```

Скрипт делает `pg_dump`, архивы `App_Data` (медиа заявок) и `wwwroot/uploads` (фото водоматов) в `/var/backups/waterfix` и удаляет копии старше 14 дней.

По расписанию:

```bash
crontab -e
# 17 3 * * * /opt/waterfix/deploy/backup.sh >> /var/log/waterfix-backup.log 2>&1
```

Копии желательно периодически скачивать с сервера — бэкап на том же диске не спасает от потери сервера.

Восстановление базы:

```bash
docker compose exec -T db pg_restore -U waterfix -d waterfix --clean --if-exists < /var/backups/waterfix/db-<дата>.dump
```

---

## Вариант 2. Amvera (PaaS, без администрирования сервера)

Если не хочется возиться с VPS:

1. Создать проект типа **Docker**, подключить GitHub-репозиторий.
2. Указать `Dockerfile` в корне и порт **8080**.
3. Добавить managed PostgreSQL, скопировать строку подключения.
4. Задать переменные окружения (см. таблицу ниже), без `SITE_DOMAIN` и `POSTGRES_*`.
5. Привязать домен, включить SSL.

Caddy в этом случае не нужен — TLS и проксирование берёт платформа.

---

## Переменные окружения

| Переменная | Обязательна | Описание |
|---|---|---|
| `SITE_DOMAIN` | да | Домен без `https://`, для Caddy и сертификата |
| `SITE_URL` | да | Публичный адрес, подставляется в письма |
| `POSTGRES_DB` | да | Имя базы |
| `POSTGRES_USER` | да | Пользователь БД |
| `POSTGRES_PASSWORD` | да | Пароль БД, только латиница и цифры |
| `JWT_SECRET` | да | Минимум 32 символа, `openssl rand -base64 48` |
| `ADMIN_EMAIL` | да | Логин админки |
| `ADMIN_PASSWORD` | да | Пароль админки |
| `SMTP_HOST` / `SMTP_PORT` | нет | Например `smtp.yandex.ru:465` |
| `SMTP_USER` | нет | Адрес отправителя |
| `SMTP_PASSWORD` | нет | Пароль приложения |
| `VITE_YANDEX_MAPS_KEY` | нет | Ключ карт для выбора точки водомата |

Пароль БД не должен содержать `;`, кавычки и пробелы — он подставляется в строку подключения.

---

## Локальная разработка

1. `WaterFix.API/appsettings.Development.json` содержит локальные настройки (БД, JWT, SMTP). Файл в `.gitignore`.
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

Vite проксирует `/api` и `/uploads` на `http://localhost:5000`, поэтому `waterfix/.env` не нужен — `VITE_API_URL` должен быть пустым.

Локальная база в Docker:

```bash
docker run -d --name waterfix-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=waterfix -p 5432:5432 postgres:16-alpine
```

и в `appsettings.Development.json`:

```
Host=localhost;Port=5432;Database=waterfix;Username=postgres;Password=postgres
```

Схема создаётся одной миграцией `InitialCreate` — старая база из прежней версии не подойдёт, нужна чистая.

---

## Безопасность — сделать до публикации

Репозиторий **публичный**, и в его истории остались:

- пароль от Neon;
- app password от Gmail;
- старый JWT-секрет;
- фотографии пользователей из прежней версии.

После переезда на свой сервер:

1. Сменить пароль Neon (или удалить проект) — он больше не нужен.
2. Отозвать старый app password Gmail.
3. Сменить `JWT_SECRET` — все админские сессии разлогинятся.
4. Сделать репозиторий приватным **или** вычистить историю (`git filter-repo` / BFG) и force-push.
5. Проверить, что `.env` и `appsettings.Development.json` не попадают в коммиты.

---

## Чек-лист после переезда

- [ ] `https://water-fix.ru` открывается без предупреждений сертификата
- [ ] `www.water-fix.ru` перенаправляет на основной домен
- [ ] `/admin/login` пускает с `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- [ ] Водоматы добавлены через карту, QR-коды скачиваются
- [ ] Заявка с телефона по QR-ссылке создаётся, фото и видео прикрепляются
- [ ] Медиа заявки видно в админке, без входа `/api/admin/media/...` отдаёт 401
- [ ] Письмо о новой заявке приходит на `ADMIN_EMAIL`
- [ ] `docker compose ps` — все сервисы `running`
- [ ] Бэкап по cron создаётся
- [ ] Уведомление в Роскомнадзор подано
- [ ] Секреты сменены, репозиторий закрыт
