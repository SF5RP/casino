// Конфигурация WebSocket для клиента
export const WS_CONFIG = {
  // Порт по умолчанию для Go backend
  DEFAULT_PORT: 8080,

  // URL для подключения (можно переопределить через переменные окружения)
  getWebSocketUrl: () => {
    // Если задан полный URL - используем его
    if (process.env.NEXT_PUBLIC_WS_URL) {
      return process.env.NEXT_PUBLIC_WS_URL;
    }

    // Проверяем переменные окружения Next.js
    const wsPort = process.env.NEXT_PUBLIC_WS_PORT || '8080';
    const wsHost = process.env.NEXT_PUBLIC_WS_HOST || 'localhost';
    const wsProtocol = process.env.NEXT_PUBLIC_WS_PROTOCOL || 'ws';

    // В production через Nginx используем стандартные порты
    if (process.env.NODE_ENV === 'production' && wsHost !== 'localhost') {
      const protocol = wsProtocol === 'wss' ? 'wss' : 'ws';
      return `${protocol}://${wsHost}/ws`;
    }

    // Для разработки собираем URL из частей
    return `${wsProtocol}://${wsHost}:${wsPort}/ws`;
  },

  // Настройки подключения
  CONNECTION_OPTIONS: {
    // Время ожидания подключения (мс)
    timeout: 5000,

    // Количество попыток переподключения
    maxRetries: 5,

    // Интервал между попытками переподключения (мс)
    retryInterval: 2000,
  }
};

// Экспортируем готовый URL
export const WEBSOCKET_URL = WS_CONFIG.getWebSocketUrl(); 