package websocket

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"casino-backend/internal/database"
	"casino-backend/internal/models"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// Allow connections from any origin
		return true
	},
}

// Hub maintains the set of active clients and broadcasts messages to the clients
type Hub struct {
	// Registered clients
	clients map[*Client]bool

	// Inbound messages from the clients
	broadcast chan []byte

	// Register requests from the clients
	register chan *Client

	// Unregister requests from clients
	unregister chan *Client

	// Repository for database operations
	repo database.RouletteRepositoryInterface
	
	// Session tracking for admin panel
	sessions map[string]*SessionData
	mu       sync.RWMutex
	jwtSecret []byte
}

// ClientInfo содержит метаданные о клиенте для админ-панели
type ClientInfo struct {
	ID           string    `json:"id"`
	ConnectedAt  time.Time `json:"connectedAt"`
	LastActivity time.Time `json:"lastActivity"`
	Status       string    `json:"status"`
	IPAddress    string    `json:"ipAddress"`
	UserAgent    string    `json:"userAgent"`
	SessionKey   string    `json:"sessionKey"`
}

// SessionData содержит данные сессии для админ-панели
type SessionData struct {
	CreatedAt    time.Time              `json:"createdAt"`
	LastActivity time.Time              `json:"lastActivity"`
	Connections  map[string]*ClientInfo `json:"connections"`
}

// Client is a middleman between the websocket connection and the hub
type Client struct {
	hub *Hub

	// The websocket connection
	conn *websocket.Conn

	// Buffered channel of outbound messages
	send chan []byte
	
	// Client metadata
	info *ClientInfo
}

// NewHub creates a new WebSocket hub
func NewHub(repo database.RouletteRepositoryInterface, jwtSecret []byte) *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		repo:       repo,
		jwtSecret:  jwtSecret,
		sessions:   make(map[string]*SessionData),
	}
}

// Run starts the hub
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
			log.Println("Client connected")

		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				
				// Обновляем статус клиента в сессии
				if client.info != nil {
					client.info.Status = "disconnected"
				}
				
				log.Println("Client disconnected")
			}

		case message := <-h.broadcast:
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
		}
	}
}

// HandleWebSocket handles websocket requests from the peer
func (h *Hub) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	// Создаем информацию о клиенте
	clientInfo := &ClientInfo{
		ID:           generateClientID(),
		ConnectedAt:  time.Now(),
		LastActivity: time.Now(),
		Status:       "connected",
		IPAddress:    getClientIP(r),
		UserAgent:    r.Header.Get("User-Agent"),
	}

	log.Printf("[WS] New client connected: %s from %s", clientInfo.ID, clientInfo.IPAddress)

	client := &Client{
		hub:  h,
		conn: conn,
		send: make(chan []byte, 256),
		info: clientInfo,
	}

	client.hub.register <- client

	// Allow collection of memory referenced by the caller by doing all work in new goroutines
	go client.writePump()
	go client.readPump()
}

// readPump pumps messages from the websocket connection to the hub
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	for {
		_, messageBytes, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		var message models.WSMessage
		if err := json.Unmarshal(messageBytes, &message); err != nil {
			log.Printf("Error parsing WebSocket message: %v", err)
			continue
		}

		// Handle different message types
		response, err := c.handleMessage(message)
		if err != nil {
			log.Printf("Error handling WebSocket message: %v", err)
			errorResponse := models.WSMessage{
				Type: "error",
			}
			if responseBytes, err := json.Marshal(errorResponse); err == nil {
				c.send <- responseBytes
			}
			continue
		}

		if response != nil {
			if responseBytes, err := json.Marshal(response); err == nil {
				// Broadcast to all clients or send to specific client based on message type
				if message.Type == "saveNumber" || message.Type == "updateHistory" || message.Type == "update" {
					c.hub.broadcast <- responseBytes
				} else {
					c.send <- responseBytes
				}
			}
		}
	}
}

// writePump pumps messages from the hub to the websocket connection
func (c *Client) writePump() {
	defer c.conn.Close()

	for {
		select {
		case message, ok := <-c.send:
			if !ok {
				// The hub closed the channel
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				log.Printf("WebSocket write error: %v", err)
				return
			}
		}
	}
}

// handleMessage processes incoming WebSocket messages
func (c *Client) handleMessage(message models.WSMessage) (*models.WSMessage, error) {
	switch message.Type {
	case "join":
		return c.handleJoin(message)
	case "update":
		return c.handleUpdate(message)
	case "getHistory":
		return c.handleGetHistory(message)
	case "saveNumber":
		return c.handleSaveNumber(message)
	case "updateHistory":
		return c.handleUpdateHistory(message)
	default:
		return nil, fmt.Errorf("unknown message type: %s", message.Type)
	}
}

// handleGetHistory handles getHistory WebSocket messages
func (c *Client) handleGetHistory(message models.WSMessage) (*models.WSMessage, error) {
	session, err := c.hub.repo.GetSession(message.Key)
	if err != nil {
		return nil, err
	}

	var history []models.RouletteNumber
	if session != nil {
		history = session.History
	} else {
		history = []models.RouletteNumber{}
	}

	return &models.WSMessage{
		Type:    "historyUpdate",
		Key:     message.Key,
		History: history,
	}, nil
}

// handleSaveNumber handles saveNumber WebSocket messages
func (c *Client) handleSaveNumber(message models.WSMessage) (*models.WSMessage, error) {
	// Проверяем авторизацию
	isValid, err := c.hub.repo.ValidateSessionPassword(message.Key, message.Password)
	if err != nil {
		return &models.WSMessage{
			Type:  "error",
			Error: "Ошибка проверки пароля",
		}, nil
	}
	
	if !isValid {
		return &models.WSMessage{
			Type:  "authRequired",
			Key:   message.Key,
			Error: "Неверный пароль",
		}, nil
	}

	session, err := c.hub.repo.AddNumberToSession(message.Key, message.Number)
	if err != nil {
		return nil, err
	}

	return &models.WSMessage{
		Type:    "numberSaved",
		Key:     message.Key,
		Number:  message.Number,
		History: session.History,
	}, nil
}

// handleUpdateHistory handles updateHistory WebSocket messages
func (c *Client) handleUpdateHistory(message models.WSMessage) (*models.WSMessage, error) {
	// Проверяем авторизацию
	isValid, err := c.hub.repo.ValidateSessionPassword(message.Key, message.Password)
	if err != nil {
		return &models.WSMessage{
			Type:  "error",
			Error: "Ошибка проверки пароля",
		}, nil
	}
	
	if !isValid {
		return &models.WSMessage{
			Type:  "authRequired",
			Key:   message.Key,
			Error: "Неверный пароль",
		}, nil
	}

	session, err := c.hub.repo.UpdateSessionHistory(message.Key, message.History)
	if err != nil {
		return nil, err
	}

	return &models.WSMessage{
		Type:    "historyUpdated",
		Key:     message.Key,
		History: session.History,
	}, nil
}

// handleJoin handles join WebSocket messages (when client connects to a session)
func (c *Client) handleJoin(message models.WSMessage) (*models.WSMessage, error) {
	log.Printf("[WS] Client %s joining session %s", c.info.ID, message.Key)

	session, err := c.hub.repo.GetSession(message.Key)
	if err != nil {
		log.Printf("[WS] Error getting session %s: %v", message.Key, err)
		return nil, err
	}
	if session == nil {
		log.Printf("[WS] Session %s not found", message.Key)
		return &models.WSMessage{Type: "error", Error: "Комната не найдена"}, nil
	}

	// Если сессия защищена паролем, проверяем токен
	if session.Password != "" {
		if message.Token == "" {
			return &models.WSMessage{Type: "authRequired", Key: message.Key, Error: "Требуется токен"}, nil
		}

		// Парсим и валидируем токен
		token, err := jwt.Parse(message.Token, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return c.hub.jwtSecret, nil
		})

		if err != nil || !token.Valid {
			log.Printf("[WS] Invalid token for session %s: %v", message.Key, err)
			return &models.WSMessage{Type: "authRequired", Key: message.Key, Error: "Неверный или просроченный токен"}, nil
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok || claims["key"] != message.Key {
			log.Printf("[WS] Token claim 'key' does not match session key for %s", message.Key)
			return &models.WSMessage{Type: "authRequired", Key: message.Key, Error: "Неверный токен"}, nil
		}
	}

	// Авторизация пройдена
	c.hub.updateClientSession(c, message.Key)

	return &models.WSMessage{
		Type:    "sync",
		Key:     message.Key,
		History: session.History,
	}, nil
}

// handleUpdate handles update WebSocket messages (when client updates history)
func (c *Client) handleUpdate(message models.WSMessage) (*models.WSMessage, error) {
	// Проверяем авторизацию
	isValid, err := c.hub.repo.ValidateSessionPassword(message.Key, message.Password)
	if err != nil {
		return &models.WSMessage{
			Type:  "error",
			Error: "Ошибка проверки пароля",
		}, nil
	}
	
	if !isValid {
		return &models.WSMessage{
			Type:  "authRequired",
			Key:   message.Key,
			Error: "Неверный пароль",
		}, nil
	}

	session, err := c.hub.repo.UpdateSessionHistory(message.Key, message.History)
	if err != nil {
		return nil, err
	}

	// Broadcast the update to all clients
	return &models.WSMessage{
		Type:    "sync",
		Key:     message.Key,
		History: session.History,
	}, nil
}

// Вспомогательные функции для админ-панели

// generateClientID генерирует уникальный ID для клиента
func generateClientID() string {
	b := make([]byte, 8)
	rand.Read(b)
	return fmt.Sprintf("client_%x", b)
}

// getClientIP получает IP адрес клиента
func getClientIP(r *http.Request) string {
	// Проверяем заголовки прокси
	if ip := r.Header.Get("X-Forwarded-For"); ip != "" {
		return strings.Split(ip, ",")[0]
	}
	if ip := r.Header.Get("X-Real-IP"); ip != "" {
		return ip
	}
	return r.RemoteAddr
}

// GetSessionsData возвращает данные всех сессий для админ-панели
func (h *Hub) GetSessionsData() map[string]*SessionData {
	h.mu.RLock()
	defer h.mu.RUnlock()
	
	log.Printf("[HUB] GetSessionsData called, have %d sessions in memory", len(h.sessions))
	
	result := make(map[string]*SessionData)
	for key, session := range h.sessions {
		log.Printf("[HUB] Session %s: %d connections, created at %v", key, len(session.Connections), session.CreatedAt)
		result[key] = session
	}
	
	log.Printf("[HUB] Returning %d sessions to admin", len(result))
	return result
}

// DisconnectClient принудительно отключает клиента по ID
func (h *Hub) DisconnectClient(clientID string) error {
	h.mu.Lock()
	defer h.mu.Unlock()
	
	// Ищем клиента по ID
	for client := range h.clients {
		if client.info.ID == clientID {
			// Обновляем статус
			client.info.Status = "disconnected"
			
			// Отключаем клиента
			close(client.send)
			client.conn.Close()
			delete(h.clients, client)
			
			log.Printf("Admin disconnected client: %s", clientID)
			return nil
		}
	}
	
	return fmt.Errorf("client not found: %s", clientID)
}

// updateClientSession обновляет информацию о сессии клиента
func (h *Hub) updateClientSession(client *Client, sessionKey string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	
	log.Printf("[HUB] updateClientSession called for client %s and session %s", client.info.ID, sessionKey)
	
	// Обновляем ключ сессии в информации о клиенте
	client.info.SessionKey = sessionKey
	client.info.LastActivity = time.Now()
	
	// Создаем или обновляем данные сессии
	if _, exists := h.sessions[sessionKey]; !exists {
		log.Printf("[HUB] Creating new session data for %s", sessionKey)
		h.sessions[sessionKey] = &SessionData{
			CreatedAt:    time.Now(),
			LastActivity: time.Now(),
			Connections:  make(map[string]*ClientInfo),
		}
	}
	
	// Добавляем клиента к сессии
	h.sessions[sessionKey].Connections[client.info.ID] = client.info
	h.sessions[sessionKey].LastActivity = time.Now()
	
	log.Printf("[HUB] Session %s now has %d connections", sessionKey, len(h.sessions[sessionKey].Connections))
} 