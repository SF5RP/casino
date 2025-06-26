package websocket

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"sync"
	"time"

	"casino-backend/internal/database"
	"casino-backend/internal/models"

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
	// Map of session keys to a set of registered clients.
	sessions map[string]map[*Client]bool

	// Inbound messages from the clients.
	broadcast chan *WSMessageWithClient

	// Register requests from the clients.
	register chan *Client

	// Unregister requests from clients.
	unregister chan *Client

	// Repository for database operations.
	repo database.RouletteRepositoryInterface

	// Session tracking for admin panel.
	adminSessions map[string]*SessionData
	mu            sync.RWMutex
	jwtSecret     []byte
}

// WSMessageWithClient wraps a WSMessage with the client that sent it.
type WSMessageWithClient struct {
	Message *models.WSMessage
	Client  *Client
}

// ClientInfo contains metadata about the client for the admin panel.
type ClientInfo struct {
	ID           string    `json:"id"`
	ConnectedAt  time.Time `json:"connectedAt"`
	LastActivity time.Time `json:"lastActivity"`
	Status       string    `json:"status"`
	IPAddress    string    `json:"ipAddress"`
	UserAgent    string    `json:"userAgent"`
	SessionKey   string    `json:"sessionKey"`
}

// SessionData contains session data for the admin panel.
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
		sessions:      make(map[string]map[*Client]bool),
		broadcast:     make(chan *WSMessageWithClient),
		register:      make(chan *Client),
		unregister:    make(chan *Client),
		repo:          repo,
		jwtSecret:     jwtSecret,
		adminSessions: make(map[string]*SessionData),
	}
}

// Run starts the hub
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			if client.info.SessionKey != "" {
				if h.sessions[client.info.SessionKey] == nil {
					h.sessions[client.info.SessionKey] = make(map[*Client]bool)
				}
				h.sessions[client.info.SessionKey][client] = true
				log.Printf("Client %s registered to session %s", client.info.ID, client.info.SessionKey)
			}
		case client := <-h.unregister:
			if client.info.SessionKey != "" {
				if sessionClients, ok := h.sessions[client.info.SessionKey]; ok {
					if _, ok := sessionClients[client]; ok {
						delete(sessionClients, client)
						close(client.send)
						if len(sessionClients) == 0 {
							delete(h.sessions, client.info.SessionKey)
						}
						log.Printf("Client %s unregistered from session %s", client.info.ID, client.info.SessionKey)
					}
				}
			}
			if client.info != nil {
				h.mu.Lock()
				if adminSess, ok := h.adminSessions[client.info.SessionKey]; ok {
					if connInfo, ok := adminSess.Connections[client.info.ID]; ok {
						connInfo.Status = "disconnected"
					}
				}
				h.mu.Unlock()
			}
		case messageWithClient := <-h.broadcast:
			sessionKey := messageWithClient.Client.info.SessionKey
			if sessionClients, ok := h.sessions[sessionKey]; ok {
				messageBytes, err := json.Marshal(messageWithClient.Message)
				if err != nil {
					log.Printf("Error marshalling broadcast message: %v", err)
					continue
				}
				for c := range sessionClients {
					select {
					case c.send <- messageBytes:
					default:
						close(c.send)
						delete(sessionClients, c)
					}
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

	// Create client info
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

	// Client registration is handled in the readPump after the 'join' message
	// to ensure we have the session key.

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

		// Update last activity time
		c.info.LastActivity = time.Now()
		c.hub.mu.Lock()
		if adminSess, ok := c.hub.adminSessions[c.info.SessionKey]; ok {
			if connInfo, ok := adminSess.Connections[c.info.ID]; ok {
				connInfo.LastActivity = c.info.LastActivity
			}
		}
		c.hub.mu.Unlock()


		response, err := c.handleMessage(message)
		if err != nil {
			log.Printf("Error handling WebSocket message: %v", err)
			errorResponse := models.WSMessage{Type: "error", Error: err.Error()}
			if responseBytes, err := json.Marshal(errorResponse); err == nil {
				c.send <- responseBytes
			}
			continue
		}

		if response != nil {
			// Broadcast to all clients in the same session for state-changing events
			if message.Type == "add" || message.Type == "remove" {
				c.hub.broadcast <- &WSMessageWithClient{Message: response, Client: c}
			} else {
				// Send other messages (like history sync on join) only to the requesting client
				responseBytes, err := json.Marshal(response)
				if err != nil {
					log.Printf("Error marshalling response: %v", err)
					continue
				}
				c.send <- responseBytes
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
		// Handle registration here since we now have the session key
		err := c.handleJoinAndRegister(message)
		if err != nil {
			return nil, err
		}
		// Return history to the joining client
		return c.handleGetHistory(message)
	case "add":
		return c.handleAddNumber(message)
	case "remove":
		return c.handleRemoveNumber(message)
	default:
		return nil, fmt.Errorf("unknown message type: %s", message.Type)
	}
}

// handleAddNumber handles adding a number and prepares it for broadcast.
func (c *Client) handleAddNumber(message models.WSMessage) (*models.WSMessage, error) {
	if message.Number == nil {
		return nil, fmt.Errorf("number is missing in 'add' message")
	}
	if c.info.SessionKey == "" {
		return nil, fmt.Errorf("client has no session key")
	}

	session, err := c.hub.repo.AddNumberToSession(c.info.SessionKey, *message.Number)
	if err != nil {
		return nil, fmt.Errorf("failed to add number: %w", err)
	}

	// The response will be broadcast to all clients in the session.
	return &models.WSMessage{
		Type:    "add",
		Key:     c.info.SessionKey,
		Number:  message.Number,
		Version: len(session.History),
	}, nil
}

// handleRemoveNumber handles removing a number and prepares it for broadcast.
func (c *Client) handleRemoveNumber(message models.WSMessage) (*models.WSMessage, error) {
	if c.info.SessionKey == "" {
		return nil, fmt.Errorf("client has no session key")
	}

	// The nil check for message.Index is removed to avoid compilation error.
	// This assumes the client always sends a valid index for 'remove' operations.
	session, err := c.hub.repo.RemoveNumberFromSession(c.info.SessionKey, message.Index)
	if err != nil {
		return nil, fmt.Errorf("failed to remove number: %w", err)
	}

	// The response will be broadcast to all clients in the session.
	return &models.WSMessage{
		Type:    "remove",
		Key:     c.info.SessionKey,
		Index:   message.Index,
		Version: len(session.History),
	}, nil
}

// handleGetHistory fetches history for a session.
func (c *Client) handleGetHistory(message models.WSMessage) (*models.WSMessage, error) {
	if c.info.SessionKey == "" {
		return nil, fmt.Errorf("client has no session key")
	}
	session, err := c.hub.repo.GetSession(c.info.SessionKey)
	if err != nil {
		return nil, fmt.Errorf("failed to get session: %w", err)
	}
	return &models.WSMessage{
		Type:    "sync",
		Key:     c.info.SessionKey,
		History: session.History,
		Full:    true,
	}, nil
}

// handleJoinAndRegister handles the join message and registers the client.
func (c *Client) handleJoinAndRegister(message models.WSMessage) error {
	if message.Key == "" {
		return fmt.Errorf("session key is required for join")
	}

	// Get or create the session
	session, err := c.hub.repo.GetSession(message.Key)
	if err != nil {
		return fmt.Errorf("failed to get session: %w", err)
	}
	if session == nil {
		log.Printf("Session %s not found, creating a new one.", message.Key)
		session, err = c.hub.repo.CreateSession(message.Key)
		if err != nil {
			return fmt.Errorf("failed to create session: %w", err)
		}
	}

	// Here you would typically validate the token `message.Token`
	c.info.SessionKey = message.Key
	c.hub.register <- c
	c.hub.updateClientSession(c, message.Key)
	return nil
}

func generateClientID() string {
	b := make([]byte, 16)
	_, err := rand.Read(b)
	if err != nil {
		return ""
	}
	return fmt.Sprintf("%x", b)
}

func getClientIP(r *http.Request) string {
	ip := r.Header.Get("X-Forwarded-For")
	if ip == "" {
		ip = r.Header.Get("X-Real-IP")
	}
	if ip == "" {
		ip, _, _ = net.SplitHostPort(r.RemoteAddr)
	}
	return ip
}

func (h *Hub) GetSessionsData() map[string]*SessionData {
	h.mu.RLock()
	defer h.mu.RUnlock()
	
	// Deep copy to avoid race conditions on the returned map
	result := make(map[string]*SessionData, len(h.adminSessions))
	for key, session := range h.adminSessions {
		// Copy session data
		newSession := &SessionData{
			CreatedAt:    session.CreatedAt,
			LastActivity: session.LastActivity,
			Connections:  make(map[string]*ClientInfo, len(session.Connections)),
		}
		// Copy connection info
		for connID, connInfo := range session.Connections {
			newConnInfo := *connInfo
			newSession.Connections[connID] = &newConnInfo
		}
		result[key] = newSession
	}
	return result
}

func (h *Hub) DisconnectClient(clientID string) error {
	h.mu.Lock()
	defer h.mu.Unlock()

	var clientToDisconnect *Client
	var sessionKey string

	// Find the client across all sessions
	for key, sessionClients := range h.sessions {
		for client := range sessionClients {
			if client.info.ID == clientID {
				clientToDisconnect = client
				sessionKey = key
				break
			}
		}
		if clientToDisconnect != nil {
			break
		}
	}

	if clientToDisconnect != nil {
		log.Printf("Admin disconnecting client: %s from session %s", clientID, sessionKey)
		clientToDisconnect.conn.Close()
		delete(h.sessions[sessionKey], clientToDisconnect)
		if len(h.sessions[sessionKey]) == 0 {
			delete(h.sessions, sessionKey)
		}
		// Update admin panel data
		if adminSess, ok := h.adminSessions[sessionKey]; ok {
			delete(adminSess.Connections, clientID)
		}
		return nil
	}

	return fmt.Errorf("client with ID %s not found", clientID)
}

func (h *Hub) updateClientSession(client *Client, sessionKey string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Create or update admin session data
	if _, exists := h.adminSessions[sessionKey]; !exists {
		log.Printf("[HUB] Creating new admin session data for %s", sessionKey)
		h.adminSessions[sessionKey] = &SessionData{
			CreatedAt:    time.Now(),
			LastActivity: time.Now(),
			Connections:  make(map[string]*ClientInfo),
		}
	}

	client.info.LastActivity = time.Now()
	h.adminSessions[sessionKey].Connections[client.info.ID] = client.info
	h.adminSessions[sessionKey].LastActivity = time.Now()
	
	log.Printf("[HUB] Admin session %s now has %d connections", sessionKey, len(h.adminSessions[sessionKey].Connections))
} 