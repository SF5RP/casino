import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setAuth,
  clearAuth,
  setLoading,
  setError,
  selectAuth,
  selectUser,
  selectIsAuthenticated,
  selectAccessToken,
  selectRefreshToken,
} from "./authSlice";
import {
  refreshAccessToken,
  getCurrentUser,
  redirectToLogin as apiRedirectToLogin,
  logout as apiLogout,
} from "./authApi";
import {
  clearStoredTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  storeTokens,
} from "./authStorage";

export function useAuth() {
  const dispatch = useDispatch();
  const auth = useSelector(selectAuth);
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const accessToken = useSelector(selectAccessToken);
  const refreshToken = useSelector(selectRefreshToken);

  const applyUserSession = useCallback(
    (token: string, nextRefreshToken: string | null, userProfile: Awaited<ReturnType<typeof getCurrentUser>>) => {
      if (!userProfile) {
        return;
      }

      dispatch(
        setAuth({
          user: {
            id: String(userProfile.id),
            username: userProfile.username,
            email: userProfile.email,
            avatar: userProfile.avatar,
            role: userProfile.role,
          },
          accessToken: token,
          refreshToken: nextRefreshToken,
        })
      );
    },
    [dispatch]
  );

  /**
   * Initialize auth state on mount
   * Tries to restore tokens from storage and refresh access token if needed.
   */
  const initialize = useCallback(async () => {
    if (isAuthenticated) return; // Already initialized

    dispatch(setLoading(true));

    try {
      const storedAccessToken = getStoredAccessToken();
      const storedRefreshToken = getStoredRefreshToken();

      if (storedAccessToken) {
        const userProfile = await getCurrentUser(storedAccessToken);
        if (userProfile) {
          applyUserSession(storedAccessToken, storedRefreshToken, userProfile);
          return;
        }
      }

      if (!storedRefreshToken) {
        clearStoredTokens();
        dispatch(clearAuth());
        dispatch(setLoading(false));
        return;
      }

      const token = await refreshAccessToken(storedRefreshToken);
      if (!token) {
        clearStoredTokens();
        dispatch(clearAuth());
        dispatch(setLoading(false));
        return;
      }

      storeTokens(token, storedRefreshToken);
      const userProfile = await getCurrentUser(token);

      if (!userProfile) {
        clearStoredTokens();
        dispatch(clearAuth());
        dispatch(setLoading(false));
        return;
      }

      applyUserSession(token, storedRefreshToken, userProfile);
    } catch (error) {
      console.error("Auth initialization error:", error);
      clearStoredTokens();
      dispatch(clearAuth());
      dispatch(setError("Ошибка инициализации"));
    }
  }, [applyUserSession, dispatch, isAuthenticated]);

  /**
   * Refresh access token
   */
  const refresh = useCallback(async (): Promise<string | null> => {
    try {
      const activeRefreshToken = refreshToken || getStoredRefreshToken();
      if (!activeRefreshToken) {
        clearStoredTokens();
        dispatch(clearAuth());
        return null;
      }

      const token = await refreshAccessToken(activeRefreshToken);

      if (!token) {
        // Refresh failed, clear auth
        clearStoredTokens();
        dispatch(clearAuth());
        return null;
      }

      storeTokens(token, activeRefreshToken);

      // Update token in store (не обновляем user, он тот же)
      dispatch(
        setAuth({
          user: user!,
          accessToken: token,
          refreshToken: activeRefreshToken,
        })
      );

      return token;
    } catch (error) {
      console.error("Token refresh error:", error);
      clearStoredTokens();
      dispatch(clearAuth());
      return null;
    }
  }, [dispatch, refreshToken, user]);

  /**
   * Redirect to Auth service login
   */
  const login = useCallback(() => {
    apiRedirectToLogin();
  }, []);

  /**
   * Logout user
   */
  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      clearStoredTokens();
      dispatch(clearAuth());
    }
  }, [dispatch]);

  /**
   * Handle a successful OAuth callback
   * Called from /auth/callback page
   */

  const handleCallback = useCallback(async () => {
    dispatch(setLoading(true));

    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("access_token");
      const nextRefreshToken = params.get("refresh_token");

      if (!token || !nextRefreshToken) {
        throw new Error("Failed to get access token");
      }

      storeTokens(token, nextRefreshToken);

      const userProfile = await getCurrentUser(token);

      if (!userProfile) {
        throw new Error("Failed to get user profile");
      }

      applyUserSession(token, nextRefreshToken, userProfile);

      return true;
    } catch (error: unknown) {
      const message =
          error instanceof Error ? error.message : "Ошибка авторизации";

      console.error("OAuth callback error:", error);
      clearStoredTokens();
      dispatch(clearAuth());
      dispatch(setError(message));
      return false;
    }
  }, [applyUserSession, dispatch]);

  return {
    // State
    user,
    isAuthenticated,
    accessToken,
    refreshToken,
    isLoading: auth.isLoading,
    error: auth.error,

    // Methods
    initialize,
    refresh,
    login,
    logout,
    handleCallback,
  };
}
