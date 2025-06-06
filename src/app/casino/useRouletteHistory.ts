import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { WEBSOCKET_URL } from '../../config/websocket';

export function useRouletteWebSocket(key: string | undefined) {
  const [history, setHistory] = useState<(number | '00')[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Подключение к WebSocket
  useEffect(() => {
    if (!key) return;
    const ws = new window.WebSocket(WEBSOCKET_URL);
    wsRef.current = ws;
    ws.onopen = () => {
      setIsConnected(true);
      ws.send(JSON.stringify({ type: 'join', key }));
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'sync' && Array.isArray(data.history)) {
          setHistory(data.history);
        }
      } catch {}
    };
    ws.onclose = () => setIsConnected(false);
    return () => {
      ws.close();
      setIsConnected(false);
    };
  }, [key]);

  // Отправка изменений
  const sendHistory = useCallback((newHistory: (number | '00')[]) => {
    setHistory(newHistory);
    if (wsRef.current && wsRef.current.readyState === 1 && key) {
      wsRef.current.send(JSON.stringify({ type: 'update', key, history: newHistory }));
    }
  }, [key]);

  // Если ключа нет — возвращаем заглушку, но хук всегда вызывается!
  if (!key) {
    return { history: [], setHistory: () => {}, isConnected: false };
  }

  return { history, setHistory: sendHistory, isConnected };
}

export function useSaveRouletteHistory() {
  return useMutation({
    mutationFn: async (history: (number | '00')[]) => {
      const res = await fetch('/api/roulette/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history }),
      });
      if (!res.ok) throw new Error('Ошибка сохранения');
      return res.json() as Promise<{ key: string }>;
    },
  });
}

export function useFetchRouletteHistory(key: string | undefined) {
  return useQuery({
    queryKey: ['roulette-history', key],
    queryFn: async () => {
      if (!key) throw new Error('Нет ключа');
      const res = await fetch(`/api/roulette/${key}`);
      if (!res.ok) throw new Error('История не найдена');
      return res.json() as Promise<{ history: (number | '00')[] }>;
    },
    enabled: !!key,
    refetchInterval: key ? 5000 : false,
  });
}

export function usePatchRouletteHistory(key: string | undefined) {
  return useMutation({
    mutationFn: async (history: (number | '00')[]) => {
      if (!key) throw new Error('Нет ключа');
      const res = await fetch(`/api/roulette/${key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history }),
      });
      if (!res.ok) throw new Error('Ошибка синхронизации');
      return res.json();
    },
  });
} 