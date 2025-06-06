type RouletteNumber = number | '00';

const storage = new Map<string, RouletteNumber[]>();

export function saveRouletteHistory(history: RouletteNumber[]): string {
  const key = Math.random().toString(36).substring(2, 15);
  storage.set(key, history);
  return key;
}

export function getRouletteHistory(key: string): RouletteNumber[] | null {
  return storage.get(key) || null;
}

export function updateRouletteHistory(key: string, history: RouletteNumber[]): boolean {
  if (!storage.has(key)) {
    return false;
  }
  storage.set(key, history);
  return true;
} 