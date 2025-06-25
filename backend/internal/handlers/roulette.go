package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"casino-backend/internal/database"
	"casino-backend/internal/models"

	"github.com/gorilla/mux"
)

type RouletteHandler struct {
	repo database.RouletteRepositoryInterface
}

// NewRouletteHandler creates a new roulette handler
func NewRouletteHandler(repo database.RouletteRepositoryInterface) *RouletteHandler {
	return &RouletteHandler{repo: repo}
}

// GetHistory handles GET /api/roulette/{key}
func (h *RouletteHandler) GetHistory(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	key := vars["key"]

	if key == "" {
		http.Error(w, "Key is required", http.StatusBadRequest)
		return
	}

	session, err := h.repo.GetSession(key)
	if err != nil {
		log.Printf("Error getting session: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	var history []models.RouletteNumber
	if session != nil {
		history = session.History
	} else {
		history = []models.RouletteNumber{}
	}

	response := map[string]interface{}{
		"history": history,
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	json.NewEncoder(w).Encode(response)
}

// SaveNumber handles POST /api/roulette/save
func (h *RouletteHandler) SaveNumber(w http.ResponseWriter, r *http.Request) {
	var req models.SaveNumberRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Key == "" || req.Number == nil {
		http.Error(w, "Key and number are required", http.StatusBadRequest)
		return
	}

	session, err := h.repo.AddNumberToSession(req.Key, req.Number)
	if err != nil {
		log.Printf("Error saving number: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	response := models.APIResponse{
		Success: true,
		Data:    session,
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	json.NewEncoder(w).Encode(response)
}

// UpdateHistory handles PUT /api/roulette/{key}
func (h *RouletteHandler) UpdateHistory(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	key := vars["key"]

	if key == "" {
		http.Error(w, "Key is required", http.StatusBadRequest)
		return
	}

	var req models.UpdateHistoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	req.Key = key // Ensure key from URL is used

	if !isValidHistory(req.History) {
		http.Error(w, "Invalid history format", http.StatusBadRequest)
		return
	}

	session, err := h.repo.UpdateSessionHistory(req.Key, req.History)
	if err != nil {
		log.Printf("Error updating history: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	response := models.APIResponse{
		Success: true,
		Data:    session,
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	json.NewEncoder(w).Encode(response)
}

// GetSessions handles GET /api/roulette/sessions
func (h *RouletteHandler) GetSessions(w http.ResponseWriter, r *http.Request) {
	sessions, err := h.repo.GetAllSessions()
	if err != nil {
		log.Printf("Error getting sessions: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"sessions": sessions,
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	json.NewEncoder(w).Encode(response)
}

// HandleOptions handles preflight OPTIONS requests
func (h *RouletteHandler) HandleOptions(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.WriteHeader(http.StatusOK)
}

// Helper function to validate history format
func isValidHistory(history []models.RouletteNumber) bool {
	if history == nil {
		return true // Empty history is valid
	}

	for _, number := range history {
		if !isValidRouletteNumber(number) {
			return false
		}
	}
	return true
}

// Helper function to validate individual roulette number
func isValidRouletteNumber(number models.RouletteNumber) bool {
	switch v := number.(type) {
	case float64:
		// Check if it's a valid integer number between 0 and 36
		if v != float64(int(v)) {
			return false // Not an integer
		}
		intVal := int(v)
		return intVal >= 0 && intVal <= 36
	case string:
		// Only "00" is allowed as string
		return v == "00"
	default:
		return false
	}
} 