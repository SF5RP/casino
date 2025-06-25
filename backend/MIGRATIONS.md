# Встроенная система миграций

Casino Backend включает в себя полнофункциональную систему миграций базы данных, встроенную прямо в бинарник. Это позволяет управлять схемой базы данных без внешних инструментов.

## Возможности

- ✅ **Встроенные миграции** - все миграции хранятся в коде
- ✅ **Автоматическое применение** - миграции применяются при запуске сервера
- ✅ **CLI команды** - управление миграциями через командную строку
- ✅ **HTTP API** - управление миграциями через REST API
- ✅ **Откат миграций** - возможность отката на N шагов назад
- ✅ **Отслеживание статуса** - полная информация о состоянии миграций
- ✅ **Транзакции** - каждая миграция выполняется в отдельной транзакции
- ✅ **Fallback режим** - автоматический переход на in-memory при ошибках БД

## CLI команды

### Запуск сервера
```bash
# Запуск сервера (миграции применяются автоматически)
./casino-backend

# Явный запуск сервера
./casino-backend server
```

### Управление миграциями
```bash
# Показать справку
./casino-backend help

# Показать статус миграций
./casino-backend migration-status

# Применить все pending миграции
./casino-backend migrate

# Откатить последние N миграций
./casino-backend rollback 1
./casino-backend rollback 3
```

## HTTP API

### Получение статуса
```bash
# Статус миграций
GET /api/migrations/status

# Список всех миграций
GET /api/migrations/list

# Health check с информацией о миграциях
GET /health
```

### Управление миграциями
```bash
# Применить pending миграции
POST /api/migrations/up

# Откатить N миграций
POST /api/migrations/down/1
POST /api/migrations/down/3
```

## Примеры использования

### 1. Проверка статуса миграций
```bash
$ ./casino-backend migration-status

Migration Status:
================
Total migrations: 3
Applied migrations: 2
Pending migrations: 1
Current version: 2
Latest version: 3
Applied versions: [1 2]
Pending versions: [3]

Detailed Migration List:
========================
Version 1: Create initial tables [APPLIED]
Version 2: Add updated_at trigger for roulette_sessions [APPLIED]
Version 3: Add statistics and metadata tables [PENDING]
```

### 2. Применение миграций
```bash
$ ./casino-backend migrate

2025/06/25 08:44:20 Running database migrations...
2025/06/25 08:44:20 Found 1 pending migrations
2025/06/25 08:44:20 Applying migration 3: Add statistics and metadata tables
2025/06/25 08:44:20 Migration 3 applied successfully in 45ms
2025/06/25 08:44:20 Successfully applied 1 migrations
Migrations completed successfully!
Applied: 3/3 migrations
Current version: 3
```

### 3. Откат миграций
```bash
$ ./casino-backend rollback 1

2025/06/25 08:44:25 Rolling back 1 migrations
2025/06/25 08:44:25 Rolling back migration 3: Add statistics and metadata tables
2025/06/25 08:44:25 Migration 3 rolled back successfully in 23ms
2025/06/25 08:44:25 Successfully rolled back 1 migrations
Rollback completed successfully!
Applied: 2/3 migrations
Current version: 2
```

## Структура миграций

Каждая миграция содержит:

```go
type Migration struct {
    Version     int    // Уникальный номер версии
    Description string // Описание миграции
    Up          string // SQL для применения
    Down        string // SQL для отката
}
```

### Текущие миграции

**Migration 1: Create initial tables**
- Создание таблиц `roulette_sessions` и `roulette_numbers`
- Создание индексов для оптимизации

**Migration 2: Add updated_at trigger**
- Добавление trigger для автоматического обновления `updated_at`
- Создание функции `update_updated_at_column()`

**Migration 3: Add statistics and metadata tables**
- Создание таблицы `roulette_statistics` для отслеживания статистики
- Создание таблицы `system_settings` для настроек системы
- Добавление настроек по умолчанию

## Добавление новых миграций

Для добавления новой миграции:

1. Откройте файл `internal/database/migrations.go`
2. Добавьте новую миграцию в метод `GetMigrations()`:

```go
{
    Version:     4,
    Description: "Add user authentication tables",
    Up: `
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX idx_users_username ON users(username);
    `,
    Down: `
        DROP INDEX IF EXISTS idx_users_username;
        DROP TABLE IF EXISTS users;
    `,
},
```

3. Перекомпилируйте бинарник
4. Запустите миграции

## Автоматическое применение

При запуске сервера миграции применяются автоматически:

1. **Подключение к БД** - попытка подключения к PostgreSQL
2. **Проверка миграций** - поиск pending миграций
3. **Применение** - автоматическое применение всех pending миграций
4. **Fallback** - при ошибках переход на in-memory хранилище

## Безопасность

- **Транзакции** - каждая миграция выполняется в отдельной транзакции
- **Rollback при ошибке** - автоматический rollback при ошибке в миграции
- **Отслеживание** - все применённые миграции записываются в `schema_migrations`
- **Проверка целостности** - checksum для проверки изменений миграций

## Мониторинг

### Health Check
Endpoint `/health` включает информацию о миграциях:

```json
{
  "status": "ok",
  "timestamp": "2025-06-25T01:44:35Z",
  "repository": {
    "type": "postgresql",
    "sessions_count": 5,
    "total_numbers": 150,
    "status": "active"
  },
  "migrations": {
    "total_migrations": 3,
    "applied_migrations": 3,
    "pending_migrations": 0,
    "current_version": 3,
    "latest_version": 3
  }
}
```

### Логирование
Все операции с миграциями логируются:

```
2025/06/25 08:44:20 Running database migrations...
2025/06/25 08:44:20 Found 1 pending migrations
2025/06/25 08:44:20 Applying migration 3: Add statistics and metadata tables
2025/06/25 08:44:20 Migration 3 applied successfully in 45ms
```

## Переменные окружения

```bash
# Настройки базы данных
DB_HOST=localhost        # Хост PostgreSQL
DB_PORT=5432            # Порт PostgreSQL
DB_USER=casino_user     # Пользователь
DB_PASSWORD=casino_password  # Пароль
DB_NAME=casino_db       # Имя базы данных
DB_SSL_MODE=disable     # Режим SSL

# Настройки сервера
PORT=8080              # Порт веб-сервера
```

## Troubleshooting

### База данных недоступна
```
Failed to connect to PostgreSQL: dial tcp [::1]:5432: connectex: No connection could be made
Falling back to in-memory storage...
```
**Решение**: Убедитесь что PostgreSQL запущен и доступен

### Ошибка в миграции
```
Migration failed at version 3: failed to execute migration 3 statement 'CREATE TABLE...': relation already exists
```
**Решение**: Проверьте SQL в миграции, возможно нужно добавить `IF NOT EXISTS`

### Конфликт версий
```
migration 3 not found in available migrations
```
**Решение**: Убедитесь что все миграции присутствуют в коде

## Лучшие практики

1. **Всегда добавляйте Down миграции** для возможности отката
2. **Используйте IF NOT EXISTS** для безопасности
3. **Тестируйте миграции** на копии данных
4. **Делайте бэкапы** перед применением миграций в продакшене
5. **Не изменяйте уже применённые миграции** - создавайте новые
6. **Используйте транзакции** для сложных миграций
7. **Документируйте изменения** в описании миграции 