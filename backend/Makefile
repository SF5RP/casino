# Casino Roulette Backend Makefile

.PHONY: build run test clean deps help deploy grpc-client grpc-gen

# Variables
BINARY_NAME=casino-server
MAIN_PATH=./cmd/server/main.go
CLIENT_NAME=casino-client
CLIENT_PATH=./cmd/client/main.go

# Default target
help:
	@echo "Casino Roulette Backend Commands:"
	@echo "  make build         - Build the application"
	@echo "  make run           - Run the application"
	@echo "  make test          - Run tests"
	@echo "  make clean         - Clean build artifacts"
	@echo "  make deps          - Download dependencies"
	@echo "  make deploy-prep   - Prepare deployment files"
	@echo "  make grpc-gen      - Generate gRPC code from proto files"
	@echo "  make grpc-client   - Build gRPC client"
	@echo "  make grpc-test     - Test gRPC client"

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

# Generate gRPC code from proto files
grpc-gen:
	@echo "Generating gRPC code..."
	export PATH=$$PATH:$$(go env GOPATH)/bin && \
	protoc --go_out=. --go_opt=paths=source_relative \
		--go-grpc_out=. --go-grpc_opt=paths=source_relative \
		proto/roulette.proto

# Build gRPC client
grpc-client:
	@echo "Building gRPC client..."
	go build -o $(CLIENT_NAME) $(CLIENT_PATH)

# Test gRPC client (requires server to be running)
grpc-test:
	@echo "Testing gRPC client..."
	@if [ ! -f $(CLIENT_NAME) ]; then make grpc-client; fi
	./$(CLIENT_NAME)

# Run both server and client for testing
grpc-demo:
	@echo "Starting gRPC demo..."
	@echo "Server will start on port 8011 (HTTP) and 8012 (gRPC)"
	@echo "Client will connect and demonstrate all features"
	@echo ""
	@echo "Starting server in background..."
	@make run &
	@SERVER_PID=$$!; \
	sleep 3; \
	echo "Starting client..."; \
	make grpc-test; \
	echo "Stopping server..."; \
	kill $$SERVER_PID