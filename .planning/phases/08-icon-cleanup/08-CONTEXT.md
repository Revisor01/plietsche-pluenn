# Phase 8: Icon-Cleanup - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning
**Mode:** Auto-generated (mechanical cleanup phase)

<domain>
## Phase Boundary

Font Awesome Line-Icons als einziges Icon-System. Alle Emojis in der gesamten App entfernen und durch passende Font Awesome Icons ersetzen. Tab-Bar, Badge-Icons, Screen-Dekorationen.

</domain>

<decisions>
## Implementation Decisions

### Icon-System (locked -- user preference)
- Font Awesome Line-Icons (nicht filled/solid -- LINE style)
- react-native-vector-icons mit FontAwesome5 oder FontAwesome6
- Kein einziges Emoji-Zeichen darf verbleiben
- Clean, schlicht, Gradient aufnehmend
- Tab-Bar Icons: Font Awesome
- Badge-Icons: fa-trophy, fa-star, fa-fire (Streaks), fa-medal etc.

### Claude's Discretion
- Welche konkreten Font Awesome Icons fuer welche Stellen
- Icon-Groessen und -Farben (konsistent mit Theme)
- Ob FontAwesome5 oder FontAwesome6

</decisions>

<code_context>
## Existing Code Insights

### Wo Emojis zu finden sind (grep noetig)
- HomeScreen.tsx: Showcase-Titel hat Emojis
- Badge-Anzeige: Emoji neben Level-Name
- Onboarding-Screens: wahrscheinlich Emojis als Illustrationen
- Tab-Bar: nutzt aktuell Text oder system icons
- Diverse Screens: moeglicherweise in Buttons, Headern, Labels

### Integration Points
- mobile/package.json: react-native-vector-icons installieren
- ios/Podfile: pod install nach Installation
- Alle Screen-Dateien durchsuchen und ersetzen

</code_context>

<specifics>
## Specific Ideas

Keine -- einfach alle Emojis finden und durch passende Font Awesome Icons ersetzen.

</specifics>

<deferred>
## Deferred Ideas

Keine.

</deferred>
