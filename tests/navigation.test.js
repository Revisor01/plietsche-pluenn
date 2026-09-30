// Zurück-Taste unter Android und Einführung aus dem Profil.
//
// Tester meldeten, ein „Zurück" schließe auf der Startseite die ganze App. In
// der App gibt es dort keinen Knopf — gemeint war die System-Geste von
// Android. Sie lief an unserem eigenen Zurück-Pfeil vorbei: Alle Unterseiten
// sind versteckte Tabs, und Androids Zurück springt aus jedem Tab direkt zur
// Startseite. Ein zweites Zurück beendete dort ohne Vorwarnung die App.
//
// Die Entscheidungen stehen in mobile/lib/navigation.ts und werden hier
// ausgeführt. Dass die Screens sie wirklich benutzen, prüfen die Text-Tests
// unten — ohne Kommentare, damit ein auskommentierter Aufruf auffällt. Wie
// sich die Geste auf dem Gerät anfühlt, sieht dieser Test nicht.

import { describe, it, expect } from 'vitest';
import { entryRedirect, createExitGuard, EXIT_WINDOW_MS } from '../mobile/lib/navigation.ts';
import { code } from './helper/quelltext.js';

const stand = (felder) => ({
  isAuthenticated: true,
  onboardingComplete: true,
  group: '(visitor)',
  replay: false,
  ...felder,
});

describe('entryRedirect', () => {
  it('schickt Abgemeldete zur Anmeldung', () => {
    expect(entryRedirect(stand({ isAuthenticated: false }))).toBe('/(auth)/login');
    expect(entryRedirect(stand({ isAuthenticated: false, group: '(auth)' }))).toBe(null);
  });

  it('erzwingt die Einführung beim ersten Start', () => {
    expect(entryRedirect(stand({ onboardingComplete: false }))).toBe('/(onboarding)/welcome');
    expect(entryRedirect(stand({ onboardingComplete: false, group: '(onboarding)' }))).toBe(null);
  });

  it('lässt die Einführung aus dem Profil noch einmal zu', () => {
    expect(entryRedirect(stand({ group: '(onboarding)', replay: true }))).toBe(null);
  });

  it('leitet ohne replay aus der Einführung heraus, wenn sie erledigt ist', () => {
    expect(entryRedirect(stand({ group: '(onboarding)' }))).toBe('/(visitor)');
  });

  it('replay öffnet für Abgemeldete nichts', () => {
    expect(entryRedirect(stand({ isAuthenticated: false, group: '(onboarding)', replay: true }))).toBe('/(auth)/login');
  });

  it('lässt Angemeldete nicht auf der Anmeldeseite stehen', () => {
    expect(entryRedirect(stand({ group: '(auth)' }))).toBe('/(visitor)');
    expect(entryRedirect(stand({ group: '(auth)', replay: true }))).toBe('/(visitor)');
  });

  it('lässt die App in Ruhe', () => {
    expect(entryRedirect(stand())).toBe(null);
  });
});

describe('createExitGuard', () => {
  it('erstes Zurück warnt, zweites innerhalb des Fensters beendet', () => {
    const press = createExitGuard();
    expect(press(10_000)).toBe('warn');
    expect(press(10_000 + EXIT_WINDOW_MS)).toBe('exit');
  });

  it('nach Ablauf des Fensters warnt es wieder', () => {
    const press = createExitGuard();
    expect(press(10_000)).toBe('warn');
    expect(press(10_000 + EXIT_WINDOW_MS + 1)).toBe('warn');
  });

  it('nach dem Beenden beginnt es von vorn', () => {
    const press = createExitGuard();
    press(0);
    expect(press(500)).toBe('exit');
    expect(press(900)).toBe('warn');
  });
});

describe('Die Screens benutzen es', () => {
  it('useGoBack leitet Androids Zurück auf den eigenen Zurück-Weg', () => {
    const src = code('mobile/lib/hooks/useGoBack.ts');
    expect(src).toMatch(/BackHandler\.addEventListener\(\s*'hardwareBackPress'/);
    expect(src).toMatch(/useFocusEffect\(/);
  });

  it('die Startseite braucht ein zweites Zurück zum Beenden', () => {
    const src = code('mobile/app/(visitor)/index.tsx');
    expect(src).toMatch(/useExitOnDoubleBack\(\)/);
    const hook = code('mobile/lib/hooks/useExitOnDoubleBack.ts');
    expect(hook).toMatch(/createExitGuard\(/);
    expect(hook).toMatch(/BackHandler\.addEventListener\(\s*'hardwareBackPress'/);
  });

  it('der Einstiegs-Wächter entscheidet über entryRedirect, mit replay', () => {
    const src = code('mobile/app/_layout.tsx');
    expect(src).toMatch(/entryRedirect\(\{/);
    expect(src).toMatch(/replay:/);
  });

  it('das Profil führt zur Einführung, mit replay', () => {
    const src = code('mobile/app/(visitor)/settings/account.tsx');
    expect(src).toMatch(/\/\(onboarding\)\/welcome\?replay=1/);
  });

  it('beim Wiederholen setzt „Fertig" nichts am Konto', () => {
    const src = code('mobile/app/(onboarding)/permissions.tsx');
    expect(src).toMatch(/if \(replay\)/);
  });
});
