#!/bin/bash

# Quick Deployment Preparation Script
# Usage: ./deploy.sh

set -e

echo "🚀 Preparing Casino Backend for deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if Go is installed
if ! command -v go &> /dev/null; then
    log_error "Go is not installed. Please install Go first."
    exit 1
fi

log_info "Go version: $(go version)"

# Clean previous builds
log_step "Cleaning previous builds..."
rm -rf dist/
go clean

# Create deployment package
log_step "Creating deployment package..."
make deploy-prep

# Create archive
log_step "Creating deployment archive..."
cd dist
tar -czf casino-backend-deploy.tar.gz casino-backend/
cd ..

# Move archive to root
mv dist/casino-backend-deploy.tar.gz ./

# Display package contents
log_info "📦 Deployment package contents:"
tar -tzf casino-backend-deploy.tar.gz | head -20
if [ $(tar -tzf casino-backend-deploy.tar.gz | wc -l) -gt 20 ]; then
    echo "... and $(( $(tar -tzf casino-backend-deploy.tar.gz | wc -l) - 20 )) more files"
fi

# Display package size
PACKAGE_SIZE=$(du -h casino-backend-deploy.tar.gz | cut -f1)
log_info "📏 Package size: $PACKAGE_SIZE"

# Display next steps
echo
log_info "✅ Deployment package ready: casino-backend-deploy.tar.gz"
echo
echo -e "${BLUE}Next steps:${NC}"
echo "1. Transfer to server: scp casino-backend-deploy.tar.gz user@your-server.com:~/"
echo "2. SSH to server: ssh user@your-server.com"
echo "3. Extract: tar -xzf casino-backend-deploy.tar.gz && cd casino-backend"
echo "4. Setup PostgreSQL: sudo ./deploy/scripts/setup-postgres.sh"
echo "5. Install service: sudo ./deploy/scripts/install.sh"
echo "6. Start service: sudo systemctl start casino-backend"
echo
echo -e "${YELLOW}📖 For detailed instructions, see: deploy/DEPLOYMENT.md${NC}" 