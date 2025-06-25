export interface ForecastEntry {
  label: string;
  type: string;
  probability: number;
}

export interface ForecastConfig {
  decay?: number;
  sectorWeight?: number;
  longTermPenalty?: number;
  longTermBonus?: number;
} 