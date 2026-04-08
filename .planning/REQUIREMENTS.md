# Requirements: Plietsche Pluenn

**Defined:** 2026-04-09
**Core Value:** Besucher haben einen Anreiz, regelmaessig in den Tausch-Laden zu kommen -- ohne Personen-Tracking.

## v1.2 Requirements

### Achievement-System

- [ ] **ACH-01**: Badge-Definitionen mit Trigger-Typ (items_brought, items_taken, visits, streak, milestone), Zielwert und Stufe (bronze/silber/gold)
- [ ] **ACH-02**: Bringer-Badges: 10/25/50/100 Items gebracht (insgesamt)
- [ ] **ACH-03**: Holer-Badges: 10/25/50/100 Items geholt (insgesamt)
- [ ] **ACH-04**: Besucher-Badges: 5/10/25/50 Check-Ins
- [ ] **ACH-05**: Streak-Badges: 2/4/8/12 Wochen in Folge besucht
- [ ] **ACH-06**: Saison-Badges: Items gebracht/geholt pro Saison (Fruehling/Sommer/Herbst/Winter)
- [ ] **ACH-07**: Meilenstein-Badges: "Erster Besuch", "Erstes Teil gebracht", "100. Teil insgesamt"
- [ ] **ACH-08**: Fortschrittsanzeige pro Badge: "72 von 100 geholt"
- [ ] **ACH-09**: Badge-Uebersichtsseite fuer Besucher (alle Badges, erreichte hervorgehoben, ausstehende mit Fortschritt)
- [ ] **ACH-10**: Admin kann eigene Badges erstellen/bearbeiten/loeschen mit Trigger-Bedingungen
- [ ] **ACH-11**: Streak-Tracking: Backend trackt woechentliche Besuche und berechnet aktuelle Streak-Laenge
- [ ] **ACH-12**: Badge-Benachrichtigung wenn neuer Badge freigeschaltet wird (In-App Toast)

### Icon-Cleanup

- [ ] **ICON-01**: Font Awesome Line-Icons (react-native-vector-icons) installieren und als Icon-System nutzen
- [ ] **ICON-02**: Alle Emojis in der gesamten App durch Font Awesome Icons ersetzen
- [ ] **ICON-03**: Tab-Bar Icons durch Font Awesome Icons ersetzen
- [ ] **ICON-04**: Badge-Icons als Font Awesome Icons (z.B. fa-trophy, fa-star, fa-fire fuer Streaks)

### Push-Benachrichtigungen

- [ ] **PUSH-01**: Push-Notification Infrastruktur (Firebase Cloud Messaging / APNs)
- [ ] **PUSH-02**: Device-Token bei Login registrieren, bei Logout entfernen
- [ ] **PUSH-03**: Push bei neuer Kampagne ("Neue Aktion: [Titel]!")
- [ ] **PUSH-04**: Push-Erinnerung wenn Streak fast abbricht ("Deine Serie bricht bald ab -- komm vorbei!")
- [ ] **PUSH-05**: Push bei neuem Schaufenster-Stueck ("Neues Highlight im Laden!")
- [ ] **PUSH-06**: Admin kann manuelle Push an alle Besucher senden
- [ ] **PUSH-07**: Besucher kann Push-Benachrichtigungen in Einstellungen deaktivieren

## Out of Scope

| Feature | Reason |
|---------|--------|
| Emojis | Nie. Font Awesome stattdessen. |
| Multi-Tenant | Nur unser Store |
| Reservierungssystem | Alles vor Ort |
| Personen-Tracking | Privatsphaere |
| In-App Chat | Kein Social Feature |
| Badge-Sharing Social Media | Zu komplex fuer v1.2 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ACH-01 | TBD | Pending |
| ACH-02 | TBD | Pending |
| ACH-03 | TBD | Pending |
| ACH-04 | TBD | Pending |
| ACH-05 | TBD | Pending |
| ACH-06 | TBD | Pending |
| ACH-07 | TBD | Pending |
| ACH-08 | TBD | Pending |
| ACH-09 | TBD | Pending |
| ACH-10 | TBD | Pending |
| ACH-11 | TBD | Pending |
| ACH-12 | TBD | Pending |
| ICON-01 | TBD | Pending |
| ICON-02 | TBD | Pending |
| ICON-03 | TBD | Pending |
| ICON-04 | TBD | Pending |
| PUSH-01 | TBD | Pending |
| PUSH-02 | TBD | Pending |
| PUSH-03 | TBD | Pending |
| PUSH-04 | TBD | Pending |
| PUSH-05 | TBD | Pending |
| PUSH-06 | TBD | Pending |
| PUSH-07 | TBD | Pending |

**Coverage:**
- v1.2 requirements: 23 total
- Mapped to phases: 0
- Unmapped: 23

---
*Requirements defined: 2026-04-09*
