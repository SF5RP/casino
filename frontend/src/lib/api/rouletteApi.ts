import type { RouletteNumber } from '@/components/casino/types/rouletteTypes';
import { API_BASE_URL, apiRequest } from '@/config/api';

// Типы для API ответов
export interface RouletteSession {
  id: number;
  key: string;
  history: RouletteNumber[];
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

// API функции
export async function getHistory(key: string): Promise<RouletteNumber[]> {
  const response = await request<{ history: RouletteNumber[] }>(`/roulette/${key}`);
  return response.history || [];
}

export async function saveNumber(key: string, number: RouletteNumber): Promise<RouletteSession> {
  const response = await request<ApiResponse<RouletteSession>>(`/roulette/save`, {
    method: 'POST',
    body: JSON.stringify({ key, number }),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to save number');
  }

  return response.data;
}

export async function updateHistory(key: string, history: RouletteNumber[]): Promise<RouletteSession> {
  const response = await request<ApiResponse<RouletteSession>>(`/roulette/${key}`, {
    method: 'PUT',
    body: JSON.stringify({ history }),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to update history');
  }

  return response.data;
}

// Объект API для совместимости
export const rouletteApi = {
  getHistory,
  saveNumber,
  updateHistory,
}; 