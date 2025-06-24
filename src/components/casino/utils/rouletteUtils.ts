import { RED_NUMBERS, BLACK_NUMBERS } from '../constants/rouletteConstants';
import type { RouletteNumber, RepeatSeries, AgeMap } from '../types/rouletteTypes';

export function getContrastText(bgColor: string): string {
  // Удаляем # если есть
  if (bgColor.startsWith('#')) bgColor = bgColor.slice(1);
  // Преобразуем в rgb
  let r = 0, g = 0, b = 0;
  if (bgColor.length === 3) {
    r = parseInt(bgColor[0] + bgColor[0], 16);
    g = parseInt(bgColor[1] + bgColor[1], 16);
    b = parseInt(bgColor[2] + bgColor[2], 16);
  } else if (bgColor.length === 6) {
    r = parseInt(bgColor.slice(0, 2), 16);
    g = parseInt(bgColor.slice(2, 4), 16);
    b = parseInt(bgColor.slice(4, 6), 16);
  }
  // Яркость по формуле WCAG
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 140 ? '#222' : '#fff';
}

export function getNumberColor(num: RouletteNumber): string {
  if (num === 0 || num === '00') return '#2ecc71'; // зеленый для 0 и 00
  if (RED_NUMBERS.has(num as number)) return '#e74c3c';
  if (BLACK_NUMBERS.has(num as number)) return '#2c3e50';
  return '#bdc3c7';
}

export function calculateAgeMap(history: RouletteNumber[]): AgeMap {
  const ageMap: AgeMap = {};
  for (let i = 0; i <= 36; i++) {
    const index = [...history].reverse().findIndex((v) => v === i);
    ageMap[String(i)] = index === -1 ? history.length : index;
  }
  ageMap['00'] = [...history].reverse().findIndex((v) => v === '00');
  if (ageMap['00'] === -1) ageMap['00'] = history.length;
  return ageMap;
}

export function getProgressColor(count: number): string {
  if (count < 20) return '#4ade80'; // зеленый
  if (count < 50) return '#fbbf24'; // желтый
  if (count < 80) return '#fb923c'; // оранжевый
  return '#ef4444'; // красный
}

export function calculateGroupAge(history: RouletteNumber[], group: number[]): number {
  let groupAge = history.length;
  for (let i = history.length - 1; i >= 0; i--) {
    if (group.includes(history[i] as number)) {
      groupAge = history.length - 1 - i;
      break;
    }
  }
  return groupAge;
}

export function findRepeats(history: RouletteNumber[]): RepeatSeries[] {
  const repeats: RepeatSeries[] = [];
  let i = 0;
  while (i < history.length - 1) {
    let j = i;
    while (j + 1 < history.length && history[j] === history[j + 1]) {
      j++;
    }
    if (j > i) {
      repeats.push({ value: history[i], start: i + 1, length: j - i + 1 });
      i = j + 1;
    } else {
      i++;
    }
  }
  return repeats;
}

export function getRepeatIndexes(history: RouletteNumber[]): Set<number> {
  const repeatIndexes = new Set<number>();
  let i = 0;
  while (i < history.length - 1) {
    let j = i;
    while (j + 1 < history.length && history[j] === history[j + 1]) {
      j++;
    }
    if (j > i) {
      for (let k = i; k <= j; k++) repeatIndexes.add(k);
      i = j + 1;
    } else {
      i++;
    }
  }
  return repeatIndexes;
} 