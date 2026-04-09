import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerPushToken, unregisterPushToken } from '../services/pushService';

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
  onboardingCompleted: boolean;
  login: (token: string, user: AuthUserState) => void;
  logout: () => void;
  completeOnboarding: () => void;
  loadOnboardingState: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  token: null,
  user: null,
  onboardingCompleted: false,
  login: (token, user) => {
    set({ token, user });
    registerPushToken(token).catch(() => {});
  },
  logout: () => {
    const currentToken = get().token;
    if (currentToken) {
      unregisterPushToken(currentToken).catch(() => {});
    }
    set({ token: null, user: null });
  },
  completeOnboarding: () => {
    set({ onboardingCompleted: true });
    AsyncStorage.setItem('onboarding_completed', 'true');
  },
  loadOnboardingState: async () => {
    const value = await AsyncStorage.getItem('onboarding_completed');
    if (value === 'true') {
      set({ onboardingCompleted: true });
    }
  },
}));
