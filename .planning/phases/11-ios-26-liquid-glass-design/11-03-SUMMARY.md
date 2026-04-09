---
phase: 11-ios-26-liquid-glass-design
plan: "03"
subsystem: mobile-screens
tags: [glassmorphism, glass-card, screens, react-native, linear-gradient]
dependency_graph:
  requires: [11-01]
  provides: [glass-screens]
  affects: [HomeScreen, LoginScreen, BadgeOverviewScreen, DashboardScreen]
tech_stack:
  added: []
  patterns: [GlassCard-Component, StyleProp-Array, LinearGradient-Background]
key_files:
  created: []
  modified:
    - mobile/src/screens/visitor/HomeScreen.tsx
    - mobile/src/screens/auth/LoginScreen.tsx
    - mobile/src/screens/visitor/BadgeOverviewScreen.tsx
    - mobile/src/screens/admin/DashboardScreen.tsx
    - mobile/src/components/GlassCard.tsx
decisions:
  - GlassCard style-Prop auf StyleProp<ViewStyle> erweitert fuer Array-Support
  - accentColor+'40' fuer farbige StatCard-Umrandung ohne opaken Hintergrund
  - Gradient-Hintergrund in gedaempften App-Farben (#e8f7f4, #edf5f9, #f0f4f9)
metrics:
  duration: "~15min"
  completed: "2026-04-09T07:51:03Z"
  tasks_completed: 3
  files_modified: 5
---

# Phase 11 Plan 03: Screen Cards auf Glassmorphism Summary

**One-liner:** Vier Screens mit GlassCard statt opaken weissen Cards, gedaempfter Gradient-Hintergrund fuer sichtbaren Blur-Effekt.

## Tasks

| # | Name | Commit | Status |
|---|------|--------|--------|
| 1 | HomeScreen + LoginScreen auf Glass | df310c9 | done |
| 2 | BadgeOverview + Dashboard auf Glass | df2b467 | done |
| 3 | LinearGradient-Hintergrund ergaenzen | 03f86b2 | done |

## What Was Built

**HomeScreen:**
- `showcaseCard` (horizontale Scroll-Cards) -> `GlassCard` mit `radius={12}`
- `welcomeSection` (Willkommens-Box) -> `GlassCard`
- `badgesButton` (Badges-Link) -> in `GlassCard` gewrapped, TouchableOpacity innen
- `LinearGradient`-Wrapper ersetzt den weissen `ScrollView`-Hintergrund
- `pointsCard` (Gradient Points-Card) bleibt unveraendert

**LoginScreen:**
- `form`-View -> `GlassCard` mit `marginTop: -20` fuer Overlap-Effekt auf dem Gradient-Header
- Input-`backgroundColor` von `colors.surface` (weiss) auf `rgba(255,255,255,0.6)` fuer Glass-Kontext
- Gradient-Header und Gradient-Login-Button bleiben unveraendert

**BadgeOverviewScreen:**
- `badgeCard` -> `GlassCard` mit `radius={12}`
- Tier-Farbe (bronze/silber/gold) als `borderColor`-Override fuer completed Badges
- LinearGradient-Hintergrund in gedaempften Mint-Blau-Toenen

**DashboardScreen:**
- `StatCard`-Funktion: `View` -> `GlassCard` mit `accentColor+'40'` als farbige Umrandung
- Jede StatCard behaelt farbige Kategorisierung (blau/gruen/orange/lila) via Umrandung
- LinearGradient-Hintergrund identisch zu anderen Screens

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] GlassCard style-Prop TypeScript-Fehler**
- **Found during:** Task 2 (TypeScript-Check)
- **Issue:** `GlassCard.style` war als `ViewStyle` typisiert, aber BadgeOverviewScreen und DashboardScreen uebergeben Arrays (`[styles.card, { borderColor: ... }]`). TypeScript meldet Inkompatibilitaet.
- **Fix:** `style`-Prop in `GlassCardProps` von `ViewStyle` auf `StyleProp<ViewStyle>` geaendert. Intern wird `containerStyle` als Array aufgebaut statt als einzelnes Objekt.
- **Files modified:** `mobile/src/components/GlassCard.tsx`
- **Commit:** df2b467

## Known Stubs

Keine. Alle Glass-Surfaces sind vollstaendig implementiert und mit echten Daten verbunden.

## Threat Flags

Keine neuen Sicherheits-relevanten Surfaces eingefuehrt. Rein visuelle Aenderungen gemaess T-11-06 (accept).

## Self-Check

- [x] `mobile/src/screens/visitor/HomeScreen.tsx` existiert und enthaelt `GlassCard`
- [x] `mobile/src/screens/auth/LoginScreen.tsx` existiert und enthaelt `GlassCard`
- [x] `mobile/src/screens/visitor/BadgeOverviewScreen.tsx` existiert und enthaelt `GlassCard`
- [x] `mobile/src/screens/admin/DashboardScreen.tsx` existiert und enthaelt `GlassCard`
- [x] Commit df310c9 vorhanden
- [x] Commit df2b467 vorhanden
- [x] Commit 03f86b2 vorhanden
- [x] TypeScript: EXIT:0

## Self-Check: PASSED
