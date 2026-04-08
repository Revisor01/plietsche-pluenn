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

export type TriggerType =
  | 'items_brought'
  | 'items_taken'
  | 'visits'
  | 'streak_weeks'
  | 'season_items_brought'
  | 'season_items_taken'
  | 'milestone';

export type Tier = 'bronze' | 'silber' | 'gold' | 'custom';
export type Season = 'fruehling' | 'sommer' | 'herbst' | 'winter';

export interface Achievement {
  id: string;
  storeId: string;
  name: string;
  description: string;
  iconName: string;
  triggerType: TriggerType;
  triggerValue: number;
  tier: Tier;
  season: Season | null;
  sortOrder: number;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  progress: number;
  completed: boolean;
  completedAt: Date | null;
  achievement: Achievement;
}

export interface AchievementWithProgress extends Achievement {
  progress: number;
  completed: boolean;
  completedAt: Date | null;
}

export type AchievementEvent = 'checkin' | 'item_scan';
