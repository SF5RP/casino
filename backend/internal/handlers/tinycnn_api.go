package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

// TinyCNNTrainingRequest запрос на обучение модели
type TinyCNNTrainingRequest struct {
	DataPath       string  `json:"dataPath"`
	ModelPath      string  `json:"modelPath"`
	LearningRate   float64 `json:"learningRate"`
	BatchSize      int     `json:"batchSize"`
	Epochs         int     `json:"epochs"`
	ValidationSplit float64 `json:"validationSplit"`
}

// TinyCNNTrainingResponse ответ на запрос обучения
type TinyCNNTrainingResponse struct {
	Success bool           `json:"success"`
	Message string         `json:"message"`
	Result  *TrainingResult `json:"result,omitempty"`
}

// TinyCNNStatusResponse ответ со статусом модели
type TinyCNNStatusResponse struct {
	ModelLoaded bool   `json:"modelLoaded"`
	ModelPath   string `json:"modelPath"`
	LastTrained string `json:"lastTrained,omitempty"`
}

// TinyCNNDataCreationRequest запрос на создание данных обучения
type TinyCNNDataCreationRequest struct {
	SquaresDir string `json:"squaresDir"`
	OutputDir  string `json:"outputDir"`
}

// TinyCNNDataCreationResponse ответ на создание данных обучения
type TinyCNNDataCreationResponse struct {
	Success     bool   `json:"success"`
	Message     string `json:"message"`
	ImagesCount int    `json:"imagesCount"`
	OutputPath  string `json:"outputPath"`
}

// TinyCNNAPIHandler обработчик API для Tiny-CNN
type TinyCNNAPIHandler struct {
	handler *BlueSquareHandler
}

// NewTinyCNNAPIHandler создает новый API обработчик
func NewTinyCNNAPIHandler(handler *BlueSquareHandler) *TinyCNNAPIHandler {
	return &TinyCNNAPIHandler{
		handler: handler,
	}
}

// HandleTraining обрабатывает запрос на обучение модели
func (h *TinyCNNAPIHandler) HandleTraining(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	var req TinyCNNTrainingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}
	
	// Валидируем параметры
	if req.DataPath == "" {
		req.DataPath = filepath.Join(h.handler.uploadDir, "training_data")
	}
	if req.ModelPath == "" {
		req.ModelPath = filepath.Join(h.handler.uploadDir, "models", "tinycnn_model.onnx")
	}
	if req.LearningRate <= 0 {
		req.LearningRate = 0.001
	}
	if req.BatchSize <= 0 {
		req.BatchSize = 32
	}
	if req.Epochs <= 0 {
		req.Epochs = 10
	}
	if req.ValidationSplit < 0 || req.ValidationSplit > 1 {
		req.ValidationSplit = 0.2
	}
	
	log.Printf("[TinyCNN API] Starting training with config: %+v", req)
	
	// Создаем тренер
	config := TrainingConfig{
		DataPath:       req.DataPath,
		ModelPath:      req.ModelPath,
		LearningRate:   req.LearningRate,
		BatchSize:      req.BatchSize,
		Epochs:         req.Epochs,
		ValidationSplit: req.ValidationSplit,
	}
	
	trainer := NewTinyCNNTrainer(config)
	
	// Запускаем обучение
	result, err := trainer.TrainModel()
	if err != nil {
		log.Printf("[TinyCNN API] Training failed: %v", err)
		response := TinyCNNTrainingResponse{
			Success: false,
			Message: fmt.Sprintf("Training failed: %v", err),
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(response)
		return
	}
	
	log.Printf("[TinyCNN API] Training completed successfully")
	response := TinyCNNTrainingResponse{
		Success: true,
		Message: "Training completed successfully",
		Result:  result,
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleStatus обрабатывает запрос статуса модели
func (h *TinyCNNAPIHandler) HandleStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	modelPath := filepath.Join(h.handler.uploadDir, "models", "tinycnn_model.onnx")
	
	// Проверяем существование модели
	var lastTrained string
	
	if _, err := os.Stat(modelPath); err == nil {
		// Получаем время последнего изменения
		if info, err := os.Stat(modelPath); err == nil {
			lastTrained = info.ModTime().Format(time.RFC3339)
		}
	}
	
	response := TinyCNNStatusResponse{
		ModelLoaded: h.handler.tinyCNN != nil && h.handler.tinyCNN.model != nil && h.handler.tinyCNN.model.loaded,
		ModelPath:   modelPath,
		LastTrained: lastTrained,
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleCreateTrainingData обрабатывает запрос на создание данных обучения
func (h *TinyCNNAPIHandler) HandleCreateTrainingData(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	var req TinyCNNDataCreationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}
	
	// Валидируем параметры
	if req.SquaresDir == "" {
		req.SquaresDir = filepath.Join(h.handler.uploadDir, "squares")
	}
	if req.OutputDir == "" {
		req.OutputDir = filepath.Join(h.handler.uploadDir, "training_data")
	}
	
	log.Printf("[TinyCNN API] Creating training data from %s to %s", req.SquaresDir, req.OutputDir)
	
	// Проверяем существование директории с квадратами
	if _, err := os.Stat(req.SquaresDir); os.IsNotExist(err) {
		response := TinyCNNDataCreationResponse{
			Success: false,
			Message: fmt.Sprintf("Squares directory not found: %s", req.SquaresDir),
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(response)
		return
	}
	
	// Создаем данные для обучения
	err := h.handler.CreateTrainingDataFromSquares(req.SquaresDir, req.OutputDir)
	if err != nil {
		log.Printf("[TinyCNN API] Failed to create training data: %v", err)
		response := TinyCNNDataCreationResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to create training data: %v", err),
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(response)
		return
	}
	
	// Подсчитываем количество созданных изображений
	imagesCount := 0
	filepath.Walk(req.OutputDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			ext := filepath.Ext(path)
			if ext == ".png" || ext == ".jpg" || ext == ".jpeg" {
				imagesCount++
			}
		}
		return nil
	})
	
	log.Printf("[TinyCNN API] Created %d training images", imagesCount)
	response := TinyCNNDataCreationResponse{
		Success:     true,
		Message:     "Training data created successfully",
		ImagesCount: imagesCount,
		OutputPath:  req.OutputDir,
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandlePredict обрабатывает запрос на предсказание
func (h *TinyCNNAPIHandler) HandlePredict(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	// Получаем параметры из query string
	imagePath := r.URL.Query().Get("image")
	if imagePath == "" {
		http.Error(w, "image parameter is required", http.StatusBadRequest)
		return
	}
	
	// Проверяем существование файла
	if _, err := os.Stat(imagePath); os.IsNotExist(err) {
		http.Error(w, fmt.Sprintf("Image file not found: %s", imagePath), http.StatusNotFound)
		return
	}
	
	// Загружаем изображение
	img, err := h.handler.loadImage(imagePath)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to load image: %v", err), http.StatusInternalServerError)
		return
	}
	
	// Проверяем доступность Tiny-CNN
	if h.handler.tinyCNN == nil {
		http.Error(w, "Tiny-CNN model not available", http.StatusServiceUnavailable)
		return
	}
	
	// Выполняем предсказание
	result, err := h.handler.tinyCNN.RecognizeDigit(img)
	if err != nil {
		http.Error(w, fmt.Sprintf("Prediction failed: %v", err), http.StatusInternalServerError)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// HandleReloadModel перезагружает модель
func (h *TinyCNNAPIHandler) HandleReloadModel(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	log.Printf("[TinyCNN API] Reloading model")
	
	// Создаем новый Tiny-CNN обработчик
	modelPath := filepath.Join(h.handler.uploadDir, "models", "tinycnn_model.onnx")
	tinyCNN := NewTinyCNNOCRHandler(modelPath)
	
	// Инициализируем
	if err := tinyCNN.Initialize(); err != nil {
		log.Printf("[TinyCNN API] Failed to reload model: %v", err)
		http.Error(w, fmt.Sprintf("Failed to reload model: %v", err), http.StatusInternalServerError)
		return
	}
	
	// Заменяем старый обработчик
	h.handler.tinyCNN = tinyCNN
	
	log.Printf("[TinyCNN API] Model reloaded successfully")
	
	response := map[string]interface{}{
		"success": true,
		"message": "Model reloaded successfully",
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// RegisterRoutes регистрирует маршруты для Tiny-CNN API
func (h *TinyCNNAPIHandler) RegisterRoutes(router interface{}) {
	// Используем interface{} для совместимости с разными типами роутеров
	switch r := router.(type) {
	case *http.ServeMux:
		r.HandleFunc("/api/tinycnn/train", h.HandleTraining)
		r.HandleFunc("/api/tinycnn/status", h.HandleStatus)
		r.HandleFunc("/api/tinycnn/create-data", h.HandleCreateTrainingData)
		r.HandleFunc("/api/tinycnn/predict", h.HandlePredict)
		r.HandleFunc("/api/tinycnn/reload", h.HandleReloadModel)
	default:
		// Для других типов роутеров (например, gorilla/mux) используем рефлексию
		log.Printf("[TinyCNN API] Router type not supported: %T", router)
	}
	
	log.Printf("[TinyCNN API] Routes registered:")
	log.Printf("[TinyCNN API]   POST /api/tinycnn/train - Train model")
	log.Printf("[TinyCNN API]   GET  /api/tinycnn/status - Get model status")
	log.Printf("[TinyCNN API]   POST /api/tinycnn/create-data - Create training data")
	log.Printf("[TinyCNN API]   POST /api/tinycnn/predict - Predict digit")
	log.Printf("[TinyCNN API]   POST /api/tinycnn/reload - Reload model")
}
