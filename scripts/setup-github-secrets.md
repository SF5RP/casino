# 🔐 Настройка GitHub Secrets для CI/CD

Этот документ описывает, как настроить GitHub Secrets для автоматического развертывания.

## 📋 Необходимые Secrets

Перейдите в настройки вашего GitHub репозитория: `Settings` → `Secrets and variables` → `Actions`

### 🔑 Обязательные Secrets

#### Для Production сервера:
- **`SSH_PRIVATE_KEY`** - Приватный SSH ключ для подключения к серверу
- **`SERVER_HOST`** - IP адрес или домен production сервера
- **`SERVER_USER`** - Пользователь для SSH подключения

#### Для Staging сервера (опционально):
- **`STAGING_SERVER_HOST`** - IP адрес staging сервера
- **`STAGING_SERVER_USER`** - Пользователь для staging сервера

#### Для Development сервера (опционально):
- **`DEV_SERVER_HOST`** - IP адрес development сервера
- **`DEV_SERVER_USER`** - Пользователь для development сервера

## 🔧 Настройка SSH ключей

### 1. Генерация SSH ключа

На вашей локальной машине:

```bash
# Генерируем новый SSH ключ для GitHub Actions
ssh-keygen -t ed25519 -C "github-actions@your-domain.com" -f ~/.ssh/github_actions_key

# Не устанавливайте пароль (просто нажмите Enter)
```

### 2. Добавление публичного ключа на сервер

```bash
# Копируем публичный ключ на сервер
ssh-copy-id -i ~/.ssh/github_actions_key.pub user@your-server.com

# Или вручную:
cat ~/.ssh/github_actions_key.pub | ssh user@your-server.com "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### 3. Тестирование подключения

```bash
# Проверяем подключение
ssh -i ~/.ssh/github_actions_key user@your-server.com "echo 'SSH connection successful!'"
```

### 4. Добавление приватного ключа в GitHub

```bash
# Копируем приватный ключ
cat ~/.ssh/github_actions_key
```

Скопируйте весь вывод (включая `-----BEGIN OPENSSH PRIVATE KEY-----` и `-----END OPENSSH PRIVATE KEY-----`) и добавьте как `SSH_PRIVATE_KEY` в GitHub Secrets.

## 🌍 Настройка Environments (опционально)

Для дополнительной безопасности можно настроить GitHub Environments:

1. Перейдите в `Settings` → `Environments`
2. Создайте environments: `production`, `staging`, `development`
3. Настройте protection rules:
   - **Required reviewers** - кто должен одобрить деплой
   - **Wait timer** - задержка перед деплоем
   - **Deployment branches** - какие ветки можно деплоить

## 🚀 Примеры значений Secrets

```
SSH_PRIVATE_KEY:
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAFwAAAAdzc2gtcn
NhAAAAAwEAAQAAAQEA... (ваш приватный ключ)
-----END OPENSSH PRIVATE KEY-----

SERVER_HOST:
192.168.1.100
# или
your-domain.com

SERVER_USER:
ubuntu
# или
root
# или
deploy
```

## 🔧 Настройка пользователя на сервере

### 1. Создание пользователя для деплоя

```bash
# На сервере создаем пользователя
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG sudo deploy

# Настраиваем sudo без пароля для deploy
echo "deploy ALL=(ALL) NOPASSWD: ALL" | sudo tee /etc/sudoers.d/deploy
```

### 2. Настройка SSH для пользователя

```bash
# Переключаемся на пользователя deploy
sudo su - deploy

# Создаем SSH директорию
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Добавляем публичный ключ (скопируйте из ~/.ssh/github_actions_key.pub)
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... github-actions@your-domain.com" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## 🧪 Тестирование CI/CD

### 1. Автоматический деплой

Сделайте коммит в ветку `main`:

```bash
git add .
git commit -m "feat: update backend"
git push origin main
```

GitHub Actions автоматически запустит деплой.

### 2. Ручной деплой

1. Перейдите в GitHub репозиторий
2. Откройте вкладку `Actions`
3. Выберите `Manual Deploy`
4. Нажмите `Run workflow`
5. Выберите параметры:
   - **Environment**: production/staging/development
   - **Branch**: ветка для деплоя
   - **Skip tests**: пропустить тесты
   - **Force deploy**: принудительный деплой

## 📊 Мониторинг деплоев

### GitHub Actions логи

- Перейдите в `Actions` → выберите workflow → посмотрите логи каждого шага

### Логи на сервере

```bash
# Логи сервиса
sudo journalctl -u casino-backend -f

# Статус сервиса
sudo systemctl status casino-backend

# Проверка API
curl http://localhost:8080/health
```

## 🚨 Troubleshooting

### SSH ошибки

```bash
# Проверка SSH подключения
ssh -i ~/.ssh/github_actions_key -v user@your-server.com

# Проверка прав на файлы
ls -la ~/.ssh/
```

### Ошибки деплоя

1. **Permission denied**: проверьте права пользователя на `sudo`
2. **Service failed to start**: проверьте логи `journalctl -u casino-backend`
3. **Health check failed**: проверьте firewall и порты

### Rollback

Если деплой не удался, можно откатиться:

```bash
# На сервере
cd /opt/casino-backend
sudo systemctl stop casino-backend
sudo cp casino-server.backup.YYYYMMDD_HHMMSS casino-server
sudo systemctl start casino-backend
```

## 🔒 Безопасность

### Рекомендации:

1. **Используйте отдельного пользователя** для деплоя
2. **Ограничьте sudo права** только необходимыми командами
3. **Регулярно ротируйте SSH ключи**
4. **Настройте мониторинг** неудачных SSH подключений
5. **Используйте GitHub Environments** для production

### Ограничение sudo прав:

```bash
# Вместо полных sudo прав, ограничьте только нужными командами
# /etc/sudoers.d/deploy
deploy ALL=(ALL) NOPASSWD: /bin/systemctl start casino-backend
deploy ALL=(ALL) NOPASSWD: /bin/systemctl stop casino-backend
deploy ALL=(ALL) NOPASSWD: /bin/systemctl restart casino-backend
deploy ALL=(ALL) NOPASSWD: /bin/systemctl status casino-backend
deploy ALL=(ALL) NOPASSWD: /bin/journalctl -u casino-backend *
```

## ✅ Чек-лист настройки

- [ ] SSH ключи сгенерированы
- [ ] Публичный ключ добавлен на сервер
- [ ] Приватный ключ добавлен в GitHub Secrets
- [ ] Пользователь для деплоя создан и настроен
- [ ] GitHub Secrets настроены
- [ ] Тестовый деплой выполнен успешно
- [ ] Мониторинг настроен
- [ ] Документация обновлена

---

**🚀 CI/CD pipeline готов к использованию!** 