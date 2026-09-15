# Mitteilungs-Kanäle

Quelle der Wahrheit für die Zuordnung *Kategorie → Android-Kanal →
iOS-Dringlichkeit*. Die App und das Backend können einander nicht importieren,
deshalb hält jede Seite eine Kopie dieser Tabelle — und beide verweisen
hierher:

- App: `mobile/lib/push.ts`, Konstante `ANDROID_CHANNELS` (legt die Kanäle an).
- Backend: `pocketbase/pb_hooks/lib/push.js`, Konstante `CHANNELS` (adressiert
  sie beim Versand an Expo).

**Wer eine Kennung ändert, ändert alle drei Stellen.** Laufen sie auseinander,
adressiert das Backend einen Kanal, den es auf dem Gerät nicht gibt — Android
stellt dann im Standardkanal zu, und die eingestellte Wichtigkeit ist wirkungslos.

| Kategorie  | Opt-in am Nutzer        | Kanal-Kennung | Name in Android        | Wichtigkeit | iOS `interruptionLevel` |
| ---------- | ----------------------- | ------------- | ---------------------- | ----------- | ----------------------- |
| `streak`   | `push_streak_enabled`   | `streak`      | Serie und Punkte       | HIGH        | `time-sensitive`        |
| `campaign` | `push_campaign_enabled` | `campaign`    | Aktionen und Ankündigungen | DEFAULT | `active`                |
| `badge`    | `push_badge_enabled`    | `badge`       | Abzeichen und Ränge    | DEFAULT     | `active`                |
| alles Übrige | `push_other_enabled`  | `other`       | Sonstiges              | LOW         | `passive`               |

## Warum diese Stufen

- **Serie und Punkte** ist die einzige Kategorie mit einer Frist: Eine Serie,
  die heute abläuft, ist morgen weg. Nur dort ist es gerechtfertigt, oben
  aufzuploppen (HIGH) und auch einen Fokus zu durchbrechen (`time-sensitive`).
- **Aktionen** und **Abzeichen** sind wissenswert, aber nicht dringend: eine
  Aktion läuft Tage, ein Abzeichen bleibt liegen. Ton und Banner ja (DEFAULT /
  `active`), Bildschirm übernehmen nein.
- **Sonstiges** sammelt, was keine eigene Kategorie hat. Still in die
  Mitteilungszentrale (LOW / `passive`) — es soll niemanden unterbrechen.

## Zwei Fallen

1. **Android schreibt einen Kanal beim ersten Anlegen fest.** Danach ändert nur
   noch die Nutzerin seine Eigenschaften, kein Code und kein Update. Deshalb
   werden die Kanäle beim **App-Start** angelegt (`app/_layout.tsx`), nicht erst
   beim Registrieren des Push-Tokens. Käme eine Nachricht vor dem Anlegen an,
   legte Android den Kanal mit Standardwerten an — dauerhaft.
2. **Ältere App-Stände kennen die Kanäle nicht.** Nachgesehen im Quelltext von
   `expo-notifications` (`BaseNotificationBuilder.kt`): Existiert der
   angeforderte Kanal auf dem Gerät nicht, schreibt die Bibliothek eine Zeile
   ins Log und stellt über den Rückfallkanal
   `expo_notifications_fallback_notification_channel` zu — Wichtigkeit HIGH.
   Die Nachricht kommt also an und bleibt hörbar; sie ist nur nicht einzeln
   stummschaltbar, bis die neue App-Version installiert ist. Es gibt darum
   keinen Grund, die `channelId` erst später einzuführen.
