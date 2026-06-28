import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
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
import { PP } from '../lib/theme';

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

// expo-router renders this instead of a blank screen when a route throws.
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  const { Text, Pressable } = require('react-native');
  return (
    <View style={{ flex: 1, backgroundColor: '#0e1c1b', padding: 24, paddingTop: 80 }}>
      <Pressable
        onPress={retry}
        style={{ backgroundColor: PP.teal, paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginBottom: 20 }}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>Neu versuchen</Text>
      </Pressable>
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Fehler beim Laden</Text>
      <Text style={{ color: '#ffb3b0', fontSize: 13, marginTop: 8 }} selectable>
        {String(error?.message || error)}
      </Text>
      <ScrollView style={{ marginTop: 16 }}>
        <Text style={{ color: '#9AA8A7', fontSize: 11 }} selectable>
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

  useEffect(() => {
    if (!ready) return;
    const group = segments[0];
    const inAuth = group === '(auth)';
    const inOnboarding = group === '(onboarding)';

    if (!isAuthenticated && !inAuth) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && !user?.onboarding_complete && !inOnboarding) {
      router.replace('/(onboarding)/welcome');
    } else if (isAuthenticated && user?.onboarding_complete && (inAuth || inOnboarding)) {
      router.replace('/(visitor)');
    }
  }, [ready, isAuthenticated, user?.onboarding_complete, segments]);

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

  // Safety: render after 2.5s even if useFonts never resolves (it has hung
  // before after SDK changes). System font is an acceptable fallback.
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
