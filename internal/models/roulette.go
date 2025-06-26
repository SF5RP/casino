type WSMessage struct {
	Type    string         `json:"type"`
	Key     string         `json:"key"`
	Token   string         `json:"token,omitempty"`
	History []RouletteNumber `json:"history,omitempty"`
	Number  *RouletteNumber  `json:"number,omitempty"`
	Index   *int           `json:"index,omitempty"`
	Full    bool           `json:"full,omitempty"`
	Version int            `json:"version,omitempty"`
	Error   string         `json:"error,omitempty"`
}

// WSMessageWithClient is used in the hub to associate a message with a client.
type WSMessageWithClient struct {
	// ... existing code ...
} 