---
phase: 09-achievement-system
plan: 01
subsystem: backend
tags: [achievements, badges, streak, season, drizzle, postgresql]
dependency_graph:
  requires: []
  provides: [achievement-schema, achievement-engine, achievement-seed, achievement-api]
  affects: [scan-service, checkin-service, badges-router]
tech_stack:
  added: []
  patterns: [drizzle-orm, fire-and-forget, lazy-cache-pattern]
key_files:
  created:
    - backend/src/db/schema.ts (achievements, userAchievements, weeklyVisits tables)
    - backend/src/modules/badges/achievements.repository.ts
    - backend/src/modules/badges/achievements.engine.ts
    - backend/src/modules/badges/achievements.seed.ts
  modified:
    - backend/src/modules/badges/badges.types.ts
    - backend/src/modules/badges/badges.service.ts
    - backend/src/modules/badges/badges.router.ts
    - backend/src/modules/scan/scan.service.ts
    - backend/src/modules/checkin/checkin.service.ts
decisions:
  - "DB-Tabellen direkt via SQL angelegt statt drizzle-kit push (kein drizzle-kit im Container)"
  - "Default-Badges direkt via SQL geseedet da keine Admin-Credentials verfuegbar"
  - "Streak-Berechnung via Jahr*53+KW-Arithmetik fuer robuste Wochen-Vergleiche"
metrics:
  duration: "45 min"
  completed: "2026-04-08"
  tasks_completed: 3
  tasks_total: 3
  files_created: 4
  files_modified: 5
---

# Phase 9 Plan 01: Achievement-System Backend — Summary

Achievement-Schema mit 3 neuen DB-Tabellen, Engine fuer alle 7 Trigger-Typen, 23 Default-Badges fuer 6 Kategorien, Integration in Scan- und CheckIn-Events.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | DB-Schema erweitern | 13eaf9f | backend/src/db/schema.ts |
| 2 | Achievement-Repository + Engine + Seed | 8e08e3b | achievements.repository.ts, achievements.engine.ts, achievements.seed.ts, badges.types.ts |
| 3 | Trigger-Integration + API-Endpunkte | f1f6e89 | scan.service.ts, checkin.service.ts, badges.service.ts, badges.router.ts |

## What Was Built

### DB-Schema (Task 1)
- `achievements`: id, store_id, name, description, icon_name, trigger_type (7 enum-Werte), trigger_value, tier, season, sort_order, created_at
- `user_achievements`: id, user_id, achievement_id, progress, completed, completed_at
- `weekly_visits`: Composite PK (user_id, store_id, week_start), visit_count
- badge_levels bleibt unveraendert erhalten

### Achievement-Repository (Task 2)
- `getCurrentSeason()`: Monat 3-5=Fruehling, 6-8=Sommer, 9-11=Herbst, 12-2=Winter
- `getISOWeek()`: ISO-Wochen-String 'YYYY-WNN'
- `countItemsBrought/Taken/Visits/SeasonBrought/SeasonTaken`: DB-Zaehler
- `recordWeeklyVisit()`: Upsert in weekly_visits bei Check-In
- `calculateStreak()`: Konsekutive Wochen via Jahr*53+KW-Arithmetik
- `upsertProgress()`: Abgeschlossene Achievements werden nicht ueberschrieben

### Achievement-Engine (Task 2)
- `evaluateAchievements(userId, storeId, event)`: Wertet alle Store-Achievements aus
- Laedt vor dem Loop existierende completed-IDs (Set) fuer sauberes Diff
- Lazy-Cache verhindert doppelte DB-Abfragen pro Trigger-Typ
- Gibt nur NEU abgeschlossene Achievements zurueck

### Seed (Task 2)
- `seedDefaultAchievements(storeId)`: 23 Default-Badges, Idempotent
- 4 Bringer, 4 Holer, 4 Besucher, 4 Streak, 4 Saison, 3 Meilenstein

### API-Endpunkte (Task 3)
- `GET /api/badges/achievements` — Visitor: eigene Achievements mit Fortschritt
- `GET /api/badges/achievements/all` — Admin: alle Store-Achievements
- `POST /api/badges/achievements` — Admin: neues Achievement erstellen
- `PATCH /api/badges/achievements/:id` — Admin: Achievement bearbeiten
- `DELETE /api/badges/achievements/:id` — Admin: Achievement loeschen
- `POST /api/badges/achievements/seed` — Admin: Default-Badges seeden

### Trigger-Integration (Task 3)
- `scan.service.ts`: evaluateAchievements nach item_scan, newAchievements in Response
- `checkin.service.ts`: evaluateAchievements nach checkin, newAchievements in Response
- Fire-and-forget: Fehler werden gefangen, blockieren nicht Scan/CheckIn

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written, with two deployment adaptations:

**1. [Rule 3 - Blocking] DB-Migration via SQL statt drizzle-kit push**
- **Found during:** Task 1
- **Issue:** drizzle-kit push nicht im Container verfuegbar
- **Fix:** Tabellen direkt via `docker exec ... psql` mit CREATE TABLE IF NOT EXISTS erstellt
- **Commit:** 13eaf9f

**2. [Rule 3 - Blocking] Default-Seed via SQL statt API**
- **Found during:** Task 3 Verification
- **Issue:** Admin-Passwort nicht in secrets.env, API-Login nicht moeglich
- **Fix:** 23 Default-Badges direkt per SQL INSERT mit NOT EXISTS Guard geseedet
- Ergebnis: 23 Badges in DB bestaetigt

## Verification Results

- TypeScript: `npx tsc --noEmit` => EXIT 0 (alle 3 Tasks)
- DB-Tabellen: achievements (23 Zeilen), user_achievements, weekly_visits angelegt
- Backend deployed und healthy: `{"status":"OK"}`
- 23 Default-Badges mit korrekten trigger_type/tier-Werten in DB

## Known Stubs

None — alle Daten kommen aus der DB, kein Hardcoded-State.

## Threat Flags

Keine neuen Threat-Surfaces ausserhalb des Threat-Modells. Alle mutierende Endpunkte mit `requireRole('admin')` abgesichert, userId fuer getUserAchievements aus JWT.

## Self-Check: PASSED

- backend/src/modules/badges/achievements.repository.ts: FOUND
- backend/src/modules/badges/achievements.engine.ts: FOUND
- backend/src/modules/badges/achievements.seed.ts: FOUND
- Commit 13eaf9f: FOUND
- Commit 8e08e3b: FOUND
- Commit f1f6e89: FOUND
