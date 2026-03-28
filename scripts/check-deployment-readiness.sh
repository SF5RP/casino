#!/bin/bash

# =================================================================
# Casino Deployment Readiness Check
# =================================================================
# Этот скрипт проверяет готовность сервера к развертыванию
# Casino приложения
#
# ИСПОЛЬЗОВАНИЕ:
#   chmod +x check-deployment-readiness.sh
#   ./check-deployment-readiness.sh
# =================================================================

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Счетчики
PASSED=0
FAILED=0
WARNINGS=0

# Функции проверки
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

section_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

echo "═══════════════════════════════════════════════════════"
echo "  🔍 Casino Deployment Readiness Check"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Дата проверки: $(date)"
echo "Hostname: $(hostname)"
echo "IP адрес: $(hostname -I | awk '{print $1}')"
echo ""

# ===== Проверка системы =====
section_header "1. Проверка системы"

# ОС
if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo "Операционная система: $NAME $VERSION"
    check_pass "ОС определена: $NAME $VERSION"
else
    check_fail "Не удалось определить ОС"
fi

# Версия ядра
KERNEL=$(uname -r)
echo "Версия ядра: $KERNEL"
check_pass "Ядро Linux: $KERNEL"

# Память
TOTAL_MEM=$(free -h | awk '/^Mem:/ {print $2}')
AVAILABLE_MEM=$(free -h | awk '/^Mem:/ {print $7}')
echo "Память: $TOTAL_MEM (доступно: $AVAILABLE_MEM)"

MEM_GB=$(free -g | awk '/^Mem:/ {print $2}')
if [ "$MEM_GB" -ge 2 ]; then
    check_pass "Память: $TOTAL_MEM (≥ 2GB)"
else
    check_warn "Память меньше рекомендуемого минимума (2GB): $TOTAL_MEM"
fi

# Диск
DISK_AVAIL=$(df -h / | awk 'NR==2 {print $4}')
echo "Доступно на диске: $DISK_AVAIL"

DISK_GB=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
if [ "$DISK_GB" -ge 20 ]; then
    check_pass "Доступно места на диске: $DISK_AVAIL (≥ 20GB)"
else
    check_warn "Мало места на диске: $DISK_AVAIL (рекомендуется ≥ 20GB)"
fi

# ===== Проверка пользователя =====
section_header "2. Проверка пользователя deploy"

if id "deploy" &>/dev/null; then
    check_pass "Пользователь deploy существует"
    
    # Проверка домашней директории
    if [ -d "/home/deploy" ]; then
        check_pass "Домашняя директория /home/deploy существует"
    else
        check_fail "Домашняя директория /home/deploy не найдена"
    fi
    
    # Проверка SSH директории
    if [ -d "/home/deploy/.ssh" ]; then
        check_pass "SSH директория существует"
        
        # Проверка authorized_keys
        if [ -f "/home/deploy/.ssh/authorized_keys" ]; then
            KEY_COUNT=$(wc -l < /home/deploy/.ssh/authorized_keys)
            if [ "$KEY_COUNT" -gt 0 ]; then
                check_pass "SSH ключи настроены ($KEY_COUNT ключей)"
            else
                check_warn "Файл authorized_keys пустой"
            fi
        else
            check_warn "Файл authorized_keys не найден"
        fi
    else
        check_fail "SSH директория не найдена"
    fi
    
    # Проверка sudo
    if groups deploy | grep -q sudo; then
        check_pass "Пользователь deploy в группе sudo"
    else
        check_fail "Пользователь deploy не в группе sudo"
    fi
else
    check_fail "Пользователь deploy не существует"
fi

# ===== Проверка ПО =====
section_header "3. Проверка установленного ПО"

# PostgreSQL
if command -v psql &> /dev/null; then
    PSQL_VERSION=$(psql --version | awk '{print $3}')
    check_pass "PostgreSQL установлен (версия: $PSQL_VERSION)"
    
    # Проверка статуса
    if systemctl is-active --quiet postgresql; then
        check_pass "PostgreSQL запущен"
    else
        check_fail "PostgreSQL не запущен"
    fi
    
    # Проверка БД
    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw casino_db; then
        check_pass "База данных casino_db существует"
    else
        check_warn "База данных casino_db не найдена"
    fi
else
    check_fail "PostgreSQL не установлен"
fi

# Go
if command -v go &> /dev/null; then
    GO_VERSION=$(go version | awk '{print $3}')
    check_pass "Go установлен (версия: $GO_VERSION)"
else
    check_fail "Go не установлен"
fi

# Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    check_pass "Node.js установлен (версия: $NODE_VERSION)"
else
    check_fail "Node.js не установлен"
fi

# npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    check_pass "npm установлен (версия: $NPM_VERSION)"
else
    check_fail "npm не установлен"
fi

# PM2
if command -v pm2 &> /dev/null; then
    PM2_VERSION=$(pm2 --version)
    check_pass "PM2 установлен (версия: $PM2_VERSION)"
else
    check_fail "PM2 не установлен"
fi

# Nginx
if command -v nginx &> /dev/null; then
    NGINX_VERSION=$(nginx -v 2>&1 | awk -F/ '{print $2}')
    check_pass "Nginx установлен (версия: $NGINX_VERSION)"
    
    # Проверка статуса
    if systemctl is-active --quiet nginx; then
        check_pass "Nginx запущен"
    else
        check_fail "Nginx не запущен"
    fi
else
    check_fail "Nginx не установлен"
fi

# Certbot
if command -v certbot &> /dev/null; then
    CERTBOT_VERSION=$(certbot --version 2>&1 | head -n1 | awk '{print $2}')
    check_pass "Certbot установлен (версия: $CERTBOT_VERSION)"
else
    check_warn "Certbot не установлен (требуется для SSL)"
fi

# ===== Проверка директорий =====
section_header "4. Проверка директорий приложения"

# Backend директории
if [ -d "/opt/casino-backend" ]; then
    check_pass "Директория /opt/casino-backend существует"
    
    # Проверка владельца
    OWNER=$(stat -c '%U' /opt/casino-backend)
    if [ "$OWNER" = "deploy" ]; then
        check_pass "Владелец /opt/casino-backend: deploy"
    else
        check_warn "Владелец /opt/casino-backend: $OWNER (ожидается: deploy)"
    fi
else
    check_warn "Директория /opt/casino-backend не найдена"
fi

if [ -d "/home/deploy/casino-backend" ]; then
    check_pass "Директория /home/deploy/casino-backend существует"
else
    check_warn "Директория /home/deploy/casino-backend не найдена"
fi

# Frontend директории
if [ -d "/home/deploy/casino-frontend" ]; then
    check_pass "Директория /home/deploy/casino-frontend существует"
else
    check_warn "Директория /home/deploy/casino-frontend не найдена"
fi

# ===== Проверка конфигурации =====
section_header "5. Проверка конфигурации"

# Backend .env
if [ -f "/opt/casino-backend/.env" ]; then
    check_pass "Файл /opt/casino-backend/.env существует"
    
    # Проверка прав
    PERMS=$(stat -c '%a' /opt/casino-backend/.env)
    if [ "$PERMS" = "600" ]; then
        check_pass "Права на .env файл: 600"
    else
        check_warn "Права на .env файл: $PERMS (рекомендуется: 600)"
    fi
else
    check_warn "Файл /opt/casino-backend/.env не найден"
fi

# Systemd сервис
if [ -f "/etc/systemd/system/casino-backend.service" ]; then
    check_pass "Systemd сервис casino-backend.service существует"
    
    # Проверка статуса
    if systemctl is-enabled --quiet casino-backend 2>/dev/null; then
        check_pass "Сервис casino-backend включен (автозапуск)"
        
        if systemctl is-active --quiet casino-backend 2>/dev/null; then
            check_pass "Сервис casino-backend запущен"
        else
            check_warn "Сервис casino-backend не запущен"
        fi
    else
        check_warn "Сервис casino-backend не включен"
    fi
else
    check_warn "Systemd сервис casino-backend.service не найден"
fi

# Nginx конфигурация
if [ -f "/etc/nginx/sites-available/casino" ]; then
    check_pass "Nginx конфигурация casino существует"
    
    if [ -L "/etc/nginx/sites-enabled/casino" ]; then
        check_pass "Nginx конфигурация casino активна"
    else
        check_warn "Nginx конфигурация casino не активирована"
    fi
else
    check_warn "Nginx конфигурация casino не найдена"
fi

# ===== Проверка сети =====
section_header "6. Проверка сети и портов"

# Firewall
if command -v ufw &> /dev/null; then
    if ufw status | grep -q "Status: active"; then
        check_pass "UFW активен"
        
        # Проверка правил
        if ufw status | grep -q "22/tcp"; then
            check_pass "UFW: порт 22 (SSH) открыт"
        else
            check_warn "UFW: порт 22 (SSH) не открыт"
        fi
        
        if ufw status | grep -q "80/tcp"; then
            check_pass "UFW: порт 80 (HTTP) открыт"
        else
            check_warn "UFW: порт 80 (HTTP) не открыт"
        fi
        
        if ufw status | grep -q "443/tcp"; then
            check_pass "UFW: порт 443 (HTTPS) открыт"
        else
            check_warn "UFW: порт 443 (HTTPS) не открыт"
        fi
    else
        check_warn "UFW не активен"
    fi
else
    check_warn "UFW не установлен"
fi

# Проверка портов
if netstat -tuln 2>/dev/null | grep -q ":80 "; then
    check_pass "Порт 80 прослушивается"
else
    check_warn "Порт 80 не прослушивается"
fi

if netstat -tuln 2>/dev/null | grep -q ":443 "; then
    check_pass "Порт 443 прослушивается (HTTPS)"
else
    check_warn "Порт 443 не прослушивается (SSL не настроен)"
fi

# ===== Проверка сервисов =====
section_header "7. Проверка работы сервисов"

# Backend
if curl -sf http://localhost:8011/health > /dev/null 2>&1; then
    check_pass "Backend отвечает на http://localhost:8011/health"
else
    check_warn "Backend не отвечает на http://localhost:8011/health"
fi

# Frontend
if curl -sf http://localhost:3000 > /dev/null 2>&1; then
    check_pass "Frontend отвечает на http://localhost:3000"
else
    check_warn "Frontend не отвечает на http://localhost:3000"
fi

# Nginx
if curl -sf http://localhost > /dev/null 2>&1; then
    check_pass "Nginx отвечает на http://localhost"
else
    check_warn "Nginx не отвечает на http://localhost"
fi

# ===== Итоговый отчет =====
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  📊 Результаты проверки"
echo "═══════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}✓ Пройдено: $PASSED${NC}"
echo -e "${RED}✗ Провалено: $FAILED${NC}"
echo -e "${YELLOW}⚠ Предупреждений: $WARNINGS${NC}"
echo ""

TOTAL=$((PASSED + FAILED + WARNINGS))
SCORE=$((PASSED * 100 / TOTAL))

echo "Общий балл: $SCORE%"
echo ""

if [ $FAILED -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}✅ Сервер полностью готов к развертыванию!${NC}"
    else
        echo -e "${YELLOW}⚠️  Сервер готов к развертыванию, но есть предупреждения${NC}"
        echo "Рекомендуется устранить предупреждения для оптимальной работы"
    fi
else
    echo -e "${RED}❌ Сервер НЕ готов к развертыванию${NC}"
    echo "Необходимо устранить критические проблемы (отмечены ✗)"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo ""

# Рекомендации
if [ $FAILED -gt 0 ] || [ $WARNINGS -gt 0 ]; then
    echo "📝 Рекомендации:"
    echo ""
    
    if [ $FAILED -gt 0 ]; then
        echo "Для устранения критических проблем выполните:"
        echo "  sudo ./server-quick-setup.sh"
        echo ""
    fi
    
    if [ $WARNINGS -gt 0 ]; then
        echo "Для получения подробной инструкции смотрите:"
        echo "  docs/DEPLOYMENT_COMPLETE_GUIDE.md"
        echo ""
    fi
fi

exit 0



