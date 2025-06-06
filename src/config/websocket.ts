// Конфигурация WebSocket для клиента
export const WS_CONFIG = {
  // Порт по умолчанию
  DEFAULT_PORT: 3002,
  
  // URL для подключения (можно переопределить через переменные окружения)
  getWebSocketUrl: () => {
    // Проверяем переменные окружения Next.js
    const wsPort = process.env.NEXT_PUBLIC_WS_PORT || '3002';
    const wsHost = process.env.NEXT_PUBLIC_WS_HOST || 'localhost';
    const wsProtocol = process.env.NEXT_PUBLIC_WS_PROTOCOL || 'ws';
    
    // В продакшене можно использовать полный URL
    if (process.env.NEXT_PUBLIC_WS_URL) {
      return process.env.NEXT_PUBLIC_WS_URL;
    }
    
    // Для разработки собираем URL из частей
    return `${wsProtocol}://${wsHost}:${wsPort}`;
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