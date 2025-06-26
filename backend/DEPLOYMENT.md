# 🚀 Развертывание Casino Backend на Linux сервере

Это руководство описывает процесс развертывания Go бэкенда как systemd сервис на Linux сервере.

## 📋 Требования

- **Операционная система**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **Go**: версия 1.19 или выше
- **PostgreSQL**: версия 12 или выше
- **Nginx**: для проксирования (опционально)
- **Права**: sudo доступ на сервере

## 🔧 Подготовка к развертыванию

### 1. Подготовка на локальной машине

```bash
# Перейти в папку Go backend
cd backend

# Собрать deployment пакет
make deploy-prep

# Архивировать для передачи на сервер
tar -czf casino-backend-deploy.tar.gz -C dist casino-backend
```

### 2. Передача на сервер

```bash
# Копирование на сервер (замените your-server.com на ваш сервер)
scp casino-backend-deploy.tar.gz user@your-server.com:~/

# Подключение к серверу
ssh user@your-server.com

# Распаковка
tar -xzf casino-backend-deploy.tar.gz
cd casino-backend
```

## 🐘 Установка PostgreSQL

### Автоматическая установка

```bash
# Запуск скрипта установки PostgreSQL
sudo ./deploy/scripts/setup-postgres.sh
```

### Ручная установка

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# CentOS/RHEL
sudo dnf install -y postgresql postgresql-server postgresql-contrib
sudo postgresql-setup --initdb

# Запуск и автозагрузка
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Создание базы данных
sudo -u postgres createdb casino
sudo -u postgres createuser casino_user
sudo -u postgres psql -c "ALTER USER casino_user WITH PASSWORD 'your_secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE casino TO casino_user;"
```

## 🔧 Установка Go (если не установлен)

```bash
# Скачать и установить Go
wget https://golang.org/dl/go1.21.5.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz

# Добавить в PATH
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# Проверить установку
go version
```

## 🚀 Установка Casino Backend

### Автоматическая установка

```bash
# Запуск скрипта установки
sudo ./deploy/scripts/install.sh
```

### Ручная установка

```bash
# Создать пользователя для сервиса
sudo useradd --system --no-create-home --shell /bin/false casino

# Создать директорию приложения
sudo mkdir -p /opt/casino-backend
sudo chown casino:casino /opt/casino-backend

# Собрать приложение
go build -o /opt/casino-backend/casino-server ./cmd/server/main.go
sudo chown casino:casino /opt/casino-backend/casino-server
sudo chmod +x /opt/casino-backend/casino-server

# Скопировать конфигурацию
sudo cp .env.example /opt/casino-backend/.env
sudo chown casino:casino /opt/casino-backend/.env
sudo chmod 600 /opt/casino-backend/.env

# Установить systemd сервис
sudo cp deploy/systemd/casino-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable casino-backend
```

## ⚙️ Конфигурация

### Настройка базы данных

```bash
# Редактировать конфигурацию
sudo nano /opt/casino-backend/.env
```

```env
# Database configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=casino_user
DB_PASSWORD=your_secure_password
DB_NAME=casino
DB_SSL_MODE=disable

# Server configuration
PORT=8080
```

### Настройка systemd сервиса

```bash
# Редактировать сервис (если нужно)
sudo nano /etc/systemd/system/casino-backend.service

# Применить изменения
sudo systemctl daemon-reload
```

## 🔥 Запуск сервиса

```bash
# Запустить сервис
sudo systemctl start casino-backend

# Проверить статус
sudo systemctl status casino-backend

# Просмотр логов
sudo journalctl -u casino-backend -f

# Автозапуск при загрузке системы
sudo systemctl enable casino-backend
```

## 🌐 Настройка Nginx (опционально)

### Установка Nginx

```bash
# Ubuntu/Debian
sudo apt install -y nginx

# CentOS/RHEL
sudo dnf install -y nginx

# Запуск
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Конфигурация

```bash
# Скопировать конфигурацию
sudo cp deploy/nginx/casino-backend.conf /etc/nginx/sites-available/

# Отредактировать домен
sudo nano /etc/nginx/sites-available/casino-backend.conf
# Заменить your-domain.com на ваш домен

# Активировать конфигурацию
sudo ln -s /etc/nginx/sites-available/casino-backend.conf /etc/nginx/sites-enabled/

# Проверить конфигурацию
sudo nginx -t

# Перезапустить Nginx
sudo systemctl restart nginx
```

## 🔒 Настройка firewall

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 8080/tcp    # Backend (если без Nginx)
sudo ufw enable

# Firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
```

## 📊 Мониторинг и логи

### Просмотр логов

```bash
# Логи сервиса
sudo journalctl -u casino-backend -f

# Логи Nginx
sudo tail -f /var/log/nginx/casino-backend.access.log
sudo tail -f /var/log/nginx/casino-backend.error.log

# Системные логи
sudo tail -f /var/log/syslog
```

### Мониторинг производительности

```bash
# Статус сервиса
sudo systemctl status casino-backend

# Использование ресурсов
top -p $(pgrep casino-server)
htop

# Сетевые соединения
sudo netstat -tlnp | grep :8080
sudo ss -tlnp | grep :8080
```

## 🔄 Обновление

### Автоматическое обновление

```bash
# Загрузить новую версию на сервер
scp casino-backend-deploy.tar.gz user@your-server.com:~/
ssh user@your-server.com

# Распаковать
tar -xzf casino-backend-deploy.tar.gz
cd casino-backend

# Запустить обновление
sudo ./deploy/scripts/update.sh
```

### Ручное обновление

```bash
# Остановить сервис
sudo systemctl stop casino-backend

# Создать бэкап
sudo cp /opt/casino-backend/casino-server /opt/casino-backend/casino-server.backup

# Собрать новую версию
go build -o /opt/casino-backend/casino-server ./cmd/server/main.go
sudo chown casino:casino /opt/casino-backend/casino-server

# Запустить сервис
sudo systemctl start casino-backend

# Проверить статус
sudo systemctl status casino-backend
```

## 🚨 Устранение неполадок

### Сервис не запускается

```bash
# Проверить логи
sudo journalctl -u casino-backend -n 50

# Проверить конфигурацию
sudo -u casino /opt/casino-backend/casino-server --help

# Проверить права доступа
ls -la /opt/casino-backend/
```

### Проблемы с базой данных

```bash
# Проверить подключение
sudo -u postgres psql -d casino -c "\dt"

# Проверить статус PostgreSQL
sudo systemctl status postgresql

# Проверить логи PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### Проблемы с сетью

```bash
# Проверить порты
sudo netstat -tlnp | grep :8080
sudo ss -tlnp | grep :8080

# Проверить firewall
sudo ufw status
sudo firewall-cmd --list-all

# Тест подключения
curl http://localhost:8080/health
curl http://your-domain.com/health
```

## 📈 Оптимизация производительности

### Настройки PostgreSQL

```bash
# Редактировать postgresql.conf
sudo nano /etc/postgresql/*/main/postgresql.conf

# Рекомендуемые настройки для небольшого сервера
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
```

### Настройки системы

```bash
# Увеличить лимиты файловых дескрипторов
echo "casino soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "casino hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# Настройки сети
echo "net.core.somaxconn = 65535" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65535" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## 🔐 SSL/TLS (HTTPS)

### Установка Let's Encrypt

```bash
# Установить Certbot
sudo apt install -y certbot python3-certbot-nginx

# Получить сертификат
sudo certbot --nginx -d your-domain.com

# Автоматическое обновление
sudo crontab -e
# Добавить: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📝 Полезные команды

```bash
# Управление сервисом
sudo systemctl start casino-backend    # Запустить
sudo systemctl stop casino-backend     # Остановить
sudo systemctl restart casino-backend  # Перезапустить
sudo systemctl reload casino-backend   # Перезагрузить конфиг
sudo systemctl status casino-backend   # Статус

# Логи
sudo journalctl -u casino-backend -f   # Следить за логами
sudo journalctl -u casino-backend -n 100  # Последние 100 строк
sudo journalctl -u casino-backend --since "1 hour ago"  # За последний час

# Производительность
htop                                   # Мониторинг системы
iotop                                  # Мониторинг I/O
nethogs                               # Мониторинг сети
```

## 🎯 Чек-лист развертывания

- [ ] PostgreSQL установлен и настроен
- [ ] Go установлен (версия 1.19+)
- [ ] Пользователь `casino` создан
- [ ] Приложение собрано и размещено в `/opt/casino-backend/`
- [ ] Конфигурация `.env` настроена
- [ ] Systemd сервис установлен и включен
- [ ] Firewall настроен
- [ ] Nginx настроен (если используется)
- [ ] SSL сертификат установлен (если нужен HTTPS)
- [ ] Логи проверены
- [ ] Мониторинг настроен

---

**🚀 Casino Backend готов к работе на продакшен сервере!** 