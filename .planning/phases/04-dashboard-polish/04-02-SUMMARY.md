---
phase: 04-dashboard-polish
plan: "02"
subsystem: mobile-frontend
tags: [dashboard, dsgvo, navigation, stat-cards, privacy]
dependency_graph:
  requires: [04-01]
  provides: [DashboardScreen, PrivacyScreen, dashboard.api.ts]
  affects: [AppNavigator.tsx, StoreInfoScreen.tsx]
tech_stack:
  added: []
  patterns: [zustand-store-pattern, segment-control-period-selector, stat-card-grid]
key_files:
  created:
    - mobile/src/api/dashboard.api.ts
    - mobile/src/screens/admin/DashboardScreen.tsx
    - mobile/src/screens/legal/PrivacyScreen.tsx
  modified:
    - mobile/src/navigation/AppNavigator.tsx
    - mobile/src/screens/store/StoreInfoScreen.tsx
decisions:
  - "Segment-Buttons statt Datepicker (kein @react-native-community/datetimepicker in package.json)"
  - "AuthenticatedStack-Pattern fuer Privacy als gemeinsamer Stack-Screen ausserhalb der Tabs"
  - "navigation as any fuer Privacy-Navigate aus StoreInfoScreen (kein typisierter NavigatorParamList)"
metrics:
  duration: "~20 min"
  completed: "2026-04-08T14:58:11Z"
  tasks_completed: 2
  tasks_total: 3
  files_created: 3
  files_modified: 2
---

# Phase 4 Plan 02: Dashboard & DSGVO-Polish Summary

**One-liner:** DashboardScreen mit 2er-Grid Stat-Cards (4 Metriken) + DSGVO-PrivacyScreen mit GPS-Zweck-Erklaerung, integriert in Navigation via AuthenticatedStack-Pattern.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Dashboard-API-Client + DashboardScreen | 9b65367 | dashboard.api.ts, DashboardScreen.tsx |
| 2 | PrivacyScreen + Navigation-Integration | e416904 | PrivacyScreen.tsx, AppNavigator.tsx, StoreInfoScreen.tsx |
| 3 | Checkpoint: Human-Verify | — | (Checkpoint — keine Code-Aenderung) |

## What Was Built

### Task 1: dashboard.api.ts + DashboardScreen.tsx

- `fetchDashboardStats(from, to)` sendet GET `/api/dashboard/stats` mit from/to als ISO-Strings
- `DashboardStats`-Interface: visits, itemsTaken, newItems, activeItems
- DashboardScreen zeigt 4 Stat-Cards im 2er-Grid mit Farb-Akzenten:
  - Besuche (#EFF6FF / #2563EB), Items mitgenommen (#F0FDF4 / #16A34A), Neue Items (#FFFBEB / #D97706), Aktive Items (#F5F3FF / #7C3AED)
- Zeitraum-Segment-Buttons: Heute / Woche / Monat / Jahr
- Loading-Spinner, Inline-Fehler + Retry-Button, Offline-Erkennung via `axios.isAxiosError(e) && !e.response`

### Task 2: PrivacyScreen.tsx + Navigation

- PrivacyScreen: ScrollView mit 5 DSGVO-Sektionen, GPS-Abschnitt nennt explizit "nur Radius-Check, keine Persistierung"
- AppNavigator: `AuthenticatedStack`-Komponente kapselt Tabs + Privacy als Stack.Screen
- VolunteerTabs: Dashboard-Tab VOR Items eingefuegt (Admin + Volunteer sehen es)
- StoreInfoScreen: "Datenschutzerklaerung"-Link am Ende der Seite

### Task 3: Checkpoint

Task 3 ist ein `checkpoint:human-verify`. Gemaess Auftrag ("note it in SUMMARY and continue") wird hier pausiert. Der Checkpoint erfordert visuelle Verifizierung auf iOS-Simulator oder Device.

**Verifikationsschritte laut Plan:**
```bash
TOKEN=$(curl -skL -X POST https://plietsche-pluenn.godsapp.de/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@plietsche.de","password":"admin123"}' | jq -r .token)
curl -skL "https://plietsche-pluenn.godsapp.de/api/dashboard/stats?from=2026-01-01T00:00:00Z&to=2026-12-31T23:59:59Z" \
  -H "Authorization: Bearer $TOKEN"
# Erwartet: {"visits":N,"itemsTaken":N,"newItems":N,"activeItems":N}
```

App-seitig:
1. Als Admin/Volunteer einloggen → Dashboard-Tab sichtbar
2. 4 Stat-Cards erscheinen mit Zahlen
3. Zeitraum wechseln → Karten aktualisieren sich
4. Netzwerk aus → "Keine Internetverbindung" + Retry
5. StoreInfo-Tab → Datenschutz-Link unten
6. Datenschutzerklaerung oeffnen → GPS-Abschnitt sichtbar
7. Als Visitor einloggen → kein Dashboard-Tab

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Feature] Kein @react-native-community/datetimepicker**
- **Found during:** Task 1
- **Issue:** `@react-native-community/datetimepicker` nicht in package.json
- **Fix:** Segment-Buttons (Heute / Woche / Monat / Jahr) implementiert — explizit als gleichwertige Alternative im Plan beschrieben
- **Files modified:** DashboardScreen.tsx
- **Commit:** 9b65367

**2. [Rule 2 - Navigation Typing] Privacy-Navigate ohne typisierter ParamList**
- **Found during:** Task 2
- **Issue:** Kein zentraler NavigatorParamList-Typ im Projekt
- **Fix:** `(navigation as any).navigate('Privacy')` — per Plan explizit als akzeptabler Workaround genannt
- **Files modified:** StoreInfoScreen.tsx
- **Commit:** e416904

## Known Stubs

Keine. Alle 4 Stat-Cards beziehen Daten live aus dem Backend-API-Call. Kein hardcodierter Mock-Wert in der Render-Ausgabe.

## Threat Flags

Keine neuen Trust-Boundaries eingeführt. DashboardScreen wird nur in VolunteerTabs (nicht VisitorTabs) eingebunden — Threat T-04-02-01 (Information Disclosure) durch Navigation-Guard mitigiert. Backend-Schutz via requireRole(['admin','volunteer']) liegt in Phase 04-01.

## Self-Check: PASSED

- mobile/src/api/dashboard.api.ts — FOUND
- mobile/src/screens/admin/DashboardScreen.tsx — FOUND
- mobile/src/screens/legal/PrivacyScreen.tsx — FOUND
- Commit 9b65367 — FOUND
- Commit e416904 — FOUND
