---
phase: 01-foundation
plan: "03"
subsystem: auth
tags: [jwt, bcrypt, zustand, express, react-native, typescript]

# Dependency graph
requires:
  - phase: 01-02
    provides: Drizzle-Schema (users, stores, items), db/client, config mit jwtSecret
  - phase: 01-01
    provides: React Native bare Struktur, AppNavigator, apiClient (Axios)
provides:
  - POST /api/auth/register — User anlegen, JWT zurückgeben
  - POST /api/auth/login — Credentials prüfen, JWT zurückgeben
  - authenticateToken Middleware — Bearer-Token verifizieren, req.user setzen
  - requireRole Guard — Rollenprüfung (admin/volunteer/visitor) mit 403 bei Abweisung
  - useAuthStore (Zustand) — token/user State mit login()/logout() Actions
  - LoginScreen + RegisterScreen — vollständige Auth-UI für Mobile
  - AppNavigator — token-gesteuertes Auth/App-Stack-Routing
affects:
  - 02-volunteer-core
  - 03-visitor-experience
  - 04-dashboard

# Tech tracking
tech-stack:
  added:
    - bcrypt (Passwort-Hashing, 12 Rounds)
    - jsonwebtoken (JWT-Generierung und -Verifikation, 7d Ablauf)
    - zustand (Mobile State Management)
  patterns:
    - Auth-Fehler mit statusCode-Property auf Error-Objekt — Express 5 Error Handler leitet 4xx weiter
    - User-Enumeration-Schutz: gleiche Fehlermeldung "Invalid credentials" für "User nicht gefunden" und "Passwort falsch"
    - requireRole muss immer nach authenticateToken in Middleware-Chain stehen
    - Token-Interceptor in Axios: useAuthStore.getState().token für automatische Bearer-Injection

key-files:
  created:
    - backend/src/modules/auth/auth.types.ts
    - backend/src/modules/auth/auth.repository.ts
    - backend/src/modules/auth/auth.service.ts
    - backend/src/modules/auth/auth.router.ts
    - backend/src/middleware/auth.ts
    - backend/src/middleware/requireRole.ts
    - mobile/src/store/authStore.ts
    - mobile/src/screens/auth/RegisterScreen.tsx
  modified:
    - backend/src/app.ts
    - mobile/src/api/client.ts
    - mobile/src/navigation/AppNavigator.tsx
    - mobile/src/screens/auth/LoginScreen.tsx

key-decisions:
  - "bcrypt mit 12 Rounds — konservativ für Sicherheit, akzeptable Performance auf Server"
  - "JWT mit 7d Ablauf (expiresIn: '7d') — T-03-02 Mitigation gegen Tokens ohne Ablauf"
  - "Gleiche Fehlermeldung für User-nicht-gefunden und falsches-Passwort — T-03-03 Mitigation gegen User-Enumeration"
  - "@react-navigation/stack statt native-stack — nur stack-Paket ist im Projekt installiert"
  - "PHASE1_STORE_ID als Placeholder-UUID — Developer trägt echte Store-UUID nach db:seed ein"

patterns-established:
  - "Error mit statusCode-Property: Object.assign(new Error('msg'), { statusCode: 409 }) — Express 5 Error Handler leitet 4xx weiter"
  - "requireRole(...roles) immer nach authenticateToken in Middleware-Chain"
  - "Zustand Store über useAuthStore.getState() in nicht-React-Kontext (Axios Interceptor)"

requirements-completed:
  - INFRA-04

# Metrics
duration: 25min
completed: 2026-04-08
---

# Phase 01 Plan 03: Auth-Modul Summary

**JWT-Authentifizierung mit bcrypt-Hashing, Rollen-Middleware (admin/volunteer/visitor) und vollständigem Mobile Auth-Flow via Zustand Store**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-08T00:00:00Z
- **Completed:** 2026-04-08
- **Tasks:** 2/2
- **Files modified:** 11

## Accomplishments

- Backend Auth-Modul: POST /register und POST /login mit bcrypt (12 Rounds) und JWT (7d Ablauf, Payload: sub/storeId/role)
- authenticateToken Middleware und requireRole Guard für alle zukünftigen geschützten Routen bereit
- Mobile: Zustand Auth-Store, vollständige Login/Register-Screens mit Fehlerbehandlung, Token-Interceptor in Axios
- AppNavigator wechselt automatisch auf HomeScreen wenn token gesetzt ist (Platzhalter `useIsAuthenticated` entfernt)

## Task Commits

1. **Task 1: Backend Auth-Modul** - `3523b34` (feat)
2. **Task 2: Mobile Auth-Store und Screens** - `7002425` (feat)

**Plan metadata:** (folgt)

## Files Created/Modified

- `backend/src/modules/auth/auth.types.ts` - AuthUser, RegisterBody, LoginBody, AuthResponse interfaces
- `backend/src/modules/auth/auth.repository.ts` - findUserByEmail, createUser via Drizzle ORM
- `backend/src/modules/auth/auth.service.ts` - register/login Business-Logik mit bcrypt und JWT
- `backend/src/modules/auth/auth.router.ts` - POST /register + POST /login mit Zod-Validierung
- `backend/src/middleware/auth.ts` - authenticateToken Middleware, setzt req.user
- `backend/src/middleware/requireRole.ts` - requireRole Guard, 403 bei unzureichender Rolle
- `backend/src/app.ts` - authRouter eingebunden, Error Handler um statusCode erweitert
- `mobile/src/store/authStore.ts` - Zustand Store: token, user, login(), logout()
- `mobile/src/screens/auth/LoginScreen.tsx` - Login-Formular mit E-Mail/Passwort-Validierung
- `mobile/src/screens/auth/RegisterScreen.tsx` - Registrierungs-Formular (neu erstellt)
- `mobile/src/api/client.ts` - Token-Interceptor für automatische Bearer-Injection
- `mobile/src/navigation/AppNavigator.tsx` - useAuthStore-Integration, Register-Screen ergänzt

## Decisions Made

- **bcrypt 12 Rounds:** Sicherheitskonservativ, akzeptable Latenz auf Server-Hardware.
- **JWT 7d Ablauf:** T-03-02 Mitigation — kein Token ohne Ablaufdatum.
- **User-Enumeration-Schutz:** "Invalid credentials" sowohl für unbekannte E-Mail als auch falsches Passwort (T-03-03).
- **@react-navigation/stack statt native-stack:** Nur `stack` ist im Projekt installiert — `native-stack` nicht verfügbar. StackNavigationProp importiert aus `@react-navigation/stack`.
- **PHASE1_STORE_ID:** Placeholder-UUID `00000000-0000-0000-0000-000000000000` in RegisterScreen. Developer trägt echte Store-UUID nach `npm run db:seed` ein oder setzt `STORE_ID` Env-Variable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] @react-navigation/native-stack nicht installiert**
- **Found during:** Task 2 (TypeScript-Check Mobile)
- **Issue:** LoginScreen und RegisterScreen importierten `NativeStackNavigationProp` aus `@react-navigation/native-stack` — Paket nicht installiert, nur `@react-navigation/stack` verfügbar
- **Fix:** Import auf `StackNavigationProp` aus `@react-navigation/stack` umgestellt in beiden Screens
- **Files modified:** mobile/src/screens/auth/LoginScreen.tsx, mobile/src/screens/auth/RegisterScreen.tsx
- **Verification:** `npx tsc --noEmit` — EXIT: 0
- **Committed in:** 7002425 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Notwendige Korrektur — kein scope creep. Typen-Kompatibilität mit installiertem Stack-Navigator bleibt vollständig erhalten.

## Issues Encountered

Ende-zu-Ende Test (Register → Login → JWT) erfordert laufendes Backend mit PostgreSQL-Datenbank. Lokal nicht möglich (kein Docker auf Mac). Deployment auf server.godsapp.de notwendig für vollständigen Smoke-Test.

## Known Stubs

- **PHASE1_STORE_ID** in `mobile/src/screens/auth/RegisterScreen.tsx`: Placeholder-UUID `00000000-0000-0000-0000-000000000000`. Nach `npm run db:seed` im Backend die erste Store-UUID aus der DB ausgeben lassen und hier eintragen oder als `STORE_ID` React Native Env-Variable setzen. Betrifft nur Registrierung in Phase 1.

## Verification Requires Server Deployment

Die folgenden Acceptance-Criteria aus dem Plan können erst nach Deployment verifiziert werden:

1. `POST /api/auth/register` → HTTP 201 mit `{ token, user: { role: "visitor", storeId, ... } }`
2. `POST /api/auth/login` → HTTP 200, JWT im Response-Body
3. JWT-Payload enthält `sub`, `storeId`, `role`
4. `authenticateToken` mit ungültigem Token → 401
5. `requireRole('volunteer')` mit visitor-Token → 403
6. Mobile App iOS Simulator: Login-Screen → Credentials → Homescreen

TypeScript-Checks lokal bestanden:
- `cd backend && npx tsc --noEmit` → EXIT: 0
- `cd mobile && npx tsc --noEmit` → EXIT: 0

## PHASE1_STORE_ID Setup-Anleitung

Nach Server-Deployment und `docker exec plietsche-backend npm run db:seed`:
```bash
# Store-UUID aus der DB lesen
docker exec plietsche-postgres psql -U plietsche -d plietschepluenn -c "SELECT id FROM stores LIMIT 1;"

# UUID in RegisterScreen eintragen (oder als Env-Variable):
# PHASE1_STORE_ID = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
```

## Next Phase Readiness

- Auth-Middleware (`authenticateToken`, `requireRole`) ist fertig für Phase 2 geschützte Routen
- Rollen-System (admin/volunteer/visitor) vollständig definiert und implementiert
- Mobile Token-Handling (Interceptor + Store) ist für alle zukünftigen API-Calls bereit
- Blocker: Server-Deployment und db:seed ausstehend (aus Plan 02 bekannt)

---
*Phase: 01-foundation*
*Completed: 2026-04-08*
