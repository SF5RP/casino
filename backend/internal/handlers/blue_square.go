package handlers

import (
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"image/png"
	"log"
	"math"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/disintegration/imaging"
)

// Константы для определения квадрата
const (
	ExpectedSquareSize = 494  // Ожидаемый размер стороны квадрата в пикселях
	SizeTolerancePercent = 15 // Допустимая погрешность в процентах (±15%)
)

// Используем константы и функции из blue.go

// Вычисляемые константы для размеров
var (
	MinSquareSize int
	MaxSquareSize int
)

// init инициализирует вычисляемые константы
func init() {
	MinSquareSize = 420 // 85% от 494px
	MaxSquareSize = 568 // 115% от 494px
}

// BlueSquareHandler обрабатывает поиск синих квадратов на изображениях
type BlueSquareHandler struct {
	uploadDir string
	tinyCNN   *TinyCNNOCRHandler // Tiny-CNN OCR обработчик
}

// NewBlueSquareHandler создает новый экземпляр хендлера
func NewBlueSquareHandler(uploadDir string) *BlueSquareHandler {
	// Создаем Tiny-CNN обработчик
	modelPath := filepath.Join(uploadDir, "models", "tinycnn_model.onnx")
	tinyCNN := NewTinyCNNOCRHandler(modelPath)
	
	// Инициализируем Tiny-CNN
	if err := tinyCNN.Initialize(); err != nil {
		log.Printf("[BlueSquare] Warning: failed to initialize Tiny-CNN: %v", err)
		// Продолжаем без Tiny-CNN, будет использоваться Tesseract
		tinyCNN = nil
	}
	
	return &BlueSquareHandler{
		uploadDir: uploadDir,
		tinyCNN:   tinyCNN,
	}
}

// BlueSquareResponse представляет ответ с найденными синими квадратами
type BlueSquareResponse struct {
	Found        bool              `json:"found"`
	Squares      []SquareInfo      `json:"squares"`
	ImageSize    ImageSize         `json:"imageSize"`
	Message      string           `json:"message"`
	CroppedImage string           `json:"croppedImage,omitempty"` // путь к обрезанному изображению
	ProcessingSteps ProcessingSteps `json:"processingSteps,omitempty"` // промежуточные изображения
	OcrMatrix    [][]string       `json:"ocrMatrix,omitempty"` // матрица 8x8 распознанного текста
	OcrConfidence float64         `json:"ocrConfidence,omitempty"` // общая уверенность OCR
}

// ProcessingSteps содержит промежуточные изображения на каждом шаге обработки
type ProcessingSteps struct {
	Original     string `json:"original,omitempty"`     // оригинальное изображение
	OriginalGray string `json:"originalGray,omitempty"` // оригинальное изображение в grayscale
	HSVMask      string `json:"hsvMask,omitempty"`      // HSV маска
	HSVMaskGray  string `json:"hsvMaskGray,omitempty"`  // HSV маска в grayscale
	Morphology   string `json:"morphology,omitempty"`   // после морфологических операций
	MorphologyGray string `json:"morphologyGray,omitempty"` // после морфологических операций в grayscale
	Detected     string `json:"detected,omitempty"`     // найденная область
	DetectedGray string `json:"detectedGray,omitempty"` // найденная область в grayscale
	Refined      string `json:"refined,omitempty"`      // уточненные границы
	RefinedGray  string `json:"refinedGray,omitempty"`  // уточненные границы в grayscale
	Enhanced     string `json:"enhanced,omitempty"`     // улучшенное изображение
	EnhancedGray string `json:"enhancedGray,omitempty"` // улучшенное изображение в grayscale
	// Новые этапы продвинутой предобработки
	Denoised     string `json:"denoised,omitempty"`     // после шумодава
	DigitChannel string `json:"digitChannel,omitempty"` // канал цифр
	CLAHE        string `json:"clahe,omitempty"`        // после CLAHE
	Sharpened    string `json:"sharpened,omitempty"`    // после усиления резкости
	Binarized    string `json:"binarized,omitempty"`    // после бинаризации
	Cleaned      string `json:"cleaned,omitempty"`      // после чистки
}

// SquareInfo содержит информацию о найденном квадрате
type SquareInfo struct {
	X         int     `json:"x"`
	Y         int     `json:"y"`
	Width     int     `json:"width"`
	Height    int     `json:"height"`
	Confidence float64 `json:"confidence"`
	BlueScore  float64 `json:"blueScore"`
	Strips    []StripInfo `json:"strips,omitempty"` // информация о полосах
}

// StripInfo содержит информацию о горизонтальной полосе с текстом
type StripInfo struct {
	Index     int     `json:"index"`     // номер полосы (0-7)
	Y         int     `json:"y"`         // позиция Y полосы
	Height    int     `json:"height"`    // высота полосы
	Text      string  `json:"text"`      // извлеченный текст
	Confidence float64 `json:"confidence"` // уверенность в распознавании
	ImagePath string  `json:"imagePath,omitempty"` // путь к изображению полосы
	OcrText   string  `json:"ocrText,omitempty"` // текст распознанный OCR
	OcrConfidence float64 `json:"ocrConfidence,omitempty"` // уверенность OCR
}

// ImageSize содержит размеры изображения
type ImageSize struct {
	Width  int `json:"width"`
	Height int `json:"height"`
}

// DetectBlueSquare основной HTTP хендлер для поиска синих квадратов
func (h *BlueSquareHandler) DetectBlueSquare(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Парсим multipart form
	err := r.ParseMultipartForm(10 << 20) // 10MB max
	if err != nil {
		http.Error(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		http.Error(w, "No image file provided", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Создаем файл для сохранения с уникальным именем
	timestamp := time.Now().Format("20060102_150405")
	savedFilename := fmt.Sprintf("analysis_%s_%s", timestamp, header.Filename)
	savedPath := filepath.Join(h.uploadDir, savedFilename)
	savedFile, err := os.Create(savedPath)
	if err != nil {
		http.Error(w, "Failed to create file", http.StatusInternalServerError)
		return
	}
	defer savedFile.Close()
	// НЕ удаляем файл для сохранения отладочной информации

	// Копируем загруженный файл
	_, err = file.Seek(0, 0)
	if err != nil {
		http.Error(w, "Failed to read file", http.StatusInternalServerError)
		return
	}

	buffer := make([]byte, 1024)
	for {
		n, err := file.Read(buffer)
		if n == 0 {
			break
		}
		if err != nil && err.Error() != "EOF" {
			http.Error(w, "Failed to read file", http.StatusInternalServerError)
			return
		}
		savedFile.Write(buffer[:n])
	}
	savedFile.Close()

	// Обрабатываем изображение
	result, err := h.findBlueSquares(savedPath)
	if err != nil {
		log.Printf("[BlueSquare] Error: %v", err)
		response := BlueSquareResponse{
			Found:   false,
			Message: fmt.Sprintf("Error processing image: %v", err),
		}
		json.NewEncoder(w).Encode(response)
		return
	}

	// Возвращаем результат
	json.NewEncoder(w).Encode(result)
}

// findBlueSquares ищет синие квадраты на изображении
func (h *BlueSquareHandler) findBlueSquares(imagePath string) (*BlueSquareResponse, error) {
	// Открываем изображение
	img, err := imaging.Open(imagePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open image: %w", err)
	}

	bounds := img.Bounds()
	log.Printf("[BlueSquare] Processing image %dx%d", bounds.Dx(), bounds.Dy())

	// Инициализируем структуру для промежуточных изображений
	processingSteps := ProcessingSteps{}
	
	// Сохраняем оригинальное изображение в цветном и grayscale вариантах
	originalPath, originalGrayPath, err := h.saveProcessingStepWithGrayscale(img, "original", filepath.Base(imagePath))
	if err != nil {
		log.Printf("[BlueSquare] Failed to save original image: %v", err)
	} else {
		processingSteps.Original = originalPath
		processingSteps.OriginalGray = originalGrayPath
	}

	// Ищем области по линиям контраста / HSV-маске
	squares := h.detectContrastRegionsWithSteps(img, &processingSteps)

	response := &BlueSquareResponse{
		Found: len(squares) > 0,
		Squares: squares,
		ImageSize: ImageSize{
			Width:  bounds.Dx(),
			Height: bounds.Dy(),
		},
		ProcessingSteps: processingSteps,
	}

	if len(squares) > 0 {
		response.Message = fmt.Sprintf("Found %d blue/purple square(s)", len(squares))
		
		// Находим квадрат с наибольшей уверенностью
		bestSquare := squares[0]
		for _, square := range squares {
			if square.Confidence > bestSquare.Confidence {
				bestSquare = square
			}
		}

		// Если уверенность < 80%, расширяем прямоугольник на 20% и повторяем поиск внутри
		if bestSquare.Confidence < 0.8 {
			b := img.Bounds()
			tries := 0
			for tries < 3 && bestSquare.Confidence < 0.8 {
				expanded := h.expandRectAroundSquare(bestSquare, b, 1.2)
				crop := imaging.Crop(img, expanded)
				retrySquares := h.detectContrastRegions(crop)
				if len(retrySquares) == 0 {
					break
				}
				// выбираем лучший из повтора
				retryBest := retrySquares[0]
				for _, s := range retrySquares {
					if s.Confidence > retryBest.Confidence { retryBest = s }
				}
				// маппим координаты обратно
				mappedRect := image.Rect(
					expanded.Min.X+retryBest.X,
					expanded.Min.Y+retryBest.Y,
					expanded.Min.X+retryBest.X+retryBest.Width,
					expanded.Min.Y+retryBest.Y+retryBest.Height,
				)
				finalConf := h.calculateSquareFitness(mappedRect, b)
				finalConf += h.computeGridBonus(img, mappedRect)
				if finalConf > 1.0 { finalConf = 1.0 }
				if finalConf > bestSquare.Confidence {
					bestSquare = SquareInfo{
						X:          mappedRect.Min.X,
						Y:          mappedRect.Min.Y,
						Width:      mappedRect.Dx(),
						Height:     mappedRect.Dy(),
						Confidence: finalConf,
					}
					response.Message += " (refined)"
				} else {
					break
				}
				tries++
			}
			// финализируем список квадратов текущим лучшим
			squares = []SquareInfo{bestSquare}
		}
		
		// Обрезаем изображение по лучшему квадрату
		croppedPath, enhancedPath, enhancedGrayPath, err := h.cropSquareWithEnhancementAndGrayscale(img, bestSquare, filepath.Base(imagePath))
		if err != nil {
			log.Printf("[BlueSquare] Failed to crop square: %v", err)
		} else {
			response.CroppedImage = croppedPath
			response.ProcessingSteps.Enhanced = enhancedPath
			response.ProcessingSteps.EnhancedGray = enhancedGrayPath
			log.Printf("[BlueSquare] Best square cropped with confidence %.2f", bestSquare.Confidence)
		}
		
		// Извлекаем полосы из лучшего квадрата
		strips, preprocessingSteps, err := h.extractStripsFromSquare(img, bestSquare, filepath.Base(imagePath))
		if err != nil {
			log.Printf("[BlueSquare] Failed to extract strips: %v", err)
		} else {
			// Обновляем информацию о квадрате с полосами
			bestSquare.Strips = strips
			response.Squares[0] = bestSquare
			log.Printf("[BlueSquare] Extracted %d strips from square", len(strips))
			
			// Добавляем этапы предобработки к общим этапам обработки
			if preprocessingSteps != nil {
				response.ProcessingSteps.Denoised = preprocessingSteps.Denoised
				response.ProcessingSteps.DigitChannel = preprocessingSteps.DigitChannel
				response.ProcessingSteps.CLAHE = preprocessingSteps.CLAHE
				response.ProcessingSteps.Sharpened = preprocessingSteps.Sharpened
				response.ProcessingSteps.Binarized = preprocessingSteps.Binarized
				response.ProcessingSteps.Cleaned = preprocessingSteps.Cleaned
			}
			
			// Выполняем OCR на полном изображении квадрата (сначала пробуем Tiny-CNN)
			ocrMatrix, ocrConfidence := h.performTinyCNNOCR(img, bestSquare, filepath.Base(imagePath))
			response.OcrMatrix = ocrMatrix
			response.OcrConfidence = ocrConfidence
			log.Printf("[BlueSquare] Created OCR matrix with confidence %.2f", ocrConfidence)
		}
	} else {
		response.Message = "No blue/purple squares found"
	}

	return response, nil
}

// analyzeTargetColor находит наиболее близкий к целевым цветам пиксель на изображении
func (h *BlueSquareHandler) analyzeTargetColor(img image.Image) color.RGBA {
	bounds := img.Bounds()
	
	// Ищем наиболее подходящий цвет среди целевых
	var bestColor color.RGBA
	maxColorScore := 0.0

	// Проходим по изображению с шагом для анализа
	step := max(1, bounds.Dx()/50) // более детальный анализ
	
	for y := bounds.Min.Y; y < bounds.Max.Y; y += step {
		for x := bounds.Min.X; x < bounds.Max.X; x += step {
			c := color.RGBAModel.Convert(img.At(x, y)).(color.RGBA)
			
			// Вычисляем близость к целевым цветам
			colorScore := h.calculateColorScore(c)
			
			if colorScore > maxColorScore {
				maxColorScore = colorScore
				bestColor = c
			}
		}
	}

	log.Printf("[BlueSquare] Best color score: %.2f", maxColorScore)
	log.Printf("[BlueSquare] Reference color: R=%d G=%d B=%d", bestColor.R, bestColor.G, bestColor.B)
	
	// Если не найден подходящий цвет, используем средний из целевых
	if maxColorScore < 0.3 {
		log.Printf("[BlueSquare] Low color score, using default target color")
		return targetColors[2] // #667CE9 как базовый синий
	}
	
	return bestColor
}

// targetColors содержит список целевых цветов для поиска
var targetColors = []color.RGBA{
	{R: 119, G: 76, B: 165, A: 255},  // #774CA5
	{R: 111, G: 101, B: 198, A: 255}, // #6F65C6  
	{R: 102, G: 124, B: 233, A: 255}, // #667CE9
	{R: 125, G: 117, B: 203, A: 255}, // #7D75CB
	{R: 139, G: 142, B: 213, A: 255}, // #8B8ED5
}

// calculateColorScore вычисляет насколько пиксель близок к сине-фиолетовым цветам
func (h *BlueSquareHandler) calculateColorScore(c color.RGBA) float64 {
	// Конвертируем в HSV для более точного определения сине-фиолетовых цветов
	hue, sat, val := rgbToHSV(c)
	
	// Проверяем, находится ли цвет в сине-фиолетовом диапазоне
	// Сине-фиолетовый диапазон: 210° - 300° (с учетом погрешности ±28°)
	isInHueRange := (hue >= 210-28 && hue <= 300+28) || (hue >= 0 && hue <= 28) // учитываем переход через 0°
	
	if !isInHueRange {
		return 0
	}
	
	// Проверяем насыщенность и яркость (как в createHSVMask)
	if sat < 0.20 || val < 0.20 || val > 0.98 {
		return 0
	}
	
	// Вычисляем скор на основе близости к идеальному сине-фиолетовому
	// Идеальный сине-фиолетовый: H=240°, S=0.8, V=0.7
	idealH := 240.0
	idealS := 0.8
	idealV := 0.7
	
	// Нормализуем hue для вычисления расстояния
	hueDist := math.Abs(hue - idealH)
	if hueDist > 180 {
		hueDist = 360 - hueDist
	}
	
	// Вычисляем расстояние в HSV пространстве
	hueScore := 1.0 - (hueDist / 60.0) // нормализуем к ±60°
	if hueScore < 0 { hueScore = 0 }
	
	satScore := 1.0 - math.Abs(sat - idealS)
	if satScore < 0 { satScore = 0 }
	
	valScore := 1.0 - math.Abs(val - idealV)
	if valScore < 0 { valScore = 0 }
	
	// Взвешенная оценка: 50% hue, 30% saturation, 20% value
	score := hueScore*0.5 + satScore*0.3 + valScore*0.2
	
	return math.Max(0.0, math.Min(1.0, score))
}



// buildBlueIntegral строит интегральное изображение по blueScore для быстрого подсчёта сумм в окнах
func (h *BlueSquareHandler) buildBlueIntegral(img image.Image) [][]float64 {
    b := img.Bounds()
    w := b.Dx()
    hgt := b.Dy()
    // Интегральное изображение размера (h+1) x (w+1)
    ii := make([][]float64, hgt+1)
    for y := 0; y <= hgt; y++ {
        ii[y] = make([]float64, w+1)
    }
    for y := 0; y < hgt; y++ {
        rowSum := 0.0
        for x := 0; x < w; x++ {
            c := color.RGBAModel.Convert(img.At(b.Min.X+x, b.Min.Y+y)).(color.RGBA)
            s := h.calculateColorScore(c)
            rowSum += s
            ii[y+1][x+1] = ii[y][x+1] + rowSum
        }
    }
    return ii
}

// sumBlue возвращает сумму blueScore в полуинтервале [x0,x1) x [y0,y1)
func (h *BlueSquareHandler) sumBlue(ii [][]float64, x0, y0, x1, y1 int) float64 {
    // Индексация интегрального изображения с +1
    return ii[y1][x1] - ii[y0][x1] - ii[y1][x0] + ii[y0][x0]
}

// detectContrastRegions ищет прямоугольные области по линиям контраста
func (h *BlueSquareHandler) detectContrastRegions(img image.Image) []SquareInfo {
	return h.detectContrastRegionsWithSteps(img, nil)
}

// detectContrastRegionsWithSteps - версия с сохранением промежуточных шагов
func (h *BlueSquareHandler) detectContrastRegionsWithSteps(img image.Image, processingSteps *ProcessingSteps) []SquareInfo {
	bounds := img.Bounds()
	log.Printf("[BlueSquare] Starting advanced purple/blue detection for image %dx%d", bounds.Dx(), bounds.Dy())

	// 1) ПРИОРИТЕТ: Новая улучшенная логика HSV+LAB с CCL/SAT детекторами
	if rect, score, ok := DetectSquare494Advanced(img); ok {
		log.Printf("[BlueSquare] Advanced detection found square: %dx%d at (%d,%d), score: %.3f", 
			rect.Dx(), rect.Dy(), rect.Min.X, rect.Min.Y, score)
		
		// Конвертируем в SquareInfo
		advancedSquare := SquareInfo{
			X:          rect.Min.X,
			Y:          rect.Min.Y,
			Width:      rect.Dx(),
			Height:     rect.Dy(),
			Confidence: score,
			BlueScore:  h.calculateBlueWeight(img, rect),
		}
		
		return []SquareInfo{advancedSquare}
	}

	// 2) ФОЛЛБЭК 1: Старый алгоритм поиска самого синего квадрата 500x500
	log.Printf("[BlueSquare] Advanced detection failed, trying blue weight analysis")
	bestSquare := h.findMostBlueSquare(img)
	if bestSquare != nil {
		log.Printf("[BlueSquare] Found most blue square: %dx%d at (%d,%d), blue score: %.3f", 
			bestSquare.Width, bestSquare.Height, bestSquare.X, bestSquare.Y, bestSquare.BlueScore)
		return []SquareInfo{*bestSquare}
	}

	// 3) ФОЛЛБЭК 2: Старый алгоритм HSV+морфология
	log.Printf("[BlueSquare] Blue weight analysis found no squares, trying HSV+morphology fallback")
	fallbackSquares := h.detectContrastRegionsFallbackWithSteps(img, processingSteps)
	
	// Если и старый алгоритм ничего не нашел, возвращаем пустой результат
	if len(fallbackSquares) == 0 {
		log.Printf("[BlueSquare] No squares found by any algorithm")
		return []SquareInfo{}
	}
	
	return fallbackSquares
}

// findMostBlueSquare находит самый синий квадрат 500x500 пикселей с отступами 150px от краев
func (h *BlueSquareHandler) findMostBlueSquare(img image.Image) *SquareInfo {
	bounds := img.Bounds()
	width, height := bounds.Dx(), bounds.Dy()
	
	// Размер квадрата для поиска
	squareSize := 500
	margin := 150
	
	// Если изображение меньше квадрата, используем весь размер изображения
	if width < squareSize {
		squareSize = width
		log.Printf("[BlueSquare] Image width (%dpx) smaller than target square, using full width", width)
	}
	if height < squareSize {
		squareSize = height
		log.Printf("[BlueSquare] Image height (%dpx) smaller than target square, using full height", height)
	}
	
	// Адаптивные отступы - если изображение мало, используем весь размер
	var minX, maxX, minY, maxY int
	
	if width < squareSize+2*margin {
		// Изображение слишком узкое - используем весь размер по ширине
		minX = 0
		maxX = width - squareSize
		if maxX < 0 {
			maxX = 0 // Если даже квадрат не помещается, начинаем с 0
		}
		log.Printf("[BlueSquare] Image too narrow (%dpx), using full width for search", width)
	} else {
		// Нормальные отступы по ширине
		minX = margin
		maxX = width - margin - squareSize
	}
	
	if height < squareSize+2*margin {
		// Изображение слишком низкое - используем весь размер по высоте
		minY = 0
		maxY = height - squareSize
		if maxY < 0 {
			maxY = 0 // Если даже квадрат не помещается, начинаем с 0
		}
		log.Printf("[BlueSquare] Image too short (%dpx), using full height for search", height)
	} else {
		// Нормальные отступы по высоте
		minY = margin
		maxY = height - margin - squareSize
	}
	
	// Проверяем, что у нас есть хотя бы одна позиция для поиска
	if maxX < minX || maxY < minY {
		log.Printf("[BlueSquare] Image too small for any square search: %dx%d, search area: X[%d-%d], Y[%d-%d]", 
			width, height, minX, maxX, minY, maxY)
		return nil
	}
	
	log.Printf("[BlueSquare] Searching in range: X[%d-%d], Y[%d-%d]", minX, maxX, minY, maxY)

	// Интегральное изображение для O(1) оценки окон
	ii := h.buildBlueIntegral(img)

	var bestSquare *SquareInfo
	bestBlueScore := -1.0 // Начинаем с -1, чтобы найти любой квадрат

	// Более плотный шаг благодаря быстрым суммам
	step := 6
	if step < 1 { step = 1 }

	for y := minY; y <= maxY; y += step {
		y0 := y
		y1 := y + squareSize
		if y1 > bounds.Dy() { y1 = bounds.Dy() }
		for x := minX; x <= maxX; x += step {
			x0 := x
			x1 := x + squareSize
			if x1 > bounds.Dx() { x1 = bounds.Dx() }
			area := float64((x1 - x0) * (y1 - y0))
			if area <= 0 { continue }
			blueSum := h.sumBlue(ii, x0, y0, x1, y1)
			blueScore := blueSum / area
			if blueScore > bestBlueScore {
				bestBlueScore = blueScore
				bestSquare = &SquareInfo{
					X:         x0,
					Y:         y0,
					Width:     x1 - x0,
					Height:    y1 - y0,
					BlueScore: blueScore,
					Confidence: h.calculateSquareFitness(image.Rect(x0, y0, x1, y1), bounds),
				}
			}
		}
	}
	
	// Всегда возвращаем лучший найденный квадрат, даже если рейтинг низкий
	if bestSquare != nil {
		// Уточняем границы только если рейтинг достаточно высокий
		if bestSquare.BlueScore > 0.05 { // Снизили порог для уточнения
			// Сначала быстрое уточнение
			refinedSquare := h.refineSquareEdgesFast(img, *bestSquare)
			
			// Затем точное уточнение границ с пиксельной точностью
			finalSquare := h.refineSquareEdgesPrecise(img, refinedSquare)
			bestSquare = &finalSquare
			
			log.Printf("[BlueSquare] Refined square: %dx%d at (%d,%d), final blue score: %.3f", 
				bestSquare.Width, bestSquare.Height, bestSquare.X, bestSquare.Y, bestSquare.BlueScore)
		} else {
			log.Printf("[BlueSquare] Very low blue score (%.3f), returning unrefined square: %dx%d at (%d,%d)", 
				bestSquare.BlueScore, bestSquare.Width, bestSquare.Height, bestSquare.X, bestSquare.Y)
		}
	} else {
		log.Printf("[BlueSquare] No square found with any blue score")
	}
	
	return bestSquare
}

// calculateBlueWeightFast - быстрая версия с сэмплированием пикселей
func (h *BlueSquareHandler) calculateBlueWeightFast(img image.Image, rect image.Rectangle) float64 {
	bounds := img.Bounds()
	
	// Проверяем, что прямоугольник в пределах изображения
	if rect.Min.X < bounds.Min.X || rect.Max.X > bounds.Max.X ||
	   rect.Min.Y < bounds.Min.Y || rect.Max.Y > bounds.Max.Y {
		return 0.0
	}
	
	// Сэмплируем пиксели с шагом для ускорения
	sampleStep := 3 // Анализируем каждый 3-й пиксель для лучшей точности
	totalBlueScore := 0.0
	totalPixels := 0
	
	// Анализируем сэмплированные пиксели
	for y := rect.Min.Y; y < rect.Max.Y; y += sampleStep {
		for x := rect.Min.X; x < rect.Max.X; x += sampleStep {
			c := color.RGBAModel.Convert(img.At(x, y)).(color.RGBA)
			
			// Вычисляем скор синести пикселя
			blueScore := h.calculateColorScore(c)
			totalBlueScore += blueScore
			totalPixels++
		}
	}
	
	if totalPixels == 0 {
		return 0.0
	}
	
	// Возвращаем средний скор синести
	avgBlueScore := totalBlueScore / float64(totalPixels)
	
	// Упрощенный бонус за равномерность (быстрая версия)
	uniformityBonus := h.calculateBlueUniformityFast(img, rect)
	
	// Итоговый скор: 85% средняя синесть + 15% равномерность
	finalScore := avgBlueScore*0.85 + uniformityBonus*0.15
	
	return math.Max(0.0, math.Min(1.0, finalScore))
}

// calculateBlueWeight вычисляет взвешенность синего цвета в прямоугольной области (точная версия)
func (h *BlueSquareHandler) calculateBlueWeight(img image.Image, rect image.Rectangle) float64 {
	bounds := img.Bounds()
	
	// Проверяем, что прямоугольник в пределах изображения
	if rect.Min.X < bounds.Min.X || rect.Max.X > bounds.Max.X ||
	   rect.Min.Y < bounds.Min.Y || rect.Max.Y > bounds.Max.Y {
		return 0.0
	}
	
	totalBlueScore := 0.0
	totalPixels := 0
	
	// Анализируем каждый пиксель в прямоугольнике
	for y := rect.Min.Y; y < rect.Max.Y; y++ {
		for x := rect.Min.X; x < rect.Max.X; x++ {
			c := color.RGBAModel.Convert(img.At(x, y)).(color.RGBA)
			
			// Вычисляем скор синести пикселя
			blueScore := h.calculateColorScore(c)
			totalBlueScore += blueScore
			totalPixels++
		}
	}
	
	if totalPixels == 0 {
		return 0.0
	}
	
	// Возвращаем средний скор синести
	avgBlueScore := totalBlueScore / float64(totalPixels)
	
	// Дополнительный бонус за равномерность синего цвета
	uniformityBonus := h.calculateBlueUniformity(img, rect)
	
	// Итоговый скор: 80% средняя синесть + 20% равномерность
	finalScore := avgBlueScore*0.8 + uniformityBonus*0.2
	
	return math.Max(0.0, math.Min(1.0, finalScore))
}

// calculateBlueUniformityFast - быстрая версия анализа равномерности
func (h *BlueSquareHandler) calculateBlueUniformityFast(img image.Image, rect image.Rectangle) float64 {
	bounds := img.Bounds()
	
	// Более детальная сетка 8x8 для анализа
	gridSize := 8
	cellWidth := rect.Dx() / gridSize
	cellHeight := rect.Dy() / gridSize
	
	if cellWidth < 1 || cellHeight < 1 {
		return 0.0
	}
	
	var cellScores []float64
	
	// Анализируем каждую ячейку сетки с сэмплированием
	for gy := 0; gy < gridSize; gy++ {
		for gx := 0; gx < gridSize; gx++ {
			cellX := rect.Min.X + gx*cellWidth
			cellY := rect.Min.Y + gy*cellHeight
			cellRect := image.Rect(cellX, cellY, cellX+cellWidth, cellY+cellHeight)
			
			// Ограничиваем ячейку границами изображения
			if cellRect.Max.X > bounds.Max.X {
				cellRect.Max.X = bounds.Max.X
			}
			if cellRect.Max.Y > bounds.Max.Y {
				cellRect.Max.Y = bounds.Max.Y
			}
			
			// Улучшенный анализ ячейки - несколько точек
			cellScore := 0.0
			sampleCount := 0
			
			// Анализируем 9 точек в ячейке для лучшей точности
			points := []image.Point{
				{cellRect.Min.X + cellRect.Dx()/2, cellRect.Min.Y + cellRect.Dy()/2}, // центр
				{cellRect.Min.X + cellRect.Dx()/4, cellRect.Min.Y + cellRect.Dy()/4}, // левый верх
				{cellRect.Min.X + 3*cellRect.Dx()/4, cellRect.Min.Y + cellRect.Dy()/4}, // правый верх
				{cellRect.Min.X + cellRect.Dx()/4, cellRect.Min.Y + 3*cellRect.Dy()/4}, // левый низ
				{cellRect.Min.X + 3*cellRect.Dx()/4, cellRect.Min.Y + 3*cellRect.Dy()/4}, // правый низ
				{cellRect.Min.X + cellRect.Dx()/2, cellRect.Min.Y + cellRect.Dy()/4}, // центр верх
				{cellRect.Min.X + cellRect.Dx()/2, cellRect.Min.Y + 3*cellRect.Dy()/4}, // центр низ
				{cellRect.Min.X + cellRect.Dx()/4, cellRect.Min.Y + cellRect.Dy()/2}, // левый центр
				{cellRect.Min.X + 3*cellRect.Dx()/4, cellRect.Min.Y + cellRect.Dy()/2}, // правый центр
			}
			
			for _, point := range points {
				if point.X < bounds.Max.X && point.Y < bounds.Max.Y {
					c := color.RGBAModel.Convert(img.At(point.X, point.Y)).(color.RGBA)
					cellScore += h.calculateColorScore(c)
					sampleCount++
				}
			}
			
			if sampleCount > 0 {
				cellScores = append(cellScores, cellScore/float64(sampleCount))
			}
		}
	}
	
	if len(cellScores) < 2 {
		return 0.5 // Средняя равномерность при недостатке данных
	}
	
	// Вычисляем стандартное отклонение для оценки равномерности
	mean := 0.0
	for _, score := range cellScores {
		mean += score
	}
	mean /= float64(len(cellScores))
	
	variance := 0.0
	for _, score := range cellScores {
		diff := score - mean
		variance += diff * diff
	}
	variance /= float64(len(cellScores))
	
	stdDev := math.Sqrt(variance)
	
	// Равномерность обратно пропорциональна стандартному отклонению
	// Нормализуем к диапазону [0, 1]
	uniformity := math.Max(0.0, 1.0 - stdDev*2) // Увеличиваем чувствительность
	
	return uniformity
}

// calculateBlueUniformity вычисляет равномерность синего цвета в области (точная версия)
func (h *BlueSquareHandler) calculateBlueUniformity(img image.Image, rect image.Rectangle) float64 {
	bounds := img.Bounds()
	
	// Разбиваем область на сетку 10x10 для анализа равномерности
	gridSize := 10
	cellWidth := rect.Dx() / gridSize
	cellHeight := rect.Dy() / gridSize
	
	if cellWidth < 1 || cellHeight < 1 {
		return 0.0
	}
	
	var cellScores []float64
	
	// Анализируем каждую ячейку сетки
	for gy := 0; gy < gridSize; gy++ {
		for gx := 0; gx < gridSize; gx++ {
			cellX := rect.Min.X + gx*cellWidth
			cellY := rect.Min.Y + gy*cellHeight
			cellRect := image.Rect(cellX, cellY, cellX+cellWidth, cellY+cellHeight)
			
			// Ограничиваем ячейку границами изображения
			if cellRect.Max.X > bounds.Max.X {
				cellRect.Max.X = bounds.Max.X
			}
			if cellRect.Max.Y > bounds.Max.Y {
				cellRect.Max.Y = bounds.Max.Y
			}
			
			cellScore := h.calculateBlueWeight(img, cellRect)
			cellScores = append(cellScores, cellScore)
		}
	}
	
	if len(cellScores) == 0 {
		return 0.0
	}
	
	// Вычисляем стандартное отклонение для оценки равномерности
	mean := 0.0
	for _, score := range cellScores {
		mean += score
	}
	mean /= float64(len(cellScores))
	
	variance := 0.0
	for _, score := range cellScores {
		diff := score - mean
		variance += diff * diff
	}
	variance /= float64(len(cellScores))
	
	stdDev := math.Sqrt(variance)
	
	// Равномерность обратно пропорциональна стандартному отклонению
	// Нормализуем к диапазону [0, 1]
	uniformity := math.Max(0.0, 1.0 - stdDev)
	
	return uniformity
}

// refineSquareEdgesFast - быстрая версия уточнения границ
func (h *BlueSquareHandler) refineSquareEdgesFast(img image.Image, square SquareInfo) SquareInfo {
	bounds := img.Bounds()
	rect := image.Rect(square.X, square.Y, square.X+square.Width, square.Y+square.Height)
	
	// Увеличенный радиус поиска для лучшей точности
	refineRadius := 50
	
	// Уточняем каждую сторону
	bestLeft := rect.Min.X
	bestRight := rect.Max.X
	bestTop := rect.Min.Y
	bestBottom := rect.Max.Y
	bestScore := square.BlueScore
	
	// Уточняем левую границу с шагом 2
	for x := max(bounds.Min.X, rect.Min.X-refineRadius); x <= min(bounds.Max.X-square.Width, rect.Min.X+refineRadius); x += 2 {
		testRect := image.Rect(x, rect.Min.Y, x+square.Width, rect.Max.Y)
		score := h.calculateBlueWeightFast(img, testRect)
		if score > bestScore {
			bestScore = score
			bestLeft = x
		}
	}
	
	// Уточняем правую границу с шагом 2
	for x := max(bounds.Min.X, rect.Max.X-refineRadius); x <= min(bounds.Max.X, rect.Max.X+refineRadius); x += 2 {
		testRect := image.Rect(bestLeft, rect.Min.Y, x, rect.Max.Y)
		if testRect.Dx() >= int(float64(square.Width)*0.8) { // Минимальная ширина
			score := h.calculateBlueWeightFast(img, testRect)
			if score > bestScore {
				bestScore = score
				bestRight = x
			}
		}
	}
	
	// Уточняем верхнюю границу с шагом 2
	for y := max(bounds.Min.Y, rect.Min.Y-refineRadius); y <= min(bounds.Max.Y-square.Height, rect.Min.Y+refineRadius); y += 2 {
		testRect := image.Rect(bestLeft, y, bestRight, y+square.Height)
		score := h.calculateBlueWeightFast(img, testRect)
		if score > bestScore {
			bestScore = score
			bestTop = y
		}
	}
	
	// Уточняем нижнюю границу с шагом 2
	for y := max(bounds.Min.Y, rect.Max.Y-refineRadius); y <= min(bounds.Max.Y, rect.Max.Y+refineRadius); y += 2 {
		testRect := image.Rect(bestLeft, bestTop, bestRight, y)
		if testRect.Dy() >= int(float64(square.Height)*0.8) { // Минимальная высота
			score := h.calculateBlueWeightFast(img, testRect)
			if score > bestScore {
				bestScore = score
				bestBottom = y
			}
		}
	}
	
	// Возвращаем уточненный квадрат
	refinedRect := image.Rect(bestLeft, bestTop, bestRight, bestBottom)
	
	return SquareInfo{
		X:          refinedRect.Min.X,
		Y:          refinedRect.Min.Y,
		Width:      refinedRect.Dx(),
		Height:     refinedRect.Dy(),
		BlueScore:  bestScore,
		Confidence: h.calculateSquareFitness(refinedRect, bounds),
	}
}

// refineSquareEdgesPrecise - точное уточнение границ с пиксельной точностью
func (h *BlueSquareHandler) refineSquareEdgesPrecise(img image.Image, square SquareInfo) SquareInfo {
	bounds := img.Bounds()
	rect := image.Rect(square.X, square.Y, square.X+square.Width, square.Y+square.Height)
	
	// Малый радиус для точного уточнения
	refineRadius := 10
	
	// Уточняем каждую сторону с пиксельной точностью
	bestLeft := rect.Min.X
	bestRight := rect.Max.X
	bestTop := rect.Min.Y
	bestBottom := rect.Max.Y
	bestScore := square.BlueScore
	
	// Уточняем левую границу с шагом 1
	for x := max(bounds.Min.X, rect.Min.X-refineRadius); x <= min(bounds.Max.X-square.Width, rect.Min.X+refineRadius); x++ {
		testRect := image.Rect(x, rect.Min.Y, x+square.Width, rect.Max.Y)
		score := h.calculateBlueWeight(img, testRect) // Используем точный анализ
		if score > bestScore {
			bestScore = score
			bestLeft = x
		}
	}
	
	// Уточняем правую границу с шагом 1
	for x := max(bounds.Min.X, rect.Max.X-refineRadius); x <= min(bounds.Max.X, rect.Max.X+refineRadius); x++ {
		testRect := image.Rect(bestLeft, rect.Min.Y, x, rect.Max.Y)
		if testRect.Dx() >= int(float64(square.Width)*0.9) { // Более строгое ограничение ширины
			score := h.calculateBlueWeight(img, testRect) // Используем точный анализ
			if score > bestScore {
				bestScore = score
				bestRight = x
			}
		}
	}
	
	// Уточняем верхнюю границу с шагом 1
	for y := max(bounds.Min.Y, rect.Min.Y-refineRadius); y <= min(bounds.Max.Y-square.Height, rect.Min.Y+refineRadius); y++ {
		testRect := image.Rect(bestLeft, y, bestRight, y+square.Height)
		score := h.calculateBlueWeight(img, testRect) // Используем точный анализ
		if score > bestScore {
			bestScore = score
			bestTop = y
		}
	}
	
	// Уточняем нижнюю границу с шагом 1
	for y := max(bounds.Min.Y, rect.Max.Y-refineRadius); y <= min(bounds.Max.Y, rect.Max.Y+refineRadius); y++ {
		testRect := image.Rect(bestLeft, bestTop, bestRight, y)
		if testRect.Dy() >= int(float64(square.Height)*0.9) { // Более строгое ограничение высоты
			score := h.calculateBlueWeight(img, testRect) // Используем точный анализ
			if score > bestScore {
				bestScore = score
				bestBottom = y
			}
		}
	}
	
	// Возвращаем точно уточненный квадрат
	refinedRect := image.Rect(bestLeft, bestTop, bestRight, bestBottom)
	
	return SquareInfo{
		X:          refinedRect.Min.X,
		Y:          refinedRect.Min.Y,
		Width:      refinedRect.Dx(),
		Height:     refinedRect.Dy(),
		BlueScore:  bestScore,
		Confidence: h.calculateSquareFitness(refinedRect, bounds),
	}
}

// refineSquareEdges уточняет границы найденного квадрата (точная версия)
func (h *BlueSquareHandler) refineSquareEdges(img image.Image, square SquareInfo) SquareInfo {
	bounds := img.Bounds()
	rect := image.Rect(square.X, square.Y, square.X+square.Width, square.Y+square.Height)
	
	// Радиус поиска для уточнения границ
	refineRadius := 50
	
	// Уточняем каждую сторону
	bestLeft := rect.Min.X
	bestRight := rect.Max.X
	bestTop := rect.Min.Y
	bestBottom := rect.Max.Y
	bestScore := square.BlueScore
	
	// Уточняем левую границу
	for x := max(bounds.Min.X, rect.Min.X-refineRadius); x <= min(bounds.Max.X-square.Width, rect.Min.X+refineRadius); x++ {
		testRect := image.Rect(x, rect.Min.Y, x+square.Width, rect.Max.Y)
		score := h.calculateBlueWeight(img, testRect)
		if score > bestScore {
			bestScore = score
			bestLeft = x
		}
	}
	
	// Уточняем правую границу
	for x := max(bounds.Min.X, rect.Max.X-refineRadius); x <= min(bounds.Max.X, rect.Max.X+refineRadius); x++ {
		testRect := image.Rect(bestLeft, rect.Min.Y, x, rect.Max.Y)
		if testRect.Dx() >= int(float64(square.Width)*0.8) { // Минимальная ширина
			score := h.calculateBlueWeight(img, testRect)
			if score > bestScore {
				bestScore = score
				bestRight = x
			}
		}
	}
	
	// Уточняем верхнюю границу
	for y := max(bounds.Min.Y, rect.Min.Y-refineRadius); y <= min(bounds.Max.Y-square.Height, rect.Min.Y+refineRadius); y++ {
		testRect := image.Rect(bestLeft, y, bestRight, y+square.Height)
		score := h.calculateBlueWeight(img, testRect)
		if score > bestScore {
			bestScore = score
			bestTop = y
		}
	}
	
	// Уточняем нижнюю границу
	for y := max(bounds.Min.Y, rect.Max.Y-refineRadius); y <= min(bounds.Max.Y, rect.Max.Y+refineRadius); y++ {
		testRect := image.Rect(bestLeft, bestTop, bestRight, y)
		if testRect.Dy() >= int(float64(square.Height)*0.8) { // Минимальная высота
			score := h.calculateBlueWeight(img, testRect)
			if score > bestScore {
				bestScore = score
				bestBottom = y
			}
		}
	}
	
	// Возвращаем уточненный квадрат
	refinedRect := image.Rect(bestLeft, bestTop, bestRight, bestBottom)
	
	return SquareInfo{
		X:          refinedRect.Min.X,
		Y:          refinedRect.Min.Y,
		Width:      refinedRect.Dx(),
		Height:     refinedRect.Dy(),
		BlueScore:  bestScore,
		Confidence: h.calculateSquareFitness(refinedRect, bounds),
	}
}

// detectContrastRegionsFallback - старый алгоритм как фоллбэк
func (h *BlueSquareHandler) detectContrastRegionsFallback(img image.Image) []SquareInfo {
	return h.detectContrastRegionsFallbackWithSteps(img, nil)
}

// detectContrastRegionsFallbackWithSteps - версия с сохранением промежуточных шагов
func (h *BlueSquareHandler) detectContrastRegionsFallbackWithSteps(img image.Image, processingSteps *ProcessingSteps) []SquareInfo {
	bounds := img.Bounds()

	// Пирамидальный поиск: уменьшаем до ширины 1024px
	scaled := img
	scale := 1.0
	if bounds.Dx() > 1024 {
		newW := 1024
		newH := int(math.Round(float64(bounds.Dy()) * float64(newW) / float64(bounds.Dx())))
		scaled = imaging.Resize(img, newW, newH, imaging.Lanczos)
		scale = float64(bounds.Dx()) / float64(newW)
	}

	sb := scaled.Bounds()

	// Адаптивный центр тона по гистограмме Hue
	centerHue := h.analyzeHueCenterHSV(scaled)

	// HSV-маска (фиолетовый/сине-фиолетовый)
	hsvMask := h.createHSVMask(scaled, centerHue)
	
	// Сохраняем HSV маску если нужно
	if processingSteps != nil {
		hsvMaskPath, hsvMaskGrayPath, err := h.saveProcessingStepWithGrayscale(hsvMask, "hsv_mask", "hsv_mask.png")
		if err != nil {
			log.Printf("[BlueSquare] Failed to save HSV mask: %v", err)
		} else {
			processingSteps.HSVMask = hsvMaskPath
			processingSteps.HSVMaskGray = hsvMaskGrayPath
		}
	}

	// Морфологическое закрытие, чтобы залить сетку и цифры
	kernel := int(math.Max(1, math.Round(float64(min(sb.Dx(), sb.Dy()))/180.0)))
	closedMask := h.morphClose(hsvMask, kernel)

	// Небольшая дополнительная эрозия для компенсации раздувания маски
	shrink := int(math.Max(1, float64(kernel)/3.0))
	closedMask = h.morphErodeSimple(closedMask, shrink)
	
	// Сохраняем результат морфологических операций если нужно
	if processingSteps != nil {
		morphPath, morphGrayPath, err := h.saveProcessingStepWithGrayscale(closedMask, "morphology", "morphology.png")
		if err != nil {
			log.Printf("[BlueSquare] Failed to save morphology result: %v", err)
		} else {
			processingSteps.Morphology = morphPath
			processingSteps.MorphologyGray = morphGrayPath
		}
	}

	// Ищем области на уменьшенном изображении
	smallRects := h.findSquareRegions(closedMask)

	// Фильтрация кандидатов по площади/аспекту/близости к центру
	var candidates []image.Rectangle
	for _, r := range smallRects {
		rect := image.Rect(r.X, r.Y, r.X+r.Width, r.Y+r.Height)
		if h.passesCandidateConstraints(rect, sb) {
			candidates = append(candidates, rect)
		}
	}

	// Выбираем крупнейшего
	var bestRect image.Rectangle
	bestArea := 0
	for _, c := range candidates {
		area := c.Dx() * c.Dy()
		if area > bestArea {
			bestArea = area
			bestRect = c
		}
	}

	var squares []SquareInfo
	if bestArea > 0 {
		// Сохраняем изображение найденной области если нужно
		if processingSteps != nil {
			// Создаем изображение с выделенной областью
			detectedImg := h.createDetectedRegionImage(scaled, bestRect)
			detectedPath, detectedGrayPath, err := h.saveProcessingStepWithGrayscale(detectedImg, "detected", "detected_region.png")
			if err != nil {
				log.Printf("[BlueSquare] Failed to save detected region: %v", err)
			} else {
				processingSteps.Detected = detectedPath
				processingSteps.DetectedGray = detectedGrayPath
			}
		}
		
		diag := math.Hypot(float64(bestRect.Dx()), float64(bestRect.Dy()))
		radius := int(math.Max(1, math.Round(diag/200.0)))
		refinedSmall := h.refineEdgesByMask(scaled, closedMask, bestRect, radius)
		// Притягиваем к внутренней кромке маски
		refinedSmall = h.tightenToMaskInner(closedMask, refinedSmall, 0.70)

		// Масштабируем координаты обратно
		refined := refinedSmall
		if scale != 1.0 {
			refined = image.Rect(
				int(math.Round(float64(refinedSmall.Min.X)*scale)),
				int(math.Round(float64(refinedSmall.Min.Y)*scale)),
				int(math.Round(float64(refinedSmall.Max.X)*scale)),
				int(math.Round(float64(refinedSmall.Max.Y)*scale)),
			)
			// Anti-bloat после рескейла
			refined = refined.Inset(1)
			// добавить ещё одно прижатие на полном масштабе
			refined = h.tightenToMaskInner(
				imaging.Resize(closedMask, bounds.Dx(), bounds.Dy(), imaging.NearestNeighbor),
				refined, 0.70,
			)
		}
		
		// Сохраняем изображение с уточненными границами если нужно
		if processingSteps != nil {
			refinedImg := h.createDetectedRegionImage(img, refined)
			refinedPath, refinedGrayPath, err := h.saveProcessingStepWithGrayscale(refinedImg, "refined", "refined_bounds.png")
			if err != nil {
				log.Printf("[BlueSquare] Failed to save refined bounds: %v", err)
			} else {
				processingSteps.Refined = refinedPath
				processingSteps.RefinedGray = refinedGrayPath
			}
		}

		width := refined.Dx()
		height := refined.Dy()
		// Проверяем минимальный размер с учетом масштабирования
		minSize := int(float64(MinSquareSize) / scale)
		if width > minSize && height > minSize {
			confidence := h.calculateSquareFitness(refined, bounds)
			confidence += h.computeGridBonus(img, refined)
			if confidence > 1.0 { confidence = 1.0 }
			squares = append(squares, SquareInfo{
				X:          refined.Min.X,
				Y:          refined.Min.Y,
				Width:      width,
				Height:     height,
				Confidence: confidence,
				BlueScore:  h.calculateBlueWeight(img, refined),
			})
			log.Printf("[BlueSquare] HSV+morph region: %dx%d at (%d,%d), confidence: %.2f", width, height, refined.Min.X, refined.Min.Y, confidence)
			return squares
		}
	}

	// Фоллбэк: классическое определение контрастных границ
	leftEdge, rightEdge := h.findVerticalEdges(img)
	topEdge, bottomEdge := h.findHorizontalEdges(img)
	log.Printf("[BlueSquare] Contrast edges found - Left: %d, Right: %d, Top: %d, Bottom: %d", leftEdge, rightEdge, topEdge, bottomEdge)
	log.Printf("[BlueSquare] Image size: %dx%d, Expected square: %dx%d", bounds.Dx(), bounds.Dy(), ExpectedSquareSize, ExpectedSquareSize)

	// Проверяем, что границы найдены правильно (не по всему изображению)
	rectWidth := rightEdge - leftEdge
	rectHeight := bottomEdge - topEdge
	expectedWidth := ExpectedSquareSize
	expectedHeight := ExpectedSquareSize
	
	// Проверяем, что размеры близки к ожидаемым
	widthRatio := float64(rectWidth) / float64(expectedWidth)
	heightRatio := float64(rectHeight) / float64(expectedHeight)
	
	log.Printf("[BlueSquare] Contrast region size: %dx%d, ratios: %.2f x %.2f", rectWidth, rectHeight, widthRatio, heightRatio)
	
	if rightEdge > leftEdge && bottomEdge > topEdge && 
	   widthRatio >= 0.7 && widthRatio <= 1.5 && 
	   heightRatio >= 0.7 && heightRatio <= 1.5 {
		refined := h.refineEdgesByContrast(img, image.Rect(leftEdge, topEdge, rightEdge, bottomEdge), 12)
		width := refined.Dx()
		height := refined.Dy()
		aspectRatio := float64(min(width, height)) / float64(max(width, height))
		// Проверяем минимальный размер для контрастного метода
		minContrastSize := int(float64(MinSquareSize) * 0.8) // 80% от минимального размера для контрастного метода
		if width > minContrastSize && height > minContrastSize && aspectRatio > 0.6 {
			confidence := h.calculateContrastConfidence(width, height, bounds.Dx(), bounds.Dy())
			squares = append(squares, SquareInfo{
				X:          refined.Min.X,
				Y:          refined.Min.Y,
				Width:      width,
				Height:     height,
				Confidence: confidence,
				BlueScore:  h.calculateBlueWeight(img, refined),
			})
			h.saveEdgesDebugImage(img, refined.Min.X, refined.Max.X, refined.Min.Y, refined.Max.Y)
			log.Printf("[BlueSquare] Refined contrast region: %dx%d at (%d,%d), confidence: %.2f", width, height, refined.Min.X, refined.Min.Y, confidence)
		}
	}

	return squares
}

// createBlueMask создает бинарную маску синих пикселей
func (h *BlueSquareHandler) createBlueMask(img image.Image, refBlue color.RGBA) image.Image {
	bounds := img.Bounds()
	mask := image.NewRGBA(bounds)
	
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			c := color.RGBAModel.Convert(img.At(x, y)).(color.RGBA)
			
			if h.isTargetPixel(c, refBlue) {
				mask.Set(x, y, color.RGBA{255, 255, 255, 255}) // белый = синий найден
			} else {
				mask.Set(x, y, color.RGBA{0, 0, 0, 255}) // черный = не синий
			}
		}
	}
	
	return mask
}

// createTargetMaskWithThreshold создает бинарную маску целевых цветов с заданным порогом
func (h *BlueSquareHandler) createTargetMaskWithThreshold(img image.Image, threshold float64) image.Image {
    bounds := img.Bounds()
    mask := image.NewRGBA(bounds)
    
    for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
        for x := bounds.Min.X; x < bounds.Max.X; x++ {
            c := color.RGBAModel.Convert(img.At(x, y)).(color.RGBA)
            if (1.0 - h.calculateColorScore(c)) <= (1.0 - threshold) { // score >= threshold
                mask.Set(x, y, color.RGBA{255, 255, 255, 255})
            } else {
                mask.Set(x, y, color.RGBA{0, 0, 0, 255})
            }
        }
    }
    return mask
}

// calculateSquareFitness оценивает прямоугольник: квадратность + площадь + отступ от верхней кромки
func (h *BlueSquareHandler) calculateSquareFitness(rect image.Rectangle, imgBounds image.Rectangle) float64 {
    width := rect.Dx()
    height := rect.Dy()
    if width <= 0 || height <= 0 { return 0 }
    
    // Квадратность
    ratio := float64(min(width, height)) / float64(max(width, height)) // 0..1
    
    // Площадь (нормализованная)
    area := float64(width*height) / float64(imgBounds.Dx()*imgBounds.Dy()) // 0..1
    if area > 1 { area = 1 }
    
    // Штраф за слишком близкую верхнюю границу (часто ложные срабатывания)
    topMargin := float64(rect.Min.Y - imgBounds.Min.Y) / float64(max(1, imgBounds.Dy())) // 0..1
    topPenalty := 0.0
    if topMargin < 0.08 { // 8% от высоты
        topPenalty = (0.08 - topMargin) * 2.5 // усиленный штраф
    }
    if topPenalty > 0.8 { topPenalty = 0.8 }
    
    // Итоговый скор: высокая важность квадратности и площади, вычитаем штраф
    score := ratio*0.55 + area*0.45 - topPenalty
    if score < 0 { score = 0 }
    return score
}

// refineEdgesByContrast уточняет границы прямоугольника поиском локальных максимумов контраста
func (h *BlueSquareHandler) refineEdgesByContrast(img image.Image, rect image.Rectangle, radius int) image.Rectangle {
    bounds := img.Bounds()
    if radius < 1 { radius = 1 }
    
    // Поиск лучшей левой границы в окрестности
    bestLeft := rect.Min.X
    bestLeftScore := -1.0
    for x := max(bounds.Min.X, rect.Min.X-radius); x <= min(bounds.Max.X-1, rect.Min.X+radius); x++ {
        score := 0.0
        for y := rect.Min.Y; y < rect.Max.Y; y++ {
            if x > bounds.Min.X {
                score += h.calculateTargetContrast(img, x-1, y, x, y)
            }
        }
        if score > bestLeftScore {
            bestLeftScore = score
            bestLeft = x
        }
    }
    
    // Правая граница
    bestRight := rect.Max.X
    bestRightScore := -1.0
    for x := max(bounds.Min.X, rect.Max.X-radius); x <= min(bounds.Max.X-1, rect.Max.X+radius); x++ {
        score := 0.0
        for y := rect.Min.Y; y < rect.Max.Y; y++ {
            if x < bounds.Max.X-1 {
                score += h.calculateTargetContrast(img, x, y, x+1, y)
            }
        }
        if score > bestRightScore {
            bestRightScore = score
            bestRight = x
        }
    }
    
    // Верхняя граница (игнорируем самую верхнюю кромку кадра)
    bestTop := rect.Min.Y
    bestTopScore := -1.0
    for y := max(bounds.Min.Y+2, rect.Min.Y-radius); y <= min(bounds.Max.Y-1, rect.Min.Y+radius); y++ {
        score := 0.0
        for x := bestLeft; x < bestRight; x++ {
            if y > bounds.Min.Y {
                score += h.calculateTargetContrast(img, x, y-1, x, y)
            }
        }
        if score > bestTopScore {
            bestTopScore = score
            bestTop = y
        }
    }
    
    // Нижняя граница
    bestBottom := rect.Max.Y
    bestBottomScore := -1.0
    for y := max(bounds.Min.Y, rect.Max.Y-radius); y <= min(bounds.Max.Y-1, rect.Max.Y+radius); y++ {
        score := 0.0
        for x := bestLeft; x < bestRight; x++ {
            if y < bounds.Max.Y-1 {
                score += h.calculateTargetContrast(img, x, y, x, y+1)
            }
        }
        if score > bestBottomScore {
            bestBottomScore = score
            bestBottom = y
        }
    }
    
    // Нормализация прямоугольника
    if bestRight <= bestLeft { bestRight = bestLeft + 1 }
    if bestBottom <= bestTop { bestBottom = bestTop + 1 }
    return image.Rect(bestLeft, bestTop, bestRight, bestBottom)
}

// isTargetPixel проверяет, является ли пиксель одним из целевых цветов
func (h *BlueSquareHandler) isTargetPixel(c, ref color.RGBA) bool {
	// Вычисляем скор близости к целевым цветам
	colorScore := h.calculateColorScore(c)
	
	// Пиксель считается целевым, если его скор выше порога
	return colorScore > 0.3
}

// findSquareRegions ищет прямоугольные области в бинарной маске
func (h *BlueSquareHandler) findSquareRegions(mask image.Image) []SquareInfo {
	bounds := mask.Bounds()
	visited := make([][]bool, bounds.Dy())
	for i := range visited {
		visited[i] = make([]bool, bounds.Dx())
	}
	
	var squares []SquareInfo
	
	// Ищем связные компоненты
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			if visited[y-bounds.Min.Y][x-bounds.Min.X] {
				continue
			}
			
			// Проверяем, является ли пиксель белым (синий в маске)
			c := color.GrayModel.Convert(mask.At(x, y)).(color.Gray)
			if c.Y < 128 { // не белый
				continue
			}
			
			// Находим границы связной области
			rect := h.findConnectedRegion(mask, x, y, visited)
			
			// Проверяем, является ли область достаточно квадратной и большой
			if h.isValidSquare(rect) {
				confidence := h.calculateSquareConfidence(rect)
				squares = append(squares, SquareInfo{
					X:         rect.Min.X,
					Y:         rect.Min.Y,
					Width:     rect.Dx(),
					Height:    rect.Dy(),
					Confidence: confidence,
					BlueScore:  1.0, // TODO: вычислить реальный score
				})
				
				log.Printf("[BlueSquare] Found square: %dx%d at (%d,%d), confidence: %.2f", 
					rect.Dx(), rect.Dy(), rect.Min.X, rect.Min.Y, confidence)
			}
		}
	}
	
	return squares
}

// findConnectedRegion находит границы связной области методом flood fill
func (h *BlueSquareHandler) findConnectedRegion(mask image.Image, startX, startY int, visited [][]bool) image.Rectangle {
	bounds := mask.Bounds()
	
	minX, maxX := startX, startX
	minY, maxY := startY, startY
	
	// Простой flood fill для поиска границ
	stack := []image.Point{{startX, startY}}
	
	for len(stack) > 0 {
		p := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		
		x, y := p.X, p.Y
		
		// Проверяем границы
		if x < bounds.Min.X || x >= bounds.Max.X || y < bounds.Min.Y || y >= bounds.Max.Y {
			continue
		}
		
		// Проверяем, посещен ли пиксель
		if visited[y-bounds.Min.Y][x-bounds.Min.X] {
			continue
		}
		
		// Проверяем, белый ли пиксель (синий в маске)
		c := color.GrayModel.Convert(mask.At(x, y)).(color.Gray)
		if c.Y < 128 {
			continue
		}
		
		// Отмечаем как посещенный
		visited[y-bounds.Min.Y][x-bounds.Min.X] = true
		
		// Обновляем границы
		if x < minX { minX = x }
		if x > maxX { maxX = x }
		if y < minY { minY = y }
		if y > maxY { maxY = y }
		
		// Добавляем соседей в стек
		stack = append(stack, image.Point{x+1, y})
		stack = append(stack, image.Point{x-1, y})
		stack = append(stack, image.Point{x, y+1})
		stack = append(stack, image.Point{x, y-1})
	}
	
	return image.Rect(minX, minY, maxX+1, maxY+1)
}

// isValidSquare проверяет, является ли область валидным квадратом с учетом ожидаемого размера 494px
func (h *BlueSquareHandler) isValidSquare(rect image.Rectangle) bool {
	width := rect.Dx()
	height := rect.Dy()
	
	// Минимальный размер (довольно маленький порог для начальной фильтрации)
	if width < 10 || height < 10 {
		return false
	}
	
	// Проверяем размеры относительно ожидаемого квадрата 494px с погрешностью ±15%
	avgSize := (width + height) / 2
	if avgSize < MinSquareSize || avgSize > MaxSquareSize {
		return false
	}
	
	// Требования к квадратности - более строгие для целевого размера
	ratio := float64(width) / float64(height)
	if ratio < 0.85 || ratio > 1.15 { // ±15% от идеального квадрата
		return false
	}
	
	return true
}

// calculateSquareConfidence вычисляет уверенность на основе близости к ожидаемому размеру 494px
func (h *BlueSquareHandler) calculateSquareConfidence(rect image.Rectangle) float64 {
	width := rect.Dx()
	height := rect.Dy()
	
	// Квадратность - важный фактор для целевого квадрата
	ratio := float64(min(width, height)) / float64(max(width, height))
	
	// Размер относительно ожидаемого квадрата 494px
	avgSize := float64(width + height) / 2.0
	sizeDeviation := math.Abs(avgSize - float64(ExpectedSquareSize)) / float64(ExpectedSquareSize)
	sizeScore := math.Max(0.0, 1.0 - sizeDeviation) // 1.0 для точного размера, меньше для отклонений
	
	// Бонус за квадратность - более важный для целевого размера
	shapeBonus := ratio // 1.0 для идеального квадрата
	
	// Бонус за близость к ожидаемому размеру
	targetSizeBonus := 0.0
	if avgSize >= float64(MinSquareSize) && avgSize <= float64(MaxSquareSize) {
		// Линейный бонус в пределах допустимого диапазона
		targetSizeBonus = 1.0 - (sizeDeviation / (SizeTolerancePercent / 100.0))
		if targetSizeBonus > 1.0 { targetSizeBonus = 1.0 }
	}
	
	// Взвешенная оценка: 40% размер, 30% форма, 30% близость к целевому размеру
	return sizeScore*0.4 + shapeBonus*0.3 + targetSizeBonus*0.3
}

// findVerticalEdges находит левую и правую границы по контрасту
func (h *BlueSquareHandler) findVerticalEdges(img image.Image) (int, int) {
	bounds := img.Bounds()
	width, height := bounds.Dx(), bounds.Dy()
	
	leftEdge := 0
	rightEdge := width - 1
	
	// Ожидаемый центр квадрата (примерно в центре изображения)
	expectedCenterX := width / 2
	expectedHalfWidth := ExpectedSquareSize / 2
	
	// Ищем левую границу - сканируем от центра влево
	searchStart := max(0, expectedCenterX - expectedHalfWidth - 100)
	searchEnd := min(width/2, expectedCenterX + expectedHalfWidth + 100)
	
	bestLeft := 0
	bestLeftScore := 0.0
	
	for x := searchStart; x < searchEnd; x++ {
		totalContrast := 0.0
		validPixels := 0
		
		for y := 0; y < height; y++ {
			if x > 0 {
				contrast := h.calculateTargetContrast(img, x-1, y, x, y)
				totalContrast += contrast
				validPixels++
			}
		}
		
		if validPixels > 0 {
			avgContrast := totalContrast / float64(validPixels)
			// Бонус за близость к ожидаемой позиции
			distanceFromExpected := math.Abs(float64(x - (expectedCenterX - expectedHalfWidth)))
			positionBonus := math.Max(0.0, 1.0 - distanceFromExpected/100.0)
			
			score := avgContrast * (1.0 + positionBonus*0.5)
			
			if score > bestLeftScore && avgContrast > 25.0 {
				bestLeftScore = score
				bestLeft = x
			}
		}
	}
	
	if bestLeftScore > 0 {
		leftEdge = bestLeft
	}
	
	// Ищем правую границу - сканируем от центра вправо
	searchStart = max(width/2, expectedCenterX - expectedHalfWidth - 100)
	searchEnd = min(width-1, expectedCenterX + expectedHalfWidth + 100)
	
	bestRight := width - 1
	bestRightScore := 0.0
	
	for x := searchEnd; x > searchStart; x-- {
		totalContrast := 0.0
		validPixels := 0
		
		for y := 0; y < height; y++ {
			if x < width-1 {
				contrast := h.calculateTargetContrast(img, x, y, x+1, y)
				totalContrast += contrast
				validPixels++
			}
		}
		
		if validPixels > 0 {
			avgContrast := totalContrast / float64(validPixels)
			// Бонус за близость к ожидаемой позиции
			distanceFromExpected := math.Abs(float64(x - (expectedCenterX + expectedHalfWidth)))
			positionBonus := math.Max(0.0, 1.0 - distanceFromExpected/100.0)
			
			score := avgContrast * (1.0 + positionBonus*0.5)
			
			if score > bestRightScore && avgContrast > 25.0 {
				bestRightScore = score
				bestRight = x
			}
		}
	}
	
	if bestRightScore > 0 {
		rightEdge = bestRight
	}
	
	log.Printf("[BlueSquare] Vertical edges: left=%d (score=%.2f), right=%d (score=%.2f)", leftEdge, bestLeftScore, rightEdge, bestRightScore)
	
	return leftEdge, rightEdge
}

// findHorizontalEdges находит верхнюю и нижнюю границы по контрасту
func (h *BlueSquareHandler) findHorizontalEdges(img image.Image) (int, int) {
	bounds := img.Bounds()
	width, height := bounds.Dx(), bounds.Dy()
	
	topEdge := 0
	bottomEdge := height - 1
	
	// Ожидаемый центр квадрата (примерно в центре изображения)
	expectedCenterY := height / 2
	expectedHalfHeight := ExpectedSquareSize / 2
	
	// Ищем верхнюю границу - сканируем от центра вверх
	searchStart := max(0, expectedCenterY - expectedHalfHeight - 100)
	searchEnd := min(height/2, expectedCenterY + expectedHalfHeight + 100)
	
	bestTop := 0
	bestTopScore := 0.0
	
	for y := searchStart; y < searchEnd; y++ {
		totalContrast := 0.0
		validPixels := 0
		
		for x := 0; x < width; x++ {
			if y > 0 {
				contrast := h.calculateTargetContrast(img, x, y-1, x, y)
				totalContrast += contrast
				validPixels++
			}
		}
		
		if validPixels > 0 {
			avgContrast := totalContrast / float64(validPixels)
			// Бонус за близость к ожидаемой позиции
			distanceFromExpected := math.Abs(float64(y - (expectedCenterY - expectedHalfHeight)))
			positionBonus := math.Max(0.0, 1.0 - distanceFromExpected/100.0)
			
			score := avgContrast * (1.0 + positionBonus*0.5)
			
			if score > bestTopScore && avgContrast > 25.0 {
				bestTopScore = score
				bestTop = y
			}
		}
	}
	
	if bestTopScore > 0 {
		topEdge = bestTop
	}
	
	// Ищем нижнюю границу - сканируем от центра вниз
	searchStart = max(height/2, expectedCenterY - expectedHalfHeight - 100)
	searchEnd = min(height-1, expectedCenterY + expectedHalfHeight + 100)
	
	bestBottom := height - 1
	bestBottomScore := 0.0
	
	for y := searchEnd; y > searchStart; y-- {
		totalContrast := 0.0
		validPixels := 0
		
		for x := 0; x < width; x++ {
			if y < height-1 {
				contrast := h.calculateTargetContrast(img, x, y, x, y+1)
				totalContrast += contrast
				validPixels++
			}
		}
		
		if validPixels > 0 {
			avgContrast := totalContrast / float64(validPixels)
			// Бонус за близость к ожидаемой позиции
			distanceFromExpected := math.Abs(float64(y - (expectedCenterY + expectedHalfHeight)))
			positionBonus := math.Max(0.0, 1.0 - distanceFromExpected/100.0)
			
			score := avgContrast * (1.0 + positionBonus*0.5)
			
			if score > bestBottomScore && avgContrast > 25.0 {
				bestBottomScore = score
				bestBottom = y
			}
		}
	}
	
	if bestBottomScore > 0 {
		bottomEdge = bestBottom
	}
	
	log.Printf("[BlueSquare] Horizontal edges: top=%d (score=%.2f), bottom=%d (score=%.2f)", topEdge, bestTopScore, bottomEdge, bestBottomScore)
	
	return topEdge, bottomEdge
}

// calculateTargetContrast вычисляет контраст между сине-фиолетовым и не сине-фиолетовым цветом
func (h *BlueSquareHandler) calculateTargetContrast(img image.Image, x1, y1, x2, y2 int) float64 {
	c1 := color.RGBAModel.Convert(img.At(x1, y1)).(color.RGBA)
	c2 := color.RGBAModel.Convert(img.At(x2, y2)).(color.RGBA)
	
	// Вычисляем скоры близости к сине-фиолетовым цветам
	score1 := h.calculateColorScore(c1)
	score2 := h.calculateColorScore(c2)
	
	// Более строгий порог для определения сине-фиолетового цвета
	isTarget1 := score1 > 0.4
	isTarget2 := score2 > 0.4
	
	// Контраст есть только если один пиксель сине-фиолетовый, а другой - нет
	if (isTarget1 && !isTarget2) || (!isTarget1 && isTarget2) {
		// Вычисляем силу контраста
		dr := float64(c1.R) - float64(c2.R)
		dg := float64(c1.G) - float64(c2.G)
		db := float64(c1.B) - float64(c2.B)
		
		baseContrast := math.Sqrt(dr*dr + dg*dg + db*db)
		
		// Бонус за высокий скор сине-фиолетового цвета
		targetScore := math.Max(score1, score2)
		contrastBonus := 1.0 + targetScore*0.5 // до 50% бонуса
		
		return baseContrast * contrastBonus
	}
	
	return 0 // нет контраста между сине-фиолетовым и не сине-фиолетовым
}

// calculateContrastConfidence вычисляет уверенность для области, найденной по контрасту, с учетом ожидаемого размера 494px
func (h *BlueSquareHandler) calculateContrastConfidence(width, height, imgWidth, imgHeight int) float64 {
	// Размер относительно изображения
	areaRatio := float64(width*height) / float64(imgWidth*imgHeight)
	
	// Квадратность - ВАЖНО для данного алгоритма
	aspectRatio := float64(min(width, height)) / float64(max(width, height))
	
	// Проверяем близость к ожидаемому размеру 494px
	avgSize := float64(width + height) / 2.0
	sizeDeviation := math.Abs(avgSize - float64(ExpectedSquareSize)) / float64(ExpectedSquareSize)
	
	// Бонус за квадратность и разумный размер
	squareBonus := 1.0
	if aspectRatio < 0.85 || aspectRatio > 1.15 { // более строгие требования для целевого размера
		squareBonus = 0.5 // снижаем уверенность для не квадратных областей
	}
	
	// Бонус за близость к ожидаемому размеру
	targetSizeBonus := 0.0
	if avgSize >= float64(MinSquareSize) && avgSize <= float64(MaxSquareSize) {
		targetSizeBonus = 1.0 - (sizeDeviation / (SizeTolerancePercent / 100.0))
		if targetSizeBonus > 1.0 { targetSizeBonus = 1.0 }
	}
	
	// Баланс: размер + квадратность + бонус за правильную форму + близость к целевому размеру
	return areaRatio*0.25 + aspectRatio*0.25 + squareBonus*0.25 + targetSizeBonus*0.25
}

// saveEdgesDebugImage сохраняет изображение с отмеченными границами
func (h *BlueSquareHandler) saveEdgesDebugImage(img image.Image, left, right, top, bottom int) {
	bounds := img.Bounds()
	
	// Создаем новое RGBA изображение для рисования границ
	debugImg := image.NewRGBA(bounds)
	
	// Копируем оригинальное изображение
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			debugImg.Set(x, y, img.At(x, y))
		}
	}
	
	// Рисуем границы красными линиями
	red := color.RGBA{255, 0, 0, 255}
	
	// Вертикальные линии
	for y := 0; y < bounds.Dy(); y++ {
		if left < bounds.Dx() {
			debugImg.Set(bounds.Min.X+left, bounds.Min.Y+y, red)
		}
		if right < bounds.Dx() {
			debugImg.Set(bounds.Min.X+right, bounds.Min.Y+y, red)
		}
	}
	
	// Горизонтальные линии
	for x := 0; x < bounds.Dx(); x++ {
		if top < bounds.Dy() {
			debugImg.Set(bounds.Min.X+x, bounds.Min.Y+top, red)
		}
		if bottom < bounds.Dy() {
			debugImg.Set(bounds.Min.X+x, bounds.Min.Y+bottom, red)
		}
	}
	
	// Создаем уникальное имя для отладочного изображения границ
	timestamp := time.Now().Format("20060102_150405")
	debugPath := filepath.Join(h.uploadDir, fmt.Sprintf("edges_debug_%s.png", timestamp))
	imaging.Save(debugImg, debugPath)
	log.Printf("[BlueSquare] Contrast edges debug saved to: %s", debugPath)
}

// createDetectedRegionImage создает изображение с выделенной найденной областью
func (h *BlueSquareHandler) createDetectedRegionImage(img image.Image, rect image.Rectangle) image.Image {
	bounds := img.Bounds()
	
	// Создаем новое RGBA изображение для рисования границ
	debugImg := image.NewRGBA(bounds)
	
	// Копируем оригинальное изображение
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			debugImg.Set(x, y, img.At(x, y))
		}
	}
	
	// Рисуем границы найденной области красными линиями
	red := color.RGBA{255, 0, 0, 255}
	
	// Вертикальные линии
	for y := rect.Min.Y; y < rect.Max.Y; y++ {
		if rect.Min.X < bounds.Dx() {
			debugImg.Set(bounds.Min.X+rect.Min.X, bounds.Min.Y+y, red)
		}
		if rect.Max.X < bounds.Dx() {
			debugImg.Set(bounds.Min.X+rect.Max.X, bounds.Min.Y+y, red)
		}
	}
	
	// Горизонтальные линии
	for x := rect.Min.X; x < rect.Max.X; x++ {
		if rect.Min.Y < bounds.Dy() {
			debugImg.Set(bounds.Min.X+x, bounds.Min.Y+rect.Min.Y, red)
		}
		if rect.Max.Y < bounds.Dy() {
			debugImg.Set(bounds.Min.X+x, bounds.Min.Y+rect.Max.Y, red)
		}
	}
	
	return debugImg
}

// extractStripsFromSquare разделяет квадрат на 8 горизонтальных полос и извлекает текст
func (h *BlueSquareHandler) extractStripsFromSquare(img image.Image, square SquareInfo, filename string) ([]StripInfo, *PreprocessingSteps, error) {
	// Создаем прямоугольник для обрезки
	rect := image.Rect(square.X, square.Y, square.X+square.Width, square.Y+square.Height)
	
	// Обрезаем изображение по квадрату
	croppedImg := imaging.Crop(img, rect)
	
	// Применяем продвинутую предобработку для лучшего распознавания цифр с сохранением этапов
	preprocessedImg, preprocessingSteps, err := h.advancedPreprocessingWithSteps(croppedImg, filename)
	if err != nil {
		log.Printf("[BlueSquare] Failed to preprocess image: %v", err)
		// Fallback к простой предобработке
		preprocessedImg = h.advancedPreprocessing(croppedImg)
		preprocessingSteps = nil
	}
	
	// Разделяем на 8 полос
	numStrips := 8
	stripHeight := preprocessedImg.Bounds().Dy() / numStrips
	
	var strips []StripInfo
	
	for i := 0; i < numStrips; i++ {
		// Вычисляем границы полосы с учетом возможных вариаций высоты
		stripY := i * stripHeight
		stripHeightActual := stripHeight
		
		// Добавляем небольшой отступ для компенсации "гуляния" букв по высоте
		overlap := stripHeight / 8 // 12.5% перекрытия
		if i > 0 {
			stripY -= overlap / 2
			stripHeightActual += overlap / 2
		}
		if i < numStrips-1 {
			stripHeightActual += overlap / 2
		}
		
		// Ограничиваем границы изображением
		if stripY < 0 {
			stripHeightActual += stripY
			stripY = 0
		}
		if stripY+stripHeightActual > preprocessedImg.Bounds().Dy() {
			stripHeightActual = preprocessedImg.Bounds().Dy() - stripY
		}
		
		// Создаем прямоугольник для полосы
		stripRect := image.Rect(0, stripY, preprocessedImg.Bounds().Dx(), stripY+stripHeightActual)
		
		// Обрезаем полосу из предобработанного изображения
		stripImg := imaging.Crop(preprocessedImg, stripRect)
		
		// Сохраняем изображение полосы
		stripPath, err := h.saveStripImage(stripImg, i, filename)
		if err != nil {
			log.Printf("[BlueSquare] Failed to save strip %d: %v", i, err)
			continue
		}
		
		// Извлекаем текст из полосы с OCR
		text, confidence := h.extractTextFromStrip(stripImg)
		
		// Дополнительно выполняем OCR на полосе
		ocrText, ocrConfidence := h.performOCROnStrip(stripImg)
		
		strip := StripInfo{
			Index:         i,
			Y:             square.Y + stripY,
			Height:        stripHeightActual,
			Text:          text,
			Confidence:    confidence,
			ImagePath:     stripPath,
			OcrText:       ocrText,
			OcrConfidence: ocrConfidence,
		}
		
		strips = append(strips, strip)
		log.Printf("[BlueSquare] Strip %d: Y=%d, Height=%d, Text='%s', Confidence=%.2f", 
			i, strip.Y, strip.Height, strip.Text, strip.Confidence)
	}
	
	return strips, preprocessingSteps, nil
}

// saveStripImage сохраняет изображение полосы
func (h *BlueSquareHandler) saveStripImage(stripImg image.Image, stripIndex int, filename string) (string, error) {
	// Создаем уникальное имя с timestamp
	timestamp := time.Now().Format("20060102_150405")
	stripFilename := fmt.Sprintf("strip_%d_%s_%s", stripIndex, timestamp, filename)
	
	// Сохраняем в папку фронтенда для доступа через Next.js
	frontendUploadsDir := "../frontend/public/uploads"
	stripPath := filepath.Join(frontendUploadsDir, stripFilename)
	
	// Создаем директорию если не существует
	err := os.MkdirAll(frontendUploadsDir, 0755)
	if err != nil {
		return "", fmt.Errorf("failed to create frontend uploads dir: %w", err)
	}
	
	// Сохраняем изображение полосы
	err = imaging.Save(stripImg, stripPath)
	if err != nil {
		return "", fmt.Errorf("failed to save strip image: %w", err)
	}
	
	log.Printf("[BlueSquare] Strip %d saved to: %s", stripIndex, stripPath)
	
	// Возвращаем путь относительно public для фронтенда
	return filepath.Join("/uploads", stripFilename), nil
}

// extractTextFromStrip извлекает текст из полосы (заглушка для OCR)
func (h *BlueSquareHandler) extractTextFromStrip(stripImg image.Image) (string, float64) {
	// Анализируем grayscale изображение для определения наличия текста
	bounds := stripImg.Bounds()
	
	// Считаем количество черных и белых пикселей (после усиления контраста)
	blackPixels := 0
	whitePixels := 0
	totalPixels := bounds.Dx() * bounds.Dy()
	
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			// Получаем grayscale значение
			gray := color.GrayModel.Convert(stripImg.At(x, y)).(color.Gray)
			
			if gray.Y < 64 { // очень темный пиксель (почти черный)
				blackPixels++
			} else if gray.Y > 192 { // очень светлый пиксель (почти белый)
				whitePixels++
			}
		}
	}
	
	// Вычисляем соотношение контрастных пикселей
	contrastRatio := float64(blackPixels+whitePixels) / float64(totalPixels)
	blackRatio := float64(blackPixels) / float64(totalPixels)
	
	// Если есть достаточное количество контрастных пикселей, предполагаем наличие текста
	if contrastRatio > 0.15 && blackRatio > 0.05 { // больше 15% контрастных и 5% черных пикселей
		// Анализируем горизонтальные линии для определения текста
		textLines := h.detectTextLines(stripImg)
		
		if textLines > 0 {
			// Теперь используем OCR для распознавания текста
			ocrText, ocrConfidence := h.performOCROnStrip(stripImg)
			if ocrText != "" {
				return ocrText, ocrConfidence
			}
			// Fallback к старому методу если OCR не сработал
			return fmt.Sprintf("Lines_%d", textLines), contrastRatio
		}
	}
	
	return "", 0.0
}

// performOCROnStrip выполняет OCR на полосе изображения
func (h *BlueSquareHandler) performOCROnStrip(stripImg image.Image) (string, float64) {
	// Создаем временный файл для полосы
	timestamp := time.Now().Format("20060102_150405")
	tempPath := fmt.Sprintf("temp_strip_%s.png", timestamp)
	
	// Сохраняем изображение полосы
	err := imaging.Save(stripImg, tempPath)
	if err != nil {
		log.Printf("[BlueSquare OCR] Failed to save strip image: %v", err)
		return "", 0.0
	}
	defer os.Remove(tempPath) // удаляем временный файл
	
	// Пробуем разные PSM режимы для распознавания строки
	psmModes := []string{"8", "6", "7", "13"}
	bestText := ""
	bestConfidence := 0.0
	
	for _, psm := range psmModes {
		text, confidence, err := h.runTesseract(tempPath, psm)
		if err != nil {
			log.Printf("[BlueSquare OCR] PSM %s failed: %v", psm, err)
			continue
		}
		
		// Извлекаем только цифры
		digits := h.onlyDigits(text)
		log.Printf("[BlueSquare OCR] PSM %s: '%s' -> %d digits, confidence=%.2f", psm, text, len(digits), confidence)
		
		// Выбираем лучший результат
		if len(digits) > len(h.onlyDigits(bestText)) || (len(digits) == len(h.onlyDigits(bestText)) && confidence > bestConfidence) {
			bestText = text
			bestConfidence = confidence
		}
		
		// Если получили хороший результат, можем остановиться
		if len(digits) >= 6 {
			break
		}
	}
	
	if bestText != "" {
		digits := h.onlyDigits(bestText)
		log.Printf("[BlueSquare OCR] Best result: '%s' -> %d digits", bestText, len(digits))
		return digits, bestConfidence
	}
	
	return "", 0.0
}

// createMatrixFromStrips создает матрицу 8x8 из распознанных полос
func (h *BlueSquareHandler) createMatrixFromStrips(strips []StripInfo) ([][]string, float64) {
	matrix := make([][]string, 8)
	totalConfidence := 0.0
	recognizedStrips := 0
	
	// Инициализируем матрицу
	for i := 0; i < 8; i++ {
		matrix[i] = make([]string, 8)
	}
	
	// Заполняем матрицу данными из полос
	for _, strip := range strips {
		if strip.Index >= 0 && strip.Index < 8 {
			// Используем OCR текст если он есть, иначе обычный текст
			text := strip.OcrText
			confidence := strip.OcrConfidence
			
			if text == "" {
				text = strip.Text
				confidence = strip.Confidence
			}
			
			if text != "" {
				// Парсим текст в отдельные символы
				digits := h.onlyDigits(text)
				log.Printf("[BlueSquare] Strip %d: '%s' -> %d digits", strip.Index, text, len(digits))
				
				// Заполняем строку матрицы
				for i, digit := range digits {
					if i >= 8 { break } // ограничиваем 8 символами
					if digit >= '1' && digit <= '9' {
						matrix[strip.Index][i] = string(digit)
					}
				}
				
				totalConfidence += confidence
				recognizedStrips++
			}
		}
	}
	
	// Вычисляем среднюю уверенность
	avgConfidence := 0.0
	if recognizedStrips > 0 {
		avgConfidence = totalConfidence / float64(recognizedStrips)
	}
	
	log.Printf("[BlueSquare] Matrix created from %d strips, avg confidence: %.2f", recognizedStrips, avgConfidence)
	return matrix, avgConfidence
}

// performTinyCNNOCR выполняет OCR с использованием Tiny-CNN
func (h *BlueSquareHandler) performTinyCNNOCR(img image.Image, square SquareInfo, filename string) ([][]string, float64) {
	if h.tinyCNN == nil {
		log.Printf("[BlueSquare] Tiny-CNN not available, falling back to Tesseract")
		return h.performOCROnFullSquare(img, square, filename)
	}
	
	log.Printf("[BlueSquare TinyCNN] Starting Tiny-CNN OCR recognition")
	
	// Создаем прямоугольник для обрезки
	rect := image.Rect(square.X, square.Y, square.X+square.Width, square.Y+square.Height)
	croppedImg := imaging.Crop(img, rect)
	
	// Применяем предобработку для Tiny-CNN
	processedImg := h.preprocessForTinyCNN(croppedImg)
	
	// Вычисляем размер ячейки (8x8 сетка)
	cellSize := square.Width / 8
	
	// Распознаем сетку с помощью Tiny-CNN
	matrix, confidence := h.tinyCNN.RecognizeGrid(processedImg, cellSize)
	
	log.Printf("[BlueSquare TinyCNN] Recognition completed with confidence: %.2f", confidence)
	return matrix, confidence
}

// preprocessForTinyCNN предобрабатывает изображение для Tiny-CNN
func (h *BlueSquareHandler) preprocessForTinyCNN(img image.Image) image.Image {
	// Конвертируем в RGBA
	bounds := img.Bounds()
	rgba := image.NewRGBA(bounds)
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			rgba.Set(x, y, img.At(x, y))
		}
	}
	
	// Применяем улучшения для лучшего распознавания
	enhanced := h.enhanceImageForOCR(rgba)
	
	return enhanced
}

// enhanceImageForOCR улучшает изображение для OCR
func (h *BlueSquareHandler) enhanceImageForOCR(img *image.RGBA) *image.RGBA {
	bounds := img.Bounds()
	enhanced := image.NewRGBA(bounds)
	
	// Применяем контрастность и яркость
	contrast := 1.5
	brightness := 0.2
	
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			r, g, b, a := img.RGBAAt(x, y).RGBA()
			
			// Нормализуем в [0,1]
			rf := float64(r) / 65535.0
			gf := float64(g) / 65535.0
			bf := float64(b) / 65535.0
			
			// Применяем контрастность и яркость
			rf = (rf - 0.5) * contrast + 0.5 + brightness
			gf = (gf - 0.5) * contrast + 0.5 + brightness
			bf = (bf - 0.5) * contrast + 0.5 + brightness
			
			// Ограничиваем значения [0,1]
			if rf < 0 { rf = 0 }
			if rf > 1 { rf = 1 }
			if gf < 0 { gf = 0 }
			if gf > 1 { gf = 1 }
			if bf < 0 { bf = 0 }
			if bf > 1 { bf = 1 }
			
			// Конвертируем обратно
			enhanced.SetRGBA(x, y, color.RGBA{
				R: uint8(rf * 255),
				G: uint8(gf * 255),
				B: uint8(bf * 255),
				A: uint8(a >> 8),
			})
		}
	}
	
	return enhanced
}

// performOCROnFullSquare выполняет OCR на полном изображении квадрата
func (h *BlueSquareHandler) performOCROnFullSquare(img image.Image, square SquareInfo, filename string) ([][]string, float64) {
	log.Printf("[BlueSquare OCR] Starting full square OCR recognition")
	
	// Создаем прямоугольник для обрезки
	rect := image.Rect(square.X, square.Y, square.X+square.Width, square.Y+square.Height)
	
	// Обрезаем изображение по квадрату
	croppedImg := imaging.Crop(img, rect)
	
	// Применяем продвинутую предобработку
	preprocessedImg := h.advancedPreprocessing(croppedImg)
	
	// Сохраняем предобработанное изображение для OCR
	timestamp := time.Now().Format("20060102_150405")
	processedPath := fmt.Sprintf("temp_square_%s_%s.png", timestamp, filename)
	
	err := imaging.Save(preprocessedImg, processedPath)
	if err != nil {
		log.Printf("[BlueSquare OCR] Failed to save preprocessed image: %v", err)
		return nil, 0.0
	}
	defer os.Remove(processedPath) // удаляем временный файл
	
	var matrix8x8 [][]string
	var bestText string
	var bestConf float64
	
	log.Printf("[BlueSquare OCR] === STARTING ROW-BASED RECOGNITION ===")
	
	// Сначала пробуем распознавание по строкам
	rowMatrix, err := h.ocrByRows(processedPath)
	if err != nil {
		log.Printf("[BlueSquare OCR] Row recognition failed: %v", err)
	} else {
		// Подсчитываем количество распознанных клеток
		recognizedCells := 0
		for i := 0; i < 8; i++ {
			for j := 0; j < 8; j++ {
				if rowMatrix[i][j] != "" {
					recognizedCells++
				}
			}
		}
		
		log.Printf("[BlueSquare OCR] Row recognition result: %d/64 cells (%.1f%%)", 
			recognizedCells, float64(recognizedCells)/64.0*100.0)
		
		// Логируем матрицу
		log.Printf("[BlueSquare OCR] Row matrix:")
		for i := 0; i < 8; i++ {
			row := ""
			for j := 0; j < 8; j++ {
				if rowMatrix[i][j] != "" {
					row += rowMatrix[i][j]
				} else {
					row += "_"
				}
			}
			log.Printf("[BlueSquare OCR] Row %d: %s", i, row)
		}
		
		// Используем row-based результат если он хорош
		if recognizedCells >= 30 {
			matrix8x8 = rowMatrix
			bestConf = float64(recognizedCells) / 64.0 * 100.0
			bestText = "Row-based recognition"
			log.Printf("[BlueSquare OCR] === USING ROW-BASED RESULT: %d cells, confidence=%.2f%% ===", recognizedCells, bestConf)
		} else {
			log.Printf("[BlueSquare OCR] Row result insufficient (%d < 30), trying grid-based", recognizedCells)
			
			// Fallback на grid-based если row-based не сработал
			gridMatrix, err := h.ocrGridPerCell(processedPath)
			if err != nil {
				log.Printf("[BlueSquare OCR] Grid recognition also failed: %v", err)
			} else {
				gridCells := 0
				for i := 0; i < 8; i++ {
					for j := 0; j < 8; j++ {
						if gridMatrix[i][j] != "" {
							gridCells++
						}
					}
				}
				
				if gridCells >= 20 {
					matrix8x8 = gridMatrix
					bestConf = float64(gridCells) / 64.0 * 100.0
					bestText = "Grid-based recognition"
					log.Printf("[BlueSquare OCR] === USING GRID-BASED FALLBACK: %d cells ===", gridCells)
				}
			}
		}
	}
	
	// Если grid-based метод не сработал, используем fallback с перебором PSM
	if matrix8x8 == nil {
		log.Printf("[BlueSquare OCR] Using fallback PSM-based recognition")
		
		// Пытаемся распознать на нескольких режимах PSM
		psmModes := []string{"4", "6", "7", "11", "13"}
		
		bestText = ""
		bestConf = 0.0
		for _, psm := range psmModes {
			text, conf, err := h.runTesseract(processedPath, psm)
			if err != nil {
				log.Printf("[BlueSquare OCR] tesseract error (psm=%s): %v", psm, err)
				continue
			}
			digits := h.onlyDigits(text)
			log.Printf("[BlueSquare OCR] attempt psm=%s digits=%d conf=%.2f", psm, len(digits), conf)
			if len(digits) > len(h.onlyDigits(bestText)) || (len(digits) == len(h.onlyDigits(bestText)) && conf > bestConf) {
				bestText = text
				bestConf = conf
			}
			if len(digits) >= 64 {
				break
			}
		}
		
		// Парсим в матрицу 8x8
		matrix8x8 = h.parseToMatrix8x8(bestText)
	}
	
	log.Printf("[BlueSquare OCR] Success: digits=%d confidence=%.2f", len(h.onlyDigits(bestText)), bestConf)
	return matrix8x8, bestConf
}

// detectTextLines определяет количество горизонтальных линий текста в полосе
func (h *BlueSquareHandler) detectTextLines(stripImg image.Image) int {
	bounds := stripImg.Bounds()
	
	// Анализируем горизонтальные проекции для поиска линий текста
	projections := make([]int, bounds.Dy())
	
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		blackCount := 0
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			gray := color.GrayModel.Convert(stripImg.At(x, y)).(color.Gray)
			if gray.Y < 64 { // черный пиксель
				blackCount++
			}
		}
		projections[y-bounds.Min.Y] = blackCount
	}
	
	// Ищем пики в проекциях (строки текста)
	textLines := 0
	threshold := bounds.Dx() / 20 // минимум 5% черных пикселей в строке
	
	for i := 1; i < len(projections)-1; i++ {
		// Проверяем, является ли текущая строка пиком
		if projections[i] > threshold && 
		   projections[i] > projections[i-1] && 
		   projections[i] > projections[i+1] {
			textLines++
		}
	}
	
	return textLines
}

// enhanceContrastForText значительно усиливает контраст для лучшего распознавания текста
func (h *BlueSquareHandler) enhanceContrastForText(grayImg image.Image) image.Image {
	bounds := grayImg.Bounds()
	enhancedImg := image.NewGray(bounds)
	
	// Применяем агрессивное усиление контраста
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			// Получаем текущее значение яркости
			gray := color.GrayModel.Convert(grayImg.At(x, y)).(color.Gray)
			
			// Применяем S-образную кривую для усиления контраста
			// Это делает темные области еще темнее, а светлые - еще светлее
			normalized := float64(gray.Y) / 255.0
			
			// S-образная кривая: y = x^2 * (3 - 2*x)
			// Это усиливает контраст в средних тонах
			enhanced := normalized * normalized * (3.0 - 2.0*normalized)
			
			// Дополнительное усиление: делаем еще более контрастным
			if enhanced < 0.5 {
				// Темные области делаем еще темнее
				enhanced = enhanced * enhanced * 0.5
			} else {
				// Светлые области делаем еще светлее
				enhanced = 0.5 + (enhanced - 0.5) * (enhanced - 0.5) * 2.0
			}
			
			// Ограничиваем значения
			if enhanced > 1.0 {
				enhanced = 1.0
			}
			if enhanced < 0.0 {
				enhanced = 0.0
			}
			
			// Применяем пороговую обработку для создания четких границ
			if enhanced < 0.3 {
				enhanced = 0.0 // черный
			} else if enhanced > 0.7 {
				enhanced = 1.0 // белый
			}
			
			enhancedImg.SetGray(x, y, color.Gray{Y: uint8(enhanced * 255)})
		}
	}
	
	log.Printf("[BlueSquare] Applied aggressive contrast enhancement for text recognition")
	return enhancedImg
}

// convertToGrayscale преобразует изображение в черно-белое
func (h *BlueSquareHandler) convertToGrayscale(img image.Image) image.Image {
	bounds := img.Bounds()
	grayImg := image.NewGray(bounds)
	
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			// Получаем цвет пикселя
			c := color.RGBAModel.Convert(img.At(x, y)).(color.RGBA)
			
			// Преобразуем в grayscale используя стандартную формулу
			// Y = 0.299*R + 0.587*G + 0.114*B
			gray := uint8(0.299*float64(c.R) + 0.587*float64(c.G) + 0.114*float64(c.B))
			
			grayImg.SetGray(x, y, color.Gray{Y: gray})
		}
	}
	
	return grayImg
}

// saveProcessingStepWithGrayscale сохраняет промежуточное изображение в цветном и grayscale вариантах
func (h *BlueSquareHandler) saveProcessingStepWithGrayscale(img image.Image, stepName string, filename string) (string, string, error) {
	// Создаем уникальное имя с timestamp
	timestamp := time.Now().Format("20060102_150405")
	stepFilename := fmt.Sprintf("step_%s_%s_%s", stepName, timestamp, filename)
	grayFilename := fmt.Sprintf("step_%s_gray_%s_%s", stepName, timestamp, filename)
	
	// Сохраняем в папку фронтенда для доступа через Next.js
	frontendUploadsDir := "../frontend/public/uploads"
	stepPath := filepath.Join(frontendUploadsDir, stepFilename)
	grayPath := filepath.Join(frontendUploadsDir, grayFilename)
	
	// Создаем директорию если не существует
	err := os.MkdirAll(frontendUploadsDir, 0755)
	if err != nil {
		return "", "", fmt.Errorf("failed to create frontend uploads dir: %w", err)
	}
	
	// Сохраняем цветное изображение
	err = imaging.Save(img, stepPath)
	if err != nil {
		return "", "", fmt.Errorf("failed to save processing step image: %w", err)
	}
	
	// Преобразуем в grayscale и сохраняем
	grayImg := h.convertToGrayscale(img)
	err = imaging.Save(grayImg, grayPath)
	if err != nil {
		return "", "", fmt.Errorf("failed to save grayscale processing step image: %w", err)
	}
	
	log.Printf("[BlueSquare] Processing step '%s' saved to: %s (color) and %s (grayscale)", stepName, stepPath, grayPath)
	
	// Возвращаем пути относительно public для фронтенда
	colorPath := filepath.Join("/uploads", stepFilename)
	grayPublicPath := filepath.Join("/uploads", grayFilename)
	
	return colorPath, grayPublicPath, nil
}

// saveProcessingStep сохраняет промежуточное изображение на определенном шаге обработки
func (h *BlueSquareHandler) saveProcessingStep(img image.Image, stepName string, filename string) (string, error) {
	// Создаем уникальное имя с timestamp
	timestamp := time.Now().Format("20060102_150405")
	stepFilename := fmt.Sprintf("step_%s_%s_%s", stepName, timestamp, filename)
	
	// Сохраняем в папку фронтенда для доступа через Next.js
	frontendUploadsDir := "../frontend/public/uploads"
	stepPath := filepath.Join(frontendUploadsDir, stepFilename)
	
	// Создаем директорию если не существует
	err := os.MkdirAll(frontendUploadsDir, 0755)
	if err != nil {
		return "", fmt.Errorf("failed to create frontend uploads dir: %w", err)
	}
	
	// Сохраняем изображение
	err = imaging.Save(img, stepPath)
	if err != nil {
		return "", fmt.Errorf("failed to save processing step image: %w", err)
	}
	
	log.Printf("[BlueSquare] Processing step '%s' saved to: %s", stepName, stepPath)
	
	// Возвращаем путь относительно public для фронтенда
	return filepath.Join("/uploads", stepFilename), nil
}

// cropSquareWithEnhancementAndGrayscale обрезает изображение по найденному квадрату и улучшает его качество, возвращает все пути включая grayscale
func (h *BlueSquareHandler) cropSquareWithEnhancementAndGrayscale(img image.Image, square SquareInfo, filename string) (string, string, string, error) {
	// Создаем прямоугольник для обрезки
	rect := image.Rect(square.X, square.Y, square.X+square.Width, square.Y+square.Height)
	
	// Обрезаем изображение
	croppedImg := imaging.Crop(img, rect)
	
	// УЛУЧШЕНИЕ КАЧЕСТВА: применяем предобработку для лучшего качества
	enhancedImg := h.enhanceCroppedImage(croppedImg)
	
	// Создаем уникальное имя с timestamp
	timestamp := time.Now().Format("20060102_150405")
	croppedFilename := fmt.Sprintf("cropped_%s_%dx%d_conf%.0f_%s", 
		timestamp, square.Width, square.Height, square.Confidence*100, filename)
	enhancedFilename := fmt.Sprintf("enhanced_%s_%dx%d_conf%.0f_%s", 
		timestamp, square.Width, square.Height, square.Confidence*100, filename)
	enhancedGrayFilename := fmt.Sprintf("enhanced_gray_%s_%dx%d_conf%.0f_%s", 
		timestamp, square.Width, square.Height, square.Confidence*100, filename)
	
	// Сохраняем в папку фронтенда для доступа через Next.js
	frontendUploadsDir := "../frontend/public/uploads"
	croppedPath := filepath.Join(frontendUploadsDir, croppedFilename)
	enhancedPath := filepath.Join(frontendUploadsDir, enhancedFilename)
	enhancedGrayPath := filepath.Join(frontendUploadsDir, enhancedGrayFilename)
	
	// Создаем директорию если не существует
	err := os.MkdirAll(frontendUploadsDir, 0755)
	if err != nil {
		return "", "", "", fmt.Errorf("failed to create frontend uploads dir: %w", err)
	}
	
	// Сохраняем обрезанное изображение
	err = imaging.Save(croppedImg, croppedPath)
	if err != nil {
		return "", "", "", fmt.Errorf("failed to save cropped image: %w", err)
	}
	
	// Сохраняем улучшенное изображение
	err = imaging.Save(enhancedImg, enhancedPath)
	if err != nil {
		return "", "", "", fmt.Errorf("failed to save enhanced image: %w", err)
	}
	
	// Преобразуем улучшенное изображение в grayscale и сохраняем
	enhancedGrayImg := h.convertToGrayscale(enhancedImg)
	err = imaging.Save(enhancedGrayImg, enhancedGrayPath)
	if err != nil {
		return "", "", "", fmt.Errorf("failed to save enhanced grayscale image: %w", err)
	}
	
	log.Printf("[BlueSquare] Cropped square saved to: %s", croppedPath)
	log.Printf("[BlueSquare] Enhanced square saved to: %s", enhancedPath)
	log.Printf("[BlueSquare] Enhanced grayscale square saved to: %s", enhancedGrayPath)
	
	// Возвращаем пути относительно public для фронтенда
	croppedPublicPath := filepath.Join("/uploads", croppedFilename)
	enhancedPublicPath := filepath.Join("/uploads", enhancedFilename)
	enhancedGrayPublicPath := filepath.Join("/uploads", enhancedGrayFilename)
	
	return croppedPublicPath, enhancedPublicPath, enhancedGrayPublicPath, nil
}

// cropSquareWithEnhancement обрезает изображение по найденному квадрату и улучшает его качество, возвращает оба пути
func (h *BlueSquareHandler) cropSquareWithEnhancement(img image.Image, square SquareInfo, filename string) (string, string, error) {
	// Создаем прямоугольник для обрезки
	rect := image.Rect(square.X, square.Y, square.X+square.Width, square.Y+square.Height)
	
	// Обрезаем изображение
	croppedImg := imaging.Crop(img, rect)
	
	// УЛУЧШЕНИЕ КАЧЕСТВА: применяем предобработку для лучшего качества
	enhancedImg := h.enhanceCroppedImage(croppedImg)
	
	// Создаем уникальное имя с timestamp
	timestamp := time.Now().Format("20060102_150405")
	croppedFilename := fmt.Sprintf("cropped_%s_%dx%d_conf%.0f_%s", 
		timestamp, square.Width, square.Height, square.Confidence*100, filename)
	enhancedFilename := fmt.Sprintf("enhanced_%s_%dx%d_conf%.0f_%s", 
		timestamp, square.Width, square.Height, square.Confidence*100, filename)
	
	// Сохраняем в папку фронтенда для доступа через Next.js
	frontendUploadsDir := "../frontend/public/uploads"
	croppedPath := filepath.Join(frontendUploadsDir, croppedFilename)
	enhancedPath := filepath.Join(frontendUploadsDir, enhancedFilename)
	
	// Создаем директорию если не существует
	err := os.MkdirAll(frontendUploadsDir, 0755)
	if err != nil {
		return "", "", fmt.Errorf("failed to create frontend uploads dir: %w", err)
	}
	
	// Сохраняем обрезанное изображение
	err = imaging.Save(croppedImg, croppedPath)
	if err != nil {
		return "", "", fmt.Errorf("failed to save cropped image: %w", err)
	}
	
	// Сохраняем улучшенное изображение
	err = imaging.Save(enhancedImg, enhancedPath)
	if err != nil {
		return "", "", fmt.Errorf("failed to save enhanced image: %w", err)
	}
	
	log.Printf("[BlueSquare] Cropped square saved to: %s", croppedPath)
	log.Printf("[BlueSquare] Enhanced square saved to: %s", enhancedPath)
	
	// Возвращаем пути относительно public для фронтенда
	croppedPublicPath := filepath.Join("/uploads", croppedFilename)
	enhancedPublicPath := filepath.Join("/uploads", enhancedFilename)
	
	return croppedPublicPath, enhancedPublicPath, nil
}

// cropSquare обрезает изображение по найденному квадрату и улучшает его качество
func (h *BlueSquareHandler) cropSquare(img image.Image, square SquareInfo, filename string) (string, error) {
	// Создаем прямоугольник для обрезки
	rect := image.Rect(square.X, square.Y, square.X+square.Width, square.Y+square.Height)
	
	// Обрезаем изображение
	croppedImg := imaging.Crop(img, rect)
	
	// УЛУЧШЕНИЕ КАЧЕСТВА: применяем предобработку для лучшего качества
	enhancedImg := h.enhanceCroppedImage(croppedImg)
	
	// Создаем уникальное имя с timestamp
	timestamp := time.Now().Format("20060102_150405")
	croppedFilename := fmt.Sprintf("cropped_%s_%dx%d_conf%.0f_%s", 
		timestamp, square.Width, square.Height, square.Confidence*100, filename)
	
	// Сохраняем в папку фронтенда для доступа через Next.js
	frontendUploadsDir := "../frontend/public/uploads"
	croppedPath := filepath.Join(frontendUploadsDir, croppedFilename)
	
	// Создаем директорию если не существует
	err := os.MkdirAll(frontendUploadsDir, 0755)
	if err != nil {
		return "", fmt.Errorf("failed to create frontend uploads dir: %w", err)
	}
	
	// Сохраняем улучшенное обрезанное изображение
	err = imaging.Save(enhancedImg, croppedPath)
	if err != nil {
		return "", fmt.Errorf("failed to save enhanced cropped image: %w", err)
	}
	
	log.Printf("[BlueSquare] Enhanced cropped square saved to: %s", croppedPath)
	
	// Возвращаем путь относительно public для фронтенда
	return filepath.Join("/uploads", croppedFilename), nil
}

// enhanceCroppedImage применяет улучшения к обрезанному изображению квадрата
func (h *BlueSquareHandler) enhanceCroppedImage(croppedImg image.Image) image.Image {
	log.Printf("[BlueSquare] Enhancing cropped image quality with aggressive sharpening...")
	
	// 1) Увеличиваем контрастность еще более агрессивно
	enhanced := imaging.AdjustContrast(croppedImg, 70) // очень сильное повышение контраста
	
	// 2) Увеличиваем яркость для компенсации возможного затемнения
	enhanced = imaging.AdjustBrightness(enhanced, 20)
	
	// 3) Применяем умеренное повышение резкости (уменьшено)
	enhanced = imaging.Sharpen(enhanced, 1.2)
	
	// 4) Дополнительное усиление резкости через unsharp mask (уменьшено)
	enhanced = h.applyUnsharpMask(enhanced, 1.0, 0.6, 0.0)
	
	// 5) Увеличиваем масштаб для лучшего качества (2x)
	originalBounds := enhanced.Bounds()
	scaled := imaging.Resize(enhanced, originalBounds.Dx()*2, originalBounds.Dy()*2, imaging.Lanczos)
	
	// 6) Финальное усиление резкости на увеличенном изображении (уменьшено)
	scaled = imaging.Sharpen(scaled, 0.5)
	
	log.Printf("[BlueSquare] Image enhanced: contrast +70, brightness +20, moderate sharpening, unsharp mask, scaled 2x")
	return scaled
}

// advancedPreprocessing применяет продвинутую предобработку для лучшего распознавания цифр
func (h *BlueSquareHandler) advancedPreprocessing(img image.Image) image.Image {
	log.Printf("[BlueSquare] Starting advanced preprocessing pipeline...")
	
	// 1. Легкий шумодав/анти-джипег
	denoised := h.denoiseImage(img)
	
	// 2. Построение "канала цифр" (глушит фиолетовый фон)
	digitChannel := h.buildDigitChannel(denoised)
	
	// 3. Выравнивание фона (убирает градиенты и блики)
	flattened := h.BackgroundFlatten(digitChannel.(*image.Gray))
	
	// 4. Выравнивание локального контраста (CLAHE)
	claheEnhanced := h.applyCLAHE(flattened)
	
	// 4. Усиление резкости без шума
	sharpened := h.sharpenWithoutNoise(claheEnhanced)
	
	// 5. Простая бинаризация: все что не белое -> черное
	binarized := h.simpleBinarization(sharpened)
	
	// 6. Инвертируем в "черное на белом" перед OCR
	inverted := h.invertImage(binarized)
	
	log.Printf("[BlueSquare] Advanced preprocessing completed")
	return inverted
}

// PreprocessingSteps содержит пути к изображениям этапов предобработки
type PreprocessingSteps struct {
	Denoised     string `json:"denoised,omitempty"`
	DigitChannel string `json:"digitChannel,omitempty"`
	CLAHE        string `json:"clahe,omitempty"`
	Sharpened    string `json:"sharpened,omitempty"`
	Binarized    string `json:"binarized,omitempty"`
	Cleaned      string `json:"cleaned,omitempty"`
}

// advancedPreprocessingWithSteps применяет продвинутую предобработку с сохранением промежуточных этапов
func (h *BlueSquareHandler) advancedPreprocessingWithSteps(img image.Image, filename string) (image.Image, *PreprocessingSteps, error) {
	log.Printf("[BlueSquare] Starting advanced preprocessing pipeline with intermediate steps...")
	
	// Создаем уникальное имя с timestamp
	timestamp := time.Now().Format("20060102_150405")
	
	// Создаем структуру для хранения путей
	steps := &PreprocessingSteps{}
	
	// 1. Легкий шумодав/анти-джипег
	denoised := h.denoiseImage(img)
	denoisedPath, err := h.saveProcessingStepImage(denoised, "denoised", timestamp, filename)
	if err != nil {
		log.Printf("[BlueSquare] Failed to save denoised image: %v", err)
	} else {
		steps.Denoised = denoisedPath
		log.Printf("[BlueSquare] Saved denoised image: %s", denoisedPath)
	}
	
	// 2. Построение "канала цифр" (глушит фиолетовый фон)
	digitChannel := h.buildDigitChannel(denoised)
	digitChannelPath, err := h.saveProcessingStepImage(digitChannel, "digit_channel", timestamp, filename)
	if err != nil {
		log.Printf("[BlueSquare] Failed to save digit channel image: %v", err)
	} else {
		steps.DigitChannel = digitChannelPath
		log.Printf("[BlueSquare] Saved digit channel image: %s", digitChannelPath)
	}
	
	// 3. Выравнивание фона (убирает градиенты и блики)
	flattened := h.BackgroundFlatten(digitChannel.(*image.Gray))
	
	// 4. Выравнивание локального контраста (CLAHE)
	claheEnhanced := h.applyCLAHE(flattened)
	clahePath, err := h.saveProcessingStepImage(claheEnhanced, "clahe", timestamp, filename)
	if err != nil {
		log.Printf("[BlueSquare] Failed to save CLAHE image: %v", err)
	} else {
		steps.CLAHE = clahePath
		log.Printf("[BlueSquare] Saved CLAHE image: %s", clahePath)
	}
	
	// 4. Усиление резкости без шума
	sharpened := h.sharpenWithoutNoise(claheEnhanced)
	sharpenedPath, err := h.saveProcessingStepImage(sharpened, "sharpened", timestamp, filename)
	if err != nil {
		log.Printf("[BlueSquare] Failed to save sharpened image: %v", err)
	} else {
		steps.Sharpened = sharpenedPath
		log.Printf("[BlueSquare] Saved sharpened image: %s", sharpenedPath)
	}
	
	// 5. Простая бинаризация: все что не белое -> черное
	binarized := h.simpleBinarization(sharpened)
	binarizedPath, err := h.saveProcessingStepImage(binarized, "binarized", timestamp, filename)
	if err != nil {
		log.Printf("[BlueSquare] Failed to save binarized image: %v", err)
	} else {
		steps.Binarized = binarizedPath
		log.Printf("[BlueSquare] Saved binarized image: %s", binarizedPath)
	}
	
	// 6. Инвертируем в "черное на белом" перед OCR
	inverted := h.invertImage(binarized)
	cleanedPath, err := h.saveProcessingStepImage(inverted, "cleaned", timestamp, filename)
	if err != nil {
		log.Printf("[BlueSquare] Failed to save inverted image: %v", err)
	} else {
		steps.Cleaned = cleanedPath
		log.Printf("[BlueSquare] Saved inverted image: %s", cleanedPath)
	}
	
	log.Printf("[BlueSquare] Advanced preprocessing with steps completed")
	return inverted, steps, nil
}

// saveProcessingStepImage сохраняет изображение этапа предобработки
func (h *BlueSquareHandler) saveProcessingStepImage(img image.Image, stepName string, timestamp string, filename string) (string, error) {
	// Создаем имя файла
	stepFilename := fmt.Sprintf("preprocessing_%s_%s_%s", stepName, timestamp, filename)
	
	// Сохраняем в папку фронтенда для доступа через Next.js
	frontendUploadsDir := "../frontend/public/uploads"
	stepPath := filepath.Join(frontendUploadsDir, stepFilename)
	
	// Создаем файл
	file, err := os.Create(stepPath)
	if err != nil {
		return "", fmt.Errorf("failed to create file: %v", err)
	}
	defer file.Close()
	
	// Кодируем изображение
	err = png.Encode(file, img)
	if err != nil {
		return "", fmt.Errorf("failed to encode image: %v", err)
	}
	
	// Возвращаем путь относительно public для фронтенда
	return filepath.Join("/uploads", stepFilename), nil
}

// denoiseImage применяет легкий шумодав
func (h *BlueSquareHandler) denoiseImage(img image.Image) image.Image {
	// Применяем Gaussian blur для удаления шума (альтернатива median)
	denoised := imaging.Blur(img, 0.5)
	
	log.Printf("[BlueSquare] Applied Gaussian blur denoising")
	return denoised
}

// buildDigitChannel создает канал цифр, который глушит фиолетовый фон
func (h *BlueSquareHandler) buildDigitChannel(img image.Image) image.Image {
	bounds := img.Bounds()
	result := image.NewGray(bounds)
	
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			c := img.At(x, y)
			r, g, b, _ := c.RGBA()
			
			// Нормализуем значения
			rNorm := float64(r) / 65535.0
			gNorm := float64(g) / 65535.0
			bNorm := float64(b) / 65535.0
			
			// Вычисляем HSV компоненты
			hsv := h.rgbToHsv(rNorm, gNorm, bNorm)
			
			// Создаем канал цифр: I = V * (1 - 0.70·S)
			// Белые цифры имеют S≈0 → остаются яркими
			// Фиолетовый фон насыщенный → темнеет
			digitValue := hsv.V * (1.0 - 0.70*hsv.S)
			
			// Ограничиваем значения
			if digitValue > 1.0 {
				digitValue = 1.0
			}
			if digitValue < 0.0 {
				digitValue = 0.0
			}
			
			result.SetGray(x, y, color.Gray{Y: uint8(digitValue * 255)})
		}
	}
	
	log.Printf("[BlueSquare] Built digit channel (I = V*(1-0.70*S), suppresses purple background)")
	return result
}

// BoxBlur1D: быстрый 1D-бокс по строкам/столбцам (радиус r)
func (h *BlueSquareHandler) BoxBlur1D(pix []float64, w, height, r int, horizontal bool) {
    if r <= 0 { return }
    n := 2*r + 1
    if horizontal {
        for y := 0; y < height; y++ {
            sum := 0.0
            // префиксная сумма «скользящего окна»
            for x := -r; x <= r; x++ {
                xi := x; if xi < 0 { xi = 0 }; if xi >= w { xi = w-1 }
                sum += pix[y*w+xi]
            }
            for x := 0; x < w; x++ {
                pix[y*w+x] = sum / float64(n)
                xl := x - r; if xl < 0 { xl = 0 }
                xr := x + r + 1; if xr >= w { xr = w-1 }
                sum += pix[y*w+xr] - pix[y*w+xl]
            }
        }
    } else {
        for x := 0; x < w; x++ {
            sum := 0.0
            for y := -r; y <= r; y++ {
                yi := y; if yi < 0 { yi = 0 }; if yi >= height { yi = height-1 }
                sum += pix[yi*w+x]
            }
            for y := 0; y < height; y++ {
                pix[y*w+x] = sum / float64(n)
                yt := y - r; if yt < 0 { yt = 0 }
                yb := y + r + 1; if yb >= height { yb = height-1 }
                sum += pix[yb*w+x] - pix[yt*w+x]
            }
        }
    }
}

// BackgroundFlatten: I -> J = I - 0.85*Bg + 0.15*mean(I)
func (h *BlueSquareHandler) BackgroundFlatten(gray *image.Gray) *image.Gray {
    b := gray.Bounds()
    w, height := b.Dx(), b.Dy()
    buf := make([]float64, w*height)
    sum := 0.0
    for y := 0; y < height; y++ {
        for x := 0; x < w; x++ {
            v := float64(gray.GrayAt(b.Min.X+x, b.Min.Y+y).Y)
            buf[y*w+x] = v; sum += v
        }
    }
    mean := sum / float64(w*height)
    // box-blur радиус ~ 10 (≈ σ 7)
    h.BoxBlur1D(buf, w, height, 10, true)
    h.BoxBlur1D(buf, w, height, 10, false)

    out := image.NewGray(b)
    for y := 0; y < height; y++ {
        for x := 0; x < w; x++ {
            v := float64(gray.GrayAt(b.Min.X+x, b.Min.Y+y).Y)
            j := v - 0.85*buf[y*w+x] + 0.15*mean
            if j < 0 { j = 0 }; if j > 255 { j = 255 }
            out.SetGray(b.Min.X+x, b.Min.Y+y, color.Gray{Y: uint8(j + 0.5)})
        }
    }
    return out
}

// HSV структура для работы с цветовым пространством
type HSV struct {
	H, S, V float64
}

// rgbToHsv конвертирует RGB в HSV
func (h *BlueSquareHandler) rgbToHsv(r, g, b float64) HSV {
	max := math.Max(math.Max(r, g), b)
	min := math.Min(math.Min(r, g), b)
	delta := max - min
	
	// Value
	v := max
	
	// Saturation
	var s float64
	if max != 0 {
		s = delta / max
	}
	
	// Hue
	var hue float64
	if delta == 0 {
		hue = 0
	} else {
		switch max {
		case r:
			hue = (g - b) / delta
			if g < b {
				hue += 6
			}
		case g:
			hue = (b-r)/delta + 2
		case b:
			hue = (r-g)/delta + 4
		}
		hue /= 6
	}
	
	return HSV{H: hue, S: s, V: v}
}

// applyCLAHE применяет Contrast Limited Adaptive Histogram Equalization
func (h *BlueSquareHandler) applyCLAHE(img image.Image) image.Image {
	bounds := img.Bounds()
	result := image.NewGray(bounds)
	
	// Параметры CLAHE - увеличенные тайлы для ROI 494x494
	gridSize := 6 // 6x6 тайлы (≈82px каждый для ROI 494x494)
	clipLimit := 2.5
	
	// Размер тайла
	tileWidth := bounds.Dx() / gridSize
	tileHeight := bounds.Dy() / gridSize
	
	// Обрабатываем каждый тайл
	for tileY := 0; tileY < gridSize; tileY++ {
		for tileX := 0; tileX < gridSize; tileX++ {
			// Границы тайла
			startX := bounds.Min.X + tileX*tileWidth
			endX := startX + tileWidth
			if tileX == gridSize-1 {
				endX = bounds.Max.X
			}
			
			startY := bounds.Min.Y + tileY*tileHeight
			endY := startY + tileHeight
			if tileY == gridSize-1 {
				endY = bounds.Max.Y
			}
			
			// Строим гистограмму для тайла
			histogram := make([]int, 256)
			for y := startY; y < endY; y++ {
				for x := startX; x < endX; x++ {
					gray := color.GrayModel.Convert(img.At(x, y)).(color.Gray)
					histogram[gray.Y]++
				}
			}
			
			// Ограничиваем гистограмму
			totalPixels := (endX - startX) * (endY - startY)
			clipThreshold := int(float64(totalPixels) * clipLimit / 256.0)
			
			excess := 0
			for i := 0; i < 256; i++ {
				if histogram[i] > clipThreshold {
					excess += histogram[i] - clipThreshold
					histogram[i] = clipThreshold
				}
			}
			
			// Распределяем избыток
			if excess > 0 {
				redistribute := excess / 256
				for i := 0; i < 256; i++ {
					histogram[i] += redistribute
				}
			}
			
			// Строим CDF (Cumulative Distribution Function)
			cdf := make([]int, 256)
			cdf[0] = histogram[0]
			for i := 1; i < 256; i++ {
				cdf[i] = cdf[i-1] + histogram[i]
			}
			
			// Применяем CLAHE к пикселям тайла
			for y := startY; y < endY; y++ {
				for x := startX; x < endX; x++ {
					gray := color.GrayModel.Convert(img.At(x, y)).(color.Gray)
					
					// Нормализуем CDF
					var newValue uint8
					if cdf[255] > 0 {
						newValue = uint8(float64(cdf[gray.Y]) * 255.0 / float64(cdf[255]))
					}
					
					result.SetGray(x, y, color.Gray{Y: newValue})
				}
			}
		}
	}
	
	log.Printf("[BlueSquare] Applied CLAHE (6x6 grid, clipLimit=2.5)")
	return result
}

// sharpenWithoutNoise усиливает резкость без шума
func (h *BlueSquareHandler) sharpenWithoutNoise(img image.Image) image.Image {
	// Применяем unsharp mask с Gaussian blur - обновленные параметры
	// σ≈1.0 px, amount=1.1, threshold=2
	sharpened := h.applyUnsharpMask(img, 1.1, 1.0, 2.0)
	
	log.Printf("[BlueSquare] Applied unsharp mask (σ=1.0, amount=1.1, threshold=2)")
	return sharpened
}

// simpleBinarization простая бинаризация с диагональным изменением порога
func (h *BlueSquareHandler) simpleBinarization(img image.Image) image.Image {
	bounds := img.Bounds()
	result := image.NewGray(bounds)
	
	width := bounds.Dx()
	height := bounds.Dy()
	
	// Диагональное изменение порога: верхний левый (120) -> правый нижний (164)
	minThreshold := uint8(120)  // верхний левый угол - больше черного
	maxThreshold := uint8(164)  // правый нижний угол - как было
	
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			// Вычисляем диагональное расстояние (0.0 в верхнем левом, 1.0 в правом нижнем)
			diagProgress := (float64(x-bounds.Min.X) + float64(y-bounds.Min.Y)) / float64(width+height-2)
			if diagProgress > 1.0 {
				diagProgress = 1.0
			}
			
			// Интерполируем порог
			threshold := uint8(float64(minThreshold) + diagProgress*float64(maxThreshold-minThreshold))
			
			gray := color.GrayModel.Convert(img.At(x, y)).(color.Gray)
			
			if gray.Y >= threshold {
				result.SetGray(x, y, color.Gray{Y: 255}) // белый
			} else {
				result.SetGray(x, y, color.Gray{Y: 0}) // черный
			}
		}
	}
	
	log.Printf("[BlueSquare] Applied diagonal binarization (threshold: %d -> %d)", minThreshold, maxThreshold)
	return result
}

// AdaptiveSauvola binarizes a grayscale image with Sauvola thresholding.
// win must be odd (21..25 good for your ROI), k≈0.28, R=128 for 8-bit.
func (h *BlueSquareHandler) AdaptiveSauvola(gray *image.Gray, win int, k float64, R float64) *image.Gray {
    b := gray.Bounds()
    w, height := b.Dx(), b.Dy()
    // integral sums of I and I^2
    S := make([]int64, (w+1)*(height+1))
    S2 := make([]int64, (w+1)*(height+1))
    at := func(x, y int) uint8 { return gray.GrayAt(b.Min.X+x, b.Min.Y+y).Y }
    idx := func(x, y int) int { return y*(w+1) + x }

    for y := 1; y <= height; y++ {
        var rs, rs2 int64
        for x := 1; x <= w; x++ {
            v := int64(at(x-1, y-1))
            rs += v
            rs2 += v * v
            S[idx(x,y)]  = S[idx(x,y-1)]  + rs
            S2[idx(x,y)] = S2[idx(x,y-1)] + rs2
        }
    }

    out := image.NewGray(b)
    r := win/2
    for y := 0; y < height; y++ {
        y0 := max(0, y-r); y1 := min(height-1, y+r)
        for x := 0; x < w; x++ {
            x0 := max(0, x-r); x1 := min(w-1, x+r)
            A := (x1-x0+1)*(y1-y0+1)

            // sums via SAT
            x0i, y0i, x1i, y1i := x0, y0, x1+1, y1+1
            sum  := S[idx(x1i,y1i)] - S[idx(x0i,y1i)] - S[idx(x1i,y0i)] + S[idx(x0i,y0i)]
            sum2 := S2[idx(x1i,y1i)] - S2[idx(x0i,y1i)] - S2[idx(x1i,y0i)] + S2[idx(x0i,y0i)]

            m := float64(sum) / float64(A)
            var_ := float64(sum2)/float64(A) - m*m
            if var_ < 0 { var_ = 0 }
            s := math.Sqrt(var_)
            T := m * (1.0 + k*((s/R)-1.0)) // Sauvola threshold

            pv := float64(at(x,y))
            if pv >= T { out.SetGray(b.Min.X+x, b.Min.Y+y, color.Gray{255}) } else {
                out.SetGray(b.Min.X+x, b.Min.Y+y, color.Gray{0})
            }
        }
    }
    return out
}

// adaptiveBinarization применяет адаптивную бинаризацию с оптимизированным Sauvola
func (h *BlueSquareHandler) adaptiveBinarization(img image.Image) image.Image {
	// Конвертируем в grayscale если нужно
	var gray *image.Gray
	if g, ok := img.(*image.Gray); ok {
		gray = g
	} else {
		bounds := img.Bounds()
		gray = image.NewGray(bounds)
		for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
			for x := bounds.Min.X; x < bounds.Max.X; x++ {
				gray.Set(x, y, color.GrayModel.Convert(img.At(x, y)))
			}
		}
	}
	
	// Применяем оптимизированный Sauvola: окно 23px, k=0.28, R=128
	result := h.AdaptiveSauvola(gray, 23, 0.28, 128.0)
	
	log.Printf("[BlueSquare] Applied optimized Sauvola binarization (window=23, k=0.28, R=128)")
	return result
}

// cleanAndRemoveGrid очищает изображение и удаляет сетку
func (h *BlueSquareHandler) cleanAndRemoveGrid(img image.Image) image.Image {
	// 1. Удаляем одиночные точки: opening 3x3
	opened := h.morphologicalOpening(img, 3)
	
	// 2. Закрываем разрывы штрихов: closing 3x3
	closed := h.morphologicalClosing(opened, 3)
	
	// 3. Удаляем рамки плиток через white top-hat с круглым SE r=2-3
	cleaned := h.removeGridWithTopHat(closed, 2)
	
	// 4. Удаляем тонкие линии сетки через направленные opening
	thinGridRemoved := h.RemoveThinGrid(cleaned)
	
	// 5. Инвертируем в "черное на белом" перед OCR
	inverted := h.invertImage(thinGridRemoved)
	
	log.Printf("[BlueSquare] Applied morphological cleaning (opening 3x3, closing 3x3, top-hat r=2, thin grid removal, inverted)")
	return inverted
}

// morphologicalOpening применяет морфологическое открытие с квадратным ядром
func (h *BlueSquareHandler) morphologicalOpening(img image.Image, size int) image.Image {
	bounds := img.Bounds()
	result := image.NewGray(bounds)
	
	// Создаем квадратное ядро
	kernelSize := size
	halfSize := kernelSize / 2
	
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			// Erosion (сужение)
			minVal := uint8(255)
			for ky := -halfSize; ky <= halfSize; ky++ {
				for kx := -halfSize; kx <= halfSize; kx++ {
					nx, ny := x+kx, y+ky
					if nx >= bounds.Min.X && nx < bounds.Max.X && ny >= bounds.Min.Y && ny < bounds.Max.Y {
						gray := color.GrayModel.Convert(img.At(nx, ny)).(color.Gray)
						if gray.Y < minVal {
							minVal = gray.Y
						}
					}
				}
			}
			
			// Dilation (расширение) на результате erosion
			maxVal := uint8(0)
			for ky := -halfSize; ky <= halfSize; ky++ {
				for kx := -halfSize; kx <= halfSize; kx++ {
					nx, ny := x+kx, y+ky
					if nx >= bounds.Min.X && nx < bounds.Max.X && ny >= bounds.Min.Y && ny < bounds.Max.Y {
						if minVal > maxVal {
							maxVal = minVal
						}
					}
				}
			}
			
			result.SetGray(x, y, color.Gray{Y: maxVal})
		}
	}
	
	return result
}

// morphologicalClosing применяет морфологическое закрытие с квадратным ядром
func (h *BlueSquareHandler) morphologicalClosing(img image.Image, size int) image.Image {
	bounds := img.Bounds()
	result := image.NewGray(bounds)
	
	// Создаем квадратное ядро
	kernelSize := size
	halfSize := kernelSize / 2
	
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			// Dilation (расширение)
			maxVal := uint8(0)
			for ky := -halfSize; ky <= halfSize; ky++ {
				for kx := -halfSize; kx <= halfSize; kx++ {
					nx, ny := x+kx, y+ky
					if nx >= bounds.Min.X && nx < bounds.Max.X && ny >= bounds.Min.Y && ny < bounds.Max.Y {
						gray := color.GrayModel.Convert(img.At(nx, ny)).(color.Gray)
						if gray.Y > maxVal {
							maxVal = gray.Y
						}
					}
				}
			}
			
			// Erosion (сужение) на результате dilation
			minVal := uint8(255)
			for ky := -halfSize; ky <= halfSize; ky++ {
				for kx := -halfSize; kx <= halfSize; kx++ {
					nx, ny := x+kx, y+ky
					if nx >= bounds.Min.X && nx < bounds.Max.X && ny >= bounds.Min.Y && ny < bounds.Max.Y {
						if maxVal < minVal {
							minVal = maxVal
						}
					}
				}
			}
			
			result.SetGray(x, y, color.Gray{Y: minVal})
		}
	}
	
	return result
}

// removeGridWithTopHat удаляет рамки плиток через white top-hat с круглым SE
func (h *BlueSquareHandler) removeGridWithTopHat(img image.Image, radius int) image.Image {
	bounds := img.Bounds()
	result := image.NewGray(bounds)
	
	// Создаем круглый структурный элемент
	se := h.createCircularSE(float64(radius))
	
	// Применяем opening с круглым SE
	opened := h.morphologicalOpeningWithCircularSE(img, se)
	
	// White top-hat: img - opening(img)
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			original := color.GrayModel.Convert(img.At(x, y)).(color.Gray)
			openedPixel := color.GrayModel.Convert(opened.At(x, y)).(color.Gray)
			
			// Вычитаем результат открытия (white top-hat)
			topHat := int(original.Y) - int(openedPixel.Y)
			if topHat < 0 {
				topHat = 0
			}
			
			// Вычитаем top-hat из оригинального изображения
			final := int(original.Y) - topHat
			if final < 0 {
				final = 0
			}
			
			result.SetGray(x, y, color.Gray{Y: uint8(final)})
		}
	}
	
	return result
}

// invertImage инвертирует изображение (черное на белом)
func (h *BlueSquareHandler) invertImage(img image.Image) image.Image {
	bounds := img.Bounds()
	result := image.NewGray(bounds)
	
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			gray := color.GrayModel.Convert(img.At(x, y)).(color.Gray)
			// Инвертируем: 255 - gray.Y
			inverted := 255 - gray.Y
			result.SetGray(x, y, color.Gray{Y: inverted})
		}
	}
	
	return result
}

// RemoveThinGrid удаляет тонкие линии сетки через направленные opening
func (h *BlueSquareHandler) RemoveThinGrid(img image.Image) image.Image {
	bounds := img.Bounds()
	result := image.NewGray(bounds)
	
	// Создаем копию для работы
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			gray := color.GrayModel.Convert(img.At(x, y)).(color.Gray)
			result.SetGray(x, y, gray)
		}
	}
	
	// Направленное opening ядром 1x5 (горизонтальные линии)
	horizontalOpened := h.directionalOpening(result, 1, 5)
	
	// Направленное opening ядром 5x1 (вертикальные линии)
	verticalOpened := h.directionalOpening(result, 5, 1)
	
	// Объединяем результаты (минимум из двух)
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			hGray := color.GrayModel.Convert(horizontalOpened.At(x, y)).(color.Gray)
			vGray := color.GrayModel.Convert(verticalOpened.At(x, y)).(color.Gray)
			
			// Берем минимум (более консервативное удаление)
			minVal := hGray.Y
			if vGray.Y < minVal {
				minVal = vGray.Y
			}
			
			result.SetGray(x, y, color.Gray{Y: minVal})
		}
	}
	
	// Вычитаем результат из оригинального изображения
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			original := color.GrayModel.Convert(img.At(x, y)).(color.Gray)
			opened := color.GrayModel.Convert(result.At(x, y)).(color.Gray)
			
			// Вычитаем тонкие линии
			diff := int(original.Y) - int(opened.Y)
			if diff < 0 {
				diff = 0
			}
			
			result.SetGray(x, y, color.Gray{Y: uint8(diff)})
		}
	}
	
	return result
}

// directionalOpening применяет направленное opening с заданными размерами ядра
func (h *BlueSquareHandler) directionalOpening(img image.Image, kernelWidth, kernelHeight int) image.Image {
	bounds := img.Bounds()
	result := image.NewGray(bounds)
	
	halfW := kernelWidth / 2
	halfH := kernelHeight / 2
	
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			// Erosion
			minVal := uint8(255)
			for ky := -halfH; ky <= halfH; ky++ {
				for kx := -halfW; kx <= halfW; kx++ {
					nx, ny := x+kx, y+ky
					if nx >= bounds.Min.X && nx < bounds.Max.X && ny >= bounds.Min.Y && ny < bounds.Max.Y {
						gray := color.GrayModel.Convert(img.At(nx, ny)).(color.Gray)
						if gray.Y < minVal {
							minVal = gray.Y
						}
					}
				}
			}
			
			// Dilation на результате erosion
			maxVal := uint8(0)
			for ky := -halfH; ky <= halfH; ky++ {
				for kx := -halfW; kx <= halfW; kx++ {
					nx, ny := x+kx, y+ky
					if nx >= bounds.Min.X && nx < bounds.Max.X && ny >= bounds.Min.Y && ny < bounds.Max.Y {
						if minVal > maxVal {
							maxVal = minVal
						}
					}
				}
			}
			
			result.SetGray(x, y, color.Gray{Y: maxVal})
		}
	}
	
	return result
}

// removeTopHat применяет морфологический top-hat для удаления рамочек
func (h *BlueSquareHandler) removeTopHat(img image.Image, radius float64) image.Image {
	bounds := img.Bounds()
	result := image.NewGray(bounds)
	
	// Создаем круглый структурный элемент
	se := h.createCircularSE(radius)
	
	// Применяем top-hat (white): img - opening(img)
	opened := h.morphologicalOpeningWithSE(img, se)
	
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			original := color.GrayModel.Convert(img.At(x, y)).(color.Gray)
			openedPixel := color.GrayModel.Convert(opened.At(x, y)).(color.Gray)
			
			// Вычитаем результат открытия
			topHat := int(original.Y) - int(openedPixel.Y)
			if topHat < 0 {
				topHat = 0
			}
			
			result.SetGray(x, y, color.Gray{Y: uint8(topHat)})
		}
	}
	
	return result
}

// createCircularSE создает круглый структурный элемент
func (h *BlueSquareHandler) createCircularSE(radius float64) [][]bool {
	size := int(radius*2 + 1)
	se := make([][]bool, size)
	
	for i := range se {
		se[i] = make([]bool, size)
	}
	
	center := float64(size) / 2
	for y := 0; y < size; y++ {
		for x := 0; x < size; x++ {
			dx := float64(x) - center
			dy := float64(y) - center
			distance := math.Sqrt(dx*dx + dy*dy)
			se[y][x] = distance <= radius
		}
	}
	
	return se
}

// morphologicalOpeningWithCircularSE применяет морфологическое открытие с круглым SE
func (h *BlueSquareHandler) morphologicalOpeningWithCircularSE(img image.Image, se [][]bool) image.Image {
	bounds := img.Bounds()
	result := image.NewGray(bounds)
	
	seSize := len(se)
	halfSize := seSize / 2
	
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			// Erosion с круглым SE
			minVal := uint8(255)
			for sy := 0; sy < seSize; sy++ {
				for sx := 0; sx < seSize; sx++ {
					if se[sy][sx] {
						nx, ny := x+sx-halfSize, y+sy-halfSize
						if nx >= bounds.Min.X && nx < bounds.Max.X && ny >= bounds.Min.Y && ny < bounds.Max.Y {
							gray := color.GrayModel.Convert(img.At(nx, ny)).(color.Gray)
							if gray.Y < minVal {
								minVal = gray.Y
							}
						}
					}
				}
			}
			
			// Dilation на результате erosion
			maxVal := uint8(0)
			for sy := 0; sy < seSize; sy++ {
				for sx := 0; sx < seSize; sx++ {
					if se[sy][sx] {
						nx, ny := x+sx-halfSize, y+sy-halfSize
						if nx >= bounds.Min.X && nx < bounds.Max.X && ny >= bounds.Min.Y && ny < bounds.Max.Y {
							if minVal > maxVal {
								maxVal = minVal
							}
						}
					}
				}
			}
			
			result.SetGray(x, y, color.Gray{Y: maxVal})
		}
	}
	
	return result
}

// morphologicalOpeningWithSE применяет морфологическое открытие с заданным структурным элементом
func (h *BlueSquareHandler) morphologicalOpeningWithSE(img image.Image, se [][]bool) image.Image {
	// Упрощенная версия - используем стандартные функции imaging
	return h.morphologicalOpening(img, len(se)/2)
}



// applyUnsharpMask применяет unsharp mask для дополнительного усиления резкости
func (h *BlueSquareHandler) applyUnsharpMask(img image.Image, amount, radius, threshold float64) *image.NRGBA {
	bounds := img.Bounds()
	result := image.NewNRGBA(bounds)
	
	// Создаем размытую версию изображения
	blurred := imaging.Blur(img, radius)
	
	// Применяем unsharp mask
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			original := img.At(x, y)
			blurredPixel := blurred.At(x, y)
			
			// Вычисляем разность
			diff := h.subtractColors(original, blurredPixel)
			
			// Применяем порог
			if h.getLuminance(diff) > threshold {
				// Усиливаем резкость
				sharpened := h.addColors(original, h.multiplyColor(diff, amount))
				result.Set(x, y, sharpened)
			} else {
				result.Set(x, y, original)
			}
		}
	}
	
	return result
}

// subtractColors вычитает один цвет из другого
func (h *BlueSquareHandler) subtractColors(c1, c2 color.Color) color.Color {
	r1, g1, b1, a1 := c1.RGBA()
	r2, g2, b2, a2 := c2.RGBA()
	
	// Нормализуем значения
	r := uint8((r1 - r2) >> 8)
	g := uint8((g1 - g2) >> 8)
	b := uint8((b1 - b2) >> 8)
	a := uint8((a1 - a2) >> 8)
	
	return color.RGBA{r, g, b, a}
}

// addColors складывает два цвета
func (h *BlueSquareHandler) addColors(c1, c2 color.Color) color.Color {
	r1, g1, b1, a1 := c1.RGBA()
	r2, g2, b2, a2 := c2.RGBA()
	
	// Нормализуем и ограничиваем значения
	r := uint8(min(255, int((r1+r2)>>8)))
	g := uint8(min(255, int((g1+g2)>>8)))
	b := uint8(min(255, int((b1+b2)>>8)))
	a := uint8(min(255, int((a1+a2)>>8)))
	
	return color.RGBA{r, g, b, a}
}

// multiplyColor умножает цвет на коэффициент
func (h *BlueSquareHandler) multiplyColor(c color.Color, factor float64) color.Color {
	r, g, b, a := c.RGBA()
	
	// Нормализуем значения
	rNorm := float64(r >> 8)
	gNorm := float64(g >> 8)
	bNorm := float64(b >> 8)
	aNorm := float64(a >> 8)
	
	// Применяем коэффициент и ограничиваем
	rNew := uint8(min(255, int(rNorm*factor)))
	gNew := uint8(min(255, int(gNorm*factor)))
	bNew := uint8(min(255, int(bNorm*factor)))
	aNew := uint8(min(255, int(aNorm*factor)))
	
	return color.RGBA{rNew, gNew, bNew, aNew}
}

// getLuminance вычисляет яркость цвета
func (h *BlueSquareHandler) getLuminance(c color.Color) float64 {
	r, g, b, _ := c.RGBA()
	
	// Нормализуем значения
	rNorm := float64(r) / 65535.0
	gNorm := float64(g) / 65535.0
	bNorm := float64(b) / 65535.0
	
	// Вычисляем яркость по стандартной формуле
	return 0.299*rNorm + 0.587*gNorm + 0.114*bNorm
}

// Используем imaging.Sharpen для повышения резкости

// clamp ограничивает значение в заданном диапазоне (используем из ocr.go)




// expandRectAroundSquare расширяет прямоугольник вокруг квадрата в пределах границ
func (h *BlueSquareHandler) expandRectAroundSquare(s SquareInfo, bounds image.Rectangle, factor float64) image.Rectangle {
	if factor <= 1.0 { factor = 1.2 }
	rect := image.Rect(s.X, s.Y, s.X+s.Width, s.Y+s.Height)
	cx := rect.Min.X + rect.Dx()/2
	cy := rect.Min.Y + rect.Dy()/2
	newW := int(math.Round(float64(rect.Dx()) * factor))
	newH := int(math.Round(float64(rect.Dy()) * factor))
	minX := cx - newW/2
	minY := cy - newH/2
	maxX := minX + newW
	maxY := minY + newH
	// clip to bounds
	if minX < bounds.Min.X { minX = bounds.Min.X }
	if minY < bounds.Min.Y { minY = bounds.Min.Y }
	if maxX > bounds.Max.X { maxX = bounds.Max.X }
	if maxY > bounds.Max.Y { maxY = bounds.Max.Y }
	// ensure at least 2x2
	if maxX <= minX { maxX = minX + 2 }
	if maxY <= minY { maxY = minY + 2 }
	return image.Rect(minX, minY, maxX, maxY)
}

// analyzeHueCenterHSV строит гистограмму Hue на подсэмплированном кадре и возвращает центр тона в диапазоне [0,360)
func (h *BlueSquareHandler) analyzeHueCenterHSV(img image.Image) float64 {
	b := img.Bounds()
	step := max(1, b.Dx()/120)
	// 360 бинов для точности
	hist := make([]int, 360)

	for y := b.Min.Y; y < b.Max.Y; y += step {
		for x := b.Min.X; x < b.Max.X; x += step {
			c := color.RGBAModel.Convert(img.At(x, y)).(color.RGBA)
			h, s, v := rgbToHSV(c)
			// Учитываем только насыщенные и достаточно яркие пиксели
			if s > 0.25 && v >= 0.25 && v <= 0.95 {
				idx := int(math.Round(h)) % 360
				if idx < 0 { idx += 360 }
				hist[idx]++
			}
		}
	}

	// Фокусируемся на диапазоне 210..300°, но позволяем сдвиг центра в его пределах
	bestIdx := 0
	bestVal := -1
	for i := 210; i <= 300; i++ {
		if hist[i] > bestVal {
			bestVal = hist[i]
			bestIdx = i
		}
	}
	return float64(bestIdx)
}

// createHSVMask создает бинарную маску по HSV вокруг адаптивного центра тона
func (h *BlueSquareHandler) createHSVMask(img image.Image, centerHue float64) image.Image {
	b := img.Bounds()
	mask := image.NewRGBA(b)

	// Окно тона: ±28°, но ограничено 210..300°
	half := 28.0
	minHue := centerHue - half
	maxHue := centerHue + half
	if minHue < 210 { minHue = 210 }
	if maxHue > 300 { maxHue = 300 }

	for y := b.Min.Y; y < b.Max.Y; y++ {
		for x := b.Min.X; x < b.Max.X; x++ {
			c := color.RGBAModel.Convert(img.At(x, y)).(color.RGBA)
			h, s, v := rgbToHSV(c)
			inHue := h >= minHue && h <= maxHue
			if inHue && s > 0.20 && v >= 0.20 && v <= 0.98 {
				mask.Set(x, y, color.RGBA{255, 255, 255, 255})
			} else {
				mask.Set(x, y, color.RGBA{0, 0, 0, 255})
			}
		}
	}
	return mask
}

// morphClose выполняет морфологическое закрытие (dilate -> erode) квадратным ядром радиуса r
func (h *BlueSquareHandler) morphClose(mask image.Image, r int) image.Image {
	b := mask.Bounds()
	r = max(1, r)
	// Dilation
	dil := image.NewRGBA(b)
	for y := b.Min.Y; y < b.Max.Y; y++ {
		for x := b.Min.X; x < b.Max.X; x++ {
			white := false
			for dy := -r; dy <= r && !white; dy++ {
				yn := y + dy
				if yn < b.Min.Y || yn >= b.Max.Y { continue }
				for dx := -r; dx <= r; dx++ {
					xn := x + dx
					if xn < b.Min.X || xn >= b.Max.X { continue }
					g := color.GrayModel.Convert(mask.At(xn, yn)).(color.Gray)
					if g.Y >= 128 { white = true; break }
				}
			}
			if white { dil.Set(x, y, color.White) } else { dil.Set(x, y, color.Black) }
		}
	}
	// Erosion
	out := image.NewRGBA(b)
	for y := b.Min.Y; y < b.Max.Y; y++ {
		for x := b.Min.X; x < b.Max.X; x++ {
			allWhite := true
			for dy := -r; dy <= r && allWhite; dy++ {
				yn := y + dy
				if yn < b.Min.Y || yn >= b.Max.Y { allWhite = false; break }
				for dx := -r; dx <= r; dx++ {
					xn := x + dx
					if xn < b.Min.X || xn >= b.Max.X { allWhite = false; break }
					g := color.GrayModel.Convert(dil.At(xn, yn)).(color.Gray)
					if g.Y < 128 { allWhite = false; break }
				}
			}
			if allWhite { out.Set(x, y, color.White) } else { out.Set(x, y, color.Black) }
		}
	}
	return out
}

// простая эрозия квадратным ядром
func (h *BlueSquareHandler) morphErodeSimple(mask image.Image, r int) image.Image {
	b := mask.Bounds()
	r = max(1, r)
	out := image.NewRGBA(b)
	for y := b.Min.Y; y < b.Max.Y; y++ {
		for x := b.Min.X; x < b.Max.X; x++ {
			allWhite := true
			for dy := -r; dy <= r && allWhite; dy++ {
				yy := y + dy
				if yy < b.Min.Y || yy >= b.Max.Y { allWhite = false; break }
				for dx := -r; dx <= r; dx++ {
					xx := x + dx
					if xx < b.Min.X || xx >= b.Max.X { allWhite = false; break }
					if color.GrayModel.Convert(mask.At(xx, yy)).(color.Gray).Y < 128 { allWhite = false; break }
				}
			}
			if allWhite { out.Set(x, y, color.White) } else { out.Set(x, y, color.Black) }
		}
	}
	return out
}

// tightenToMaskInner сдвигает прямоугольник к внутренней кромке маски так,
// чтобы для каждой стороны найти первую колонку/строку, где >= pct пикселей внутри маски
func (h *BlueSquareHandler) tightenToMaskInner(mask image.Image, r image.Rectangle, pct float64) image.Rectangle {
	b := mask.Bounds()
	isIn := func(x, y int) bool {
		if !image.Pt(x, y).In(b) { return false }
		return color.GrayModel.Convert(mask.At(x, y)).(color.Gray).Y >= 128
	}
	// LEFT → вправо
	for x := r.Min.X; x < r.Max.X; x++ {
		cnt, in := 0, 0
		for y := r.Min.Y; y < r.Max.Y; y++ { cnt++; if isIn(x, y) { in++ } }
		if cnt > 0 && float64(in)/float64(cnt) >= pct { r.Min.X = x; break }
	}
	// RIGHT → влево
	for x := r.Max.X - 1; x >= r.Min.X; x-- {
		cnt, in := 0, 0
		for y := r.Min.Y; y < r.Max.Y; y++ { cnt++; if isIn(x, y) { in++ } }
		if cnt > 0 && float64(in)/float64(cnt) >= pct { r.Max.X = x + 1; break }
	}
	// TOP → вниз
	for y := r.Min.Y; y < r.Max.Y; y++ {
		cnt, in := 0, 0
		for x := r.Min.X; x < r.Max.X; x++ { cnt++; if isIn(x, y) { in++ } }
		if cnt > 0 && float64(in)/float64(cnt) >= pct { r.Min.Y = y; break }
	}
	// BOTTOM → вверх
	for y := r.Max.Y - 1; y >= r.Min.Y; y-- {
		cnt, in := 0, 0
		for x := r.Min.X; x < r.Max.X; x++ { cnt++; if isIn(x, y) { in++ } }
		if cnt > 0 && float64(in)/float64(cnt) >= pct { r.Max.Y = y + 1; break }
	}
	return r
}

// passesCandidateConstraints применяет ограничения к кандидату на уменьшенном кадре
func (h *BlueSquareHandler) passesCandidateConstraints(rect image.Rectangle, bounds image.Rectangle) bool {
	area := float64(rect.Dx()*rect.Dy()) / float64(max(1, bounds.Dx()*bounds.Dy()))
	if area < 0.006 { // >=0.6% кадра
		return false
	}
	ratio := float64(rect.Dx()) / float64(max(1, rect.Dy()))
	if ratio < 0.85 || ratio > 1.15 {
		return false
	}
	// Центр ближе к центру кадра (в пределах 45% шир/выс)
	cx := rect.Min.X + rect.Dx()/2
	cy := rect.Min.Y + rect.Dy()/2
	fx := bounds.Min.X + bounds.Dx()/2
	fy := bounds.Min.Y + bounds.Dy()/2
	maxDx := 0.45 * float64(bounds.Dx())
	maxDy := 0.45 * float64(bounds.Dy())
	if math.Abs(float64(cx-fx)) > maxDx { return false }
	if math.Abs(float64(cy-fy)) > maxDy { return false }
	return true
}

// refineEdgesByMask уточняет границы, считая контраст только вдоль границы маски
func (h *BlueSquareHandler) refineEdgesByMask(img image.Image, mask image.Image, rect image.Rectangle, radius int) image.Rectangle {
	b := img.Bounds()
	if radius < 1 { radius = 1 }

	// helper to test mask white
	isWhite := func(x, y int) bool {
		g := color.GrayModel.Convert(mask.At(x, y)).(color.Gray)
		return g.Y >= 128
	}

	// LEFT (внутрь справа, снаружи слева)
	bestLeft := rect.Min.X
	bestLeftScore := -1.0
	for x := max(b.Min.X, rect.Min.X-radius); x <= min(b.Max.X-1, rect.Min.X+radius); x++ {
		score := 0.0
		for y := rect.Min.Y; y < rect.Max.Y; y++ {
			if x > b.Min.X && y >= b.Min.Y && y < b.Max.Y {
				// учитываем только внутреннюю кромку: слева вне, справа внутри
				edge := (isWhite(x, y) && !isWhite(x-1, y))
				if edge {
					score += h.calculateTargetContrast(img, x-1, y, x, y)
				}
			}
		}
		if score > bestLeftScore { bestLeftScore = score; bestLeft = x }
	}

	// RIGHT (внутри слева, снаружи справа)
	bestRight := rect.Max.X
	bestRightScore := -1.0
	for x := max(b.Min.X, rect.Max.X-radius); x <= min(b.Max.X-1, rect.Max.X+radius); x++ {
		score := 0.0
		for y := rect.Min.Y; y < rect.Max.Y; y++ {
			if x < b.Max.X-1 && y >= b.Min.Y && y < b.Max.Y {
				edge := (isWhite(x, y) && !isWhite(x+1, y))
				if edge {
					score += h.calculateTargetContrast(img, x, y, x+1, y)
				}
			}
		}
		if score > bestRightScore { bestRightScore = score; bestRight = x }
	}

	// TOP (внутри снизу, снаружи сверху)
	bestTop := rect.Min.Y
	bestTopScore := -1.0
	for y := max(b.Min.Y+2, rect.Min.Y-radius); y <= min(b.Max.Y-1, rect.Min.Y+radius); y++ {
		score := 0.0
		for x := bestLeft; x < bestRight; x++ {
			if y > b.Min.Y && x >= b.Min.X && x < b.Max.X {
				edge := (isWhite(x, y) && !isWhite(x, y-1))
				if edge {
					score += h.calculateTargetContrast(img, x, y-1, x, y)
				}
			}
		}
		if score > bestTopScore { bestTopScore = score; bestTop = y }
	}

	// BOTTOM (внутри сверху, снаружи снизу)
	bestBottom := rect.Max.Y
	bestBottomScore := -1.0
	for y := max(b.Min.Y, rect.Max.Y-radius); y <= min(b.Max.Y-1, rect.Max.Y+radius); y++ {
		score := 0.0
		for x := bestLeft; x < bestRight; x++ {
			if y < b.Max.Y-1 && x >= b.Min.X && x < b.Max.X {
				edge := (isWhite(x, y) && !isWhite(x, y+1))
				if edge {
					score += h.calculateTargetContrast(img, x, y, x, y+1)
				}
			}
		}
		if score > bestBottomScore { bestBottomScore = score; bestBottom = y }
	}

	if bestRight <= bestLeft { bestRight = bestLeft + 1 }
	if bestBottom <= bestTop { bestBottom = bestTop + 1 }
	return image.Rect(bestLeft, bestTop, bestRight, bestBottom)
}

// computeGridBonus анализирует проекции яркости, ищет равномерные пики 6–10 шт и возвращает бонус уверенности
func (h *BlueSquareHandler) computeGridBonus(img image.Image, rect image.Rectangle) float64 {
	// вырезаем область
	crop := imaging.Crop(img, rect)
	b := crop.Bounds()

	// вычисляем яркостные проекции
	projX := make([]float64, b.Dx())
	projY := make([]float64, b.Dy())
	for y := b.Min.Y; y < b.Max.Y; y++ {
		rowSum := 0.0
		for x := b.Min.X; x < b.Max.X; x++ {
			c := color.RGBAModel.Convert(crop.At(x, y)).(color.RGBA)
			lum := 0.2126*float64(c.R) + 0.7152*float64(c.G) + 0.0722*float64(c.B)
			projX[x-b.Min.X] += lum
			rowSum += lum
		}
		projY[y-b.Min.Y] = rowSum
	}

	// сглаживание скользящим средним
	smooth := func(a []float64, w int) []float64 {
		w = max(1, w)
		out := make([]float64, len(a))
		for i := range a {
			start := max(0, i-w)
			end := min(len(a)-1, i+w)
			s := 0.0
			for j := start; j <= end; j++ { s += a[j] }
			out[i] = s / float64(end-start+1)
		}
		return out
	}
	projX = smooth(projX, max(1, len(projX)/64))
	projY = smooth(projY, max(1, len(projY)/64))

	// поиск локальных максимумов
	findPeaks := func(a []float64) []int {
		if len(a) < 3 { return nil }
		mean := 0.0
		for _, v := range a { mean += v }
		mean /= float64(len(a))
		var peaks []int
		for i := 1; i < len(a)-1; i++ {
			if a[i] > a[i-1] && a[i] > a[i+1] && a[i] > mean*1.05 {
				peaks = append(peaks, i)
			}
		}
		return peaks
	}
	px := findPeaks(projX)
	py := findPeaks(projY)

	// проверка равномерности: коэффициент вариации интервалов
	uniform := func(peaks []int) bool {
		n := len(peaks)
		if n < 6 || n > 10 { return false }
		if n < 2 { return false }
		intervals := make([]float64, 0, n-1)
		for i := 1; i < n; i++ { intervals = append(intervals, float64(peaks[i]-peaks[i-1])) }
		mu := 0.0
		for _, v := range intervals { mu += v }
		mu /= float64(len(intervals))
		if mu == 0 { return false }
		varVar := 0.0
		for _, v := range intervals { d := v - mu; varVar += d*d }
		varVar /= float64(len(intervals))
		cv := math.Sqrt(varVar) / mu
		return cv < 0.25
	}

	bonus := 0.0
	if uniform(px) { bonus += 0.15 }
	if uniform(py) { bonus += 0.15 }
	return bonus
}

// Используем rgbToHSV из blue.go

// Используем утилиты HSV+LAB из blue.go

// Используем PurpleMaskHSVLAB из blue.go

// Используем морфологические операции из blue.go

// Используем TightenToMaskInner и SafeInset из blue.go

// Используем DetectByCCL из blue.go

// Используем SAT детектор из blue.go

/************  ГЛАВНАЯ УЛУЧШЕННАЯ ФУНКЦИЯ ДЕТЕКЦИИ ************/

// DetectSquare494Advanced пытается сначала CCL, если не нашли — SAT.
// Использует функции из blue.go для более точной детекции
func DetectSquare494Advanced(img image.Image) (image.Rectangle, float64, bool) {
	// Используем функцию DetectSquare494 из blue.go
	return DetectSquare494(img)
}

/************  OCR МЕТОДЫ ************/

// onlyDigits извлекает только цифры из строки
func (h *BlueSquareHandler) onlyDigits(s string) string {
	b := strings.Builder{}
	for _, r := range s {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// runTesseract выполняет tesseract OCR с указанным PSM
func (h *BlueSquareHandler) runTesseract(imagePath string, psm string) (string, float64, error) {
	// Определяем путь к tesseract
	tesseractPath := os.Getenv("TESSERACT_PATH")
	if tesseractPath == "" {
		candidates := []string{
			`C:\\Program Files\\Tesseract-OCR\\tesseract.exe`,
			`C:\\Program Files (x86)\\Tesseract-OCR\\tesseract.exe`,
		}
		for _, p := range candidates {
			if _, err := os.Stat(p); err == nil {
				tesseractPath = p
				break
			}
		}
		if tesseractPath == "" {
			tesseractPath = "tesseract"
		}
	}

	args := []string{imagePath, "stdout", "-l", "eng", "--oem", "1", "--psm", psm, "-c", "tessedit_char_whitelist=123456789"}
	cmd := exec.Command(tesseractPath, args...)

	output, err := cmd.Output()
	if err != nil {
		return "", 0, fmt.Errorf("tesseract failed: %w", err)
	}

	text := strings.TrimSpace(string(output))
	// Псевдо-оценка уверенности: больше цифр — выше доверие
	confidence := float64(len(h.onlyDigits(text)))
	return text, confidence, nil
}

// runTessSingleChar выполняет tesseract OCR для одного символа
func (h *BlueSquareHandler) runTessSingleChar(path string) (string, float64, error) {
	// Определяем путь к tesseract
	tesseractPath := os.Getenv("TESSERACT_PATH")
	if tesseractPath == "" {
		candidates := []string{
			`C:\\Program Files\\Tesseract-OCR\\tesseract.exe`,
			`C:\\Program Files (x86)\\Tesseract-OCR\\tesseract.exe`,
		}
		for _, p := range candidates {
			if _, err := os.Stat(p); err == nil {
				tesseractPath = p
				break
			}
		}
		if tesseractPath == "" {
			tesseractPath = "tesseract"
		}
	}

	args := []string{path, "stdout", "-l", "eng", "--oem", "1", "--psm", "10", "-c", "tessedit_char_whitelist=123456789"}
	cmd := exec.Command(tesseractPath, args...)

	output, err := cmd.Output()
	if err != nil {
		return "", 0, fmt.Errorf("tesseract failed: %w", err)
	}

	text := strings.TrimSpace(string(output))
	
	// Простая уверенность: 1.0 если есть валидный символ, иначе 0
	confidence := 0.0
	if len(text) > 0 && text[0] >= '1' && text[0] <= '9' {
		confidence = 1.0
	}
	
	return text, confidence, nil
}

// runTesseractRow выполняет tesseract OCR для строки
func (h *BlueSquareHandler) runTesseractRow(imagePath string) (string, float64, error) {
	// Определяем путь к tesseract
	tesseractPath := os.Getenv("TESSERACT_PATH")
	if tesseractPath == "" {
		candidates := []string{
			`C:\\Program Files\\Tesseract-OCR\\tesseract.exe`,
			`C:\\Program Files (x86)\\Tesseract-OCR\\tesseract.exe`,
		}
		for _, p := range candidates {
			if _, err := os.Stat(p); err == nil {
				tesseractPath = p
				break
			}
		}
		if tesseractPath == "" {
			tesseractPath = "tesseract"
		}
	}

	// PSM=8 для одной строки текста, PSM=6 как fallback
	psmModes := []string{"8", "6", "7"}
	
	for _, psm := range psmModes {
		args := []string{imagePath, "stdout", "-l", "eng", "--oem", "1", "--psm", psm, "-c", "tessedit_char_whitelist=123456789"}
		cmd := exec.Command(tesseractPath, args...)

		output, err := cmd.Output()
		if err != nil {
			continue
		}

		text := strings.TrimSpace(string(output))
		digits := ""
		for _, r := range text {
			if r >= '1' && r <= '9' {
				digits += string(r)
			}
		}
		
		// Если получили разумное количество цифр, возвращаем результат
		if len(digits) >= 4 {
			confidence := float64(len(digits))
			return text, confidence, nil
		}
	}
	
	return "", 0, fmt.Errorf("no valid recognition")
}

// parseToMatrix8x8 парсит текст в матрицу 8x8
func (h *BlueSquareHandler) parseToMatrix8x8(text string) [][]string {
	// Удаляем всё кроме цифр
	digitsOnly := ""
	for _, char := range text {
		if char >= '0' && char <= '9' {
			digitsOnly += string(char)
		}
	}

	// Дополняем до 64 символов пробелами или обрезаем
	total := 64
	if len(digitsOnly) > total {
		digitsOnly = digitsOnly[:total]
	} else {
		for len(digitsOnly) < total {
			digitsOnly += " "
		}
	}

	// Создаем матрицу 8x8
	matrix := make([][]string, 8)
	for i := 0; i < 8; i++ {
		row := make([]string, 8)
		for j := 0; j < 8; j++ {
			idx := i*8 + j
			if idx < len(digitsOnly) && digitsOnly[idx] != ' ' {
				row[j] = string(digitsOnly[idx])
			} else {
				row[j] = ""
			}
		}
		matrix[i] = row
	}

	return matrix
}

// ocrByRows распознает изображение по строкам 8x1, затем парсит каждую строку
func (h *BlueSquareHandler) ocrByRows(processedPath string) ([][]string, error) {
	log.Printf("[BlueSquare OCR] Starting row-based recognition")
	
	// читаем обработанное изображение
	img, err := imaging.Open(processedPath)
	if err != nil { 
		return nil, fmt.Errorf("open processed: %w", err) 
	}

	// режем поля
	contentBounds := h.findContentBBox(img)
	content := imaging.Crop(img, contentBounds)
	b := content.Bounds()
	log.Printf("[BlueSquare OCR] Content size: %dx%d", b.Dx(), b.Dy())

	// строим горизонтальную проекцию для поиска строк
	hProj := h.smooth(h.projectionSums(content, 0), 7)
	minDistH := max(4, b.Dy()/40)
	rowCenters := h.topPeaks(hProj, 8, minDistH)

	// Fallback для строк
	if len(rowCenters) != 8 {
		rowCenters = h.topPeaks(hProj, 8, max(2, minDistH/2))
	}
	if len(rowCenters) != 8 {
		log.Printf("[BlueSquare OCR] Using uniform row division")
		rowCenters = make([]int, 8)
		for i := 0; i < 8; i++ {
			rowCenters[i] = b.Min.Y + (b.Dy() * (i*2 + 1)) / 16
		}
	}

	rowCuts := h.cutsFromCenters(rowCenters, b.Min.Y, b.Max.Y)
	log.Printf("[BlueSquare OCR] Row cuts: %v", rowCuts)

	grid := make([][]string, 8)
	recognizedRows := 0
	
	for r := 0; r < 8; r++ {
		grid[r] = make([]string, 8)
		
		// Безопасное извлечение строки с расширением по высоте
		rowTop := rowCuts[r]
		var rowBottom int
		if r < 7 {
			rowBottom = rowCuts[r+1]
		} else {
			// Для последней строки используем границу содержимого
			rowBottom = b.Max.Y
		}
		
		rowHeight := rowBottom - rowTop
		
		// Настраиваемое расширение (по умолчанию 1/6 = ~16.7% в каждую сторону)
		expansionFactor := 6
		if envFactor := os.Getenv("OCR_ROW_EXPANSION"); envFactor != "" {
			if f := h.parseInt(envFactor); f > 0 && f <= 20 {
				expansionFactor = f
			}
		}
		expansion := rowHeight / expansionFactor
		
		expandedTop := max(b.Min.Y, rowTop - expansion)
		expandedBottom := min(b.Max.Y, rowBottom + expansion)
		
		rowRect := image.Rect(b.Min.X, expandedTop, b.Max.X, expandedBottom)
		rowImg := imaging.Crop(content, rowRect)
		
		// Обрабатываем строку для OCR
		g := imaging.Grayscale(rowImg)
		enhanced := imaging.AdjustContrast(g, 50)
		
		// Инвертируем цвета (белые цифры -> черные для tesseract)
		gBounds := enhanced.Bounds()
		bin := image.NewNRGBA(gBounds)
		
		// Находим адаптивный порог для строки
		pixels := make([]int, 0, gBounds.Dx()*gBounds.Dy())
		for y := gBounds.Min.Y; y < gBounds.Max.Y; y++ {
			for x := gBounds.Min.X; x < gBounds.Max.X; x++ {
				gray := color.GrayModel.Convert(enhanced.At(x, y)).(color.Gray)
				pixels = append(pixels, int(gray.Y))
			}
		}
		sort.Ints(pixels)
		threshold := pixels[len(pixels)*3/4] // 75-й процентиль
		
		for y := gBounds.Min.Y; y < gBounds.Max.Y; y++ {
			for x := gBounds.Min.X; x < gBounds.Max.X; x++ {
				gray := color.GrayModel.Convert(enhanced.At(x, y)).(color.Gray)
				if gray.Y > uint8(threshold) { 
					bin.Set(x, y, color.Black) // белая цифра -> черная
				} else { 
					bin.Set(x, y, color.White) // темный фон -> белый
				}
			}
		}
		
		// Увеличиваем строку в 4 раза
		up := imaging.Resize(bin, gBounds.Dx()*4, gBounds.Dy()*4, imaging.Lanczos)

		// Запускаем tesseract для всей строки с PSM=8 (одна строка текста)
		rowTmpPath := fmt.Sprintf("%s_row_%d.bmp", processedPath, r)
		if err := imaging.Save(up, rowTmpPath); err != nil {
			log.Printf("[BlueSquare OCR] Failed to save row %d", r)
			continue
		}
		
		// OCR для строки
		text, _, err := h.runTesseractRow(rowTmpPath)
		os.Remove(rowTmpPath)
		
		if err != nil {
			log.Printf("[BlueSquare OCR] ✗ Row %d failed: %v", r, err)
			continue
		}
		
		// Парсим строку в 8 символов
		digits := h.onlyDigits(text)
		log.Printf("[BlueSquare OCR] Row %d: '%s' -> %d digits", r, text, len(digits))
		
		// Заполняем grid для этой строки
		for i, digit := range digits {
			if i >= 8 { break }
			if digit >= '1' && digit <= '9' {
				grid[r][i] = string(digit)
			}
		}
		
		if len(digits) >= 6 { // если в строке >= 6 цифр, считаем успешной
			recognizedRows++
		}
	}
	
	log.Printf("[BlueSquare OCR] Recognition completed: %d/8 rows processed successfully", recognizedRows)
	return grid, nil
}

// ocrGridPerCell распознает изображение по клеткам 8x8
func (h *BlueSquareHandler) ocrGridPerCell(processedPath string) ([][]string, error) {
	log.Printf("[BlueSquare OCR] Starting grid recognition")
	
	// читаем уже обработанное (бинаризованное) изображение
	img, err := imaging.Open(processedPath)
	if err != nil { 
		return nil, fmt.Errorf("open processed: %w", err) 
	}

	// режем поля
	contentBounds := h.findContentBBox(img)
	content := imaging.Crop(img, contentBounds)
	b := content.Bounds()
	log.Printf("[BlueSquare OCR] Content size: %dx%d", b.Dx(), b.Dy())

	// строим проекции и находим 8 центров строк/колонок
	hProjRaw := h.projectionSums(content, 0)
	vProjRaw := h.projectionSums(content, 1)
	hProj := h.smooth(hProjRaw, 7)        // по строкам
	vProj := h.smooth(vProjRaw, 7)        // по столбцам
	
	minDistH := max(4, b.Dy()/40)
	minDistV := max(4, b.Dx()/40)
	
	rowCenters := h.topPeaks(hProj, 8, minDistH)
	colCenters := h.topPeaks(vProj, 8, minDistV)

	// Если не найдено 8 пиков, пробуем с меньшим minDist
	if len(rowCenters) != 8 {
		rowCenters = h.topPeaks(hProj, 8, max(2, minDistH/2))
	}
	if len(colCenters) != 8 {
		colCenters = h.topPeaks(vProj, 8, max(2, minDistV/2))
	}

	// Если все еще не 8, используем равномерное деление как fallback
	if len(rowCenters) != 8 {
		log.Printf("[BlueSquare OCR] Using uniform row division")
		rowCenters = make([]int, 8)
		for i := 0; i < 8; i++ {
			rowCenters[i] = b.Min.Y + (b.Dy() * (i*2 + 1)) / 16
		}
	}
	if len(colCenters) != 8 {
		log.Printf("[BlueSquare OCR] Using uniform col division")
		colCenters = make([]int, 8)
		for i := 0; i < 8; i++ {
			colCenters[i] = b.Min.X + (b.Dx() * (i*2 + 1)) / 16
		}
	}

	rowCuts := h.cutsFromCenters(rowCenters, b.Min.Y, b.Max.Y)
	colCuts := h.cutsFromCenters(colCenters, b.Min.X, b.Max.X)

	grid := make([][]string, 8)
	recognizedCount := 0
	
	for r := 0; r < 8; r++ {
		grid[r] = make([]string, 8)
		for c := 0; c < 8; c++ {
			// небольшие внутренние отступы
			insetX := max(1, (colCuts[c+1]-colCuts[c]) / 12)
			insetY := max(1, (rowCuts[r+1]-rowCuts[r]) / 12)

			rect := image.Rect(
				colCuts[c]+insetX, rowCuts[r]+insetY,
				colCuts[c+1]-insetX, rowCuts[r+1]-insetY,
			)
			cell := imaging.Crop(content, rect)

			// Обработка для белых цифр на темном фоне
			g := imaging.Grayscale(cell)
			
			// Увеличиваем контраст
			enhanced := imaging.AdjustContrast(g, 50)
			
			// Анализируем пиксели
			gBounds := enhanced.Bounds()
			whitePixels := 0
			totalPixels := gBounds.Dx() * gBounds.Dy()
			
			for y := gBounds.Min.Y; y < gBounds.Max.Y; y++ {
				for x := gBounds.Min.X; x < gBounds.Max.X; x++ {
					gray := color.GrayModel.Convert(enhanced.At(x, y)).(color.Gray)
					if gray.Y > 100 {
						whitePixels++
					}
				}
			}
			
			whiteRatio := float64(whitePixels) / float64(totalPixels)
			
			// Создаем изображение для tesseract
			bin := image.NewNRGBA(gBounds)
			
			// Понижаем порог - даже 3% белых пикселей может быть цифрой
			if whiteRatio > 0.03 {
				// Находим адаптивный порог для этой клетки
				pixels := make([]int, 0, totalPixels)
				for y := gBounds.Min.Y; y < gBounds.Max.Y; y++ {
					for x := gBounds.Min.X; x < gBounds.Max.X; x++ {
						gray := color.GrayModel.Convert(enhanced.At(x, y)).(color.Gray)
						pixels = append(pixels, int(gray.Y))
					}
				}
				sort.Ints(pixels)
				
				// Используем 75-й процентиль как порог
				thresholdIdx := int(float64(len(pixels)) * 0.75)
				threshold := pixels[thresholdIdx]
				
				for y := gBounds.Min.Y; y < gBounds.Max.Y; y++ {
					for x := gBounds.Min.X; x < gBounds.Max.X; x++ {
						gray := color.GrayModel.Convert(enhanced.At(x, y)).(color.Gray)
						// Инвертируем: белое -> черное, черное -> белое
						if gray.Y > uint8(threshold) { 
							bin.Set(x, y, color.Black) // белая цифра -> черная для tesseract
						} else { 
							bin.Set(x, y, color.White) // темный фон -> белый для tesseract
						}
					}
				}
			} else {
				continue // пропускаем клетки без содержимого
			}
			
			// Увеличиваем в 4 раза через Lanczos
			up := imaging.Resize(bin, gBounds.Dx()*4, gBounds.Dy()*4, imaging.Lanczos)

			// сохраняем в BMP для OCR
			tmp := fmt.Sprintf("%s_r%dc%d.bmp", processedPath, r, c)
			if err := imaging.Save(up, tmp); err != nil {
				continue
			}
			
			txt, _, err := h.runTessSingleChar(tmp)
			os.Remove(tmp)

			if err == nil && len(txt) > 0 {
				ch := txt[0]
				if ch >= '1' && ch <= '9' {
					grid[r][c] = string(ch)
					recognizedCount++
					log.Printf("[BlueSquare OCR] ✓ [%d,%d]: '%s' (%.1f%% white)", r, c, string(ch), whiteRatio*100)
				}
			}
		}
	}
	
	log.Printf("[BlueSquare OCR] Grid recognition completed: %d/64 cells recognized (%.1f%%)", 
		recognizedCount, float64(recognizedCount)/64.0*100.0)
	return grid, nil
}

// Вспомогательные функции для OCR

// суммарное количество «светлых» пикселей в каждой строке (axis=0) или столбце (axis=1)
func (h *BlueSquareHandler) projectionSums(img image.Image, axis int) []int {
	b := img.Bounds()
	sums := []int{}
	if axis == 0 { // горизонтальная проекция (по строкам)
		sums = make([]int, b.Dy())
		for y := b.Min.Y; y < b.Max.Y; y++ {
			s := 0
			for x := b.Min.X; x < b.Max.X; x++ {
				g := color.GrayModel.Convert(img.At(x, y)).(color.Gray).Y
				if g > 100 { // светлый пиксель (белая цифра)
					s++
				}
			}
			sums[y-b.Min.Y] = s
		}
	} else { // вертикальная (по столбцам)
		sums = make([]int, b.Dx())
		for x := b.Min.X; x < b.Max.X; x++ {
			s := 0
			for y := b.Min.Y; y < b.Max.Y; y++ {
				g := color.GrayModel.Convert(img.At(x, y)).(color.Gray).Y
				if g > 100 { // светлый пиксель (белая цифра)
					s++
				}
			}
			sums[x-b.Min.X] = s
		}
	}
	return sums
}

// простое сглаживание скользящим средним
func (h *BlueSquareHandler) smooth(arr []int, win int) []int {
	if win <= 1 { return append([]int(nil), arr...) }
	out := make([]int, len(arr))
	sum := 0
	for i := 0; i < len(arr); i++ {
		sum += arr[i]
		if i >= win { sum -= arr[i-win] }
		w := i+1
		if w > win { w = win }
		out[i] = sum / w
	}
	return out
}

// поиск N пиков с минимальным расстоянием между ними (non-maximum suppression)
func (h *BlueSquareHandler) topPeaks(arr []int, n, minDist int) []int {
	if len(arr) == 0 {
		return []int{}
	}
	
	// Находим максимальное значение для нормализации
	maxVal := 0
	for _, v := range arr {
		if v > maxVal {
			maxVal = v
		}
	}
	
	// Фильтруем пики - должны быть выше определенного порога
	threshold := maxVal / 10 // минимум 10% от максимума
	
	type pair struct{ v, i int }
	vals := []pair{}
	for i, v := range arr {
		if v >= threshold {
			vals = append(vals, pair{v, i})
		}
	}
	
	// сортируем по убыванию значения
	sort.Slice(vals, func(i, j int) bool { return vals[i].v > vals[j].v })

	peaks := []int{}
	used := make([]bool, len(arr))
	for _, p := range vals {
		if len(peaks) >= n { break }
		i := p.i
		// отбрасываем, если рядом уже выбран пик
		ok := true
		for d := -minDist; d <= minDist; d++ {
			k := i + d
			if k >= 0 && k < len(arr) && used[k] {
				ok = false; break
			}
		}
		if ok {
			peaks = append(peaks, i)
			for d := -minDist; d <= minDist; d++ {
				k := i + d
				if k >= 0 && k < len(arr) { used[k] = true }
			}
		}
	}
	sort.Ints(peaks) // важно — монотонно
	return peaks
}

// из координат центров строим 9 линий разреза (границы — середины между центрами)
func (h *BlueSquareHandler) cutsFromCenters(centers []int, minEdge, maxEdge int) []int {
	if len(centers) == 0 { return []int{minEdge, maxEdge} }
	
	cuts := make([]int, 0, len(centers)+1)
	cuts = append(cuts, minEdge)
	
	for i := 0; i < len(centers)-1; i++ {
		mid := (centers[i] + centers[i+1]) / 2
		cuts = append(cuts, mid)
	}
	cuts = append(cuts, maxEdge)
	
	return cuts
}

// findContentBBox находит границы содержимого, ищет белые области на темном фоне
func (h *BlueSquareHandler) findContentBBox(img image.Image) image.Rectangle {
	bounds := img.Bounds()
	
	// Находим левую границу (ищем белые пиксели)
	left := bounds.Min.X
	for x := bounds.Min.X; x < bounds.Max.X; x++ {
		hasContent := false
		for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
			c := color.GrayModel.Convert(img.At(x, y)).(color.Gray)
			if c.Y > 100 { // белый пиксель (цифра)
				hasContent = true
				break
			}
		}
		if hasContent {
			left = x
			break
		}
	}
	
	// Находим правую границу (ищем белые пиксели)
	right := bounds.Max.X - 1
	for x := bounds.Max.X - 1; x >= bounds.Min.X; x-- {
		hasContent := false
		for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
			c := color.GrayModel.Convert(img.At(x, y)).(color.Gray)
			if c.Y > 100 { // белый пиксель (цифра)
				hasContent = true
				break
			}
		}
		if hasContent {
			right = x
			break
		}
	}
	
	// Находим верхнюю границу (ищем белые пиксели)
	top := bounds.Min.Y
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		hasContent := false
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			c := color.GrayModel.Convert(img.At(x, y)).(color.Gray)
			if c.Y > 100 { // белый пиксель (цифра)
				hasContent = true
				break
			}
		}
		if hasContent {
			top = y
			break
		}
	}
	
	// Находим нижнюю границу (ищем белые пиксели)
	bottom := bounds.Max.Y - 1
	for y := bounds.Max.Y - 1; y >= bounds.Min.Y; y-- {
		hasContent := false
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			c := color.GrayModel.Convert(img.At(x, y)).(color.Gray)
			if c.Y > 100 { // белый пиксель (цифра)
				hasContent = true
				break
			}
		}
		if hasContent {
			bottom = y
			break
		}
	}
	
	result := image.Rect(left, top, right+1, bottom+1)
	log.Printf("[BlueSquare OCR BBox] Content: %dx%d, margins: L%d R%d T%d B%d", 
		result.Dx(), result.Dy(),
		left-bounds.Min.X, bounds.Max.X-right-1, top-bounds.Min.Y, bounds.Max.Y-bottom-1)
	
	return result
}

// parseInt парсит строку в int с fallback на 0
func (h *BlueSquareHandler) parseInt(s string) int {
	if i, err := strconv.Atoi(s); err == nil {
		return i
	}
	return 0
}
