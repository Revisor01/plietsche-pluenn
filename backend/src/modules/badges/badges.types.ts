export interface BadgeLevel {
  id: string;
  storeId: string;
  name: string;
  emoji: string;
  minPoints: number;
  sortOrder: number;
}

export interface BadgeProgress {
  currentLevel: { name: string; emoji: string; minPoints: number } | null;
  nextLevel: { name: string; emoji: string; minPoints: number } | null;
  progressPercent: number; // 0-100
  pointsToNext: number | null; // null wenn max Level erreicht
  currentPoints: number;
}
