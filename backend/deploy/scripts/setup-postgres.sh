#!/bin/bash

# PostgreSQL Setup Script for Casino Backend
# Usage: sudo ./setup-postgres.sh

set -e

echo "🐘 Setting up PostgreSQL for Casino Backend..."

# Configuration
DB_NAME="casino"
DB_USER="casino_user"
DB_PASSWORD=""

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

# Generate random password if not provided
if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD=$(openssl rand -base64 32)
    log_info "Generated random password for database user"
fi

# Install PostgreSQL if not installed
if ! command -v psql &> /dev/null; then
    log_info "Installing PostgreSQL..."
    
    # Update package list
    apt update
    
    # Install PostgreSQL
    apt install -y postgresql postgresql-contrib
    
    # Start and enable PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql
    
    log_info "PostgreSQL installed and started"
else
    log_info "PostgreSQL is already installed"
fi

# Check if PostgreSQL is running
if ! systemctl is-active --quiet postgresql; then
    log_info "Starting PostgreSQL..."
    systemctl start postgresql
fi

# Create database and user
log_info "Creating database and user..."

# Switch to postgres user and run commands
sudo -u postgres psql << EOF
-- Create database
CREATE DATABASE $DB_NAME;

-- Create user
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;

-- Grant schema privileges
\c $DB_NAME
GRANT ALL ON SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;

\q
EOF

# Configure PostgreSQL for local connections
log_info "Configuring PostgreSQL..."

# Find PostgreSQL config directory
PG_VERSION=$(sudo -u postgres psql -t -c "SELECT version();" | grep -oP '\d+\.\d+' | head -1)
PG_CONFIG_DIR="/etc/postgresql/$PG_VERSION/main"

if [ ! -d "$PG_CONFIG_DIR" ]; then
    # Try alternative path
    PG_CONFIG_DIR="/etc/postgresql"
    if [ ! -d "$PG_CONFIG_DIR" ]; then
        log_warn "Could not find PostgreSQL config directory"
        log_warn "You may need to manually configure pg_hba.conf"
    fi
fi

# Backup original config
if [ -f "$PG_CONFIG_DIR/pg_hba.conf" ]; then
    cp "$PG_CONFIG_DIR/pg_hba.conf" "$PG_CONFIG_DIR/pg_hba.conf.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Add local connection for casino user
    if ! grep -q "$DB_USER" "$PG_CONFIG_DIR/pg_hba.conf"; then
        echo "local   $DB_NAME   $DB_USER   md5" >> "$PG_CONFIG_DIR/pg_hba.conf"
        log_info "Added local connection configuration"
    fi
fi

# Restart PostgreSQL to apply changes
log_info "Restarting PostgreSQL..."
systemctl restart postgresql

# Test connection
log_info "Testing database connection..."
if sudo -u postgres psql -d $DB_NAME -c "\dt" > /dev/null 2>&1; then
    log_info "✅ Database connection successful!"
else
    log_error "❌ Database connection failed"
    exit 1
fi

# Create .env file with database credentials
ENV_FILE="/opt/casino-backend/.env"
if [ ! -f "$ENV_FILE" ]; then
    mkdir -p /opt/casino-backend
    cat > "$ENV_FILE" << EOF
# Database configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
DB_SSL_MODE=disable

# Server configuration
PORT=8080
EOF
    
    chown casino:casino "$ENV_FILE" 2>/dev/null || true
    chmod 600 "$ENV_FILE"
    
    log_info "Created environment file: $ENV_FILE"
fi

# Display connection information
log_info "📋 Database Configuration:"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Password: $DB_PASSWORD"
echo "  Host: localhost"
echo "  Port: 5432"
echo
log_warn "⚠️  Save these credentials securely!"
log_info "✅ PostgreSQL setup completed!"

# Show next steps
echo
log_info "Next steps:"
echo "1. Install the casino backend service: sudo ./install.sh"
echo "2. Start the service: sudo systemctl start casino-backend"
echo "3. Check logs: sudo journalctl -u casino-backend -f" 