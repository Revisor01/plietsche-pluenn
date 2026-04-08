---
phase: 03-visitor-experience
plan: "03"
subsystem: points
tags: [backend, mobile, points, store-settings, zustand, drizzle, gamification]
dependency_graph:
  requires: [03-01, 03-02]
  provides: [points-api, store-settings, homescreen-balance, points-history]
  affects: [scan-service, checkin-service]
tech_stack:
  added: []
  patterns: [drizzle-orm upsert onConflictDoUpdate, zustand store für API-Cache, konfigurierbare Defaults via store_settings-Tabelle]
key_files:
  created:
    - backend/src/modules/points/points.repository.ts
    - backend/src/modules/points/points.service.ts
    - backend/src/modules/points/points.router.ts
    - mobile/src/api/points.api.ts
    - mobile/src/store/pointsStore.ts
  modified:
    - backend/src/db/schema.ts
    - backend/src/app.ts
    - backend/src/modules/scan/scan.service.ts
    - backend/src/modules/checkin/checkin.service.ts
    - mobile/src/screens/visitor/HomeScreen.tsx
    - mobile/src/screens/visitor/PointsHistoryScreen.tsx
    - mobile/src/screens/visitor/ScanScreen.tsx
    - mobile/src/screens/visitor/CheckInScreen.tsx
decisions:
  - "AuthUser.sub statt .id verwendet — JWT-Payload nutzt sub als userId-Claim"
  - "store_settings Default-Fallback im Repository (keine DB-Abhängigkeit bei fehlendem Eintrag)"
  - "loadBalance in ScanScreen und CheckInScreen nach Erfolg — sofortiger HomeScreen-Refresh"
metrics:
  duration_minutes: 35
  completed_date: "2026-04-08"
  tasks_completed: 2
  tasks_total: 3
  files_created: 5
  files_modified: 8
---

# Phase 03 Plan 03: PlietschPunkte-Engine Summary

**One-liner:** store_settings-Tabelle für konfigurierbare Punkte-Werte pro Store, points-API (Balance + History), HomeScreen mit prominentem Punktestand auf blauem Card, PointsHistoryScreen ohne Item-Tracking.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | store_settings + points-Backend-Modul + Hardcodes ersetzen | e066b3f | schema.ts, points.repository.ts, points.router.ts, scan.service.ts, checkin.service.ts |
| 2 | HomeScreen Punktestand + PointsHistoryScreen Mobile | 158e1ba | HomeScreen.tsx, PointsHistoryScreen.tsx, pointsStore.ts, points.api.ts |
| 3 | Checkpoint: Human Verify (Phase 3 vollständig) | — | Manuelle Verifikation ausstehend |

## Verification Results

### Backend
- GET /api/points/balance → `{"points":24}` — OK
- GET /api/points/history → `{"transactions":[...]}` ohne itemId-Feld — OK
- PATCH /api/points/settings (admin) → HTTP 200 `{"ok":true}` — OK
- store_settings-Tabelle mit Default-Eintrag für Store-UUID `6a0fb86e-...` — OK
- npx tsc --noEmit (backend) → EXIT 0 — OK

### Mobile
- HomeScreen: "PlietschPunkte" Label + große Zahl auf blauem Card — OK
- PointsHistoryScreen: FlatList mit Datum + Quelle-Label + Punkte — OK
- PointTransaction-Interface ohne itemId — OK
- npx tsc --noEmit (mobile) → EXIT 0 — OK

### Checkpoint: Human Verify (Task 3)
Ausstehend — erfordert manuelle iOS-App-Verifikation:
1. App auf iOS starten, als Visitor einloggen
2. HomeScreen zeigt "PlietschPunkte" + Zahl auf blauem Card
3. Scan-Tab → QR-Code scannen → Toast + HomeScreen-Punktestand aktualisiert
4. Punkte-Tab → Transaktionsliste sichtbar
5. Check-In-Flow vollständig durchführen

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] AuthUser.sub statt .id in points.router.ts**
- **Found during:** Task 1 TypeScript-Check
- **Issue:** Plan-Code nutzte `req.user!.id`, aber `AuthUser`-Interface hat `sub` (JWT-Standard)
- **Fix:** `req.user!.id` → `req.user!.sub` in GET /balance und GET /history
- **Files modified:** backend/src/modules/points/points.router.ts
- **Commit:** e066b3f (Teil des Task-1-Commits)

**2. [Rule 3 - Blocking] docker restart nutzte altes Image**
- **Found during:** Task 1 Deployment-Verifikation
- **Issue:** `docker restart` startet Container neu aber mit demselben Image — neues Image wird nicht geladen
- **Fix:** Container gestoppt, removed, und mit `docker run` + korrekten Netzwerken/Env-Vars neu erstellt
- **Impact:** Kurzer Gateway Timeout (~30 Sek) während Neuerstellung

## Requirements Fulfilled

- PUNKT-01: Prominente Punktestand-Anzeige auf HomeScreen (blauer Card, 72px Zahl)
- PUNKT-02: Konfigurierbare Punkte-Werte via store_settings (Default: Scan=10, CheckIn=5, Part=3)
- PUNKT-03: point_transactions hat kein itemId — kein persistenter User↔Item-Link

## Phase 3 Status

**COMPLETE** (pending human-verify checkpoint)

Alle drei Phase-3-Pläne ausgeführt:
- 03-01: Item-QR-Scan + Punkte-Engine-Basis
- 03-02: Check-In-Flow (GPS + Tür-QR + Stepper)
- 03-03: store_settings + points-API + HomeScreen Gamification-Loop

## Known Stubs

Keine. Alle Datenquellen sind live verdrahtet.

## Self-Check: PASSED

- backend/src/modules/points/points.router.ts — FOUND
- backend/src/modules/points/points.service.ts — FOUND
- backend/src/modules/points/points.repository.ts — FOUND
- mobile/src/api/points.api.ts — FOUND
- mobile/src/store/pointsStore.ts — FOUND
- Commit e066b3f — FOUND
- Commit 158e1ba — FOUND
