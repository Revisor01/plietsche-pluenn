# Plietsche Plünn

## What This Is

Eine App für verwaltete Kleidertausch-Läden. Ehrenamtliche pflegen den Bestand und versehen ausgewählte Teile mit auto-generierten QR-Codes. Besucher kommen vor Ort, stöbern, scannen QR-Codes zum Ausbuchen und sammeln PlietschPunkte. Nicht alle Teile sind digital erfasst — Besucher können auch pauschal ihren Besuch loggen und mitgenommene Teile zählen, verifiziert durch Standort-Check (GPS + QR-Code an der Tür).

## Core Value

Besucher haben einen Anreiz, regelmäßig in den Tausch-Laden zu kommen, und Ehrenamtliche sehen, was passiert — ohne dass einzelne Personen überwacht werden.

## Requirements

### Validated

- ✓ Basis-Backend mit User-Authentifizierung (JWT) — existing
- ✓ Item-Modell mit Status-Tracking (active/taken) — existing
- ✓ Grundlegende API-Struktur (Express REST) — existing

### Active

- [ ] Ehrenamtlichen-Rolle: Kleidungsstücke anlegen mit automatischer QR-Code-Generierung
- [ ] Besucher-Rolle: QR-Code am Kleidungsstück scannen → Teil als mitgenommen markieren, Punkte sammeln
- [ ] Vor-Ort-Check-In: QR-Code an der Tür + GPS-Verifizierung → "Ich war da und habe X Teile mitgenommen"
- [ ] PlietschPunkte-System: Punkte für Ausbuchen und Check-Ins, Anreize schaffen
- [ ] Aktionen/Kampagnen: "Winterkleidung gesucht — doppelte Punkte", zeitlich begrenzte Sonderaktionen
- [ ] Schaufenster: Ausgewählte Kleidungsstücke in der App präsentieren, Lust machen vorbeizukommen
- [ ] Multi-Tenant: Andere Tauschläden können die App für ihren eigenen Laden nutzen
- [ ] Migration auf React Native bare (ohne Expo) mit New Architecture
- [ ] Migration auf PostgreSQL statt SQLite
- [ ] Admin-Dashboard für Ehrenamtliche (Bestand, Aktionen, Statistiken)

### Out of Scope

- Reservierungssystem — Alles passiert vor Ort, keine Online-Reservierungen
- Tracking wer-was-mitnimmt — Bewusste Entscheidung für Privatsphäre, kein Personen-Tracking
- Nutzer stellen selbst Kleidung ein — Nur Verwaltung/Ehrenamtliche pflegen den Bestand
- Online-Shop / Versand — Rein lokales Vor-Ort-Konzept
- Expo — Zu unübersichtlich, nicht nativ genug

## Context

- Existierender Tausch-Laden in Kirchengemeinde/Nachbarschaft, Ehrenamtliche sortieren und kuratieren Kleidung
- Zielgruppe: Nachbarschaft, Kirchengemeinde, Geflüchtete — niedrigschwellig und inklusiv
- Aktuell max. 10 Teile pro Besuch mitnehmen (Laden-Regel)
- Nicht alle Kleidungsstücke werden digital erfasst — App ergänzt den Laden, ersetzt ihn nicht
- Bestehendes MVP mit Express-Backend und React Native/Expo-Frontend vorhanden, wird migriert
- Server-Infrastruktur auf server.godsapp.de (Hetzner) mit Docker/Traefik verfügbar

## Constraints

- **Tech Stack**: React Native bare (New Architecture) + Express/Node.js + PostgreSQL — bewusste Entscheidung gegen Expo
- **Plattformen**: iOS + Android Pflicht, Web optional für später
- **Zielgruppe**: Muss extrem einfach bedienbar sein — nicht-technische Ehrenamtliche und diverse Besucher
- **Privatsphäre**: Kein personenbezogenes Tracking wer was mitnimmt

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React Native bare statt Expo | Expo zu unübersichtlich und einschränkend, mehr Kontrolle über natives Verhalten gewünscht | — Pending |
| React Native statt Flutter | Bestehendes React-Know-how nutzen, kein neues Framework/Sprache lernen | — Pending |
| PostgreSQL statt SQLite | SQLite nicht produktionstauglich für Multi-User-App | — Pending |
| Kein Reservierungssystem | Alles passiert vor Ort, App soll Laden ergänzen nicht ersetzen | — Pending |
| GPS + Tür-QR für Vor-Ort-Nachweis | Ermöglicht Punkte auch ohne digitale Erfassung aller Kleidungsstücke | — Pending |
| Multi-Tenant-Architektur | Andere Tauschläden sollen die App auch nutzen können | — Pending |

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
*Last updated: 2026-04-07 after initialization*
