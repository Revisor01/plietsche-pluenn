---
phase: "02"
plan: "03"
subsystem: stores
tags: [stores, backend, mobile, store-info, public-api]
dependency_graph:
  requires:
    - "02-01 (items-Modul, Schema mit description+openingHours)"
    - "02-02 (AppNavigator mit Tab-Navigation)"
  provides:
    - "GET /api/stores/info (public)"
    - "PATCH /api/stores/info (admin-only)"
    - "StoreInfoScreen in VolunteerTabs"
  affects:
    - "AppNavigator (StoreInfoPlaceholder entfernt)"
tech_stack:
  added: []
  patterns:
    - "Router → Service → Repository (Drizzle)"
    - "Public endpoint ohne Auth (GET)"
    - "requireRole('admin') Guard (PATCH)"
    - "v1 single-tenant: findFirstStore() Fallback"
key_files:
  created:
    - backend/src/modules/stores/stores.types.ts
    - backend/src/modules/stores/stores.repository.ts
    - backend/src/modules/stores/stores.service.ts
    - backend/src/modules/stores/stores.router.ts
    - mobile/src/api/store.api.ts
    - mobile/src/screens/store/StoreInfoScreen.tsx
  modified:
    - backend/src/app.ts
    - mobile/src/navigation/AppNavigator.tsx
decisions:
  - "storeId für PATCH kommt ausschließlich aus req.user.storeId (JWT-verified) — kein Body/Query-Parameter"
  - "storeId für GET: optionaler Query-Param mit Fallback auf findFirstStore() (v1 single-tenant)"
  - "Zod-Validation: description max 2000, openingHours max 500 Zeichen (T-02-13)"
metrics:
  duration: "~35 Minuten"
  completed_date: "2026-04-08T11:32:05Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 6
  files_modified: 2
---

# Phase 02 Plan 03: Store-Info API + StoreInfoScreen Summary

**One-liner:** Öffentliche Store-Info API (GET/PATCH) mit Drizzle + StoreInfoScreen in Bottom-Tab-Navigation.

## Accomplished

- GET /api/stores/info liefert Öffnungszeiten, Adresse und Beschreibung ohne Auth
- PATCH /api/stores/info erlaubt Admin Öffnungszeiten/Adresse/Beschreibung zu ändern (requireRole + Zod-Validation)
- StoreInfoScreen zeigt name, address, openingHours, description mit Loading-State, Error-State und Pull-to-Refresh
- AppNavigator StoreInfoPlaceholder vollständig entfernt, StoreInfoScreen eingebunden
- Backend auf Server deployed und verifiziert (alle Endpunkte getestet)

## Tasks

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | stores Backend-Modul (types + repository + service + router) | 3633028 | Done |
| 2 | StoreInfoScreen + AppNavigator Placeholder ersetzen | 2b1f136 | Done |

## Verification Results

```
GET /api/stores/info (public, kein Token):
→ HTTP 200: {"id":"6a0fb86e...","name":"Plietsche Plünn","address":"Musterstraße 1, 12345 Musterstadt","openingHours":"Mo-Fr 10-17 Uhr, Sa 10-14 Uhr","description":"Unser Tausch-Laden für alle!","lat":null,"lng":null}

PATCH /api/stores/info (Admin-Token):
→ HTTP 200 mit aktualisierten Werten

GET nach PATCH — openingHours:
→ "Mo-Fr 10-17 Uhr, Sa 10-14 Uhr"

PATCH als Volunteer:
→ {"error":"Insufficient permissions","required":["admin"],"actual":"volunteer"}
```

## Deviations from Plan

### Auto-fixed Issues

None — Plan executed exactly as written.

### Deployment Note

Der erste `docker restart` nach `docker build` startete den Container mit dem alten Image neu. Behoben durch `docker-compose up -d --no-deps --build backend`, das den Container korrekt mit dem neuen Image `plietsche-pluenn_backend:latest` neu erstellt hat.

## Phase 2 Gesamt-Status

| Requirement | Plan | Status |
|-------------|------|--------|
| ITEM-01: items.types.ts, Schema-Migration | 02-01 | ✅ Done |
| ITEM-02: items Repository + Service + Router | 02-01 | ✅ Done |
| ITEM-03: QR-Code-Generierung (qrcode pkg) | 02-01 | ✅ Done |
| ITEM-04: ItemListScreen + ItemCreateScreen | 02-02 | ✅ Done |
| STORE-01: Store-Info API + StoreInfoScreen | 02-03 | ✅ Done |

**Phase 2 vollständig abgeschlossen.**

## Readiness für Phase 3 (Visitor Experience)

- Backend: `/api/stores/info` public verfügbar — Besucher können Store-Infos abrufen
- QR-Token auf Items vorhanden — Basis für Scan-Workflow
- JWT-Auth mit Rollen (admin/volunteer/visitor) — visitor-Rolle für Phase 3 nutzbar
- GPS-Verifizierung und PlietschPunkte-System: Phase 3 Aufgabe
- Visitor Check-In und QR-Scan-Screen: Phase 3 Aufgabe

## Known Stubs

None — alle Felder (address, openingHours, description) werden korrekt aus der DB geladen und in der API zurückgegeben.

## Threat Flags

None — keine neuen nicht-geplanten Trust-Boundaries eingeführt. Alle Mitigations aus dem Plan-Threat-Register umgesetzt (T-02-10 bis T-02-13).

## Self-Check: PASSED

- backend/src/modules/stores/stores.types.ts: FOUND
- backend/src/modules/stores/stores.repository.ts: FOUND
- backend/src/modules/stores/stores.service.ts: FOUND
- backend/src/modules/stores/stores.router.ts: FOUND
- mobile/src/api/store.api.ts: FOUND
- mobile/src/screens/store/StoreInfoScreen.tsx: FOUND
- Commit 3633028: FOUND
- Commit 2b1f136: FOUND
- Server-Endpoint GET /api/stores/info: HTTP 200
- Server-Endpoint PATCH /api/stores/info (admin): HTTP 200
- Server-Endpoint PATCH /api/stores/info (volunteer): HTTP 403
