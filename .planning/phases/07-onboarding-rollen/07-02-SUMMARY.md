---
phase: 07-onboarding-rollen
plan: "02"
subsystem: navigation, admin-api
tags: [roles, admin, volunteer, navigation, backend]
dependency_graph:
  requires: ["07-01"]
  provides: ["admin-tab-navigation", "volunteer-tab-navigation", "admin-api-users"]
  affects: ["mobile/src/navigation/AppNavigator.tsx", "backend/src/modules/admin/"]
tech_stack:
  added: []
  patterns: ["requireRole middleware", "storeId-isolation in admin queries", "role-based tab navigation"]
key_files:
  created:
    - mobile/src/screens/admin/VolunteerManagementScreen.tsx
    - backend/src/modules/admin/admin.repository.ts
    - backend/src/modules/admin/admin.service.ts
    - backend/src/modules/admin/admin.router.ts
  modified:
    - mobile/src/navigation/AppNavigator.tsx
    - backend/src/app.ts
decisions:
  - "tabScreenOptions als shared const extrahiert um DRY-Violations in AdminTabs/VolunteerTabs zu vermeiden"
  - "VolunteerManagementScreen und AppNavigator gemeinsam committed da gegenseitige Import-Abhaengigkeit"
metrics:
  duration: "45min"
  completed: "2026-04-08"
  tasks_completed: 3
  files_changed: 6
---

# Phase 7 Plan 02: Rollen-Trennung Admin/Volunteer Summary

AdminTabs (7 Tabs) und VolunteerTabs (2 Tabs) klar getrennt per role-basiertem AppNavigator, plus neues Backend-Modul `/api/admin/users` mit requireRole('admin') + storeId-Isolation.

## Was implementiert wurde

### Task 1: AppNavigator — AdminTabs und VolunteerTabs trennen

- `VolunteerTabs` umbenannt zu `AdminTabs` mit 7 Tabs: Dashboard, Kleidung, Neu anlegen, Store-Info, Kampagnen, Badges, Team
- Neues `VolunteerTabs` mit nur 2 Tabs: Kleidung, Neu anlegen
- `AuthenticatedStack` routet: `role === 'visitor'` → VisitorTabs, `role === 'admin'` → AdminTabs, alle anderen (volunteer + Fallback) → VolunteerTabs
- Shared `tabScreenOptions` const extrahiert (DRY)
- Import von `VolunteerManagementScreen` hinzugefügt

### Task 2: Backend admin-Modul

Neues Modul `backend/src/modules/admin/` mit drei Dateien:

- **admin.repository.ts**: `findUsersByStoreAndRole(storeId, role)` — kombinierte WHERE-Bedingung mit `and()` aus drizzle-orm; `createUser()` — Insert mit returning
- **admin.service.ts**: `listVolunteers(storeId)`, `createVolunteer(body, storeId)` — bcrypt mit 12 Runden
- **admin.router.ts**: `GET /api/admin/users` und `POST /api/admin/users` — beide mit `authenticateToken` + `requireRole('admin')` geschützt; Zod-Validierung für POST-Body
- **app.ts**: `adminRouter` unter `/api/admin` eingebunden

### Task 3: VolunteerManagementScreen

Neuer Screen `mobile/src/screens/admin/VolunteerManagementScreen.tsx`:
- Lädt Volunteer-Liste via `GET /api/admin/users` (Bearer Token aus `useAuthStore.getState()`)
- Zeigt Username, E-Mail, Erstellungsdatum pro Volunteer
- Formular zum Erstellen neuer Volunteers: Username, E-Mail, Passwort (secureTextEntry)
- Client-seitige Validierung vor POST
- Toast-Feedback (success/error) via `react-native-toast-message`
- Liste wird nach erfolgreicher Erstellung neu geladen

## Deploy-Schritte

```bash
git push
ssh root@server.godsapp.de "cd /opt/stacks/plietsche-pluenn && git pull && cd backend && docker build -t plietsche-backend:latest . && docker stop plietsche-backend && docker rm plietsche-backend && docker run -d ..."
```

Container wurde mit korrekter `DATABASE_URL` (postgres-Hostname statt localhost) gestartet.

## Curl-Test-Ergebnisse

```
GET /api/admin/users (kein Token)     → 401 {"error":"Authorization token required"}
GET /api/admin/users (visitor-Token)  → 403 {"error":"Insufficient permissions","required":["admin"],"actual":"visitor"}
GET /api/admin/users (admin-Token)    → 200 {"users":[...]}  (storeId-gefiltert)
POST /api/admin/users (admin-Token)   → 201 {"user":{"id":"...","username":"smoketest_vol","role":"volunteer",...}}
```

## Deviations from Plan

### Auto-fixed Issues

Keine Rule-1/2/3-Fixes notwendig — Plan war korrekt und vollständig.

### Abweichungen ohne Regelverstoß

**tabScreenOptions als shared const:** Statt screenOptions-Objekt in AdminTabs und VolunteerTabs doppelt zu definieren, wurde eine shared const `tabScreenOptions` extrahiert. VisitorTabs behält inline-Definition (bereits vorhanden, kein Refactoring-Scope).

**Tasks 1 und 3 zusammen committed:** `VolunteerManagementScreen` ist eine Import-Abhängigkeit von `AppNavigator`. Da TypeScript sonst nicht kompiliert hätte, wurden beide Dateien im selben Commit zusammengefasst.

## Known Stubs

Keine — `VolunteerManagementScreen` lädt echte Daten vom Backend, kein Stub.

## Threat Flags

Keine neuen Threat-Surfaces jenseits des Plan-Threat-Models eingeführt.

## Self-Check: PASSED

Verifizierte Dateien:
- mobile/src/navigation/AppNavigator.tsx — existiert, AdminTabs mit 7 Tabs, VolunteerTabs mit 2 Tabs
- mobile/src/screens/admin/VolunteerManagementScreen.tsx — existiert, default export
- backend/src/modules/admin/admin.repository.ts — existiert
- backend/src/modules/admin/admin.service.ts — existiert
- backend/src/modules/admin/admin.router.ts — existiert
- backend/src/app.ts — adminRouter eingebunden

Commits verifiziert:
- 95b7af5 feat(07-02): AdminTabs/VolunteerTabs trennen + VolunteerManagementScreen
- d2b2605 feat(07-02): Backend admin-Modul fuer Volunteer-Verwaltung
