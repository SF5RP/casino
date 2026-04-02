import { store } from "@/store";
import { refreshAccessToken } from "@/features/auth/authApi";
import { updateAccessToken, clearAuth } from "@/features/auth";
import { clearStoredTokens, getStoredRefreshToken, storeTokens } from "@/features/auth/authStorage";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8011";

interface RequestConfig extends RequestInit {
  skipAuth?: boolean;
}

function buildHeaders(
  initial: HeadersInit | undefined,
  accessToken: string | null | undefined,
  skipAuth: boolean
): Headers {
  const h = new Headers();
  h.set("Content-Type", "application/json");
  if (initial instanceof Headers) {
    initial.forEach((value, key) => h.set(key, value));
  } else if (Array.isArray(initial)) {
    for (const [key, value] of initial) h.set(key, value);
  } else if (initial && typeof initial === "object") {
    for (const [key, value] of Object.entries(initial)) {
      if (value != null) h.set(key, String(value));
    }
  }
  if (accessToken && !skipAuth) h.set("Authorization", `Bearer ${accessToken}`);
  return h;
}

/**
 * Enhanced fetch with automatic JWT injection and refresh
 */
export async function apiRequest<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const { skipAuth = false, headers: inputHeaders, ...restConfig } = config;

  // Get current access token from Redux store
  const state = store.getState();
  const accessToken = state.auth.accessToken;

  const requestHeaders = buildHeaders(inputHeaders, accessToken, skipAuth);

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...restConfig,
      headers: requestHeaders,
    });

    // Handle 401 Unauthorized - try to refresh token
    if (response.status === 401 && !skipAuth) {
      console.log("Access token expired, attempting refresh...");

      const refreshToken = state.auth.refreshToken || getStoredRefreshToken();
      if (!refreshToken) {
        store.dispatch(clearAuth());
        clearStoredTokens();
        throw new Error("Authentication expired. Please log in again.");
      }

      const newToken = await refreshAccessToken(refreshToken);

      if (newToken) {
        // Update token in store
        store.dispatch(updateAccessToken(newToken));
        storeTokens(newToken, refreshToken);

        // Retry request with new token
        requestHeaders.set("Authorization", `Bearer ${newToken}`);
        const retryResponse = await fetch(url, {
          ...restConfig,
          headers: requestHeaders,
        });

        if (!retryResponse.ok) {
          throw new Error(`HTTP error! status: ${retryResponse.status}`);
        }

        return await retryResponse.json();
      } else {
        // Refresh failed, clear auth
        store.dispatch(clearAuth());
        clearStoredTokens();
        throw new Error("Authentication expired. Please log in again.");
      }
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API request failed:", error);
    throw error;
  }
}

/**
 * Helper methods for different HTTP methods
 */
export const api = {
  get: <T>(endpoint: string, config?: RequestConfig) =>
    apiRequest<T>(endpoint, { ...config, method: "GET" }),

  post: <T>(endpoint: string, data?: unknown, config?: RequestConfig) =>
    apiRequest<T>(endpoint, {
      ...config,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown, config?: RequestConfig) =>
    apiRequest<T>(endpoint, {
      ...config,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string, config?: RequestConfig) =>
    apiRequest<T>(endpoint, { ...config, method: "DELETE" }),
};
