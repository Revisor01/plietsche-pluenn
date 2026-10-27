import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { pb } from './pb';

// ── Android-Kanäle: Quelle docs/push-channels.md, Kennungen gleich wie in pb_hooks/lib/push.js ──
const ANDROID_CHANNELS = [
  {
    id: 'streak',
    name: 'Serie und Punkte',
    description:
      'Punkte nach dem Check-in und Erinnerungen, bevor deine Serie abläuft.',
    // HIGH: eine heute endende Serie hilft nur, wenn sie aufploppt.
    importance: 'high' as const,
  },
  {
    id: 'campaign',
    name: 'Aktionen und Ankündigungen',
    description:
      'Neue Aktionen im Laden, besondere Öffnungszeiten und Hinweise vom Team.',
    // DEFAULT: eine Aktion läuft Tage, nicht Stunden.
    importance: 'default' as const,
  },
  {
    id: 'badge',
    name: 'Abzeichen und Ränge',
    description: 'Neue Abzeichen, Ränge und freigegebene Teile.',
    // DEFAULT: eine Belohnung ist nie dringend.
    importance: 'default' as const,
  },
  {
    id: 'other',
    name: 'Sonstiges',
    description: 'Alles Übrige aus der App.',
    // LOW: still, für alles ohne eigene Kategorie.
    importance: 'low' as const,
  },
];

const IMPORTANCE = {
  high: Notifications.AndroidImportance.HIGH,
  default: Notifications.AndroidImportance.DEFAULT,
  low: Notifications.AndroidImportance.LOW,
};

// Beim Start aufrufen, weil Android Kanaleigenschaften beim ersten Anlegen festschreibt; iOS ohne Wirkung.
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    for (const c of ANDROID_CHANNELS) {
      await Notifications.setNotificationChannelAsync(c.id, {
        name: c.name,
        description: c.description,
        importance: IMPORTANCE[c.importance],
      });
    }
  } catch {
    // Sonst stellt Android im Standardkanal zu.
  }
}

// EAS project id is needed by getExpoPushTokenAsync in standalone builds.
function projectId(): string | undefined {
  return (
    (Constants.expoConfig as any)?.extra?.eas?.projectId ??
    (Constants as any)?.easConfig?.projectId
  );
}

// Holt Erlaubnis und Expo-Token und registriert es per Upsert; auf Simulatoren oder ohne Erlaubnis ohne Wirkung.
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

// ── Deep Links aus data.deep_link ──

// Erlaubte Ziele, weil ein Push-Payload fremde Eingabe ist.
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
  // Nur ein schlichter Tipp navigiert.
  const action = res.actionIdentifier;
  if (action != null && action !== Notifications.DEFAULT_ACTION_IDENTIFIER) return null;
  const raw = res?.notification?.request?.content?.data?.deep_link;
  if (typeof raw !== 'string') return null;
  const link = raw.trim();
  // Item detail carries an id: /(visitor)/items/<id>
  if (/^\/\(visitor\)\/items\/[A-Za-z0-9_-]+$/.test(link)) return link;
  return (ALLOWED_LINKS as readonly string[]).includes(link) ? link : null;
}

// Deep Link eines Kaltstarts, einmal gelesen.
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
