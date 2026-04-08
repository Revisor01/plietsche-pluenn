# Roadmap: Plietsche Plünn

## Overview

Migration des bestehenden MVP zu einem produktionsreifen Stack (React Native bare + Express 5 + PostgreSQL) und Aufbau der Kern-Features: Item-Management mit QR-Codes für Ehrenamtliche, QR-Scan und Check-In mit PlietschPunkten für Besucher, und ein Admin-Dashboard für Überblick. Vier breite Phasen vom Fundament bis zum vollständigen v1-Launch.

## Phases

- [x] **Phase 1: Foundation** - Backend + Mobile Neubau mit PostgreSQL, Express 5, React Native bare
- [ ] **Phase 2: Volunteer Core** - Item-Management, QR-Code-Generierung, Store-Info
- [ ] **Phase 3: Visitor Experience** - QR-Scan, Check-In, PlietschPunkte
- [ ] **Phase 4: Dashboard & Polish** - Admin-Statistiken, UX-Feinschliff, Launch-Readiness

## Phase Details

### Phase 1: Foundation
**Goal**: Produktionsreifer Tech-Stack steht — React Native bare App baut auf iOS + Android, Express 5 Backend mit PostgreSQL + Drizzle ORM läuft, JWT-Auth mit Rollen funktioniert.
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04
**Success Criteria** (what must be TRUE):
  1. React Native bare App startet auf iOS und Android Simulator/Device (kein Expo)
  2. Express 5 Backend antwortet auf Health-Check-Endpoint
  3. PostgreSQL-Datenbank mit Drizzle-Schema erstellt (users, stores, items Tabellen mit store_id)
  4. User kann sich registrieren und einloggen (JWT), Rollen admin/volunteer/visitor funktionieren
  5. Basis-Navigation in der App (Login → Homescreen)
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — React Native bare Projekt-Setup mit New Architecture, Navigation, Build-Konfiguration
- [x] 01-02-PLAN.md — Express 5 Backend mit Drizzle ORM, PostgreSQL-Schema, store_id in allen Tabellen
- [x] 01-03-PLAN.md — JWT-Authentifizierung mit Rollen-System (admin, volunteer, visitor), Login/Register-Screens

### Phase 2: Volunteer Core
**Goal**: Ehrenamtliche können Kleidungsstücke anlegen, QR-Codes werden automatisch generiert, Items sind filter- und suchbar, Store-Infoseite ist eingerichtet.
**Depends on**: Phase 1
**Requirements**: ITEM-01, ITEM-02, ITEM-03, ITEM-04, STORE-01
**Success Criteria** (what must be TRUE):
  1. Ehrenamtlicher erstellt Item mit Titel/Kategorie/Größe/Zustand → QR-Code-PNG wird automatisch generiert
  2. QR-Code enthält UUID-Token (nicht die interne Item-ID) und ist druckbar
  3. Item-Liste zeigt alle Items mit Filtern (Kategorie, Status, Datum)
  4. Schnelleingabe übernimmt Defaults vom vorherigen Eintrag
  5. Store-Infoseite zeigt Öffnungszeiten und Adresse
**Plans**: 3 plans

Plans:
- [ ] 02-01-PLAN.md — Schema-Migration + items Backend-Modul (CRUD + QR-Generierung via qrcode npm)
- [ ] 02-02-PLAN.md — Volunteer-Screens: Item anlegen (Schnelleingabe, Farbpicker), Item-Liste mit Filter/Suche, Bottom-Tabs
- [ ] 02-03-PLAN.md — Store-Info API + Screen (Öffnungszeiten, Adresse, Beschreibung)

### Phase 3: Visitor Experience
**Goal**: Besucher scannen QR-Codes an Kleidungsstücken und an der Ladentür, sammeln PlietschPunkte, geben an wie viele nicht-digitale Teile sie mitgenommen haben. Punktestand prominent auf dem Homescreen.
**Depends on**: Phase 2
**Requirements**: SCAN-01, SCAN-02, SCAN-03, CHKIN-01, CHKIN-02, CHKIN-03, CHKIN-04, PUNKT-01, PUNKT-02, PUNKT-03
**Success Criteria** (what must be TRUE):
  1. Besucher scannt Item-QR → Item wird als "mitgenommen" markiert, PlietschPunkte gutgeschrieben
  2. Besucher scannt Tür-QR + GPS-Check bestätigt Vor-Ort-Anwesenheit
  3. Nach Check-In: Stepper "Wie viele Teile?" (1–10), Punkte pro Teil
  4. Tür-QR-Code ist HMAC-signiert/rotierend gegen Remote-Fälschung
  5. Punktestand ist auf dem Homescreen sichtbar
  6. Kein persistenter User↔Item-Link in der Datenbank
**Plans**: 3 plans

Plans:
- [ ] 03-01-PLAN.md — scan-Backend-Modul (POST /api/scan, point_transactions, created_by-Migration) + ScanScreen mit react-native-vision-camera + Toast-Feedback
- [ ] 03-02-PLAN.md — checkin-Backend-Modul (HMAC-Door-QR, Haversine-GPS, Rate-Limit) + GET /api/checkin/door-qr Admin-Endpoint + CheckInScreen (GPS→Scan→Stepper)
- [ ] 03-03-PLAN.md — store_settings-Tabelle + points-Modul (Balance/History API) + HomeScreen Punktestand + PointsHistoryScreen

### Phase 4: Dashboard & Polish
**Goal**: Admin-Dashboard mit aggregierten Statistiken, UX-Feinschliff, DSGVO-konform, launch-bereit.
**Depends on**: Phase 3
**Requirements**: STORE-02
**Success Criteria** (what must be TRUE):
  1. Admin-Dashboard zeigt: Besuche heute/Woche, Items mitgenommen (aggregiert), aktive Items
  2. App-UX ist flüssig und konsistent auf iOS + Android
  3. Datenschutzerklärung nennt GPS-Zweck explizit
  4. GPS-Koordinaten werden nur serverseitig validiert, nie persistiert
  5. Error-Handling und Offline-Zustand sind sauber abgefangen
**Plans**: 2 plans

Plans:
- [ ] 04-01: Admin-Dashboard API + Screen (aggregierte Statistiken, kein Personen-Tracking)
- [ ] 04-02: UX-Polish, DSGVO-Review (GPS-Datenschutz), Error-Handling, Launch-Readiness

---
*Roadmap created: 2026-04-08*
*Last updated: 2026-04-08 after Phase 3 planning*
