#!/bin/bash

# Casino Backend Update Script
# Usage: sudo ./update.sh

set -e

echo "🔄 Updating Casino Backend Service..."

# Configuration
SERVICE_NAME="casino-backend"
SERVICE_USER="casino"
INSTALL_DIR="/opt/casino-backend"
BINARY_NAME="casino-server"

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

# Check if service exists
if [ ! -f "/etc/systemd/system/${SERVICE_NAME}.service" ]; then
    log_error "Service not installed. Run install.sh first."
    exit 1
fi

# Check if Go is installed
if ! command -v go &> /dev/null; then
    log_error "Go is not installed. Please install Go first."
    exit 1
fi

log_info "Go version: $(go version)"

# Stop service
log_info "Stopping service..."
systemctl stop $SERVICE_NAME

# Backup current binary
if [ -f "$INSTALL_DIR/$BINARY_NAME" ]; then
    log_info "Backing up current binary..."
    cp $INSTALL_DIR/$BINARY_NAME $INSTALL_DIR/${BINARY_NAME}.backup.$(date +%Y%m%d_%H%M%S)
fi

# Build new version
log_info "Building new version..."
cd "$(dirname "$0")/../.."
go build -o $INSTALL_DIR/$BINARY_NAME ./cmd/server/main.go

# Set permissions
chmod +x $INSTALL_DIR/$BINARY_NAME
chown $SERVICE_USER:$SERVICE_USER $INSTALL_DIR/$BINARY_NAME

# Update systemd service if changed
log_info "Updating systemd service..."
cp deploy/systemd/${SERVICE_NAME}.service /etc/systemd/system/
systemctl daemon-reload

# Start service
log_info "Starting service..."
systemctl start $SERVICE_NAME

# Check status
sleep 2
if systemctl is-active --quiet $SERVICE_NAME; then
    log_info "✅ Update completed successfully!"
    log_info "Service status: $(systemctl is-active $SERVICE_NAME)"
else
    log_error "❌ Service failed to start after update"
    log_error "Check logs: sudo journalctl -u $SERVICE_NAME -n 50"
    
    # Offer to rollback
    if [ -f "$INSTALL_DIR/${BINARY_NAME}.backup."* ]; then
        read -p "Rollback to previous version? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "Rolling back..."
            BACKUP_FILE=$(ls -t $INSTALL_DIR/${BINARY_NAME}.backup.* | head -1)
            cp $BACKUP_FILE $INSTALL_DIR/$BINARY_NAME
            systemctl start $SERVICE_NAME
            log_info "Rollback completed"
        fi
    fi
    exit 1
fi

log_info "Service logs (last 10 lines):"
journalctl -u $SERVICE_NAME -n 10 --no-pager 