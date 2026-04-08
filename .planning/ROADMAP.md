# Roadmap: Plietsche Pluenn

## Overview

v1.2 "Achievements, Icons & Push" -- Echtes Achievement-System mit kategorie-basierten Badges und Streak-Tracking, Font Awesome Icons statt Emojis fuer ein cleanes Design, und Push-Benachrichtigungen fuer aktive Besucher-Bindung.

## Phases

- [x] **Phase 1-4: v1.0** -- Foundation, Volunteer Core, Visitor Experience, Dashboard
- [x] **Phase 5-7: v1.1** -- UI-Styling, Engagement Features, Onboarding & Rollen
- [ ] **Phase 8: Icon-Cleanup** -- Font Awesome Line-Icons, alle Emojis raus, Tab-Bar, Badge-Icons
- [ ] **Phase 9: Achievement-System** -- Badge-Kategorien, Streak-Tracking, Fortschritt, Admin-Verwaltung
- [ ] **Phase 10: Push-Benachrichtigungen** -- FCM/APNs, Kampagnen-Push, Streak-Erinnerung, Admin-Push

## Phase Details

### Phase 8: Icon-Cleanup
**Goal**: Font Awesome Line-Icons als durchgaengiges Icon-System, alle Emojis entfernt, cleanes schlichtes Design.
**Depends on**: Phase 7
**Requirements**: ICON-01, ICON-02, ICON-03, ICON-04
**Success Criteria** (what must be TRUE):
  1. react-native-vector-icons mit FontAwesome installiert und auf iOS + Android gelinkt
  2. Kein einziges Emoji-Zeichen mehr in der gesamten App (grep findet nichts)
  3. Tab-Bar nutzt Font Awesome Icons
  4. Badge-Icons nutzen Font Awesome (trophy, star, fire etc.)
  5. Design bleibt clean und schlicht mit Gradient-Akzenten
**Plans**: 2 plans

Plans:
- [ ] 08-01-PLAN.md — react-native-vector-icons installieren, iOS pod install, alle Tab-Bar Icons (VisitorTabs, AdminTabs, VolunteerTabs) mit FontAwesome5
- [ ] 08-02-PLAN.md — Alle Screen-Emojis ersetzen (HomeScreen, CheckInScreen), Badge-System von emoji auf iconName migrieren (Backend + Mobile)

### Phase 9: Achievement-System
**Goal**: Vollstaendiges Badge-System mit Kategorien (Bringer, Holer, Besucher, Saison, Streaks, Meilensteine), Fortschrittsanzeige, Admin-Verwaltung, und In-App Toast bei neuem Badge.
**Depends on**: Phase 8
**Requirements**: ACH-01, ACH-02, ACH-03, ACH-04, ACH-05, ACH-06, ACH-07, ACH-08, ACH-09, ACH-10, ACH-11, ACH-12
**Success Criteria** (what must be TRUE):
  1. Badge-Definitionen mit Trigger-Typ und Zielwert in DB, Default-Badges geseedet
  2. Besucher sieht Badge-Uebersicht (erreichte + ausstehende mit Fortschrittsbalken)
  3. Streak wird woechentlich getrackt, Streak-Badge wird korrekt vergeben
  4. Saison-Badges zaehlen Items pro Saison (Fruehling Maerz-Mai, Sommer Juni-Aug, etc.)
  5. Admin kann eigene Badges erstellen/bearbeiten mit Trigger-Bedingungen
  6. Toast-Nachricht wenn neuer Badge freigeschaltet wird
**Plans**: 3 plans

Plans:
- [ ] 09-01-PLAN.md — Achievement-Schema + Backend-Engine (Trigger-Auswertung, Streak-Berechnung, Badge-Vergabe)
- [ ] 09-02-PLAN.md — Badge-Uebersichtsseite + Homescreen-Integration + Toast bei neuem Badge
- [ ] 09-03-PLAN.md — Admin Badge-Verwaltung (CRUD, Default-Badges, Saison-Config)

### Phase 10: Push-Benachrichtigungen
**Goal**: Push-Notifications ueber FCM/APNs -- automatisch bei Kampagnen und Streak-Gefahr, manuell durch Admin, deaktivierbar durch Besucher.
**Depends on**: Phase 9
**Requirements**: PUSH-01, PUSH-02, PUSH-03, PUSH-04, PUSH-05, PUSH-06, PUSH-07
**Success Criteria** (what must be TRUE):
  1. Push-Infrastruktur steht (FCM fuer Android, APNs fuer iOS)
  2. Device-Token wird bei Login registriert und bei Logout entfernt
  3. Neue Kampagne loest automatisch Push an alle Besucher aus
  4. Streak-Erinnerung wird Freitags gesendet wenn Besucher diese Woche noch nicht da war
  5. Admin kann manuellen Push mit eigenem Text senden
  6. Besucher kann Push in Einstellungen deaktivieren
**Plans**: 3 plans

Plans:
- [ ] 10-01-PLAN.md — Push-Infrastruktur (FCM Setup, APNs, Backend-Service, Device-Token-Verwaltung)
- [ ] 10-02-PLAN.md — Automatische Push-Trigger (Kampagne, Streak-Erinnerung, Schaufenster)
- [ ] 10-03-PLAN.md — Admin Push-Screen + Besucher Push-Einstellungen

### Phase 11: iOS 26 Liquid Glass Design

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 10
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 11 to break down)

---
*Roadmap created: 2026-04-09*
*Last updated: 2026-04-09 after v1.2 milestone definition*
