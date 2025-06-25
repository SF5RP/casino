# 🚀 Casino Backend CI/CD System

Полная система непрерывной интеграции и развертывания (CI/CD) для Casino Backend на Go.

## 📋 Обзор системы

Наша CI/CD система обеспечивает:
- ✅ **Автоматическую сборку** при каждом коммите
- 🧪 **Запуск тестов** перед развертыванием
- 🚀 **Автоматическое развертывание** на production
- 🎛️ **Ручное управление** деплоями
- 📊 **Мониторинг** и health-checks
- 🔔 **Уведомления** в Slack/Telegram/Discord/Email
- 🔄 **Rollback** при неудачном деплое

## 🏗️ Архитектура

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Developer     │    │   GitHub         │    │   Production    │
│                 │    │                  │    │   Server        │
│  git push  ────►│────│► GitHub Actions ─│────│► Deployment     │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │ Notifications│
                       │ Slack/Telegram│
                       │ Discord/Email │
                       └──────────────┘
```

## 📁 Структура файлов CI/CD

```
.github/workflows/
├── deploy.yml              # Автоматический деплой
├── manual-deploy.yml       # Ручной деплой с параметрами
└── notifications.yml       # Уведомления о результатах

scripts/
└── setup-github-secrets.md # Инструкция по настройке

go-backend/
├── deploy/                 # Скрипты развертывания
│   ├── scripts/
│   │   ├── install.sh      # Установка сервиса
│   │   ├── update.sh       # Обновление сервиса
│   │   ├── uninstall.sh    # Удаление сервиса
│   │   └── setup-postgres.sh
│   ├── systemd/
│   │   └── casino-backend.service
│   └── nginx/
│       └── casino-backend.conf
├── internal/handlers/
│   └── health_test.go      # Тесты для CI
└── env.example             # Пример переменных окружения
```

## 🔄 Workflow процессы

### 1. Автоматический деплой (`deploy.yml`)

**Триггеры:**
- Push в ветку `main`/`master`
- Изменения в папке `go-backend/`

**Этапы:**
1. **Build** - сборка Go приложения
2. **Test** - запуск всех тестов
3. **Package** - создание деплой пакета
4. **Deploy** - развертывание на сервер
5. **Health Check** - проверка работоспособности

### 2. Ручной деплой (`manual-deploy.yml`)

**Параметры:**
- **Environment**: production/staging/development
- **Branch**: любая ветка для деплоя
- **Skip tests**: пропустить тесты
- **Force deploy**: принудительный деплой

**Особенности:**
- Поддержка множественных окружений
- Детальные логи развертывания
- Метаданные о деплое

### 3. Уведомления (`notifications.yml`)

**Поддерживаемые платформы:**
- 📱 **Slack** - с кнопками и форматированием
- 📞 **Telegram** - с Markdown форматированием
- 🎮 **Discord** - с embed сообщениями
- 📧 **Email** - с HTML форматированием

## ⚙️ Настройка

### Быстрый старт (5 минут)

1. **Настройте SSH ключи:**
```bash
ssh-keygen -t ed25519 -C "github-actions@casino" -f ~/.ssh/casino_deploy_key
ssh-copy-id -i ~/.ssh/casino_deploy_key.pub username@your-server.com
```

2. **Добавьте GitHub Secrets:**
   - `SSH_PRIVATE_KEY` - приватный SSH ключ
   - `SERVER_HOST` - адрес сервера
   - `SERVER_USER` - пользователь SSH

3. **Подготовьте сервер:**
```bash
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG sudo deploy
echo "deploy ALL=(ALL) NOPASSWD: ALL" | sudo tee /etc/sudoers.d/deploy
```

4. **Сделайте тестовый коммит:**
```bash
git add .
git commit -m "feat: setup CI/CD"
git push origin main
```

### Детальная настройка

См. документы:
- [`CI_CD_QUICK_START.md`](CI_CD_QUICK_START.md) - быстрый старт
- [`scripts/setup-github-secrets.md`](scripts/setup-github-secrets.md) - настройка secrets

## 🔐 Безопасность

### Рекомендации:
- ✅ Используйте отдельного пользователя для деплоя
- ✅ Ограничьте sudo права только необходимыми командами
- ✅ Регулярно ротируйте SSH ключи
- ✅ Настройте мониторинг SSH подключений
- ✅ Используйте GitHub Environments для production

### Ограниченные sudo права:
```bash
# /etc/sudoers.d/deploy
deploy ALL=(ALL) NOPASSWD: /bin/systemctl start casino-backend
deploy ALL=(ALL) NOPASSWD: /bin/systemctl stop casino-backend
deploy ALL=(ALL) NOPASSWD: /bin/systemctl restart casino-backend
deploy ALL=(ALL) NOPASSWD: /bin/systemctl status casino-backend
deploy ALL=(ALL) NOPASSWD: /bin/journalctl -u casino-backend *
```

## 📊 Мониторинг

### GitHub Actions
- Логи всех этапов развертывания
- Время выполнения каждого шага
- Артефакты сборки (30 дней)

### На сервере
```bash
# Логи сервиса
sudo journalctl -u casino-backend -f

# Статус сервиса
sudo systemctl status casino-backend

# Проверка API
curl http://localhost:8080/health
```

### Уведомления
Автоматические уведомления о:
- ✅ Успешном деплое
- ❌ Неудачном деплое
- ⚠️ Проблемах с health check

## 🚨 Troubleshooting

### Частые проблемы:

**1. SSH ошибки**
```bash
# Проверка подключения
ssh -i ~/.ssh/casino_deploy_key -v username@server

# Проверка прав
ls -la ~/.ssh/
```

**2. Деплой не запускается**
- Убедитесь, что изменения в `go-backend/`
- Проверьте ветку (должна быть `main`)
- Проверьте GitHub Actions

**3. Сервис не запускается**
```bash
# Логи сервиса
sudo journalctl -u casino-backend -n 50

# Проверка файлов
ls -la /opt/casino-backend/
```

**4. Health check не проходит**
- Проверьте firewall
- Убедитесь, что порт 8080 открыт
- Проверьте логи приложения

### Rollback

При неудачном деплое:
```bash
# Автоматический rollback (встроен в update.sh)
cd /opt/casino-backend
sudo systemctl stop casino-backend
sudo cp casino-server.backup.* casino-server
sudo systemctl start casino-backend
```

## 🎯 Примеры использования

### Обычный деплой
```bash
git add .
git commit -m "feat: add new feature"
git push origin main
# Автоматически развернется на production
```

### Hotfix деплой
```bash
git checkout -b hotfix/critical-bug
# Fix the bug
git commit -m "fix: critical bug"
git push origin hotfix/critical-bug

# Ручной деплой через GitHub Actions:
# 1. Actions → Manual Deploy
# 2. Branch: hotfix/critical-bug
# 3. Environment: production
# 4. Force deploy: true
```

### Staging деплой
```bash
git push origin develop

# Ручной деплой:
# 1. Actions → Manual Deploy
# 2. Branch: develop
# 3. Environment: staging
```

## 📈 Метрики и производительность

### Время деплоя:
- **Build**: ~2-3 минуты
- **Deploy**: ~30-60 секунд
- **Health Check**: ~10 секунд
- **Общее время**: ~3-5 минут

### Ресурсы:
- **GitHub Actions**: 2000 минут/месяц (бесплатно)
- **Артефакты**: до 500MB
- **Concurrent jobs**: до 20

## 🔄 Обновления системы

### Обновление workflows:
1. Измените файлы в `.github/workflows/`
2. Коммит изменений
3. Новые правила применятся автоматически

### Обновление скриптов деплоя:
1. Обновите файлы в `go-backend/deploy/`
2. Коммит и push
3. Следующий деплой использует новые скрипты

## 🎉 Преимущества системы

- 🚀 **Быстрые деплои** - 3-5 минут от коммита до production
- 🔒 **Безопасность** - изолированные SSH ключи и пользователи
- 📊 **Прозрачность** - полные логи всех операций
- 🔄 **Надежность** - автоматический rollback при ошибках
- 🔔 **Уведомления** - мгновенная информация о статусе
- 🎛️ **Гибкость** - ручное управление и множественные окружения

---

**💡 Система готова к использованию! Каждый коммит теперь автоматически развертывается на сервер с полным контролем качества и безопасности.** 