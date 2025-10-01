# 🔐 Настройка GitHub Secrets для Backend

Для автоматического деплоя бекенда через GitHub Actions необходимо настроить следующие секреты в репозитории.

## 📋 Необходимые Secrets

### Доступ к серверу

| Secret            | Описание                                 | Пример                                     |
| ----------------- | ---------------------------------------- | ------------------------------------------ |
| `SSH_PRIVATE_KEY` | Приватный SSH ключ для доступа к серверу | `-----BEGIN OPENSSH PRIVATE KEY-----\n...` |
| `SERVER_HOST`     | IP адрес или домен сервера               | `192.168.1.100` или `your-server.com`      |
| `SERVER_USER`     | Пользователь на сервере                  | `deploy`                                   |
| `HOST_NAME`       | Домен для health check                   | `api.yourdomain.com`                       |

### База данных

| Secret        | Описание                 | Значение по умолчанию         |
| ------------- | ------------------------ | ----------------------------- |
| `DB_HOST`     | Хост базы данных         | `localhost`                   |
| `DB_PORT`     | Порт PostgreSQL          | `5432`                        |
| `DB_NAME`     | Имя базы данных          | `casino_db`                   |
| `DB_USER`     | Пользователь базы данных | `casino_user`                 |
| `DB_PASSWORD` | Пароль базы данных       | ⚠️ **Обязательно установите** |
| `DB_SSL_MODE` | Режим SSL                | `disable`                     |

### Безопасность

| Secret       | Описание                         | Важность                                             |
| ------------ | -------------------------------- | ---------------------------------------------------- |
| `JWT_SECRET` | Секретный ключ для JWT токенов   | ⚠️ **Критично** - используйте сильный случайный ключ |
| `API_KEY`    | API ключ для внутренних запросов | ⚠️ **Критично** - используйте сильный случайный ключ |

### CORS

| Secret         | Описание               | Пример                   |
| -------------- | ---------------------- | ------------------------ |
| `FRONTEND_URL` | URL фронтенда для CORS | `https://yourdomain.com` |

## 🔧 Как добавить Secrets

### Через веб-интерфейс GitHub

1. Откройте репозиторий на GitHub
2. Перейдите в **Settings** → **Secrets and variables** → **Actions**
3. Нажмите **New repository secret**
4. Введите:
   - **Name**: имя секрета (например, `SSH_PRIVATE_KEY`)
   - **Value**: значение секрета
5. Нажмите **Add secret**

### Через GitHub CLI

```bash
# Установить GitHub CLI (если не установлен)
# https://cli.github.com/

# Авторизоваться
gh auth login

# Добавить секреты
gh secret set SSH_PRIVATE_KEY < ~/.ssh/id_rsa
gh secret set SERVER_HOST --body "192.168.1.100"
gh secret set SERVER_USER --body "deploy"
gh secret set DB_PASSWORD --body "your_secure_password"
gh secret set JWT_SECRET --body "$(openssl rand -base64 32)"
gh secret set API_KEY --body "$(openssl rand -base64 32)"
gh secret set FRONTEND_URL --body "https://yourdomain.com"
gh secret set HOST_NAME --body "api.yourdomain.com"
```

## 🔑 Генерация безопасных ключей

### JWT Secret и API Key

```bash
# Генерация случайного ключа (32 байта, base64)
openssl rand -base64 32

# Или через Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Или через Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### SSH ключ

```bash
# Генерация нового SSH ключа (если нужен)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy

# Скопировать публичный ключ на сервер
ssh-copy-id -i ~/.ssh/github_deploy.pub deploy@your-server.com

# Получить приватный ключ для GitHub Secret
cat ~/.ssh/github_deploy
```

## ✅ Проверка настройки

После добавления всех секретов:

1. Перейдите в **Actions** вашего репозитория
2. Выберите workflow **Build and Deploy Casino Backend**
3. Нажмите **Run workflow** → **Run workflow**
4. Следите за выполнением в реальном времени

### Проверка после деплоя

```bash
# Проверить health endpoint
curl https://api.yourdomain.com/health

# Должен вернуть JSON с информацией о статусе
{
  "status": "ok",
  "timestamp": "...",
  "repository": {...}
}
```

## 🔒 Безопасность

### ⚠️ Важные правила

1. **Никогда не коммитьте секреты** в репозиторий
2. **Используйте сильные пароли** (минимум 16 символов)
3. **Регулярно ротируйте ключи** (раз в 3-6 месяцев)
4. **Ограничьте доступ** к GitHub репозиторию
5. **Используйте разные ключи** для разных окружений (staging/production)

### Рекомендации

- **JWT_SECRET**: минимум 32 символа, случайная строка
- **API_KEY**: минимум 32 символа, случайная строка
- **DB_PASSWORD**: минимум 16 символов, включая спецсимволы
- **SSH ключ**: используйте ed25519 или RSA 4096 бит

## 🐛 Troubleshooting

### Ошибка: "Permission denied (publickey)"

Проблема с SSH ключом:

```bash
# Проверить SSH подключение вручную
ssh -i ~/.ssh/github_deploy deploy@your-server.com

# Убедиться что публичный ключ добавлен на сервер
cat ~/.ssh/github_deploy.pub | ssh deploy@your-server.com "cat >> ~/.ssh/authorized_keys"
```

### Ошибка: "Connection refused"

Проверить настройки firewall:

```bash
# На сервере
sudo ufw status
sudo ufw allow 22/tcp
sudo ufw allow 8011/tcp
```

### Ошибка при создании .env файла

Проверить что все обязательные секреты установлены:

```bash
# Проверить список секретов
gh secret list

# Должны быть установлены минимум:
# - SSH_PRIVATE_KEY
# - SERVER_HOST
# - SERVER_USER
# - DB_PASSWORD
# - JWT_SECRET
# - API_KEY
```

## 📚 Дополнительные ресурсы

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Secrets Management](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [SSH Key Generation](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)

---

**✅ После настройки всех секретов, деплой будет происходить автоматически при каждом push в `main` ветку!**
