> **Erledigt am 10.09.2026.** Dieser Auftrag ist abgearbeitet und liegt hier
> nur noch zur Nachvollziehbarkeit. Die Ergebnisse stehen in `CLAUDE.md`
> (Projektregeln), `tests/` (86 Tests für die Backend-Hooks) und
> `docs/openapi.yaml` (API-Dokumentation). Die Sicherheitseinschätzung ist in
> die Aktualisierung der Abhängigkeiten eingeflossen; offene Dependabot-PRs
> gibt es keine mehr.
>
> Eine Sache ist bewusst offen geblieben: Der Standardwert von 30 Punkten für
> ein neues Teil greift nicht, weil die Prüfung auf `== null` bei einem
> Zahlenfeld nicht anschlägt.

# Auftrag: Plietsche Plünn projektreif machen

Du arbeitest im Repo `Revisor01/plietsche-pluenn` (**privat**). Ziel dieser Sitzung:
Das Projekt bekommt die Grundlagen, die bisher fehlen — **eine `CLAUDE.md`, Tests und
API-Dokumentation** — und alles wird gepusht.

## Ausgangslage (Stand 10.09.2026)

- `main` ist gepusht, Arbeitsverzeichnis war sauber. Du startest auf aktuellem Stand.
- Es gibt **keinen einzigen Test** und **keine `CLAUDE.md`**.
- GitHub meldet **26 Sicherheitslücken** auf `main` (20 hoch, 5 mittel, 1 niedrig) und
  **5 offene Dependabot-PRs**. Die gehören **nicht** in diese vier Commits — siehe
  „Nach den vier Commits" ganz unten.
- Die GitHub-Repo-Beschreibung ist veraltet: dort steht „React Native bare + Express 5 +
  PostgreSQL". Tatsächlich Expo + PocketBase. Bitte im Rahmen dieser Arbeit korrigieren
  (nur die Beschreibung, kein Code).

## Was das Projekt ist

Kleidertausch-App für verwaltete Tauschläden.

- `mobile/` — **Expo / React Native** (TypeScript), Version 0.1.0, App-Version 1.0.0,
  Bundle `de.godsapp.plietschepluenn` (iOS + Android)
- `pocketbase/` — **PocketBase** als Backend: `pb_hooks/` (JS-Hooks), `pb_migrations/` (16 Stück)
- `design/`, `docker-compose.yml`, `TECH.md`, `README.md`, `CHANGELOG.md`


## Aufgabe 1 — `CLAUDE.md` im Repo-Root anlegen

Sie soll enthalten, knapp und in ganzen Sätzen:

1. **Was das Projekt ist** und wie es aufgebaut ist (die zwei Teile oben).
2. **Wie man es startet** — `npm --prefix mobile install`, `npm --prefix mobile start`,
   PocketBase über `docker-compose.yml`. Vorher selbst nachlesen, was wirklich stimmt.
3. **CHANGELOG-Pflicht:** Bei jedem Commit, der Nutzer:innen betrifft, wird
   `CHANGELOG.md` im selben Commit mitgeschrieben. Keep a Changelog, deutsche
   Überschriften (Neu / Geändert / Behoben / Sonstiges), ein knapper Satz pro Punkt
   **aus Nutzersicht**. Niemals Build-Nummern, Dateinamen, Framework-Namen oder
   Commit-Hashes — das gehört in die Commit-Message.
   → Der bestehende CHANGELOG ist der Maßstab für den Ton. **Lies ihn, bevor du schreibst.**
4. **Commits:** Conventional Commits (`feat`, `fix`, `docs`, `test`, `chore`, `refactor`),
   Betreffzeile knapp, Details in den Body. **Keinerlei Hinweis auf Claude, Anthropic
   oder KI-Werkzeuge** — kein `Co-Authored-By`, kein „Generated with".
5. **Tests:** Jede Verhaltensänderung bekommt Tests im selben Commit. Bei einem Bugfix
   zuerst der Test, der den Fehler zeigt, dann der Fix. Weiche Assertions
   (`expect([200,500]).toContain(...)`, `toBeDefined()` auf einem Zähler) gelten als
   Fehler — auf den konkreten Wert prüfen.
6. **Ausgelieferte Apps nie brechen:** Sobald eine Version im Store oder auf Geräten ist,
   ist sie Leserin der API und lässt sich nicht mitdeployen. Antwortformen sind ein
   Vertrag: aus einem Array wird kein Objekt, Felder verschwinden nicht, Typen ändern
   sich nicht. Neue Felder hinzufügen ist erlaubt. Wer die Form ändern will, macht eine
   neue, versionierte Route. Migrationen laufen additiv.
7. **API-Doku-Pflicht:** Neue oder geänderte Route → Eintrag in der OpenAPI-Datei im
   selben Commit.
8. **Sprache:** Antworten auf Deutsch. Nutzertexte in der App auf Deutsch,
   Code und Bezeichner auf Englisch (dem bestehenden Code folgen).

**Was NICHT hinein darf:** Server-IPs, SSH-Zugänge, PocketBase-Admin-Zugänge, Push-Keys,
API-Tokens, Passwörter. Auch nicht als Beispiel. Wenn du auf so etwas im Code stößt,
melde es, statt es zu übernehmen.

## Aufgabe 2 — Tests einrichten

Bisher gibt es **keinen einzigen Test**. Richte ein Testframework ein (Vitest oder Jest,
begründe kurz die Wahl) und schreibe die ersten Tests für die Backend-Logik in
`pocketbase/pb_hooks/`. Dort liegt die Logik, bei der Fehler wehtun:

- **`scan.pb.js`** — wichtigste Datei. Enthält `POST /api/pp/scan`.
  Testfälle mindestens:
  - Geofence: innerhalb des Radius akzeptiert, außerhalb abgelehnt
    (`geofence_radius_m`, Standardwert 150, `lib.distanceM`)
  - Punkteberechnung: `Math.round(points * multTake)`, Standardwert 30
  - Bereits mitgenommenes Teil → **409**
  - Archiviertes Teil → **410**
  - Falsches oder fehlendes `checkin_qr_secret` → abgelehnt
- **`cron.pb.js`** — vier Cronjobs: `push-scheduled` (jede Minute), `streak-reset` (3:05),
  `action-badges` (3:20), `year-badges` (3:40). Mindestens `streak-reset` testen:
  Wann wird eine Serie zurückgesetzt, wann nicht.
- **`push.pb.js`** — `POST /api/pp/push/register` und `/unregister`.
- **`defaults.pb.js`** — die vier Record-Hooks.

PocketBase-Hooks laufen in einer eigenen JS-Umgebung (Goja), nicht in Node. Die globalen
Funktionen (`routerAdd`, `$app`, `ApiError`, …) musst du im Test bereitstellen — such
dir einen Weg, der ohne laufende PocketBase-Instanz auskommt, und beschreibe ihn kurz
in der `CLAUDE.md`.

Fang mit `scan.pb.js` an. Lieber fünf ernsthafte Tests, die echte Fehler finden, als
zwanzig, die nur Zeilen abdecken.

## Aufgabe 3 — API-Dokumentation

Lege eine OpenAPI-3.1-Datei an (`docs/openapi.yaml` oder `api/openapi.yaml`) mit den
selbstgebauten Routen:

- `POST /api/pp/scan`
- `POST /api/pp/push/register`
- `POST /api/pp/push/unregister`

Je Route: Request-Body, alle Antwortformen, alle Statuscodes (auch 409 und 410),
Authentifizierung. Die generischen PocketBase-CRUD-Routen brauchst du nicht zu
dokumentieren — nur, dass es sie gibt und wo die offizielle Doku steht.

## Reihenfolge und Commits

Arbeite in dieser Reihenfolge, **ein Commit je Schritt**:

1. `docs: Projektregeln in CLAUDE.md festhalten`
2. `test: Testframework einrichten und Scan-Route absichern`
3. `test: Cronjobs, Push-Registrierung und Record-Hooks abdecken`
4. `docs: API-Routen als OpenAPI 3.1 dokumentieren`

Der CHANGELOG bekommt **nur** einen Eintrag, wenn eine Änderung Nutzer:innen betrifft.
Reine Interna (Tests, Doku, CI) gehören höchstens unter „Sonstiges" — im Zweifel weglassen.

Am Ende: `git push`.

## Wichtig

- **Nichts an der App-Logik ändern**, solange kein Test den bisherigen Stand absichert.
  Findest du dabei einen Fehler: melden, nicht nebenbei beheben.
- Schlägt ein Test fehl, **erst prüfen, ob er recht hat.** Erwartung nur aufweichen,
  wenn sie nachweislich falsch war — nie, um grün zu werden.
- Bei Unklarheiten zum Fachlichen (wie Abzeichen-Stufen genau zählen, wie Serien
  gemeint sind): erst im CHANGELOG nachlesen, dort steht viel Fachlogik in Prosa.
  Wenn es dann noch offen ist, nachfragen statt raten.

## Nach den vier Commits: Sicherheitslage einschätzen

Als **eigener Arbeitsgang**, nicht in die vier Commits mischen.

GitHub meldet 26 Schwachstellen (20 hoch) und 5 offene Dependabot-PRs. Schau sie dir an
(`gh pr list`, Dependabot-Übersicht des Repos) und gib Simon eine **kurze Einschätzung**:

- Was davon betrifft Code, der zur Laufzeit wirklich läuft, und was nur Build- oder
  Entwicklungswerkzeuge? Bei einer Expo-App ist das der entscheidende Unterschied —
  eine Lücke in einem Build-Werkzeug erreicht kein Gerät.
- Welche PRs sind reine Patch-Aktualisierungen (gefahrlos), welche heben eine
  Hauptversion (können die App brechen)?
- Was ist dringend, was kann warten?

**Nichts davon eigenmächtig mergen.** Die App liegt im Store — eine Abhängigkeit, die
eine Hauptversion springt, kann ausgelieferte Versionen brechen. Einschätzung liefern,
Entscheidung trifft Simon.

## Wenn du fertig bist

Pushen. Danach kurz berichten: Was steht in der `CLAUDE.md`, welche Tests laufen
(mit Anzahl), was deckt die OpenAPI-Datei ab — und die Sicherheitseinschätzung.
