---
phase: 10-push-benachrichtigungen
plan: "01"
subsystem: push-infrastruktur
tags: [firebase, fcm, push-notifications, device-tokens, backend, mobile]
dependency_graph:
  requires: []
  provides: [push-service, device-token-api, firebase-sdk-mobile]
  affects: [backend/src/modules/push, mobile/src/services/pushService, mobile/src/store/authStore]
tech_stack:
  added: [firebase-admin@13.7.0, "@react-native-firebase/app@24.0.0", "@react-native-firebase/messaging@24.0.0"]
  patterns: [singleton-firebase-init, fire-and-forget-token-registration, cascade-delete-device-tokens]
key_files:
  created:
    - backend/src/modules/push/push.types.ts
    - backend/src/modules/push/push.repository.ts
    - backend/src/modules/push/push.service.ts
    - backend/src/modules/push/push.router.ts
    - mobile/src/services/pushService.ts
  modified:
    - backend/src/db/schema.ts
    - backend/src/app.ts
    - backend/.gitignore
    - backend/Dockerfile
    - mobile/src/store/authStore.ts
    - mobile/ios/PlietschePluenn/AppDelegate.swift
    - mobile/ios/Podfile
    - mobile/android/build.gradle
    - mobile/android/app/build.gradle
decisions:
  - "firebase-service-account.json per scp auf Server kopiert, nicht in Git -- Dockerfile COPYt sie aus Build-Kontext"
  - "Device-Token replace-Pattern: delete-then-insert pro userId (kein upsert-Constraint benoetigt)"
  - "req.user.sub als userId (nicht .id) -- AuthUser JWT-Payload nutzt sub-Feld"
  - "use_modular_headers! im Podfile fuer FirebaseCoreInternal Swift-Modul-Kompatibilitaet"
metrics:
  duration: "ca. 45 Minuten"
  completed: "2026-04-09"
  tasks_completed: 3
  files_created: 5
  files_modified: 9
---

# Phase 10 Plan 01: Push-Infrastruktur (Firebase + device_tokens + Mobile SDK) Summary

**One-liner:** Firebase Admin SDK im Backend mit device_tokens-Tabelle und FCM-Token-Registrierung per Login/Logout in der Mobile-App.

## Tasks

| Task | Name | Status | Commit |
|------|------|--------|--------|
| 1 | Firebase-Projekt einrichten (checkpoint:human-action) | Abgeschlossen (Dateien vorhanden) | -- |
| 2 | Backend -- device_tokens Schema, Push-Modul | Abgeschlossen | 6e22683 |
| 3 | Mobile -- Firebase-Messaging + Token-Registrierung | Abgeschlossen | 6da7273 |

## What Was Built

### Backend

- **device_tokens Tabelle** (`backend/src/db/schema.ts`): id, user_id (cascade), store_id (cascade), token, platform (ios/android), push_enabled, created_at, updated_at
- **push.repository.ts**: insertToken (delete+insert Pattern), deleteToken, findTokensByStore (pushEnabled=true), findTokensByUser, setPushEnabled
- **push.service.ts**: Firebase Admin SDK Singleton-Initialisierung, sendToTokens (sendEachForMulticast), sendToStore, sendToUser -- Fehler bei einzelnen Tokens werden geloggt, kein throw
- **push.router.ts**: POST /api/push/token (201), DELETE /api/push/token (204) -- beide mit authenticateToken-Middleware
- **app.ts**: `/api/push` Router eingebunden
- **Dockerfile**: `COPY firebase-service-account.json` hinzugefuegt
- **firebase-admin@13.7.0** installiert

### Mobile

- **pushService.ts**: requestPushPermission, registerPushToken (Permission anfordern -> FCM-Token holen -> POST an Backend), unregisterPushToken (DELETE an Backend)
- **authStore.ts**: login ruft registerPushToken(token) fire-and-forget auf, logout ruft unregisterPushToken(currentToken) fire-and-forget auf (get()-Pattern)
- **AppDelegate.swift**: `import Firebase` + `FirebaseApp.configure()` vor React-Native-Start
- **Podfile**: `use_modular_headers!` fuer Swift-Modul-Kompatibilitaet
- **Android build.gradle**: google-services@4.4.2 classpath + apply plugin

### Deployment

- device_tokens Tabelle direkt per psql auf Produktions-DB erstellt
- firebase-service-account.json per scp auf Server uebertragen
- Backend neu gebaut und deployed -- Health-Check bestaetigt

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] AuthUser.sub statt .id fuer userId**
- **Found during:** Task 2 TypeScript-Check
- **Issue:** `req.user.id` existiert nicht -- AuthUser-Interface nutzt `sub` als userId-Feld (JWT-Standard)
- **Fix:** `req.user!.id` durch `req.user!.sub` in push.router.ts ersetzt
- **Files modified:** `backend/src/modules/push/push.router.ts`
- **Commit:** 6e22683

**2. [Rule 1 - Bug] DB-Import-Pfad falsch**
- **Found during:** Task 2 TypeScript-Check
- **Issue:** `../../db` aufloesbar, aber `../../db/client` ist der korrekte Pfad fuer den db-Export
- **Fix:** Import auf `../../db/client` korrigiert
- **Files modified:** `backend/src/modules/push/push.repository.ts`
- **Commit:** 6e22683

**3. [Rule 1 - Bug] firebase-service-account.json nicht im Docker Build-Kontext**
- **Found during:** Task 2 Backend-Deploy
- **Issue:** Datei ist in .gitignore und damit nicht auf Server -- Docker COPY schlug fehl
- **Fix:** Datei per scp auf Server kopiert (`/opt/stacks/plietsche-pluenn/backend/`)
- **Files modified:** Keine Code-Aenderung; manuelle Server-Aktion
- **Commit:** --

**4. [Rule 1 - Bug] Podfile: FirebaseCoreInternal Swift-Modul-Warnung**
- **Found during:** Task 3 pod install
- **Issue:** `FirebaseCoreInternal` (Swift) benoetigt `modular_headers` fuer GoogleUtilities
- **Fix:** `use_modular_headers!` in Podfile eingefuegt; pod install erfolgreich
- **Files modified:** `mobile/ios/Podfile`
- **Commit:** 6da7273

**5. [Rule 3 - Blocker] drizzle-kit push im Container nicht ausfuehrbar**
- **Found during:** Task 2 DB-Migration
- **Issue:** Laufender Backend-Container hat kein drizzle-orm installiert (nur Production-Build mit --omit=dev)
- **Fix:** Migration direkt per psql-DDL ausgefuehrt (`CREATE TABLE IF NOT EXISTS device_tokens ...`)
- **Files modified:** Keine
- **Commit:** --

## Known Stubs

Keine -- alle Endpunkte sind vollstaendig implementiert und funktionsfaehig.

## Threat Flags

Keine neuen Bedrohungsflaechen jenseits des Threat Models im Plan.

## Self-Check: PASSED

- `backend/src/modules/push/push.service.ts` existiert: FOUND
- `backend/src/modules/push/push.repository.ts` existiert: FOUND
- `backend/src/modules/push/push.router.ts` existiert: FOUND
- `mobile/src/services/pushService.ts` existiert: FOUND
- Commit 6e22683 existiert: FOUND
- Commit 6da7273 existiert: FOUND
- device_tokens Tabelle in Produktions-DB: FOUND (via psql \dt)
- Backend Health-Check: OK
