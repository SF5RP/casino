import { useEffect, useRef } from 'react';
import { useSnackbar } from 'notistack';

interface UseConnectionNotificationsProps {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
}

export function useConnectionNotifications({
  isConnected,
  isReconnecting,
  reconnectAttempts
}: UseConnectionNotificationsProps) {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const previousConnectedRef = useRef<boolean | null>(null);
  const reconnectingSnackbarRef = useRef<string | number | null>(null);

  useEffect(() => {
    // Первое подключение - не показываем уведомление
    if (previousConnectedRef.current === null) {
      previousConnectedRef.current = isConnected;
      return;
    }

    // Подключение восстановлено
    if (isConnected && !previousConnectedRef.current) {
      // Закрываем уведомление о переподключении если есть
      if (reconnectingSnackbarRef.current) {
        closeSnackbar(reconnectingSnackbarRef.current);
        reconnectingSnackbarRef.current = null;
      }
      
      enqueueSnackbar('✅ Соединение восстановлено', { 
        variant: 'success',
        autoHideDuration: 3000,
      });
    }

    // Соединение потеряно
    if (!isConnected && previousConnectedRef.current) {
      enqueueSnackbar('❌ Соединение потеряно', { 
        variant: 'error',
        autoHideDuration: 5000,
      });
    }

    previousConnectedRef.current = isConnected;
  }, [isConnected, enqueueSnackbar, closeSnackbar]);

  useEffect(() => {
    if (isReconnecting && reconnectAttempts > 0) {
      // Закрываем предыдущее уведомление о переподключении
      if (reconnectingSnackbarRef.current) {
        closeSnackbar(reconnectingSnackbarRef.current);
      }

      // Показываем новое уведомление с дополнительной информацией для длительных попыток
      const getMessage = () => {
        if (reconnectAttempts <= 3) {
          return `🔄 Переподключение... (попытка ${reconnectAttempts})`;
        } else if (reconnectAttempts <= 7) {
          return `🔄 Переподключение... (попытка ${reconnectAttempts}) - проверьте соединение`;
        } else {
          return `🔄 Переподключение... (попытка ${reconnectAttempts}) - проблемы с сервером`;
        }
      };

      reconnectingSnackbarRef.current = enqueueSnackbar(
        getMessage(), 
        { 
          variant: 'info',
          persist: true, // Не скрываем автоматически
        }
      );
    } else if (!isReconnecting && reconnectingSnackbarRef.current) {
      // Закрываем уведомление когда переподключение завершено
      closeSnackbar(reconnectingSnackbarRef.current);
      reconnectingSnackbarRef.current = null;
    }
  }, [isReconnecting, reconnectAttempts, enqueueSnackbar, closeSnackbar]);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (reconnectingSnackbarRef.current) {
        closeSnackbar(reconnectingSnackbarRef.current);
      }
    };
  }, [closeSnackbar]);
} 