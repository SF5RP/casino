package database

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"casino-backend/internal/models"
)

type RouletteRepository struct {
	db *DB
}

// NewRouletteRepository creates a new roulette repository
func NewRouletteRepository(db *DB) *RouletteRepository {
	return &RouletteRepository{db: db}
}

// CreateSession creates a new roulette session without password
func (r *RouletteRepository) CreateSession(key string) (*models.RouletteSession, error) {
	return r.CreateSessionWithPassword(key, "")
}

// CreateSessionWithPassword creates a new roulette session with password
func (r *RouletteRepository) CreateSessionWithPassword(key, password string) (*models.RouletteSession, error) {
	query := `
		INSERT INTO roulette_sessions (key, password, created_at, updated_at)
		VALUES ($1, $2, $3, $3)
		ON CONFLICT (key) DO UPDATE SET
			password = CASE
				WHEN roulette_sessions.password = '' AND EXCLUDED.password != '' THEN EXCLUDED.password
				ELSE roulette_sessions.password
			END,
			updated_at = EXCLUDED.updated_at
		RETURNING id, key, password, created_at, updated_at
	`

	now := time.Now()
	var session models.RouletteSession

	err := r.db.QueryRow(query, key, password, now).Scan(
		&session.ID,
		&session.Key,
		&session.Password,
		&session.CreatedAt,
		&session.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}

	// Выводим лог, если сессия была только что создана (а не обновлена)
	// Проверяем, что разница между created_at и updated_at очень маленькая
	if session.UpdatedAt.Sub(session.CreatedAt) < time.Millisecond*100 {
		log.Printf("[DB] CREATED NEW SESSION. Key: '%s', Password: '%s'", key, password)
	}

	// Load existing history
	history, err := r.getSessionHistory(session.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to load session history: %w", err)
	}

	session.History = history
	return &session, nil
}

// ValidateSessionPassword validates password for a session
func (r *RouletteRepository) ValidateSessionPassword(key, password string) (bool, error) {
	query := `SELECT password FROM roulette_sessions WHERE key = $1`
	
	var storedPassword sql.NullString
	err := r.db.QueryRow(query, key).Scan(&storedPassword)
	if err != nil {
		if err == sql.ErrNoRows {
			// Если сессии не существует, но пароль предоставлен - это попытка создать защищенную сессию
			// Если пароля нет - это попытка подключиться к несуществующей сессии (разрешаем создание без пароля)
			return password == "", nil
		}
		return false, fmt.Errorf("failed to get session password: %w", err)
	}

	// Если у сессии нет пароля, доступ свободный
	if !storedPassword.Valid || storedPassword.String == "" {
		return true, nil
	}

	// Проверяем пароль
	return storedPassword.String == password, nil
}

// GetSession retrieves a session by key
func (r *RouletteRepository) GetSession(key string) (*models.RouletteSession, error) {
	query := `
		SELECT id, key, password, created_at, updated_at
		FROM roulette_sessions
		WHERE key = $1
	`

	var session models.RouletteSession
	var password sql.NullString
	err := r.db.QueryRow(query, key).Scan(
		&session.ID,
		&session.Key,
		&password,
		&session.CreatedAt,
		&session.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // Session not found
		}
		return nil, fmt.Errorf("failed to get session: %w", err)
	}

	if password.Valid {
		session.Password = password.String
	}

	// Load history
	history, err := r.getSessionHistory(session.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to load session history: %w", err)
	}

	session.History = history
	return &session, nil
}

// AddNumberToSession adds a number to session history
func (r *RouletteRepository) AddNumberToSession(key string, number models.RouletteNumber) (*models.RouletteSession, error) {
	// Start transaction
	tx, err := r.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()

	// Get or create session
	session, err := r.CreateSession(key)
	if err != nil {
		return nil, err
	}

	// Get next position
	var maxPosition sql.NullInt64
	posQuery := `SELECT MAX(position) FROM roulette_numbers WHERE session_id = $1`
	err = tx.QueryRow(posQuery, session.ID).Scan(&maxPosition)
	if err != nil {
		return nil, fmt.Errorf("failed to get max position: %w", err)
	}

	position := 0
	if maxPosition.Valid {
		position = int(maxPosition.Int64) + 1
	}

	// Convert number to string for storage
	numberStr, err := numberToString(number)
	if err != nil {
		return nil, fmt.Errorf("failed to convert number: %w", err)
	}

	// Insert number
	insertQuery := `
		INSERT INTO roulette_numbers (session_id, number, position)
		VALUES ($1, $2, $3)
	`
	_, err = tx.Exec(insertQuery, session.ID, numberStr, position)
	if err != nil {
		return nil, fmt.Errorf("failed to insert number: %w", err)
	}

	// Update session timestamp
	updateQuery := `UPDATE roulette_sessions SET updated_at = $1 WHERE id = $2`
	_, err = tx.Exec(updateQuery, time.Now(), session.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to update session: %w", err)
	}

	// Commit transaction
	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Reload session with updated history
	return r.GetSession(key)
}

// UpdateSessionHistory replaces entire session history
func (r *RouletteRepository) UpdateSessionHistory(key string, history []models.RouletteNumber) (*models.RouletteSession, error) {
	// Start transaction
	tx, err := r.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()

	// Get or create session
	session, err := r.CreateSession(key)
	if err != nil {
		return nil, err
	}

	// Delete existing numbers
	deleteQuery := `DELETE FROM roulette_numbers WHERE session_id = $1`
	_, err = tx.Exec(deleteQuery, session.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to delete existing numbers: %w", err)
	}

	// Insert new history
	for i, number := range history {
		numberStr, err := numberToString(number)
		if err != nil {
			return nil, fmt.Errorf("failed to convert number at position %d: %w", i, err)
		}

		insertQuery := `
			INSERT INTO roulette_numbers (session_id, number, position)
			VALUES ($1, $2, $3)
		`
		_, err = tx.Exec(insertQuery, session.ID, numberStr, i)
		if err != nil {
			return nil, fmt.Errorf("failed to insert number at position %d: %w", i, err)
		}
	}

	// Update session timestamp
	updateQuery := `UPDATE roulette_sessions SET updated_at = $1 WHERE id = $2`
	_, err = tx.Exec(updateQuery, time.Now(), session.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to update session: %w", err)
	}

	// Commit transaction
	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Reload session with updated history
	return r.GetSession(key)
}

// GetAllSessions retrieves all sessions
func (r *RouletteRepository) GetAllSessions() ([]*models.RouletteSession, error) {
	query := `
		SELECT id, key, created_at, updated_at
		FROM roulette_sessions
		ORDER BY updated_at DESC
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query sessions: %w", err)
	}
	defer rows.Close()

	var sessions []*models.RouletteSession
	for rows.Next() {
		var session models.RouletteSession
		err := rows.Scan(
			&session.ID,
			&session.Key,
			&session.CreatedAt,
			&session.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan session: %w", err)
		}

		// Load history for each session
		history, err := r.getSessionHistory(session.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to load history for session %d: %w", session.ID, err)
		}
		session.History = history

		sessions = append(sessions, &session)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("rows iteration error: %w", err)
	}

	return sessions, nil
}

// DeleteSession deletes a session and its history
func (r *RouletteRepository) DeleteSession(key string) error {
	query := `DELETE FROM roulette_sessions WHERE key = $1`
	result, err := r.db.Exec(query, key)
	if err != nil {
		return fmt.Errorf("failed to delete session: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("session with key '%s' not found", key)
	}

	return nil
}

// Helper function to get session history
func (r *RouletteRepository) getSessionHistory(sessionID int) ([]models.RouletteNumber, error) {
	query := `
		SELECT number
		FROM roulette_numbers
		WHERE session_id = $1
		ORDER BY position ASC
	`

	rows, err := r.db.Query(query, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to query history: %w", err)
	}
	defer rows.Close()

	var history []models.RouletteNumber
	for rows.Next() {
		var numberStr string
		err := rows.Scan(&numberStr)
		if err != nil {
			return nil, fmt.Errorf("failed to scan number: %w", err)
		}

		number, err := stringToNumber(numberStr)
		if err != nil {
			return nil, fmt.Errorf("failed to convert number: %w", err)
		}

		history = append(history, number)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("rows iteration error: %w", err)
	}

	return history, nil
}

// Helper function to convert RouletteNumber to string
func numberToString(number models.RouletteNumber) (string, error) {
	data, err := json.Marshal(number)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// Helper function to convert string to RouletteNumber
func stringToNumber(str string) (models.RouletteNumber, error) {
	var number models.RouletteNumber
	err := json.Unmarshal([]byte(str), &number)
	return number, err
}

// Ping checks database connectivity
func (r *RouletteRepository) Ping() error {
	return r.db.Ping()
}

// Close closes the database connection
func (r *RouletteRepository) Close() error {
	return r.db.Close()
}

// Info returns information about the database repository
func (r *RouletteRepository) Info() string {
	stats := r.GetStats()
	return fmt.Sprintf("PostgreSQL Repository: %v sessions, %v total numbers", 
		stats["sessions_count"], stats["total_numbers"])
}

// GetStats returns repository statistics
func (r *RouletteRepository) GetStats() map[string]interface{} {
	// Get sessions count
	var sessionsCount int
	sessionsQuery := `SELECT COUNT(*) FROM roulette_sessions`
	err := r.db.QueryRow(sessionsQuery).Scan(&sessionsCount)
	if err != nil {
		sessionsCount = -1
	}

	// Get total numbers count
	var totalNumbers int
	numbersQuery := `SELECT COUNT(*) FROM roulette_numbers`
	err = r.db.QueryRow(numbersQuery).Scan(&totalNumbers)
	if err != nil {
		totalNumbers = -1
	}

	// Check database status
	status := "active"
	if err := r.db.Ping(); err != nil {
		status = "error"
	}

	return map[string]interface{}{
		"type":           "postgresql",
		"sessions_count": sessionsCount,
		"total_numbers":  totalNumbers,
		"status":         status,
	}
} 