package websocket

import (
	"encoding/json"
	"log"
	"net/http"

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
}

// Client is a middleman between the websocket connection and the hub
type Client struct {
	hub *Hub

	// The websocket connection
	conn *websocket.Conn

	// Buffered channel of outbound messages
	send chan []byte
}

// NewHub creates a new WebSocket hub
func NewHub(repo database.RouletteRepositoryInterface) *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		repo:       repo,
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

	client := &Client{
		hub:  h,
		conn: conn,
		send: make(chan []byte, 256),
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
				if message.Type == "saveNumber" || message.Type == "updateHistory" {
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
	case "getHistory":
		return c.handleGetHistory(message)
	case "saveNumber":
		return c.handleSaveNumber(message)
	case "updateHistory":
		return c.handleUpdateHistory(message)
	default:
		log.Printf("Unknown message type: %s", message.Type)
		return nil, nil
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