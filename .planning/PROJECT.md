# Plietsche Plünn

## What This Is

Eine App für den Kleidertausch-Laden "Plietsche Plünn" in der Kirchengemeinde. Ehrenamtliche pflegen den Bestand und versehen ausgewählte Teile mit auto-generierten QR-Codes. Besucher kommen vor Ort, stöbern, scannen QR-Codes zum Ausbuchen und sammeln PlietschPunkte. Nicht alle Teile sind digital erfasst — Besucher können auch pauschal ihren Besuch loggen und mitgenommene Teile zählen, verifiziert durch Standort-Check (GPS + QR-Code an der Tür).

## Core Value

Besucher haben einen Anreiz, regelmäßig in den Tausch-Laden zu kommen, und Ehrenamtliche sehen, was passiert — ohne dass einzelne Personen überwacht werden.

## Current Milestone: v1.1 Engagement & Polish

**Goal:** App attraktiv und einladend machen — Kampagnen, Schaufenster, Badges, Onboarding, durchgängiges UI-Styling mit Gradient-Theme und Work Sans.

**Target features:**
- Kampagnen/Aktionen (zeitlich begrenzte Punkt-Multiplikatoren)
- Schaufenster (ausgewählte Items auf Visitor-Homescreen)
- Onboarding-Flow für neue Besucher
- Rollen-Hierarchie (Admin vs. Volunteer feiner trennen)
- UI-Styling durchziehen (Gradient-Theme, Work Sans, alle Screens)
- Badges/Achievement-Levels für PlietschPunkte

## Requirements

### Validated

- ✓ JWT-Authentifizierung mit Rollen (admin, volunteer, visitor) — v1.0 Phase 1
- ✓ Item-CRUD mit QR-Code-Generierung (UUID-Token, PNG) — v1.0 Phase 2
- ✓ Item-Liste mit Filter/Suche — v1.0 Phase 2
- ✓ Store-Info (Admin-editierbar, öffentlich lesbar) — v1.0 Phase 2
- ✓ QR-Scan → Item ausbuchen + PlietschPunkte — v1.0 Phase 3
- ✓ Check-In (Tür-QR HMAC + GPS 150m) + Teile-Stepper — v1.0 Phase 3
- ✓ PlietschPunkte-System (konfigurierbar, Historie) — v1.0 Phase 3
- ✓ Admin-Dashboard mit Datepicker-Statistiken — v1.0 Phase 4
- ✓ DSGVO-Datenschutzerkärung In-App — v1.0 Phase 4
- ✓ React Native bare + Express 5 + PostgreSQL — v1.0 Phase 1

### Active

- [ ] Kampagnen/Aktionen mit Punkt-Multiplikatoren
- [ ] Schaufenster (Showcase-Items auf Visitor-Homescreen)
- [ ] Onboarding-Flow für neue Besucher
- [ ] Rollen-Hierarchie (Admin vs. Volunteer)
- [ ] UI-Styling (Gradient-Theme, Work Sans, alle Screens)
- [ ] Badges/Achievement-Levels

### Out of Scope

- Reservierungssystem — Alles passiert vor Ort, keine Online-Reservierungen
- Tracking wer-was-mitnimmt — Bewusste Entscheidung für Privatsphäre, kein Personen-Tracking
- Nutzer stellen selbst Kleidung ein — Nur Verwaltung/Ehrenamtliche pflegen den Bestand
- Online-Shop / Versand — Rein lokales Vor-Ort-Konzept
- Multi-Tenant — Nur für unseren Store, nicht für andere Läden
- Expo — Zu unübersichtlich, nicht nativ genug

## Context

- Kleidertausch-Laden "Plietsche Plünn" in Kirchengemeinde/Nachbarschaft
- Zielgruppe: Nachbarschaft, Kirchengemeinde, Geflüchtete — niedrigschwellig und inklusiv
- Aktuell max. 10 Teile pro Besuch mitnehmen (Laden-Regel, admin-konfigurierbar)
- Nicht alle Kleidungsstücke werden digital erfasst — App ergänzt den Laden, ersetzt ihn nicht
- v1.0 komplett deployed auf plietsche-plünn.de (server.godsapp.de)
- Backend: Portainer Stack #261, PostgreSQL + Express 5
- iOS-Build funktioniert auf Device

## Constraints

- **Tech Stack**: React Native bare (New Architecture) + Express/Node.js + PostgreSQL
- **Plattformen**: iOS + Android Pflicht, Web optional für später
- **Zielgruppe**: Muss extrem einfach bedienbar sein
- **Privatsphäre**: Kein personenbezogenes Tracking wer was mitnimmt
- **Deployment**: Alles auf server.godsapp.de, kein lokales Docker
- **Design**: Work Sans Schriftart, Gradient #27b092 → #79c4b0 (51%) → #80b4e2

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React Native bare statt Expo | Expo zu unübersichtlich, mehr Kontrolle gewünscht | ✓ Good |
| React Native statt Flutter | Bestehendes React-Know-how nutzen | ✓ Good |
| PostgreSQL statt SQLite | SQLite nicht produktionstauglich für Multi-User-App | ✓ Good |
| Kein Reservierungssystem | Alles passiert vor Ort, App ergänzt Laden | ✓ Good |
| GPS + Tür-QR für Vor-Ort-Nachweis | Punkte auch ohne digitale Erfassung aller Teile | ✓ Good |
| Kein Multi-Tenant | Nur für unseren Store, kein Bedarf für andere | ✓ Good |
| Work Sans + Gradient Theme | Eigene visuelle Identität, P²-Branding | — Pending |
| Server-Deployment statt lokal | Docker nicht auf Mac, alles auf server.godsapp.de | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-08 after v1.0 completion, v1.1 milestone start*
