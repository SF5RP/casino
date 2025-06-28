package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"casino-backend/internal/database"
	"casino-backend/internal/handlers"
	"casino-backend/pkg/websocket"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
)

func main() {
	// Check for CLI commands
	if len(os.Args) > 1 {
		command := os.Args[1]
		if command != "server" && command != "start" {
			handleCLICommands()
			return
		}
	}

	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using default values")
	}

	var repo database.RouletteRepositoryInterface
	db, err := database.Connect()
	if err != nil {
		log.Printf("⚠️ Could not connect to database, falling back to in-memory store: %v", err)
		repo = database.NewMemoryRepository()
	} else {
		log.Println("✅ Successfully connected to the database")
		defer db.Close()

		// Test database connection
		if err := db.Ping(); err != nil {
			log.Printf("Database connection test failed, falling back to in-memory store: %v", err)
			repo = database.NewMemoryRepository()
		} else {
			// Run database migrations
			if err := db.RunMigrations(); err != nil {
				log.Printf("Failed to run database migrations, falling back to in-memory store: %v", err)
				repo = database.NewMemoryRepository()
			} else {
				log.Println("✅ Database migrations completed successfully")
				repo = database.NewRouletteRepository(db)
			}
		}
	}

	log.Printf("Using repository: %s", repo.Info())

	// Start periodic health check
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		
		for {
			select {
			case <-ticker.C:
				if err := repo.Ping(); err != nil {
					log.Printf("Repository health check failed: %v", err)
				}
			}
		}
	}()

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "your-default-super-secret-key-for-dev" // НЕ ИСПОЛЬЗОВАТЬ В ПРОДЕ
		log.Println("⚠️ JWT_SECRET not set, using default insecure key")
	}

	// Create WebSocket hub
	wsHub := websocket.NewHub(repo, []byte(jwtSecret))
	go wsHub.Run()

	// Create handlers
	rouletteHandler := handlers.NewRouletteHandler(repo, jwtSecret)
	adminHandler := handlers.NewAdminHandler(repo, wsHub)

	// Setup routes
	router := mux.NewRouter()

	// API routes
	api := router.PathPrefix("/api").Subrouter()

	// Register roulette routes
	rouletteHandler.RegisterRoutes(api)

	// Admin API routes
	adminHandler.RegisterAdminRoutes(router)

	// WebSocket route
	router.HandleFunc("/ws", wsHub.HandleWebSocket)

	// Health check endpoint
	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		
		// Check repository health
		repoStats := repo.GetStats()
		repoStatus := repoStats["status"].(string)
		
		// Overall health status
		overallStatus := "ok"
		statusCode := http.StatusOK
		
		if repoStatus != "active" {
			overallStatus = "degraded"
			statusCode = http.StatusServiceUnavailable
		}
		
		// Build response
		response := map[string]interface{}{
			"status":     overallStatus,
			"timestamp":  time.Now().UTC().Format(time.RFC3339),
			"repository": repoStats,
			"info":       repo.Info(),
		}
		
		// Add migration status if database is available
		if db != nil {
			if migrationStatus, err := db.GetMigrationStatus(); err == nil {
				response["migrations"] = migrationStatus
			}
		}
		
		// Convert to JSON
		jsonData, err := json.Marshal(response)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(`{"status":"error","message":"Failed to generate health response"}`))
			return
		}
		
		w.WriteHeader(statusCode)
		w.Write(jsonData)
	}).Methods("GET")

	// Static files (optional, for serving frontend)
	// router.PathPrefix("/").Handler(http.FileServer(http.Dir("./static/")))

	// CORS middleware
	router.Use(corsMiddleware)

	// Get port from environment or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Start server
	log.Printf("Server starting on port %s", port)
	log.Printf("WebSocket endpoint: ws://localhost:%s/ws", port)
	log.Printf("API endpoint: http://localhost:%s/api", port)
	log.Printf("Health check: http://localhost:%s/health", port)

	// Setup graceful shutdown
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	go func() {
		if err := http.ListenAndServe(":"+port, router); err != nil {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Wait for interrupt signal
	<-c
	log.Println("Shutting down server...")
}

// handleCLICommands processes command line arguments
func handleCLICommands() {
	command := os.Args[1]

	// Load environment variables for CLI commands
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using default values")
	}

	switch command {
	case "migrate":
		handleMigrateCommand()
	case "rollback":
		handleRollbackCommand()
	case "migration-status":
		handleMigrationStatusCommand()
	case "reset-migrations":
		handleResetMigrationsCommand()
	case "help", "--help", "-h":
		printHelp()
	default:
		fmt.Printf("Unknown command: %s\n", command)
		printHelp()
		os.Exit(1)
	}
}

// handleMigrateCommand runs database migrations
func handleMigrateCommand() {
	db, err := database.Connect()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	log.Println("Running database migrations...")
	if err := db.RunMigrations(); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Show final status
	status, err := db.GetMigrationStatus()
	if err != nil {
		log.Printf("Failed to get migration status: %v", err)
		return
	}

	fmt.Printf("Migrations completed successfully!\n")
	fmt.Printf("Applied: %d/%d migrations\n", status.AppliedMigrations, status.TotalMigrations)
	fmt.Printf("Current version: %d\n", status.CurrentVersion)
}

// handleRollbackCommand rolls back migrations
func handleRollbackCommand() {
	if len(os.Args) < 3 {
		fmt.Println("Usage: casino-backend rollback <steps>")
		os.Exit(1)
	}

	steps, err := strconv.Atoi(os.Args[2])
	if err != nil || steps < 1 {
		fmt.Println("Steps must be a positive integer")
		os.Exit(1)
	}

	db, err := database.Connect()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	log.Printf("Rolling back %d migrations...", steps)
	if err := db.RollbackMigrations(steps); err != nil {
		log.Fatalf("Failed to rollback migrations: %v", err)
	}

	// Show final status
	status, err := db.GetMigrationStatus()
	if err != nil {
		log.Printf("Failed to get migration status: %v", err)
		return
	}

	fmt.Printf("Rollback completed successfully!\n")
	fmt.Printf("Applied: %d/%d migrations\n", status.AppliedMigrations, status.TotalMigrations)
	fmt.Printf("Current version: %d\n", status.CurrentVersion)
}

// handleResetMigrationsCommand resets all migrations
func handleResetMigrationsCommand() {
	fmt.Printf("⚠️  WARNING: This will drop all tables and reset all migrations!\n")
	fmt.Printf("Are you sure you want to continue? (yes/no): ")
	
	var response string
	fmt.Scanln(&response)
	
	if response != "yes" {
		fmt.Println("Operation cancelled.")
		return
	}

	db, err := database.Connect()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	log.Println("Resetting all migrations...")
	
	// Get all applied migrations and rollback them all
	status, err := db.GetMigrationStatus()
	if err != nil {
		log.Fatalf("Failed to get migration status: %v", err)
	}

	if status.AppliedMigrations > 0 {
		log.Printf("Rolling back %d applied migrations...", status.AppliedMigrations)
		if err := db.RollbackMigrations(status.AppliedMigrations); err != nil {
			log.Fatalf("Failed to rollback migrations: %v", err)
		}
	}

	// Drop schema_migrations table to completely reset
	if _, err := db.Exec("DROP TABLE IF EXISTS schema_migrations"); err != nil {
		log.Printf("Warning: Failed to drop schema_migrations table: %v", err)
	}

	fmt.Printf("✅ All migrations have been reset successfully!\n")
	fmt.Printf("You can now run 'casino-backend migrate' to apply migrations from scratch.\n")
}

// handleMigrationStatusCommand shows migration status
func handleMigrationStatusCommand() {
	db, err := database.Connect()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	status, err := db.GetMigrationStatus()
	if err != nil {
		log.Fatalf("Failed to get migration status: %v", err)
	}

	fmt.Printf("Migration Status:\n")
	fmt.Printf("================\n")
	fmt.Printf("Total migrations: %d\n", status.TotalMigrations)
	fmt.Printf("Applied migrations: %d\n", status.AppliedMigrations)
	fmt.Printf("Pending migrations: %d\n", status.PendingMigrations)
	fmt.Printf("Current version: %d\n", status.CurrentVersion)
	fmt.Printf("Latest version: %d\n", status.LatestVersion)

	if len(status.AppliedVersions) > 0 {
		fmt.Printf("Applied versions: %v\n", status.AppliedVersions)
	}

	if len(status.PendingVersions) > 0 {
		fmt.Printf("Pending versions: %v\n", status.PendingVersions)
	}

	// Show detailed migration list
	migrationManager := database.NewMigrationManager(db)
	migrations := migrationManager.GetMigrations()
	appliedMap := make(map[int]bool)
	for _, version := range status.AppliedVersions {
		appliedMap[version] = true
	}

	fmt.Printf("\nDetailed Migration List:\n")
	fmt.Printf("========================\n")
	for _, migration := range migrations {
		statusStr := "PENDING"
		if appliedMap[migration.Version] {
			statusStr = "APPLIED"
		}
		fmt.Printf("Version %d: %s [%s]\n", migration.Version, migration.Description, statusStr)
	}
}

// printHelp displays usage information
func printHelp() {
	fmt.Printf("Casino Backend Server\n")
	fmt.Printf("====================\n\n")
	fmt.Printf("Usage:\n")
	fmt.Printf("  casino-backend                    Start the server\n")
	fmt.Printf("  casino-backend migrate            Run pending migrations\n")
	fmt.Printf("  casino-backend rollback <steps>   Rollback N migrations\n")
	fmt.Printf("  casino-backend migration-status   Show migration status\n")
	fmt.Printf("  casino-backend reset-migrations   Reset all migrations (DANGER!)\n")
	fmt.Printf("  casino-backend help               Show this help\n\n")
	fmt.Printf("Environment Variables:\n")
	fmt.Printf("  DB_HOST        Database host (default: localhost)\n")
	fmt.Printf("  DB_PORT        Database port (default: 5432)\n")
	fmt.Printf("  DB_USER        Database user (default: casino_user)\n")
	fmt.Printf("  DB_PASSWORD    Database password (default: casino_password)\n")
	fmt.Printf("  DB_NAME        Database name (default: casino_db)\n")
	fmt.Printf("  DB_SSL_MODE    SSL mode (default: disable)\n")
	fmt.Printf("  PORT           Server port (default: 8080)\n\n")
	fmt.Printf("API Endpoints:\n")
	fmt.Printf("  GET  /health                      Health check\n")
	fmt.Printf("  GET  /api/migrations/status       Migration status\n")
	fmt.Printf("  GET  /api/migrations/list         List all migrations\n")
	fmt.Printf("  POST /api/migrations/up           Run pending migrations\n")
	fmt.Printf("  POST /api/migrations/down/{steps} Rollback migrations\n")
}

// CORS middleware
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
} 