import { apiClient } from './client';

export interface BadgeProgressResponse {
  currentLevel: { name: string; emoji: string; minPoints: number } | null;
  nextLevel: { name: string; emoji: string; minPoints: number } | null;
  progressPercent: number;
  pointsToNext: number | null;
  currentPoints: number;
}

export interface BadgeLevel {
  id: string;
  storeId: string;
  name: string;
  emoji: string;
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
  emoji: string;
  minPoints: number;
  sortOrder: number;
}): Promise<BadgeLevel> {
  const { data } = await apiClient.post<BadgeLevel>('/api/badges/levels', body);
  return data;
}

export async function deleteBadgeLevel(id: string): Promise<void> {
  await apiClient.delete(`/api/badges/levels/${id}`);
}
