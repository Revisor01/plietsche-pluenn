import { create } from 'zustand';

export interface AuthUserState {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'volunteer' | 'visitor';
  storeId: string;
  plietschPoints: number;
}

interface AuthStore {
  token: string | null;
  user: AuthUserState | null;
  login: (token: string, user: AuthUserState) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: null,
  user: null,
  login: (token, user) => set({ token, user }),
  logout: () => set({ token: null, user: null }),
}));
