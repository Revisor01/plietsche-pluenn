export interface BadgeLevel {
  id: string;
  storeId: string;
  name: string;
  iconName: string;
  minPoints: number;
  sortOrder: number;
}

export interface BadgeProgress {
  currentLevel: { name: string; iconName: string; minPoints: number } | null;
  nextLevel: { name: string; iconName: string; minPoints: number } | null;
  progressPercent: number; // 0-100
  pointsToNext: number | null; // null wenn max Level erreicht
  currentPoints: number;
}
