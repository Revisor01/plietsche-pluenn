# Phase 5: UI-Styling - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning
**Mode:** Auto-generated (visual consistency phase — locked decisions from PROJECT.md)

<domain>
## Phase Boundary

Durchgängiges visuelles Theme auf allen Screens — Work Sans Schriftart, Gradient (#27b092→#79c4b0 51%→#80b4e2), gestylter Tab-Bar und Navigation-Header. Login und Home sind bereits teilweise gestyled.

</domain>

<decisions>
## Implementation Decisions

### Theme (locked from PROJECT.md + user conversation)
- Schriftart: Work Sans (Regular, Medium, SemiBold, Bold) — bereits installiert und gelinkt
- Gradient: #27b092 → #79c4b0 (51%) → #80b4e2 — bereits in theme/index.ts definiert
- react-native-linear-gradient bereits installiert
- Theme-Datei: mobile/src/theme/index.ts (colors, fonts, spacing, borderRadius)
- P² Logo-Platzhalter auf Login (echtes Logo kommt später)

### Bereits gestyled (Login + Home)
- LoginScreen.tsx: Gradient-Header, Gradient-Button, Work Sans
- HomeScreen.tsx: Gradient Punkte-Card, Work Sans

### Noch zu stylen
- Tab-Bar (BottomTabs) mit Theme-Farben
- Navigation-Header mit Gradient oder Theme-Farben
- ScanScreen, CheckInScreen, PointsHistoryScreen
- ItemCreateScreen, ItemListScreen
- DashboardScreen
- StoreInfoScreen
- RegisterScreen
- PrivacyScreen

### Claude's Discretion
- Konkrete Farben für Tab-Bar aktiv/inaktiv Icons
- Ob Navigation-Header Gradient oder solid primary color
- Card-Schatten und Elevation-Werte
- Spacing-Feinheiten pro Screen

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `mobile/src/theme/index.ts` — colors, fonts, spacing, borderRadius
- `mobile/src/screens/auth/LoginScreen.tsx` — bereits gestyled (Referenz-Pattern)
- `mobile/src/screens/visitor/HomeScreen.tsx` — bereits gestyled (Referenz-Pattern)
- react-native-linear-gradient installiert
- Work Sans Fonts installiert und gelinkt

### Integration Points
- AppNavigator.tsx — Tab-Bar und Header Styling
- Alle Screen-Dateien in mobile/src/screens/

</code_context>

<specifics>
## Specific Ideas

Kein spezifisches Design-System — einfach konsistent mit dem was auf Login und Home schon steht.

</specifics>

<deferred>
## Deferred Ideas

- Dark Mode (v2+)
- Animationen/Micro-Interactions (v2+)
- Echtes P² Logo (kommt wenn User es liefert)

</deferred>
