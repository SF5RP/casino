'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
} from '@mui/material';
import { Lock } from '@mui/icons-material';

interface PasswordEntryFormProps {
  roomKey: string;
  error?: string | null;
  onSubmit: (password: string) => void;
  isSubmitting?: boolean;
}

export const PasswordEntryForm: React.FC<PasswordEntryFormProps> = ({
  roomKey,
  error,
  onSubmit,
  isSubmitting,
}) => {
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    onSubmit(password);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
        p: 3,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          borderRadius: 2,
          maxWidth: 400,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <Lock sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
        <Typography variant="h5" component="h1" gutterBottom>
          Комната защищена
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Для доступа к комнате <Typography component="span" color="primary.main" fontWeight="bold">{roomKey}</Typography> введите пароль.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            autoFocus
            fullWidth
            type="password"
            label="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            variant="outlined"
            disabled={isSubmitting}
            sx={{ mb: 2 }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            disabled={!password.trim() || isSubmitting}
            size="large"
          >
            {isSubmitting ? 'Вход...' : 'Войти'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
}; 