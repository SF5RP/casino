# 🚀 Быстрый старт: Интеграция авторизации

## ✅ Что уже сделано

### Backend (Go) ✅

- ✅ Миграция БД добавлена (поля `created_by_user_id`, `created_by_username`)
- ✅ JWT middleware обновлен (извлекает `username` из токена)
- ✅ `RouletteNumberRecord` расширен с user полями
- ✅ `SaveNumber` handler обновлен для сохранения user info
- ✅ Repository поддерживает user tracking
- ✅ `.env.example` обновлен с `AUTH_SERVICE_URL`

### Frontend (Next.js) ✅

- ✅ Redux store настроен
- ✅ Auth slice создан
- ✅ Auth API клиент (`authApi.ts`)
- ✅ `useAuth` hook для компонентов
- ✅ Discord Login Button
- ✅ User Menu с аватаром
- ✅ OAuth callback страница (`/auth/callback`)
- ✅ API interceptor с автоматическим JWT и refresh
- ✅ Navigation обновлен (показывает Login/User Menu)

---

## 📋 Что нужно сделать

### Шаг 1: Настроить переменные окружения

#### Auth Service (.env)

```bash
# В C:\Users\forkp\WebstormProjects\auth\.env
JWT_SECRET=your-super-secret-key-min-32-characters-long!
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://user:pass@localhost:5432/auth_db
```

#### Casino Backend (.env)

```bash
# В C:\Users\forkp\WebstormProjects\casino\casino\backend\.env

# КРИТИЧНО: Должен совпадать с Auth Service!
JWT_SECRET=your-super-secret-key-min-32-characters-long!

# База данных
DB_HOST=localhost
DB_PORT=5432
DB_USER=casino_user
DB_PASSWORD=casino_password
DB_NAME=casino_db

# Auth Service
AUTH_SERVICE_URL=http://localhost:8000

# CORS
FRONTEND_URL=http://localhost:3000

# Порты
PORT=8011
GRPC_PORT=8012
```

#### Frontend (.env.local)

```bash
# В C:\Users\forkp\WebstormProjects\casino\casino\frontend\.env.local

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8011
NEXT_PUBLIC_WS_URL=ws://localhost:8011

# Auth Service
NEXT_PUBLIC_AUTH_URL=http://localhost:8000
```

---

### Шаг 2: Применить миграцию БД

```bash
cd C:\Users\forkp\WebstormProjects\casino\casino\backend

# Применить миграцию
go run cmd/server/main.go migrate

# Проверить статус
go run cmd/server/main.go migration-status
```

Вы должны увидеть:

```
Migration 6: Add user tracking to roulette numbers [APPLIED]
```

---

### Шаг 3: Запустить все сервисы

#### Terminal 1: Auth Service

```bash
cd C:\Users\forkp\WebstormProjects\auth
# Ваша команда запуска Auth-сервиса
```

#### Terminal 2: Casino Backend

```bash
cd C:\Users\forkp\WebstormProjects\casino\casino\backend
go run cmd/server/main.go
```

Должны увидеть:

```
HTTP server starting on port 8011
WebSocket endpoint: ws://localhost:8011/ws
```

#### Terminal 3: Frontend

```bash
cd C:\Users\forkp\WebstormProjects\casino\casino\frontend
npm install  # Если еще не установлено
npm run dev
```

---

### Шаг 4: Проверить работу

1. **Откройте браузер:** http://localhost:3000

2. **Проверьте UI:**

   - В правом верхнем углу должна быть кнопка "Войти через Discord"

3. **Войдите:**

   - Нажмите "Войти через Discord"
   - Авторизуйтесь через Discord
   - Вас вернет на `/auth/callback`
   - Затем редирект на главную страницу
   - В правом углу должны увидеть свой аватар и username

4. **Протестируйте сохранение чисел:**
   - Зайдите в любую рулетку
   - Сохраните число
   - Проверьте в БД:
     ```sql
     SELECT number, created_by_user_id, created_by_username
     FROM roulette_numbers
     ORDER BY created_at DESC
     LIMIT 10;
     ```

---

## 🔍 Проверка JWT токена

### В браузере (DevTools):

1. Откройте DevTools → Application/Storage
2. Cookies → `http://localhost:8000`
3. Найдите `refreshToken` (HttpOnly cookie)

### Redux State:

1. Установите Redux DevTools Extension
2. Откройте Redux DevTools
3. Проверьте `state.auth`:
   ```json
   {
     "user": {
       "id": "discord_123456",
       "username": "YourUsername",
       "avatar": "https://...",
       "role": "user"
     },
     "accessToken": "eyJhbGc...",
     "isAuthenticated": true
   }
   ```

---

## 🐛 Troubleshooting

### Проблема: "invalid token"

**Причина:** JWT_SECRET не совпадает

**Решение:**

1. Проверьте `.env` в Auth Service
2. Проверьте `.env` в Casino Backend
3. Убедитесь, что `JWT_SECRET` идентичен
4. Перезапустите оба сервиса

---

### Проблема: CORS ошибка

**Причина:** Frontend URL не в whitelist

**Решение:**

```bash
# Auth Service .env
FRONTEND_URL=http://localhost:3000

# Casino Backend .env
FRONTEND_URL=http://localhost:3000
```

---

### Проблема: user info не сохраняется

**Причина:** JWT не содержит `username`

**Решение:**
Проверьте, что Auth-сервис генерирует JWT с полями:

```json
{
  "sub": "user_id",
  "username": "Username",  ← Обязательно!
  "role": "user"
}
```

---

## 📦 Установка зависимостей (если нужно)

### Backend (Go)

```bash
cd backend
go mod tidy
```

### Frontend (Next.js)

```bash
cd frontend
npm install @reduxjs/toolkit react-redux
```

---

## 🎯 Следующие шаги

### 1. Обновить UI для отображения username в истории ⏳

В файле `frontend/src/components/casino/components/HistoryPanel.tsx`:

```typescript
// Добавить отображение username рядом с каждым числом
{
  number.created_by_username && (
    <span className="text-xs text-gray-500 ml-2">
      by {number.created_by_username}
    </span>
  );
}
```

### 2. Обновить WebSocket для broadcast user info ⏳

В `backend/pkg/websocket/hub.go`:

- При broadcast новых чисел включать `created_by_username`

### 3. Добавить фильтр "Показать только мои числа" 📊

### 4. Добавить статистику по пользователям 📈

---

## 📚 Документация

- **Детальная интеграция:** `docs/AUTH_INTEGRATION_SETUP.md`
- **Auth Service API:** `docs/INTEGRATION.md`
- **Backend changes:** `backend/IMPLEMENTATION_SUMMARY.md`

---

## ✅ Checklist

- [ ] JWT_SECRET настроен одинаково в обоих сервисах
- [ ] Миграция БД применена
- [ ] Auth Service запущен на :8000
- [ ] Casino Backend запущен на :8011
- [ ] Frontend запущен на :3000
- [ ] Кнопка "Войти через Discord" видна
- [ ] После логина username отображается
- [ ] Numbers сохраняются с user info в БД

---

## 🎉 Готово!

Теперь у вас полностью работающая система авторизации через Discord с отслеживанием пользователей!

**Вопросы?** Проверьте логи:

- Auth Service logs
- Casino Backend logs (`HTTP server starting...`)
- Browser DevTools Console
