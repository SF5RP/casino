# Используем официальный Node.js образ
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json (если есть)
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем исходный код
COPY . .

# Собираем Next.js приложение
RUN npm run build

# Открываем порты
EXPOSE 3000 3002

# Устанавливаем переменные окружения по умолчанию
ENV NODE_ENV=production
ENV APP_PORT=3000
ENV WS_PORT=3002

# Запускаем приложение
CMD ["node", "start-prod.js"] 