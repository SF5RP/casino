export interface CardItem {
  id: string;
  image: string;
  isMatched: boolean;
  isFlipped: boolean;
  isPlaced: boolean;
  showDeleteIcon: boolean;
}

export interface DraggableImage {
  id: string;
  image: string;
  fallbackImage: string;
  isUsed: boolean;
  usageCount: number;
  maxUsage: number;
}

export interface CellPosition {
  row: number;
  col: number;
}

export type AnimationType = "deletion" | "celebration" | null;
