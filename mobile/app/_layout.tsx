import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Stack, useRouter, useSegments, useGlobalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import {
  useFonts,
  WorkSans_400Regular,
  WorkSans_500Medium,
  WorkSans_600SemiBold,
  WorkSans_700Bold,
} from '@expo-google-fonts/work-sans';

import { queryClient } from '../lib/queryClient';
import { useAuth } from '../lib/hooks/useAuth';
import { initialDeepLink, parseDeepLink, setupNotificationChannels } from '../lib/push';
import { PP } from '../lib/theme';
import { entryRedirect } from '../lib/navigation';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Show incoming push notifications even while the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Kanäle vor der ersten Nachricht anlegen, weil Android ihre Eigenschaften beim ersten Anlegen festschreibt.
setupNotificationChannels();

// expo-router renders this instead of a blank screen when a route throws.
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  const { Text, Pressable } = require('react-native');
  return (
    // Nacktes <Text>, weil dieser Bildschirm auch ohne geladene Schriften stehen muss.
    <View style={{ flex: 1, backgroundColor: PP.inkDeep, padding: PP.space.xxl, paddingTop: 80 }}>
      <Pressable
        onPress={retry}
        accessibilityRole="button"
        accessibilityLabel="Neu versuchen"
        style={{
          backgroundColor: PP.teal,
          paddingVertical: PP.space.md,
          borderRadius: PP.rTile2,
          alignItems: 'center',
          marginBottom: PP.space.xl,
        }}
      >
        <Text style={{ color: PP.onBrand, fontWeight: '700' }}>Neu versuchen</Text>
      </Pressable>
      <Text style={{ color: PP.onBrand, fontSize: PP.fontSizes.md, fontWeight: '700' }}>Fehler beim Laden</Text>
      <Text style={{ color: PP.errLight, fontSize: PP.fontSizes.base, marginTop: PP.space.sm }} selectable>
        {String(error?.message || error)}
      </Text>
      <ScrollView style={{ marginTop: PP.space.lg }}>
        <Text style={{ color: PP.ink3, fontSize: PP.fontSizes.xs }} selectable>
          {String(error?.stack || '')}
        </Text>
      </ScrollView>
    </View>
  );
}

function RootNavigator() {
  const { user, ready, isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  // ?replay=1: Einführung aus dem Profil noch einmal ansehen.
  const { replay } = useGlobalSearchParams<{ replay?: string }>();

  // Ziel einer angetippten Mitteilung bis nach dem Auth-Redirect halten, sonst überschreibt er es.
  const [pendingLink, setPendingLink] = useState<string | null>(null);
  const linkedIn = isAuthenticated && !!user?.onboarding_complete;

  // Cold start: the app was launched by tapping a notification.
  useEffect(() => {
    let cancelled = false;
    initialDeepLink().then((link) => {
      if (!cancelled && link) setPendingLink(link);
    });
    return () => { cancelled = true; };
  }, []);

  // Warm: notification tapped while the app was running or backgrounded.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      const link = parseDeepLink(res);
      if (link) setPendingLink(link);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const target = entryRedirect({
      isAuthenticated,
      onboardingComplete: !!user?.onboarding_complete,
      group: segments[0],
      replay: replay === '1',
    });
    if (target) router.replace(target as any);
  }, [ready, isAuthenticated, user?.onboarding_complete, segments, replay]);

  // Consume the pending link once the user is past login/onboarding.
  useEffect(() => {
    if (!ready || !linkedIn || !pendingLink) return;
    const link = pendingLink;
    setPendingLink(null);
    // Einen Tick nach dem Redirect, damit über den Tabs navigiert wird.
    const t = setTimeout(() => router.push(link as any), 0);
    return () => clearTimeout(t);
  }, [ready, linkedIn, pendingLink]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: PP.bg } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(visitor)" />
      {/* Universal scanner — modal, full-screen, no tab bar. */}
      <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      {/* (staff) group is added in P2 */}
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_600SemiBold,
    WorkSans_700Bold,
  });

  // Nach 2,5 s auch ohne Schriften rendern, useFonts hing schon nach SDK-Wechseln.
  const [fontTimeout, setFontTimeout] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFontTimeout(true), 2500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError || fontTimeout) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError, fontTimeout]);

  if (!fontsLoaded && !fontError && !fontTimeout) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <RootNavigator />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
