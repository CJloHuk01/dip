# WaterFix API

REST API для мониторинга водоматов. C# ASP.NET Core 8 + PostgreSQL + JWT.

---

## 🚀 Быстрый старт

### 1. Требования
- .NET 8 SDK
- PostgreSQL (локально или Docker)

### 2. Клонировать и настроить

```bash
# Перейти в папку проекта
cd WaterFix.API

# Установить зависимости
dotnet restore
```

### 3. Настроить `appsettings.json`

Поменяй строку подключения к PostgreSQL:
```json
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Port=5432;Database=waterfix;Username=postgres;Password=yourpassword"
}
```

И секретный ключ JWT (минимум 32 символа):
```json
"JwtSettings": {
  "Secret": "твой-секретный-ключ-минимум-32-символа!"
}
```

### 4. Создать папку для загрузок

```bash
mkdir -p wwwroot/uploads
```

### 5. Применить миграции и запустить

```bash
# Создать миграцию (первый раз)
dotnet ef migrations add InitialCreate

# Запустить (миграции применяются автоматически + сид данных)
dotnet run
```

API запустится на `http://localhost:5000`

---

## 🧪 Тестовые данные (создаются автоматически)

| Роль  | Email             | Пароль  |
|-------|-------------------|---------|
| Admin | admin@waterfix.ru | admin123 |
| User  | sanya@mail.ru     | 123456  |

4 водомата в г.Оренбург уже добавлены.

---

## 📡 Эндпоинты

### Аутентификация
```
POST /api/auth/register   - регистрация
POST /api/auth/login      - вход → JWT токен
GET  /api/auth/me         - текущий пользователь [AUTH]
```

### Пользователи [AUTH]
```
GET  /api/users/profile       - профиль
PUT  /api/users/profile       - обновить профиль
POST /api/users/avatar        - загрузить аватар
GET  /api/users/complaints    - мои заявки
```

### Водоматы
```
GET    /api/machines                 - все водоматы
GET    /api/machines?status=working&lat=51.768&lng=55.097&radius=5000
GET    /api/machines/{id}            - один водомат
POST   /api/machines                 - создать [ADMIN]
PUT    /api/machines/{id}            - обновить [ADMIN]
DELETE /api/machines/{id}            - удалить [ADMIN]
POST   /api/machines/{id}/photo      - загрузить фото [ADMIN]
```

### Заявки
```
GET    /api/complaints          - все (admin) / свои (user) [AUTH]
GET    /api/complaints/{id}     - конкретная [AUTH]
POST   /api/complaints          - создать (можно без авторизации)
PUT    /api/complaints/{id}     - обновить статус [ADMIN]
DELETE /api/complaints/{id}     - удалить [ADMIN]
POST   /api/complaints/{id}/photo - загрузить фото
```

### Статистика [ADMIN]
```
GET /api/stats/overview     - общая статистика
GET /api/stats/complaints   - статистика по заявкам
GET /api/stats/machines     - топ проблемных водоматов
```

---

## 📋 Примеры запросов

### Авторизация
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@waterfix.ru","password":"admin123"}'
```

### Запрос с токеном
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <ваш_токен>"
```

### Создать заявку (без авторизации)
```bash
curl -X POST http://localhost:5000/api/complaints \
  -H "Content-Type: application/json" \
  -d '{
    "machineId": "<guid водомата>",
    "userName": "Иван",
    "userPhone": "+79001234567",
    "type": "water",
    "typeLabel": "Проблема с водой",
    "comment": "Вода мутная"
  }'
```

---

## 📁 Структура проекта

```
WaterFix.API/
├── Controllers/        # HTTP контроллеры
├── Models/             # EF Core сущности
├── DTOs/               # Request/Response DTO
├── Data/               # DbContext + Seeder
├── Services/           # JwtService, FileService
├── Helpers/            # ApiResponse, AppSettings
├── Program.cs          # DI + Middleware
└── appsettings.json    # Конфигурация
```

---

## ⚙️ Формат ответов

```json
// Успех
{ "success": true, "data": { ... } }

// Ошибка
{ "success": false, "error": "Текст ошибки" }

// С пагинацией
{
  "success": true,
  "data": [...],
  "pagination": { "page": 1, "limit": 10, "total": 100, "pages": 10 }
}
```
