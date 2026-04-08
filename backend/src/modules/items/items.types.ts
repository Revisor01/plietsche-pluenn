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
  createdAt: Date | null;
}

export interface ItemFilters {
  category?: string;
  status?: 'active' | 'taken';
  search?: string;
  page?: number;
  limit?: number;
  isShowcase?: boolean;
}
