import { apiClient } from './client';

export interface StoreInfo {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  openingHours: string | null;
  lat: number | null;
  lng: number | null;
}

export async function getStoreInfo(): Promise<StoreInfo> {
  const res = await apiClient.get<StoreInfo>('/stores/info');
  return res.data;
}

export interface UpdateStoreBody {
  address?: string;
  description?: string;
  openingHours?: string;
}

export async function updateStoreInfo(data: UpdateStoreBody): Promise<StoreInfo> {
  const res = await apiClient.patch<StoreInfo>('/stores/info', data);
  return res.data;
}
