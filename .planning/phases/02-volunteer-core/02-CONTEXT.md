# Phase 2: Volunteer Core - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Ehrenamtliche können Kleidungsstücke anlegen (mit automatischer QR-Code-Generierung), Items filtern und suchen, und die Store-Infoseite ist eingerichtet. Backend-APIs + Mobile-Screens für Volunteer-Workflow.

</domain>

<decisions>
## Implementation Decisions

### Item-Formular
- Kategorien: Feste Liste (Oberteil, Hose, Jacke, Schuhe, Kleid, Accessoire) — erweiterbar durch Admin
- Zustand: Admin-konfigurierbare Tags statt fester Stufen (z.B. "kleine Löcher", "kleine Flecken", "einwandfrei") — flexibel pro Store
- Größen: Vordefinierte Presets mit Freitext-Option
  - Erwachsene Kleidung: XS, S, M, L, XL, XXL, 3XL + numerisch 34-48
  - Kindergrößen: 56, 62, 68, 74, 80, 86, 92, 98, 104, 110, 116, 122, 128, 134, 140, 146, 152, 158, 164, 170, 176
  - Schuhgrößen: 18-48
  - Plus Freitext-Eingabe für Sonderfälle
- Farbe: Farbpicker (keine vordefinierten Chips)
- Schnelleingabe: Defaults vom vorherigen Eintrag übernehmen

### QR-Code & Druck
- QR-Code enthält UUID-Token (nicht interne ID)
- Label zeigt: QR-Code + Titel + Größe als lesbaren Text darunter
- Export als PNG-Download (Drucken über Geräte-Dialog)
- Etikett-Format: ca. 5x3cm, 4 pro Reihe auf A4-Seite

### Listen-UX
- Item-Liste: Kompakte Listenansicht (Farbpunkt + Titel + Kategorie + Größe)
- Filter: Chips oben (Kategorie, Status) + Suchfeld
- Sortierung: Neueste zuerst (default)

### Store-Info
- Admin kann Öffnungszeiten, Adresse, Beschreibung bearbeiten
- Store-Info als eigener Screen für Besucher

### Claude's Discretion
- API-Endpunkt-Design (REST Conventions)
- Konkrete UI-Farben und Styling
- Pagination-Strategie für Item-Liste
- Validation-Regeln für Formularfelder

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/src/db/schema.ts` — items-Tabelle existiert (title, category, size, condition, color, status, qr_token)
- `backend/src/middleware/auth.ts` — authenticateToken Middleware
- `backend/src/middleware/requireRole.ts` — Rollen-Guard
- `mobile/src/api/client.ts` — apiClient mit Token-Interceptor
- `mobile/src/navigation/AppNavigator.tsx` — Navigation-Skeleton

### Established Patterns
- Backend: Router → Service → Repository (aus Phase 1 auth-Modul)
- Mobile: Zustand für State Management (authStore)
- API: Express 5, Zod für Validation

### Integration Points
- Neues items-Modul analog zu auth-Modul (router, service, repository, types)
- Neues stores-Modul für Store-Info
- Neue Screens in Navigation einbinden (Tab-basiert nach Login)
- QR-Code-Generierung: Server-seitig via `qrcode` npm Package

</code_context>

<specifics>
## Specific Ideas

- Zustandskategorien sollen vom Admin konfigurierbar sein — nicht hardcoded
- Kindergrößen und Schuhgrößen explizit als Presets
- QR-Label muss in der Praxis funktionieren (Etikett-Format, nicht A4)

</specifics>

<deferred>
## Deferred Ideas

- Foto-Upload für Items (könnte in v1.x kommen)
- Batch-QR-Druck (mehrere Labels auf einer Seite)
- Item-Bearbeitung nach Erstellung (erstmal nur Anlegen)

</deferred>
