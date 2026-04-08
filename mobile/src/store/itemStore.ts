import { create } from 'zustand';

interface CreateItemBody {
  title: string;
  category: string;
  size?: string;
  condition?: string;
  color?: string;
}

interface ItemStore {
  lastItem: Partial<CreateItemBody> | null;
  setLastItem: (item: Partial<CreateItemBody>) => void;
  clearLastItem: () => void;
}

export const useItemStore = create<ItemStore>((set) => ({
  lastItem: null,
  setLastItem: (item) => set({ lastItem: item }),
  clearLastItem: () => set({ lastItem: null }),
}));
