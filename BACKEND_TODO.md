# ✅ Backend - Что нужно сделать

## 🎯 Критические изменения (требуют действий)

### 1. Настроить GitHub Secrets ⚠️ ОБЯЗАТЕЛЬНО

Без этих секретов деплой не будет работать:

```bash
# Быстрая настройка через GitHub CLI
gh secret set SSH_PRIVATE_KEY < ~/.ssh/id_rsa
gh secret set SERVER_HOST --body "your-server-ip"
gh secret set SERVER_USER --body "deploy"
gh secret set DB_PASSWORD --body "$(openssl rand -base64 16)"
gh secret set JWT_SECRET --body "$(openssl rand -base64 32)"
gh secret set API_KEY --body "$(openssl rand -base64 32)"
gh secret set FRONTEND_URL --body "https://yourdomain.com"
gh secret set HOST_NAME --body "api.yourdomain.com"
```

📖 Подробная инструкция: `docs/BACKEND_SECRETS_SETUP.md`

### 2. Закоммитить изменения

```bash
git add .
git commit -m "fix: исправлен процесс деплоя backend"
git push origin main
```

### 3. Обновить systemd service на сервере (если уже работает)

Только если у вас уже развернут backend:

```bash
ssh deploy@your-server

# Обновить service file
sudo cp /opt/casino-backend/deploy/systemd/casino-backend.service \
     /etc/systemd/system/casino-backend.service

# Применить изменения
sudo systemctl daemon-reload
sudo systemctl restart casino-backend
sudo systemctl status casino-backend
```

## 📝 Что было исправлено

### Файлы с изменениями:

1. ✅ `.github/workflows/deploy.yml`

   - Исправлена передача секретов в .env файл
   - Добавлены FRONTEND_URL и GRPC_PORT
   - Исправлено использование SSH_PORT

2. ✅ `backend/env.example`

   - Удалены неиспользуемые переменные
   - Исправлено DB_SSLMODE → DB_SSL_MODE
   - Добавлены FRONTEND_URL, GRPC_PORT
   - Добавлены опциональные OCR переменные

3. ✅ `backend/deploy/systemd/casino-backend.service`
   - Добавлен EnvironmentFile для автозагрузки .env
   - Удалены хардкоженные переменные

### Новые файлы документации:

4. ✅ `docs/BACKEND_SECRETS_SETUP.md` - инструкция по настройке секретов
5. ✅ `docs/BACKEND_DEPLOYMENT_FIXES.md` - детальное описание всех исправлений
6. ✅ `BACKEND_FIXES_SUMMARY.md` - краткое резюме

## 🔍 Проверка после деплоя

```bash
# 1. Health check
curl http://your-server:8011/health

# Ожидаемый ответ:
{
  "status": "ok",
  "timestamp": "...",
  "repository": {...}
}

# 2. Проверка логов
ssh deploy@your-server
sudo journalctl -u casino-backend -f

# 3. Статус сервиса
sudo systemctl status casino-backend

# 4. WebSocket test
wscat -c ws://your-server:8011/ws
```

## 📊 Переменные окружения

### Обязательные (должны быть в .env):

- `DB_HOST` - хост БД
- `DB_PORT` - порт БД (5432)
- `DB_NAME` - имя БД
- `DB_USER` - пользователь БД
- `DB_PASSWORD` - пароль БД ⚠️
- `DB_SSL_MODE` - режим SSL
- `PORT` - HTTP порт (8011)
- `GRPC_PORT` - gRPC порт (8012)
- `JWT_SECRET` - JWT секрет ⚠️
- `API_KEY` - API ключ ⚠️

### Опциональные:

- `FRONTEND_URL` - URL фронтенда для CORS (если пусто - разрешены все origins)
- `APP_ENV` - окружение (production/development)
- `APP_DEBUG` - режим отладки (true/false)
- `LOG_LEVEL` - уровень логирования (info/debug/error)

## 🚨 Возможные проблемы

### "Permission denied (publickey)"

```bash
# Проверить SSH ключ
ssh -i ~/.ssh/id_rsa deploy@your-server

# Добавить публичный ключ на сервер
cat ~/.ssh/id_rsa.pub | ssh deploy@your-server "cat >> ~/.ssh/authorized_keys"
```

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

Если фронтенд не может подключиться, проверьте:

- `FRONTEND_URL` должен быть установлен в `https://yourdomain.com` (без trailing slash)
- Или оставьте пустым для разрешения всех origins (не рекомендуется в production)

## ✅ Контрольный список

Перед деплоем:

- [ ] Все 8 обязательных GitHub Secrets настроены
- [ ] SSH ключ работает (проверено подключением)
- [ ] PostgreSQL установлен на сервере
- [ ] Директория /opt/casino-backend существует
- [ ] User `deploy` существует на сервере

После деплоя:

- [ ] Health endpoint отвечает
- [ ] Сервис активен (systemctl status)
- [ ] Нет ошибок в логах
- [ ] WebSocket работает
- [ ] gRPC сервер доступен (опционально)

## 📚 Дополнительная информация

- **Полная документация**: `docs/BACKEND_DEPLOYMENT_FIXES.md`
- **Настройка секретов**: `docs/BACKEND_SECRETS_SETUP.md`
- **Общий деплой**: `backend/DEPLOYMENT.md`

---

**🎉 После выполнения шагов 1-2, backend будет автоматически деплоиться при каждом push в main!**
