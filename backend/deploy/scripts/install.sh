#!/bin/bash

# Casino Backend Installation Script
# Usage: sudo ./install.sh

set -e

echo "🚀 Installing Casino Backend Service..."

# Configuration
SERVICE_NAME="casino-backend"
SERVICE_USER="casino"
SERVICE_GROUP="casino"
INSTALL_DIR="/opt/casino-backend"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
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

# Check if Go is installed
if ! command -v go &> /dev/null; then
    log_error "Go is not installed. Please install Go first."
    exit 1
fi

log_info "Go version: $(go version)"

# Create service user and group
if ! id "$SERVICE_USER" &>/dev/null; then
    log_info "Creating user $SERVICE_USER..."
    useradd --system --no-create-home --shell /bin/false $SERVICE_USER
else
    log_info "User $SERVICE_USER already exists"
fi

# Create installation directory
log_info "Creating installation directory..."
mkdir -p $INSTALL_DIR
chown $SERVICE_USER:$SERVICE_GROUP $INSTALL_DIR

# Build the application
log_info "Building application..."
cd "$(dirname "$0")/../.."
go build -o $INSTALL_DIR/$BINARY_NAME ./cmd/server/main.go

# Set permissions
chmod +x $INSTALL_DIR/$BINARY_NAME
chown $SERVICE_USER:$SERVICE_GROUP $INSTALL_DIR/$BINARY_NAME

# Copy environment file
if [ -f ".env.example" ]; then
    log_info "Copying environment configuration..."
    cp .env.example $INSTALL_DIR/.env
    chown $SERVICE_USER:$SERVICE_GROUP $INSTALL_DIR/.env
    chmod 600 $INSTALL_DIR/.env
    
    log_warn "Please edit $INSTALL_DIR/.env with your database credentials"
fi

# Install systemd service
log_info "Installing systemd service..."
cp deploy/systemd/${SERVICE_NAME}.service $SERVICE_FILE

# Reload systemd and enable service
log_info "Configuring systemd service..."
systemctl daemon-reload
systemctl enable $SERVICE_NAME

log_info "✅ Installation completed!"
echo
log_info "Next steps:"
echo "1. Edit database configuration: sudo nano $INSTALL_DIR/.env"
echo "2. Start the service: sudo systemctl start $SERVICE_NAME"
echo "3. Check status: sudo systemctl status $SERVICE_NAME"
echo "4. View logs: sudo journalctl -u $SERVICE_NAME -f"
echo
log_warn "Don't forget to configure your database and firewall!" 