import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { pb } from './pb';

// ── Android-Kanäle ────────────────────────────────────────────────────────
//
// QUELLE DER WAHRHEIT: docs/push-channels.md. Diese Tabelle ist die Kopie für
// die App, `pocketbase/pb_hooks/lib/push.js` hält die Kopie fürs Backend
// (Konstante CHANNELS). Die Kennungen MÜSSEN gleich lauten: Hier werden die
// Kanäle angelegt, dort werden sie adressiert. Wer hier etwas ändert, ändert
// beide Stellen und die Tabelle in der Doku.
//
// Android schreibt die Eigenschaften eines Kanals beim ERSTEN Anlegen fest.
// Danach ändert nur noch die Nutzerin sie, kein Code. Deshalb werden die
// Kanäle beim App-Start angelegt — bevor die erste Nachricht der Kategorie
// ankommt. Käme sie zuerst, legte Android den Kanal mit Standardwerten an, und
// die Wichtigkeit wäre für immer die falsche.
const ANDROID_CHANNELS = [
  {
    id: 'streak',
    name: 'Serie und Punkte',
    description:
      'Punkte nach dem Check-in und Erinnerungen, bevor deine Serie abläuft.',
    // HIGH: Eine Serie, die heute endet, hilft nur, wenn sie oben aufploppt —
    // morgen ist sie weg. Das ist die einzige Kategorie mit einer Frist.
    importance: 'high' as const,
  },
  {
    id: 'campaign',
    name: 'Aktionen und Ankündigungen',
    description:
      'Neue Aktionen im Laden, besondere Öffnungszeiten und Hinweise vom Team.',
    // DEFAULT: Wissenswert und mit Ton, aber nichts, was den Bildschirm
    // übernehmen müsste — eine Aktion läuft Tage, nicht Stunden.
    importance: 'default' as const,
  },
  {
    id: 'badge',
    name: 'Abzeichen und Ränge',
    description: 'Neue Abzeichen, Ränge und freigegebene Teile.',
    // DEFAULT: Eine Belohnung darf sich melden. Sie ist aber nie dringend —
    // das Abzeichen bleibt auch, wenn man erst abends hinsieht.
    importance: 'default' as const,
  },
  {
    id: 'other',
    name: 'Sonstiges',
    description: 'Alles Übrige aus der App.',
    // LOW: Still in die Mitteilungszentrale, kein Ton. Hier landet, was keine
    // eigene Kategorie hat — das soll niemanden unterbrechen.
    importance: 'low' as const,
  },
];

const IMPORTANCE = {
  high: Notifications.AndroidImportance.HIGH,
  default: Notifications.AndroidImportance.DEFAULT,
  low: Notifications.AndroidImportance.LOW,
};

// Beim App-Start aufrufen, nicht erst beim Registrieren des Tokens: Ein Kanal
// muss stehen, bevor die erste Nachricht kommt. Auf iOS passiert nichts.
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
    // Klappt das nicht, stellt Android im Standardkanal zu. Lieber eine
    // Nachricht ohne eigene Kategorie als gar keine.
  }
}

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
