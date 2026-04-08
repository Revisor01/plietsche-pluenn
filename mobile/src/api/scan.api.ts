import { apiClient } from './client';

export interface ScanResult {
  points: number;
  title: string;
  totalPoints: number;
  newAchievements?: Array<{ name: string; iconName: string }>;
}

export async function scanItem(qrToken: string): Promise<ScanResult> {
  const res = await apiClient.post('/scan', { qrToken });
  return res.data;
}
