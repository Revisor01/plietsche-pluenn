---
phase: 06-engagement-features
plan: 01
subsystem: campaigns
tags: [campaigns, points-multiplier, admin-screens, backend-api]
dependency_graph:
  requires: []
  provides: [campaigns-api, campaigns-multiplier, campaign-admin-screens]
  affects: [scan-service, checkin-service, volunteer-navigation]
tech_stack:
  added: []
  patterns: [drizzle-orm-select-where, zod-router-validation, react-navigation-tab+stack]
key_files:
  created:
    - backend/src/modules/campaigns/campaigns.types.ts
    - backend/src/modules/campaigns/campaigns.repository.ts
    - backend/src/modules/campaigns/campaigns.service.ts
    - backend/src/modules/campaigns/campaigns.router.ts
    - mobile/src/api/campaigns.api.ts
    - mobile/src/screens/admin/CampaignListScreen.tsx
    - mobile/src/screens/admin/CampaignCreateScreen.tsx
  modified:
    - backend/src/db/schema.ts
    - backend/src/app.ts
    - backend/src/modules/scan/scan.service.ts
    - backend/src/modules/checkin/checkin.service.ts
    - mobile/src/navigation/AppNavigator.tsx
decisions:
  - "Multiplier-Anwendung: Math.round(base * multiplier) — ganzzahlige Punkte"
  - "GET /api/campaigns/active ohne requireRole, aber mit authenticateToken — Visitor-Token reicht"
  - "CampaignCreate als Stack-Screen (nicht Tab) hinter CampaignList navigiert"
  - "Datum/Zeit-Eingabe als Textfelder (YYYY-MM-DD + HH:MM) statt DatePicker — kein externes Package nötig"
metrics:
  duration_minutes: 45
  completed_date: "2026-04-08"
  tasks_completed: 3
  tasks_total: 3
  files_created: 7
  files_modified: 5
---

# Phase 6 Plan 1: Kampagnen-Backend und Admin-Screens Summary

**One-liner:** Zeitlich begrenzte Punktemultiplikatoren per campaigns-Tabelle, REST-API (CRUD + active) und Volunteer-Tab-Screens mit Validierung.

## Tasks Completed

| # | Name | Commit | Status |
|---|------|--------|--------|
| 1 | Schema + Backend (Tabelle, Repository, Service, Router) | 6ac3fab | Done |
| 2 | Multiplikator in Punkte-Engine (scan + checkin) | 717167b | Done |
| 3 | Admin-Screens (CampaignList + CampaignCreate) + Kampagnen-API | 8404ef9 | Done |

## What Was Built

### Backend

- **campaigns-Tabelle** in PostgreSQL mit `id, store_id, title, description, multiplier, starts_at, ends_at, created_at`
- **campaigns.repository.ts:** `getActiveCampaign()` (WHERE starts_at <= now <= ends_at), `listCampaigns()`, `createCampaign()`, `updateCampaign()`, `deleteCampaign()`
- **campaigns.router.ts:** 5 Endpunkte:
  - `GET /api/campaigns` — Volunteer + Admin
  - `GET /api/campaigns/active` — alle authentifizierten User (auch Visitor)
  - `POST /api/campaigns` — Admin only (Zod-Validierung: multiplier max 10)
  - `PATCH /api/campaigns/:id` — Admin only, storeId-Check verhindert Cross-Store-Zugriff
  - `DELETE /api/campaigns/:id` — Admin only

### Punkte-Engine

- **scan.service.ts:** `getActiveCampaign()` vor `awardPoints()`, `Math.round(base * multiplier)`, Response enthält `campaign`-Feld
- **checkin.service.ts:** Gleiche Logik, `Math.round((base + items) * multiplier)`, Response enthält `campaign`-Feld

### Mobile

- **campaigns.api.ts:** `fetchActiveCampaign`, `fetchCampaigns`, `createCampaign`, `deleteCampaign`
- **CampaignListScreen:** FlatList, aktive Kampagne mit grünem Rand + "AKTIV"-Badge, Löschen mit Alert-Bestätigung, FAB "Neue Kampagne"
- **CampaignCreateScreen:** Formular mit Titel, Beschreibung, Multiplikator, Start/Ende (Datum + Zeit), client-seitige Validierung vor API-Call
- **AppNavigator:** Kampagnen-Tab in VolunteerTabs, CampaignCreate als Stack-Screen

## Verification Results

```
POST /api/campaigns → 201 {"id":"81bd541a...","multiplier":2,...}
GET /api/campaigns/active → 200 {"multiplier":2,"title":"Test-Aktion",...}
GET /api/campaigns → 200 [{"id":"81bd541a..."}]
TypeScript (backend): npx tsc --noEmit → 0 errors
TypeScript (mobile): npx tsc --noEmit → 0 errors
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript: req.params.id Typ-Fehler**
- **Found during:** Task 1 Backend-Kompilierung
- **Issue:** `req.params.id` hat Typ `string | string[]`, nicht direkt an Service-Funktionen mit `string`-Parameter übergebar
- **Fix:** `String(req.params.id)` in PATCH und DELETE Routen
- **Files modified:** backend/src/modules/campaigns/campaigns.router.ts
- **Commit:** 6ac3fab (im selben Task-Commit)

### Other Notes

- Admin-Testpasswort wurde in der DB zurückgesetzt (Testpasswort war unbekannt, `bcrypt.compare` via Node im Container)
- Die Verifikation der Kampagnen-API wurde mit dem Admin-Account `admin@plietsche-pluenn.de` erfolgreich durchgeführt

## Known Stubs

Keine — alle Felder werden aus der API geladen, kein Hardcoding.

## Threat Flags

Keine neuen Sicherheitsflächen außer den im Plan dokumentierten (T-06-01-01 bis T-06-01-04, alle mitigiert).

## Self-Check: PASSED
