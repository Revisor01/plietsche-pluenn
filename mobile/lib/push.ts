import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { pb } from './pb';

// EAS project id is needed by getExpoPushTokenAsync in standalone builds.
function projectId(): string | undefined {
  return (
    (Constants.expoConfig as any)?.extra?.eas?.projectId ??
    (Constants as any)?.easConfig?.projectId
  );
}

// Ask for permission, fetch the Expo push token, and register it with the
// backend (/api/pp/push/register). Safe to call on every authenticated start —
// it upserts. Silently no-ops on simulators / when permission is denied.
export async function registerPushToken(): Promise<void> {
  try {
    if (!Device.isDevice) return; // push tokens don't work on simulators
    if (!pb.authStore.isValid) return;

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return;

    const pid = projectId();
    const tokenRes = await Notifications.getExpoPushTokenAsync(pid ? { projectId: pid } : undefined);
    const token = tokenRes.data;
    if (!token) return;

    await pb.send('/api/pp/push/register', {
      method: 'POST',
      body: { expo_token: token, platform: Platform.OS },
    });
  } catch {
    // Non-fatal — push just won't work until next successful registration.
  }
}

// ── Deep links ────────────────────────────────────────────────────────────
// The backend puts a route into the notification payload as data.deep_link
// (e.g. "/(visitor)/points"). Tapping the notification should open that screen.

// Routes a push is allowed to open. A push payload is remote input, so we never
// hand it to the router unchecked — an unknown value just opens the app.
const ALLOWED_LINKS = [
  '/(visitor)',
  '/(visitor)/points',
  '/(visitor)/badges',
  '/(visitor)/store',
  '/(visitor)/items',
  '/(visitor)/items/review',
] as const;

export function parseDeepLink(response: unknown): string | null {
  const res = response as any;
  if (!res) return null;
  // Only a plain tap on the notification navigates — not a dismissal or a
  // custom action button.
  const action = res.actionIdentifier;
  if (action != null && action !== Notifications.DEFAULT_ACTION_IDENTIFIER) return null;
  const raw = res?.notification?.request?.content?.data?.deep_link;
  if (typeof raw !== 'string') return null;
  const link = raw.trim();
  // Item detail carries an id: /(visitor)/items/<id>
  if (/^\/\(visitor\)\/items\/[A-Za-z0-9_-]+$/.test(link)) return link;
  return (ALLOWED_LINKS as readonly string[]).includes(link) ? link : null;
}

// Deep link from a notification that launched the app from a cold start.
// Read once — the pending link is consumed by the first navigator that is ready.
export async function initialDeepLink(): Promise<string | null> {
  try {
    const res = await Notifications.getLastNotificationResponseAsync();
    return parseDeepLink(res);
  } catch {
    return null;
  }
}

// Remove this device's token (DSGVO opt-out / logout).
export async function unregisterPushToken(): Promise<void> {
  try {
    const pid = projectId();
    const tokenRes = await Notifications.getExpoPushTokenAsync(pid ? { projectId: pid } : undefined);
    if (tokenRes.data) {
      await pb.send('/api/pp/push/unregister', {
        method: 'POST',
        body: { expo_token: tokenRes.data },
      });
    }
  } catch {
    // ignore
  }
}
