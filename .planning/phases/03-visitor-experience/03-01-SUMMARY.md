---
phase: 03-visitor-experience
plan: "01"
subsystem: scan
tags: [backend, mobile, qr-scan, points, drizzle, react-native-vision-camera]
dependency_graph:
  requires: [01-foundation, 02-volunteer-core]
  provides: [POST /api/scan, point_transactions table, ScanScreen]
  affects: [users.plietsch_points, items.status, items.created_by]
tech_stack:
  added: [react-native-toast-message@2.3.3]
  patterns: [Router→Service→Repository, useCodeScanner, role-based navigation]
key_files:
  created:
    - backend/src/modules/scan/scan.router.ts
    - backend/src/modules/scan/scan.service.ts
    - backend/src/modules/scan/scan.repository.ts
    - mobile/src/api/scan.api.ts
    - mobile/src/screens/visitor/ScanScreen.tsx
    - mobile/src/screens/visitor/CheckInScreen.tsx
    - mobile/src/screens/visitor/PointsHistoryScreen.tsx
    - mobile/src/screens/visitor/HomeScreen.tsx
  modified:
    - backend/src/db/schema.ts
    - backend/src/app.ts
    - mobile/src/navigation/AppNavigator.tsx
key_decisions:
  - "req.user.sub statt req.user.id — AuthUser JWT-Payload nutzt 'sub' als userId-Feld"
  - "pointTransactions ohne itemId — DSGVO-Locked-Decision SCAN-02/PUNKT-03, kein User↔Item-Link"
  - "Alle authentifizierten Rollen dürfen scannen (kein requireRole) — T-03-04 accept"
  - "POINTS_PER_SCAN=10 hartkodiert in dieser Phase — wird in Plan 03 durch store_settings ersetzt"
metrics:
  duration: ~45min
  completed: 2026-04-08
  tasks_completed: 2
  files_created: 8
  files_modified: 3
---

# Phase 3 Plan 01: QR-Scan Backend + Mobile Summary

Item-QR-Scan vollständig implementiert: Backend scan-Modul (Router/Service/Repository) mit POST /api/scan Endpoint, SQL-Migrationen für point_transactions und items.created_by auf Server ausgeführt, Mobile ScanScreen mit react-native-vision-camera und Toast-Feedback, role-basierte Navigation für Visitor vs. Volunteer/Admin.

## Completed Tasks

### Task 1: scan-Modul Backend + Schema-Ergänzung
**Commit:** c23cfe1

- `backend/src/db/schema.ts`: pointTransactions-Tabelle ergänzt (ohne itemId — DSGVO), items.createdBy hinzugefügt
- `backend/src/modules/scan/scan.repository.ts`: findItemByQrToken, markItemTaken, awardPoints (Drizzle sql-Helper für atomares Inkrement)
- `backend/src/modules/scan/scan.service.ts`: scanItemQr mit 404/409/403 Error-Handling, POINTS_PER_SCAN=10
- `backend/src/modules/scan/scan.router.ts`: POST / mit authenticateToken, Zod .uuid()-Validierung
- `backend/src/app.ts`: scanRouter unter /api/scan eingebunden

**SQL-Migrationen ausgeführt:**
```sql
CREATE TABLE IF NOT EXISTS point_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id),
  user_id uuid NOT NULL REFERENCES users(id),
  source text NOT NULL CHECK (source IN ('item_scan', 'checkin', 'manual_items')),
  points integer NOT NULL,
  created_at timestamp DEFAULT now()
);

ALTER TABLE items ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id);
```

**Endpoint-Tests bestanden:**
- POST /api/scan mit gültigem qrToken → 200 `{ points: 10, title: "Test Shirt", totalPoints: 10 }`
- POST /api/scan mit bereits taken Item → 409
- POST /api/scan mit unbekanntem Token → 404
- POST /api/scan ohne Auth-Token → 401

### Task 2: ScanScreen Mobile mit react-native-vision-camera + Toast
**Commit:** 4eec162

- `mobile/package.json`: react-native-toast-message@2.3.3 installiert
- `mobile/src/api/scan.api.ts`: scanItem() mit { apiClient } named import
- `mobile/src/screens/visitor/ScanScreen.tsx`: QR-Scanner mit useCodeScanner, Kamera-Permission-Flow, Erfolgs-Toast, Fehler inline
- Platzhalter-Screens: CheckInScreen, PointsHistoryScreen, HomeScreen (werden in Plan 02/03 befüllt)
- `mobile/src/navigation/AppNavigator.tsx`: VisitorTabs (role==='visitor') + VolunteerTabs, Toast-Provider außerhalb NavigationContainer

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] req.user.id → req.user.sub**
- **Found during:** Task 1 TypeScript-Check
- **Issue:** scan.router.ts verwendete `req.user!.id`, aber `AuthUser` JWT-Payload definiert userId als `sub` (nicht `id`)
- **Fix:** `req.user!.id` → `req.user!.sub` in scan.router.ts
- **Files modified:** backend/src/modules/scan/scan.router.ts
- **Commit:** c23cfe1 (Fix inline vor Commit)

**2. [Rule 1 - Bug] apiClient named export statt default export**
- **Found during:** Task 2 TypeScript-Check
- **Issue:** `import apiClient from './client'` scheiterte — apiClient ist named export
- **Fix:** `import { apiClient } from './client'`
- **Files modified:** mobile/src/api/scan.api.ts
- **Commit:** 4eec162 (Fix inline vor Commit)

**3. [Rule 3 - Blocking] docker-compose v1 Bug auf Server**
- **Found during:** Task 1 Deployment
- **Issue:** `docker-compose up` schlug fehl mit `AttributeError: 'ComposeVersion' object has no attribute 'version'` (Python-Compose-Bug); `docker compose` v2 nicht verfügbar
- **Fix:** Container manuell mit `docker run` gestartet + `docker network connect traefik` angehängt
- **Auswirkung:** Container läuft korrekt mit plietsche-backend:latest Image

## Deployments

- Backend auf server.godsapp.de deployed: `plietsche-backend:latest` läuft
- SQL-Migrationen ausgeführt: point_transactions-Tabelle + items.created_by Spalte
- git push an GitHub: main@4eec162

## Known Stubs

- `HomeScreen.tsx` — Platzhalter "Home (kommt bald)" — wird in Plan 03 mit Punktestand befüllt
- `CheckInScreen.tsx` — Platzhalter "Check-In (kommt bald)" — wird in Plan 02 befüllt
- `PointsHistoryScreen.tsx` — Platzhalter "Punkte-Historie (kommt bald)" — wird in Plan 03 befüllt

Diese Stubs blockieren NICHT das Plan-01-Ziel (QR-Scan-Kerninteraktion), sind aber für spätere Pläne vorgesehen.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| backend/src/modules/scan/scan.router.ts | FOUND |
| backend/src/modules/scan/scan.service.ts | FOUND |
| backend/src/modules/scan/scan.repository.ts | FOUND |
| mobile/src/screens/visitor/ScanScreen.tsx | FOUND |
| mobile/src/api/scan.api.ts | FOUND |
| Commit c23cfe1 | FOUND |
| Commit 4eec162 | FOUND |
| point_transactions Tabelle (kein item_id) | VERIFIED auf Server |
| items.created_by Spalte | VERIFIED auf Server |
| npx tsc --noEmit backend | EXIT 0 |
| npx tsc --noEmit mobile | EXIT 0 |
| POST /api/scan → 200 { points:10 } | VERIFIED |
| POST /api/scan doppelt → 409 | VERIFIED |
| POST /api/scan unbekannt → 404 | VERIFIED |
