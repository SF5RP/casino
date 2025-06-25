import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
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
  const sendTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);
  const tokenRef = useRef(token);

  // Обновляем токен при изменении
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  // Функция для подключения к WebSocket
  const connectWebSocket = useCallback(() => {
    if (!key || !shouldReconnectRef.current) return;

    try {
      console.log('🔄 Подключение к WebSocket...', WEBSOCKET_URL);
      const ws = new WebSocket(WEBSOCKET_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket подключен');
        setIsConnected(true);
        setIsReconnecting(false);
        setReconnectAttempts(0);
        setNeedsAuth(false);
        setAuthError(null);
        ws.send(JSON.stringify({ type: 'join', key, token: tokenRef.current }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'sync' && Array.isArray(data.history)) {
            setHistory(data.history);
          } else if (data.type === 'authRequired') {
            console.warn('🔐 Требуется авторизация для сессии:', data.key);
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
        
        // Только переподключаемся если это не намеренное закрытие
        if (shouldReconnectRef.current && event.code !== 1000) {
          handleReconnect();
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket ошибка:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('❌ Ошибка создания WebSocket:', error);
      if (shouldReconnectRef.current) {
        handleReconnect();
      }
    }
  }, [key]);

  // Функция для обработки переподключения
  const handleReconnect = useCallback(() => {
    if (!shouldReconnectRef.current) return;

    const baseDelay = WS_CONFIG.CONNECTION_OPTIONS.retryInterval;

    setIsReconnecting(true);
    setReconnectAttempts(prev => prev + 1);

    // Экспоненциальная задержка с максимумом 30 секунд: 2s, 4s, 8s, 16s, 30s, 30s, ...
    const delay = Math.min(baseDelay * Math.pow(2, reconnectAttempts), 30000);
    
    console.log(`🔄 Попытка переподключения ${reconnectAttempts + 1} через ${delay}ms`);

    reconnectTimeoutRef.current = setTimeout(() => {
      connectWebSocket();
    }, delay);
  }, [reconnectAttempts, connectWebSocket]);

  // Основной эффект для подключения
  useEffect(() => {
    if (!key) return;

    shouldReconnectRef.current = true;
    connectWebSocket();

    return () => {
      console.log('🧹 Очистка WebSocket соединения');
      shouldReconnectRef.current = false;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (sendTimeoutRef.current) {
        clearTimeout(sendTimeoutRef.current);
        sendTimeoutRef.current = null;
      }
      
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
        wsRef.current = null;
      }
      
      setIsConnected(false);
      setIsReconnecting(false);
      setReconnectAttempts(0);
    };
  }, [key, connectWebSocket]);

  // Отправка изменений (асинхронная)
  const sendHistory = useCallback((newHistory: RouletteNumber[] | ((prev: RouletteNumber[]) => RouletteNumber[])) => {
    console.time('sendHistory');
    console.log('🚀 Начало sendHistory, текущая история:', history.length);
    
    const startTime = performance.now();
    const updatedHistory = typeof newHistory === 'function' ? newHistory(history) : newHistory;
    const historyCalcTime = performance.now();
    console.log(`📊 Расчет новой истории: ${(historyCalcTime - startTime).toFixed(2)}ms`);
    
    // Сначала обновляем UI (синхронно)
    setHistory(updatedHistory);
    const setHistoryTime = performance.now();
    console.log(`💾 setHistory: ${(setHistoryTime - historyCalcTime).toFixed(2)}ms`);
    
    // Затем отправляем на сервер асинхронно с дебаунсингом (не блокируем UI)
    if (sendTimeoutRef.current) {
      clearTimeout(sendTimeoutRef.current);
    }
    
    sendTimeoutRef.current = setTimeout(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && key) {
        const wsStartTime = performance.now();
        wsRef.current.send(JSON.stringify({ 
          type: 'update', 
          key, 
          token: tokenRef.current,
          history: updatedHistory 
        }));
        const wsEndTime = performance.now();
        console.log(`🌐 WebSocket send (async): ${(wsEndTime - wsStartTime).toFixed(2)}ms`);
        console.log('📡 Отправлено на сервер:', updatedHistory.length, 'элементов');
      } else {
        console.log('❌ WebSocket не готов:', {
          wsReady: wsRef.current?.readyState === WebSocket.OPEN,
          hasKey: !!key,
          readyState: wsRef.current?.readyState
        });
      }
      sendTimeoutRef.current = null;
    }, 10); // 10ms задержка для группировки быстрых кликов
    
    console.timeEnd('sendHistory');
  }, [key, history]);

  // Функция для принудительного переподключения
  const forceReconnect = useCallback(() => {
    console.log('🔄 Принудительное переподключение...');
    shouldReconnectRef.current = true;
    setReconnectAttempts(0);
    
    // Закрываем текущее соединение если есть
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual reconnect');
      wsRef.current = null;
    }
    
    // Очищаем таймауты
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Подключаемся заново
    setIsReconnecting(true);
    setTimeout(() => {
      connectWebSocket();
    }, 100);
  }, [connectWebSocket]);

  // Если ключа нет — возвращаем заглушку, но хук всегда вызывается!
  if (!key) {
    return { 
      history: [], 
      setHistory: () => {}, 
      isConnected: false, 
      isReconnecting: false, 
      reconnectAttempts: 0,
      needsAuth: false,
      authError: null,
      forceReconnect: () => {}
    };
  }

  return { 
    history, 
    setHistory: sendHistory, 
    isConnected, 
    isReconnecting, 
    reconnectAttempts,
    needsAuth,
    authError,
    forceReconnect
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