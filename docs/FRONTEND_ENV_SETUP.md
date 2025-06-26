# Настройка переменных окружения для фронтенда

## 🔒 Безопасность переменных окружения

### ❌ НЕ коммитить в GitHub:
- `.env.local` - локальные настройки разработчика
- `.env.production` - продакшн секреты
- Любые файлы с реальными API ключами, паролями, токенами

### ✅ МОЖНО коммитить:
- `.env.example` - шаблон без реальных данных
- Публичные переменные (NEXT_PUBLIC_*) с дефолтными значениями

## 📋 Настройка для разработки

### 1. Создайте локальный файл окружения:

```bash
cd frontend
cp .env.example .env.local
```

### 2. Отредактируйте `.env.local`:

```bash
# WebSocket настройки для разработки
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
NEXT_PUBLIC_WS_HOST=localhost
NEXT_PUBLIC_WS_PORT=8080
NEXT_PUBLIC_WS_PROTOCOL=ws

# API настройки
NEXT_PUBLIC_API_URL=http://localhost:8080/api

# Настройки приложения
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_DEBUG=true
```

## 🚀 Настройка на продакшн сервере

### ⚠️ Важно: Создание .env.production

Файл `.env.production` НЕ создается автоматически при деплое - вы должны создать его вручную один раз на сервере. Это сделано для безопасности, чтобы ваши настройки не перезаписывались при каждом деплое.

### Ручная настройка на сервере (ОБЯЗАТЕЛЬНО)

1. **Подключитесь к серверу:**
```bash
ssh deploy@your-server.com
cd ~/casino-frontend
```

2. **Создайте файл переменных окружения:**
```bash
nano .env.production
```

**Скопируйте и вставьте один из вариантов ниже:**

3. **Для HTTP (без SSL):**
```bash
# WebSocket настройки (через nginx)
NEXT_PUBLIC_WS_URL=/ws
NEXT_PUBLIC_WS_PROTOCOL=ws
NEXT_PUBLIC_WS_HOST=localhost

# API настройки
NEXT_PUBLIC_API_URL=/api

# Настройки приложения
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_DEBUG=false
```

4. **Для HTTPS (с SSL):**
```bash
# WebSocket настройки (через nginx с SSL)
NEXT_PUBLIC_WS_URL=wss://yourdomain.com/ws
NEXT_PUBLIC_WS_PROTOCOL=wss
NEXT_PUBLIC_WS_HOST=yourdomain.com

# API настройки
NEXT_PUBLIC_API_URL=https://yourdomain.com/api

# Настройки приложения
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_DEBUG=false
```

5. **Перезапустите сервис:**
```bash
pm2 restart casino-frontend
```

## 🔧 Переменные окружения

### Обязательные переменные:

| Переменная | Описание | Пример для разработки | Пример для продакшена |
|------------|----------|----------------------|----------------------|
| `NEXT_PUBLIC_WS_URL` | URL WebSocket | `ws://localhost:8080/ws` | `/ws` или `wss://domain.com/ws` |
| `NEXT_PUBLIC_API_URL` | URL API | `http://localhost:8080/api` | `/api` или `https://domain.com/api` |

### Дополнительные переменные:

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `NEXT_PUBLIC_WS_PROTOCOL` | Протокол WebSocket | `ws` |
| `NEXT_PUBLIC_WS_HOST` | Хост WebSocket | `localhost` |
| `NEXT_PUBLIC_WS_PORT` | Порт WebSocket | `8080` |
| `NEXT_PUBLIC_APP_ENV` | Окружение | `development` |
| `NEXT_PUBLIC_DEBUG` | Режим отладки | `false` |

## 🔍 Проверка настроек

### 1. Проверка переменных в браузере:
```javascript
console.log('WS URL:', process.env.NEXT_PUBLIC_WS_URL);
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
```

### 2. Проверка на сервере:
```bash
cd ~/casino-frontend
cat .env.production
pm2 logs casino-frontend
```

### 3. Проверка подключения:
- Откройте браузер и перейдите на сайт
- Откройте Developer Tools → Network
- Проверьте WebSocket соединения

## 🚨 Важные моменты

1. **Префикс NEXT_PUBLIC_** обязателен для переменных, доступных в браузере
2. **Переменные загружаются во время сборки**, не во время выполнения
3. **Через nginx** лучше использовать относительные пути (`/ws`, `/api`)
4. **Для SSL** используйте `wss://` вместо `ws://` и `https://` вместо `http://`
5. **После изменения** переменных нужно перезапустить PM2: `pm2 restart casino-frontend`

## 🔄 Обновление переменных

### На сервере:
```bash
# Отредактировать переменные
nano ~/casino-frontend/.env.production

# Перезапустить сервис
pm2 restart casino-frontend

# Проверить статус
pm2 status casino-frontend
```

### Через новый деплой:
Просто сделайте push в main ветку - переменные обновятся автоматически. 