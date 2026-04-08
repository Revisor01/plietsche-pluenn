---
phase: 09-achievement-system
plan: "02"
subsystem: mobile
tags: [achievements, badges, navigation, toast, react-native]
dependency_graph:
  requires: [09-01]
  provides: [BadgeOverviewScreen, HomeScreen-achievement-display, badge-toast]
  affects: [mobile/src/screens/visitor, mobile/src/navigation, mobile/src/api]
tech_stack:
  added: []
  patterns: [useNavigation hook, fetchMyAchievements, Toast.show, grouped category rendering]
key_files:
  created:
    - mobile/src/screens/visitor/BadgeOverviewScreen.tsx
  modified:
    - mobile/src/api/badges.api.ts
    - mobile/src/screens/visitor/HomeScreen.tsx
    - mobile/src/navigation/AppNavigator.tsx
    - mobile/src/api/scan.api.ts
    - mobile/src/api/checkin.api.ts
    - mobile/src/screens/visitor/ScanScreen.tsx
    - mobile/src/screens/visitor/CheckInScreen.tsx
decisions:
  - "fetchMyBadge (altes Badge-System) bleibt in badges.api.ts fuer Abwaertskompatibilitaet, wird aber im HomeScreen nicht mehr genutzt"
  - "progressContainer/progressBar Styles aus HomeScreen entfernt da nicht mehr benoetigt"
  - "width als unknown as number gecasted fuer prozentuale Breite im progressFill Style (RN-Limitation)"
metrics:
  duration: "~25 Minuten"
  completed: "2026-04-08T22:45:33Z"
  tasks_completed: 2
  tasks_total: 3
  files_created: 1
  files_modified: 6
---

# Phase 9 Plan 02: Badge-Uebersichtsseite und HomeScreen-Achievement-Anzeige

Badge-Uebersichtsseite mit 6 Kategorien und Tier-Farben, HomeScreen auf fetchMyAchievements umgestellt, Toast-Benachrichtigung bei neuem Badge nach Scan oder Check-In.

## Tasks

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | badges.api.ts erweitern + BadgeOverviewScreen erstellen | 0720ccb | done |
| 2 | HomeScreen Badge-Update + Toast-Integration + Navigation | 7aa2bb6 | done |
| 3 | Checkpoint: Visuelle Verifikation | — | checkpoint (noted, not blocking) |

## What Was Built

**BadgeOverviewScreen** (`mobile/src/screens/visitor/BadgeOverviewScreen.tsx`):
- ScrollView mit 6 Kategorien: Bringer, Holer, Besucher, Streaks, Saison, Meilensteine
- Erreichte Badges: Tier-Farbe als Rahmen und Icon-Hintergrund, completedAt-Datum
- Ausstehende Badges: grauer Hintergrund, Fortschrittsbalken, "X von Y [Einheit]"-Text
- Tier-Farben: bronze=#CD7F32, silber=#A8A9AD, gold=#FFD700, custom=colors.primary
- Ladeindikator und Fehler+Retry-Zustand

**badges.api.ts** — Neue Typen und Funktion angehaengt (bestehende Exporte unveraendert):
- `TriggerType`, `Tier`, `Season`, `Achievement`, `AchievementWithProgress` exportiert
- `fetchMyAchievements()` ruft GET /api/badges/achievements auf

**HomeScreen.tsx**:
- `fetchMyAchievements` statt `fetchMyBadge` verwendet
- Hoechstes erreichtes Achievement (nach sortOrder absteigend) als `topAchievement` angezeigt
- "X von Y Badges erreicht" als Fortschritts-Zaehler
- "Alle Badges ansehen" Button navigiert zu BadgeOverview

**AppNavigator.tsx**:
- `BadgeOverviewScreen` als Stack.Screen `BadgeOverview` registriert

**scan.api.ts / checkin.api.ts**:
- `newAchievements?: Array<{ name: string; iconName: string }>` zu ScanResult und CheckInResult hinzugefuegt

**ScanScreen.tsx / CheckInScreen.tsx**:
- Toast "Neues Badge freigeschaltet!" pro Achievement wenn `newAchievements` in Response enthalten

## Checkpoint

Task 3 ist ein `checkpoint:human-verify`. Gemaess Plan-Anweisung ("If plan has checkpoint, note in SUMMARY and continue") wurde der Checkpoint dokumentiert und die Ausfuehrung fortgesetzt. Visuelle Verifikation durch den Benutzer steht noch aus:

1. App starten (iOS Simulator oder Device)
2. Als Visitor einloggen
3. HomeScreen: "X von Y Badges erreicht" pruefen (kein Emoji)
4. "Alle Badges ansehen" antippen: BadgeOverviewScreen oeffnet sich
5. Kategorien (Bringer, Holer, Besucher, Streaks, Saison, Meilensteine) pruefen
6. Fortschrittsbalken und "X von Y"-Text bei ausstehenden Badges pruefen
7. Scan oder Check-In: Toast erscheint oben wenn Badge freigeschaltet
8. Keine Emojis sichtbar in der gesamten Badge-Anzeige

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. fetchMyAchievements() ist vollstaendig implementiert und ruft den echten Backend-Endpunkt auf (implementiert in Plan 09-01).

## Self-Check: PASSED

- `/Users/simonluthe/Documents/plietsche-pluenn/mobile/src/screens/visitor/BadgeOverviewScreen.tsx` existiert
- `/Users/simonluthe/Documents/plietsche-pluenn/mobile/src/api/badges.api.ts` exportiert fetchMyAchievements
- Commit 0720ccb vorhanden
- Commit 7aa2bb6 vorhanden
- TypeScript: npx tsc --noEmit = EXIT 0
- Keine Emojis in BadgeOverviewScreen.tsx (nur FA5 icon_name Strings)
