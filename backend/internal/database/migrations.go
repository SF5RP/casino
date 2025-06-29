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
			Up: `CREATE TABLE IF NOT EXISTS roulette_sessions (
				id SERIAL PRIMARY KEY,
				key VARCHAR(255) UNIQUE NOT NULL,
				password VARCHAR(255),
				created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
				updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
			)`,
			Down: `DROP TABLE IF EXISTS roulette_sessions`,
		},
		{
			Version:     2,
			Description: "Create roulette numbers table",
			Up: `CREATE TABLE IF NOT EXISTS roulette_numbers (
				id SERIAL PRIMARY KEY,
				session_id INTEGER NOT NULL REFERENCES roulette_sessions(id) ON DELETE CASCADE,
				number TEXT NOT NULL,
				position INTEGER NOT NULL,
				created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
				UNIQUE(session_id, position)
			)`,
			Down: `DROP TABLE IF EXISTS roulette_numbers`,
		},
		{
			Version:     3,
			Description: "Create indexes",
			Up: `CREATE INDEX IF NOT EXISTS idx_roulette_sessions_key ON roulette_sessions(key);
			CREATE INDEX IF NOT EXISTS idx_roulette_numbers_session_id ON roulette_numbers(session_id);
			CREATE INDEX IF NOT EXISTS idx_roulette_numbers_position ON roulette_numbers(session_id, position)`,
			Down: `DROP INDEX IF EXISTS idx_roulette_numbers_position;
			DROP INDEX IF EXISTS idx_roulette_numbers_session_id;
			DROP INDEX IF EXISTS idx_roulette_sessions_key`,
		},
		{
			Version:     4,
			Description: "Add updated_at trigger function",
			Up: `CREATE OR REPLACE FUNCTION update_updated_at_column()
			RETURNS TRIGGER AS $$
			BEGIN
				NEW.updated_at = NOW();
				RETURN NEW;
			END;
			$$ language 'plpgsql'`,
			Down: `DROP FUNCTION IF EXISTS update_updated_at_column()`,
		},
		{
			Version:     5,
			Description: "Add updated_at trigger",
			Up: `CREATE TRIGGER update_roulette_sessions_updated_at
				BEFORE UPDATE ON roulette_sessions
				FOR EACH ROW
				EXECUTE FUNCTION update_updated_at_column()`,
			Down: `DROP TRIGGER IF EXISTS update_roulette_sessions_updated_at ON roulette_sessions`,
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

// ResetDatabase drops all tables and resets the migration state.
// USE WITH CAUTION.
func (m *MigrationManager) ResetDatabase() error {
	log.Println("CAUTION: Resetting database. All data will be lost.")

	// Get all tables in the public schema
	query := `
		SELECT tablename 
		FROM pg_tables 
		WHERE schemaname = 'public'
	`
	rows, err := m.db.Query(query)
	if err != nil {
		return fmt.Errorf("failed to query tables: %w", err)
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var tableName string
		if err := rows.Scan(&tableName); err != nil {
			return fmt.Errorf("failed to scan table name: %w", err)
		}
		tables = append(tables, tableName)
	}

	if len(tables) == 0 {
		log.Println("No tables found to drop. Database is already empty.")
		return nil
	}

	// Drop all tables
	tx, err := m.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction for dropping tables: %w", err)
	}
	defer tx.Rollback()

	for _, table := range tables {
		log.Printf("Dropping table: %s", table)
		// CASCADE is important to handle dependencies
		dropQuery := fmt.Sprintf(`DROP TABLE IF EXISTS %s CASCADE`, table)
		if _, err := tx.Exec(dropQuery); err != nil {
			return fmt.Errorf("failed to drop table %s: %w", table, err)
		}
	}

	log.Println("All tables dropped successfully.")
	return tx.Commit()
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

// splitSQLStatements splits SQL by semicolons for simple cases
func splitSQLStatements(sql string) []string {
	// Remove comments
	lines := strings.Split(sql, "\n")
	var cleanLines []string
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line != "" && !strings.HasPrefix(line, "--") {
			cleanLines = append(cleanLines, line)
		}
	}
	cleanSQL := strings.Join(cleanLines, "\n")
	
	// Simple split by semicolon
	parts := strings.Split(cleanSQL, ";")
	var statements []string
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			statements = append(statements, part)
		}
	}
	
	return statements
}

func isWhitespace(r rune) bool {
	return r == ' ' || r == '\t' || r == '\n' || r == '\r'
}