---
phase: 10-push-benachrichtigungen
plan: "02"
subsystem: backend
tags: [push, firebase, cron, node-cron, campaigns, showcase, streak]
dependency_graph:
  requires:
    - "10-01"
  provides:
    - campaign-push-trigger
    - showcase-push-trigger
    - streak-reminder-scheduler
  affects:
    - backend/src/modules/campaigns/campaigns.service.ts
    - backend/src/modules/items/items.service.ts
    - backend/src/modules/push/streak-reminder.ts
    - backend/src/server.ts
tech_stack:
  added:
    - node-cron 3.x (cron-Scheduling im Backend)
    - "@types/node-cron (TypeScript-Typen)"
  patterns:
    - fire-and-forget Push mit .catch() fuer Fehlertoleranz
    - Cron-Job mit node-cron fuer Freitags-Streak-Check
    - Set-basierte Differenz fuer saeumige-Besucher-Ermittlung
key_files:
  created:
    - backend/src/modules/push/streak-reminder.ts
  modified:
    - backend/src/modules/campaigns/campaigns.service.ts
    - backend/src/modules/items/items.service.ts
    - backend/src/server.ts
    - backend/package.json
    - backend/package-lock.json
decisions:
  - "fire-and-forget Push: Fehler werden geloggt aber nicht an den Caller weitergegeben"
  - "Streak-Check: Set-Differenz aus deviceTokens minus weeklyVisits statt komplexem JOIN"
  - "Cron-Schedule: 0 9 * * 5 (Freitag 9 Uhr Server-Zeitzone)"
  - "Streak-Check iteriert alle Stores dynamisch, kein hardcodierter Store"
metrics:
  duration: "~15 Minuten"
  completed: "2026-04-08"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 5
---

# Phase 10 Plan 02: Automatische Push-Trigger Summary

**One-liner:** Kampagne-, Showcase- und Streak-Erinnerungs-Push via fire-and-forget in bestehende Services eingefuegt, node-cron-Scheduler freitags um 9 Uhr.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Kampagne-Push und Showcase-Push in bestehende Services einfuegen | ca820cf | campaigns.service.ts, items.service.ts |
| 2 | Streak-Erinnerung Scheduler implementieren | efaee75 | streak-reminder.ts, server.ts, package.json |

## What Was Built

### Task 1: Push-Trigger in bestehenden Services

**campaigns.service.ts:** `createCampaign` wurde von einer einfachen Delegation zu einer async Funktion umgewandelt. Nach erfolgreicher DB-Erstellung wird `pushService.sendToStore()` fire-and-forget aufgerufen mit Text "Neue Aktion: [Titel]!". Fehler werden mit `console.error` geloggt und nicht nach aussen gegeben.

**items.service.ts:** `setShowcase` wurde erweitert. Wenn `isShowcase=true` gesetzt wird, sendet der Service fire-and-forget einen Push "Neues Highlight im Laden!" an alle Store-Besucher.

### Task 2: Streak-Erinnerung Scheduler

**streak-reminder.ts:** Neues Modul mit zwei Exports:
- `checkAndSendStreakReminders()`: Berechnet aktuellen Wochenstart (Montag), iteriert alle Stores, ermittelt via Set-Differenz welche Token-User diese Woche noch nicht eingecheckt haben, sendet Push "Deine Serie bricht bald ab -- komm diese Woche noch vorbei!"
- `startStreakReminderScheduler()`: Registriert node-cron-Job fuer Freitag 9 Uhr

**server.ts:** `startStreakReminderScheduler()` wird nach `app.listen()` aufgerufen. Server-Log bestaetigt: "[Push] Streak-Reminder Scheduler registriert (Freitag 9 Uhr)"

## Verification

- TypeScript kompiliert fehlerfrei: `npx tsc --noEmit` - clean
- Docker-Build auf Server erfolgreich: Image `plietsche-backend:latest` gebaut
- Container-Log bestaetigt Scheduler-Start: "[Push] Streak-Reminder Scheduler registriert (Freitag 9 Uhr)"

## Deviations from Plan

None - Plan executed exactly as written.

## Known Stubs

None - alle drei Trigger sind vollstaendig implementiert und mit dem Push-Service aus Plan 01 verbunden.

## Self-Check: PASSED

Files exist:
- backend/src/modules/push/streak-reminder.ts: FOUND
- backend/src/modules/campaigns/campaigns.service.ts: FOUND (modified)
- backend/src/modules/items/items.service.ts: FOUND (modified)
- backend/src/server.ts: FOUND (modified)

Commits exist:
- ca820cf: FOUND (feat(10-02): Kampagne- und Showcase-Push-Trigger einfuegen)
- efaee75: FOUND (feat(10-02): Streak-Erinnerung Scheduler mit node-cron implementieren)
