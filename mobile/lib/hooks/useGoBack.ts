import { useCallback, useRef } from 'react';
import { BackHandler } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';

// Zurück zur Herkunft aus `?from=`, weil router.back() in Tab-Unterseiten zum ersten Tab springt; auch für Androids Zurück, nur im Fokus.
export function useGoBack(fallback: string = '/(visitor)') {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();

  const goBack = () => {
    if (from) router.replace(from as any);
    else if (router.canGoBack()) router.back();
    else router.replace(fallback as any);
  };

  // Aktuelle Fassung aufrufen, ohne den Listener neu anzumelden.
  const latest = useRef(goBack);
  latest.current = goBack;

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        latest.current();
        return true;
      });
      return () => sub.remove();
    }, []),
  );

  return goBack;
}
