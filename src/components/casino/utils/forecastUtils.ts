import type { RouletteNumber } from '../types/rouletteTypes';
import type { ForecastEntry, ForecastConfig } from '../types/forecastTypes';

const RED = new Set(["1","3","5","7","9","12","14","16","18","19","21","23","25","27","30","32","34","36"]);
const BLACK = new Set(["2","4","6","8","10","11","13","15","17","20","22","24","26","28","29","31","33","35"]);

const COLUMN_1 = new Set(["1","4","7","10","13","16","19","22","25","28","31","34"]);
const COLUMN_2 = new Set(["2","5","8","11","14","17","20","23","26","29","32","35"]);
const COLUMN_3 = new Set(["3","6","9","12","15","18","21","24","27","30","33","36"]);

const DOZEN_1 = new Set([...Array(12)].map((_, i) => (i + 1).toString()));
const DOZEN_2 = new Set([...Array(12)].map((_, i) => (i + 13).toString()));
const DOZEN_3 = new Set([...Array(12)].map((_, i) => (i + 25).toString()));

const normalize = (val: number, max: number) => val / max;

export function buildCombinedForecast(
  history: RouletteNumber[],
  config: ForecastConfig = {}
): ForecastEntry[] {
  const {
    decay = 0.97,
    sectorWeight = 0.5,
    longTermPenalty = 0.5,
    longTermBonus = 1.5
  } = config;

  // Конвертируем историю в строки для совместимости
  const stringHistory = history.map(n => String(n));

  const counts = new Map<string, number>();
  const sectorGroups = new Map<string, string[]>();
  const sectors: Record<string, number> = {};
  const maxDecay = (1 - Math.pow(decay, stringHistory.length)) / (1 - decay);

  for (let i = 0; i < stringHistory.length; i++) {
    const n = stringHistory[i];
    const w = Math.pow(decay, stringHistory.length - i - 1);
    counts.set(n, (counts.get(n) ?? 0) + w);

    const groups = [
      RED.has(n) ? "red" : BLACK.has(n) ? "black" : "zero",
      COLUMN_1.has(n) ? "column1" : COLUMN_2.has(n) ? "column2" : COLUMN_3.has(n) ? "column3" : "other",
      DOZEN_1.has(n) ? "dozen1" : DOZEN_2.has(n) ? "dozen2" : DOZEN_3.has(n) ? "dozen3" : "other"
    ];

    for (const g of groups) {
      sectors[g] = (sectors[g] ?? 0) + w;
      if (!sectorGroups.has(g)) sectorGroups.set(g, []);
      sectorGroups.get(g)!.push(n);
    }
  }

  const numberSet = new Set([...Array(36)].map((_, i) => (i + 1).toString()).concat(["0", "00"]));
  const maxCount = Math.max(...[...counts.values()]);
  const maxSector = Math.max(...Object.values(sectors));

  const entries: ForecastEntry[] = [];

  for (const n of numberSet) {
    const shortTermFreq = normalize(counts.get(n) ?? 0, maxDecay);
    let score = 1 - shortTermFreq; // недопредставленные получают бонус

    // Учитываем перегретость на длинной дистанции
    if ((counts.get(n) ?? 0) / maxDecay > 1 / 38) score *= longTermPenalty;

    // Добавим поправки на группы
    const gScore = [
      RED.has(n) ? sectors["red"] : BLACK.has(n) ? sectors["black"] : sectors["zero"] ?? 0,
      COLUMN_1.has(n) ? sectors["column1"] : COLUMN_2.has(n) ? sectors["column2"] : COLUMN_3.has(n) ? sectors["column3"] : 0,
      DOZEN_1.has(n) ? sectors["dozen1"] : DOZEN_2.has(n) ? sectors["dozen2"] : DOZEN_3.has(n) ? sectors["dozen3"] : 0,
    ];

    const groupCorrection = gScore.map(v => 1 - normalize(v, maxSector)).reduce((a, b) => a + b, 0);
    score += groupCorrection * sectorWeight;

    entries.push({
      label: `${n}`,
      type: n,
      probability: +(score).toFixed(4),
    });
  }

  const sum = entries.reduce((acc, e) => acc + e.probability, 0);
  for (const e of entries) e.probability = +(e.probability / sum).toFixed(4);

  return entries.sort((a, b) => b.probability - a.probability);
} 