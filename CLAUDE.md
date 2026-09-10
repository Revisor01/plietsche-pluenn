# Plietsche Plünn — Projektregeln

Kleidertausch-App für einen verwalteten Tauschladen. Besucher:innen checken per
QR-Code im Laden ein, nehmen Teile mit, bringen eigene vorbei und sammeln dafür
Punkte, Ränge und Abzeichen. Das Team verwaltet den Bestand, gibt eingereichte
Teile frei und fährt Aktionen, in denen einzelne Handlungen mehr zählen.

## Aufbau

Das Repo hat zwei Teile:

- **`mobile/`** — die App: Expo / React Native in TypeScript, eine Codebasis für
  iOS und Android. Navigation über Expo Router (dateibasiert), Server-State über
  TanStack Query, Client-State über Zustand. Paketversion 0.1.0, App-Version
  1.0.0, Bundle-ID `de.godsapp.plietschepluenn`.
- **`pocketbase/`** — das Backend: PocketBase mit eingebettetem SQLite. Die
  gesamte Fachlogik steckt in `pb_hooks/` (JavaScript-Hooks), das Schema in
  `pb_migrations/`. Kein eigener Server, kein Cloud-Dienst Dritter.

Dazu `design/` (Logo und Entwürfe), `docker-compose.yml` (Deployment hinter
Traefik), `TECH.md` (technischer Steckbrief), `README.md` und `CHANGELOG.md`.

### Die Hooks im Einzelnen

- **`lib/points.js`** — die geteilte Fachlogik: Punkte, Serien, Aktionen,
  Abzeichen. Wird von allen anderen Hooks über
  `require(`${__hooks}/lib/points.js`)` eingebunden. Hier liegt praktisch die
  gesamte Rechenlogik.
- **`lib/push.js`** — Versand der Expo-Push-Nachrichten und Auswahl der
  Empfänger:innen nach Kategorie.
- **`scan.pb.js`** — `POST /api/pp/scan`, der universelle Scanner. Erkennt
  selbst, ob der Code das Türgeheimnis oder ein Teil ist.
- **`push.pb.js`** — An- und Abmeldung der Push-Token.
- **`defaults.pb.js`** — Record-Hooks: Standardwerte, SKU- und QR-Vergabe,
  Schreibschutz für Punktestand und Serie, Punkte fürs Bringen bei Freigabe.
- **`cron.pb.js`** — vier zeitgesteuerte Aufgaben: fällige Push-Nachrichten
  (jede Minute), Zurücksetzen abgelaufener Serien (3:05), Aktions-Abzeichen
  (3:20), Treue-Abzeichen zum Jahresende (3:40).

## Wie man es startet

App:

```bash
npm --prefix mobile install
npm --prefix mobile start          # expo start --go
```

Die Backend-Adresse kommt aus `EXPO_PUBLIC_PB_URL`. Für Entwicklungs-Builds mit
nativen Modulen `npx expo start --dev-client` statt `--go`.

Backend:

```bash
docker compose up -d
```

Migrationen und Hooks werden aus `pocketbase/pb_migrations/` und
`pocketbase/pb_hooks/` eingehängt. Die Compose-Datei erwartet `PB_ENCRYPTION_KEY`
aus der Umgebung.

Tests:

```bash
npm install                        # einmalig, im Repo-Root
npm test
```

## Tests

Getestet wird die Backend-Logik in `pocketbase/pb_hooks/`. Dort tun Fehler weh:
Punkte, Serien und Abzeichen sind für Nutzer:innen sichtbar, und ein falscher
Wert fällt erst auf, wenn er schon vergeben ist.

**Testframework: Vitest**, im Repo-Root, getrennt von `mobile/`. Die Hooks haben
mit der App nichts zu tun — ein eigenes Setup hält die App-Abhängigkeiten frei
von Testwerkzeug und läuft ohne die Expo-Toolchain.

### Wie Hooks getestet werden, ohne PocketBase zu starten

PocketBase führt Hooks in einer eigenen JavaScript-Umgebung aus (Goja, kein
Node). Globale Funktionen wie `routerAdd`, `cronAdd`, `$app`, `$apis`,
`ApiError`, `Record` oder `__hooks` stellt die Laufzeit bereit — in einem
Node-Test existieren sie nicht.

Der Weg im Repo: `tests/harness.js` baut diese Umgebung nach. Es legt die
Globals an, hinterlegt einen DAO im Speicher mit den benötigten Sammlungen und
Datensätzen und lädt die Hook-Datei anschließend über Nodes `vm`-Modul. Die
registrierten Routen und Cronjobs landen in einer Liste und lassen sich einzeln
mit einem gefälschten Kontext aufrufen. Das braucht weder eine laufende
Instanz noch Docker, und ein Test dauert Millisekunden.

Die Datensätze im Speicher bilden die PocketBase-Schnittstelle nach, die die
Hooks tatsächlich benutzen: `get(feld)`, `set(feld, wert)` und `id`. Wer eine
neue Hook-Datei testet, ergänzt im Harness nur die Sammlungen, die sie liest.

### Die Skripte der Auslieferung

Unter `tests/` liegen auch Tests für die Python-Skripte in `.github/scripts/`.
Sie brauchen den Harness nicht, sondern rufen das Skript als Prozess auf. Was
`git log` liest, bekommt dafür ein Wegwerf-Repo mit gestellten Commits — sonst
hinge das Ergebnis an der Projekt-Historie und änderte sich mit jedem Commit.

Diese Skripte verdienen Tests, obwohl sie nichts mit der App zu tun haben:
Ihr Ergebnis landet ungeprüft in TestFlight und in der Produktionsspur bei
Google Play. Ein Fehler darin ist erst zu sehen, wenn die Nutzer:innen ihn
schon lesen.

### Regeln

Jede Verhaltensänderung bekommt Tests im selben Commit.

- **Bugfix:** zuerst der Test, der den Fehler zeigt, dann der Fix.
- **Sicherheitsfix:** je ein Test für den verbotenen und den erlaubten Fall.
- **Weiche Assertions gelten als Fehler.** `expect([200, 500]).toContain(...)`
  oder `toBeDefined()` auf einem Zähler verdecken echte Fehler. Auf den
  konkreten Wert prüfen.
- Schlägt ein Test nach einer Änderung fehl, erst prüfen, **ob er recht hat**.
  Die Erwartung nur aufweichen, wenn sie nachweislich falsch war — nie, um grün
  zu werden.
- Lieber fünf ernsthafte Tests, die echte Fehler finden, als zwanzig, die nur
  Zeilen abdecken.

## Ausgelieferte Apps nie brechen

Sobald eine Version im Store oder auf Geräten ist, ist sie **Leserin der API**
und lässt sich nicht mitdeployen. Das Backend ist in Minuten aktualisiert, die
App auf dem Handy nicht.

- **Antwortformen sind ein Vertrag.** Aus einem Array wird kein Objekt und
  umgekehrt, Felder verschwinden nicht, Typen ändern sich nicht.
- **Neue Felder hinzufügen ist erlaubt**, weglassen oder umbenennen nicht.
- Wer die Form ändern will, macht eine **neue, versionierte Route** und lässt
  die alte stehen, bis keine App sie mehr ruft.
- **Migrationen laufen additiv:** erst die Spalte dazu, dann beide Stände
  bedienen, Altes erst entfernen, wenn keine alte App mehr darauf zugreift.
- **Grüne Tests beweisen das nicht.** Sie prüfen gegen den Stand im Repo, nicht
  gegen die App auf den Geräten. Vor jeder Änderung an einer Antwortform die
  Frage: Wer ruft diese Route noch — auch die Version im Store?

## CHANGELOG-Pflicht

`CHANGELOG.md` wird bei **jedem Commit mitgeschrieben, der Nutzer:innen
betrifft** — im selben Commit, nicht erst beim Release.

- Format: [Keep a Changelog](https://keepachangelog.com/de/), deutsche
  Überschriften: **Neu / Geändert / Behoben / Sonstiges**.
- Gibt es keinen passenden Abschnitt, oben `## [Unreleased]` anlegen.
- Ein knapper Satz pro Punkt, **aus Nutzersicht**: was sich für die Person
  ändert, die die App benutzt. Bei behobenen Fehlern gehört die Ursache dazu,
  wenn sie das Verhalten erklärt.
- **Niemals** Build-Nummern, Dateinamen, Framework-Namen, Commit-Hashes oder
  Infrastruktur. Das gehört in die Commit-Message.
- Reine Interna (Refactoring, Tests, CI) höchstens unter „Sonstiges" — im
  Zweifel weglassen.

Der bestehende CHANGELOG ist der Maßstab für den Ton. **Vor dem Schreiben
hineinschauen.**

## API-Dokumentation

Die selbstgebauten Routen stehen in `docs/openapi.yaml` (OpenAPI 3.1). Neue oder
geänderte Route, geänderte Berechtigung → Eintrag im **selben Commit**.

Die generischen CRUD-Routen von PocketBase (`/api/collections/...`) sind dort
nicht einzeln dokumentiert; für sie gilt die offizielle PocketBase-Doku.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/):
`feat`, `fix`, `docs`, `test`, `chore`, `refactor`. Betreffzeile knapp, Details
in den Body.

**Keinerlei Hinweis auf Claude, Anthropic oder KI-Werkzeuge** — kein
`Co-Authored-By`, keine Session-Zeile, kein „Generated with". Gilt auch für
PR-Beschreibungen und Tags.

Git-Tags ohne `v`-Präfix, nach dem Schema des Repos.

## Sprache

- Antworten und Besprechungen auf **Deutsch**.
- **Nutzertexte in der App auf Deutsch** — auch Fehlermeldungen aus dem Backend,
  die in der App landen („Du bist nicht im Laden", „Schon mitgenommen").
- **Code und Bezeichner auf Englisch**, dem bestehenden Code folgend. Kommentare
  sind gemischt; beim Bearbeiten die Sprache der Umgebung fortführen.

## Was nicht ins Repo gehört

Keine Server-Adressen mit Zugangsdaten, keine SSH-Zugänge, keine
PocketBase-Admin-Konten, keine Push-Keys, keine API-Token, keine Passwörter.
Auch nicht als Beispiel oder Platzhalter mit echtem Wert. Geheimnisse kommen aus
der Umgebung (`PB_ENCRYPTION_KEY`, `EXPO_PUBLIC_PB_URL`).

Wer beim Arbeiten auf so etwas im Code stößt: **melden, nicht übernehmen.**

## Beim Ändern der Fachlogik

- **Nichts an der App-Logik ändern, solange kein Test den bisherigen Stand
  absichert.** Fällt dabei ein Fehler auf: melden, nicht nebenbei beheben.
- Bei Unklarheiten zum Fachlichen (wie Abzeichen-Stufen zählen, wie Serien
  gemeint sind) **erst im CHANGELOG nachlesen** — dort steht viel Fachlogik in
  Prosa. Wenn es dann noch offen ist: nachfragen statt raten.
- Punktwerte sind **konfigurierbar**, nicht fest verdrahtet. Sie stehen auf dem
  `store`-Datensatz (`pts_checkin`, `pts_take`, `pts_bring`, `max_items_take`);
  die Werte in `lib/points.js` sind nur Rückfallwerte, wenn nichts gepflegt ist.
