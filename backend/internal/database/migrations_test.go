package database

import (
	"testing"
	"github.com/stretchr/testify/assert"
)

func TestSplitSQLStatements(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected interface{}
	}{
		{
			name:  "simple statements",
			input: "CREATE TABLE test (id INT); DROP TABLE test;",
			expected: []string{
				"CREATE TABLE test (id INT)",
				"DROP TABLE test",
			},
		},
		{
			name: "dollar quoted function",
			input: `
				CREATE OR REPLACE FUNCTION update_updated_at_column()
				RETURNS TRIGGER AS $$
				BEGIN
					NEW.updated_at = NOW();
					RETURN NEW;
				END;
				$$ language 'plpgsql';
				
				CREATE TRIGGER test_trigger BEFORE UPDATE ON test FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
			`,
			expected: []string{
				`CREATE OR REPLACE FUNCTION update_updated_at_column()
	RETURNS TRIGGER AS $$
	BEGIN
	NEW.updated_at = NOW();
	RETURN NEW;
	END;
	$$ language 'plpgsql'`,
				"CREATE TRIGGER test_trigger BEFORE UPDATE ON test FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()",
			},
		},
		{
			name: "real migration 2",
			input: `
				-- Create or replace function to update updated_at column
				CREATE OR REPLACE FUNCTION update_updated_at_column()
				RETURNS TRIGGER AS $$
				BEGIN
					NEW.updated_at = NOW();
					RETURN NEW;
				END;
				$$ language 'plpgsql';

				-- Create trigger for roulette_sessions table
				DROP TRIGGER IF EXISTS update_roulette_sessions_updated_at ON roulette_sessions;
				CREATE TRIGGER update_roulette_sessions_updated_at
					BEFORE UPDATE ON roulette_sessions
					FOR EACH ROW
					EXECUTE FUNCTION update_updated_at_column();
			`,
			expected: 3, // Ожидаем 3 команды
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := splitSQLStatements(tt.input)
			
			if tt.name == "real migration 2" {
				// Для реальной миграции 2 всегда показываем результат
				t.Logf("Migration 2 parsed into %d statements:", len(result))
				for i, stmt := range result {
					t.Logf("Statement %d: %q", i+1, stmt)
				}
				
				expectedCount := tt.expected.(int)
				if len(result) != expectedCount {
					t.Errorf("Expected %d statements, got %d", expectedCount, len(result))
				}
				return
			}
			
			// Для остальных тестов проверяем точное соответствие
			expectedStmts := tt.expected.([]string)
			if len(result) != len(expectedStmts) {
				t.Errorf("Expected %d statements, got %d", len(expectedStmts), len(result))
				t.Errorf("Expected: %v", expectedStmts)
				t.Errorf("Got: %v", result)
				return
			}
			
			for i, stmt := range result {
				if stmt != expectedStmts[i] {
					t.Errorf("Statement %d mismatch:\nExpected: %q\nGot: %q", i, expectedStmts[i], stmt)
				}
			}
		})
	}
}

func TestSplitSQLStatements_Migration1_InitialTables(t *testing.T) {
	migrationSQL := `
		CREATE TABLE IF NOT EXISTS roulette_sessions (
			id SERIAL PRIMARY KEY,
			key VARCHAR(255) UNIQUE NOT NULL,
			password VARCHAR(255),
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS roulette_numbers (
			id SERIAL PRIMARY KEY,
			session_id INTEGER NOT NULL REFERENCES roulette_sessions(id) ON DELETE CASCADE,
			number TEXT NOT NULL,
			position INTEGER NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			UNIQUE(session_id, position)
		);

		CREATE INDEX IF NOT EXISTS idx_roulette_sessions_key ON roulette_sessions(key);
		CREATE INDEX IF NOT EXISTS idx_roulette_numbers_session_id ON roulette_numbers(session_id);
		CREATE INDEX IF NOT EXISTS idx_roulette_numbers_position ON roulette_numbers(session_id, position);
	`

	statements := splitSQLStatements(migrationSQL)

	assert.Equal(t, 5, len(statements), "Should split into 5 statements")
	assert.Contains(t, statements[0], "CREATE TABLE IF NOT EXISTS roulette_sessions")
	assert.Contains(t, statements[1], "CREATE TABLE IF NOT EXISTS roulette_numbers")
	assert.Contains(t, statements[2], "CREATE INDEX IF NOT EXISTS idx_roulette_sessions_key")
	assert.Contains(t, statements[3], "CREATE INDEX IF NOT EXISTS idx_roulette_numbers_session_id")
	assert.Contains(t, statements[4], "CREATE INDEX IF NOT EXISTS idx_roulette_numbers_position")
}

func TestSplitSQLStatements_Migration2_FunctionAndTrigger(t *testing.T) {
	migrationSQL := `
		CREATE OR REPLACE FUNCTION update_updated_at_column()
		RETURNS TRIGGER AS $$
		BEGIN
			NEW.updated_at = NOW();
			RETURN NEW;
		END;
		$$ language 'plpgsql';

		CREATE TRIGGER update_roulette_sessions_updated_at
			BEFORE UPDATE ON roulette_sessions
			FOR EACH ROW
			EXECUTE FUNCTION update_updated_at_column();
	`

	statements := splitSQLStatements(migrationSQL)

	assert.Equal(t, 2, len(statements), "Should split into 2 statements")
	assert.Contains(t, statements[0], "CREATE OR REPLACE FUNCTION")
	assert.Contains(t, statements[0], "$$")
	assert.Contains(t, statements[0], "language 'plpgsql'")
	assert.NotContains(t, statements[0], "CREATE TRIGGER")
	assert.Contains(t, statements[1], "CREATE TRIGGER")
}

func TestSplitSQLStatements_SingleLineWithSemicolons(t *testing.T) {
	migrationSQL := `DROP TABLE IF EXISTS test1; DROP TABLE IF EXISTS test2;`
	statements := splitSQLStatements(migrationSQL)
	assert.Equal(t, 2, len(statements))
	assert.Equal(t, "DROP TABLE IF EXISTS test1", statements[0])
	assert.Equal(t, "DROP TABLE IF EXISTS test2", statements[1])
}

func TestSplitSQLStatements_WithCommentsAndEmptyLines(t *testing.T) {
	migrationSQL := `
		-- Create a new table for users
		CREATE TABLE users (id INT); -- user id column

		-- And another for products
		CREATE TABLE products (id INT);
	`
	statements := splitSQLStatements(migrationSQL)
	assert.Equal(t, 2, len(statements))
	assert.Equal(t, "CREATE TABLE users (id INT)", statements[0])
	assert.Equal(t, "CREATE TABLE products (id INT)", statements[1])
}

func TestSplitSQLStatements_NoStatements(t *testing.T) {
	migrationSQL := `
		-- This is just a comment.
		-- And another one.
	`
	statements := splitSQLStatements(migrationSQL)
	assert.Equal(t, 0, len(statements))
}

func TestSplitSQLStatements_QuotedSemicolon(t *testing.T) {
	migrationSQL := `INSERT INTO messages (id, content) VALUES (1, 'Hello; world'); SELECT * FROM users;`
	statements := splitSQLStatements(migrationSQL)
	assert.Equal(t, 2, len(statements))
	assert.Equal(t, "INSERT INTO messages (id, content) VALUES (1, 'Hello; world')", statements[0])
	assert.Equal(t, "SELECT * FROM users", statements[1])
}

func TestSplitSQLStatements_DollarQuotedFunctionWithInternalSemicolons(t *testing.T) {
	migrationSQL := `
		CREATE FUNCTION get_users() RETURNS text AS $$
		DECLARE
			r RECORD;
			res TEXT := '';
		BEGIN
			FOR r IN SELECT * FROM users LOOP
				res := res || r.name || ';';
			END LOOP;
			RETURN res;
		END;
		$$ LANGUAGE plpgsql;
	`
	statements := splitSQLStatements(migrationSQL)
	assert.Equal(t, 1, len(statements))
	assert.Contains(t, statements[0], "CREATE FUNCTION")
	assert.Contains(t, statements[0], "res := res || r.name || ';'")
} 