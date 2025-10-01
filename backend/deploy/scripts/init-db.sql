-- Инициализация базы данных для Casino Roulette
-- Этот файл выполняется автоматически при первом запуске PostgreSQL контейнера

-- Создаем расширения если нужно
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Создаем схему если нужно
-- CREATE SCHEMA IF NOT EXISTS casino;

-- Устанавливаем правильные права для пользователя
GRANT ALL PRIVILEGES ON DATABASE casino_db TO casino_user;

-- Подключаемся к базе данных casino_db
\c casino_db;

-- Предоставляем права на схему public
GRANT ALL ON SCHEMA public TO casino_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO casino_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO casino_user;

-- Устанавливаем права по умолчанию для будущих таблиц
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO casino_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO casino_user;

-- Создаем таблицу для миграций (если её нет)
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    version INTEGER NOT NULL UNIQUE,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- Создаем индексы для лучшей производительности
CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON schema_migrations(version);

-- Выводим информацию о созданной базе
SELECT 'Database casino_db initialized successfully!' as message;
