---
phase: 08-icon-cleanup
plan: 01
subsystem: mobile/navigation
tags: [icons, tab-bar, react-native-vector-icons, fontawesome5, ios]
dependency_graph:
  requires: []
  provides: [tab-bar-icons, vector-icons-library]
  affects: [mobile/src/navigation/AppNavigator.tsx]
tech_stack:
  added: [react-native-vector-icons@10.3.0, "@types/react-native-vector-icons"]
  patterns: [tabBarIcon-prop, FontAwesome5-solid-focused]
key_files:
  created: []
  modified:
    - mobile/package.json
    - mobile/package-lock.json
    - mobile/ios/Podfile.lock
    - mobile/ios/PlietschePluenn.xcodeproj/project.pbxproj
    - mobile/src/navigation/AppNavigator.tsx
decisions:
  - "FontAwesome5 via react-native-vector-icons (nicht per-family-package) — Version 10.x, da 11.x noch nicht stabil"
  - "solid={focused} fuer aktiv/inaktiv-Unterschied, Farbe kommt automatisch von tabBarActiveTintColor"
metrics:
  duration: "~25 min"
  completed: "2026-04-08T22:15:34Z"
  tasks_completed: 2
  tasks_total: 3
  files_changed: 5
---

# Phase 8 Plan 1: react-native-vector-icons installieren und Tab-Bar Icons setzen

**One-liner:** FontAwesome5 via react-native-vector-icons@10.3 installiert, iOS gepoddet, alle 11 Tabs in VisitorTabs/AdminTabs/VolunteerTabs mit konkreten FA5-Icons versehen.

## Tasks

| # | Name | Status | Commit |
|---|------|--------|--------|
| 1 | react-native-vector-icons installieren und iOS linken | Done | bab4f67 |
| 2 | Tab-Bar Icons in AppNavigator.tsx setzen | Done | f9e0e25 |
| 3 | Checkpoint: visuelle Verifikation im iOS Simulator | Checkpoint — awaiting user | — |

## Checkpoint (Task 3)

Der Plan enthalt einen `checkpoint:human-verify`-Gate nach Task 1 und 2. Gemaess Ausfuehrungs-Anweisung wurde der Checkpoint in der SUMMARY dokumentiert und die automatisierbaren Tasks abgeschlossen.

**Was zu pruefen ist:**
1. Metro starten: `cd mobile && npm start -- --reset-cache`
2. iOS bauen: `cd mobile && npx react-native run-ios`
3. Als Visitor eingeloggt: Tab-Bar zeigt Haus, QR-Code, Checkmark-Kreis, Muenzen-Icon
4. Als Admin eingeloggt: Tab-Bar zeigt Balkendiagramm, Shirt, Plus-Kreis, Store, Megafon, Medaille, Team-Icon
5. Aktiver Tab ist farbig/ausgefuellt (solid), inaktiver Tab gedimmt
6. Keine weissen Quadrate (fehlende Icons)

## Verification Results

- `grep -c "tabBarIcon" AppNavigator.tsx` → 13 (mindestens 11 Tabs abgedeckt)
- `grep -c "FontAwesome5" AppNavigator.tsx` → 1 (Import vorhanden)
- `npx tsc --noEmit` → 0 Fehler
- Emoji-Check → OK - kein Emoji
- `grep -c "RNVectorIcons" ios/Podfile.lock` → 4

## Icon-Mapping

**VisitorTabs:**
| Tab | Icon | Logik |
|-----|------|-------|
| Home | home | solid wenn focused |
| Scannen | qrcode | solid wenn focused |
| Check-In | check-circle | solid wenn focused |
| Punkte | coins | solid wenn focused |

**AdminTabs:**
| Tab | Icon | Logik |
|-----|------|-------|
| Dashboard | chart-bar | solid wenn focused |
| Kleidung | tshirt | solid wenn focused |
| Neu anlegen | plus-circle | solid wenn focused |
| Store-Info | store | solid wenn focused |
| Kampagnen | bullhorn | solid wenn focused |
| Badges | medal | solid wenn focused |
| Team | users | solid wenn focused |

**VolunteerTabs:**
| Tab | Icon | Logik |
|-----|------|-------|
| Kleidung | tshirt | solid wenn focused |
| Neu anlegen | plus-circle | solid wenn focused |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None. npm-Installation von react-native-vector-icons@10.3.0 (>11k Stars, etabliertes Paket) — Versionspin via package-lock.json gemaess Threat Register T-08-01-01 akzeptiert.

## Self-Check: PASSED

- mobile/src/navigation/AppNavigator.tsx — FOUND
- mobile/package.json — FOUND (react-native-vector-icons: ^10.3.0)
- mobile/ios/Podfile.lock — FOUND (RNVectorIcons 4x)
- Commit bab4f67 — FOUND
- Commit f9e0e25 — FOUND
