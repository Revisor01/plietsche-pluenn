---
phase: 05-ui-styling
plan: 02
subsystem: mobile/screens
tags: [styling, theme, work-sans, linear-gradient, react-native]
dependency_graph:
  requires: [mobile/src/theme/index.ts, react-native-linear-gradient]
  provides: [gestyled-volunteer-admin-screens, gestyled-register-screen, gestyled-privacy-screen]
  affects: [mobile/src/screens/items/, mobile/src/screens/admin/, mobile/src/screens/store/, mobile/src/screens/auth/RegisterScreen.tsx, mobile/src/screens/legal/PrivacyScreen.tsx]
tech_stack:
  added: []
  patterns: [LinearGradient-Header, LinearGradient-Button, Theme-Chips, Work-Sans-fontFamily]
key_files:
  created: []
  modified:
    - mobile/src/screens/items/ItemCreateScreen.tsx
    - mobile/src/screens/items/ItemListScreen.tsx
    - mobile/src/screens/admin/DashboardScreen.tsx
    - mobile/src/screens/store/StoreInfoScreen.tsx
    - mobile/src/screens/auth/RegisterScreen.tsx
    - mobile/src/screens/legal/PrivacyScreen.tsx
decisions:
  - "StatCard accentColor/bgColor in DashboardScreen bleiben hardcodiert — semantische Tint-Farben pro Kategorie-Karte sind bewusste Design-Entscheidungen, kein globals Primary"
  - "RegisterScreen komplett auf LoginScreen-Pattern umgestellt: Gradient-Header + Gradient-Button statt einfacher View mit #2d6a4f"
  - "StoreInfoScreen Header: LinearGradient diagonal (0,0 → 1,1) statt solid #2563EB"
metrics:
  duration_minutes: 20
  completed_date: "2026-04-08T19:39:40Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 6
requirements_fulfilled: [STYLE-01, STYLE-02, STYLE-04]
---

# Phase 05 Plan 02: Volunteer/Admin-Screens Theme-Umstellung Summary

**One-liner:** Work Sans und theme-Gradient auf allen verbleibenden Screens — ItemCreate, ItemList, Dashboard, StoreInfo, Register, Privacy vollständig auf mobile/src/theme/index.ts umgestellt.

## Was wurde umgestellt

### Task 1: ItemCreateScreen und ItemListScreen (Commit `0945b31`)

**ItemCreateScreen.tsx:**
- `import { colors, fonts, spacing, borderRadius } from '../../theme'` + `LinearGradient`
- Submit-Button: `backgroundColor: '#2563EB'` → LinearGradient-Button (horizontal, gradientColors)
- Chips: `#2563EB` → `colors.primary`
- Alle Texte: `fontFamily: fonts.regular/semiBold/medium/bold`
- Placeholder-Farbe: `'#9CA3AF'` → `colors.textLight`

**ItemListScreen.tsx:**
- Theme-Import hinzugefügt
- Chips: `#2563EB` → `colors.primary`
- RefreshControl: `tintColor={colors.primary}`
- ActivityIndicator: `color={colors.primary}`
- Alle Texte: Work Sans fontFamily
- Placeholder: `colors.textLight`

### Task 2: Dashboard, StoreInfo, Register, Privacy (Commit `893a701`)

**DashboardScreen.tsx:**
- Segment-Control aktiv: `#2563EB` → `colors.primary`
- Retry-Button: `#2563EB` → `colors.primary`
- ActivityIndicator: `color={colors.primary}`
- Alle Texte: Work Sans fontFamily
- StatCard bgColor/accentColor: Absichtlich hardcodiert belassen (semantische Kategorie-Farben)

**StoreInfoScreen.tsx:**
- Header: `backgroundColor: '#2563EB'` → `<LinearGradient>` mit `gradientColors` diagonal (0,0 → 1,1)
- Alle Texte: Work Sans fontFamily
- Sections: theme-Spacing und borderRadius

**RegisterScreen.tsx:**
- Vollständig auf LoginScreen-Pattern umgebaut
- Gradient-Header mit Titel + Subtitle (ohne Logo-Block)
- Gradient-Button (horizontal) statt `backgroundColor: '#2d6a4f'`
- Inputs: identisch zu LoginScreen (colors.surface, borderColor, fonts.regular)
- linkText: `color: '#2d6a4f'` → `colors.primary`

**PrivacyScreen.tsx:**
- Work Sans auf allen drei Text-Styles (mainTitle, sectionTitle, bodyText)
- `colors.surface` als Container-Hintergrund
- `colors.textSecondary` für bodyText

## Deviations from Plan

### Plan-konforme Ausnahme: DashboardScreen StatCard-Farben

Der Verifikations-Grep `grep -r "2563EB" mobile/src/screens/admin/` findet einen Treffer in `accentColor="#2563EB"` der BESUCHE-StatCard. Dies ist laut Plan-Beschreibung explizit erlaubt: "StatCard-Farben bleiben als hardcodierte Werte — semantische Tint-Farben für Kategorie-Karten sind bewusste Design-Entscheidungen." Der Segment-Control und Retry-Button (die globale Primärfarbe verwenden) sind korrekt auf `colors.primary` umgestellt.

## TypeScript-Status

`cd mobile && npx tsc --noEmit` — EXIT:0, keine Fehler nach beiden Tasks.

## Gesamtstatus Phase 05

Plan 01 (Navigation + Visitor-Screens + Tab-Bar) und Plan 02 (Volunteer/Admin + Register + Privacy) abgeschlossen. Alle Screens der App verwenden jetzt durchgängig Work Sans und theme-Farben aus `mobile/src/theme/index.ts`. Kein hardcodiertes `#2563EB` in Items/Auth/Register, kein `#2d6a4f` mehr.

## Known Stubs

Keine. Alle Styles sind vollständig auf theme-Variablen umgestellt.

## Self-Check: PASSED

- `mobile/src/screens/items/ItemCreateScreen.tsx` — vorhanden, commit `0945b31` verifiziert
- `mobile/src/screens/items/ItemListScreen.tsx` — vorhanden, commit `0945b31` verifiziert
- `mobile/src/screens/admin/DashboardScreen.tsx` — vorhanden, commit `893a701` verifiziert
- `mobile/src/screens/store/StoreInfoScreen.tsx` — vorhanden, commit `893a701` verifiziert
- `mobile/src/screens/auth/RegisterScreen.tsx` — vorhanden, commit `893a701` verifiziert
- `mobile/src/screens/legal/PrivacyScreen.tsx` — vorhanden, commit `893a701` verifiziert
