# 🚀 Casino Deployment Quick Start

Быстрая инструкция для развертывания Casino приложения на новом сервере.

---

## ⚡ 3 шага до запуска

### 1️⃣ Настройка сервера (5 минут)

```bash
# На сервере выполните:
wget https://raw.githubusercontent.com/YOUR_REPO/main/scripts/server-quick-setup.sh
chmod +x server-quick-setup.sh
sudo ./server-quick-setup.sh
```

**Результат**: PostgreSQL, Go, Node.js, Nginx установлены и настроены

### 2️⃣ Настройка GitHub (3 минуты)

**На локальной машине:**

```bash
# Создайте SSH ключ
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/casino_deploy

# Скопируйте на сервер
ssh-copy-id -i ~/.ssh/casino_deploy.pub deploy@YOUR_SERVER_IP
```

**В GitHub → Settings → Secrets → Actions:**

Добавьте секреты:

- `SSH_PRIVATE_KEY` → содержимое `~/.ssh/casino_deploy`
- `SERVER_HOST` → IP вашего сервера
- `SERVER_USER` → `deploy`
- `DB_PASSWORD` → из вывода скрипта на шаге 1
- `JWT_SECRET` → `openssl rand -base64 32`
- `API_KEY` → `openssl rand -base64 32`
- `HOST_NAME` → ваш домен (для health check)

### 3️⃣ Деплой (1 минута)

```bash
git add .
git commit -m "Initial deployment"
git push origin main
```

**Результат**: GitHub Actions автоматически развернет приложение! 🎉

---

## ✅ Проверка

```bash
# Health check
curl http://your-server-ip/health

# Или откройте в браузере
http://your-server-ip
```

---

## 📚 Полная документация

### Основные руководства

- **[Полное руководство (все детали)](docs/DEPLOYMENT_COMPLETE_GUIDE.md)** - 📖 Подробные инструкции для настройки с нуля
- **[Шпаргалка (быстрый справочник)](docs/DEPLOYMENT_CHEATSHEET.md)** - ⚡ Все команды в одном месте
- **[README (обзор)](docs/DEPLOYMENT_README.md)** - 📋 Навигация по документации

### Специализированные

- **[Setup Deployment Files](docs/SETUP_DEPLOYMENT_FILES.md)** - 🔧 Создание файлов деплоя в репозитории
- **[GitHub Secrets Setup](docs/BACKEND_SECRETS_SETUP.md)** - 🔐 Настройка секретов
- **[CI/CD Quick Start](docs/CI_CD_QUICK_START.md)** - 🔄 Автоматический деплой
- **[Frontend Environment](docs/FRONTEND_ENV_SETUP.md)** - 🎨 Переменные окружения

---

## 🛠️ Управление

### Backend (Go)

```bash
# Запуск/остановка/перезапуск
sudo systemctl start casino-backend
sudo systemctl stop casino-backend
sudo systemctl restart casino-backend

# Логи
sudo journalctl -u casino-backend -f
```

### Frontend (Next.js)

```bash
# Запуск/остановка/перезапуск
pm2 start casino-frontend
pm2 stop casino-frontend
pm2 restart casino-frontend

# Логи
pm2 logs casino-frontend
```

### Nginx

```bash
# Перезапуск
sudo systemctl restart nginx

# Проверка конфигурации
sudo nginx -t
```

---

## 🔒 SSL/HTTPS

```bash
# Получить Let's Encrypt сертификат
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

После этого обновите `frontend/.env.production`:

```env
NEXT_PUBLIC_WS_URL=wss://yourdomain.com/ws
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
```

И перезапустите:

```bash
pm2 restart casino-frontend
```

---

## 🔍 Диагностика

### Быстрая проверка готовности

```bash
wget https://raw.githubusercontent.com/YOUR_REPO/main/scripts/check-deployment-readiness.sh
chmod +x check-deployment-readiness.sh
./check-deployment-readiness.sh
```

### Проверка сервисов

```bash
# Все ли работает?
sudo systemctl status casino-backend nginx postgresql
pm2 status

# Health checks
curl http://localhost:8011/health  # Backend
curl http://localhost:3000          # Frontend
curl http://localhost               # Nginx
```

### Логи при проблемах

```bash
# Backend
sudo journalctl -u casino-backend -n 50

# Frontend
pm2 logs casino-frontend --lines 50

# Nginx
sudo journalctl -u nginx -n 50
```

---

## 🎯 Структура проекта

```
casino/
├── backend/              # Go сервер
│   ├── cmd/server/      # Точка входа
│   ├── internal/        # Бизнес-логика
│   ├── deploy/          # Скрипты деплоя
│   └── DEPLOYMENT.md    # Backend документация
│
├── frontend/            # Next.js приложение
│   ├── src/            # Исходный код
│   ├── public/         # Статические файлы
│   └── DEPLOYMENT.md   # Frontend документация
│
├── docs/               # Документация
│   ├── DEPLOYMENT_COMPLETE_GUIDE.md  # Полное руководство
│   ├── DEPLOYMENT_CHEATSHEET.md      # Шпаргалка
│   ├── DEPLOYMENT_README.md          # Обзор
│   └── ...             # Другие руководства
│
├── scripts/            # Утилиты
│   ├── server-quick-setup.sh         # Автоустановка
│   └── check-deployment-readiness.sh # Проверка
│
└── .github/workflows/  # CI/CD
    └── deploy.yml      # GitHub Actions
```

---

## 📊 Архитектура

```
Internet → Nginx:80/443 → Backend:8011 → PostgreSQL:5432
                      ↓
                   Frontend:3000
```

- **Nginx**: Reverse proxy, SSL termination
- **Backend**: Go + WebSocket (systemd)
- **Frontend**: Next.js SSR (PM2)
- **PostgreSQL**: Database (systemd)

---

## 🆘 Частые проблемы

| Симптом                 | Решение                                 |
| ----------------------- | --------------------------------------- |
| 502 Bad Gateway         | `sudo systemctl restart casino-backend` |
| Frontend не отвечает    | `pm2 restart casino-frontend`           |
| WebSocket не работает   | Проверьте Nginx config для `/ws`        |
| База данных не доступна | `sudo systemctl restart postgresql`     |

---

## 🔄 Workflow деплоя

1. **Push в main** → GitHub Actions запускается
2. **Build** → Компиляция Go бинарника
3. **Test** → Запуск тестов
4. **Deploy** → Копирование на сервер через SSH
5. **Restart** → Перезапуск systemd сервиса
6. **Health Check** → Проверка работоспособности

**Время деплоя**: ~2-3 минуты

---

## 💡 Полезные команды

```bash
# Перезапустить всё
sudo systemctl restart casino-backend nginx
pm2 restart casino-frontend

# Проверить статус всего
sudo systemctl status casino-backend nginx postgresql && pm2 status

# Очистить логи
sudo journalctl --vacuum-time=7d
pm2 flush

# Бэкап БД
sudo -u postgres pg_dump casino_db > backup_$(date +%Y%m%d).sql
```

---

## 📞 Поддержка

- 📖 **Документация**: `docs/DEPLOYMENT_README.md`
- 🔍 **Диагностика**: `scripts/check-deployment-readiness.sh`
- 💬 **Вопросы**: Создайте Issue в GitHub

---

## ✅ Чек-лист

- [ ] Сервер настроен (`server-quick-setup.sh`)
- [ ] GitHub Secrets добавлены
- [ ] SSH ключ работает
- [ ] Первый деплой успешен
- [ ] Health check проходит
- [ ] SSL настроен (для продакшена)
- [ ] Мониторинг настроен

---

**🎉 Готово! Приложение работает!**

Для детальной информации смотрите [docs/DEPLOYMENT_README.md](docs/DEPLOYMENT_README.md)
