# Устранение проблем с миграциями базы данных

## Проблема: "relation does not exist"

### Симптомы
```
Failed to run database migrations, falling back to in-memory store: 
migration failed at version 1: failed to execute migration 1 statement 
'CREATE INDEX IF NOT EXISTS idx_roulette_numbers_session_id ON roulette_numbers(session_id)': 
pq: relation "roulette_numbers" does not exist
```

### Причина
Миграция пытается создать индекс на таблице, которая еще не была создана из-за неправильного порядка выполнения SQL команд.

### Решение
✅ **ИСПРАВЛЕНО** - Улучшен парсер SQL для корректной обработки многострочных команд.

---

## Проблема: "unterminated dollar-quoted string"

### Симптомы
```
Failed to run database migrations, falling back to in-memory store: 
migration failed at version 2: failed to execute migration 2 statement 
'CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = NOW()': pq: unterminated dollar-quoted string at or near "$$"
```

### Причина
Парсер SQL неправильно разбивал PostgreSQL функции с dollar-quoted строками (`$$`), разрывая их на части.

### Решение
✅ **ИСПРАВЛЕНО** - Парсер теперь корректно обрабатывает dollar-quoted строки PostgreSQL.

---

## Общие решения проблем с миграциями

#### Вариант 1: Сброс и повторное применение миграций
```bash
# Сброс всех миграций (ОСТОРОЖНО: удаляет все данные!)
./casino-backend reset-migrations

# Применение миграций заново
./casino-backend migrate
```

#### Вариант 2: Ручная проверка и исправление
```bash
# Проверка статуса миграций
./casino-backend migration-status

# Откат проблемной миграции
./casino-backend rollback 1

# Повторное применение
./casino-backend migrate
```

#### Вариант 3: Прямое подключение к базе данных
```sql
-- Подключитесь к PostgreSQL и выполните:
DROP TABLE IF EXISTS roulette_numbers;
DROP TABLE IF EXISTS roulette_sessions;
DROP TABLE IF EXISTS schema_migrations;

-- Затем запустите миграции
```

## Проверка состояния

### Проверка подключения к базе данных
```bash
# Проверка здоровья системы
curl http://localhost:8080/health

# Статус миграций
./casino-backend migration-status
```

### Проверка таблиц в PostgreSQL
```sql
-- Список таблиц
\dt

-- Структура таблицы
\d roulette_sessions
\d roulette_numbers
```

## Команды миграций

```bash
# Применить все ожидающие миграции
./casino-backend migrate

# Откатить N миграций
./casino-backend rollback 2

# Показать статус миграций
./casino-backend migration-status

# Полный сброс (ОПАСНО!)
./casino-backend reset-migrations

# Справка
./casino-backend help
```

## Исправления в коде

### Улучшенный парсер SQL
Код теперь использует улучшенный парсер SQL (`splitSQLStatements`), который:
- ✅ Правильно обрабатывает многострочные команды
- ✅ Игнорирует комментарии
- ✅ Корректно разбивает команды по `;`
- ✅ **Поддерживает PostgreSQL dollar-quoted строки** (`$$`)
- ✅ Обрабатывает функции, триггеры и процедуры

### Порядок создания объектов
Миграция 1 теперь создает объекты в правильном порядке:
1. Таблица `roulette_sessions`
2. Таблица `roulette_numbers` 
3. Индексы для обеих таблиц

### Тестирование
Добавлены unit-тесты для парсера SQL:
```bash
# Запуск тестов парсера
go test -v ./internal/database/ -run "TestSplitSQLStatements"
```

## Предотвращение проблем

1. **Всегда тестируйте миграции** на копии данных
2. **Делайте резервные копии** перед применением миграций
3. **Проверяйте порядок команд** в миграциях
4. **Используйте транзакции** для атомарности операций
5. **Тестируйте dollar-quoted функции** отдельно

## Переключение на in-memory режим

Если проблемы с PostgreSQL критичны, сервер автоматически переключается на in-memory хранилище:

```
Using repository: In-Memory Repository: 0 sessions, 0 total numbers
```

Это позволяет продолжить работу без базы данных, но данные не сохраняются между перезапусками.

## Статус исправлений

- ✅ **Миграция 1**: Исправлен порядок создания таблиц и индексов
- ✅ **Миграция 2**: Исправлена обработка PostgreSQL функций с `$$`
- ✅ **Парсер SQL**: Добавлена поддержка dollar-quoted строк
- ✅ **Команды CLI**: Добавлена команда `reset-migrations`
- ✅ **Тестирование**: Добавлены unit-тесты для парсера 