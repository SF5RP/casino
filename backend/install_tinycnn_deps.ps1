# Скрипт для установки зависимостей Tiny-CNN на Windows
Write-Host "Installing Tiny-CNN dependencies..." -ForegroundColor Green

# Устанавливаем переменную окружения для совместимости с Go 1.22
$env:ASSUME_NO_MOVING_GC_UNSAFE_RISK_IT_WITH = "go1.22"
Write-Host "Set ASSUME_NO_MOVING_GC_UNSAFE_RISK_IT_WITH=go1.22 for Go 1.22 compatibility" -ForegroundColor Yellow

# Обновляем go.mod
Write-Host "Updating go.mod with ML dependencies..." -ForegroundColor Yellow
go mod tidy

# Проверяем наличие необходимых библиотек
Write-Host "Checking for required libraries..." -ForegroundColor Yellow

# Проверяем Gorgonia
try {
    go list -m gorgonia.org/gorgonia | Out-Null
    Write-Host "Gorgonia already installed" -ForegroundColor Green
} catch {
    Write-Host "Installing Gorgonia..." -ForegroundColor Yellow
    go get gorgonia.org/gorgonia@latest
}

# Проверяем Tensor
try {
    go list -m gorgonia.org/tensor | Out-Null
    Write-Host "Tensor already installed" -ForegroundColor Green
} catch {
    Write-Host "Installing Tensor..." -ForegroundColor Yellow
    go get gorgonia.org/tensor@latest
}

# Проверяем ONNX Go
try {
    go list -m github.com/owulveryck/onnx-go | Out-Null
    Write-Host "ONNX Go already installed" -ForegroundColor Green
} catch {
    Write-Host "Installing ONNX Go..." -ForegroundColor Yellow
    go get github.com/owulveryck/onnx-go@latest
}

# Проверяем GoLearn
try {
    go list -m github.com/sjwhitworth/golearn | Out-Null
    Write-Host "GoLearn already installed" -ForegroundColor Green
} catch {
    Write-Host "Installing GoLearn..." -ForegroundColor Yellow
    go get github.com/sjwhitworth/golearn@latest
}

# Создаем директории для моделей
Write-Host "Creating model directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "uploads\models" | Out-Null
New-Item -ItemType Directory -Force -Path "uploads\training_data" | Out-Null
New-Item -ItemType Directory -Force -Path "uploads\squares" | Out-Null

# Создаем файл конфигурации
Write-Host "Creating Tiny-CNN configuration..." -ForegroundColor Yellow
$config = @"
{
  "inputSize": 28,
  "numClasses": 9,
  "learningRate": 0.001,
  "batchSize": 32,
  "epochs": 10,
  "validationSplit": 0.2
}
"@
$config | Out-File -FilePath "uploads\models\tinycnn_config.json" -Encoding UTF8

Write-Host "Tiny-CNN dependencies installation completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Collect training data by running the blue square detection on sample images"
Write-Host "2. Create training data: POST /api/tinycnn/create-data"
Write-Host "3. Train the model: POST /api/tinycnn/train"
Write-Host "4. Check model status: GET /api/tinycnn/status"
Write-Host ""
Write-Host "API Endpoints:" -ForegroundColor Cyan
Write-Host "  POST /api/tinycnn/train - Train model"
Write-Host "  GET  /api/tinycnn/status - Get model status"
Write-Host "  POST /api/tinycnn/create-data - Create training data"
Write-Host "  POST /api/tinycnn/predict - Predict digit"
Write-Host "  POST /api/tinycnn/reload - Reload model"
