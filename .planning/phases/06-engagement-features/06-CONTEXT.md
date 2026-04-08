# Phase 6: Engagement Features - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Drei Engagement-Säulen: Kampagnen (zeitlich begrenzte Punkt-Multiplikatoren), Schaufenster (ausgewählte Items als Appetitmacher), und Badges (Achievement-Level basierend auf Punktestand).

</domain>

<decisions>
## Implementation Decisions

### Kampagnen/Aktionen
- Admin erstellt Kampagne: Titel, Beschreibung, Start-/Enddatum, Multiplikator (z.B. 2x, 3x)
- Multiplikator gilt für alle Punkte-Quellen (Check-In, Item-Scan, manuelle Teile) während des Zeitraums
- Aktive Kampagnen als Banner oben in der Visitor-App (Homescreen)
- Punkte-Engine prüft automatisch ob eine aktive Kampagne existiert und multipliziert
- Kampagnen-Tabelle: id, store_id, title, description, multiplier, starts_at, ends_at, created_at
- CRUD: POST/GET/PATCH/DELETE /api/campaigns (nur Admin)

### Schaufenster
- Ehrenamtliche markieren Items als "showcase" (Boolean-Flag auf Item)
- Showcase-Items erscheinen als eigene Sektion auf dem Visitor-Homescreen
- Kein Reservieren — nur "schau mal was da ist"
- Einfache Karten mit Titel, Kategorie, Größe, Farbe
- Max ~6 Showcase-Items anzeigen (älteste zuerst raus wenn mehr)

### Badges/Achievements
- Level-Definitionen basierend auf Punktestand (Schwellenwerte)
- Defaults: "Neuling" (0), "Entdecker" (25), "Stammgast" (50), "Plietsch-Kenner" (100), "Plietsch-Profi" (200)
- Admin-konfigurierbar (Name + Punkte-Schwelle)
- Aktuelles Badge + Fortschrittsbalken zum nächsten Level auf Homescreen
- badge_levels Tabelle: id, store_id, name, min_points, sort_order

### Claude's Discretion
- Kampagnen-Banner Design (Farben, Layout)
- Showcase-Karten Design
- Badge-Icon/Emoji neben dem Level-Namen
- Fortschrittsbalken-Stil
- API-Endpunkt-Design Details

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- backend/src/modules/points/ — Punkte-Engine (hier Multiplikator-Logik einbauen)
- backend/src/modules/items/ — Items-Modul (showcase Flag hinzufügen)
- backend/src/db/schema.ts — Schema erweitern
- mobile/src/screens/visitor/HomeScreen.tsx — Homescreen erweitern (Showcase + Badge)
- mobile/src/theme/index.ts — Theme für konsistentes Styling

### Integration Points
- Neues campaigns-Modul im Backend
- Neues badges-Modul im Backend (oder in points integrieren)
- items Schema: showcase Boolean hinzufügen
- Punkte-Engine: Kampagnen-Multiplikator einbauen
- HomeScreen: Showcase-Sektion + Badge-Anzeige
- Neue Admin-Screens: CampaignCreate, CampaignList

</code_context>

<specifics>
## Specific Ideas

Keine zusätzlichen — Requirements sind klar definiert.

</specifics>

<deferred>
## Deferred Ideas

- Kampagnen-Benachrichtigungen (Push — explizit out of scope)
- Kampagnen für bestimmte Kategorien (z.B. nur Winterkleidung)
- Badge-Sharing auf Social Media

</deferred>
