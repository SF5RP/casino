package database

import (
	"fmt"
	"log"
	"sort"
	"strconv"
	"strings"
	"time"
)

// Migration represents a single database migration
type Migration struct {
	Version     int
	Description string
	Up          string
	Down        string
}

// MigrationManager handles database migrations
type MigrationManager struct {
	db *DB
}

// NewMigrationManager creates a new migration manager
func NewMigrationManager(db *DB) *MigrationManager {
	return &MigrationManager{db: db}
}

// GetMigrations returns all available migrations
func (m *MigrationManager) GetMigrations() []Migration {
	return []Migration{
		{
			Version:     1,
			Description: "Create initial tables",
			Up: `
				CREATE TABLE IF NOT EXISTS roulette_sessions (
					id SERIAL PRIMARY KEY,
					key VARCHAR(255) UNIQUE NOT NULL,
					created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
					updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
				);

				CREATE TABLE IF NOT EXISTS roulette_numbers (
					id SERIAL PRIMARY KEY,
					session_id INTEGER NOT NULL REFERENCES roulette_sessions(id) ON DELETE CASCADE,
					number TEXT NOT NULL,
					position INTEGER NOT NULL,
					created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
					UNIQUE(session_id, position)
				);

				CREATE INDEX IF NOT EXISTS idx_roulette_sessions_key ON roulette_sessions(key);
				CREATE INDEX IF NOT EXISTS idx_roulette_numbers_session_id ON roulette_numbers(session_id);
				CREATE INDEX IF NOT EXISTS idx_roulette_numbers_position ON roulette_numbers(session_id, position);
			`,
			Down: `
				DROP INDEX IF EXISTS idx_roulette_numbers_position;
				DROP INDEX IF EXISTS idx_roulette_numbers_session_id;
				DROP INDEX IF EXISTS idx_roulette_sessions_key;
				DROP TABLE IF EXISTS roulette_numbers;
				DROP TABLE IF EXISTS roulette_sessions;
			`,
		},
		{
			Version:     2,
			Description: "Add updated_at trigger for roulette_sessions",
			Up: `
				-- Create or replace function to update updated_at column
				CREATE OR REPLACE FUNCTION update_updated_at_column()
				RETURNS TRIGGER AS $$
				BEGIN
					NEW.updated_at = NOW();
					RETURN NEW;
				END;
				$$ language 'plpgsql';

				-- Create trigger for roulette_sessions table
				DROP TRIGGER IF EXISTS update_roulette_sessions_updated_at ON roulette_sessions;
				CREATE TRIGGER update_roulette_sessions_updated_at
					BEFORE UPDATE ON roulette_sessions
					FOR EACH ROW
					EXECUTE FUNCTION update_updated_at_column();
			`,
			Down: `
				DROP TRIGGER IF EXISTS update_roulette_sessions_updated_at ON roulette_sessions;
				DROP FUNCTION IF EXISTS update_updated_at_column();
			`,
		},
		{
			Version:     3,
			Description: "Add statistics and metadata tables",
			Up: `
				-- Create statistics table for performance tracking
				CREATE TABLE IF NOT EXISTS roulette_statistics (
					id SERIAL PRIMARY KEY,
					session_key VARCHAR(255) NOT NULL,
					total_numbers INTEGER DEFAULT 0,
					last_number TEXT,
					last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
					metadata JSONB,
					UNIQUE(session_key)
				);

				-- Create index on session_key
				CREATE INDEX IF NOT EXISTS idx_roulette_statistics_session_key ON roulette_statistics(session_key);
				CREATE INDEX IF NOT EXISTS idx_roulette_statistics_last_updated ON roulette_statistics(last_updated);

				-- Create system settings table
				CREATE TABLE IF NOT EXISTS system_settings (
					id SERIAL PRIMARY KEY,
					key VARCHAR(255) UNIQUE NOT NULL,
					value TEXT,
					description TEXT,
					created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
					updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
				);

				-- Insert default settings
				INSERT INTO system_settings (key, value, description) VALUES
					('max_history_length', '1000', 'Maximum number of numbers to keep in history per session'),
					('cleanup_interval_hours', '24', 'Hours between automatic cleanup of old sessions'),
					('session_timeout_days', '30', 'Days after which inactive sessions are deleted')
				ON CONFLICT (key) DO NOTHING;
			`,
			Down: `
				DROP INDEX IF EXISTS idx_roulette_statistics_last_updated;
				DROP INDEX IF EXISTS idx_roulette_statistics_session_key;
				DROP TABLE IF EXISTS system_settings;
				DROP TABLE IF EXISTS roulette_statistics;
			`,
		},
		{
			Version:     4,
			Description: "Add password field to roulette_sessions",
			Up: `
				-- Add password column to roulette_sessions table
				ALTER TABLE roulette_sessions 
				ADD COLUMN IF NOT EXISTS password VARCHAR(255);

				-- Create index on password for faster lookups (optional)
				CREATE INDEX IF NOT EXISTS idx_roulette_sessions_password ON roulette_sessions(password) 
				WHERE password IS NOT NULL AND password != '';
			`,
			Down: `
				-- Remove index and column
				DROP INDEX IF EXISTS idx_roulette_sessions_password;
				ALTER TABLE roulette_sessions DROP COLUMN IF EXISTS password;
			`,
		},
	}
}

// InitMigrationsTable creates the migrations tracking table
func (m *MigrationManager) InitMigrationsTable() error {
	query := `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INTEGER PRIMARY KEY,
			description TEXT NOT NULL,
			applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			execution_time_ms INTEGER DEFAULT 0,
			checksum TEXT
		);
	`
	_, err := m.db.Exec(query)
	if err != nil {
		return fmt.Errorf("failed to create migrations table: %w", err)
	}
	return nil
}

// GetAppliedMigrations returns list of applied migration versions
func (m *MigrationManager) GetAppliedMigrations() ([]int, error) {
	query := `SELECT version FROM schema_migrations ORDER BY version`
	rows, err := m.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query applied migrations: %w", err)
	}
	defer rows.Close()

	var versions []int
	for rows.Next() {
		var version int
		if err := rows.Scan(&version); err != nil {
			return nil, fmt.Errorf("failed to scan migration version: %w", err)
		}
		versions = append(versions, version)
	}

	return versions, nil
}

// GetPendingMigrations returns migrations that haven't been applied yet
func (m *MigrationManager) GetPendingMigrations() ([]Migration, error) {
	appliedVersions, err := m.GetAppliedMigrations()
	if err != nil {
		return nil, err
	}

	appliedMap := make(map[int]bool)
	for _, version := range appliedVersions {
		appliedMap[version] = true
	}

	allMigrations := m.GetMigrations()
	var pending []Migration

	for _, migration := range allMigrations {
		if !appliedMap[migration.Version] {
			pending = append(pending, migration)
		}
	}

	// Sort by version
	sort.Slice(pending, func(i, j int) bool {
		return pending[i].Version < pending[j].Version
	})

	return pending, nil
}

// ApplyMigration applies a single migration
func (m *MigrationManager) ApplyMigration(migration Migration) error {
	log.Printf("Applying migration %d: %s", migration.Version, migration.Description)

	startTime := time.Now()

	// Start transaction
	tx, err := m.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to start transaction for migration %d: %w", migration.Version, err)
	}
	defer tx.Rollback()

	// Execute migration SQL
	statements := splitSQLStatements(migration.Up)
	for _, stmt := range statements {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" {
			continue
		}

		if _, err := tx.Exec(stmt); err != nil {
			return fmt.Errorf("failed to execute migration %d statement '%s': %w", migration.Version, stmt, err)
		}
	}

	// Record migration as applied
	executionTime := int(time.Since(startTime).Milliseconds())
	checksum := generateChecksum(migration.Up)

	insertQuery := `
		INSERT INTO schema_migrations (version, description, applied_at, execution_time_ms, checksum)
		VALUES ($1, $2, $3, $4, $5)
	`
	_, err = tx.Exec(insertQuery, migration.Version, migration.Description, time.Now(), executionTime, checksum)
	if err != nil {
		return fmt.Errorf("failed to record migration %d: %w", migration.Version, err)
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit migration %d: %w", migration.Version, err)
	}

	log.Printf("Migration %d applied successfully in %dms", migration.Version, executionTime)
	return nil
}

// RollbackMigration rolls back a single migration
func (m *MigrationManager) RollbackMigration(migration Migration) error {
	log.Printf("Rolling back migration %d: %s", migration.Version, migration.Description)

	startTime := time.Now()

	// Start transaction
	tx, err := m.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to start transaction for rollback %d: %w", migration.Version, err)
	}
	defer tx.Rollback()

	// Execute rollback SQL
	statements := splitSQLStatements(migration.Down)
	for _, stmt := range statements {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" {
			continue
		}

		if _, err := tx.Exec(stmt); err != nil {
			return fmt.Errorf("failed to execute rollback %d statement '%s': %w", migration.Version, stmt, err)
		}
	}

	// Remove migration record
	deleteQuery := `DELETE FROM schema_migrations WHERE version = $1`
	_, err = tx.Exec(deleteQuery, migration.Version)
	if err != nil {
		return fmt.Errorf("failed to remove migration record %d: %w", migration.Version, err)
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit rollback %d: %w", migration.Version, err)
	}

	executionTime := int(time.Since(startTime).Milliseconds())
	log.Printf("Migration %d rolled back successfully in %dms", migration.Version, executionTime)
	return nil
}

// MigrateUp applies all pending migrations
func (m *MigrationManager) MigrateUp() error {
	if err := m.InitMigrationsTable(); err != nil {
		return err
	}

	pending, err := m.GetPendingMigrations()
	if err != nil {
		return err
	}

	if len(pending) == 0 {
		log.Println("No pending migrations to apply")
		return nil
	}

	log.Printf("Found %d pending migrations", len(pending))

	for _, migration := range pending {
		if err := m.ApplyMigration(migration); err != nil {
			return fmt.Errorf("migration failed at version %d: %w", migration.Version, err)
		}
	}

	log.Printf("Successfully applied %d migrations", len(pending))
	return nil
}

// MigrateDown rolls back the last N migrations
func (m *MigrationManager) MigrateDown(steps int) error {
	appliedVersions, err := m.GetAppliedMigrations()
	if err != nil {
		return err
	}

	if len(appliedVersions) == 0 {
		log.Println("No migrations to rollback")
		return nil
	}

	// Sort in descending order for rollback
	sort.Sort(sort.Reverse(sort.IntSlice(appliedVersions)))

	if steps > len(appliedVersions) {
		steps = len(appliedVersions)
	}

	allMigrations := m.GetMigrations()
	migrationMap := make(map[int]Migration)
	for _, migration := range allMigrations {
		migrationMap[migration.Version] = migration
	}

	log.Printf("Rolling back %d migrations", steps)

	for i := 0; i < steps; i++ {
		version := appliedVersions[i]
		migration, exists := migrationMap[version]
		if !exists {
			return fmt.Errorf("migration %d not found in available migrations", version)
		}

		if err := m.RollbackMigration(migration); err != nil {
			return fmt.Errorf("rollback failed at version %d: %w", version, err)
		}
	}

	log.Printf("Successfully rolled back %d migrations", steps)
	return nil
}

// GetMigrationStatus returns the current migration status
func (m *MigrationManager) GetMigrationStatus() (*MigrationStatus, error) {
	appliedVersions, err := m.GetAppliedMigrations()
	if err != nil {
		return nil, err
	}

	pending, err := m.GetPendingMigrations()
	if err != nil {
		return nil, err
	}

	allMigrations := m.GetMigrations()

	status := &MigrationStatus{
		TotalMigrations:   len(allMigrations),
		AppliedMigrations: len(appliedVersions),
		PendingMigrations: len(pending),
		AppliedVersions:   appliedVersions,
		PendingVersions:   make([]int, len(pending)),
	}

	for i, migration := range pending {
		status.PendingVersions[i] = migration.Version
	}

	if len(appliedVersions) > 0 {
		status.CurrentVersion = appliedVersions[len(appliedVersions)-1]
	}

	if len(allMigrations) > 0 {
		status.LatestVersion = allMigrations[len(allMigrations)-1].Version
	}

	return status, nil
}

// MigrationStatus represents the current state of migrations
type MigrationStatus struct {
	TotalMigrations   int   `json:"total_migrations"`
	AppliedMigrations int   `json:"applied_migrations"`
	PendingMigrations int   `json:"pending_migrations"`
	CurrentVersion    int   `json:"current_version"`
	LatestVersion     int   `json:"latest_version"`
	AppliedVersions   []int `json:"applied_versions"`
	PendingVersions   []int `json:"pending_versions"`
}

// generateChecksum creates a simple checksum for migration content
func generateChecksum(content string) string {
	// Simple hash based on content length and first/last characters
	if len(content) == 0 {
		return "empty"
	}
	
	hash := len(content)
	if len(content) > 0 {
		hash += int(content[0])
	}
	if len(content) > 1 {
		hash += int(content[len(content)-1])
	}
	
	return strconv.Itoa(hash)
}

// splitSQLStatements splits SQL content into individual statements
// This function handles multi-line statements and PostgreSQL dollar-quoted strings
func splitSQLStatements(sql string) []string {
	var statements []string
	var current strings.Builder
	var inDollarQuote bool
	var dollarTag string
	
	// First, handle simple case of multiple statements on one line
	if !strings.Contains(sql, "\n") && strings.Contains(sql, ";") {
		parts := strings.Split(sql, ";")
		for _, part := range parts {
			part = strings.TrimSpace(part)
			if part != "" {
				statements = append(statements, part)
			}
		}
		return statements
	}
	
	lines := strings.Split(sql, "\n")
	
	for _, line := range lines {
		originalLine := line
		line = strings.TrimSpace(line)
		
		// Skip empty lines
		if line == "" {
			continue
		}
		
		// Skip comment lines (only if not inside dollar quote)
		if !inDollarQuote && strings.HasPrefix(line, "--") {
			continue
		}
		
		// Add line to current statement, preserving relative indentation
		if current.Len() > 0 {
			current.WriteString("\n")
		}
		
		// For multi-line statements, preserve some indentation
		if strings.HasPrefix(originalLine, "\t") || strings.HasPrefix(originalLine, "  ") {
			// Keep one level of indentation for readability
			if strings.HasPrefix(originalLine, "\t\t") {
				current.WriteString("\t")
			} else if strings.HasPrefix(originalLine, "    ") {
				current.WriteString("\t")
			}
		}
		current.WriteString(line)
		
		// Check for dollar-quoted strings (PostgreSQL function syntax)
		if !inDollarQuote {
			// Look for start of dollar quote ($$, $tag$, etc.)
			if dollarStart := strings.Index(line, "$"); dollarStart != -1 {
				// Find the end of the dollar tag
				dollarEnd := strings.Index(line[dollarStart+1:], "$")
				if dollarEnd != -1 {
					dollarTag = line[dollarStart : dollarStart+dollarEnd+2]
					inDollarQuote = true
				}
			}
		} else {
			// Look for end of dollar quote
			if strings.Contains(line, dollarTag) {
				inDollarQuote = false
				dollarTag = ""
			}
		}
		
		// Check if statement ends with semicolon (only if not in dollar quote)
		if !inDollarQuote && strings.HasSuffix(line, ";") {
			stmt := current.String()
			stmt = strings.TrimSuffix(stmt, ";")
			stmt = strings.TrimSpace(stmt)
			if stmt != "" {
				statements = append(statements, stmt)
			}
			current.Reset()
		}
	}
	
	// Add remaining statement if any
	if current.Len() > 0 {
		stmt := strings.TrimSpace(current.String())
		if stmt != "" {
			statements = append(statements, stmt)
		}
	}
	
	return statements
} 