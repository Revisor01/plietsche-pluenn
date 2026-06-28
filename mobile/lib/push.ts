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
