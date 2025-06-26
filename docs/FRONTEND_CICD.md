# Frontend CI/CD Documentation

Полная документация по настройке автоматического развертывания frontend приложения Casino.

## 🏗️ Архитектура CI/CD

```
Frontend CI/CD Pipeline:
├── 🔍 CI Pipeline (frontend-ci.yml)
│   ├── Lint & Type Check
│   ├── Unit Tests
│   ├── Build
│   ├── Security Scan
│   ├── Performance Check
│   └── Quality Gate
└── 🚀 CD Pipeline (deploy-frontend.yml)
    ├── Build Application
    ├── Prepare Deployment
    ├── Deploy to Server
    ├── Health Check
    └── Deployment Summary
```

## 📋 Workflows

### 1. **Frontend CI** (`frontend-ci.yml`)
Запускается при:
- Push в ветки `main`, `master`, `develop`
- Pull Request в `main`, `master`
- Изменения в папке `frontend/`

**Этапы:**
- **Lint & Type Check** - ESLint и TypeScript проверки
- **Tests** - Unit тесты с покрытием кода
- **Build** - Сборка Next.js приложения
- **Security Scan** - Проверка уязвимостей
- **Performance Check** - Lighthouse анализ
- **Quality Gate** - Финальная проверка качества

### 2. **Frontend Deploy** (`deploy-frontend.yml`)
Запускается при:
- Push в ветки `main`, `master`
- Ручной запуск через `workflow_dispatch`
- Изменения в папке `frontend/`

**Этапы:**
- **Build** - Сборка приложения для production
- **Deploy** - Развертывание на сервер через PM2
- **Health Check** - Проверка работоспособности
- **Summary** - Отчет о развертывании

## 🔧 Настройка на сервере

### 1. **Установка Node.js и PM2**

```bash
# Установка Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка PM2
sudo npm install -g pm2

# Настройка автозапуска PM2
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

### 2. **Создание директории для приложения**

```bash
# Создать директорию для frontend
mkdir -p ~/casino-frontend

# Создать директории для логов
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2
```

### 3. **Настройка прав sudo для PM2**

```bash
# Добавить права для управления PM2
sudo visudo
```

Добавить строку:
```
ваш_пользователь ALL=(ALL) NOPASSWD: /usr/bin/mkdir, /usr/bin/chown
```

## 🔐 GitHub Secrets

Настройте следующие секреты в GitHub:

### Обязательные секреты:
```bash
SSH_PRIVATE_KEY          # SSH приватный ключ для доступа к серверу
SERVER_HOST              # IP адрес или домен сервера
SERVER_USER              # Пользователь на сервере
```

### Опциональные секреты:
```bash
SSH_PORT                 # SSH порт (по умолчанию 22)
FRONTEND_API_URL         # URL API для frontend (по умолчанию /api)
FRONTEND_WS_URL          # URL WebSocket (по умолчанию /ws)
```

## 📁 Структура развертывания

На сервере создается следующая структура:

```
~/casino-frontend/
├── .next/                    # Собранное Next.js приложение
├── public/                   # Статические файлы
├── node_modules/             # Зависимости
├── package.json              # Конфигурация пакетов
├── next.config.ts            # Конфигурация Next.js
├── start-prod.js             # Скрипт запуска
├── config.js                 # Конфигурация приложения
└── ecosystem.config.js       # Конфигурация PM2
```

## 🚀 Процесс развертывания

### 1. **Автоматическое развертывание**
- Изменения в `frontend/` автоматически запускают CI/CD
- После прохождения всех проверок происходит развертывание
- PM2 автоматически перезапускает приложение

### 2. **Ручное развертывание**
```bash
# В GitHub Actions -> Actions -> Deploy Frontend -> Run workflow
```

### 3. **Откат к предыдущей версии**
```bash
# На сервере
cd ~/casino-frontend-backup
pm2 stop casino-frontend
mv ~/casino-frontend ~/casino-frontend-failed
mv ~/casino-frontend-backup ~/casino-frontend
cd ~/casino-frontend
pm2 start ecosystem.config.js
```

## 📊 Мониторинг

### PM2 команды:
```bash
# Статус приложения
pm2 status casino-frontend

# Логи
pm2 logs casino-frontend

# Мониторинг ресурсов
pm2 monit

# Перезапуск
pm2 restart casino-frontend

# Остановка
pm2 stop casino-frontend
```

### Логи:
- **Ошибки**: `/var/log/pm2/casino-frontend-error.log`
- **Вывод**: `/var/log/pm2/casino-frontend-out.log`
- **Общий**: `/var/log/pm2/casino-frontend-combined.log`

## 🔍 Отладка

### Проблемы сборки:
```bash
# Проверить логи GitHub Actions
# Локальная сборка для отладки
cd frontend
npm ci
npm run build
```

### Проблемы развертывания:
```bash
# Проверить SSH подключение
ssh -p 22 пользователь@сервер

# Проверить права доступа
ls -la ~/casino-frontend

# Проверить PM2
pm2 list
pm2 logs casino-frontend --lines 50
```

### Проблемы с приложением:
```bash
# Проверить порт
netstat -tlnp | grep 3000

# Проверить процессы
ps aux | grep node

# Проверить логи приложения
pm2 logs casino-frontend
```

## 🧪 Тестирование

### Локальное тестирование:
```bash
cd frontend

# Установка зависимостей
npm ci

# Линтинг
npm run lint

# Типы
npm run type-check

# Тесты
npm test

# Сборка
npm run build

# Запуск
npm start
```

### Проверка production сборки:
```bash
# Сборка как в CI
NODE_ENV=production npm run build

# Проверка размера
du -sh .next/

# Запуск production сервера
npm start
```

## 📈 Оптимизация

### 1. **Кэширование**
- GitHub Actions кэширует `node_modules`
- Next.js кэширует сборку
- PM2 использует cluster mode (опционально)

### 2. **Производительность**
- Bundle analyzer для анализа размера
- Lighthouse CI для проверки производительности
- Tree shaking для удаления неиспользуемого кода

### 3. **Безопасность**
- `npm audit` для проверки уязвимостей
- Dependency check для анализа зависимостей
- ESLint security правила

## 🔧 Настройка PM2 Cluster Mode

Для высоконагруженных приложений:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'casino-frontend',
    script: 'start-prod.js',
    instances: 'max',  // Использовать все CPU ядра
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

## 🎯 Best Practices

1. **Версионирование**: Используйте семантическое версионирование
2. **Тестирование**: Покрытие тестами критических компонентов
3. **Мониторинг**: Настройте алерты для PM2
4. **Бэкапы**: Автоматическое создание бэкапов перед развертыванием
5. **Rollback**: Возможность быстрого отката к предыдущей версии
6. **Логирование**: Структурированные логи для анализа
7. **Безопасность**: Регулярное обновление зависимостей

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи GitHub Actions
2. Проверьте логи PM2 на сервере
3. Убедитесь в корректности GitHub Secrets
4. Проверьте доступность сервера
5. Обратитесь к документации Next.js и PM2 