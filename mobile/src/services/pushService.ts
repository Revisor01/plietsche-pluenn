import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { apiClient } from '../api/client';

export async function requestPushPermission(): Promise<boolean> {
  const authStatus = await messaging().requestPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
}

export async function registerPushToken(apiToken: string): Promise<void> {
  const granted = await requestPushPermission();
  if (!granted) return;
  const fcmToken = await messaging().getToken();
  if (!fcmToken) return;
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  await apiClient.post(
    '/api/push/token',
    { token: fcmToken, platform },
    { headers: { Authorization: `Bearer ${apiToken}` } },
  );
}

export async function unregisterPushToken(apiToken: string): Promise<void> {
  await apiClient.delete('/api/push/token', {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
}
