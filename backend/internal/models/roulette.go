package models

import "time"

// RouletteNumber represents a roulette number (0-36 or "00")
type RouletteNumber interface{}

// RouletteSession represents a roulette game session
type RouletteSession struct {
	ID        int              `json:"id"`
	Key       string           `json:"key"`
	Password  string           `json:"password,omitempty"` // Пароль для входа в комнату
	History   []RouletteNumber `json:"history"`
	CreatedAt time.Time        `json:"created_at"`
	UpdatedAt time.Time        `json:"updated_at"`
}

// RouletteNumberRecord represents a number record in database
type RouletteNumberRecord struct {
	ID        int              `json:"id" db:"id"`
	SessionID int              `json:"session_id" db:"session_id"`
	Number    RouletteNumber   `json:"number" db:"number"`
	Position  int              `json:"position" db:"position"`
	CreatedAt time.Time        `json:"created_at" db:"created_at"`
}

// CreateSessionRequest represents request to create session
type CreateSessionRequest struct {
	Key      string `json:"key"`
	Password string `json:"password,omitempty"` // Опциональный пароль
}

// SaveNumberRequest represents the request to save a number
type SaveNumberRequest struct {
	Key    string         `json:"key"`
	Number RouletteNumber `json:"number"`
}

// UpdateHistoryRequest represents the request to update history
type UpdateHistoryRequest struct {
	Key     string           `json:"key"`
	History []RouletteNumber `json:"history"`
}

// APIResponse represents a generic API response
type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// WebSocket Message types

// WSMessage represents a WebSocket message
type WSMessage struct {
	Type    string           `json:"type"`
	Key     string           `json:"key,omitempty"`
	Token   string           `json:"token,omitempty"`
	History []RouletteNumber `json:"history,omitempty"`
	Number  *RouletteNumber  `json:"number,omitempty"`
	Error   string           `json:"error,omitempty"`
	Version int              `json:"version,omitempty"` // Client's history version
	Full    bool             `json:"full,omitempty"`    // Indicates if the history is a full sync
	Index   int              `json:"index,omitempty"`   // Index for remove operations
} 