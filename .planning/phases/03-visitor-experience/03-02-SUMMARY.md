---
phase: 03-visitor-experience
plan: "02"
subsystem: checkin
tags: [hmac, gps, qr-code, check-in, mobile, backend]
dependency_graph:
  requires: [03-01]
  provides: [POST /api/checkin, GET /api/checkin/door-qr, CheckInScreen]
  affects: [stores-module, point_transactions, users.plietschPoints]
tech_stack:
  added: [node:crypto HMAC-SHA256, qrcode PNG generation, react-native-geolocation-service]
  patterns: [HMAC-Rotation wöchentlich, Haversine-Distanz, 3-Schritt-Flow GPS→Scan→Stepper]
key_files:
  created:
    - backend/src/modules/checkin/checkin.router.ts
    - backend/src/modules/checkin/checkin.service.ts
    - backend/src/modules/checkin/checkin.repository.ts
    - mobile/src/screens/visitor/CheckInScreen.tsx
    - mobile/src/api/checkin.api.ts
  modified:
    - backend/src/db/schema.ts
    - backend/src/app.ts
    - backend/.env
    - backend/src/modules/stores/stores.router.ts
    - backend/src/modules/stores/stores.repository.ts
    - backend/src/modules/stores/stores.types.ts
    - docker-compose.yml
decisions:
  - "GPS-Koordinaten nur validiert, nie persistiert (DSGVO) — checkins-Tabelle hat keine lat/lng-Spalten"
  - "DOOR_QR_SECRET in docker-compose.yml als env-Variable ergänzt — war bisher nur im server .env"
  - "HMAC-Token: current + vorheriger Wochen-Bucket akzeptiert (Wochenwechsel-Toleranz)"
  - "Haversine-Distanz serverseitig berechnet — Client-GPS wird nur für Validierung verwendet"
metrics:
  duration: "~138 Minuten"
  completed: "2026-04-08"
  tasks_completed: 2
  tasks_total: 2
  files_created: 5
  files_modified: 7
---

# Phase 03 Plan 02: Check-In-Flow Summary

**One-liner:** HMAC-gesicherter Tür-QR mit wöchentlicher Rotation, Haversine GPS-Check (150m) ohne Persistenz, 5+3*N Punkte via 3-Schritt-Flow in CheckInScreen.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | checkin-Backend HMAC + GPS + door-qr | 2f501c3, db2ebb9 | checkin.router/service/repository.ts, schema.ts, docker-compose.yml |
| 2 | CheckInScreen Mobile + checkin.api.ts | 500cb88 | CheckInScreen.tsx, checkin.api.ts |

## What Was Built

### Backend (Task 1)

**checkin-Modul** (`backend/src/modules/checkin/`):
- `POST /api/checkin` — Validiert doorToken (HMAC), GPS-Distanz (Haversine ≤150m), 12h-Cooldown; vergibt Punkte (5 Basis + 3 pro Teil)
- `GET /api/checkin/door-qr` (admin) — Generiert aktuellen HMAC-Token als PNG via qrcode-Bibliothek
- HMAC nutzt `node:crypto`, wöchentliche Rotation mit Toleranz für current + previous Bucket
- GPS-Koordinaten werden NICHT in der DB gespeichert (DSGVO — CHKIN-01)

**DB-Migration:**
```sql
CREATE TABLE checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id),
  user_id uuid NOT NULL REFERENCES users(id),
  item_count integer NOT NULL DEFAULT 0,
  created_at timestamp DEFAULT now()
  -- KEINE lat/lng
);
```

**Stores-Modul erweitert:** `PATCH /api/stores/info` akzeptiert jetzt `lat`, `lng`, `checkinRadiusMeters`

**docker-compose.yml:** `DOOR_QR_SECRET` als Env-Variable ergänzt (war vorher nur im server .env, Container las es nicht)

### Mobile (Task 2)

**CheckInScreen** (`mobile/src/screens/visitor/`): 3-Schritt-Flow
1. GPS-Anfrage mit Datenschutz-Hinweis (react-native-geolocation-service)
2. Tür-QR scannen (react-native-vision-camera, Pattern aus ScanScreen)
3. Stepper 0–10 mit +/- Buttons (Math.min/Math.max)
4. Erfolgs-Screen mit Punkte-Aufschlüsselung (Basis + Teile)
5. Fehler-Screen mit Retry-Button

**checkin.api.ts:** `submitCheckin()` via `apiClient` (named export, nicht default)

## Verified Endpoints

| Test | Ergebnis |
|------|----------|
| GET /api/checkin/door-qr (admin) | 200 PNG |
| POST /api/checkin invalid doorToken | 403 "Ungültiger QR-Code" |
| POST /api/checkin GPS > 150m | 403 "Zu weit vom Laden entfernt" |
| POST /api/checkin valid token + coords | 200 `{points:5, itemPoints:9, totalPoints:24}` |
| POST /api/checkin erneut < 12h | 409 "Bereits heute eingecheckt" |
| PATCH /api/stores/info lat/lng | 200 mit lat/lng gesetzt |
| checkins-Tabelle \d | keine lat/lng-Spalten |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] docker-compose.yml fehlte DOOR_QR_SECRET**
- **Found during:** Task 1 Deployment-Verifikation
- **Issue:** Container-Image hatte zwar `DOOR_QR_SECRET` im Server-`.env`, aber die `docker-compose.yml` deklarierte die Variable nicht — Container startete ohne sie, alle Endpoints lieferten 500/404
- **Fix:** `DOOR_QR_SECRET: ${DOOR_QR_SECRET}` in `docker-compose.yml` backend environment hinzugefügt
- **Files modified:** `docker-compose.yml`
- **Commit:** db2ebb9

**2. [Rule 1 - Bug] Container lief mit veralteter Image-ID nach docker restart**
- **Found during:** Task 1 Deployment-Verifikation
- **Issue:** `docker restart` verwendet die ursprüngliche Container-Image-ID, nicht das neu gebaute `plietsche-backend:latest` — Container hatte kein checkin-Modul in `/app/dist/modules/`
- **Fix:** Container gestoppt, entfernt, und mit `docker run` neu aus aktuellem Image gestartet
- **Files modified:** Keine (Deployment-Fix)

**3. [Rule 1 - Bug] checkin.api.ts verwendete default import statt named export**
- **Found during:** Task 2 TypeScript-Check
- **Issue:** `import apiClient from './client'` — apiClient ist ein named export in client.ts
- **Fix:** `import { apiClient } from './client'`
- **Files modified:** `mobile/src/api/checkin.api.ts`

### Out-of-Scope Observations (Deferred)

- `stores.service.ts` gibt `checkinRadiusMeters` nicht in `StoreInfo` zurück — PATCH-Response zeigt nur lat/lng. Die DB-Speicherung funktioniert korrekt, der Checkin-Service liest direkt vom DB-Row. Kein funktionaler Impact für diesen Plan — Track für spätere API-Vollständigkeit.

## Known Stubs

Keine — alle implementierten Features sind vollständig verdrahtet.

## Threat Flags

Keine neuen Threat Surfaces — alle Endpunkte lagen im Plan-Threat-Modell (T-03-06 bis T-03-11).

## Self-Check: PASSED

- `backend/src/modules/checkin/checkin.router.ts` — vorhanden
- `backend/src/modules/checkin/checkin.service.ts` — vorhanden
- `backend/src/modules/checkin/checkin.repository.ts` — vorhanden
- `mobile/src/screens/visitor/CheckInScreen.tsx` — vorhanden
- `mobile/src/api/checkin.api.ts` — vorhanden
- Commit 2f501c3 — vorhanden
- Commit db2ebb9 — vorhanden
- Commit 500cb88 — vorhanden
- checkins-Tabelle in DB ohne lat/lng — verifiziert
- GET /api/checkin/door-qr → 200 — verifiziert
