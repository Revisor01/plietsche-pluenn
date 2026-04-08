# Requirements: Plietsche Plünn

**Defined:** 2026-04-08
**Core Value:** Besucher haben einen Anreiz, regelmäßig in den Tausch-Laden zu kommen, und Ehrenamtliche sehen, was passiert — ohne Personen-Tracking.

## v1.1 Requirements

### Kampagnen/Aktionen

- [ ] **CAMP-01**: Admin kann zeitlich begrenzte Kampagne erstellen (Titel, Beschreibung, Start/Ende)
- [ ] **CAMP-02**: Kampagne hat konfigurierbaren Punkt-Multiplikator (z.B. 2x für Check-In, 3x für Item-Scan)
- [ ] **CAMP-03**: Aktive Kampagnen werden als Banner in der Visitor-App angezeigt
- [ ] **CAMP-04**: Punkte-Engine berücksichtigt aktive Kampagnen-Multiplikatoren automatisch

### Schaufenster

- [ ] **SHOW-01**: Ehrenamtliche können Items als "Showcase" markieren
- [ ] **SHOW-02**: Showcase-Items werden prominent auf dem Visitor-Homescreen angezeigt
- [ ] **SHOW-03**: Schaufenster macht Lust vorbeizukommen — kein Reservieren, nur Appetit machen

### Onboarding

- [ ] **ONBO-01**: Neue Besucher sehen beim ersten App-Start einen Onboarding-Flow (3-4 Screens)
- [ ] **ONBO-02**: Onboarding erklärt Konzept: Laden besuchen, QR scannen, Punkte sammeln
- [ ] **ONBO-03**: Onboarding ist überspringbar und wird nur einmal angezeigt

### Rollen

- [ ] **ROLE-01**: Admin kann Store konfigurieren, Kampagnen erstellen, Punkte-Werte ändern, Dashboard sehen
- [ ] **ROLE-02**: Volunteer kann Items anlegen/verwalten, QR-Codes drucken, Item-Liste sehen
- [ ] **ROLE-03**: Volunteer sieht KEIN Dashboard und KEINE Store-Konfiguration
- [ ] **ROLE-04**: Admin kann Volunteer-Accounts anlegen/verwalten

### UI-Styling

- [ ] **STYLE-01**: Work Sans Schriftart durchgängig auf allen Screens
- [ ] **STYLE-02**: Gradient-Theme (#27b092 → #79c4b0 → #80b4e2) auf Header, Buttons, Cards
- [ ] **STYLE-03**: Tab-Bar und Navigation-Header im Theme gestyled
- [ ] **STYLE-04**: Alle Screens konsistent (Login, Home, Scan, CheckIn, Items, Dashboard, Store-Info, Punkte)
- [ ] **STYLE-05**: P² Logo-Platzhalter auf Login-Screen (echtes Logo kommt später)

### Badges/Achievements

- [ ] **BADGE-01**: Definierbare Achievement-Level basierend auf Punktestand (z.B. "Neuling" ab 0, "Stammgast" ab 50, "Plietsch-Profi" ab 200)
- [ ] **BADGE-02**: Aktuelles Badge/Level wird auf dem Homescreen neben dem Punktestand angezeigt
- [ ] **BADGE-03**: Badge-Stufen sind admin-konfigurierbar (Name + Punkte-Schwelle)
- [ ] **BADGE-04**: Besucher sieht Fortschritt zum nächsten Level (Fortschrittsbalken)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-Tenant | Nur für unseren Store, kein Bedarf |
| Reservierungssystem | Alles vor Ort |
| Personen-Tracking | Bewusste Privatsphäre-Entscheidung |
| Push-Notifications | Zu aufwendig für v1.1, Kampagnen-Banner reicht |
| Charts im Dashboard | v1.x+, erstmal Zahlen reichen |
| Punkte einlösen / Belohnungs-Shop | Punkte als Anerkennung, kein Shop |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CAMP-01 | TBD | Pending |
| CAMP-02 | TBD | Pending |
| CAMP-03 | TBD | Pending |
| CAMP-04 | TBD | Pending |
| SHOW-01 | TBD | Pending |
| SHOW-02 | TBD | Pending |
| SHOW-03 | TBD | Pending |
| ONBO-01 | TBD | Pending |
| ONBO-02 | TBD | Pending |
| ONBO-03 | TBD | Pending |
| ROLE-01 | TBD | Pending |
| ROLE-02 | TBD | Pending |
| ROLE-03 | TBD | Pending |
| ROLE-04 | TBD | Pending |
| STYLE-01 | TBD | Pending |
| STYLE-02 | TBD | Pending |
| STYLE-03 | TBD | Pending |
| STYLE-04 | TBD | Pending |
| STYLE-05 | TBD | Pending |
| BADGE-01 | TBD | Pending |
| BADGE-02 | TBD | Pending |
| BADGE-03 | TBD | Pending |
| BADGE-04 | TBD | Pending |

**Coverage:**
- v1.1 requirements: 23 total
- Mapped to phases: 0
- Unmapped: 23

---
*Requirements defined: 2026-04-08*
*Last updated: 2026-04-08 after v1.1 milestone definition*
