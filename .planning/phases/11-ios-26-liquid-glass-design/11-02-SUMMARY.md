---
phase: 11-ios-26-liquid-glass-design
plan: "02"
subsystem: navigation
tags: [glassmorphism, tab-bar, header, blur, ios26, liquid-glass]
dependency_graph:
  requires: [11-01]
  provides: [glass-tab-bar, glass-header]
  affects: [mobile/src/navigation/AppNavigator.tsx]
tech_stack:
  added: []
  patterns: [tabBarBackground, headerBackground, BlurView, LinearGradient]
key_files:
  created: []
  modified:
    - mobile/src/navigation/AppNavigator.tsx
decisions:
  - "GlassHeader als eigene Hilfsfunktion extrahiert statt inline-Render-Props -- vermeidet Code-Duplikation ueber drei Navigatoren"
  - "StyleSheet.absoluteFill statt absoluteFillObject -- korrekte API fuer diese React Native Version"
  - "blurType chromeMaterial: performanteste iOS-Material-Option, gutes frosted-glass Aussehen"
metrics:
  duration: "15min"
  completed: "2026-04-09T07:43:05Z"
  tasks_completed: 2
  files_modified: 1
---

# Phase 11 Plan 02: Glass Tab-Bar und Header Summary

**One-liner:** Floating Tab-Bar (BlurView + chromeMaterial) und transluzenter Gradient-Header in allen drei Tab-Navigatoren via GlassHeader-Hilfsfunktion.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Tab-Bar auf Glassmorphism umstellen | d84da90 | AppNavigator.tsx |
| 2 | Navigation-Header transluzent mit Gradient-Tint | 92a3e4a | AppNavigator.tsx |

## What Was Built

### Task 1: Floating Glass Tab-Bar

Alle drei Tab-Navigatoren (AdminTabs, VolunteerTabs, VisitorTabs) erhalten jetzt:

- **iOS:** Tab-Bar floating mit `position: 'absolute'`, `bottom: 20`, `left/right: 20`, `borderRadius: 999` (full), `backgroundColor: 'transparent'`
- **`tabBarBackground`:** BlurView mit `blurType: 'chromeMaterial'`, `blurAmount: 20`, abgerundete Ecken
- **Android-Fallback:** `backgroundColor: rgba(255,255,255,0.82)`, kein Blur

AdminTabs und VolunteerTabs nutzen das gemeinsame `tabScreenOptions`-Objekt. VisitorTabs hat ein eigenes inline-`screenOptions`-Objekt -- beide wurden identisch aktualisiert.

### Task 2: Transluzenter Glass-Header

Eine `GlassHeader`-Hilfsfunktion wurde eingeführt, die wiederverwendet wird in:

- `tabScreenOptions` (AdminTabs + VolunteerTabs)
- VisitorTabs inline-screenOptions
- AuthenticatedStack (fuer Stack-Screens wie Settings, Privacy etc.)

GlassHeader-Aufbau:
1. BlurView (`chromeMaterial`, 20) als absolutes Fill -- nur auf iOS
2. LinearGradient (`rgba(39,176,146,0.75)` → `rgba(128,180,226,0.65)`) ueber den Blur -- horizontal, sichtbar auf iOS und Android

`headerTransparent: true` + `headerStyle: { backgroundColor: 'transparent' }` sorgt dafuer, dass der native Header keine opake Flaeche malt.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] StyleSheet.absoluteFillObject existiert nicht in dieser RN-Version**
- **Found during:** Task 1 TypeScript-Check
- **Issue:** `error TS2551: Property 'absoluteFillObject' does not exist on type 'typeof StyleSheet'. Did you mean 'absoluteFill'?`
- **Fix:** Alle Vorkommen von `StyleSheet.absoluteFillObject` durch `StyleSheet.absoluteFill` ersetzt (2 Stellen in tabBarBackground)
- **Files modified:** mobile/src/navigation/AppNavigator.tsx
- **Commit:** d84da90 (integriert)

**2. [Rule 2 - Refactor] GlassHeader als Hilfsfunktion statt dreifacher inline-Render-Prop**
- **Found during:** Task 2 Implementierung
- **Entscheidung:** Plan sah identischen JSX-Block dreimal vor. Stattdessen `GlassHeader`-Funktion definiert und per `() => <GlassHeader />` referenziert -- sauberer, wartbarer, kein echter Plan-Widerspruch

## Known Stubs

Keine. Alle Aenderungen sind vollstaendig verdrahtet.

## Threat Flags

Keine neuen Threat-relevanten Surfaces eingefuehrt. BlurView-Performance-Mitigation (T-11-04) umgesetzt: `blurAmount: 20` bleibt im moderaten Bereich, `chromeMaterial` ist die performanteste iOS-Material-Option.

## Self-Check: PASSED

- [x] `mobile/src/navigation/AppNavigator.tsx` existiert und enthaelt BlurView + GlassHeader
- [x] Commit d84da90 vorhanden (Task 1)
- [x] Commit 92a3e4a vorhanden (Task 2)
- [x] `npx tsc --noEmit` ohne Fehler
