# Tiny-CNN OCR Integration

Этот документ описывает интеграцию Tiny-CNN для распознавания цифр в синих квадратах казино.

## Обзор

Tiny-CNN - это легковесная сверточная нейронная сеть, оптимизированная для распознавания цифр. Она заменяет Tesseract OCR для более точного и быстрого распознавания цифр в сетке 8x8.

## Архитектура

### Модель

- **Входной размер**: 28x28 пикселей (MNIST-подобный формат)
- **Классы**: 10 (цифры 0-9)
- **Архитектура**:
  - Conv2D (1→32 каналов, ядро 3x3) + ReLU + MaxPool
  - Conv2D (32→64 каналов, ядро 3x3) + ReLU + MaxPool
  - Полносвязный слой (64×5×5 → 10) + Softmax

### Компоненты

1. **TinyCNNModel** - основная модель
2. **TinyCNNOCRHandler** - обработчик OCR
3. **TinyCNNTrainer** - система обучения
4. **TinyCNNAPIHandler** - API эндпоинты

## Установка

### 1. Установка зависимостей

**Windows:**

```powershell
.\install_tinycnn_deps.ps1
```

**Linux/macOS:**

```bash
chmod +x install_tinycnn_deps.sh
./install_tinycnn_deps.sh
```

### 2. Ручная установка

```bash
go get gorgonia.org/gorgonia@latest
go get gorgonia.org/tensor@latest
go get github.com/owulveryck/onnx-go@latest
go get github.com/sjwhitworth/golearn@latest
go mod tidy
```

## Использование

### 1. Сбор данных для обучения

Сначала соберите изображения синих квадратов:

```bash
# Запустите обнаружение синих квадратов на ваших изображениях
curl -X POST http://localhost:8080/api/detect-blue-square \
  -F "image=@your_image.jpg"
```

### 2. Создание данных для обучения

```bash
curl -X POST http://localhost:8080/api/tinycnn/create-data \
  -H "Content-Type: application/json" \
  -d '{
    "squaresDir": "uploads/squares",
    "outputDir": "uploads/training_data"
  }'
```

### 3. Обучение модели

```bash
curl -X POST http://localhost:8080/api/tinycnn/train \
  -H "Content-Type: application/json" \
  -d '{
    "dataPath": "uploads/training_data",
    "modelPath": "uploads/models/tinycnn_model.onnx",
    "learningRate": 0.001,
    "batchSize": 32,
    "epochs": 10,
    "validationSplit": 0.2
  }'
```

### 4. Проверка статуса модели

```bash
curl http://localhost:8080/api/tinycnn/status
```

### 5. Предсказание

```bash
curl -X POST "http://localhost:8080/api/tinycnn/predict?image=path/to/image.jpg"
```

## API Эндпоинты

### POST /api/tinycnn/train

Обучение модели на предоставленных данных.

**Параметры:**

- `dataPath` - путь к данным обучения
- `modelPath` - путь для сохранения модели
- `learningRate` - скорость обучения (по умолчанию: 0.001)
- `batchSize` - размер батча (по умолчанию: 32)
- `epochs` - количество эпох (по умолчанию: 10)
- `validationSplit` - доля данных для валидации (по умолчанию: 0.2)

### GET /api/tinycnn/status

Получение статуса модели.

**Ответ:**

```json
{
  "modelLoaded": true,
  "modelPath": "uploads/models/tinycnn_model.onnx",
  "lastTrained": "2025-01-02T10:30:00Z"
}
```

### POST /api/tinycnn/create-data

Создание данных для обучения из синих квадратов.

**Параметры:**

- `squaresDir` - директория с изображениями квадратов
- `outputDir` - директория для сохранения данных обучения

### POST /api/tinycnn/predict

Предсказание цифры на изображении.

**Параметры:**

- `image` - путь к изображению (query parameter)

**Ответ:**

```json
{
  "digit": 7,
  "confidence": 0.95,
  "allScores": [0.01, 0.02, 0.01, 0.01, 0.01, 0.01, 0.01, 0.95, 0.01, 0.01]
}
```

### POST /api/tinycnn/reload

Перезагрузка модели.

## Структура данных

### Формат данных обучения

```
uploads/
├── models/
│   ├── tinycnn_model.onnx
│   └── tinycnn_config.json
├── training_data/
│   ├── digit_0_image1.png
│   ├── digit_1_image1.png
│   └── training_metadata.json
└── squares/
    ├── square1.jpg
    └── square2.jpg
```

### Метаданные обучения

```json
{
  "images": [
    {
      "path": "uploads/training_data/digit_0_image1.png",
      "label": 0,
      "width": 28,
      "height": 28
    }
  ],
  "labels": [0, 1, 2, ...]
}
```

## Интеграция с существующей системой

Tiny-CNN автоматически интегрируется в существующую систему обнаружения синих квадратов:

1. **Автоматическое переключение**: Если Tiny-CNN доступен, он используется вместо Tesseract
2. **Fallback**: Если Tiny-CNN недоступен, система автоматически переключается на Tesseract
3. **Совместимость**: API остается тем же, изменения прозрачны для клиентов

## Производительность

### Ожидаемые улучшения

- **Точность**: 95%+ против 60-70% у Tesseract
- **Скорость**: 2-3x быстрее для сетки 8x8
- **Надежность**: Лучше работает с низким качеством изображений

### Оптимизации

- Модель оптимизирована для цифр 0-9
- Предобработка изображений для улучшения качества
- Кэширование модели в памяти
- Батчевая обработка для множественных предсказаний

## Отладка

### Логи

Все операции Tiny-CNN логируются с префиксом `[TinyCNN]`:

```
[TinyCNN] Initializing model with config: {...}
[TinyCNN] Starting training with 1000 samples
[TinyCNN] Epoch 1/10: Loss=0.1234, Accuracy=0.8765
[TinyCNN] Training completed in 2m30s
```

### Общие проблемы

1. **Модель не загружается**

   - Проверьте путь к модели
   - Убедитесь, что файл модели существует
   - Проверьте права доступа

2. **Низкая точность**

   - Увеличьте количество данных обучения
   - Настройте параметры обучения
   - Проверьте качество предобработки изображений

3. **Медленная работа**
   - Уменьшите размер батча
   - Оптимизируйте предобработку
   - Используйте GPU если доступен

## Разработка

### Добавление новых функций

1. Модифицируйте `TinyCNNModel` для новых архитектур
2. Обновите `TinyCNNOCRHandler` для новых методов предобработки
3. Добавьте новые API эндпоинты в `TinyCNNAPIHandler`

### Тестирование

```bash
# Тест обучения
go test ./internal/handlers -run TestTinyCNN

# Тест API
go test ./internal/handlers -run TestTinyCNNAPI
```

## Лицензия

Tiny-CNN интеграция использует те же лицензии, что и основные библиотеки:

- Gorgonia: Apache 2.0
- ONNX Go: Apache 2.0
- GoLearn: MIT
