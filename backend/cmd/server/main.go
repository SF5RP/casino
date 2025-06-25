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

	// Initialize repository with fallback
	var repo database.RouletteRepositoryInterface
	var repoInfo string
	var dbConnection *database.DB

	// Try to connect to PostgreSQL first
	db, err := database.Connect()
	if err != nil {
		log.Printf("Failed to connect to PostgreSQL: %v", err)
		log.Println("Falling back to in-memory storage...")
		
		// Use in-memory repository as fallback
		memRepo := database.NewMemoryRepository()
		repo = memRepo
		repoInfo = "In-Memory Storage (PostgreSQL unavailable)"
	} else {
		// Test database connection
		if err := db.Ping(); err != nil {
			log.Printf("Database connection test failed: %v", err)
			log.Println("Falling back to in-memory storage...")
			db.Close()
			
			// Use in-memory repository as fallback
			memRepo := database.NewMemoryRepository()
			repo = memRepo
			repoInfo = "In-Memory Storage (PostgreSQL connection failed)"
		} else {
			// Run database migrations
			if err := db.RunMigrations(); err != nil {
				log.Printf("Failed to run database migrations: %v", err)
				log.Println("Falling back to in-memory storage...")
				db.Close()
				
				// Use in-memory repository as fallback
				memRepo := database.NewMemoryRepository()
				repo = memRepo
				repoInfo = "In-Memory Storage (PostgreSQL migrations failed)"
			} else {
				// PostgreSQL is working fine
				pgRepo := database.NewRouletteRepository(db)
				repo = pgRepo
				repoInfo = "PostgreSQL Database"
				dbConnection = db
				
				// Ensure cleanup on shutdown
				defer db.Close()
			}
		}
	}

	log.Printf("Repository initialized: %s", repoInfo)
	log.Printf("Repository info: %s", repo.Info())

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

	// Create handlers
	rouletteHandler := handlers.NewRouletteHandler(repo)
	migrationsHandler := handlers.NewMigrationsHandler(dbConnection)

	// Create WebSocket hub
	wsHub := websocket.NewHub(repo)
	go wsHub.Run()

	// Setup routes
	router := mux.NewRouter()

	// API routes
	api := router.PathPrefix("/api").Subrouter()
	
	// Roulette API routes
	roulette := api.PathPrefix("/roulette").Subrouter()
	roulette.HandleFunc("/save", rouletteHandler.SaveNumber).Methods("POST")
	roulette.HandleFunc("/sessions", rouletteHandler.GetSessions).Methods("GET")
	roulette.HandleFunc("/{key}", rouletteHandler.GetHistory).Methods("GET")
	roulette.HandleFunc("/{key}", rouletteHandler.UpdateHistory).Methods("PUT")
	
	// Migrations API routes
	migrations := api.PathPrefix("/migrations").Subrouter()
	migrations.HandleFunc("/status", migrationsHandler.GetMigrationStatus).Methods("GET")
	migrations.HandleFunc("/list", migrationsHandler.GetAvailableMigrations).Methods("GET")
	migrations.HandleFunc("/up", migrationsHandler.RunMigrations).Methods("POST")
	migrations.HandleFunc("/down/{steps}", migrationsHandler.RollbackMigrations).Methods("POST")
	
	// Handle preflight OPTIONS requests
	router.HandleFunc("/api/roulette/save", rouletteHandler.HandleOptions).Methods("OPTIONS")
	router.HandleFunc("/api/roulette/sessions", rouletteHandler.HandleOptions).Methods("OPTIONS")
	router.HandleFunc("/api/roulette/{key}", rouletteHandler.HandleOptions).Methods("OPTIONS")
	router.HandleFunc("/api/migrations/status", migrationsHandler.HandleOptions).Methods("OPTIONS")
	router.HandleFunc("/api/migrations/list", migrationsHandler.HandleOptions).Methods("OPTIONS")
	router.HandleFunc("/api/migrations/up", migrationsHandler.HandleOptions).Methods("OPTIONS")
	router.HandleFunc("/api/migrations/down/{steps}", migrationsHandler.HandleOptions).Methods("OPTIONS")

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
			"info":       repoInfo,
		}
		
		// Add migration status if database is available
		if dbConnection != nil {
			if migrationStatus, err := dbConnection.GetMigrationStatus(); err == nil {
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
	log.Printf("Migrations API: http://localhost:%s/api/migrations", port)

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