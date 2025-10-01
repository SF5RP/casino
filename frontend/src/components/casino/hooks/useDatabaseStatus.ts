import { useState, useEffect, useCallback } from "react";

interface DatabaseStatus {
  isConnected: boolean;
  isChecking: boolean;
  error?: string;
  lastChecked?: Date;
}

export function useDatabaseStatus() {
  const [status, setStatus] = useState<DatabaseStatus>({
    isConnected: true, // Предполагаем что подключено по умолчанию
    isChecking: false,
  });

  const checkDatabaseStatus = useCallback(async () => {
    setStatus((prev) => ({ ...prev, isChecking: true }));

    try {
      // В режиме разработки используем относительный URL для прокси
      const isDevelopment = process.env.NODE_ENV === "development";
      const apiUrl = isDevelopment
        ? "/api"
        : process.env.NEXT_PUBLIC_API_URL || "/api";
      const fullUrl = `${apiUrl}/health/database`;

      console.log(`Проверка статуса БД: ${fullUrl}`);

      const response = await fetch(fullUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        // Добавляем timeout для лучшей диагностики
        signal: AbortSignal.timeout(10000),
      });

      console.log(`Ответ сервера: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        console.log("Данные от сервера:", data);
        setStatus({
          isConnected: data.connected || false,
          isChecking: false,
          error: data.error,
          lastChecked: new Date(),
        });
      } else {
        // Получаем текст ошибки от сервера
        let errorText = "";
        try {
          errorText = await response.text();
        } catch {
          errorText = "Не удалось получить текст ошибки";
        }

        const detailedError = `HTTP ${response.status}: ${response.statusText}\nURL: ${fullUrl}\nДетали: ${errorText}`;

        setStatus({
          isConnected: false,
          isChecking: false,
          error: detailedError,
          lastChecked: new Date(),
        });
      }
    } catch (error) {
      console.error("Database status check failed:", error);

      let detailedError = "";
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          detailedError = "Таймаут запроса (10 секунд). Сервер не отвечает.";
        } else if (
          error.name === "TypeError" &&
          error.message.includes("fetch")
        ) {
          detailedError = `Ошибка сети: ${
            error.message
          }\nВозможные причины:\n- Сервер не запущен\n- Неправильный URL: ${
            process.env.NEXT_PUBLIC_API_URL || "/api"
          }\n- Проблемы с CORS\n- Блокировка файрволом`;
        } else {
          detailedError = `Ошибка: ${error.name}: ${error.message}`;
        }
      } else {
        detailedError = `Неизвестная ошибка: ${String(error)}`;
      }

      setStatus({
        isConnected: false,
        isChecking: false,
        error: detailedError,
        lastChecked: new Date(),
      });
    }
  }, []);

  // Проверяем статус при монтировании компонента
  useEffect(() => {
    checkDatabaseStatus();
  }, [checkDatabaseStatus]);

  // Автоматическая проверка каждые 30 секунд
  useEffect(() => {
    const interval = setInterval(() => {
      checkDatabaseStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, [checkDatabaseStatus]);

  return {
    ...status,
    checkDatabaseStatus,
  };
}
