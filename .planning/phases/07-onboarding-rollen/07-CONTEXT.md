# Phase 7: Onboarding & Rollen - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Onboarding-Flow für neue Besucher (3-4 Screens, überspringbar, einmalig) und saubere Rollen-Trennung zwischen Admin und Volunteer mit Volunteer-Verwaltung durch Admin.

</domain>

<decisions>
## Implementation Decisions

### Onboarding
- 3-4 Screens beim ersten App-Start (nach Login/Register)
- Erklärt: Was ist Plietsche Plünn, QR scannen, Punkte sammeln, vorbeikommen
- Überspringbar (Skip-Button)
- Nur einmal anzeigen (AsyncStorage Flag "onboarding_completed")
- Einfache horizontale Swipe-Screens, kein komplexes Framework

### Rollen-Trennung
- Admin: Dashboard, Store-Konfiguration, Kampagnen, Badges, Punkte-Einstellungen, Volunteer-Verwaltung
- Volunteer: Items anlegen/verwalten, QR-Codes drucken, Item-Liste — KEIN Dashboard, KEINE Store-Config
- Admin kann Volunteer-Accounts erstellen (POST /api/admin/users mit role=volunteer)
- Admin kann Volunteer-Liste sehen und Accounts deaktivieren

### Claude's Discretion
- Onboarding-Screen-Illustrationen (Text + Farben erstmal, Bilder später)
- Onboarding-Animation (einfacher Swipe reicht)
- Volunteer-Verwaltungs-UI Design
- Wo genau die Volunteer-Verwaltung in der Navigation sitzt

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- mobile/src/navigation/AppNavigator.tsx — VolunteerTabs vs VisitorTabs Logik existiert
- backend/src/modules/auth/ — Register-Logik existiert, kann für Admin-User-Erstellung erweitert werden
- backend/src/middleware/requireRole.ts — Rollen-Guard existiert
- mobile/src/theme/index.ts — Theme für konsistentes Styling

### Integration Points
- AppNavigator: Onboarding vor Auth-Tabs einbauen
- VolunteerTabs: Dashboard-Tab nur für Admin sichtbar
- Backend: neuer /api/admin/users Endpunkt
- Neuer Screen: VolunteerManagementScreen in Admin-Navigation

</code_context>

<specifics>
## Specific Ideas

Keine zusätzlichen.

</specifics>

<deferred>
## Deferred Ideas

- Onboarding-Illustrationen/Bilder (wenn Designer verfügbar)
- Volunteer Einladung per Link/QR
- Passwort-Reset durch Admin

</deferred>
