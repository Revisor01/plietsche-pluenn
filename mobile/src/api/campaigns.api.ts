import { apiClient } from './client';

export interface Campaign {
  id: string;
  storeId: string;
  title: string;
  description?: string | null;
  multiplier: number;
  startsAt: string;
  endsAt: string;
  createdAt: string;
}

export async function fetchActiveCampaign(): Promise<Campaign | null> {
  const { data } = await apiClient.get<Campaign | null>('/api/campaigns/active');
  return data;
}

export async function fetchCampaigns(): Promise<Campaign[]> {
  const { data } = await apiClient.get<Campaign[]>('/api/campaigns');
  return data;
}

export async function createCampaign(body: {
  title: string;
  description?: string;
  multiplier: number;
  startsAt: string;
  endsAt: string;
}): Promise<Campaign> {
  const { data } = await apiClient.post<Campaign>('/api/campaigns', body);
  return data;
}

export async function deleteCampaign(id: string): Promise<void> {
  await apiClient.delete(`/api/campaigns/${id}`);
}
