export interface AgeMap {
  [key: string]: number;
}

export interface RepeatSeries {
  value: number | '00';
  start: number;
  length: number;
}

export interface StatsData {
  number: number | '00';
  occurrences: number;
  lastIndex: number;
  lastOccurrence: string;
  percentage: number;
  deviation: number;
  color: string;
}

export interface GroupBet {
  label: string;
  group: number[];
}

export type RouletteNumber = number | '00';

export type SortBy = 'number' | 'frequency' | 'recent'; 