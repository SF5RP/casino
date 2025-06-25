package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"casino-backend/internal/database"
	"casino-backend/pkg/websocket"
	"github.com/gorilla/mux"
)

type Connection struct {
	ID           string    `json:"id"`
	Key          string    `json:"key"`
	ConnectedAt  time.Time `json:"connectedAt"`
	LastActivity time.Time `json:"lastActivity"`
	Status       string    `json:"status"`
	IPAddress    string    `json:"ipAddress,omitempty"`
	UserAgent    string    `json:"userAgent,omitempty"`
}

type Session struct {
	Key               string       `json:"key"`
	Password          string       `json:"password,omitempty"`
	CreatedAt         time.Time    `json:"createdAt"`
	LastActivity      time.Time    `json:"lastActivity"`
	HistoryLength     int          `json:"historyLength"`
	ActiveConnections int          `json:"activeConnections"`
	TotalConnections  int          `json:"totalConnections"`
	Connections       []Connection `json:"connections"`
}

type AdminStats struct {
	TotalSessions        int     `json:"totalSessions"`
	ActiveSessions       int     `json:"activeSessions"`
	TotalConnections     int     `json:"totalConnections"`
	ActiveConnections    int     `json:"activeConnections"`
	AverageHistoryLength float64 `json:"averageHistoryLength"`
}

type AdminHandler struct {
	repo database.RouletteRepositoryInterface
	wsHub *websocket.Hub
}

func NewAdminHandler(repo database.RouletteRepositoryInterface, wsHub *websocket.Hub) *AdminHandler {
	return &AdminHandler{
		repo: repo,
		wsHub: wsHub,
	}
}

// GetSessions возвращает список всех сессий с их подключениями
func (h *AdminHandler) GetSessions(w http.ResponseWriter, r *http.Request) {
	log.Printf("[ADMIN] GetSessions called")
	
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	// Обработка preflight запросов
	if r.Method == "OPTIONS" {
		log.Printf("[ADMIN] OPTIONS request handled")
		w.WriteHeader(http.StatusOK)
		return
	}

	// Получаем реальные данные из WebSocket hub и базы данных
	log.Printf("[ADMIN] Getting sessions from hub...")
	sessions := h.getSessionsFromHub()
	log.Printf("[ADMIN] Got %d sessions from hub", len(sessions))

	if err := json.NewEncoder(w).Encode(sessions); err != nil {
		log.Printf("[ADMIN] Failed to encode sessions: %v", err)
		http.Error(w, "Failed to encode sessions", http.StatusInternalServerError)
		return
	}
	
	log.Printf("[ADMIN] Successfully returned %d sessions", len(sessions))
}

// GetStats возвращает статистику подключений
func (h *AdminHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Вычисляем реальную статистику
	sessions := h.getSessionsFromHub()
	
	activeSessions := 0
	totalConnections := 0
	activeConnections := 0
	totalHistoryLength := 0
	
	for _, session := range sessions {
		if session.ActiveConnections > 0 {
			activeSessions++
		}
		totalConnections += session.TotalConnections
		activeConnections += session.ActiveConnections
		totalHistoryLength += session.HistoryLength
	}
	
	averageHistoryLength := float64(0)
	if len(sessions) > 0 {
		averageHistoryLength = float64(totalHistoryLength) / float64(len(sessions))
	}
	
	stats := AdminStats{
		TotalSessions:        len(sessions),
		ActiveSessions:       activeSessions,
		TotalConnections:     totalConnections,
		ActiveConnections:    activeConnections,
		AverageHistoryLength: averageHistoryLength,
	}

	if err := json.NewEncoder(w).Encode(stats); err != nil {
		http.Error(w, "Failed to encode stats", http.StatusInternalServerError)
		return
	}
}

// GetSessionHistory возвращает историю конкретной сессии
func (h *AdminHandler) GetSessionHistory(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	vars := mux.Vars(r)
	sessionKey := vars["key"]

	if sessionKey == "" {
		http.Error(w, "Session key is required", http.StatusBadRequest)
		return
	}

	// Получаем сессию из базы данных
	session, err := h.repo.GetSession(sessionKey)
	if err != nil {
		http.Error(w, "Failed to get session", http.StatusInternalServerError)
		return
	}
	
	// Извлекаем историю из сессии
	var history []int
	if session != nil {
		history = make([]int, len(session.History))
		for i, num := range session.History {
			if val, ok := num.(int); ok {
				history[i] = val
			} else if val, ok := num.(float64); ok {
				history[i] = int(val)
			}
		}
	} else {
		history = []int{}
	}

	if err := json.NewEncoder(w).Encode(history); err != nil {
		http.Error(w, "Failed to encode history", http.StatusInternalServerError)
		return
	}
}

// DisconnectUser принудительно отключает пользователя
func (h *AdminHandler) DisconnectUser(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	vars := mux.Vars(r)
	connectionID := vars["id"]

	if connectionID == "" {
		http.Error(w, "Connection ID is required", http.StatusBadRequest)
		return
	}

	// Отключаем реальное соединение через WebSocket hub
	if err := h.wsHub.DisconnectClient(connectionID); err != nil {
		http.Error(w, "Failed to disconnect connection", http.StatusInternalServerError)
		return
	}
	
	response := map[string]string{
		"status": "success",
		"message": "User disconnected successfully",
	}

	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}

// getSessionsFromHub получает реальные данные сессий из WebSocket hub
func (h *AdminHandler) getSessionsFromHub() []Session {
	log.Printf("[ADMIN] getSessionsFromHub called")
	
	// Получаем данные из WebSocket hub
	hubData := h.wsHub.GetSessionsData()
	log.Printf("[ADMIN] Hub returned %d sessions", len(hubData))
	
	sessions := make([]Session, 0, len(hubData))
	
	for sessionKey, sessionData := range hubData {
		log.Printf("[ADMIN] Processing session: %s with %d connections", sessionKey, len(sessionData.Connections))
		// Получаем длину истории из базы данных
		dbSession, err := h.repo.GetSession(sessionKey)
		historyLength := 0
		password := ""
		if err == nil && dbSession != nil {
			historyLength = len(dbSession.History)
			password = dbSession.Password
		}
		
		// Создаем сессию для админ-панели
		adminSession := Session{
			Key:               sessionKey,
			Password:          password,
			CreatedAt:         sessionData.CreatedAt,
			LastActivity:      sessionData.LastActivity,
			HistoryLength:     historyLength,
			ActiveConnections: 0,
			TotalConnections:  len(sessionData.Connections),
			Connections:       make([]Connection, 0, len(sessionData.Connections)),
		}
		
		// Добавляем подключения
		for _, conn := range sessionData.Connections {
			connection := Connection{
				ID:           conn.ID,
				Key:          sessionKey,
				ConnectedAt:  conn.ConnectedAt,
				LastActivity: conn.LastActivity,
				Status:       conn.Status,
				IPAddress:    conn.IPAddress,
				UserAgent:    conn.UserAgent,
			}
			
			if conn.Status == "connected" {
				adminSession.ActiveConnections++
			}
			
			adminSession.Connections = append(adminSession.Connections, connection)
		}
		
		sessions = append(sessions, adminSession)
		log.Printf("[ADMIN] Added session %s with %d active connections", sessionKey, adminSession.ActiveConnections)
	}
	
	log.Printf("[ADMIN] Returning %d total sessions", len(sessions))
	return sessions
}

// RegisterAdminRoutes регистрирует маршруты для админ-панели
func (h *AdminHandler) RegisterAdminRoutes(router *mux.Router) {
	adminRouter := router.PathPrefix("/api/admin").Subrouter()
	
	adminRouter.HandleFunc("/sessions", h.GetSessions).Methods("GET", "OPTIONS")
	adminRouter.HandleFunc("/stats", h.GetStats).Methods("GET", "OPTIONS")
	adminRouter.HandleFunc("/sessions/{key}/history", h.GetSessionHistory).Methods("GET", "OPTIONS")
	adminRouter.HandleFunc("/connections/{id}/disconnect", h.DisconnectUser).Methods("POST", "OPTIONS")
} 