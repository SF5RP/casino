import { store } from "@/store";
import { refreshAccessToken } from "@/features/auth/authApi";
import { updateAccessToken, clearAuth } from "@/features/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8011";

interface RequestConfig extends RequestInit {
  skipAuth?: boolean;
}

/**
 * Enhanced fetch with automatic JWT injection and refresh
 */
export async function apiRequest<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const { skipAuth = false, headers = {}, ...restConfig } = config;

  // Get current access token from Redux store
  const state = store.getState();
  const accessToken = state.auth.accessToken;

  // Prepare headers
  const requestHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...headers,
  };

  // Add Authorization header if token exists and not skipped
  if (accessToken && !skipAuth) {
    requestHeaders["Authorization"] = `Bearer ${accessToken}`;
  }н

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

      const newToken = await refreshAccessToken();

      if (newToken) {
        // Update token in store
        store.dispatch(updateAccessToken(newToken));

        // Retry request with new token
        requestHeaders["Authorization"] = `Bearer ${newToken}`;
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
