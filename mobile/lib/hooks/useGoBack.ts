import { useCallback, useRef } from 'react';
import { BackHandler } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';

// Back navigation for screens that live inside the tab navigator.
//
// Those screens are registered as tabs with `href: null` (see (visitor)/_layout).
// router.back() therefore pops to the FIRST tab — the home screen — instead of
// the screen the user actually came from. Callers pass `?from=<route>`; this
// hook navigates there explicitly and only falls back to history when no origin
// was given.
//
// Androids Zurück (Taste oder Wisch-Geste) nimmt denselben Weg. Vorher lief es
// am Hook vorbei, sprang aus jeder Unterseite direkt zur Startseite — und ein
// zweites Zurück beendete dort die App. Registriert wird nur, solange der
// Screen im Fokus ist: versteckte Tabs bleiben nach dem ersten Besuch
// gemountet und dürfen die Taste dann nicht mehr abfangen.
//
// Usage:
//   const goBack = useGoBack();                      // falls back to home
//   const goBack = useGoBack('/(visitor)/badges');   // custom default origin
export function useGoBack(fallback: string = '/(visitor)') {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();

  const goBack = () => {
    if (from) router.replace(from as any);
    else if (router.canGoBack()) router.back();
    else router.replace(fallback as any);
  };

  // Immer die aktuelle Fassung aufrufen, ohne den Listener bei jedem Rendern
  // neu anzumelden.
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
