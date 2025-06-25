package database

import "casino-backend/internal/models"

// RouletteRepositoryInterface defines the interface for roulette data operations
type RouletteRepositoryInterface interface {
	// Session operations
	GetSession(key string) (*models.RouletteSession, error)
	CreateSession(key string) (*models.RouletteSession, error)
	CreateSessionWithPassword(key, password string) (*models.RouletteSession, error)
	ValidateSessionPassword(key, password string) (bool, error)
	DeleteSession(key string) error
	GetAllSessions() ([]*models.RouletteSession, error)

	// Number operations
	AddNumberToSession(key string, number models.RouletteNumber) (*models.RouletteSession, error)
	UpdateSessionHistory(key string, history []models.RouletteNumber) (*models.RouletteSession, error)

	// Health and maintenance
	Ping() error
	Close() error
	Info() string
	GetStats() map[string]interface{}
} 