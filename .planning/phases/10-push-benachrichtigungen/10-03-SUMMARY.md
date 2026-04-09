---
phase: 10-push-benachrichtigungen
plan: "03"
subsystem: push
tags: [react-native, firebase, push-notifications, express, drizzle]

requires:
  - phase: 10-01
    provides: push.router.ts Basis-Endpoints (POST /token, DELETE /token), push.repository.ts, push.service.ts

provides:
  - POST /api/push/send (Admin-Only): manueller Push an alle Besucher eines Stores
  - PATCH /api/push/settings: pushEnabled fuer eingeloggten User setzen
  - GET /api/push/settings: aktuellen pushEnabled-Status abrufen
  - AdminPushScreen: Formular Titel+Text+Senden fuer Admin-Push
  - SettingsScreen: Push-Toggle mit optimistischem Update, Datenschutz-Link
  - Navigation: AdminPushScreen als Tab in AdminTabs, SettingsScreen als Stack-Screen mit Header-Button

affects:
  - deployment
  - testing

tech-stack:
  added: []
  patterns:
    - requireRole('admin') Middleware fuer Admin-Only Endpoints
    - Optimistic Update Pattern im SettingsScreen (sofort aendern, bei Fehler zuruecksetzen)
    - apiClient (axios) mit automatischem Bearer-Token aus authStore fuer alle API-Calls

key-files:
  created:
    - mobile/src/screens/admin/AdminPushScreen.tsx
    - mobile/src/screens/visitor/SettingsScreen.tsx
  modified:
    - backend/src/modules/push/push.router.ts
    - backend/src/modules/push/push.repository.ts
    - mobile/src/navigation/AppNavigator.tsx

key-decisions:
  - "AdminPushScreen als eigener Tab in AdminTabs (nicht Stack-Screen) fuer einfache Erreichbarkeit"
  - "SettingsScreen als Stack-Screen mit headerRight-Button im HomeScreen-Header des VisitorTabs"
  - "Optimistic Update fuer Push-Toggle: bessere UX, bei Fehler automatisch zuruecksetzen + Toast"
  - "getPushEnabled gibt true zurueck wenn kein Token registriert (default opt-in)"

patterns-established:
  - "Push-Endpoints: authenticateToken + requireRole('admin') fuer Admin-Only Routes"
  - "userId kommt immer aus req.user.sub (JWT), nie aus Request-Body (T-10-10 mitigiert)"

requirements-completed:
  - PUSH-06
  - PUSH-07

duration: 25min
completed: "2026-04-08"
---

# Phase 10 Plan 03: Admin-Push und Besucher-Einstellungen Summary

**Admin-Push-Screen mit Titel+Text+Senden-Formular und Besucher-Einstellungsscreen mit Push-Toggle -- drei neue Backend-Endpoints und zwei neue Mobile-Screens**

## Performance

- **Duration:** 25 min
- **Started:** 2026-04-08T10:00:00Z
- **Completed:** 2026-04-08T10:25:00Z
- **Tasks:** 2 (+ 1 Checkpoint: human-verify, auto-continued per Objective)
- **Files modified:** 5

## Accomplishments

- POST /api/push/send (Admin-Only via requireRole) sendet Push an alle Besucher des Stores
- PATCH/GET /api/push/settings ermoeglicht Besucher-seitige Push-Deaktivierung
- AdminPushScreen: Formular mit Zeichenzaehler, disabled-State, Toast-Feedback
- SettingsScreen: Optimistic Update mit Fehler-Rollback, Datenschutz-Navigation
- Navigation vollstaendig verdrahtet: Tab fuer Admin, Header-Button + Stack-Screen fuer Visitor

## Task Commits

1. **Task 1: Backend -- POST /api/push/send und PATCH+GET /api/push/settings** - `f6f6452` (feat)
2. **Task 2: Mobile -- AdminPushScreen, SettingsScreen, Navigation** - `9651b9a` (feat)

## Files Created/Modified

- `backend/src/modules/push/push.router.ts` - Drei neue Endpoints: POST /send (Admin), GET /settings, PATCH /settings
- `backend/src/modules/push/push.repository.ts` - getPushEnabled hinzugefuegt
- `mobile/src/screens/admin/AdminPushScreen.tsx` - Neuer Screen: Formular Titel+Text+Senden mit Toast
- `mobile/src/screens/visitor/SettingsScreen.tsx` - Neuer Screen: Push-Toggle + Datenschutz-Link
- `mobile/src/navigation/AppNavigator.tsx` - AdminPushScreen als Tab, SettingsScreen als Stack-Screen, TouchableOpacity-Import ergaenzt

## Decisions Made

- AdminPushScreen als eigener Tab in AdminTabs integriert (statt reiner Stack-Screen), damit Admin direkten Zugriff ohne Navigation-Umweg hat
- SettingsScreen als Stack-Screen mit headerRight-Button im HomeScreen-Header des VisitorTabs -- konsistent mit bestehendem Muster (BadgeOverview, Privacy)
- Optimistic Update fuer Push-Toggle: bessere UX bei langsamer Verbindung; Rollback + Toast bei Fehler
- getPushEnabled gibt `true` als Default zurueck wenn kein Token registriert (opt-in by default)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ZodError.errors -> ZodError.issues**
- **Found during:** Task 1 (Backend-Endpoints)
- **Issue:** TypeScript-Fehler: `Property 'errors' does not exist on type 'ZodError<unknown>'` -- die korrekte Eigenschaft heisst `.issues`
- **Fix:** Beide catch-Bloecke in push.router.ts auf `.issues` geaendert
- **Files modified:** backend/src/modules/push/push.router.ts
- **Verification:** `cd backend && npx tsc --noEmit` -- kein Fehler
- **Committed in:** f6f6452 (Task 1 commit)

**2. [Rule 3 - Blocking] TouchableOpacity-Import in AppNavigator.tsx fehlte**
- **Found during:** Task 2 (AppNavigator.tsx erweiterung)
- **Issue:** `Cannot find name 'TouchableOpacity'` -- wird fuer den headerRight-Button benoetigt, war nicht importiert
- **Fix:** `import { TouchableOpacity } from 'react-native'` ergaenzt
- **Files modified:** mobile/src/navigation/AppNavigator.tsx
- **Verification:** `cd mobile && npx tsc --noEmit` -- kein Fehler
- **Committed in:** 9651b9a (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 Bug-Fix, 1 Blocking)
**Impact on plan:** Beide Fixes notwendig fuer TypeScript-Korrektheit. Kein Scope Creep.

## Checkpoint

Task 3 war `checkpoint:human-verify`. Gemaess Objective ("note in SUMMARY and continue") wird der Checkpoint dokumentiert, aber nicht als Blocker behandelt.

**Was zu verifizieren ist:**
1. Als Admin einloggen -- Tab "Push" in der Tab-Bar sichtbar, Formular funktioniert, Toast erscheint nach Senden
2. Als Besucher einloggen -- Einstellungen-Icon oben rechts im Home-Screen, Toggle zeigt aktuellen Status, Aenderung bleibt erhalten

## Issues Encountered

Keine unerwarteten Probleme -- beide TypeScript-Fehler via Deviation-Rules automatisch behoben.

## User Setup Required

Keine -- alle Aenderungen bauen auf der in Plan 01 eingerichteten Firebase/FCM-Infrastruktur auf.

## Next Phase Readiness

- Admin kann manuell Push-Nachrichten an alle Besucher senden
- Besucher koennen Push global deaktivieren (DSGVO-relevant)
- pushEnabled-Flag wird in findTokensByStore bereits beruecksichtigt (aus Plan 01)
- Automatische Trigger (Kampagne, Streak, Schaufenster) koennen in nachfolgenden Plaenen auf pushService.sendToStore aufbauen

---
*Phase: 10-push-benachrichtigungen*
*Completed: 2026-04-08*
