// Конфигурация API для клиента
export const API_CONFIG = {
  // Базовый URL для API
  getApiUrl: () => {
    // Если задан полный URL - используем его
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }

    // Проверяем переменные окружения Next.js
    const apiPort = process.env.NEXT_PUBLIC_API_PORT || '8080';
    const apiHost = process.env.NEXT_PUBLIC_API_HOST || 'localhost';
    const apiProtocol = process.env.NEXT_PUBLIC_API_PROTOCOL || 'http';

    // В production через Nginx используем стандартные порты
    if (process.env.NODE_ENV === 'production' && apiHost !== 'localhost') {
      const protocol = apiProtocol === 'https' ? 'https' : 'http';
      return `${protocol}://${apiHost}/api`;
    }

    // Для разработки собираем URL из частей
    return `${apiProtocol}://${apiHost}:${apiPort}/api`;
  },

  // Настройки запросов
  REQUEST_OPTIONS: {
    // Время ожидания запроса (мс)
    timeout: 10000,

    // Заголовки по умолчанию
    headers: {
      'Content-Type': 'application/json',
    },
  }
};

// Экспортируем готовый URL
export const API_BASE_URL = API_CONFIG.getApiUrl();

// Хелпер для создания полного URL к API endpoint
export function createApiUrl(endpoint: string): string {
  const baseUrl = API_BASE_URL;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${baseUrl}/${cleanEndpoint}`;
}

// Хелпер для fetch с настройками по умолчанию
export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = createApiUrl(endpoint);
  
  const config: RequestInit = {
    ...API_CONFIG.REQUEST_OPTIONS,
    ...options,
    headers: {
      ...API_CONFIG.REQUEST_OPTIONS.headers,
      ...options.headers,
    },
  };

  return fetch(url, config);
} 