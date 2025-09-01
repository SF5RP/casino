#!/bin/bash

# Скрипт для установки зависимостей Tiny-CNN
echo "Installing Tiny-CNN dependencies..."

# Устанавливаем переменную окружения для совместимости с Go 1.22
export ASSUME_NO_MOVING_GC_UNSAFE_RISK_IT_WITH=go1.22
echo "Set ASSUME_NO_MOVING_GC_UNSAFE_RISK_IT_WITH=go1.22 for Go 1.22 compatibility"

# Обновляем go.mod
echo "Updating go.mod with ML dependencies..."
go mod tidy

# Проверяем наличие необходимых библиотек
echo "Checking for required libraries..."

# Проверяем Gorgonia
if ! go list -m gorgonia.org/gorgonia >/dev/null 2>&1; then
    echo "Installing Gorgonia..."
    go get gorgonia.org/gorgonia@latest
fi

# Проверяем Tensor
if ! go list -m gorgonia.org/tensor >/dev/null 2>&1; then
    echo "Installing Tensor..."
    go get gorgonia.org/tensor@latest
fi

# Проверяем ONNX Go
if ! go list -m github.com/owulveryck/onnx-go >/dev/null 2>&1; then
    echo "Installing ONNX Go..."
    go get github.com/owulveryck/onnx-go@latest
fi

# Проверяем GoLearn
if ! go list -m github.com/sjwhitworth/golearn >/dev/null 2>&1; then
    echo "Installing GoLearn..."
    go get github.com/sjwhitworth/golearn@latest
fi

# Создаем директории для моделей
echo "Creating model directories..."
mkdir -p uploads/models
mkdir -p uploads/training_data
mkdir -p uploads/squares

# Создаем файл конфигурации
echo "Creating Tiny-CNN configuration..."
cat > uploads/models/tinycnn_config.json << EOF
{
  "inputSize": 28,
  "numClasses": 9,
  "learningRate": 0.001,
  "batchSize": 32,
  "epochs": 10,
  "validationSplit": 0.2
}
EOF

echo "Tiny-CNN dependencies installation completed!"
echo ""
echo "Next steps:"
echo "1. Collect training data by running the blue square detection on sample images"
echo "2. Create training data: POST /api/tinycnn/create-data"
echo "3. Train the model: POST /api/tinycnn/train"
echo "4. Check model status: GET /api/tinycnn/status"
echo ""
echo "API Endpoints:"
echo "  POST /api/tinycnn/train - Train model"
echo "  GET  /api/tinycnn/status - Get model status"
echo "  POST /api/tinycnn/create-data - Create training data"
echo "  POST /api/tinycnn/predict - Predict digit"
echo "  POST /api/tinycnn/reload - Reload model"
