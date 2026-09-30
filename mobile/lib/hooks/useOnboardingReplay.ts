import { useRouter, useLocalSearchParams } from 'expo-router';

// Einführung aus dem Profil noch einmal ansehen.
//
// Der Parameter ?replay=1 muss auf jeder Seite mitlaufen: Fehlt er, hält der
// Einstiegs-Wächter in _layout.tsx die Einführung für erledigt und leitet
// sofort auf die Startseite (siehe entryRedirect in ../navigation.ts).
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
