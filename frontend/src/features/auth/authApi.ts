import type {RefreshResponse, UserProfileResponse} from "./authTypes";

function requireAuthServiceBaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_AUTH_URL?.trim();
  if (!value) {
    throw new Error(
      "NEXT_PUBLIC_AUTH_URL is required and must point to the auth service base URL"
    );
  }

  return value.replace(/\/$/, "");
}

const AUTH_SERVICE_BASE_URL = requireAuthServiceBaseUrl();
const AUTH_SERVICE_API_URL = `${AUTH_SERVICE_BASE_URL}/api`;

/**
 * Refresh access token using refresh_token from auth-service.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<string | null> {
  try {
    const response = await fetch(`${AUTH_SERVICE_API_URL}/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
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
    const response = await fetch(`${AUTH_SERVICE_API_URL}/me`, {
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
  const callbackUrl = encodeURIComponent(`${window.location.origin}/auth/callback`);
  window.location.href = `${AUTH_SERVICE_API_URL}/login?return_to=${callbackUrl}`;
}

/**
 * Local logout. Current auth-service flow documented in auth.md is token-based.
 */
export async function logout(): Promise<void> {}
