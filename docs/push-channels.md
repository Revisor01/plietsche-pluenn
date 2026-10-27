# Mitteilungs-Kanäle

Quelle der Wahrheit für die Zuordnung *Kategorie → Android-Kanal →
iOS-Dringlichkeit*. App und Backend halten je eine Kopie:

- App: `mobile/lib/push.ts`, Konstante `ANDROID_CHANNELS` (legt die Kanäle an).
- Backend: `pocketbase/pb_hooks/lib/push.js`, Konstante `CHANNELS` (adressiert
  sie beim Versand an Expo).

**Wer eine Kennung ändert, ändert alle drei Stellen**, sonst stellt Android im
Standardkanal zu.

| Kategorie  | Opt-in am Nutzer        | Kanal-Kennung | Name in Android        | Wichtigkeit | iOS `interruptionLevel` |
| ---------- | ----------------------- | ------------- | ---------------------- | ----------- | ----------------------- |
| `streak`   | `push_streak_enabled`   | `streak`      | Serie und Punkte       | HIGH        | `time-sensitive`        |
| `campaign` | `push_campaign_enabled` | `campaign`    | Aktionen und Ankündigungen | DEFAULT | `active`                |
| `badge`    | `push_badge_enabled`    | `badge`       | Abzeichen und Ränge    | DEFAULT     | `active`                |
| alles Übrige | `push_other_enabled`  | `other`       | Sonstiges              | LOW         | `passive`               |

## Hinweise

- Die Kanäle werden beim App-Start angelegt (`app/_layout.tsx`), weil Android
  die Eigenschaften eines Kanals beim ersten Anlegen dauerhaft festschreibt.
- App-Stände ohne die Kanäle stellen über den Rückfallkanal
  `expo_notifications_fallback_notification_channel` (HIGH) zu.
