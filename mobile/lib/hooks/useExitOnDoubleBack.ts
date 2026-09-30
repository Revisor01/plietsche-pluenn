import { useCallback, useRef } from 'react';
import { BackHandler, Platform, ToastAndroid } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { createExitGuard } from '../navigation';

// Startseite unter Android: Das erste Zurück zeigt nur einen Hinweis, erst ein
// zweites kurz danach beendet die App (Logik in ../navigation.ts). Vorher
// reichte ein einziges versehentliches Wischen vom Bildschirmrand.
// Unter iOS gibt es keine Zurück-Taste; dort tut der Hook nichts.
export function useExitOnDoubleBack() {
  const guard = useRef(createExitGuard());

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (guard.current(Date.now()) === 'exit') return false; // System beendet
        ToastAndroid.show('Nochmal zurück zum Beenden', ToastAndroid.SHORT);
        return true;
      });
      return () => sub.remove();
    }, []),
  );
}
