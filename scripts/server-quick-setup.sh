#!/bin/bash

# =================================================================
# Casino Quick Server Setup Script
# =================================================================
# Этот скрипт выполняет базовую настройку нового сервера
# для развертывания Casino приложения (Backend + Frontend)
#
# ТРЕБОВАНИЯ:
# - Чистый Ubuntu 20.04+ / Debian 11+ сервер
# - Root доступ
# - Подключение к интернету
#
# ИСПОЛЬЗОВАНИЕ:
#   wget https://raw.githubusercontent.com/YOUR_REPO/main/scripts/server-quick-setup.sh
#   chmod +x server-quick-setup.sh
#   sudo ./server-quick-setup.sh
# =================================================================

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Конфигурация
DEPLOY_USER="deploy"
GO_VERSION="1.22.0"
NODE_VERSION="20"

# Логирование
log_info() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_step() {
    echo -e "\n${BLUE}[→]${NC} $1\n"
}

# Проверка root
if [[ $EUID -ne 0 ]]; then
   log_error "Этот скрипт должен запускаться с правами root (используйте sudo)"
   exit 1
fi

echo "═══════════════════════════════════════════════════════"
echo "  🚀 Casino Server Quick Setup"
echo "═══════════════════════════════════════════════════════"
echo ""

# ===== Шаг 1: Обновление системы =====
log_step "Шаг 1: Обновление системы"
apt update && apt upgrade -y
apt install -y curl wget git build-essential htop net-tools
log_info "Система обновлена"

# ===== Шаг 2: Создание пользователя =====
log_step "Шаг 2: Создание пользователя deploy"
if id "$DEPLOY_USER" &>/dev/null; then
    log_warn "Пользователь $DEPLOY_USER уже существует"
else
    useradd -m -s /bin/bash $DEPLOY_USER
    log_info "Пользователь $DEPLOY_USER создан"
fi

# Добавление в sudo
usermod -aG sudo $DEPLOY_USER
echo "$DEPLOY_USER ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/$DEPLOY_USER
chmod 0440 /etc/sudoers.d/$DEPLOY_USER
log_info "Пользователь добавлен в sudo"

# Создание SSH директории
mkdir -p /home/$DEPLOY_USER/.ssh
chmod 700 /home/$DEPLOY_USER/.ssh
touch /home/$DEPLOY_USER/.ssh/authorized_keys
chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys
chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh
log_info "SSH директория создана"

# ===== Шаг 3: Настройка Firewall =====
log_step "Шаг 3: Настройка Firewall"
if command -v ufw &> /dev/null; then
    ufw --force enable
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw status
    log_info "UFW настроен (порты: 22, 80, 443)"
else
    log_warn "UFW не установлен, firewall не настроен"
fi

# ===== Шаг 4: PostgreSQL =====
log_step "Шаг 4: Установка PostgreSQL"
if command -v psql &> /dev/null; then
    log_warn "PostgreSQL уже установлен"
else
    apt install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
    log_info "PostgreSQL установлен и запущен"
fi

# Создание базы данных
log_info "Создание базы данных casino_db..."
DB_PASSWORD=$(openssl rand -base64 16)

sudo -u postgres psql << EOF
CREATE DATABASE casino_db;
CREATE USER casino_user WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE casino_db TO casino_user;
ALTER DATABASE casino_db OWNER TO casino_user;
EOF

log_info "База данных создана"
log_warn "Пароль БД: $DB_PASSWORD"
log_warn "СОХРАНИТЕ ЭТОТ ПАРОЛЬ!"
echo "$DB_PASSWORD" > /tmp/casino_db_password.txt
chmod 600 /tmp/casino_db_password.txt

# ===== Шаг 5: Go =====
log_step "Шаг 5: Установка Go $GO_VERSION"
if command -v go &> /dev/null; then
    INSTALLED_GO_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
    log_warn "Go уже установлен (версия: $INSTALLED_GO_VERSION)"
else
    cd /tmp
    wget -q https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz
    rm -rf /usr/local/go
    tar -C /usr/local -xzf go${GO_VERSION}.linux-amd64.tar.gz
    
    # Добавление в PATH
    if ! grep -q '/usr/local/go/bin' /etc/profile; then
        echo 'export PATH=$PATH:/usr/local/go/bin' >> /etc/profile
    fi
    
    export PATH=$PATH:/usr/local/go/bin
    log_info "Go ${GO_VERSION} установлен"
    go version
fi

# ===== Шаг 6: Node.js и npm =====
log_step "Шаг 6: Установка Node.js ${NODE_VERSION}.x"
if command -v node &> /dev/null; then
    INSTALLED_NODE_VERSION=$(node --version)
    log_warn "Node.js уже установлен (версия: $INSTALLED_NODE_VERSION)"
else
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt install -y nodejs
    log_info "Node.js ${NODE_VERSION}.x установлен"
    node --version
    npm --version
fi

# Установка PM2
if command -v pm2 &> /dev/null; then
    log_warn "PM2 уже установлен"
else
    npm install -g pm2
    log_info "PM2 установлен"
fi

# ===== Шаг 7: Nginx =====
log_step "Шаг 7: Установка Nginx"
if command -v nginx &> /dev/null; then
    log_warn "Nginx уже установлен"
else
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
    log_info "Nginx установлен и запущен"
fi

# ===== Шаг 8: Certbot =====
log_step "Шаг 8: Установка Certbot (для SSL)"
if command -v certbot &> /dev/null; then
    log_warn "Certbot уже установлен"
else
    apt install -y certbot python3-certbot-nginx
    log_info "Certbot установлен"
fi

# ===== Шаг 9: Создание директорий =====
log_step "Шаг 9: Создание директорий для приложения"
mkdir -p /opt/casino-backend
chown $DEPLOY_USER:$DEPLOY_USER /opt/casino-backend
log_info "/opt/casino-backend создана"

mkdir -p /home/$DEPLOY_USER/casino-backend
mkdir -p /home/$DEPLOY_USER/casino-frontend
chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/casino-backend
chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/casino-frontend
log_info "Директории пользователя созданы"

# ===== Финальный отчет =====
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ✅ Установка завершена успешно!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📋 Установленные компоненты:"
echo "   • PostgreSQL $(psql --version | head -n1 | awk '{print $3}')"
echo "   • Go $(go version | awk '{print $3}')"
echo "   • Node.js $(node --version)"
echo "   • npm $(npm --version)"
echo "   • PM2 $(pm2 --version)"
echo "   • Nginx $(nginx -v 2>&1 | awk '{print $3}')"
echo "   • Certbot $(certbot --version 2>&1 | head -n1 | awk '{print $2}')"
echo ""
echo "👤 Пользователь deploy:"
echo "   • Создан с правами sudo"
echo "   • SSH директория: /home/$DEPLOY_USER/.ssh"
echo ""
echo "🗄️  База данных:"
echo "   • Имя БД: casino_db"
echo "   • Пользователь: casino_user"
echo "   • Пароль: $DB_PASSWORD"
echo "   • (сохранен в: /tmp/casino_db_password.txt)"
echo ""
echo "📁 Директории:"
echo "   • Backend: /opt/casino-backend"
echo "   • Deploy: /home/$DEPLOY_USER/casino-backend"
echo "   • Frontend: /home/$DEPLOY_USER/casino-frontend"
echo ""
echo "🔥 Firewall:"
echo "   • Порты 22, 80, 443 открыты"
echo ""
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📝 Следующие шаги:"
echo ""
echo "1. Добавьте SSH публичный ключ для GitHub Actions:"
echo "   На локальной машине:"
echo "     ssh-keygen -t ed25519 -C 'github-actions' -f ~/.ssh/casino_deploy"
echo "     cat ~/.ssh/casino_deploy.pub"
echo ""
echo "   На сервере:"
echo "     echo 'ВАШ_ПУБЛИЧНЫЙ_КЛЮЧ' >> /home/$DEPLOY_USER/.ssh/authorized_keys"
echo ""
echo "2. Добавьте GitHub Secrets:"
echo "   • SSH_PRIVATE_KEY (содержимое ~/.ssh/casino_deploy)"
echo "   • SERVER_HOST (IP или домен сервера)"
echo "   • SERVER_USER (deploy)"
echo "   • DB_PASSWORD ($DB_PASSWORD)"
echo "   • JWT_SECRET (сгенерируйте: openssl rand -base64 32)"
echo "   • API_KEY (сгенерируйте: openssl rand -base64 32)"
echo ""
echo "3. Настройте домен и получите SSL сертификат:"
echo "   sudo certbot --nginx -d yourdomain.com"
echo ""
echo "4. Сделайте push в main ветку для автоматического деплоя"
echo ""
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📚 Полная документация:"
echo "   • docs/DEPLOYMENT_COMPLETE_GUIDE.md"
echo "   • docs/BACKEND_SECRETS_SETUP.md"
echo "   • docs/CI_CD_QUICK_START.md"
echo ""
echo "🆘 Проблемы? Проверьте логи:"
echo "   • Backend: sudo journalctl -u casino-backend -f"
echo "   • Frontend: pm2 logs casino-frontend"
echo "   • Nginx: sudo journalctl -u nginx -f"
echo ""
echo "═══════════════════════════════════════════════════════"
echo ""
log_info "Сервер готов к развертыванию Casino! 🎰"
echo ""



