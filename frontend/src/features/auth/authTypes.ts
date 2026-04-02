// Auth feature types

export interface User {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
  role: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface RefreshResponse {
  access_token: string;
}

export interface UserProfileResponse {
  id: string | number;
  discord_id?: string;
  username: string;
  discriminator?: string;
  email?: string;
  avatar?: string;
  role: string;
  created_at?: string;
}
