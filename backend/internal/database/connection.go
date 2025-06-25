package database

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/lib/pq"
)

// DB wraps the sql.DB to provide additional functionality
type DB struct {
	*sql.DB
}

// Connect creates a new database connection
func Connect() (*DB, error) {
	// Get database configuration from environment variables
	host := os.Getenv("DB_HOST")
	if host == "" {
		host = "localhost"
	}

	port := os.Getenv("DB_PORT")
	if port == "" {
		port = "5432"
	}

	user := os.Getenv("DB_USER")
	if user == "" {
		user = "casino_user"
	}

	password := os.Getenv("DB_PASSWORD")
	if password == "" {
		password = "casino_password"
	}

	dbname := os.Getenv("DB_NAME")
	if dbname == "" {
		dbname = "casino_db"
	}

	sslmode := os.Getenv("DB_SSL_MODE")
	if sslmode == "" {
		sslmode = "disable"
	}

	// Build connection string
	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		host, port, user, password, dbname, sslmode)

	// Open database connection
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Test the connection
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Set connection pool settings
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)

	return &DB{db}, nil
}

// RunMigrations applies all pending database migrations
func (db *DB) RunMigrations() error {
	migrationManager := NewMigrationManager(db)
	return migrationManager.MigrateUp()
}

// GetMigrationStatus returns current migration status
func (db *DB) GetMigrationStatus() (*MigrationStatus, error) {
	migrationManager := NewMigrationManager(db)
	return migrationManager.GetMigrationStatus()
}

// RollbackMigrations rolls back the last N migrations
func (db *DB) RollbackMigrations(steps int) error {
	migrationManager := NewMigrationManager(db)
	return migrationManager.MigrateDown(steps)
}

// Close closes the database connection
func (db *DB) Close() error {
	return db.DB.Close()
}

// Helper function to get environment variable with default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
} 