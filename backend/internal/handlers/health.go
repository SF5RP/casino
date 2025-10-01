package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"casino-backend/internal/database"

	"github.com/gorilla/mux"
)

// HealthHandler handles health check endpoints
type HealthHandler struct {
	repo database.RouletteRepositoryInterface
	db   *database.DB
}

// NewHealthHandler creates a new health handler
func NewHealthHandler(repo database.RouletteRepositoryInterface, db *database.DB) *HealthHandler {
	return &HealthHandler{
		repo: repo,
		db:   db,
	}
}

// DatabaseHealthResponse represents the database health check response
type DatabaseHealthResponse struct {
	Connected   bool      `json:"connected"`
	Error       string    `json:"error,omitempty"`
	CheckedAt   time.Time `json:"checked_at"`
	Repository  string    `json:"repository_type"`
	DBAvailable bool      `json:"db_available"`
}

// CheckDatabaseHealth handles GET /api/health/database
func (h *HealthHandler) CheckDatabaseHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	// Handle preflight requests
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	response := DatabaseHealthResponse{
		CheckedAt:   time.Now().UTC(),
		Repository:  h.repo.Info(),
		DBAvailable: h.db != nil,
	}

	// Check if we have a database connection
	if h.db != nil {
		// Test the database connection
		if err := h.db.Ping(); err != nil {
			response.Connected = false
			response.Error = err.Error()
			w.WriteHeader(http.StatusServiceUnavailable)
		} else {
			response.Connected = true
			w.WriteHeader(http.StatusOK)
		}
	} else {
		// No database connection available, using in-memory storage
		response.Connected = false
		response.Error = "Database connection not available, using in-memory storage"
		w.WriteHeader(http.StatusServiceUnavailable)
	}

	// Return JSON response
	jsonData, err := json.Marshal(response)
	if err != nil {
		http.Error(w, "Failed to marshal response", http.StatusInternalServerError)
		return
	}

	w.Write(jsonData)
}

// RegisterHealthRoutes registers health check routes
func (h *HealthHandler) RegisterHealthRoutes(router *mux.Router) {
	router.HandleFunc("/api/health/database", h.CheckDatabaseHealth).Methods("GET", "OPTIONS")
}
