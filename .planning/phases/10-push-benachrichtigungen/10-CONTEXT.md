# Phase 10: Push-Benachrichtigungen - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Push-Notification-Infrastruktur (FCM fuer Android, APNs fuer iOS), automatische Trigger bei Kampagnen/Streak/Schaufenster, manuelle Admin-Push, deaktivierbar durch Besucher.

</domain>

<decisions>
## Implementation Decisions

### Infrastruktur
- Firebase Cloud Messaging (FCM) fuer Android + iOS (unified)
- @react-native-firebase/messaging fuer Mobile
- firebase-admin SDK im Backend fuer Server-seitiges Senden
- Device-Token bei Login registrieren, bei Logout entfernen
- device_tokens Tabelle: id, user_id, store_id, token, platform (ios/android), created_at

### Automatische Trigger
- Neue Kampagne erstellt -> Push an alle Besucher des Stores: "Neue Aktion: [Titel]!"
- Streak-Erinnerung: Freitags pruefen ob Besucher diese Woche noch nicht da war -> "Deine Serie bricht bald ab -- komm diese Woche noch vorbei!"
- Neues Schaufenster-Stueck markiert -> Push: "Neues Highlight im Laden!"

### Admin-Push
- Admin kann manuellen Push mit eigenem Text an alle Besucher senden
- Einfaches Formular: Titel + Text + Senden-Button

### Besucher-Einstellungen
- Besucher kann Push global deaktivieren in App-Einstellungen
- push_enabled Boolean auf User oder device_tokens Tabelle
- Einstellungs-Screen erreichbar ueber Profil/Account-Bereich

### Keine Emojis
- Push-Texte ohne Emojis, nur Text

### Claude's Discretion
- Firebase-Projekt Setup-Details
- Cron-Job vs. Event-basiert fuer Streak-Erinnerung
- Push-Text-Formulierungen
- Einstellungs-Screen Platzierung in Navigation

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- backend/src/modules/campaigns/ -- Kampagnen-Service (Trigger-Punkt fuer Push)
- backend/src/modules/items/ -- Showcase-Markierung (Trigger-Punkt fuer Push)
- backend/src/modules/checkin/ -- weekly_visits Tabelle fuer Streak-Check
- mobile/src/store/authStore.ts -- Login/Logout Lifecycle fuer Token-Registrierung

### Integration Points
- Backend: neues push-Modul (service, router)
- Backend: campaigns.service.ts erweitern (Push nach Kampagne-Erstellung)
- Backend: items.service.ts erweitern (Push nach Showcase-Markierung)
- Backend: Cron oder Scheduler fuer Freitags-Streak-Check
- Mobile: @react-native-firebase/messaging installieren
- Mobile: Neuer SettingsScreen oder Push-Toggle in bestehendem Screen

</code_context>

<specifics>
## Specific Ideas

Keine zusaetzlichen.

</specifics>

<deferred>
## Deferred Ideas

- Rich Push mit Bildern
- Push-Segmentierung (nur bestimmte Nutzergruppen)
- Push-Analytics (Oeffnungsrate)

</deferred>
