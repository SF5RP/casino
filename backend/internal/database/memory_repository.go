package database

import (
	"casino-backend/internal/models"
	"fmt"
	"log"
	"sync"
	"time"
)

// MemoryRepository implements RouletteRepositoryInterface using in-memory storage
type MemoryRepository struct {
	sessions map[string]*models.RouletteSession
	mutex    sync.RWMutex
	nextID   int
}

// NewMemoryRepository creates a new in-memory repository
func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{
		sessions: make(map[string]*models.RouletteSession),
		mutex:    sync.RWMutex{},
		nextID:   1,
	}
}

// GetSession retrieves a session by key
func (r *MemoryRepository) GetSession(key string) (*models.RouletteSession, error) {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	session, exists := r.sessions[key]
	if !exists {
		return nil, nil // Session not found
	}

	// Return a copy to avoid race conditions
	sessionCopy := *session
	sessionCopy.History = make([]models.RouletteNumber, len(session.History))
	copy(sessionCopy.History, session.History)

	return &sessionCopy, nil
}

// CreateSession creates a new session without password
func (r *MemoryRepository) CreateSession(key string) (*models.RouletteSession, error) {
	return r.CreateSessionWithPassword(key, "")
}

// CreateSessionWithPassword creates a new session with password
func (r *MemoryRepository) CreateSessionWithPassword(key, password string) (*models.RouletteSession, error) {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	// Check if session already exists
	if existingSession, exists := r.sessions[key]; exists {
		// Если сессия существует, но у нее нет пароля, а новый пароль предоставлен - обновляем.
		if existingSession.Password == "" && password != "" {
			existingSession.Password = password
			existingSession.UpdatedAt = time.Now()
		}
		return existingSession, nil
	}

	// Create new session
	log.Printf("[MEMORY_DB] CREATED NEW SESSION. Key: '%s', Password: '%s'", key, password)
	session := &models.RouletteSession{
		ID:        r.nextID,
		Key:       key,
		Password:  password,
		History:   []models.RouletteNumber{},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	r.sessions[key] = session
	r.nextID++

	return session, nil
}

// ValidateSessionPassword validates password for a session
func (r *MemoryRepository) ValidateSessionPassword(key, password string) (bool, error) {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	session, exists := r.sessions[key]
	
	if !exists {
		// Если сессии не существует, но пароль предоставлен - это попытка создать защищенную сессию
		// Если пароля нет - это попытка подключиться к несуществующей сессии (разрешаем создание без пароля)
		return password == "", nil
	}

	// Если у сессии нет пароля, доступ свободный
	if session.Password == "" {
		return true, nil
	}

	// Проверяем пароль
	return session.Password == password, nil
}

// AddNumberToSession adds a number to a session
func (r *MemoryRepository) AddNumberToSession(key string, number models.RouletteNumber) (*models.RouletteSession, error) {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	// Get or create session
	session, exists := r.sessions[key]
	if !exists {
		session = &models.RouletteSession{
			ID:        r.nextID,
			Key:       key,
			History:   []models.RouletteNumber{},
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
		r.sessions[key] = session
		r.nextID++
	}

	// Add number to history
	session.History = append(session.History, number)
	session.UpdatedAt = time.Now()

	// Return a copy
	sessionCopy := *session
	sessionCopy.History = make([]models.RouletteNumber, len(session.History))
	copy(sessionCopy.History, session.History)

	return &sessionCopy, nil
}

// UpdateSessionHistory updates the entire history of a session
func (r *MemoryRepository) UpdateSessionHistory(key string, history []models.RouletteNumber) (*models.RouletteSession, error) {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	// Get or create session
	session, exists := r.sessions[key]
	if !exists {
		session = &models.RouletteSession{
			ID:        r.nextID,
			Key:       key,
			History:   []models.RouletteNumber{},
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
		r.sessions[key] = session
		r.nextID++
	}

	// Update history
	session.History = make([]models.RouletteNumber, len(history))
	copy(session.History, history)
	session.UpdatedAt = time.Now()

	// Return a copy
	sessionCopy := *session
	sessionCopy.History = make([]models.RouletteNumber, len(session.History))
	copy(sessionCopy.History, session.History)

	return &sessionCopy, nil
}

// GetAllSessions returns all sessions
func (r *MemoryRepository) GetAllSessions() ([]*models.RouletteSession, error) {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	sessions := make([]*models.RouletteSession, 0, len(r.sessions))
	for _, session := range r.sessions {
		// Return copies to avoid race conditions
		sessionCopy := *session
		sessionCopy.History = make([]models.RouletteNumber, len(session.History))
		copy(sessionCopy.History, session.History)
		sessions = append(sessions, &sessionCopy)
	}

	return sessions, nil
}

// DeleteSession deletes a session by key
func (r *MemoryRepository) DeleteSession(key string) error {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	delete(r.sessions, key)
	return nil
}

// GetStats returns repository statistics
func (r *MemoryRepository) GetStats() map[string]interface{} {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	totalNumbers := 0
	for _, session := range r.sessions {
		totalNumbers += len(session.History)
	}

	return map[string]interface{}{
		"type":           "memory",
		"sessions_count": len(r.sessions),
		"total_numbers":  totalNumbers,
		"status":         "active",
	}
}

// Close does nothing for memory repository
func (r *MemoryRepository) Close() error {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	
	// Clear all data
	r.sessions = make(map[string]*models.RouletteSession)
	return nil
}

// Ping always returns nil for memory repository
func (r *MemoryRepository) Ping() error {
	return nil
}

// Info returns information about the memory repository
func (r *MemoryRepository) Info() string {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	
	return fmt.Sprintf("In-Memory Repository: %d sessions, %d total numbers", 
		len(r.sessions), r.getTotalNumbers())
}

// Helper method to get total numbers count
func (r *MemoryRepository) getTotalNumbers() int {
	total := 0
	for _, session := range r.sessions {
		total += len(session.History)
	}
	return total
} 