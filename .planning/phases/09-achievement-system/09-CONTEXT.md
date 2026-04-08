# Phase 9: Achievement-System - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Vollstaendiges Badge-System das das einfache Punkte-Schwellen-System aus v1.1 ersetzt. Verschiedene Badge-Kategorien mit Trigger-Typen, Fortschrittsanzeige, Streak-Tracking, Saison-Badges, Admin-Verwaltung.

</domain>

<decisions>
## Implementation Decisions

### Badge-Kategorien und Default-Badges
- **Bringer-Badges:** 10/25/50/100 Items gebracht (Trigger: items_brought)
- **Holer-Badges:** 10/25/50/100 Items geholt (Trigger: items_taken)
- **Besucher-Badges:** 5/10/25/50 Check-Ins (Trigger: visits)
- **Streak-Badges:** 2/4/8/12 Wochen in Folge besucht (Trigger: streak_weeks)
- **Saison-Badges:** Items gebracht/geholt pro Saison (Trigger: season_items_brought, season_items_taken)
  - Saisons: Fruehling (Maerz-Mai), Sommer (Juni-Aug), Herbst (Sep-Nov), Winter (Dez-Feb)
- **Meilenstein-Badges:** "Erster Besuch", "Erstes Teil gebracht", "100. Teil insgesamt" (Trigger: milestone)

### Badge-Stufen
- Bronze/Silber/Gold pro Kategorie (z.B. "Bringer Bronze" = 10, "Bringer Silber" = 25, "Bringer Gold" = 100)
- Oder individuelle Namen pro Badge ("Neuling" -> "Stammgast" -> "Plietsch-Profi")
- Admin entscheidet -- System unterstuetzt beides

### Badge-Schema
- achievements Tabelle: id, store_id, name, description, icon_name (FA5), trigger_type, trigger_value, tier (bronze/silber/gold/custom), season (nullable), sort_order, created_at
- user_achievements: id, user_id, achievement_id, progress, completed, completed_at
- weekly_visits: user_id, store_id, week_start (ISO week), visit_count -- fuer Streak-Berechnung

### Trigger-Typen
- items_brought: COUNT items mit created_by = user_id
- items_taken: COUNT point_transactions mit source = 'item_scan' fuer user
- visits: COUNT checkins fuer user
- streak_weeks: Konsekutive Wochen mit mindestens 1 Check-In
- season_items_brought: items_brought gefiltert nach Saison-Monaten
- season_items_taken: items_taken gefiltert nach Saison-Monaten
- milestone: Einmalige Events (erster Besuch, erstes Teil, etc.)

### Fortschritt und Anzeige
- Fortschrittsbalken: "72 von 100 geholt"
- Badge-Uebersichtsseite: Alle Badges gruppiert nach Kategorie, erreichte hervorgehoben, ausstehende mit Fortschritt
- Homescreen: Aktuelles hoechstes Badge + Gesamtfortschritt
- Toast bei neuem Badge (react-native-toast-message, bereits installiert)

### Admin-Verwaltung
- Admin kann eigene Badges erstellen (Name, Icon, Trigger-Typ, Zielwert, Tier)
- Admin kann Default-Badges bearbeiten/loeschen
- Admin kann Saison-Badges aktivieren/deaktivieren

### Keine Emojis
- Alle Icons sind Font Awesome 5 icon_name Strings (z.B. "trophy", "fire", "star")
- Kein einziges Emoji-Zeichen

### Claude's Discretion
- Badge-Uebersichtsseite Layout-Details
- Konkrete FA5 Icons pro Default-Badge
- Toast-Design bei Badge-Freischaltung
- API-Endpunkt-Struktur

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- backend/src/modules/badges/ -- Bestehendes Badge-Modul (wird stark erweitert/umgebaut)
- backend/src/db/schema.ts -- badge_levels Tabelle existiert (wird durch achievements ersetzt)
- backend/src/modules/points/ -- Point transactions als Datenquelle
- backend/src/modules/checkin/ -- Check-In Events als Datenquelle
- backend/src/modules/scan/ -- Scan Events als Datenquelle
- mobile/src/screens/admin/BadgeLevelsScreen.tsx -- Badge-Admin (wird umgebaut)
- react-native-toast-message bereits installiert
- react-native-vector-icons/FontAwesome5 bereits installiert

### Integration Points
- Altes badge_levels System ersetzen durch achievements
- Neue Tabellen: achievements, user_achievements, weekly_visits
- Badge-Auswertung nach jedem Check-In und Scan
- Neue Screens: BadgeOverviewScreen (Visitor), AchievementAdminScreen (Admin)
- HomeScreen: Badge-Anzeige aktualisieren

</code_context>

<specifics>
## Specific Ideas

- Streaks sollen motivierend sein -- "4 Wochen in Folge!" mit Feuer-Icon
- Saison-Badges sind saisonal begrenzt und muessen die aktuelle Saison erkennen
- "72 von 100 geholt" als klare Fortschrittsanzeige
- Admin muss einfach neue Badges erstellen koennen

</specifics>

<deferred>
## Deferred Ideas

- Badge-Sharing auf Social Media
- Team-Badges (Gruppen-Achievements)
- Zeitlich begrenzte Event-Badges (z.B. "Sommerfest 2026")

</deferred>
