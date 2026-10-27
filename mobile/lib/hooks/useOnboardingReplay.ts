import { useRouter, useLocalSearchParams } from 'expo-router';

// Einführung erneut ansehen; ?replay=1 muss auf jeder Seite mit, sonst leitet der Einstiegs-Wächter weg.
export function useOnboardingReplay() {
  const router = useRouter();
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const isReplay = replay === '1';

  return {
    replay: isReplay,
    // An jede Weiter-Route anhängen.
    suffix: isReplay ? '?replay=1' : '',
    // Zurück ins Profil, von wo die Einführung geöffnet wurde.
    close: () => router.dismissTo('/(visitor)/settings/account'),
  };
}
