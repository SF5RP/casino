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
  const hasBeenConnectedRef = useRef(false);

  useEffect(() => {
    // Первое подключение - не показываем уведомление, только отмечаем что были подключены
    if (previousConnectedRef.current === null) {
      previousConnectedRef.current = isConnected;
      if (isConnected) {
        hasBeenConnectedRef.current = true;
      }
      return;
    }

    // Подключение восстановлено
    if (isConnected && !previousConnectedRef.current) {
      hasBeenConnectedRef.current = true;

      // Закрываем уведомление о переподключении если есть
      if (reconnectingSnackbarRef.current) {
        closeSnackbar(reconnectingSnackbarRef.current);
        reconnectingSnackbarRef.current = null;
      }

      // Показываем уведомление о восстановлении только если это не первое подключение
      if (hasBeenConnectedRef.current) {
        enqueueSnackbar('✅ Соединение восстановлено', {
          variant: 'success',
          autoHideDuration: 3000,
        });
      }
    }

    // Соединение потеряно - показываем только если уже были подключены
    if (!isConnected && previousConnectedRef.current && hasBeenConnectedRef.current) {
      enqueueSnackbar('❌ Соединение потеряно', {
        variant: 'error',
        autoHideDuration: 5000,
      });
    }

    previousConnectedRef.current = isConnected;
  }, [isConnected, enqueueSnackbar, closeSnackbar]);

  useEffect(() => {
    // Показываем уведомления о переподключении только начиная с 5-й попытки
    if (isReconnecting && reconnectAttempts >= 5) {
      // Закрываем предыдущее уведомление о переподключении
      if (reconnectingSnackbarRef.current) {
        closeSnackbar(reconnectingSnackbarRef.current);
      }

      // Вычисляем отображаемый номер попытки (5-я попытка = 1-я в уведомлении)
      const displayAttempt = reconnectAttempts - 4;

      // Показываем новое уведомление с дополнительной информацией для длительных попыток
      const getMessage = () => {
        if (displayAttempt <= 3) {
          return `🔄 Переподключение... (попытка ${displayAttempt})`;
        } else if (displayAttempt <= 7) {
          return `🔄 Переподключение... (попытка ${displayAttempt}) - проверьте соединение`;
        } else {
          return `🔄 Переподключение... (попытка ${displayAttempt}) - проблемы с сервером`;
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