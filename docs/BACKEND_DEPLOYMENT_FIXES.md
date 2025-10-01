# 🔧 Backend Deployment - Исправления и Улучшения

## Исправленные проблемы

### 1. ❌ Проблема с передачей секретов в .env файл

**Было:**

```yaml
# В deploy.yml использовался heredoc с одинарными кавычками
sudo tee /opt/casino-backend/.env > /dev/null << 'ENV_EOF'
DB_HOST=${{ secrets.DB_HOST || 'localhost' }}
---
ENV_EOF
```

**Проблема:** GitHub Actions переменные `${{ }}` не раскрывались внутри heredoc на удаленном сервере.

**Решение:**

```yaml
# Создание .env файла локально в GitHub Actions
cat > /tmp/.env << 'ENV_EOF'
DB_HOST=${{ secrets.DB_HOST || 'localhost' }}
...
ENV_EOF

# Загрузка готового файла на сервер
scp -o StrictHostKeyChecking=no -P ${{ env.SSH_PORT }} \
    /tmp/.env \
    ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }}:...
```

### 2. ❌ Отсутствовала переменная FRONTEND_URL

**Было:**

- В `main.go` используется `FRONTEND_URL` для CORS (строка 459)
- В `deploy.yml` эта переменная не создавалась
- В `env.example` использовалась `CORS_ALLOWED_ORIGINS`

**Решение:**

- Добавлена `FRONTEND_URL` в `.env` файл
- Обновлен `env.example` с правильными переменными
- Добавлен secret `FRONTEND_URL` в GitHub Actions

### 3. ❌ Несоответствие имен переменных

**Было:**

- `env.example`: `DB_SSLMODE`
- Код: `DB_SSL_MODE`

**Решение:**
Унифицировано на `DB_SSL_MODE` везде.

### 4. ❌ Неправильное использование переменных SSH_PORT

**Было:**

```yaml
scp -o StrictHostKeyChecking=no -P ${SSH_PORT:-22} ...
```

**Проблема:** Bash подстановка не работает в GitHub Actions контексте.

**Решение:**

```yaml
scp -o StrictHostKeyChecking=no -P ${{ env.SSH_PORT }} ...
```

### 5. ❌ SystemD service не использовал .env файл

**Было:**

```ini
Environment=PORT=8011
Environment=DB_HOST=localhost
...
```

**Проблема:** Дублирование конфигурации, сложность обновления.

**Решение:**

```ini
EnvironmentFile=/opt/casino-backend/.env
```

### 6. ❌ Отсутствие GRPC_PORT в конфигурации

**Было:**

- Код использует переменную `GRPC_PORT`
- В `.env` она не была указана

**Решение:**
Добавлена `GRPC_PORT=8012` во все конфигурационные файлы.

## Обновленные файлы

### 1. `.github/workflows/deploy.yml`

- ✅ Исправлена передача секретов в .env
- ✅ Исправлено использование `SSH_PORT`
- ✅ Добавлена `FRONTEND_URL`
- ✅ Добавлена `GRPC_PORT`
- ✅ Упрощен процесс создания .env файла

### 2. `backend/env.example`

- ✅ Удалены неиспользуемые переменные
- ✅ Добавлены все необходимые переменные
- ✅ Исправлено `DB_SSLMODE` → `DB_SSL_MODE`
- ✅ Добавлена `FRONTEND_URL` с комментарием
- ✅ Добавлена `GRPC_PORT`
- ✅ Исправлен порт `PORT=8011` (было 8080)

### 3. `backend/deploy/systemd/casino-backend.service`

- ✅ Добавлен `EnvironmentFile=/opt/casino-backend/.env`
- ✅ Удалены хардкоженные переменные окружения
- ✅ Добавлен `ReadWritePaths=/opt/frontend` для доступа к uploads

### 4. `docs/BACKEND_SECRETS_SETUP.md` (новый)

- ✅ Подробная инструкция по настройке GitHub Secrets
- ✅ Список всех необходимых секретов
- ✅ Команды для генерации безопасных ключей
- ✅ Troubleshooting guide

## Необходимые действия

### 1. Настроить GitHub Secrets

```bash
# Используйте GitHub CLI или веб-интерфейс
gh secret set SSH_PRIVATE_KEY < ~/.ssh/id_rsa
gh secret set SERVER_HOST --body "your-server-ip"
gh secret set SERVER_USER --body "deploy"
gh secret set DB_PASSWORD --body "$(openssl rand -base64 16)"
gh secret set JWT_SECRET --body "$(openssl rand -base64 32)"
gh secret set API_KEY --body "$(openssl rand -base64 32)"
gh secret set FRONTEND_URL --body "https://yourdomain.com"
gh secret set HOST_NAME --body "api.yourdomain.com"
```

Подробности в `docs/BACKEND_SECRETS_SETUP.md`

### 2. Обновить systemd service на сервере

```bash
# На сервере
ssh deploy@your-server.com

# Обновить service файл
sudo cp /opt/casino-backend/deploy/systemd/casino-backend.service \
     /etc/systemd/system/casino-backend.service

# Перезагрузить systemd
sudo systemctl daemon-reload

# Перезапустить сервис
sudo systemctl restart casino-backend

# Проверить статус
sudo systemctl status casino-backend
```

### 3. Создать правильный .env файл на сервере

Если у вас уже работающий сервер, обновите `.env`:

```bash
# На сервере
sudo nano /opt/casino-backend/.env
```

Должен содержать:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=casino_db
DB_USER=casino_user
DB_PASSWORD=your_secure_password
DB_SSL_MODE=disable
PORT=8011
GRPC_PORT=8012
JWT_SECRET=your_jwt_secret_here
API_KEY=your_api_key_here
FRONTEND_URL=https://yourdomain.com
APP_ENV=production
APP_DEBUG=false
LOG_LEVEL=info
```

## Проверка работоспособности

### 1. Локальная проверка

```bash
cd backend
cp env.example .env
# Отредактируйте .env с вашими данными
go run cmd/server/main.go
```

### 2. Health check

```bash
# HTTP endpoint
curl http://localhost:8011/health

# Должен вернуть
{
  "status": "ok",
  "timestamp": "...",
  "repository": {...}
}
```

### 3. WebSocket test

```bash
# Используйте wscat для тестирования WebSocket
npm install -g wscat
wscat -c ws://localhost:8011/ws
```

### 4. gRPC test

```bash
# Используйте grpcurl
grpcurl -plaintext localhost:8012 list
```

## Дополнительные улучшения

### Рекомендации для production

1. **Database**

   - Используйте managed PostgreSQL (AWS RDS, DigitalOcean Managed Database)
   - Включите SSL: `DB_SSL_MODE=require`
   - Настройте регулярные бэкапы

2. **Security**

   - Используйте сильные пароли (минимум 16 символов)
   - Ротируйте JWT_SECRET каждые 3-6 месяцев
   - Настройте fail2ban для защиты от брутфорса SSH

3. **Monitoring**

   - Настройте Prometheus + Grafana для мониторинга
   - Добавьте алерты на высокую нагрузку
   - Настройте логирование в Sentry или аналог

4. **Performance**

   - Используйте Redis для кэширования
   - Настройте connection pooling для PostgreSQL
   - Добавьте rate limiting для API

5. **High Availability**
   - Разверните несколько инстансов за load balancer
   - Используйте Docker/Kubernetes для оркестрации
   - Настройте auto-scaling

## Миграция данных

Если у вас есть существующая база данных:

```bash
# Бэкап текущей БД
pg_dump -U casino_user casino_db > backup.sql

# После обновления
psql -U casino_user casino_db < backup.sql

# Или используйте встроенные миграции
./casino-server migrate
```

## Troubleshooting

### Сервис не стартует

```bash
# Проверить логи
sudo journalctl -u casino-backend -n 50 --no-pager

# Проверить .env файл
sudo cat /opt/casino-backend/.env

# Проверить права
ls -la /opt/casino-backend/
```

### Ошибки CORS

Убедитесь что `FRONTEND_URL` установлен правильно:

- Для development: оставьте пустым
- Для production: `https://yourdomain.com` (без trailing slash)

### Проблемы с БД

```bash
# Проверить подключение
psql -U casino_user -d casino_db -h localhost

# Проверить миграции
./casino-server migration-status
```

## Контрольный список деплоя

- [ ] Все GitHub Secrets настроены
- [ ] SSH ключ добавлен на сервер
- [ ] PostgreSQL установлен и настроен
- [ ] Systemd service обновлен
- [ ] .env файл создан с правильными значениями
- [ ] Firewall настроен (порты 22, 8011, 8012)
- [ ] Health endpoint отвечает
- [ ] WebSocket работает
- [ ] gRPC сервер доступен
- [ ] Логи не показывают ошибок

---

**✅ После применения всех исправлений, ваш backend готов к автоматическому деплою!**
