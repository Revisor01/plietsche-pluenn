# Roadmap: Plietsche Plünn

## Overview

v1.1 "Engagement & Polish" — Die App wird attraktiv und einladend. UI-Styling durchziehen, Kampagnen für gezielte Aktionen, Schaufenster als Appetitmacher, Badges für Langzeit-Motivation, Onboarding für neue Besucher, und saubere Rollen-Trennung.

## Phases

- [x] **Phase 1: Foundation** - v1.0 ✓
- [x] **Phase 2: Volunteer Core** - v1.0 ✓
- [x] **Phase 3: Visitor Experience** - v1.0 ✓
- [x] **Phase 4: Dashboard & Polish** - v1.0 ✓
- [ ] **Phase 5: UI-Styling** - Gradient-Theme, Work Sans, alle Screens konsistent
- [ ] **Phase 6: Engagement Features** - Kampagnen, Schaufenster, Badges
- [ ] **Phase 7: Onboarding & Rollen** - Onboarding-Flow, Admin/Volunteer Trennung

## Phase Details

### Phase 5: UI-Styling
**Goal**: Durchgängiges visuelles Theme mit Work Sans, Gradient (#27b092→#79c4b0→#80b4e2), gestylter Tab-Bar und Navigation auf allen Screens.
**Depends on**: Phase 4
**Requirements**: STYLE-01, STYLE-02, STYLE-03, STYLE-04, STYLE-05
**Success Criteria** (what must be TRUE):
  1. Work Sans wird auf allen Screens als Schriftart verwendet
  2. Gradient-Theme ist auf Header, primären Buttons und Highlight-Cards sichtbar
  3. Tab-Bar und Navigation-Header sind im Theme gestyled
  4. Alle Screens (Login, Home, Scan, CheckIn, Items, Dashboard, Store-Info, Punkte) sehen konsistent aus
  5. P² Logo-Platzhalter ist auf dem Login-Screen sichtbar
**Plans**: 2 plans

Plans:
- [ ] 05-01-PLAN.md — Tab-Bar/Navigation stylen + Visitor-Screens (Scan, CheckIn, PointsHistory)
- [ ] 05-02-PLAN.md — Volunteer/Admin-Screens (ItemCreate, ItemList, Dashboard, StoreInfo) + Register + Privacy

### Phase 6: Engagement Features
**Goal**: Kampagnen mit Punkt-Multiplikatoren, Schaufenster mit Showcase-Items, und Badges/Achievement-Levels — die drei Säulen der Besucher-Motivation.
**Depends on**: Phase 5
**Requirements**: CAMP-01, CAMP-02, CAMP-03, CAMP-04, SHOW-01, SHOW-02, SHOW-03, BADGE-01, BADGE-02, BADGE-03, BADGE-04
**Success Criteria** (what must be TRUE):
  1. Admin erstellt Kampagne mit Titel, Zeitraum und Multiplikator → Banner erscheint in Visitor-App
  2. Punkte-Engine vergibt automatisch multiplizierte Punkte während aktiver Kampagne
  3. Ehrenamtliche markieren Item als Showcase → Item erscheint auf Visitor-Homescreen
  4. Besucher sieht aktuelles Badge/Level + Fortschrittsbalken neben Punktestand
  5. Badge-Stufen sind admin-konfigurierbar (Name + Schwelle)
**Plans**: 3 plans

Plans:
- [ ] 06-01-PLAN.md — Kampagnen Backend (CRUD, Multiplikator in Punkte-Engine) + Admin-Screens (CampaignList, CampaignCreate)
- [ ] 06-02-PLAN.md — Schaufenster Backend (showcase-Flag auf Items) + Visitor-Homescreen Showcase-Sektion
- [ ] 06-03-PLAN.md — Badges Backend (badge_levels, Fortschritt-Berechnung) + Homescreen Badge-Anzeige + Admin BadgeLevels-Screen

### Phase 7: Onboarding & Rollen
**Goal**: Neue Besucher verstehen sofort das Konzept, und Admin/Volunteer haben klar getrennte Berechtigungen.
**Depends on**: Phase 5
**Requirements**: ONBO-01, ONBO-02, ONBO-03, ROLE-01, ROLE-02, ROLE-03, ROLE-04
**Success Criteria** (what must be TRUE):
  1. Neue Besucher sehen beim ersten Start 3-4 Onboarding-Screens (überspringbar)
  2. Onboarding wird nur einmal angezeigt (AsyncStorage Flag)
  3. Volunteer sieht nur Items-Tab (kein Dashboard, keine Store-Konfiguration)
  4. Admin sieht Dashboard + Store-Konfiguration + Volunteer-Verwaltung
  5. Admin kann neue Volunteer-Accounts erstellen
**Plans**: 2 plans

Plans:
- [ ] 07-01-PLAN.md — Onboarding-Flow (4 Screens, AsyncStorage, überspringbar, Visitor-only)
- [ ] 07-02-PLAN.md — Rollen-Trennung (AdminTabs/VolunteerTabs) + Backend admin-Modul + VolunteerManagementScreen

---
*Roadmap created: 2026-04-08*
*Last updated: 2026-04-08 after Phase 7 plans created*
