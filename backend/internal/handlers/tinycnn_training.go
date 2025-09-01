package handlers

import (
	"encoding/json"
	"fmt"
	"image"
	"image/png"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/disintegration/imaging"
)

// TrainingData представляет данные для обучения
type TrainingData struct {
	Images []TrainingImage `json:"images"`
	Labels []int           `json:"labels"`
}

// TrainingImage представляет изображение для обучения
type TrainingImage struct {
	Path   string `json:"path"`
	Label  int    `json:"label"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
}

// TrainingConfig конфигурация для обучения
type TrainingConfig struct {
	DataPath     string  `json:"dataPath"`     // путь к данным обучения
	ModelPath    string  `json:"modelPath"`    // путь для сохранения модели
	LearningRate float64 `json:"learningRate"` // скорость обучения
	BatchSize    int     `json:"batchSize"`    // размер батча
	Epochs       int     `json:"epochs"`       // количество эпох
	ValidationSplit float64 `json:"validationSplit"` // доля данных для валидации
}

// TrainingResult результат обучения
type TrainingResult struct {
	EpochsCompleted int     `json:"epochsCompleted"`
	FinalLoss       float64 `json:"finalLoss"`
	FinalAccuracy   float64 `json:"finalAccuracy"`
	TrainingTime    string  `json:"trainingTime"`
	ModelSaved      bool    `json:"modelSaved"`
}

// TinyCNNTrainer тренер для Tiny-CNN модели
type TinyCNNTrainer struct {
	model   *TinyCNNModel
	config  TrainingConfig
}

// NewTinyCNNTrainer создает новый тренер
func NewTinyCNNTrainer(config TrainingConfig) *TinyCNNTrainer {
	model := NewTinyCNNModel(config.ModelPath)
	return &TinyCNNTrainer{
		model:  model,
		config: config,
	}
}

// LoadTrainingData загружает данные для обучения из директории
func (t *TinyCNNTrainer) LoadTrainingData() (*TrainingData, error) {
	log.Printf("[TinyCNN Training] Loading training data from %s", t.config.DataPath)
	
	var trainingData TrainingData
	
	// Сканируем директорию с данными
	err := filepath.Walk(t.config.DataPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		
		// Пропускаем директории
		if info.IsDir() {
			return nil
		}
		
		// Проверяем расширение файла
		ext := strings.ToLower(filepath.Ext(path))
		if ext != ".png" && ext != ".jpg" && ext != ".jpeg" {
			return nil
		}
		
		// Извлекаем метку из имени файла или директории
		label, err := t.extractLabelFromPath(path)
		if err != nil {
			log.Printf("[TinyCNN Training] Warning: failed to extract label from %s: %v", path, err)
			return nil
		}
		
		// Загружаем изображение для получения размеров
		img, err := t.loadImage(path)
		if err != nil {
			log.Printf("[TinyCNN Training] Warning: failed to load image %s: %v", path, err)
			return nil
		}
		
		bounds := img.Bounds()
		trainingImage := TrainingImage{
			Path:   path,
			Label:  label,
			Width:  bounds.Dx(),
			Height: bounds.Dy(),
		}
		
		trainingData.Images = append(trainingData.Images, trainingImage)
		trainingData.Labels = append(trainingData.Labels, label)
		
		return nil
	})
	
	if err != nil {
		return nil, fmt.Errorf("failed to scan training data directory: %w", err)
	}
	
	log.Printf("[TinyCNN Training] Loaded %d training images", len(trainingData.Images))
	return &trainingData, nil
}

// extractLabelFromPath извлекает метку из пути к файлу
func (t *TinyCNNTrainer) extractLabelFromPath(path string) (int, error) {
	// Вариант 1: метка в имени файла (например, "digit_5.png")
	filename := filepath.Base(path)
	nameWithoutExt := strings.TrimSuffix(filename, filepath.Ext(filename))
	
	// Ищем цифру в имени файла (только 1-9)
	for i := 1; i <= 9; i++ {
		if strings.Contains(nameWithoutExt, fmt.Sprintf("_%d", i)) || 
		   strings.Contains(nameWithoutExt, fmt.Sprintf("%d", i)) {
			return i, nil
		}
	}
	
	// Вариант 2: метка в имени родительской директории
	parentDir := filepath.Base(filepath.Dir(path))
	for i := 1; i <= 9; i++ {
		if parentDir == fmt.Sprintf("%d", i) {
			return i, nil
		}
	}
	
	// Вариант 3: пытаемся извлечь из имени файла как число
	if label, err := strconv.Atoi(nameWithoutExt); err == nil && label >= 1 && label <= 9 {
		return label, nil
	}
	
	return 0, fmt.Errorf("could not extract label from path: %s", path)
}

// loadImage загружает изображение
func (t *TinyCNNTrainer) loadImage(path string) (image.Image, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()
	
	img, _, err := image.Decode(file)
	if err != nil {
		return nil, err
	}
	
	return img, nil
}

// TrainModel обучает модель
func (t *TinyCNNTrainer) TrainModel() (*TrainingResult, error) {
	log.Printf("[TinyCNN Training] Starting model training")
	startTime := time.Now()
	
	// Загружаем данные обучения
	trainingData, err := t.LoadTrainingData()
	if err != nil {
		return nil, fmt.Errorf("failed to load training data: %w", err)
	}
	
	if len(trainingData.Images) == 0 {
		return nil, fmt.Errorf("no training data found")
	}
	
	// Инициализируем модель
	modelConfig := TinyCNNConfig{
		InputSize:    28,
		NumClasses:   10,
		LearningRate: t.config.LearningRate,
		BatchSize:    t.config.BatchSize,
		Epochs:       t.config.Epochs,
	}
	
	if err := t.model.Initialize(modelConfig); err != nil {
		return nil, fmt.Errorf("failed to initialize model: %w", err)
	}
	
	// Подготавливаем данные для обучения
	images, labels, err := t.prepareTrainingData(trainingData)
	if err != nil {
		return nil, fmt.Errorf("failed to prepare training data: %w", err)
	}
	
	// Обучаем модель
	finalLoss, finalAccuracy, err := t.trainEpochs(images, labels)
	if err != nil {
		return nil, fmt.Errorf("failed to train model: %w", err)
	}
	
	// Сохраняем модель
	modelSaved := false
	if err := t.model.SaveModel(); err != nil {
		log.Printf("[TinyCNN Training] Warning: failed to save model: %v", err)
	} else {
		modelSaved = true
	}
	
	trainingTime := time.Since(startTime)
	
	result := &TrainingResult{
		EpochsCompleted: t.config.Epochs,
		FinalLoss:       finalLoss,
		FinalAccuracy:   finalAccuracy,
		TrainingTime:    trainingTime.String(),
		ModelSaved:      modelSaved,
	}
	
	log.Printf("[TinyCNN Training] Training completed in %s", trainingTime)
	log.Printf("[TinyCNN Training] Final loss: %.4f, Final accuracy: %.4f", finalLoss, finalAccuracy)
	
	return result, nil
}

// prepareTrainingData подготавливает данные для обучения
func (t *TinyCNNTrainer) prepareTrainingData(data *TrainingData) ([]image.Image, []int, error) {
	log.Printf("[TinyCNN Training] Preparing %d training samples", len(data.Images))
	
	var images []image.Image
	var labels []int
	
	for _, trainingImage := range data.Images {
		img, err := t.loadImage(trainingImage.Path)
		if err != nil {
			log.Printf("[TinyCNN Training] Warning: failed to load image %s: %v", trainingImage.Path, err)
			continue
		}
		
		// Предобрабатываем изображение
		processedImg := t.preprocessTrainingImage(img)
		
		images = append(images, processedImg)
		labels = append(labels, trainingImage.Label)
	}
	
	log.Printf("[TinyCNN Training] Prepared %d training samples", len(images))
	return images, labels, nil
}

// preprocessTrainingImage предобрабатывает изображение для обучения
func (t *TinyCNNTrainer) preprocessTrainingImage(img image.Image) image.Image {
	// Конвертируем в grayscale и нормализуем размер
	bounds := img.Bounds()
	width, height := bounds.Dx(), bounds.Dy()
	
	// Создаем grayscale изображение
	gray := image.NewGray(bounds)
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			c := img.At(x, y)
			gray.Set(x, y, c)
		}
	}
	
	// Масштабируем до 28x28
	scaled := image.NewGray(image.Rect(0, 0, 28, 28))
	for y := 0; y < 28; y++ {
		for x := 0; x < 28; x++ {
			// Простая интерполяция
			srcX := x * width / 28
			srcY := y * height / 28
			if srcX >= width { srcX = width - 1 }
			if srcY >= height { srcY = height - 1 }
			
			scaled.Set(x, y, gray.GrayAt(srcX, srcY))
		}
	}
	
	return scaled
}

// trainEpochs выполняет обучение по эпохам
func (t *TinyCNNTrainer) trainEpochs(images []image.Image, labels []int) (float64, float64, error) {
	log.Printf("[TinyCNN Training] Starting training for %d epochs", t.config.Epochs)
	
	// Разделяем данные на обучение и валидацию
	trainSize := int(float64(len(images)) * (1.0 - t.config.ValidationSplit))
	
	trainImages := images[:trainSize]
	trainLabels := labels[:trainSize]
	valImages := images[trainSize:]
	valLabels := labels[trainSize:]
	
	log.Printf("[TinyCNN Training] Training samples: %d, Validation samples: %d", len(trainImages), len(valImages))
	
	var finalLoss, finalAccuracy float64
	
	for epoch := 0; epoch < t.config.Epochs; epoch++ {
		log.Printf("[TinyCNN Training] Epoch %d/%d", epoch+1, t.config.Epochs)
		
		// Обучаем на тренировочных данных
		epochLoss, err := t.trainEpoch(trainImages, trainLabels)
		if err != nil {
			return 0, 0, fmt.Errorf("failed to train epoch %d: %w", epoch+1, err)
		}
		
		// Валидируем на валидационных данных
		epochAccuracy, err := t.validateEpoch(valImages, valLabels)
		if err != nil {
			log.Printf("[TinyCNN Training] Warning: validation failed for epoch %d: %v", epoch+1, err)
			epochAccuracy = 0.0
		}
		
		finalLoss = epochLoss
		finalAccuracy = epochAccuracy
		
		log.Printf("[TinyCNN Training] Epoch %d: Loss=%.4f, Accuracy=%.4f", epoch+1, epochLoss, epochAccuracy)
	}
	
	return finalLoss, finalAccuracy, nil
}

// trainEpoch обучает одну эпоху
func (t *TinyCNNTrainer) trainEpoch(images []image.Image, labels []int) (float64, error) {
	// Здесь должна быть реализация обучения одной эпохи
	// Пока что возвращаем заглушку
	totalLoss := 0.0
	
	// Обрабатываем батчи
	for i := 0; i < len(images); i += t.config.BatchSize {
		end := i + t.config.BatchSize
		if end > len(images) {
			end = len(images)
		}
		
		batchImages := images[i:end]
		batchLabels := labels[i:end]
		
		// Обучаем батч
		batchLoss, err := t.trainBatch(batchImages, batchLabels)
		if err != nil {
			return 0, fmt.Errorf("failed to train batch: %w", err)
		}
		
		totalLoss += batchLoss
	}
	
	avgLoss := totalLoss / float64(len(images)/t.config.BatchSize)
	return avgLoss, nil
}

// trainBatch обучает один батч
func (t *TinyCNNTrainer) trainBatch(images []image.Image, labels []int) (float64, error) {
	// Здесь должна быть реализация обучения батча
	// Пока что возвращаем заглушку
	return 0.1, nil
}

// validateEpoch валидирует одну эпоху
func (t *TinyCNNTrainer) validateEpoch(images []image.Image, labels []int) (float64, error) {
	if len(images) == 0 {
		return 0.0, nil
	}
	
	correct := 0
	total := len(images)
	
	for i, img := range images {
		// Предсказываем метку
		result, err := t.model.Predict(img)
		if err != nil {
			log.Printf("[TinyCNN Training] Warning: prediction failed for validation sample %d: %v", i, err)
			continue
		}
		
		// Проверяем правильность
		if result.Digit == labels[i] {
			correct++
		}
	}
	
	accuracy := float64(correct) / float64(total)
	return accuracy, nil
}

// CreateTrainingDataFromSquares создает данные для обучения из синих квадратов
func (h *BlueSquareHandler) CreateTrainingDataFromSquares(squaresDir string, outputDir string) error {
	log.Printf("[TinyCNN Training] Creating training data from squares in %s", squaresDir)
	
	// Создаем выходную директорию
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return fmt.Errorf("failed to create output directory: %w", err)
	}
	
	// Сканируем директорию с квадратами
	var trainingImages []TrainingImage
	
	err := filepath.Walk(squaresDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		
		if info.IsDir() {
			return nil
		}
		
		ext := strings.ToLower(filepath.Ext(path))
		if ext != ".png" && ext != ".jpg" && ext != ".jpeg" {
			return nil
		}
		
		// Загружаем изображение
		img, err := h.loadImage(path)
		if err != nil {
			log.Printf("[TinyCNN Training] Warning: failed to load image %s: %v", path, err)
			return nil
		}
		
		// Извлекаем отдельные цифры из квадрата
		digits, err := h.extractDigitsFromSquare(img)
		if err != nil {
			log.Printf("[TinyCNN Training] Warning: failed to extract digits from %s: %v", path, err)
			return nil
		}
		
		// Сохраняем каждую цифру как отдельное изображение
		for i, digitImg := range digits {
			digitPath := filepath.Join(outputDir, fmt.Sprintf("digit_%d_%s_%d.png", 
				i, filepath.Base(path), time.Now().UnixNano()))
			
			if err := h.saveImage(digitImg, digitPath); err != nil {
				log.Printf("[TinyCNN Training] Warning: failed to save digit image: %v", err)
				continue
			}
			
			// TODO: Здесь нужно определить правильную метку для цифры
			// Пока что используем случайную метку
			label := i % 10
			
			trainingImages = append(trainingImages, TrainingImage{
				Path:   digitPath,
				Label:  label,
				Width:  digitImg.Bounds().Dx(),
				Height: digitImg.Bounds().Dy(),
			})
		}
		
		return nil
	})
	
	if err != nil {
		return fmt.Errorf("failed to scan squares directory: %w", err)
	}
	
	// Сохраняем метаданные обучения
	metadata := TrainingData{
		Images: trainingImages,
		Labels: make([]int, len(trainingImages)),
	}
	
	for i, img := range trainingImages {
		metadata.Labels[i] = img.Label
	}
	
	metadataPath := filepath.Join(outputDir, "training_metadata.json")
	metadataFile, err := os.Create(metadataPath)
	if err != nil {
		return fmt.Errorf("failed to create metadata file: %w", err)
	}
	defer metadataFile.Close()
	
	encoder := json.NewEncoder(metadataFile)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(metadata); err != nil {
		return fmt.Errorf("failed to encode metadata: %w", err)
	}
	
	log.Printf("[TinyCNN Training] Created %d training images in %s", len(trainingImages), outputDir)
	return nil
}

// extractDigitsFromSquare извлекает отдельные цифры из квадрата
func (h *BlueSquareHandler) extractDigitsFromSquare(img image.Image) ([]image.Image, error) {
	bounds := img.Bounds()
	width, height := bounds.Dx(), bounds.Dy()
	
	// Предполагаем сетку 8x8
	cellWidth := width / 8
	cellHeight := height / 8
	
	var digits []image.Image
	
	for row := 0; row < 8; row++ {
		for col := 0; col < 8; col++ {
			x := col * cellWidth
			y := row * cellHeight
			
			cellRect := image.Rect(x, y, x+cellWidth, y+cellHeight)
			cellImg := imaging.Crop(img, cellRect)
			
			digits = append(digits, cellImg)
		}
	}
	
	return digits, nil
}

// loadImage загружает изображение
func (h *BlueSquareHandler) loadImage(path string) (image.Image, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()
	
	img, _, err := image.Decode(file)
	if err != nil {
		return nil, err
	}
	
	return img, nil
}

// saveImage сохраняет изображение
func (h *BlueSquareHandler) saveImage(img image.Image, path string) error {
	file, err := os.Create(path)
	if err != nil {
		return err
	}
	defer file.Close()
	
	return png.Encode(file, img)
}
