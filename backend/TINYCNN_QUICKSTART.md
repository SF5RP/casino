# Tiny-CNN Quick Start Guide

## Быстрый старт

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

### 2. Запуск сервера

**Windows (рекомендуется):**

```cmd
run_casino_backend.bat
```

**Windows (ручной запуск):**

```cmd
set ASSUME_NO_MOVING_GC_UNSAFE_RISK_IT_WITH=go1.22
go build -o casino-backend.exe ./cmd/server
casino-backend.exe
```

**Linux/macOS:**

```bash
export ASSUME_NO_MOVING_GC_UNSAFE_RISK_IT_WITH=go1.22
go build -o casino-backend ./cmd/server
./casino-backend
```

### 3. Проверка статуса

```bash
curl http://localhost:8080/api/tinycnn/status
```

### 4. Создание данных для обучения

```bash
curl -X POST http://localhost:8080/api/tinycnn/create-data \
  -H "Content-Type: application/json" \
  -d '{
    "squaresDir": "uploads/squares",
    "outputDir": "uploads/training_data"
  }'
```

### 5. Обучение модели

```bash
curl -X POST http://localhost:8080/api/tinycnn/train \
  -H "Content-Type: application/json" \
  -d '{
    "epochs": 5,
    "learningRate": 0.001
  }'
```

### 6. Тестирование

```bash
curl -X POST "http://localhost:8080/api/tinycnn/predict?image=path/to/test_image.jpg"
```

## API Эндпоинты

| Метод | Эндпоинт                   | Описание                 |
| ----- | -------------------------- | ------------------------ |
| GET   | `/api/tinycnn/status`      | Статус модели            |
| POST  | `/api/tinycnn/train`       | Обучение модели          |
| POST  | `/api/tinycnn/create-data` | Создание данных обучения |
| POST  | `/api/tinycnn/predict`     | Предсказание цифры       |
| POST  | `/api/tinycnn/reload`      | Перезагрузка модели      |

## Структура файлов

```
backend/
├── internal/handlers/
│   ├── tinycnn_ocr.go      # Основная модель Tiny-CNN
│   ├── tinycnn_training.go # Система обучения
│   ├── tinycnn_api.go      # API эндпоинты
│   └── blue_square.go      # Интеграция с существующей системой
├── uploads/
│   ├── models/             # Сохраненные модели
│   ├── training_data/      # Данные для обучения
│   └── squares/            # Изображения синих квадратов
├── install_tinycnn_deps.ps1 # Скрипт установки (Windows)
├── install_tinycnn_deps.sh  # Скрипт установки (Linux/macOS)
├── TINYCNN_README.md       # Подробная документация
└── TINYCNN_QUICKSTART.md   # Это руководство
```

## Интеграция

Tiny-CNN автоматически интегрируется в существующую систему:

1. **Автоматическое переключение**: Если Tiny-CNN доступен, он используется вместо Tesseract
2. **Fallback**: Если Tiny-CNN недоступен, система переключается на Tesseract
3. **Прозрачность**: API остается тем же, изменения невидимы для клиентов

## Примеры использования

### Обучение с кастомными параметрами

```bash
curl -X POST http://localhost:8080/api/tinycnn/train \
  -H "Content-Type: application/json" \
  -d '{
    "dataPath": "uploads/training_data",
    "modelPath": "uploads/models/my_model.onnx",
    "learningRate": 0.0001,
    "batchSize": 64,
    "epochs": 20,
    "validationSplit": 0.3
  }'
```

### Предсказание с детальными результатами

```bash
curl -X POST "http://localhost:8080/api/tinycnn/predict?image=uploads/test_digit.png"
```

Ответ:

```json
{
  "digit": 7,
  "confidence": 0.95,
  "allScores": [0.01, 0.02, 0.01, 0.01, 0.01, 0.01, 0.01, 0.95, 0.01, 0.01]
}
```

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

1. **Ошибка "assume-no-moving-gc" при запуске**

   ```
   panic: Something in this program imports go4.org/unsafe/assume-no-moving-gc...
   ```

   **Решение:**

   ```cmd
   set ASSUME_NO_MOVING_GC_UNSAFE_RISK_IT_WITH=go1.22
   ```

   Или используйте `run_casino_backend.bat` для автоматической настройки.

2. **Модель не загружается**

   - Проверьте путь к модели
   - Убедитесь, что файл модели существует

3. **Низкая точность**

   - Увеличьте количество данных обучения
   - Настройте параметры обучения

4. **Медленная работа**
   - Уменьшите размер батча
   - Оптимизируйте предобработку

## Следующие шаги

1. Соберите больше данных для обучения
2. Настройте гиперпараметры
3. Добавьте валидацию данных
4. Реализуйте GPU ускорение
5. Добавьте метрики качества

## Поддержка

Для получения помощи:

1. Проверьте логи сервера
2. Изучите `TINYCNN_README.md`
3. Проверьте статус модели через API
