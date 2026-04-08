---
phase: 06-engagement-features
plan: "03"
subsystem: badges
tags: [badges, achievements, gamification, backend, mobile]
dependency_graph:
  requires: ["06-01", "06-02"]
  provides: ["badge-system", "badge-progress-api", "badge-admin-screen"]
  affects: ["HomeScreen", "VolunteerTabs", "points-system"]
tech_stack:
  added: []
  patterns: ["Drizzle ORM table definition", "Express Router mit requireRole", "FlatList mit Formular als ListFooterComponent"]
key_files:
  created:
    - backend/src/modules/badges/badges.types.ts
    - backend/src/modules/badges/badges.repository.ts
    - backend/src/modules/badges/badges.service.ts
    - backend/src/modules/badges/badges.router.ts
    - mobile/src/api/badges.api.ts
    - mobile/src/screens/admin/BadgeLevelsScreen.tsx
  modified:
    - backend/src/db/schema.ts
    - backend/src/app.ts
    - mobile/src/screens/visitor/HomeScreen.tsx
    - mobile/src/navigation/AppNavigator.tsx
decisions:
  - "userId für getBadgeProgress kommt aus req.user.sub (JWT), nicht aus Request-Body — T-06-03-04"
  - "Volunteer kann Level lesen (GET /levels), aber nur Admin kann schreiben (POST/DELETE)"
  - "Fortschrittsbalken nur angezeigt wenn nextLevel vorhanden; bei max Level Text 'Maximales Level erreicht'"
metrics:
  duration_minutes: 9
  completed_date: "2026-04-08"
  tasks_completed: 2
  tasks_total: 2
  files_created: 6
  files_modified: 4
---

# Phase 6 Plan 03: Badge/Achievement-System Summary

**One-liner:** Konfigurierbares Badge-Level-System mit PostgreSQL-Tabelle, 5 Default-Stufen, /api/badges/my Fortschritts-Endpoint, Admin-Verwaltungsscreen und Fortschrittsbalken im Visitor-Homescreen.

## What Was Built

badge_levels-Tabelle mit 5 Default-Stufen (Neuling 0, Entdecker 25, Stammgast 50, Plietsch-Kenner 100, Plietsch-Profi 200), vollständiges badges-Modul im Backend (Repository, Service, Router), Badge-Fortschrittsanzeige in der Visitor-App sowie Admin-Screen zur Level-Verwaltung.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Schema + Backend | 44286cb | schema.ts, badges.repository.ts, badges.router.ts, app.ts |
| 2 | Homescreen + Admin-Screen | 8b4fa86 | badges.api.ts, HomeScreen.tsx, BadgeLevelsScreen.tsx, AppNavigator.tsx |

## API Endpoints

| Method | Path | Auth | Beschreibung |
|--------|------|------|--------------|
| GET | /api/badges/my | visitor+ | Aktuelles Level + Fortschritt (currentLevel, nextLevel, progressPercent, pointsToNext) |
| GET | /api/badges/levels | volunteer+ | Alle Level des Stores |
| POST | /api/badges/levels | admin | Neue Stufe anlegen |
| DELETE | /api/badges/levels/:id | admin | Stufe löschen (storeId-Check) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] req.params.id hat Typ string | string[] in Express 5**
- **Found during:** Task 1 TypeScript-Kompilierung
- **Issue:** `badges.router.ts(37)`: `Argument of type 'string | string[]' is not assignable to parameter of type 'string'`
- **Fix:** `String(req.params.id)` — konsistent mit campaigns.router.ts
- **Files modified:** backend/src/modules/badges/badges.router.ts
- **Commit:** 44286cb

**2. [Rule 3 - Blocking] Falsches Postgres-Passwort im manuellen Container-Start-Befehl**
- **Found during:** Task 1 Verifikation
- **Issue:** Der vorgegebene Rebuild-Befehl nutzt `grep POSTGRES_PASSWORD .env | cut -d= -f2` auf backend/.env — dort steht aber nur DATABASE_URL mit Passwort `plietsche`, nicht die Variable `POSTGRES_PASSWORD`. Das echte Passwort liegt in `/opt/stacks/plietsche-pluenn/.env`
- **Fix:** Container mit expliziter DATABASE_URL und `--env-file /opt/stacks/plietsche-pluenn/.env` gestartet
- **Keine Code-Änderung** — nur Deployment-Anpassung

## Threat Model Coverage

| Threat | Mitigation | Status |
|--------|-----------|--------|
| T-06-03-01: POST /levels Elevation | requireRole('admin') | Verifiziert — Visitor erhält 403 |
| T-06-03-02: DELETE /levels/:id Elevation | requireRole('admin') + storeId-Check in Repository | Implementiert |
| T-06-03-03: GET /my Info Disclosure | userId = req.user.sub, kein Fremdzugriff | Akzeptiert |
| T-06-03-04: getBadgeProgress userId Tampering | userId aus JWT, nicht aus Body | Implementiert |

## Known Stubs

Keine — alle Daten kommen live aus der API.

## Self-Check

### Files exist:
- backend/src/modules/badges/badges.types.ts: FOUND
- backend/src/modules/badges/badges.repository.ts: FOUND
- backend/src/modules/badges/badges.router.ts: FOUND
- mobile/src/api/badges.api.ts: FOUND
- mobile/src/screens/admin/BadgeLevelsScreen.tsx: FOUND

### Commits exist:
- 44286cb: FOUND
- 8b4fa86: FOUND

## Self-Check: PASSED
