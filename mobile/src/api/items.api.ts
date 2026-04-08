import { apiClient } from './client';

export interface CreateItemBody {
  title: string;
  category: string;
  size?: string;
  condition?: string;
  color?: string;
}

export interface ItemRow {
  id: string;
  storeId: string;
  title: string;
  category: string;
  size: string | null;
  condition: string | null;
  color: string | null;
  status: 'active' | 'taken';
  qrToken: string | null;
  createdAt: string | null;
}

export interface ListItemsParams {
  category?: string;
  status?: 'active' | 'taken';
  search?: string;
  page?: number;
  limit?: number;
}

export async function createItem(body: CreateItemBody): Promise<ItemRow> {
  const res = await apiClient.post<ItemRow>('/items', body);
  return res.data;
}

export async function listItems(
  params?: ListItemsParams,
): Promise<{ items: ItemRow[]; page: number; limit: number }> {
  const res = await apiClient.get('/items', { params });
  return res.data;
}

// Gibt die URL zurück — QR wird als <Image> mit Authorization-Header geladen
// Für v1: URL für direkten Download (Share-Sheet)
export function getItemQrUrl(itemId: string): string {
  // apiClient.defaults.baseURL enthält die Backend-URL
  const base = (apiClient.defaults.baseURL ?? '').replace(/\/$/, '');
  return `${base}/items/${itemId}/qr`;
}

export interface ShowcaseItem {
  id: string;
  title: string;
  category: string;
  size?: string | null;
  color?: string | null;
  createdAt: string;
}

export async function fetchShowcaseItems(): Promise<ShowcaseItem[]> {
  const { data } = await apiClient.get<ShowcaseItem[]>('/api/items/showcase');
  return data;
}
