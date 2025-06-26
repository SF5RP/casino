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
  FormControlLabel,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import { Add, Lock, LockOpen } from '@mui/icons-material';

interface CreateRoomDialogProps {
  open: boolean;
  onSubmit: (roomKey: string, password?: string) => void;
  onCancel: () => void;
}

export const CreateRoomDialog: React.FC<CreateRoomDialogProps> = ({
                                                                    open,
                                                                    onSubmit,
                                                                    onCancel
                                                                  }) => {
  const [roomKey, setRoomKey] = useState('');
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!roomKey.trim()) {
      setError('Введите название комнаты');
      return;
    }

    if (usePassword && !password.trim()) {
      setError('Введите пароль или отключите защиту паролем');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      onSubmit(roomKey.trim(), usePassword ? password.trim() : undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRoomKey('');
    setPassword('');
    setUsePassword(false);
    setError(null);
    onCancel();
  };

  const generateRandomKey = () => {
    const randomKey = Math.random().toString(36).substring(2, 15);
    setRoomKey(randomKey);
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
        <Add color="primary" />
        <Typography variant="h6">
          Создать комнату
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Создайте новую комнату для игры в рулетку
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
            label="Название комнаты"
            value={roomKey}
            onChange={(e) => setRoomKey(e.target.value)}
            variant="outlined"
            disabled={isSubmitting}
            placeholder="Введите уникальное название комнаты"
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <Button
                  size="small"
                  onClick={generateRandomKey}
                  disabled={isSubmitting}
                  sx={{ minWidth: 'auto', px: 1 }}
                >
                  Случайное
                </Button>
              )
            }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={usePassword}
                onChange={(e) => setUsePassword(e.target.checked)}
                disabled={isSubmitting}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {usePassword ? <Lock fontSize="small" /> : <LockOpen fontSize="small" />}
                <Typography>Защитить паролем</Typography>
              </Box>
            }
            sx={{ mb: usePassword ? 2 : 0 }}
          />

          {usePassword && (
            <TextField
              fullWidth
              type="password"
              label="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              variant="outlined"
              disabled={isSubmitting}
              placeholder="Введите пароль для защиты комнаты"
              sx={{ mb: 2 }}
            />
          )}
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
          disabled={!roomKey.trim() || isSubmitting}
          variant="contained"
          color="primary"
        >
          {isSubmitting ? 'Создание...' : 'Создать комнату'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 