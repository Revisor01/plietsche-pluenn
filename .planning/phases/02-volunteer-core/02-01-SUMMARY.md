---
phase: 02-volunteer-core
plan: "01"
subsystem: backend/items
tags: [items, qrcode, schema-migration, drizzle, express]
dependency_graph:
  requires: [01-03]
  provides: [items-api]
  affects: [02-02, 02-03]
tech_stack:
  added: [qrcode@1.x, @types/qrcode]
  patterns: [Router/Service/Repository, storeId-isolation, QRCode.toBuffer]
key_files:
  created:
    - backend/src/modules/items/items.types.ts
    - backend/src/modules/items/items.repository.ts
    - backend/src/modules/items/items.service.ts
    - backend/src/modules/items/items.router.ts
  modified:
    - backend/src/db/schema.ts
    - backend/src/app.ts
    - backend/package.json
    - backend/package-lock.json
decisions:
  - condition-Spalte als Freitext (kein Enum-Constraint in schema.ts + DROP CONSTRAINT auf DB)
  - qrToken wird als UUID-String via crypto.randomUUID() generiert, in uuid-Spalte gespeichert
  - storeId kommt ausschliesslich aus req.user.storeId (JWT-verifiziert), nie aus req.body
metrics:
  duration: "~35 Minuten"
  completed: "2026-04-08"
  tasks_completed: 2
  files_created: 4
  files_modified: 4
---

# Phase 02 Plan 01: items-API mit QR-Generierung

**One-liner:** items-CRUD-API mit server-seitigem QR-PNG via qrcode-npm, storeId-Isolation in jeder DB-Query, condition als Freitext.

## Accomplished

- Schema migriert: condition-Enum entfernt (Freitext), stores um description + openingHours erweitert
- qrcode + @types/qrcode installiert und integriert
- items-Modul aufgebaut (types, repository, service, router) nach Router/Service/Repository-Muster
- POST /api/items erstellt Item mit UUID qrToken, gibt HTTP 201 zurueck
- GET /api/items unterstuetzt Filter nach category, status, search + Pagination (neueste zuerst)
- GET /api/items/:id/qr liefert 400x400 PNG, Content-Type image/png
- itemsRouter unter /api/items in app.ts eingebunden
- Server-Deployment: git pull, docker build, Container mit neuem Image neugestartet
- DB-Migration ausgefuehrt (condition TYPE text, stores-Spalten hinzugefuegt, items_condition_check entfernt)

## Success Criteria Verification

| Criterion | Result |
|-----------|--------|
| POST /api/items → HTTP 201 + qrToken | PASS: id + qrToken UUID im Response |
| GET /api/items?category=Hose filtert korrekt | PASS: 1 Item, neueste zuerst |
| GET /api/items/:id/qr → PNG 400x400 | PASS: PNG image data, 400x400 |
| condition "kleine Flecken" akzeptiert | PASS: kein Fehler |
| npx tsc --noEmit EXIT 0 | PASS |
| eq(items.storeId) mind. 2 Treffer | PASS: findItems + findItemById |

## Decisions Made

1. **condition als Freitext:** Enum in schema.ts entfernt + ALTER TABLE + DROP CONSTRAINT in DB — entspricht dem Kontextentscheid "Admin-konfigurierbare Tags"
2. **qrToken UUID-Typ beibehalten:** Die DB-Spalte ist `uuid` — crypto.randomUUID() liefert gueltige UUIDs, passt
3. **storeId aus JWT, nicht req.body:** T-02-01 Threat-Mitigation umgesetzt, hardcoded in Service-Aufruf

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript-Fehler: req.params.id Typ `string | string[]`**
- **Found during:** Task 2 TypeScript-Check
- **Issue:** Express-Typen erlauben `string | string[]` fuer req.params, aber itemsService.getItemQrPng erwartet `string`
- **Fix:** `String(req.params.id)` expliziter Cast in items.router.ts
- **Files modified:** backend/src/modules/items/items.router.ts
- **Commit:** 7631480

**2. [Rule 1 - Bug] DB Check-Constraint verhindert Freitext-condition**
- **Found during:** Server-Verifikation (HTTP 500 bei POST /api/items)
- **Issue:** ALTER TABLE items ALTER COLUMN condition TYPE text entfernt den Enum-Parameter aus Drizzle-Sicht, aber PostgreSQL behielt den alten CHECK-Constraint `items_condition_check`
- **Fix:** `ALTER TABLE items DROP CONSTRAINT IF EXISTS items_condition_check` auf Server ausgefuehrt
- **SQL:** `docker exec plietsche-postgres psql ... -c "ALTER TABLE items DROP CONSTRAINT IF EXISTS items_condition_check;"`
- **Commit:** kein separater Commit (Server-seitige DB-Operation)

**3. [Rule 3 - Blocker] Volunteer-Test-User fehlte**
- **Found during:** Server-Verifikation
- **Issue:** volunteer@test.de noch nicht registriert; nach Registrierung Rolle `visitor` (Default)
- **Fix:** User registriert, dann `UPDATE users SET role='volunteer' WHERE email='volunteer@test.de'` per psql
- **Commit:** n/a (Test-Infrastruktur, nicht im Code)

## Server-Deployment-Notizen

SQL-Migration ausgefuehrt (2026-04-08):
```sql
ALTER TABLE items ALTER COLUMN condition TYPE text;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS opening_hours text;
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_condition_check;
```

Container-Neustart: `docker restart` reichte nicht, da alter Image-Hash genutzt wurde. Container manuell neu erstellt und mit traefik-Netzwerk verbunden.

## Known Stubs

Keine — alle API-Endpunkte geben echte DB-Daten zurueck.

## Threat Flags

Keine neuen Surfaces ausserhalb des Threat Models.

## Next Phase Readiness

Phase 02-02 (Mobile Items-Screens) kann beginnen:
- POST /api/items liefert id + qrToken
- GET /api/items unterstuetzt Filter + Search
- GET /api/items/:id/qr liefert PNG
- Alle Endpoints erfordern volunteer/admin-Token

## Self-Check: PASSED

Files exist:
- backend/src/modules/items/items.types.ts: FOUND
- backend/src/modules/items/items.repository.ts: FOUND
- backend/src/modules/items/items.service.ts: FOUND
- backend/src/modules/items/items.router.ts: FOUND

Commits exist:
- 667f61e: FOUND (feat(02-01): Schema-Migration + qrcode + items.types.ts)
- 7631480: FOUND (feat(02-01): items Repository, Service, Router + app.ts einbinden)
