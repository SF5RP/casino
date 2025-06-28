package database

import (
	"testing"
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