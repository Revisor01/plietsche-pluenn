export interface StoreInfo {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  openingHours: string | null;
  lat: number | null;
  lng: number | null;
}

export interface UpdateStoreBody {
  address?: string;
  description?: string;
  openingHours?: string;
  lat?: number;
  lng?: number;
  checkinRadiusMeters?: number;
}
