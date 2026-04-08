import { create } from 'zustand';
import { fetchBalance } from '../api/points.api';

interface PointsState {
  balance: number;
  isLoading: boolean;
  loadBalance: () => Promise<void>;
}

export const usePointsStore = create<PointsState>((set) => ({
  balance: 0,
  isLoading: false,
  loadBalance: async () => {
    set({ isLoading: true });
    try {
      const { points } = await fetchBalance();
      set({ balance: points });
    } catch {
      // Stiller Fehler — Balance bleibt bei 0
    } finally {
      set({ isLoading: false });
    }
  },
}));
