// Navigationsentscheidungen ohne React Native, testbar in tests/navigation.test.js.

export type EntryState = {
  isAuthenticated: boolean;
  onboardingComplete: boolean;
  // Erstes Routensegment, z. B. '(auth)', '(onboarding)', '(visitor)'.
  group: string | undefined;
  // Einführung aus dem Profil noch einmal ansehen (?replay=1).
  replay: boolean;
};

// Ziel des Einstiegs-Wächters oder null; beim bewussten Wiederholen bleibt die Einführung offen.
export function entryRedirect(s: EntryState): string | null {
  const inAuth = s.group === '(auth)';
  const inOnboarding = s.group === '(onboarding)';

  if (!s.isAuthenticated) return inAuth ? null : '/(auth)/login';
  if (!s.onboardingComplete) return inOnboarding ? null : '/(onboarding)/welcome';
  if (inAuth) return '/(visitor)';
  if (inOnboarding && !s.replay) return '/(visitor)';
  return null;
}

// Android: Zurück auf der Startseite braucht ein zweites Mal im Zeitfenster.
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
