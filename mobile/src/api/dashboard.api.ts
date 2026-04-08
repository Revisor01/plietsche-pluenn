import { apiClient } from './client';

export interface DashboardStats {
  visits: number;
  itemsTaken: number;
  newItems: number;
  activeItems: number;
}

export async function fetchDashboardStats(from: Date, to: Date): Promise<DashboardStats> {
  const { data } = await apiClient.get<DashboardStats>('/api/dashboard/stats', {
    params: { from: from.toISOString(), to: to.toISOString() },
  });
  return data;
}
