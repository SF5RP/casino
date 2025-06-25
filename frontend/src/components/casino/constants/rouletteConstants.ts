export const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export const BLACK_NUMBERS = new Set([2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]);

export const GROUPS: Record<string, number[]> = {
  '1st 12': Array.from({ length: 12 }, (_, i) => i + 1),
  '2nd 12': Array.from({ length: 12 }, (_, i) => i + 13),
  '3rd 12': Array.from({ length: 12 }, (_, i) => i + 25),
  '1-18': Array.from({ length: 18 }, (_, i) => i + 1),
  '19-36': Array.from({ length: 18 }, (_, i) => i + 19),
  'EVEN': Array.from({ length: 18 }, (_, i) => (i + 1) * 2),
  'ODD': Array.from({ length: 18 }, (_, i) => i * 2 + 1),
  'RED': [...RED_NUMBERS],
  'BLACK': [...BLACK_NUMBERS],
}; 