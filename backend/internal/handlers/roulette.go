package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"casino-backend/internal/database"
	"casino-backend/internal/models"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/mux"
)

type RouletteHandler struct {
	repo      database.RouletteRepositoryInterface
	jwtSecret []byte
}

// NewRouletteHandler creates a new roulette handler
func NewRouletteHandler(repo database.RouletteRepositoryInterface, jwtSecret string) *RouletteHandler {
	return &RouletteHandler{
		repo:      repo,
		jwtSecret: []byte(jwtSecret),
	}
}

// RegisterRoutes регистрирует маршруты для рулетки
func (h *RouletteHandler) RegisterRoutes(r *mux.Router) {
	r.HandleFunc("/roulette/sessions", h.GetSessions).Methods("GET", "OPTIONS")
	r.HandleFunc("/rooms/auth", h.AuthenticateRoom).Methods("POST", "OPTIONS")
	r.HandleFunc("/roulette/save", h.SaveNumber).Methods("POST", "OPTIONS")
	r.HandleFunc("/roulette/{key}", h.GetHistory).Methods("GET", "OPTIONS")
	r.HandleFunc("/roulette/{key}", h.UpdateHistory).Methods("PUT", "OPTIONS")
}

// AuthenticateRoom handles creation and authentication for rooms
func (h *RouletteHandler) AuthenticateRoom(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	var req struct {
		Key      string `json:"key"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Key == "" {
		http.Error(w, "Key is required", http.StatusBadRequest)
		return
	}

	session, err := h.repo.GetSession(req.Key)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	if session == nil {
		// Сессия не найдена, создаем новую
		if _, err := h.repo.CreateSessionWithPassword(req.Key, req.Password); err != nil {
			http.Error(w, "Failed to create session", http.StatusInternalServerError)
			return
		}
	} else {
		// Сессия существует, проверяем пароль
		if session.Password != "" {
			valid, err := h.repo.ValidateSessionPassword(req.Key, req.Password)
			if err != nil || !valid {
				http.Error(w, "Invalid password", http.StatusUnauthorized)
				return
			}
		}
	}

	// Генерируем JWT токен
	claims := jwt.MapClaims{
		"key": req.Key,
		"exp": time.Now().Add(time.Hour * 24).Unix(), // Токен живет 24 часа
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(h.jwtSecret)
	if err != nil {
		http.Error(w, "Failed to create token", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"token": tokenString})
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