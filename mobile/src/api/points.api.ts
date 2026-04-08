import { apiClient } from './client';

export interface PointTransaction {
  id: string;
  source: 'item_scan' | 'checkin' | 'manual_items';
  points: number;
  createdAt: string;
}

export async function fetchBalance(): Promise<{ points: number }> {
  const res = await apiClient.get('/api/points/balance');
  return res.data;
}

export async function fetchHistory(): Promise<{ transactions: PointTransaction[] }> {
  const res = await apiClient.get('/api/points/history');
  return res.data;
}
