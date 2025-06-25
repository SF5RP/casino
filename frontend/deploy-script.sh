#!/bin/bash

# Конфигурация
PROJECT_DIR="/var/www/roulette-app"
REPO_URL="https://github.com/your-username/your-repo.git"  # Замените на ваш репозиторий
BRANCH="main"
APP_NAME="roulette-app"
BACKUP_DIR="/var/backups/roulette-app"

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

# Проверка прав доступа
if [[ $EUID -eq 0 ]]; then
   error "Не запускайте этот скрипт от root!"
   exit 1
fi

log "🚀 Начинаем деплой приложения рулетки..."

# Создаем бэкап текущей версии
if [ -d "$PROJECT_DIR" ]; then
    log "📦 Создаем бэкап текущей версии..."
    sudo mkdir -p "$BACKUP_DIR"
    sudo cp -r "$PROJECT_DIR" "$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S)"
    log "✅ Бэкап создан"
fi

# Останавливаем приложение
log "🛑 Останавливаем приложение..."
pm2 stop $APP_NAME 2>/dev/null || true
pm2 delete $APP_NAME 2>/dev/null || true

# Клонируем или обновляем репозиторий
if [ ! -d "$PROJECT_DIR" ]; then
    log "📥 Клонируем репозиторий..."
    sudo git clone $REPO_URL $PROJECT_DIR
    sudo chown -R $USER:$USER $PROJECT_DIR
else
    log "🔄 Обновляем репозиторий..."
    cd $PROJECT_DIR
    git fetch origin
    git reset --hard origin/$BRANCH
    git clean -fd
fi

cd $PROJECT_DIR

# Устанавливаем зависимости
log "📦 Устанавливаем зависимости..."
npm ci --production

# Собираем приложение
log "🔨 Собираем приложение..."
npm run build

# Создаем конфигурацию PM2
log "⚙️ Создаем конфигурацию PM2..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: 'start-prod.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      APP_PORT: 3000,
      WS_PORT: 3002,
      NEXT_PUBLIC_WS_PORT: 3002,
      NEXT_PUBLIC_WS_HOST: '$(hostname -I | awk '{print $1}')',
      NEXT_PUBLIC_WS_PROTOCOL: 'ws'
    },
    error_file: '/var/log/pm2/roulette-error.log',
    out_file: '/var/log/pm2/roulette-out.log',
    log_file: '/var/log/pm2/roulette-combined.log',
    time: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G'
  }]
};
EOF

# Создаем директории для логов
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2

# Запускаем приложение
log "🚀 Запускаем приложение..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup | grep -E '^sudo' | bash

# Проверяем статус
sleep 5
if pm2 list | grep -q "$APP_NAME.*online"; then
    log "✅ Приложение успешно запущено!"
    log "🌐 Приложение доступно по адресу: http://$(hostname -I | awk '{print $1}'):3000"
    log "📡 WebSocket сервер: ws://$(hostname -I | awk '{print $1}'):3002"
else
    error "❌ Ошибка запуска приложения!"
    pm2 logs $APP_NAME --lines 20
    exit 1
fi

log "🎉 Деплой завершен успешно!" 