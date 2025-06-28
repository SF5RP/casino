import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { WEBSOCKET_URL, WS_CONFIG } from '../../../config/websocket';
import { rouletteApi } from '../../../lib/api/rouletteApi';
import type { RouletteNumber } from '../types/rouletteTypes';

export function useRouletteWebSocket(key: string | undefined, token?: string) {
  const [history, setHistory] = useState<RouletteNumber[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);
  const tokenRef = useRef(token);
  const reconnectAttemptsRef = useRef(0);

  const connectWebSocketFn = useRef<(() => void) | null>(null);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const handleReconnect = useCallback(() => {
    if (!shouldReconnectRef.current || (wsRef.current && wsRef.current.readyState === WebSocket.OPEN)) return;

    reconnectAttemptsRef.current += 1;
    setReconnectAttempts(reconnectAttemptsRef.current);
    setIsReconnecting(true);

    const delay = Math.min(WS_CONFIG.CONNECTION_OPTIONS.retryInterval * Math.pow(2, reconnectAttemptsRef.current), 30000);

    console.log(`🔄 Попытка переподключения ${reconnectAttemptsRef.current} через ${delay}ms`);

    reconnectTimeoutRef.current = setTimeout(() => {
      connectWebSocketFn.current?.();
    }, delay);
  }, []);

  const connectWebSocket = useCallback(() => {
    if (!key || !shouldReconnectRef.current) return;

    // Проверяем, есть ли уже активное соединение
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('🔗 WebSocket уже подключен, пропускаем создание нового соединения');
      return;
    }

    // Очищаем предыдущее соединение, если оно есть
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }

    console.log('🔄 Подключение к WebSocket...', WEBSOCKET_URL);
    const ws = new WebSocket(WEBSOCKET_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ WebSocket подключен');
      setIsConnected(true);
      setIsReconnecting(false);
      reconnectAttemptsRef.current = 0;
      setReconnectAttempts(0);
      setNeedsAuth(false);
      setAuthError(null);

      ws.send(JSON.stringify({
        type: 'join',
        key,
        token: tokenRef.current,
        version: 0, // Убираем зависимость от history.length
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.key && data.key !== key) return;

        if (data.type === 'sync' && Array.isArray(data.history)) {
          setHistory(data.history);
        } else if (data.type === 'add' && data.number !== undefined) {
          setHistory(prev => (prev[prev.length - 1] === data.number ? prev : [...prev, data.number]));
        } else if (data.type === 'remove') {
          setHistory(prev => prev.filter((_, i) => i !== data.index));
        } else if (data.type === 'authRequired') {
          setNeedsAuth(true);
          setAuthError(data.error || 'Требуется токен');
          setIsConnected(false);
        } else if (data.type === 'error') {
          console.error('❌ Ошибка от сервера:', data.error);
          setAuthError(data.error);
        }
      } catch (error) {
        console.error('❌ Ошибка парсинга WebSocket сообщения:', error);
      }
    };

    ws.onclose = (event) => {
      console.log('🔌 WebSocket закрыт:', event.code, event.reason);
      setIsConnected(false);
      if (shouldReconnectRef.current && event.code !== 1000) {
        handleReconnect();
      }
    };

    ws.onerror = () => {
      console.error('❌ WebSocket ошибка:');
      setIsConnected(false);
      // onclose будет вызван автоматически после onerror, он и запустит handleReconnect
    };
  }, [key, handleReconnect]);

  useEffect(() => {
    connectWebSocketFn.current = connectWebSocket;
  }, [connectWebSocket]);

  // Инициализация соединения только при изменении ключа
  useEffect(() => {
    if (!key) return;

    shouldReconnectRef.current = true;
    
    // Создаем соединение только если его еще нет
    if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
      connectWebSocketFn.current?.();
    }

    return () => {
      console.log('🧹 Очистка WebSocket соединения');
      shouldReconnectRef.current = false;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [key]); // Только зависимость от ключа

  const sendOptimisticUpdate = useCallback((message: object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.error("❌ WebSocket не готов для отправки.");
    }
  }, []);

  const addNumber = useCallback((number: RouletteNumber) => {
    setHistory(prev => [...prev, number]);
    sendOptimisticUpdate({
      type: 'add',
      key,
      token: tokenRef.current,
      number,
    });
  }, [key, sendOptimisticUpdate]);

  const removeNumberAtIndex = useCallback((index: number) => {
    setHistory(prev => prev.filter((_, i) => i !== index));
    sendOptimisticUpdate({
      type: 'remove',
      key,
      token: tokenRef.current,
      index,
    });
  }, [key, sendOptimisticUpdate]);

  const forceReconnect = useCallback(() => {
    console.log('🔄 Принудительное переподключение...');
    if (wsRef.current) {
      wsRef.current.close(4000, 'Manual reconnect');
    }
    handleReconnect();
  }, [handleReconnect]);

  return {
    history,
    addNumber,
    removeNumberAtIndex,
    isConnected,
    isReconnecting,
    reconnectAttempts,
    needsAuth,
    authError,
    forceReconnect,
  };
}

export function useSaveRouletteHistory() {
  return useMutation({
    mutationFn: async (data: { key: string; number: RouletteNumber }) => {
      // Используем Go backend API
      const session = await rouletteApi.saveNumber(data.key, data.number);
      return { key: data.key, session };
    },
  });
}

export function useFetchRouletteHistory(key: string | undefined) {
  return useQuery({
    queryKey: ['roulette-history', key],
    queryFn: async () => {
      if (!key) throw new Error('Нет ключа');
      // Используем Go backend API
      const history = await rouletteApi.getHistory(key);
      return { history };
    },
    enabled: !!key,
    refetchInterval: key ? 5000 : false,
  });
}

export function usePatchRouletteHistory(key: string | undefined) {
  return useMutation({
    mutationFn: async (history: RouletteNumber[]) => {
      if (!key) throw new Error('Нет ключа');
      // Используем Go backend API
      const session = await rouletteApi.updateHistory(key, history);
      return session;
    },
  });
} 