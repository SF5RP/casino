# gRPC API для передачи чисел на стол

Этот документ описывает gRPC API для авторизации и передачи чисел на стол рулетки.

## Обзор

Система предоставляет два интерфейса:
- **HTTP REST API** (порт 8011) - для веб-приложений
- **gRPC API** (порт 8012) - для высокопроизводительной передачи данных

## Установка и запуск

### 1. Установка зависимостей

```bash
# Установка Go зависимостей
go mod tidy

# Установка protobuf компилятора (если не установлен)
sudo apt-get install protobuf-compiler

# Установка Go плагинов для protobuf
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
```

### 2. Генерация gRPC кода

```bash
# Генерация Go кода из proto файлов
make grpc-gen
```

### 3. Запуск сервера

```bash
# Запуск сервера (HTTP + gRPC)
make run

# Или с переменными окружения
PORT=8011 GRPC_PORT=8012 make run
```

### 4. Тестирование клиента

```bash
# Сборка клиента
make grpc-client

# Запуск клиента (требует работающий сервер)
make grpc-test

# Полная демонстрация (сервер + клиент)
make grpc-demo
```

## gRPC API

### Сервис: RouletteService

#### 1. AuthenticateRoom - Аутентификация в комнате

```protobuf
rpc AuthenticateRoom(AuthenticateRoomRequest) returns (AuthenticateRoomResponse);
```

**Запрос:**
```protobuf
message AuthenticateRoomRequest {
  string key = 1;      // Ключ комнаты
  string password = 2; // Пароль комнаты (опционально)
}
```

**Ответ:**
```protobuf
message AuthenticateRoomResponse {
  bool success = 1;   // Успешность операции
  string token = 2;   // JWT токен для авторизации
  string message = 3; // Сообщение
}
```

#### 2. GetHistory - Получение истории чисел

```protobuf
rpc GetHistory(GetHistoryRequest) returns (GetHistoryResponse);
```

**Запрос:**
```protobuf
message GetHistoryRequest {
  string key = 1;   // Ключ комнаты
  string token = 2; // JWT токен (в метаданных)
}
```

**Ответ:**
```protobuf
message GetHistoryResponse {
  bool success = 1;
  repeated RouletteNumber history = 2;
  string message = 3;
}
```

#### 3. SaveNumber - Сохранение нового числа

```protobuf
rpc SaveNumber(SaveNumberRequest) returns (SaveNumberResponse);
```

**Запрос:**
```protobuf
message SaveNumberRequest {
  string key = 1;
  RouletteNumber number = 2;
  string token = 3; // JWT токен (в метаданных)
}
```

**Ответ:**
```protobuf
message SaveNumberResponse {
  bool success = 1;
  RouletteSession session = 2;
  string message = 3;
}
```

#### 4. UpdateHistory - Обновление истории чисел

```protobuf
rpc UpdateHistory(UpdateHistoryRequest) returns (UpdateHistoryResponse);
```

#### 5. StreamNumbers - Потоковая передача чисел

```protobuf
rpc StreamNumbers(StreamNumbersRequest) returns (stream NumberStream);
```

**Особенности:**
- Двунаправленный поток
- Автоматические ping/pong для поддержания соединения
- Получение обновлений в реальном времени

## Авторизация

### JWT Токены

Все gRPC вызовы (кроме AuthenticateRoom) требуют JWT токен в метаданных:

```go
// Добавление токена в метаданные
ctx := metadata.NewOutgoingContext(context.Background(), 
    metadata.Pairs("authorization", "Bearer "+token))

// Вызов gRPC метода
resp, err := client.GetHistory(ctx, &pb.GetHistoryRequest{...})
```

### Структура токена

```json
{
  "key": "room-key",
  "exp": 1640995200,
  "iat": 1640908800
}
```

- `key` - ключ комнаты
- `exp` - время истечения (24 часа)
- `iat` - время создания

## Типы данных

### RouletteNumber

```protobuf
message RouletteNumber {
  oneof value {
    int32 int_value = 1;    // 0-36
    string string_value = 2; // "00"
  }
}
```

**Примеры:**
- `int_value: 7` - число 7
- `int_value: 0` - число 0 (зеленое)
- `string_value: "00"` - число 00 (зеленое)

### RouletteSession

```protobuf
message RouletteSession {
  int32 id = 1;
  string key = 2;
  repeated RouletteNumber history = 3;
  google.protobuf.Timestamp created_at = 4;
  google.protobuf.Timestamp updated_at = 5;
}
```

## Примеры использования

### 1. Простой клиент на Go

```go
package main

import (
    "context"
    "log"
    
    pb "casino-backend/proto/roulette"
    "google.golang.org/grpc"
    "google.golang.org/grpc/metadata"
)

func main() {
    // Подключение
    conn, err := grpc.Dial("localhost:8012", grpc.WithInsecure())
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()
    
    client := pb.NewRouletteServiceClient(conn)
    
    // Аутентификация
    authResp, err := client.AuthenticateRoom(context.Background(), 
        &pb.AuthenticateRoomRequest{
            Key: "my-room",
        })
    if err != nil {
        log.Fatal(err)
    }
    
    // Создание авторизованного контекста
    ctx := metadata.NewOutgoingContext(context.Background(),
        metadata.Pairs("authorization", "Bearer "+authResp.Token))
    
    // Сохранение числа
    saveResp, err := client.SaveNumber(ctx, &pb.SaveNumberRequest{
        Key: "my-room",
        Number: &pb.RouletteNumber{
            Value: &pb.RouletteNumber_IntValue{IntValue: 7},
        },
    })
    if err != nil {
        log.Fatal(err)
    }
    
    log.Printf("Number saved: %v", saveResp.Success)
}
```

### 2. Потоковое соединение

```go
func streamNumbers(client pb.RouletteServiceClient, ctx context.Context) {
    stream, err := client.StreamNumbers(ctx, &pb.StreamNumbersRequest{
        Key: "my-room",
    })
    if err != nil {
        log.Fatal(err)
    }
    
    for {
        msg, err := stream.Recv()
        if err != nil {
            log.Printf("Stream ended: %v", err)
            break
        }
        
        switch event := msg.Event.(type) {
        case *pb.NumberStream_NewNumber:
            log.Printf("New number: %v", event.NewNumber)
        case *pb.NumberStream_HistoryUpdate:
            log.Printf("History update: %d numbers", len(event.HistoryUpdate.History))
        case *pb.NumberStream_Ping:
            log.Printf("Ping received")
        }
    }
}
```

## Конфигурация

### Переменные окружения

```bash
# HTTP сервер
PORT=8011

# gRPC сервер  
GRPC_PORT=8012

# JWT секрет
JWT_SECRET=your-secret-key

# База данных
DB_HOST=localhost
DB_PORT=5432
DB_USER=casino_user
DB_PASSWORD=casino_password
DB_NAME=casino_db
```

### Файрвол и сеть

```bash
# Открытие портов
sudo ufw allow 8011/tcp  # HTTP API
sudo ufw allow 8012/tcp  # gRPC API
```

## Мониторинг и отладка

### Логи сервера

```bash
# Запуск с подробными логами
LOG_LEVEL=debug make run
```

### Проверка соединения

```bash
# Тест HTTP API
curl http://localhost:8011/health

# Тест gRPC (требует grpcurl)
grpcurl -plaintext localhost:8012 list
grpcurl -plaintext localhost:8012 roulette.RouletteService/AuthenticateRoom
```

### Метрики производительности

gRPC сервер автоматически собирает метрики:
- Количество запросов
- Время ответа
- Активные соединения
- Ошибки

## Безопасность

### Рекомендации

1. **Используйте TLS в продакшене:**
   ```go
   creds, _ := credentials.NewServerTLSFromFile("server.crt", "server.key")
   s := grpc.NewServer(grpc.Creds(creds))
   ```

2. **Настройте межсетевой экран:**
   ```bash
   # Только локальный доступ
   sudo ufw deny 8012
   sudo ufw allow from 192.168.1.0/24 to any port 8012
   ```

3. **Регулярно обновляйте JWT секреты**

4. **Ограничьте размер запросов:**
   ```go
   s := grpc.NewServer(
       grpc.MaxRecvMsgSize(4*1024*1024), // 4MB
       grpc.MaxSendMsgSize(4*1024*1024), // 4MB
   )
   ```

## Устранение неполадок

### Частые проблемы

1. **"connection refused"**
   - Проверьте, что сервер запущен
   - Проверьте порт и адрес

2. **"authentication failed"**
   - Проверьте JWT токен
   - Проверьте время истечения токена

3. **"permission denied"**
   - Проверьте права доступа к комнате
   - Проверьте правильность ключа комнаты

### Отладка

```bash
# Проверка процессов
ps aux | grep casino

# Проверка портов
netstat -tlnp | grep 8012

# Логи системы
journalctl -u casino-backend -f
```

## Производительность

### Бенчмарки

Типичная производительность gRPC сервера:
- **Запросы в секунду:** 10,000+ RPS
- **Задержка:** < 1ms (локальная сеть)
- **Пропускная способность:** 100+ MB/s

### Оптимизация

1. **Пулы соединений**
2. **Сжатие (gzip)**
3. **Keep-alive соединения**
4. **Батчинг запросов**

```go
// Настройка клиента
conn, err := grpc.Dial("localhost:8012",
    grpc.WithInsecure(),
    grpc.WithKeepaliveParams(keepalive.ClientParameters{
        Time: 30 * time.Second,
        Timeout: 5 * time.Second,
        PermitWithoutStream: true,
    }),
)
```