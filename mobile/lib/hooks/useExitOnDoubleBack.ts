import { useCallback, useRef } from 'react';
import { BackHandler, Platform, ToastAndroid } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { createExitGuard } from '../navigation';

// Android: erst ein zweites Zurück beendet die App (../navigation.ts); auf iOS ohne Wirkung.
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
