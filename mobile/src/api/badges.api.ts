import { apiClient } from './client';

export interface BadgeProgressResponse {
  currentLevel: { name: string; iconName: string; minPoints: number } | null;
  nextLevel: { name: string; iconName: string; minPoints: number } | null;
  progressPercent: number;
  pointsToNext: number | null;
  currentPoints: number;
}

export interface BadgeLevel {
  id: string;
  storeId: string;
  name: string;
  iconName: string;
  minPoints: number;
  sortOrder: number;
}

export async function fetchMyBadge(): Promise<BadgeProgressResponse> {
  const { data } = await apiClient.get<BadgeProgressResponse>('/api/badges/my');
  return data;
}

export async function fetchBadgeLevels(): Promise<BadgeLevel[]> {
  const { data } = await apiClient.get<BadgeLevel[]>('/api/badges/levels');
  return data;
}

export async function createBadgeLevel(body: {
  name: string;
  iconName: string;
  minPoints: number;
  sortOrder: number;
}): Promise<BadgeLevel> {
  const { data } = await apiClient.post<BadgeLevel>('/api/badges/levels', body);
  return data;
}

export async function deleteBadgeLevel(id: string): Promise<void> {
  await apiClient.delete(`/api/badges/levels/${id}`);
}

// Achievement System (Plan 09-02)

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
  name: string;
  description: string;
  iconName: string;
  triggerType: TriggerType;
  triggerValue: number;
  tier: Tier;
  season: Season | null;
  sortOrder: number;
}

export interface AchievementWithProgress extends Achievement {
  progress: number;
  completed: boolean;
  completedAt: string | null;
}

export async function fetchMyAchievements(): Promise<AchievementWithProgress[]> {
  const { data } = await apiClient.get<AchievementWithProgress[]>('/api/badges/achievements');
  return data;
}
