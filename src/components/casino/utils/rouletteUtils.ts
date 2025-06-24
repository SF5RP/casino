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
  if (num === 0 || num === '00') return '#52b788'; // более бледный зеленый для 0 и 00
  
  // Конвертируем в число для проверки
  const numValue = typeof num === 'string' ? parseInt(num, 10) : num;
  
  if (!isNaN(numValue) && RED_NUMBERS.has(numValue)) return '#e74c3c'; // красный
  if (!isNaN(numValue) && BLACK_NUMBERS.has(numValue)) return '#2c3e50'; // черный
  
  return '#52b788'; // зеленый для всех остальных (включая некорректные значения)
}

export function calculateAgeMap(history: RouletteNumber[]): AgeMap {
  const DEBUG_LOGS = process.env.NODE_ENV === 'development';
  
  if (DEBUG_LOGS) {
    console.log(`🗺️ Расчет AgeMap для ${history.length} элементов истории`);
  }
  
  // Инициализируем все числа максимальным возрастом
  const ageMap: AgeMap = {};
  for (let i = 0; i <= 36; i++) {
    ageMap[String(i)] = history.length;
  }
  ageMap['00'] = history.length;
  
  // Проходим историю один раз с конца, обновляя только найденные числа
  for (let i = history.length - 1; i >= 0; i--) {
    const num = String(history[i]);
    if (ageMap[num] === history.length) { // Если еще не обновлено
      ageMap[num] = history.length - 1 - i;
    }
  }
  
  if (DEBUG_LOGS) {
    console.log(`✅ AgeMap готов (${Object.keys(ageMap).length} чисел)`);
  }
  return ageMap;
}

// Кэш для цветов прогресса
const progressColorCache = new Map<number, string>();

export function getProgressColor(count: number): string {
  // Проверяем кэш
  if (progressColorCache.has(count)) {
    return progressColorCache.get(count)!;
  }
  
  // Плавная градация от зеленого через желтый к оранжевому
  // Нормализуем значение от 0 до 1 для диапазона 0-100
  const normalizedCount = Math.min(count / 100, 1);
  
  let color: string;
  
  if (normalizedCount <= 0.2) {
    // 0-20: Зеленый
    color = '#22c55e';
  } else if (normalizedCount <= 0.4) {
    // 20-40: Зеленый → Светло-зеленый
    const progress = (normalizedCount - 0.2) / 0.2;
    color = interpolateColor('#22c55e', '#84cc16', progress);
  } else if (normalizedCount <= 0.6) {
    // 40-60: Светло-зеленый → Желто-зеленый
    const progress = (normalizedCount - 0.4) / 0.2;
    color = interpolateColor('#84cc16', '#eab308', progress);
  } else if (normalizedCount <= 0.8) {
    // 60-80: Желто-зеленый → Желтый
    const progress = (normalizedCount - 0.6) / 0.2;
    color = interpolateColor('#eab308', '#f59e0b', progress);
  } else {
    // 80-100: Желтый → Оранжевый
    const progress = (normalizedCount - 0.8) / 0.2;
    color = interpolateColor('#f59e0b', '#ea580c', progress);
  }
  
  // Кэшируем результат
  progressColorCache.set(count, color);
  return color;
}

// Функция для интерполяции между двумя цветами
function interpolateColor(color1: string, color2: string, factor: number): string {
  // Преобразуем hex в RGB
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  
  const r1 = parseInt(hex1.substr(0, 2), 16);
  const g1 = parseInt(hex1.substr(2, 2), 16);
  const b1 = parseInt(hex1.substr(4, 2), 16);
  
  const r2 = parseInt(hex2.substr(0, 2), 16);
  const g2 = parseInt(hex2.substr(2, 2), 16);
  const b2 = parseInt(hex2.substr(4, 2), 16);
  
  // Интерполируем каждый канал
  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);
  
  // Преобразуем обратно в hex
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Кэш для расчета возраста групп
const groupAgeCache = new Map<string, number>();
let lastHistoryLength = 0;

export function calculateGroupAge(history: RouletteNumber[], group: number[]): number {
  // Очищаем кэш если история изменилась
  if (history.length !== lastHistoryLength) {
    groupAgeCache.clear();
    lastHistoryLength = history.length;
  }
  
  // Создаем уникальный ключ для группы
  const groupKey = group.sort().join(',');
  
  // Проверяем кэш
  if (groupAgeCache.has(groupKey)) {
    return groupAgeCache.get(groupKey)!;
  }
  
  let groupAge = history.length;
  for (let i = history.length - 1; i >= 0; i--) {
    if (group.includes(history[i] as number)) {
      groupAge = history.length - 1 - i;
      break;
    }
  }
  
  // Кэшируем результат
  groupAgeCache.set(groupKey, groupAge);
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