---
phase: 07-onboarding-rollen
plan: "01"
subsystem: mobile-onboarding
tags: [onboarding, navigation, auth-store, async-storage]
dependency_graph:
  requires: []
  provides: [onboarding-flow, onboarding-gate]
  affects: [mobile/src/navigation/AppNavigator.tsx, mobile/src/store/authStore.ts]
tech_stack:
  added: ["@react-native-async-storage/async-storage"]
  patterns: [zustand-async-action, navigation-gate, paginated-scroll-view]
key_files:
  created:
    - mobile/src/screens/onboarding/OnboardingScreen.tsx
  modified:
    - mobile/src/store/authStore.ts
    - mobile/src/navigation/AppNavigator.tsx
    - mobile/package.json
decisions:
  - "AsyncStorage per fire-and-forget in completeOnboarding() — kein await nötig da UI sofort reagiert"
  - "Onboarding-Gate im AppNavigator per Stack.Screen statt Modal — konsistenter mit bestehender Navigationsstruktur"
  - "completeOnboarding direkt als useAuthStore-Selektor an OnboardingScreen übergeben statt useAuthStore.getState()"
metrics:
  duration_minutes: 17
  completed_date: "2026-04-08"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 3
---

# Phase 7 Plan 01: Onboarding-Flow Summary

**One-liner:** 4-Screen horizontales Swipe-Onboarding mit AsyncStorage-Persistenz und Visitor-Gate im AppNavigator.

## Was implementiert wurde

Neue Besucher (Rolle `visitor`) sehen beim ersten App-Start nach dem Login einen 4-Screen Onboarding-Flow. Der Flow erklärt das Konzept von Plietsche Plünn und ist über einen Skip-Button überspringbar. Nach Abschluss oder Skip wird das Flag `onboarding_completed` in AsyncStorage gespeichert — beim nächsten Start wird das Flag geladen und das Onboarding nicht mehr angezeigt. Volunteers und Admins sehen das Onboarding nie.

## Datei-Änderungen

### Neu erstellt

**`mobile/src/screens/onboarding/OnboardingScreen.tsx`**
- 4 Slides mit horizontalem Paging via `ScrollView pagingEnabled`
- Slide-Inhalte: Willkommen, QR-Code scannen, Punkte sammeln, Komm vorbei
- Skip-Button (oben rechts), Weiter/Los geht's!-Button (unten)
- Punkt-Indikatoren, Scroll-Tracking via `onScroll` + `scrollEventThrottle`
- Props: `onComplete: () => void`

### Modifiziert

**`mobile/src/store/authStore.ts`**
- `AsyncStorage` Import hinzugefügt
- Interface erweitert: `onboardingCompleted: boolean`, `completeOnboarding()`, `loadOnboardingState()`
- `completeOnboarding`: setzt Store-Flag + schreibt AsyncStorage (fire-and-forget)
- `loadOnboardingState`: liest AsyncStorage beim App-Start

**`mobile/src/navigation/AppNavigator.tsx`**
- `OnboardingScreen` und `useEffect` importiert
- `onboardingCompleted`, `loadOnboardingState`, `completeOnboarding` aus Store selektiert
- `useEffect` lädt AsyncStorage-Flag beim Mount
- Onboarding-Gate: wenn `token && !onboardingCompleted && role === 'visitor'` → OnboardingScreen zeigen

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] AsyncStorage-Paket fehlte**
- **Found during:** Task 2
- **Issue:** `@react-native-async-storage/async-storage` war nicht im Projekt installiert, obwohl der Plan davon ausging es sei bereits vorhanden. TypeScript-Fehler TS2307.
- **Fix:** `npm install @react-native-async-storage/async-storage` ausgeführt
- **Files modified:** `mobile/package.json`, `mobile/package-lock.json`
- **Commit:** 8ca0577

## Known Stubs

Keine — alle 4 Slides haben vollständigen Inhalt, kein Placeholder-Text.

## Threat Flags

Keine neuen Threat-Surfaces. AsyncStorage-Flag `onboarding_completed` ist absichtlich ohne Sicherheitswert (T-07-01-01 accept in Plan-Threat-Register dokumentiert). Role-Check im AppNavigator basiert auf JWT-gesichertem Store (T-07-01-02 mitigate — kein Client-Override möglich).

## Self-Check: PASSED

- FOUND: mobile/src/screens/onboarding/OnboardingScreen.tsx
- FOUND: mobile/src/store/authStore.ts
- FOUND: mobile/src/navigation/AppNavigator.tsx
- FOUND commit c8f4ddc (Task 1)
- FOUND commit 8ca0577 (Task 2)
