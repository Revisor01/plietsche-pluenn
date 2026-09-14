// PocketBase client singleton with SecureStore-backed auth persistence.
// `pb.authStore` is fully reactive — subscribe via pb.authStore.onChange().

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
  name: string;
  // Eine Quelle für die Rollen: `Role` aus types.ts. Die Aufzählung stand hier
  // ein zweites Mal wörtlich — eine neue Rolle hätte an beiden Stellen
  // nachgetragen werden müssen, und nur eine davon hätte der Compiler gemahnt.
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
