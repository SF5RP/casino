# 🐧 Casino Backend - Linux Deployment Summary

Краткая инструкция по развертыванию Go бэкенда как systemd сервис на Linux сервере.

## 🚀 Быстрый старт

### 1. Подготовка на локальной машине

```bash
cd go-backend
./deploy.sh
```

Это создаст файл `casino-backend-deploy.tar.gz` готовый для передачи на сервер.

### 2. Развертывание на сервере

```bash
# Передача файла на сервер
scp casino-backend-deploy.tar.gz user@your-server.com:~/

# Подключение к серверу
ssh user@your-server.com

# Распаковка и установка
tar -xzf casino-backend-deploy.tar.gz
cd casino-backend

# Автоматическая установка PostgreSQL
sudo ./deploy/scripts/setup-postgres.sh

# Автоматическая установка сервиса
sudo ./deploy/scripts/install.sh

# Запуск сервиса
sudo systemctl start casino-backend

# Проверка статуса
sudo systemctl status casino-backend
```

## 📋 Что создается на сервере

### Файловая структура
```
/opt/casino-backend/
├── casino-server          # Исполняемый файл
├── .env                   # Конфигурация
└── deploy/                # Скрипты управления

/etc/systemd/system/
└── casino-backend.service # Systemd сервис
```

### Пользователи и права
- **Пользователь**: `casino` (системный, без shell)
- **Группа**: `casino`
- **Права**: минимальные, только для работы сервиса

### База данных
- **PostgreSQL**: автоматическая установка
- **База**: `casino`
- **Пользователь**: `casino_user`
- **Пароль**: генерируется автоматически

## 🔧 Управление сервисом

```bash
# Основные команды
sudo systemctl start casino-backend     # Запуск
sudo systemctl stop casino-backend      # Остановка
sudo systemctl restart casino-backend   # Перезапуск
sudo systemctl status casino-backend    # Статус

# Логи
sudo journalctl -u casino-backend -f    # Просмотр логов в реальном времени
sudo journalctl -u casino-backend -n 50 # Последние 50 строк

# Автозапуск
sudo systemctl enable casino-backend    # Включить автозапуск
sudo systemctl disable casino-backend   # Отключить автозапуск
```

## 🌐 Настройка Nginx (опционально)

```bash
# Копирование конфигурации
sudo cp deploy/nginx/casino-backend.conf /etc/nginx/sites-available/

# Редактирование домена
sudo nano /etc/nginx/sites-available/casino-backend.conf
# Заменить your-domain.com на ваш домен

# Активация
sudo ln -s /etc/nginx/sites-available/casino-backend.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🔄 Обновление

```bash
# Автоматическое обновление
sudo ./deploy/scripts/update.sh

# Ручное обновление
sudo systemctl stop casino-backend
sudo cp new_binary /opt/casino-backend/casino-server
sudo systemctl start casino-backend
```

## 🚨 Устранение неполадок

### Проверка подключения к API
```bash
curl http://localhost:8080/health
curl http://localhost:8080/api/roulette/sessions
```

### Проверка WebSocket
```bash
# Установить wscat
npm install -g wscat

# Тест WebSocket
wscat -c ws://localhost:8080/ws
```

### Проверка базы данных
```bash
sudo -u postgres psql -d casino -c "\dt"
```

### Проверка логов
```bash
# Логи приложения
sudo journalctl -u casino-backend -n 100

# Логи PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*.log

# Системные логи
sudo tail -f /var/log/syslog
```

## 📊 Мониторинг

### Производительность
```bash
# Использование ресурсов
top -p $(pgrep casino-server)
htop

# Сетевые соединения
sudo ss -tlnp | grep :8080

# Дисковое пространство
df -h
```

### Статус сервисов
```bash
sudo systemctl status casino-backend
sudo systemctl status postgresql
sudo systemctl status nginx  # если используется
```

## 🔒 Безопасность

### Firewall
```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable

# Если Nginx не используется
sudo ufw allow 8080/tcp    # Backend API
```

### SSL/TLS
```bash
# Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 📈 Оптимизация

### PostgreSQL
```bash
# Настройка для небольшого сервера
sudo nano /etc/postgresql/*/main/postgresql.conf

# Добавить:
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
```

### Системные лимиты
```bash
# Увеличить лимиты файловых дескрипторов
echo "casino soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "casino hard nofile 65536" | sudo tee -a /etc/security/limits.conf
```

## 🎯 Чек-лист

- [ ] Go бэкенд развернут и работает
- [ ] PostgreSQL настроен
- [ ] Systemd сервис активен
- [ ] Firewall настроен
- [ ] Nginx настроен (если нужен)
- [ ] SSL сертификат установлен (если нужен)
- [ ] Мониторинг настроен
- [ ] Бэкапы настроены

## 📞 Поддержка

При проблемах проверьте:
1. **Логи**: `sudo journalctl -u casino-backend -f`
2. **Статус**: `sudo systemctl status casino-backend`
3. **Сеть**: `curl http://localhost:8080/health`
4. **База данных**: `sudo systemctl status postgresql`

---

**🚀 Casino Backend готов к работе на Linux сервере!**

Подробная документация: `go-backend/DEPLOYMENT.md` 