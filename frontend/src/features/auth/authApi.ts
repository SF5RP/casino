import type {RefreshResponse, UserProfileResponse} from "./authTypes";

const AUTH_SERVICE_URL =
  process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:8000";

/**
 * Refresh access token using HttpOnly cookie
 */
export async function refreshAccessToken(): Promise<string | null> {
  try {
    const response = await fetch(`${AUTH_SERVICE_URL}/refresh`, {
      method: "POST",
      credentials: "include", // Sends HttpOnly cookie
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.warn("Failed to refresh token:", response.status);
      return null;
    }

    const data: RefreshResponse = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return null;
  }
}

/**
 * Get current user profile
 */
export async function getCurrentUser(
  accessToken: string
): Promise<UserProfileResponse | null> {
  try {
    const response = await fetch(`${AUTH_SERVICE_URL}/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.warn("Failed to get user profile:", response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
}

/**
 * Redirect to Auth service login
 */
export function redirectToLogin(): void {
  const callbackUrl = encodeURIComponent(
    `${window.location.origin}/auth/callback`
  );
  window.location.href = `${AUTH_SERVICE_URL}/login?redirect=${callbackUrl}`;
}

/**
 * Logout (clears cookies on Auth service)
 */
export async function logout(): Promise<void> {
  try {
    await fetch(`${AUTH_SERVICE_URL}/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch (error) {
    console.error("Error during logout:", error);
  }
}
