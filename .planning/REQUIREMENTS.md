# Requirements: Plietsche Plünn

**Defined:** 2026-04-08
**Core Value:** Besucher haben einen Anreiz, regelmäßig in den Tausch-Laden zu kommen, und Ehrenamtliche sehen, was passiert — ohne Personen-Tracking.

## v1 Requirements

Requirements für den initialen Launch mit einem Store.

### Infrastruktur & Migration

- [ ] **INFRA-01**: React Native bare (New Architecture) Projekt-Setup ohne Expo, iOS + Android Build-fähig
- [ ] **INFRA-02**: Express 5 Backend mit Router → Service → Repository Layering
- [ ] **INFRA-03**: PostgreSQL-Datenbank mit Drizzle ORM, store_id-Spalte in allen Tabellen (Multi-Tenant-ready)
- [ ] **INFRA-04**: JWT-Authentifizierung mit Rollen (admin, volunteer, visitor)

### Item-Management (Ehrenamtliche)

- [ ] **ITEM-01**: Ehrenamtliche können Kleidungsstücke anlegen (Titel, Kategorie, Größe, Zustand, Farbe)
- [ ] **ITEM-02**: Bei Item-Erstellung wird automatisch QR-Code generiert (UUID-Token, druckbar als PNG)
- [ ] **ITEM-03**: Items-Liste mit Filter nach Kategorie, Status, Datum
- [ ] **ITEM-04**: Schnelleingabe-Modus: Defaults vom vorherigen Eintrag übernehmen für Bulk-Erfassung

### QR-Scan & Checkout (Besucher)

- [ ] **SCAN-01**: Besucher scannen QR-Code am Kleidungsstück → Teil wird als "mitgenommen" markiert
- [ ] **SCAN-02**: Beim Scan werden PlietschPunkte gutgeschrieben (kein User↔Item-Link persistent)
- [ ] **SCAN-03**: QR-Scan nutzt react-native-vision-camera (kein Expo-Modul)

### Check-In (Besucher)

- [ ] **CHKIN-01**: QR-Code an der Ladentür scannen + GPS-Radius-Check = Vor-Ort-Nachweis
- [ ] **CHKIN-02**: Nach Check-In: "Wie viele Teile hast du mitgenommen?" (Stepper 1–10) für nicht-digitale Items
- [ ] **CHKIN-03**: Check-In vergibt PlietschPunkte, zusätzliche Punkte pro mitgenommenem Teil
- [ ] **CHKIN-04**: Tür-QR-Code rotiert (HMAC-signiert oder zeitbasiert) gegen Remote-Fälschung

### PlietschPunkte

- [ ] **PUNKT-01**: Punktestand auf dem Homescreen sichtbar
- [ ] **PUNKT-02**: Punkte für Item-Scan und Check-In (konfigurierbare Werte pro Store)
- [ ] **PUNKT-03**: Keine personenbezogene Mitnahme-Historie — nur Punktestand

### Store-Info

- [ ] **STORE-01**: Store-Infoseite (Öffnungszeiten, Adresse, Beschreibung)
- [ ] **STORE-02**: Admin-Dashboard mit aggregierten Statistiken (Besuche heute/Woche, Items mitgenommen)

## v1.x Requirements

Nach Validierung des Kern-Loops (Check-In → Scan → Punkte).

### Kampagnen

- **CAMP-01**: Ehrenamtliche erstellen zeitlich begrenzte Aktionen ("Winterkleidung gesucht — doppelte Punkte")
- **CAMP-02**: Punkt-Multiplikator pro Kampagne konfigurierbar
- **CAMP-03**: Aktive Kampagnen als Banner in der App sichtbar

### Schaufenster

- **SHOW-01**: Ehrenamtliche markieren ausgewählte Items als "Showcase"
- **SHOW-02**: Showcase-Items auf dem Homescreen der Besucher-App angezeigt
- **SHOW-03**: Schaufenster macht Lust vorbeizukommen, ohne Reservierungsoption

### UX

- **UX-01**: Onboarding-Flow für neue Besucher (Konzept erklären, überspringbar)
- **UX-02**: Rollen-Hierarchie: Admin (Store konfigurieren, Kampagnen) vs. Volunteer (Items pflegen)

## v2 Requirements

Erst wenn Single-Tenant stabil und validiert.

### Multi-Tenant

- **MULTI-01**: Andere Tauschläden können eigenen Store anlegen
- **MULTI-02**: Per-Tenant Branding (Store-Name, Farbe)
- **MULTI-03**: PostgreSQL Row-Level Security für Tenant-Isolation
- **MULTI-04**: Tenant-Onboarding-Prozess (manuell durch Plattformbetreiber)

### Erweitert

- **ADV-01**: Achievement-Badges / Level-System für PlietschPunkte
- **ADV-02**: Erweiterte Dashboard-Analytics (Trends, beliebte Kategorien)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Reservierungssystem | Alles vor Ort, Walk-in-First-Prinzip, Fairness zwischen digitalen und nicht-digitalen Besuchern |
| Wer-hat-was-Tracking | Bewusste Privatsphäre-Entscheidung, Chilling Effect für Zielgruppe (Geflüchtete, einkommensschwache Nutzer) |
| Nutzer stellen selbst ein | Nur Verwaltung/Ehrenamtliche pflegen Bestand |
| Leaderboard mit Namen | Sozialer Druck, passt nicht zu inklusivem Community-Store |
| Push-Notifications | Erfordert dauerhaftes Geräte-Permission, zusätzliche Last für Ehrenamtliche |
| User-zu-User-Messaging | Scope Creep, Moderationslast, physische Community ist der Treffpunkt |
| Online-Shop / Versand | Zerstört Kernmodell (kein P2P, keine Logistik) |
| Bewertungen von Kleidung | Spenden bewerten ist kulturell unangemessen |
| Komplexer Punkte-Shop | Einlösung erfordert reale Ressourcen, zu aufwendig für Ehrenamtliche |
| Expo | Zu unübersichtlich, nicht nativ genug |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Pending |
| INFRA-02 | Phase 1 | Pending |
| INFRA-03 | Phase 1 | Pending |
| INFRA-04 | Phase 1 | Pending |
| ITEM-01 | Phase 2 | Pending |
| ITEM-02 | Phase 2 | Pending |
| ITEM-03 | Phase 2 | Pending |
| ITEM-04 | Phase 2 | Pending |
| SCAN-01 | Phase 3 | Pending |
| SCAN-02 | Phase 3 | Pending |
| SCAN-03 | Phase 3 | Pending |
| CHKIN-01 | Phase 3 | Pending |
| CHKIN-02 | Phase 3 | Pending |
| CHKIN-03 | Phase 3 | Pending |
| CHKIN-04 | Phase 3 | Pending |
| PUNKT-01 | Phase 3 | Pending |
| PUNKT-02 | Phase 3 | Pending |
| PUNKT-03 | Phase 3 | Pending |
| STORE-01 | Phase 2 | Pending |
| STORE-02 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0

---
*Requirements defined: 2026-04-08*
*Last updated: 2026-04-08 after initialization*
