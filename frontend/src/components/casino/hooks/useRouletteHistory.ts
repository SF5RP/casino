import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { WEBSOCKET_URL } from '../../../config/websocket';
import { rouletteApi } from '../../../lib/api/rouletteApi';
import type { RouletteNumber } from '../types/rouletteTypes';

export function useRouletteWebSocket(key: string | undefined) {
  const [history, setHistory] = useState<RouletteNumber[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const sendTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      if (sendTimeoutRef.current) {
        clearTimeout(sendTimeoutRef.current);
        sendTimeoutRef.current = null;
      }
    };
  }, [key]);

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
      if (wsRef.current && wsRef.current.readyState === 1 && key) {
        const wsStartTime = performance.now();
        wsRef.current.send(JSON.stringify({ type: 'update', key, history: updatedHistory }));
        const wsEndTime = performance.now();
        console.log(`🌐 WebSocket send (async): ${(wsEndTime - wsStartTime).toFixed(2)}ms`);
        console.log('📡 Отправлено на сервер:', updatedHistory.length, 'элементов');
      } else {
        console.log('❌ WebSocket не готов:', {
          wsReady: wsRef.current?.readyState === 1,
          hasKey: !!key
        });
      }
      sendTimeoutRef.current = null;
    }, 10); // 10ms задержка для группировки быстрых кликов
    
    console.timeEnd('sendHistory');
  }, [key, history]);

  // Если ключа нет — возвращаем заглушку, но хук всегда вызывается!
  if (!key) {
    return { history: [], setHistory: () => {}, isConnected: false };
  }

  return { history, setHistory: sendHistory, isConnected };
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