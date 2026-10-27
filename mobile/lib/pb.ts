// PocketBase-Client mit SecureStore-Persistenz.

import PocketBase, { AsyncAuthStore } from 'pocketbase';
import * as SecureStore from 'expo-secure-store';

import type { Role } from './types';

const PB_URL = process.env.EXPO_PUBLIC_PB_URL;
if (!PB_URL) {
  // Fail loud during dev — env var must be set in mobile/.env.
  console.warn('[pb] EXPO_PUBLIC_PB_URL is not set. Auth will fail.');
}

const AUTH_KEY = 'pp_pb_auth';

const store = new AsyncAuthStore({
  save: (serialized) => SecureStore.setItemAsync(AUTH_KEY, serialized),
  initial: SecureStore.getItemAsync(AUTH_KEY),
  clear: () => SecureStore.deleteItemAsync(AUTH_KEY),
});

export const pb = new PocketBase(PB_URL ?? 'https://pb.plietschepluenn.de', store);

// Auto-refresh expired token on auth change.
pb.authStore.onChange(() => {
  // Touch to ensure persistence ran — AsyncAuthStore handles save itself.
}, true);

export type PPUser = {
  id: string;
  email: string;
  // Von PocketBase gepflegt; erzwungen wird es nicht (onlyVerified aus).
  verified: boolean;
  name: string;
  // Rollen nur aus `Role` in types.ts.
  role: Role;
  avatar?: string;
  points_total: number;
  streak_weeks: number;
  streak_last_visit?: string;
  streak_grace_until?: string;
  onboarding_complete: boolean;
  push_streak_enabled: boolean;
  push_campaign_enabled: boolean;
  push_badge_enabled: boolean;
  push_other_enabled: boolean;
  created: string;
};
