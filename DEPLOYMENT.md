# 🚀 Деплой приложения рулетки

## Варианты деплоя

### 1. Локальный продакшен запуск

```bash
# Установка зависимостей
npm install

# Запуск в продакшен режиме
npm run start:prod
```

### 2. Docker контейнер

```bash
# Сборка образа
npm run docker:build

# Запуск контейнера
npm run docker:run

# Или с помощью docker-compose
npm run docker:compose:build
```

### 3. Облачные платформы

#### Vercel (рекомендуется для Next.js)
```bash
# Установка Vercel CLI
npm i -g vercel

# Деплой
vercel

# Настройка переменных окружения в Vercel Dashboard:
# NEXT_PUBLIC_WS_PORT=3002
# NEXT_PUBLIC_WS_HOST=your-websocket-server.com
# NEXT_PUBLIC_WS_PROTOCOL=wss
```

#### Railway
```bash
# Установка Railway CLI
npm i -g @railway/cli

# Логин и деплой
railway login
railway deploy
```

#### Heroku
```bash
# Установка Heroku CLI и деплой
heroku create your-app-name
git push heroku main

# Настройка переменных окружения
heroku config:set NODE_ENV=production
heroku config:set APP_PORT=3000
heroku config:set WS_PORT=3002
```

## Переменные окружения

### Обязательные для продакшена:
- `NODE_ENV=production`
- `APP_PORT` - порт для Next.js приложения (по умолчанию 3000)
- `WS_PORT` - порт для WebSocket сервера (по умолчанию 3002)

### Для клиентской части:
- `NEXT_PUBLIC_WS_PORT` - порт WebSocket сервера
- `NEXT_PUBLIC_WS_HOST` - хост WebSocket сервера (localhost для локального деплоя)
- `NEXT_PUBLIC_WS_PROTOCOL` - протокол (ws для HTTP, wss для HTTPS)
- `NEXT_PUBLIC_WS_URL` - полный URL WebSocket сервера (альтернатива отдельным настройкам)

## Особенности деплоя

### 1. Разделенный деплой (рекомендуется)

**Next.js приложение на Vercel:**
- Деплоим только фронтенд на Vercel
- Настраиваем переменные окружения для подключения к внешнему WebSocket серверу

**WebSocket сервер на отдельном сервере:**
```bash
# На сервере (VPS, Railway, Heroku)
node wsServer.js
```

### 2. Монолитный деплой

**Все в одном контейнере:**
```bash
docker-compose up -d
```

### 3. Kubernetes деплой

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: roulette-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: roulette-app
  template:
    metadata:
      labels:
        app: roulette-app
    spec:
      containers:
      - name: roulette-app
        image: roulette-app:latest
        ports:
        - containerPort: 3000
        - containerPort: 3002
        env:
        - name: NODE_ENV
          value: "production"
        - name: APP_PORT
          value: "3000"
        - name: WS_PORT
          value: "3002"
```

## Мониторинг и логи

### Docker логи:
```bash
docker-compose logs -f
```

### PM2 для продакшена:
```bash
# Установка PM2
npm install -g pm2

# Создание ecosystem.config.js
module.exports = {
  apps: [{
    name: 'roulette-app',
    script: 'start-prod.js',
    instances: 1,
    env: {
      NODE_ENV: 'production',
      APP_PORT: 3000,
      WS_PORT: 3002
    }
  }]
};

# Запуск с PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Безопасность

### 1. HTTPS/WSS в продакшене
- Используйте `wss://` вместо `ws://` для WebSocket
- Настройте SSL сертификаты

### 2. Переменные окружения
- Никогда не коммитьте `.env` файлы
- Используйте секреты платформы для чувствительных данных

### 3. Firewall
- Откройте только необходимые порты
- Используйте reverse proxy (nginx) для дополнительной безопасности

## Troubleshooting

### WebSocket подключение не работает:
1. Проверьте правильность `NEXT_PUBLIC_WS_*` переменных
2. Убедитесь, что WebSocket сервер запущен
3. Проверьте firewall и сетевые настройки
4. Для HTTPS сайтов используйте WSS протокол

### Приложение не запускается:
1. Проверьте логи: `docker-compose logs`
2. Убедитесь, что порты не заняты
3. Проверьте переменные окружения
4. Убедитесь, что сборка прошла успешно 