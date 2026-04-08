# Plietsche Plünn

## What This Is

Eine App für den Kleidertausch-Laden "Plietsche Plünn" in der Kirchengemeinde. Ehrenamtliche pflegen den Bestand und versehen ausgewählte Teile mit auto-generierten QR-Codes. Besucher kommen vor Ort, stöbern, scannen QR-Codes zum Ausbuchen und sammeln PlietschPunkte. Nicht alle Teile sind digital erfasst -- Besucher können auch pauschal ihren Besuch loggen und mitgenommene Teile zählen, verifiziert durch Standort-Check (GPS + QR-Code an der Tür).

## Core Value

Besucher haben einen Anreiz, regelmäßig in den Tausch-Laden zu kommen, und Ehrenamtliche sehen, was passiert -- ohne dass einzelne Personen überwacht werden.

## Current Milestone: v1.2 Achievements, Icons & Push

**Goal:** Echtes Achievement-System mit kategorie-basierten Badges, Streak-Tracking, Push-Benachrichtigungen, und Icon-Cleanup (Font Awesome statt Emojis).

**Target features:**
- Achievement-System mit Badge-Kategorien (Bringer, Holer, Besucher, Saison, Streaks, Meilensteine)
- Admin-konfigurierbare Badges mit Trigger-Bedingungen und Fortschrittsanzeige
- Bronze/Silber/Gold Stufen pro Kategorie
- Streak-Tracking (Wochen in Folge besucht)
- Push-Benachrichtigungen (Kampagnen, Streak-Erinnerung, Schaufenster)
- Font Awesome Line-Icons statt Emojis überall
- Cleanes, schlichtes Design mit Gradient

## Requirements

### Validated

- ✓ JWT-Authentifizierung mit Rollen (admin, volunteer, visitor) -- v1.0 Phase 1
- ✓ Item-CRUD mit QR-Code-Generierung (UUID-Token, PNG) -- v1.0 Phase 2
- ✓ Item-Liste mit Filter/Suche -- v1.0 Phase 2
- ✓ Store-Info (Admin-editierbar, öffentlich lesbar) -- v1.0 Phase 2
- ✓ QR-Scan -> Item ausbuchen + PlietschPunkte -- v1.0 Phase 3
- ✓ Check-In (Tür-QR HMAC + GPS 150m) + Teile-Stepper -- v1.0 Phase 3
- ✓ PlietschPunkte-System (konfigurierbar, Historie) -- v1.0 Phase 3
- ✓ Admin-Dashboard mit Datepicker-Statistiken -- v1.0 Phase 4
- ✓ DSGVO-Datenschutzerklärung In-App -- v1.0 Phase 4
- ✓ Kampagnen/Aktionen mit Punkt-Multiplikatoren -- v1.1 Phase 6
- ✓ Schaufenster (Showcase-Items auf Homescreen) -- v1.1 Phase 6
- ✓ Onboarding-Flow für neue Besucher -- v1.1 Phase 7
- ✓ Rollen-Hierarchie (Admin vs. Volunteer) -- v1.1 Phase 7
- ✓ UI-Styling (Gradient-Theme, Work Sans, alle Screens) -- v1.1 Phase 5
- ✓ Basis-Badges/Achievement-Levels -- v1.1 Phase 6

### Active

- [ ] Echtes Achievement-System mit kategorie-basierten Badges
- [ ] Push-Benachrichtigungen
- [ ] Font Awesome Icons statt Emojis

### Out of Scope

- Reservierungssystem -- Alles passiert vor Ort
- Tracking wer-was-mitnimmt -- Bewusste Privatsphäre-Entscheidung
- Nutzer stellen selbst Kleidung ein -- Nur Ehrenamtliche
- Online-Shop / Versand -- Rein lokales Konzept
- Multi-Tenant -- Nur für unseren Store
- Emojis -- Nie. Font Awesome Line-Icons stattdessen.

## Context

- v1.0 + v1.1 komplett deployed auf plietsche-plünn.de
- Backend: Portainer Stack #261, PostgreSQL + Express 5
- iOS-Build funktioniert auf Device
- Bestehendes simples Badge-System (Punkte-Schwellen) wird durch echtes Achievement-System ersetzt

## Constraints

- **Tech Stack**: React Native bare (New Architecture) + Express/Node.js + PostgreSQL
- **Plattformen**: iOS + Android Pflicht
- **Design**: Work Sans, Gradient #27b092->#79c4b0->#80b4e2, Font Awesome Line-Icons, clean und schlicht
- **Keine Emojis**: Nie. Font Awesome Icons als Alternative.
- **Deployment**: server.godsapp.de, kein lokales Docker

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React Native bare statt Expo | Mehr Kontrolle | ✓ Good |
| PostgreSQL statt SQLite | Produktionstauglich | ✓ Good |
| Kein Multi-Tenant | Nur unser Store | ✓ Good |
| Work Sans + Gradient Theme | Eigene Identität | ✓ Good |
| Font Awesome statt Emojis | User-Präferenz, cleaner Look | -- Pending |
| Push-Notifications | Aktive Besucher-Bindung | -- Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check -- still the right priority?
3. Audit Out of Scope -- reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-09 after v1.1 completion, v1.2 milestone start*
