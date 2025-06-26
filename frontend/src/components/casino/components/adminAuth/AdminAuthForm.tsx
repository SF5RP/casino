import React, { useState } from 'react';
import { Alert, Box, Button, Container, IconButton, InputAdornment, Paper, TextField, Typography } from '@mui/material';
import { Lock, Visibility, VisibilityOff } from '@mui/icons-material';

interface AdminAuthFormProps {
  onAuth: (password: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

export const AdminAuthForm = ({ onAuth, isLoading = false, error }: AdminAuthFormProps) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.trim()) {
      onAuth(password.trim());
    }
  }

  function handleTogglePasswordVisibility() {
    setShowPassword(!showPassword);
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0a'
        }}
      >
        <Paper
          elevation={24}
          sx={{
            p: 4,
            backgroundColor: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: 2,
            width: '100%',
            maxWidth: 400
          }}
        >
          <Box textAlign="center" mb={3}>
            <Lock sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" color="white" gutterBottom>
              Админ-панель
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Введите пароль для доступа к панели администратора
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              label="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              sx={{
                mb: 3,
                '& .MuiInputLabel-root': { color: '#999' },
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': { borderColor: '#333' },
                  '&:hover fieldset': { borderColor: '#555' },
                  '&.Mui-focused fieldset': { borderColor: 'primary.main' }
                }
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={handleTogglePasswordVisibility}
                      edge="end"
                      sx={{ color: '#999' }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              autoFocus
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading || !password.trim()}
              sx={{
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 'bold'
              }}
            >
              {isLoading ? 'Проверка...' : 'Войти'}
            </Button>
          </form>

          <Box mt={3} textAlign="center">
            <Typography variant="caption" color="text.secondary">
              Casino Roulette Admin Panel v1.0
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}; 