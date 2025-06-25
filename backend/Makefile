# Casino Roulette Backend Makefile

.PHONY: build run test clean deps help deploy

# Variables
BINARY_NAME=casino-server
MAIN_PATH=./cmd/server/main.go

# Default target
help:
	@echo "Casino Roulette Backend Commands:"
	@echo "  make build         - Build the application"
	@echo "  make run           - Run the application"
	@echo "  make test          - Run tests"
	@echo "  make clean         - Clean build artifacts"
	@echo "  make deps          - Download dependencies"
	@echo "  make deploy-prep   - Prepare deployment files"

# Build the application
build:
	@echo "Building $(BINARY_NAME)..."
	go build -o $(BINARY_NAME) $(MAIN_PATH)

# Run the application
run:
	@echo "Running application..."
	go run $(MAIN_PATH)

# Run without database (for testing)
run-no-db:
	@echo "Running application without database..."
	export DB_HOST=skip && go run $(MAIN_PATH)

# Install dependencies
deps:
	@echo "Downloading dependencies..."
	go mod download
	go mod tidy

# Run tests
test:
	@echo "Running tests..."
	go test ./...

# Clean build artifacts
clean:
	@echo "Cleaning..."
	rm -f $(BINARY_NAME)
	go clean

# Setup development environment
setup:
	@echo "Setting up development environment..."
	cp .env.example .env
	@echo "Please edit .env file with your database credentials"

# Prepare deployment package
deploy-prep:
	@echo "Preparing deployment package..."
	mkdir -p dist/casino-backend
	go build -o dist/casino-backend/$(BINARY_NAME) $(MAIN_PATH)
	cp -r deploy dist/casino-backend/
	cp .env.example dist/casino-backend/
	cp README.md dist/casino-backend/
	@echo "Deployment package ready in dist/casino-backend/"

# Format code
fmt:
	@echo "Formatting code..."
	go fmt ./...

# Lint code (requires golangci-lint)
lint:
	@echo "Linting code..."
	golangci-lint run

# Install development tools
tools:
	@echo "Installing development tools..."
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest 