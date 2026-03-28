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
} from "./authSlice";
import {
  refreshAccessToken,
  getCurrentUser,
  redirectToLogin as apiRedirectToLogin,
  logout as apiLogout,
} from "./authApi";

export function useAuth() {
  const dispatch = useDispatch();
  const auth = useSelector(selectAuth);
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const accessToken = useSelector(selectAccessToken);

  /**
   * Initialize auth state on mount
   * Tries to refresh access token from HttpOnly cookie
   */
  const initialize = useCallback(async () => {
    if (isAuthenticated) return; // Already initialized

    dispatch(setLoading(true));

    try {
      // Try to refresh access token
      const token = await refreshAccessToken();

      if (!token) {
        dispatch(setLoading(false));
        return;
      }

      // Get user profile
      const userProfile = await getCurrentUser(token);

      if (!userProfile) {
        dispatch(setLoading(false));
        return;
      }

      // Set auth state
      dispatch(
        setAuth({
          user: {
            id: userProfile.id,
            username: userProfile.username,
            email: userProfile.email,
            avatar: userProfile.avatar,
            role: userProfile.role,
          },
          accessToken: token,
        })
      );
    } catch (error) {
      console.error("Auth initialization error:", error);
      dispatch(setError("Ошибка инициализации"));
    }
  }, [dispatch, isAuthenticated]);

  /**
   * Refresh access token
   */
  const refresh = useCallback(async (): Promise<string | null> => {
    try {
      const token = await refreshAccessToken();

      if (!token) {
        // Refresh failed, clear auth
        dispatch(clearAuth());
        return null;
      }

      // Update token in store (не обновляем user, он тот же)
      dispatch(
        setAuth({
          user: user!,
          accessToken: token,
        })
      );

      return token;
    } catch (error) {
      console.error("Token refresh error:", error);
      dispatch(clearAuth());
      return null;
    }
  }, [dispatch, user]);

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
      // After OAuth, Auth service sets HttpOnly cookie
      // We just need to get access token and user info
      const token = await refreshAccessToken();

      if (!token) {
        throw new Error("Failed to get access token");
      }

      const userProfile = await getCurrentUser(token);

      if (!userProfile) {
        throw new Error("Failed to get user profile");
      }

      dispatch(
        setAuth({
          user: {
            id: userProfile.id,
            username: userProfile.username,
            email: userProfile.email,
            avatar: userProfile.avatar,
            role: userProfile.role,
          },
          accessToken: token,
        })
      );

      return true;
    } catch (error: unknown) {
      const message =
          error instanceof Error ? error.message : "Ошибка авторизации";

      console.error("OAuth callback error:", error);
      dispatch(setError(message));
      return false;
    }
  }, [dispatch]);

  return {
    // State
    user,
    isAuthenticated,
    accessToken,
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
