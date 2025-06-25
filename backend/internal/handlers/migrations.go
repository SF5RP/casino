package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"casino-backend/internal/database"

	"github.com/gorilla/mux"
)

type MigrationsHandler struct {
	db *database.DB
}

// NewMigrationsHandler creates a new migrations handler
func NewMigrationsHandler(db *database.DB) *MigrationsHandler {
	return &MigrationsHandler{db: db}
}

// GetMigrationStatus handles GET /api/migrations/status
func (h *MigrationsHandler) GetMigrationStatus(w http.ResponseWriter, r *http.Request) {
	if h.db == nil {
		http.Error(w, "Database not available (using in-memory storage)", http.StatusServiceUnavailable)
		return
	}

	status, err := h.db.GetMigrationStatus()
	if err != nil {
		log.Printf("Error getting migration status: %v", err)
		http.Error(w, "Failed to get migration status", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    status,
	})
}

// RunMigrations handles POST /api/migrations/up
func (h *MigrationsHandler) RunMigrations(w http.ResponseWriter, r *http.Request) {
	if h.db == nil {
		http.Error(w, "Database not available (using in-memory storage)", http.StatusServiceUnavailable)
		return
	}

	log.Println("Running migrations via API request...")

	err := h.db.RunMigrations()
	if err != nil {
		log.Printf("Error running migrations: %v", err)
		http.Error(w, "Failed to run migrations: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Get updated status
	status, err := h.db.GetMigrationStatus()
	if err != nil {
		log.Printf("Error getting migration status after run: %v", err)
		http.Error(w, "Migrations completed but failed to get status", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Migrations completed successfully",
		"data":    status,
	})
}

// RollbackMigrations handles POST /api/migrations/down/{steps}
func (h *MigrationsHandler) RollbackMigrations(w http.ResponseWriter, r *http.Request) {
	if h.db == nil {
		http.Error(w, "Database not available (using in-memory storage)", http.StatusServiceUnavailable)
		return
	}

	vars := mux.Vars(r)
	stepsStr := vars["steps"]
	
	steps, err := strconv.Atoi(stepsStr)
	if err != nil || steps < 1 {
		http.Error(w, "Invalid steps parameter (must be positive integer)", http.StatusBadRequest)
		return
	}

	log.Printf("Rolling back %d migrations via API request...", steps)

	err = h.db.RollbackMigrations(steps)
	if err != nil {
		log.Printf("Error rolling back migrations: %v", err)
		http.Error(w, "Failed to rollback migrations: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Get updated status
	status, err := h.db.GetMigrationStatus()
	if err != nil {
		log.Printf("Error getting migration status after rollback: %v", err)
		http.Error(w, "Rollback completed but failed to get status", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Successfully rolled back %d migrations", steps),
		"data":    status,
	})
}

// GetAvailableMigrations handles GET /api/migrations/list
func (h *MigrationsHandler) GetAvailableMigrations(w http.ResponseWriter, r *http.Request) {
	if h.db == nil {
		http.Error(w, "Database not available (using in-memory storage)", http.StatusServiceUnavailable)
		return
	}

	migrationManager := database.NewMigrationManager(h.db)
	migrations := migrationManager.GetMigrations()

	// Get applied migrations for status
	appliedVersions, err := migrationManager.GetAppliedMigrations()
	if err != nil {
		log.Printf("Error getting applied migrations: %v", err)
		http.Error(w, "Failed to get applied migrations", http.StatusInternalServerError)
		return
	}

	appliedMap := make(map[int]bool)
	for _, version := range appliedVersions {
		appliedMap[version] = true
	}

	// Build response with status for each migration
	type MigrationInfo struct {
		Version     int    `json:"version"`
		Description string `json:"description"`
		Applied     bool   `json:"applied"`
		HasUp       bool   `json:"has_up"`
		HasDown     bool   `json:"has_down"`
	}

	var migrationInfos []MigrationInfo
	for _, migration := range migrations {
		migrationInfos = append(migrationInfos, MigrationInfo{
			Version:     migration.Version,
			Description: migration.Description,
			Applied:     appliedMap[migration.Version],
			HasUp:       migration.Up != "",
			HasDown:     migration.Down != "",
		})
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":    true,
		"migrations": migrationInfos,
	})
}

// HandleOptions handles preflight OPTIONS requests for migrations endpoints
func (h *MigrationsHandler) HandleOptions(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.WriteHeader(http.StatusOK)
} 