import { apiClient } from './client';

export interface ScanResult {
  points: number;
  title: string;
  totalPoints: number;
}

export async function scanItem(qrToken: string): Promise<ScanResult> {
  const res = await apiClient.post('/scan', { qrToken });
  return res.data;
}
