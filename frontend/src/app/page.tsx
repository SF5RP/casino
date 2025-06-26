'use client';

import React, { useState } from 'react';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { CreateRoomDialog } from '@/components/casino/components/CreateRoomDialog';

interface Room {
  key: string;
  historyLength?: number;
  createdAt?: string;
  lastActivity?: string;
}

async function fetchRooms(): Promise<Room[]> {
  const res = await fetch('http://localhost:8080/api/roulette/sessions');
  if (!res.ok) throw new Error('Ошибка загрузки комнат');
  const data = await res.json();
  // Если сервер возвращает { sessions: [...] }
  if (Array.isArray(data.sessions)) return data.sessions;
  // Если сервер возвращает просто массив
  if (Array.isArray(data)) return data;
  return [];
}

export default function Home() {
  const { data: rooms, isLoading, isError, refetch } = useQuery({
    queryKey: ['rooms'],
    queryFn: fetchRooms,
  });
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [isCreateRoomOpen, setCreateRoomOpen] = useState(false);

  const handleCreateRoomSubmit = async (roomKey: string, password?: string) => {
    try {
      const res = await fetch('http://localhost:8080/api/rooms/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: roomKey, password: password || '' }),
      });

      if (!res.ok) {
        throw new Error((await res.json()).error || 'Не удалось создать комнату');
      }

      const { token } = await res.json();
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(`token_${roomKey}`, token);
      }

      setCreateRoomOpen(false);
      await refetch();
      router.push(`/room/${roomKey}`);
      enqueueSnackbar(`Комната "${roomKey}" успешно создана!`, { variant: 'success' });
    } catch (error: unknown) {
      enqueueSnackbar(error instanceof Error ? error.message : 'Неизвестная ошибка', { variant: 'error' });
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" color="white">Список кастомных комнат</Typography>
        <Button variant="contained" color="primary" onClick={() => setCreateRoomOpen(true)}>
          Создать комнату
        </Button>
      </Box>

      {isLoading && <CircularProgress />}
      {isError && <Alert severity="error">Ошибка загрузки комнат</Alert>}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {rooms && rooms.length > 0 ? rooms.map((room) => (
          <Box key={room.key} sx={{ backgroundColor: '#2a2a2a', padding: 2, borderRadius: 1 }}>
            <Typography variant="h6" color="white">Комната {room.key}</Typography>
            {room.historyLength !== undefined && (
              <Typography variant="body2" color="text.secondary">История: {room.historyLength} чисел</Typography>
            )}
            <Button variant="contained" sx={{ mt: 1 }} href={`/room/${room.key}`}>Перейти</Button>
          </Box>
        )) : !isLoading && <Typography color="text.secondary">Нет доступных комнат</Typography>}
      </Box>

      <CreateRoomDialog
        open={isCreateRoomOpen}
        onCancel={() => setCreateRoomOpen(false)}
        onSubmit={handleCreateRoomSubmit}
      />
    </Box>
  );
}
