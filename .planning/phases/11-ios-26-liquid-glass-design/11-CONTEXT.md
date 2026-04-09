# Phase 11: iOS 26 Liquid Glass Design - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

iOS 26 "Liquid Glass" Design-Sprache in die App integrieren. Transluzente Elemente, neue Tab-Bar-Aesthetik, glassmorphism-Effekte, modernes iOS 26 Look & Feel -- soweit React Native bare das unterstuetzt.

</domain>

<decisions>
## Implementation Decisions

### iOS 26 Liquid Glass (locked from user request)
- iOS 26 wurde April 2026 veroeffentlicht -- App soll modern aussehen
- Transluzente/glassmorphism-Effekte wo moeglich
- Neue Tab-Bar-Aesthetik (iOS 26 floating tab bar style)
- Clean, schlicht -- passt zum bestehenden Theme (Gradient + Work Sans)
- Font Awesome Icons bleiben (keine Emojis!)
- Gradient-Theme bleibt Basis -- Liquid Glass als Erweiterung

### Was "Liquid Glass" in React Native bedeutet
- BlurView fuer transluzente Hintergruende (@react-native-community/blur)
- Glassmorphism-Cards: semi-transparenter Hintergrund + Blur + subtiler Border
- Tab-Bar: floating/transluzent statt opaque
- Navigation-Header: transluzent mit Blur
- Cards und Modals: Glassmorphism-Effekt
- Beibehaltung der Gradient-Akzente als Farbtupfer hinter dem Glas

### Claude's Discretion
- Welche Screens profitieren am meisten von Glassmorphism
- Blur-Intensitaet und Transparenz-Werte
- Ob Tab-Bar floating oder klassisch mit Blur
- Welche @react-native-community/blur Variante am besten funktioniert
- Fallback fuer Android (da Liquid Glass iOS-spezifisch ist)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- mobile/src/theme/index.ts -- Theme (colors, fonts, spacing) als Basis
- react-native-linear-gradient bereits installiert (fuer Gradient hinter Glas)
- Alle Screens bereits auf Theme umgestellt (Phase 5)

### Integration Points
- AppNavigator.tsx -- Tab-Bar und Header Styling
- Alle Screen-Dateien -- Card-Styles anpassen
- Neues BlurView-Package installieren

</code_context>

<specifics>
## Specific Ideas

iOS 26 Look soll modern und frisch wirken, aber nicht ueberladen. Glassmorphism dezent einsetzen -- nicht ueberall, sondern an strategischen Stellen (Header, Tab-Bar, Punkte-Card, Modals).

</specifics>

<deferred>
## Deferred Ideas

- Dynamic Island Integration
- Live Activities
- Widget fuer iOS Homescreen

</deferred>
