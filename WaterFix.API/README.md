# WaterFix API

Сервис приёма заявок о неисправностях водоматов. Пользователь сканирует QR-код на аппарате, заполняет форму и оставляет удобный контакт. Регистрации и профилей нет.

Стек: ASP.NET Core 8 + PostgreSQL + EF Core, JWT в HttpOnly cookie для админа.

> Развёртывание всего проекта одним контейнером — см. [`../DEPLOY.md`](../DEPLOY.md).

## Быстрый старт

Требования: .NET 8 SDK, PostgreSQL.

```bash
cd WaterFix.API
dotnet restore
dotnet run
```

API поднимется на `http://localhost:5000`.

### Настройка

`appsettings.json` содержит пустые секреты. Для локальной разработки создайте `appsettings.Development.json` (он в `.gitignore`):

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=waterfix;Username=postgres;Password=yourpassword"
  },
  "JwtSettings": { "Secret": "ключ-минимум-32-символа" },
  "Admin": { "Email": "admin@example.com", "Password": "длинный-пароль" },
  "EmailSettings": {
    "SenderEmail": "you@gmail.com",
    "Password": "app-password"
  }
}
```

В Development, если админ не задан, создаётся тестовый: `payturkey123231@gmail.com` / `WaterFix-2026!`. В Production админ создаётся только из `Admin__Email` и `Admin__Password`. Позже можно завести ящик `admin@water-fix.ru` и указать его в `ADMIN_EMAIL`.

Миграции применяются автоматически при старте. Демо-водоматы добавляются только в Development и только если таблица пустая.

### Переменные окружения для production

`ConnectionStrings__DefaultConnection`, `JwtSettings__Secret`, `Admin__Email`, `Admin__Password`, `EmailSettings__SenderEmail`, `EmailSettings__Password`.

## Публичный API

```
GET  /api/public/machines/{code}   — водомат по коду из QR
POST /api/public/complaints        — создать заявку (multipart/form-data)
```

Поля заявки: `MachineCode`, `Type` (`money|water|change|screen|other`), `TypeLabel`, `Comment`, `ContactType` (`phone|email|telegram|vk|max|other`), `ContactValue`, `ReporterName`, `PrivacyAccepted`, `PrivacyVersion`, скрытое поле-ловушка `Website`.

Файлы: `photos` — до 5 изображений по 10 МБ, `video` — один файл до 50 МБ (`mp4/webm/mov`). Общий лимит запроса — 120 МБ.

Ограничения: 5 заявок в час с одного IP, 60 чтений в минуту.

## Админский API

Вход: `POST /api/admin/auth/login` с `{ email, password }`. Ответ ставит HttpOnly cookie `admin_session` на 12 часов.

```
POST   /api/admin/auth/logout
GET    /api/admin/auth/me

GET    /api/admin/complaints?status=&page=&limit=
GET    /api/admin/complaints/{id}
PUT    /api/admin/complaints/{id}
DELETE /api/admin/complaints/{id}

GET    /api/admin/media/{id}          — фото/видео заявки (range requests)

GET    /api/admin/machines
POST   /api/admin/machines
PUT    /api/admin/machines/{id}
DELETE /api/admin/machines/{id}
POST   /api/admin/machines/{id}/photo
POST   /api/admin/machines/{id}/code/regenerate

GET    /api/admin/stats
```

Статусы заявки: `new`, `inProgress`, `resolved`, `rejected`. Статус водомата пересчитывается автоматически: есть новая заявка — `problem`, есть в работе — `maintenance`, иначе `working`.

## Хранение файлов

- фото водоматов: `wwwroot/uploads/machines` (публично);
- фото и видео заявок: `App_Data/complaints/{complaintId}` (только через админский endpoint).

В Docker папки вынесены в volume, чтобы файлы не терялись при передеплое.

## Формат ответов

```json
{ "success": true, "data": { } }
{ "success": false, "error": "Текст ошибки" }
```
