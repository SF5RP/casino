'use client';

import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography
} from '@mui/material';
import { Lock } from '@mui/icons-material';

interface PasswordDialogProps {
  open: boolean;
  sessionKey: string;
  error?: string | null;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}

export const PasswordDialog: React.FC<PasswordDialogProps> = ({
                                                                open,
                                                                sessionKey,
                                                                error,
                                                                onSubmit,
                                                                onCancel
                                                              }) => {
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsSubmitting(true);
    try {
      onSubmit(password);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    onCancel();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          bgcolor: 'background.paper'
        }
      }}
    >
      <DialogTitle sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        pb: 1
      }}>
        <Lock color="primary" />
        <Typography variant="h6">
          Вход в комнату
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Комната <strong>{sessionKey}</strong> защищена паролем
          </Typography>
        </Box>

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
            placeholder="Введите пароль для входа в комнату"
            sx={{ mb: 2 }}
          />
        </form>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={handleClose}
          disabled={isSubmitting}
          color="inherit"
        >
          Отмена
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!password.trim() || isSubmitting}
          variant="contained"
          color="primary"
        >
          {isSubmitting ? 'Подключение...' : 'Войти'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 