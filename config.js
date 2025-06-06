const config = {
  // Порт для основного Next.js приложения
  APP_PORT: process.env.APP_PORT || 3000,
  
  // Порт для WebSocket сервера
  WS_PORT: process.env.WS_PORT || 3002,
  
  // URL для подключения клиента (можно переопределить через переменную окружения)
  WS_URL: process.env.WS_URL || `ws://localhost:${process.env.WS_PORT || 3002}`,
  
  // Настройки для разработки и продакшена
  development: {
    APP_PORT: 3000,
    WS_PORT: 3002,
    WS_URL: 'ws://localhost:3002'
  },
  
  production: {
    APP_PORT: process.env.PORT || 3000,
    WS_PORT: process.env.WS_PORT || 3002,
    WS_URL: process.env.WS_URL || `ws://localhost:${process.env.WS_PORT || 3002}`
  }
};

// Экспортируем конфигурацию в зависимости от окружения
const env = process.env.NODE_ENV || 'development';
const envConfig = config[env] || config.development;

module.exports = {
  ...config,
  ...envConfig
}; 