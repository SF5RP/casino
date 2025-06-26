import { useEffect, useState } from 'react';

const ADMIN_PASSWORD = 'admin123'; // В реальном приложении это должно быть в переменных окружения
const AUTH_STORAGE_KEY = 'casino_admin_auth';
const AUTH_EXPIRY_HOURS = 24;

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useAdminAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    error: null
  });

  // Проверяем сохраненную авторизацию при загрузке
  useEffect(() => {
    const checkSavedAuth = () => {
      try {
        const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
        if (savedAuth) {
          const { timestamp, authenticated } = JSON.parse(savedAuth);
          const now = Date.now();
          const expiryTime = timestamp + (AUTH_EXPIRY_HOURS * 60 * 60 * 1000);

          if (authenticated && now < expiryTime) {
            setAuthState({
              isAuthenticated: true,
              isLoading: false,
              error: null
            });
            return;
          } else {
            // Авторизация истекла
            localStorage.removeItem(AUTH_STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error('Error checking saved auth:', error);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }

      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    };

    checkSavedAuth();
  }, []);

  const authenticate = async (password: string) => {
    setAuthState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    // Имитируем задержку для проверки пароля
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (password === ADMIN_PASSWORD) {
      const authData = {
        authenticated: true,
        timestamp: Date.now()
      };

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));

      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
    } else {
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        error: 'Неверный пароль'
      });
    }
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      error: null
    });
  };

  const clearError = () => {
    setAuthState(prev => ({
      ...prev,
      error: null
    }));
  };

  return {
    ...authState,
    authenticate,
    logout,
    clearError
  };
} 