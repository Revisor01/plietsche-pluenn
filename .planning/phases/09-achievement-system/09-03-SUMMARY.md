---
phase: 09-achievement-system
plan: "03"
subsystem: mobile/admin
tags: [achievements, admin, crud, navigation]
dependency_graph:
  requires: [09-01]
  provides: [AchievementAdminScreen, Admin-CRUD-Endpunkte-Client]
  affects: [mobile/src/navigation/AppNavigator.tsx]
tech_stack:
  added: []
  patterns: [FlatList-mit-ListFooter-Formular, ScrollView-Chips-statt-Picker, Alert-Bestaetigung]
key_files:
  created:
    - mobile/src/screens/admin/AchievementAdminScreen.tsx
  modified:
    - mobile/src/api/badges.api.ts
    - mobile/src/navigation/AppNavigator.tsx
decisions:
  - Picker als horizontale ScrollView-Chips implementiert (kein @react-native-picker/picker installiert)
  - BadgeLevelsScreen Datei beibehalten, aber aus Navigation entfernt
  - Seed-Button in EmptyState und als Header-Button wenn Liste nicht leer
metrics:
  duration: "~15 Minuten"
  completed: "2026-04-08T23:04:01Z"
  tasks_completed: 2
  tasks_total: 3
  files_created: 1
  files_modified: 2
---

# Phase 9 Plan 03: AchievementAdminScreen — Badge-Verwaltung fuer Admins

Admin-CRUD-Screen fuer Achievements mit FlatList, Formular als ListFooterComponent, Seed-Button und FA5-Icons ohne Emoji.

## Tasks

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Admin API-Funktionen + AchievementAdminScreen | 64538ee | Abgeschlossen |
| 2 | Navigation umstellen | c692299 | Abgeschlossen |
| 3 | Checkpoint: Visuelle Verifikation | — | Ausstehend (human-verify) |

## Was wurde gebaut

### badges.api.ts — Admin-Funktionen

Fuenf neue Exports angehaengt:
- `fetchAllAchievements()` — GET /api/badges/achievements/all
- `createAchievement(body)` — POST /api/badges/achievements
- `updateAchievement(id, body)` — PATCH /api/badges/achievements/:id
- `deleteAchievement(id)` — DELETE /api/badges/achievements/:id
- `seedAchievements()` — POST /api/badges/achievements/seed
- `CreateAchievementInput` Interface

### AchievementAdminScreen.tsx

Vollstaendiger Admin-CRUD-Screen:
- FlatList mit Achievement-Karten (Icon, Name, Trigger-Label, Wert, Tier-Badge)
- Bearbeiten-Button fuellt Formular, setzt editingId
- Loeschen mit Alert.alert-Bestaetigung
- Formular als ListFooterComponent: Name, Beschreibung, Icon-Name, Trigger-Typ (ScrollView-Chips), Trigger-Wert, Tier (4 Buttons), Saison (5 Buttons), Sortierung
- Speichern erstellt oder aktualisiert je nach editingId
- Abbrechen-Button im Edit-Modus
- Default-Badges-laden Button (EmptyState + Header wenn Liste gefuellt)
- Kein Emoji — alle Icons FA5 icon_name Strings

### AppNavigator.tsx

- Import von BadgeLevelsScreen durch AchievementAdminScreen ersetzt
- AdminTabs Badges-Tab: component auf AchievementAdminScreen geaendert, Icon von "medal" auf "trophy"
- Stack.Screen "BadgeLevels" durch "AchievementAdmin" ersetzt

## Checkpoint-Hinweis

Task 3 ist ein `checkpoint:human-verify`. Der Screen muss manuell verifiziert werden:
1. Als Admin einloggen, Badges-Tab oeffnen
2. AchievementAdminScreen erscheint (nicht mehr Badge-Stufen-Liste)
3. "Default-Badges laden" — 23 Badges werden geladen
4. Bearbeiten, Speichern, Loeschen testen
5. Neues Badge erstellen
6. Kein Emoji sichtbar

## Deviations from Plan

None — Plan exakt ausgefuehrt. Picker-Chips-Ansatz war bereits im Plan vorgegeben.

## Known Stubs

None — AchievementAdminScreen laedt live vom Backend-Endpunkt /api/badges/achievements/all.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| T-09-08 mitigated (client-side) | AchievementAdminScreen.tsx | Screen nur in AdminTabs sichtbar; Backend-seitiger requireRole('admin') bleibt Hauptschutz |

## Self-Check: PASSED

- AchievementAdminScreen.tsx: FOUND
- badges.api.ts: FOUND
- AppNavigator.tsx: FOUND
- Commit 64538ee: FOUND
- Commit c692299: FOUND
