import { apiClient } from './client';

export interface CheckInResult {
  points: number;
  itemPoints: number;
  totalPoints: number;
}

export async function submitCheckin(
  doorToken: string,
  lat: number,
  lng: number,
  itemCount: number,
): Promise<CheckInResult> {
  const res = await apiClient.post('/checkin', { doorToken, lat, lng, itemCount });
  return res.data;
}
