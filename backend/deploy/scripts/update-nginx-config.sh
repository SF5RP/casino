#!/bin/bash

# Скрипт для обновления конфигурации Nginx
# Использование: ./update-nginx-config.sh

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция логирования
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log "🔧 Обновляем конфигурацию Nginx..."

# Проверяем права доступа
if [[ $EUID -eq 0 ]]; then
   error "Не запускайте этот скрипт от root!"
   exit 1
fi

# Путь к конфигурации
CONFIG_FILE="/etc/nginx/sites-available/casino-backend"
BACKUP_FILE="/etc/nginx/sites-available/casino-backend.backup.$(date +%Y%m%d-%H%M%S)"

# Создаем бэкап текущей конфигурации
if [ -f "$CONFIG_FILE" ]; then
    log "📦 Создаем бэкап текущей конфигурации..."
    sudo cp "$CONFIG_FILE" "$BACKUP_FILE"
    log "✅ Бэкап создан: $BACKUP_FILE"
fi

# Копируем новую конфигурацию
log "📝 Копируем новую конфигурацию..."
sudo cp "$(dirname "$0")/../nginx/casino-backend.conf" "$CONFIG_FILE"

# Проверяем синтаксис конфигурации
log "🔍 Проверяем синтаксис конфигурации..."
if sudo nginx -t; then
    log "✅ Синтаксис конфигурации корректен"
else
    error "❌ Ошибка в синтаксисе конфигурации!"
    log "🔄 Восстанавливаем бэкап..."
    sudo cp "$BACKUP_FILE" "$CONFIG_FILE"
    exit 1
fi

# Перезагружаем Nginx
log "🔄 Перезагружаем Nginx..."
sudo systemctl reload nginx

# Проверяем статус Nginx
if sudo systemctl is-active --quiet nginx; then
    log "✅ Nginx успешно перезагружен"
else
    error "❌ Ошибка при перезагрузке Nginx!"
    log "🔄 Восстанавливаем бэкап..."
    sudo cp "$BACKUP_FILE" "$CONFIG_FILE"
    sudo systemctl reload nginx
    exit 1
fi

log "🎉 Конфигурация Nginx успешно обновлена!"

# Показываем статус сервисов
log "📊 Статус сервисов:"
echo "Nginx: $(sudo systemctl is-active nginx)"
echo "Frontend (PM2): $(pm2 list | grep casino-frontend | awk '{print $10}' || echo 'not found')"
echo "Backend: $(sudo systemctl is-active casino-backend || echo 'not found')"

log "🌐 Проверьте работу сайта: https://casino.aidew.ru"
