# Phase 4: Dashboard & Polish - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin-Dashboard mit aggregierten Statistiken (Datepicker für Zeitraum), UX-Feinschliff (Error-Handling, Loading States), DSGVO-Konformität (Datenschutzerklärung, GPS-Handling), Launch-Readiness.

</domain>

<decisions>
## Implementation Decisions

### Dashboard-Metriken
- Stat-Cards in 2er-Grid (Zahl groß, Label klein)
- Metriken: Besuche, Items mitgenommen, gebrachte/neue Items, aktive Items gesamt
- Zeiträume: heute, diese Woche, dieser Monat, dieses Jahr — wählbar über Datepicker
- Aggregiert, kein Personen-Tracking

### Dashboard-UX
- Datepicker für Zeitraum-Auswahl (nicht feste Zeiträume)
- Stat-Cards Layout, keine Tabelle, keine Charts (v1)

### DSGVO
- Datenschutzerklärung als In-App Screen (erreichbar über Einstellungen/Store-Info)
- GPS-Zweck explizit nennen: "Verifizierung der Vor-Ort-Anwesenheit"
- GPS-Koordinaten: nur serverseitig validieren, nie persistieren (bereits in Phase 3 umgesetzt)

### UX-Polish
- Error-Handling: Inline-Fehlerhinweis + Retry-Button pro Screen
- Loading States: Spinner (konsistent in der ganzen App)
- Offline-Zustand: Hinweis "Keine Internetverbindung" mit Retry

### Claude's Discretion
- Datepicker-Komponente (react-native-date-picker oder custom)
- Konkrete Stat-Card-Farben
- Datenschutzerklärungs-Text (Standard-DSGVO für Community-App mit GPS)
- Wo genau der Datenschutz-Link platziert wird

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/src/modules/points/` — Points-Modul mit Transaktions-Queries
- `backend/src/modules/checkin/` — Check-In mit Haversine (GPS bereits korrekt)
- `mobile/src/screens/visitor/HomeScreen.tsx` — Punktestand-Anzeige Pattern
- `mobile/src/store/` — Zustand Store Pattern
- `mobile/src/api/` — API Client Pattern

### Integration Points
- Neues dashboard-Modul im Backend (aggregierte Queries)
- DashboardScreen in Admin/Volunteer Navigation
- Datenschutz-Screen in Navigation
- Error-Handling als Wrapper/Hook für alle API-Calls

</code_context>

<specifics>
## Specific Ideas

- "Gebrachte Items" als eigene Metrik (wie viele Items wurden insgesamt angelegt)
- Zeitraum-Auswahl mit Datepicker — nicht nur feste Perioden
- Monatlich und jährlich als Standardoptionen

</specifics>

<deferred>
## Deferred Ideas

- Charts/Grafiken für Trends (v1.x)
- Export als CSV/PDF (v1.x)
- Vergleich zwischen Zeiträumen (v1.x)

</deferred>
