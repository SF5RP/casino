# 🚀 CI/CD Quick Start Guide

Быстрая настройка автоматического развертывания для Casino Backend.

## ⚡ Быстрый старт (5 минут)

### 1. Настройка SSH ключей

```bash
# На локальной машине
ssh-keygen -t ed25519 -C "github-actions@casino" -f ~/.ssh/casino_deploy_key
# (не устанавливайте пароль)

# Скопируйте публичный ключ на сервер
ssh-copy-id -i ~/.ssh/casino_deploy_key.pub username@your-server.com

# Проверьте подключение
ssh -i ~/.ssh/casino_deploy_key username@your-server.com "echo 'Connected!'"
```

### 2. Настройка GitHub Secrets

Перейдите в репозиторий → `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

**Обязательные secrets:**
- `SSH_PRIVATE_KEY` - содержимое файла `~/.ssh/casino_deploy_key`
- `SERVER_HOST` - IP адрес или домен сервера
- `SERVER_USER` - имя пользователя для SSH

```bash
# Скопируйте приватный ключ
cat ~/.ssh/casino_deploy_key
# Вставьте весь вывод в SSH_PRIVATE_KEY
```

### 3. Подготовка сервера

```bash
# На сервере создайте пользователя для деплоя
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG sudo deploy
echo "deploy ALL=(ALL) NOPASSWD: ALL" | sudo tee /etc/sudoers.d/deploy

# Переключитесь на пользователя deploy
sudo su - deploy
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Добавьте публичный ключ (замените на ваш ключ)
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI..." >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## 🎯 Как использовать

### Автоматический деплой
Просто сделайте коммит в ветку `main`:
```bash
git add .
git commit -m "feat: update casino backend"
git push origin main
```
GitHub Actions автоматически развернет новую версию!

### Ручной деплой
1. Перейдите в GitHub репозиторий
2. Вкладка `Actions`
3. Выберите `Manual Deploy`
4. Нажмите `Run workflow`
5. Выберите параметры и запустите

## 📊 Что происходит при деплое

1. **Build** - сборка Go приложения
2. **Test** - запуск тестов
3. **Package** - создание деплой пакета
4. **Deploy** - копирование на сервер и обновление
5. **Health Check** - проверка работоспособности
6. **Notifications** - уведомления о результате

## 🔧 Дополнительные настройки

### Уведомления (опционально)

Добавьте secrets для уведомлений:

**Slack:**
- `SLACK_WEBHOOK_URL` - webhook URL для Slack

**Telegram:**
- `TELEGRAM_BOT_TOKEN` - токен бота
- `TELEGRAM_CHAT_ID` - ID чата

**Discord:**
- `DISCORD_WEBHOOK_URL` - webhook URL для Discord

**Email:**
- `SMTP_SERVER` - SMTP сервер
- `SMTP_USERNAME` - логин
- `SMTP_PASSWORD` - пароль
- `NOTIFICATION_EMAIL` - email для уведомлений

### Staging сервер (опционально)

Для staging окружения добавьте:
- `STAGING_SERVER_HOST`
- `STAGING_SERVER_USER`

## 🚨 Troubleshooting

### Ошибка SSH подключения
```bash
# Проверьте SSH ключ
ssh -i ~/.ssh/casino_deploy_key -v username@server

# Проверьте права на файлы
ls -la ~/.ssh/
```

### Деплой не запускается
- Проверьте, что изменения в папке `backend/`
- Убедитесь, что коммит в ветку `main`
- Проверьте GitHub Actions во вкладке `Actions`

### Сервис не запускается
```bash
# На сервере проверьте логи
sudo journalctl -u casino-backend -f
sudo systemctl status casino-backend
```

## ✅ Проверка работы

После настройки проверьте:

1. **SSH подключение работает**
2. **GitHub Secrets настроены**
3. **Сделайте тестовый коммит**
4. **Проверьте вкладку Actions в GitHub**
5. **Убедитесь, что сервис запустился на сервере**

## 📖 Полная документация

Для детальной настройки смотрите:
- `scripts/setup-github-secrets.md` - полная инструкция по настройке
- `backend/DEPLOYMENT.md` - документация по развертыванию
- `.github/workflows/` - конфигурация GitHub Actions

---

**🎉 Готово! Теперь каждый коммит автоматически развертывается на сервер!** 