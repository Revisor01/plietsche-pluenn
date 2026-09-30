// Navigationsentscheidungen ohne React Native, damit sie sich in Node testen
// lassen (tests/navigation.test.js). Die Screens und _layout.tsx reichen nur
// den aktuellen Stand herein.

export type EntryState = {
  isAuthenticated: boolean;
  onboardingComplete: boolean;
  // Erstes Routensegment, z. B. '(auth)', '(onboarding)', '(visitor)'.
  group: string | undefined;
  // Einführung aus dem Profil noch einmal ansehen (?replay=1).
  replay: boolean;
};

// Wohin der Einstiegs-Wächter in _layout.tsx umleitet — oder null, wenn die
// aktuelle Route passt.
//
// Die Einführung ist beim ersten Start Pflicht. Wer sie schon hinter sich hat,
// wird aus (onboarding) herausgeleitet — außer beim bewussten Wiederholen aus
// dem Profil. Ohne diese Ausnahme schlüge der Wächter die Einführung sofort
// wieder zu.
export function entryRedirect(s: EntryState): string | null {
  const inAuth = s.group === '(auth)';
  const inOnboarding = s.group === '(onboarding)';

  if (!s.isAuthenticated) return inAuth ? null : '/(auth)/login';
  if (!s.onboardingComplete) return inOnboarding ? null : '/(onboarding)/welcome';
  if (inAuth) return '/(visitor)';
  if (inOnboarding && !s.replay) return '/(visitor)';
  return null;
}

// Android: Zurück auf der Startseite beendet die App. Ein versehentliches
// Wischen vom Bildschirmrand — etwa beim Blättern durchs Schaufenster —
// reichte dafür. Jetzt braucht es ein zweites Zurück innerhalb des Fensters;
// das erste zeigt nur einen Hinweis.
export const EXIT_WINDOW_MS = 2000;

export function createExitGuard(windowMs: number = EXIT_WINDOW_MS) {
  let lastPress = -Infinity;
  return (now: number): 'warn' | 'exit' => {
    if (now - lastPress <= windowMs) {
      lastPress = -Infinity;
      return 'exit';
    }
    lastPress = now;
    return 'warn';
  };
}
