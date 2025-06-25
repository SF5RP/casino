#!/bin/bash

# Casino Backend Uninstall Script
# Usage: sudo ./uninstall.sh

set -e

echo "🗑️ Uninstalling Casino Backend Service..."

# Configuration
SERVICE_NAME="casino-backend"
SERVICE_USER="casino"
INSTALL_DIR="/opt/casino-backend"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root (use sudo)"
   exit 1
fi

# Stop and disable service
if systemctl is-active --quiet $SERVICE_NAME; then
    log_info "Stopping service..."
    systemctl stop $SERVICE_NAME
fi

if systemctl is-enabled --quiet $SERVICE_NAME; then
    log_info "Disabling service..."
    systemctl disable $SERVICE_NAME
fi

# Remove service file
if [ -f "$SERVICE_FILE" ]; then
    log_info "Removing service file..."
    rm -f $SERVICE_FILE
    systemctl daemon-reload
fi

# Remove installation directory
if [ -d "$INSTALL_DIR" ]; then
    log_warn "Removing installation directory $INSTALL_DIR..."
    read -p "This will delete all application data. Continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf $INSTALL_DIR
        log_info "Installation directory removed"
    else
        log_info "Installation directory preserved"
    fi
fi

# Remove user (optional)
if id "$SERVICE_USER" &>/dev/null; then
    read -p "Remove user $SERVICE_USER? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        userdel $SERVICE_USER
        log_info "User $SERVICE_USER removed"
    else
        log_info "User $SERVICE_USER preserved"
    fi
fi

log_info "✅ Uninstallation completed!" 