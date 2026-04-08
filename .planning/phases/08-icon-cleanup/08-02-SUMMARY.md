---
phase: 08-icon-cleanup
plan: "02"
subsystem: badges
tags: [icon-cleanup, emoji-removal, font-awesome, mobile, backend]
dependency_graph:
  requires: [08-01]
  provides: [emoji-free-badge-system, iconName-api]
  affects: [mobile/src/screens/visitor/HomeScreen.tsx, mobile/src/screens/visitor/CheckInScreen.tsx, mobile/src/screens/admin/BadgeLevelsScreen.tsx, backend/src/db/schema.ts, backend/src/modules/badges]
tech_stack:
  added: []
  patterns: [FontAwesome5 Icon-Namen als DB-Werte, react-native-vector-icons/FontAwesome5]
key_files:
  created: []
  modified:
    - backend/src/db/schema.ts
    - backend/src/modules/badges/badges.types.ts
    - backend/src/modules/badges/badges.router.ts
    - backend/src/modules/badges/badges.repository.ts
    - mobile/src/api/badges.api.ts
    - mobile/src/screens/visitor/HomeScreen.tsx
    - mobile/src/screens/visitor/CheckInScreen.tsx
    - mobile/src/screens/admin/BadgeLevelsScreen.tsx
decisions:
  - "DB-Spalte emoji umbenannt zu icon_name (snake_case), TypeScript-Property zu iconName (camelCase)"
  - "Default-Wert 'medal' statt Emoji-Zeichen"
  - "Kein paralleles Behalten des alten emoji-Felds - sauberer Schnitt"
  - "BadgeLevelsScreen: TextInput fuer Icon-Namen mit Preview-Icon statt Emoji-Eingabefeld"
metrics:
  duration_minutes: 30
  completed_at: "2026-04-08T22:19:42Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 8
---

# Phase 8 Plan 2: Badge emoji -> iconName Migration Summary

**One-liner:** badge_levels.emoji vollstaendig auf icon_name (FontAwesome5-Name) migriert — Backend-Schema, API-Typen, Router, Repository und alle Mobile Screens emoji-frei.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Backend badge_levels emoji -> iconName | f91848a | schema.ts, badges.types.ts, badges.router.ts, badges.repository.ts |
| 2 | Mobile Screens und API-Client auf iconName | 0b63eef | badges.api.ts, HomeScreen.tsx, CheckInScreen.tsx, BadgeLevelsScreen.tsx |

## What Was Built

### Task 1: Backend

- `backend/src/db/schema.ts`: `emoji: text('emoji').notNull().default('🏅')` -> `iconName: text('icon_name').notNull().default('medal')`
- `backend/src/modules/badges/badges.types.ts`: Beide Interfaces (`BadgeLevel`, `BadgeProgress`) verwenden jetzt `iconName` statt `emoji`
- `backend/src/modules/badges/badges.router.ts`: `AddLevelSchema` nutzt `iconName: z.string().min(1).max(50).default('medal')`
- `backend/src/modules/badges/badges.repository.ts`: `addLevel`-Parameter und `getBadgeProgress`-Return auf `iconName` umgestellt

### Task 2: Mobile

- `mobile/src/api/badges.api.ts`: `BadgeProgressResponse`, `BadgeLevel`, `createBadgeLevel` alle auf `iconName`
- `HomeScreen.tsx`: Badge-Level zeigt FontAwesome5 Icon (z.B. `medal`) neben Level-Name; "Schau mal rein" mit fa-eye Icon; "Maximales Level erreicht" ohne Emoji
- `CheckInScreen.tsx`: Erfolgs-Checkmark ersetzt durch `<Icon name="check-circle" solid size={64} />`, `successIcon`-Style entfernt
- `BadgeLevelsScreen.tsx`: Emoji-TextInput ersetzt durch Icon-Name-TextInput mit Preview-Box (`iconPreviewBox`), FlatList zeigt FontAwesome5 Icons

## Deviations from Plan

None - plan executed exactly as written.

## DB Migration (Manuell erforderlich)

Das Projekt nutzt kein Drizzle-Migrations-Verzeichnis (keine automatisch erzeugten Migrations-Dateien vorhanden). Die DB-Spalte muss manuell per SSH auf dem Server umbenannt werden:

```sql
ALTER TABLE badge_levels RENAME COLUMN emoji TO icon_name;
ALTER TABLE badge_levels ALTER COLUMN icon_name SET DEFAULT 'medal';
UPDATE badge_levels SET icon_name = 'medal' WHERE icon_name IS NULL OR icon_name = '';
```

Ausfuehren mit:
```bash
ssh root@server.godsapp.de "docker exec plietsche-postgres psql -U plietsche -d plietschepluenn -c 'ALTER TABLE badge_levels RENAME COLUMN emoji TO icon_name; ALTER TABLE badge_levels ALTER COLUMN icon_name SET DEFAULT '"'"'medal'"'"';'"
```

Nach der DB-Migration muss das Backend neu gebaut und deployed werden (bestehende badge_levels-Eintraege mit Emoji-Werten werden dann ungueltige Icon-Namen haben und als leeres Icon gerendert — Neuanlegen der Stufen empfohlen).

## Threat Model Compliance

T-08-02-03 (requireRole('admin') auf Badge-API POST): Geprueft — `requireRole('admin')` ist in `badges.router.ts` nach der Umbenennung unveraendert erhalten.

## Known Stubs

Keine. Alle Screens sind vollstaendig auf iconName verdrahtet.

## Self-Check: PASSED

- [x] mobile/src/api/badges.api.ts — modifiziert, kein .emoji mehr
- [x] mobile/src/screens/visitor/HomeScreen.tsx — FontAwesome5 importiert und genutzt
- [x] mobile/src/screens/visitor/CheckInScreen.tsx — check-circle Icon statt Text
- [x] mobile/src/screens/admin/BadgeLevelsScreen.tsx — iconName State, Preview, kein Emoji
- [x] backend/src/db/schema.ts — icon_name Spalte
- [x] backend/src/modules/badges/badges.types.ts — iconName in beiden Interfaces
- [x] Commits f91848a und 0b63eef vorhanden
- [x] cd mobile && npx tsc --noEmit: EXIT 0
- [x] cd backend && npx tsc --noEmit: EXIT 0
- [x] grep emoji in mobile/src und backend/src/modules/badges: Sauber
