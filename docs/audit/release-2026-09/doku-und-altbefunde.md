# Release-Audit September 2026 — Dokumentation und Stand der Altbefunde

**Datum:** 26.09.2026
**Commit:** `06b68dc` (Branch `claude/hopeful-albattani-f2aig8`, identisch mit `origin/main`; Arbeitsbaum sauber)
**Umfang:** Teil 1 — jede Aussage in `TECH.md`, `README.md`, `CHANGELOG.md`,
`docs/openapi.yaml`, `docs/deploy.md`, `docs/store-release.md`,
`docs/push-channels.md`, `web/README.md`, `design/HANDOFF.md`,
`design/logo/README.md`, `design/logo/varianten/README.md`,
`docs/archiv/AUFTRAG-GRUNDLAGEN.md` und `CLAUDE.md` gegen den Code am HEAD,
dazu Stichproben veralteter Kommentare in `pocketbase/pb_hooks/` und
`mobile/lib/`. Teil 2 — jeder Befund aus `docs/audit/ABNAHME.md` (14.09.2026)
mit Zustand OFFEN, BEHOBEN UNGETESTET oder BEWUSST OFFEN, dazu die als BEHOBEN
geführten KRITISCH- und HOCH-Befunde auf Regression.
**Vorgehen:** Kein Projektcode geändert. Jede Aussage ist mit Datei:Zeile
belegt; je Befund steht, ob er **reproduziert** (Kommando ausgeführt, Wert
gemessen) oder **aus Code gelesen** ist. Was dafür lief: `npm test` im
Repo-Root (470 Tests in 22 Dateien, alle grün, 2,9 s), `npm audit` gegen
`mobile/package-lock.json` (ohne `npm install`), YAML-Parse von
`docs/openapi.yaml` mit Prüfung aller `$ref`-Ziele und `required`-Listen,
PNG-Kopfzeilen aller Symboldateien (Maße, Alphakanal, Prüfsumme), GitHub-API
zur Sichtbarkeit des Repos. Das Repo lag als flacher Klon vor (50 Commits);
für die Historie wurde er mit `git fetch --unshallow` vervollständigt (302
Commits). **Es gibt keinen Git-Tag `1.0.0-33`** — lokal kein Tag, remote nur
`pre-redesign`. Die Grenze des letzten Release-Abschnitts ist deshalb der
Commit `38b3725` („Unreleased-Block als 1.0.0 (33) schliessen", 14.09.2026);
verglichen wurde `38b3725..HEAD` (29 Commits).

---

## Zusammenfassung

Die Dokumentation ist in den Teilen, die am 14.09. entstanden sind
(`deploy.md`, `store-release.md`, `push-channels.md`, `openapi.yaml`),
weitgehend deckungsgleich mit dem Code. Veraltet ist, was davor geschrieben
und seither nicht angefasst wurde: `TECH.md` steht auf dem 3. August und nennt
Build 26, zwölf Sammlungen, 36 Abhängigkeiten, 172 Commits und 14
`npm-audit`-Hinweise — heute sind es Build 33, dreizehn Sammlungen, 37
Abhängigkeiten, 302 Commits und null Hinweise. Der schwerste Einzelbefund
liegt im CHANGELOG: Der Unreleased-Block verspricht ein App-Symbol, das sich
auf iOS dem dunklen und dem getönten Startbildschirm anpasst — die dafür
nötige Konfiguration wurde vier Commits später wieder aus `app.json`
entfernt, die Dateien `icon-dark.png` und `icon-tinted.png` liegen ungenutzt
im Repo. Ebenso beschreibt der Eintrag „Neues App-Symbol" die Glasscheibe,
während die Vorgabe das dunkelgrüne Symbol ist. `CLAUDE.md` selbst
widerspricht `deploy.md`: Sie schreibt weiter vom Kopieren von Hand auf einen
Server ohne Git, obwohl seit dem 14.09. ein Abbild ausgeliefert und der Stand
danach geprüft wird. Der CHANGELOG-Unreleased-Block führt „Geändert" und
„Behoben" je zweimal; ein nutzerrelevanter Fix (`e16ab56`) und die Rücknahme
der dunkleren Knöpfe (`48b697c`) fehlen darin — der Abschnitt 1.0.0 (33)
behauptet damit weiter ein Verhalten, das am selben Tag zurückgenommen wurde.
Von den 75 Befund-Zeilen, die am 14.09. offen, ungetestet oder bewusst
offen standen, sind 21 weitergekommen (9 davon mit Test), 35 stehen
unverändert auf „behoben, ungetestet", 13 sind noch offen und 4 bewusst
offen; unter den 13 offenen ist keiner KRITISCH und zwei sind HOCH (B-6,
B-7 — Kontraste, eine Gestaltungsentscheidung). Regressionen bei
den als BEHOBEN geführten KRITISCH- und HOCH-Befunden gibt es keine — mit
einer Ausnahme in der Doku: Der als behoben geführte CHANGELOG-Befund M-4
(doppelte Rubriken) ist im neuen Unreleased-Block wieder da.

---

## Teil 1 — Dokumentation gegen Code

### Befund-Tabelle

| ID | Kurztitel | Schwere | Fundstelle |
|---|---|---|---|
| D-1 | CHANGELOG verspricht iOS-Dunkel- und Tinted-Symbol, `app.json` hat es nicht mehr | HOCH | `CHANGELOG.md:12`, `mobile/app.json:9` |
| D-2 | CHANGELOG „Neues App-Symbol" beschreibt die Scheibe, Vorgabe ist Dunkelgrün | MITTEL | `CHANGELOG.md:11`, `mobile/assets/icon.png` |
| D-3 | `design/logo/README.md` beschreibt einen `app.json`-Stand und eine Ableitung, die es nicht mehr gibt | MITTEL | `design/logo/README.md:22-26, 59-73, 80-89` |
| D-4 | `TECH.md` auf Stand 3. August: acht Zahlen falsch, vier Funktionen fehlen | HOCH | `TECH.md:3, 26, 56-60, 78, 102, 184-188` |
| D-5 | `README.md` Datenschutz: Koordinaten werden nicht mehr gespeichert | MITTEL | `README.md:204` |
| D-6 | `README.md` Funktionen: ×1,5 gibt es nicht mehr, neue Funktionen fehlen | MITTEL | `README.md:48-49, 70` |
| D-7 | `README.md` Startanleitung: `.env.secrets` wird nirgends geladen; Start-Weg weicht von CLAUDE.md ab | MITTEL | `README.md:112-117, 126-127` |
| D-8 | CHANGELOG Unreleased führt „Geändert" und „Behoben" je zweimal | MITTEL | `CHANGELOG.md:9, 24, 28, 32` |
| D-9 | CHANGELOG-Vollständigkeit: ein Fix fehlt, eine Rücknahme fehlt, ein Eintrag im geschlossenen Abschnitt | MITTEL | `CHANGELOG.md:90, 170`; Commits `e16ab56`, `48b697c`, `262abfd` |
| D-10 | CHANGELOG-Ton: Framework- und Feldnamen in 1.0.0 (33) Sonstiges und in alten Abschnitten | NIEDRIG | `CHANGELOG.md:215-221, 242, 247, 259` |
| D-11 | `CLAUDE.md` beschreibt die Auslieferung von Hand, die es seit 14.09. nicht mehr gibt | MITTEL | `CLAUDE.md:21, 145-155` |
| D-12 | `docs/deploy.md`: Repo „privat" und „öffentlich" in derselben Datei; Stand-Datum vor dem letzten Abschnitt; Hostnamen und `~/.claude`-Pfad | MITTEL | `docs/deploy.md:3, 134, 145, 204-206` |
| D-13 | `web/konto.html` und `web/nginx-konto.conf` sind nirgends dokumentiert | MITTEL | `web/README.md`, `docs/deploy.md:195-215` |
| D-14 | `root@server.godsapp.de` als SSH-Ziel im Repo; Produktions-Hostnamen an sechs Stellen | MITTEL | `web/README.md:19-20` u. a. |
| D-15 | `design/HANDOFF.md` ist ein historisches Briefing ohne Archiv-Kennzeichnung und widerspricht dem Projekt an zehn Stellen | NIEDRIG | `design/HANDOFF.md:9, 29-31, 58-67, 346, 425-438` |
| D-16 | `docs/openapi.yaml`: `items_count`-Grenze wirkt auch beim Teile-Scan; Fehlerhistorie in der Spezifikation; Produktions-Host | NIEDRIG | `docs/openapi.yaml:29-33, 76, 152-153` |
| D-17 | Veraltete Kommentare im Code (fünf Stellen) | NIEDRIG | `mobile/app/_layout.tsx:139`, `mobile/lib/format.ts:194,204,227`, `pocketbase/pb_hooks/lib/points.js:10`, `pocketbase/pb_hooks/lib/push.js:26-27` |
| D-18 | Kein Git-Tag für 1.0.0 (33), kein Tag-Schema | NIEDRIG | `git tag` (leer), `CLAUDE.md:201` |
| D-19 | `docs/archiv/AUFTRAG-GRUNDLAGEN.md` nennt das Repo „privat" | NIEDRIG | `docs/archiv/AUFTRAG-GRUNDLAGEN.md:14` |

Kein Befund ist KRITISCH: Keiner führt zu einem falschen Deploy (der
Deploy-Weg ist in `deploy.md` richtig beschrieben) und keiner zu einer
falschen Store-Angabe (die Store-Texte entstehen aus den Commits, nicht aus
dem CHANGELOG — `.github/scripts/release-notes.py`). D-1 steht auf HOCH,
weil eine Nutzerin liest, was die App kann, und es nicht bekommt.

### Die Befunde im Einzelnen

#### D-1 [HOCH] CHANGELOG verspricht iOS-Dunkel- und Tinted-Symbol, `app.json` hat es nicht mehr

**Reproduziert** (Git-Historie von `mobile/app.json`).

`CHANGELOG.md:12`: „Das Symbol passt sich dem Bildschirm an: Auf einem dunklen
Homescreen erscheint es gedämpft statt hell leuchtend, und wer seine Symbole
einfärben lässt, bekommt eine dafür gezeichnete Fassung. Auf Android fügt es
sich ebenso in eingefärbte Startbildschirme ein."

Das stimmt seit `729bfa0` (18.09.) nur noch für Android. Commit `01ddb46`
hatte in `app.json` das Objekt `icon: { light, dark, tinted }` eingetragen;
`729bfa0` („Umschalter fuer drei Symbol-Entwuerfe") hat es durch den
Einzelpfad `"icon": "./assets/icon.png"` ersetzt (`mobile/app.json:9`) und
das Plugin `expo-alternate-app-icons` mit vier Einträgen hinzugefügt, die je
nur einen `ios`-Pfad tragen (`:57-76`). `mobile/assets/icon-dark.png` und
`mobile/assets/icon-tinted.png` liegen weiter im Repo, werden aber von keiner
Datei referenziert (`grep -rn "icon-dark\|icon-tinted" mobile --include=*.json
--include=*.ts*` → kein Treffer außerhalb der Assets). Die
Android-Monochrom-Ebene ist erhalten (`app.json:26`).

Der CHANGELOG-Eintrag ist nie angepasst worden; `design/logo/README.md:59-73`
beschreibt weiterhin das entfernte Objekt (D-3).

**Richtiger Wert:** Auf iOS gibt es eine Fassung, in vier Gestaltungen wählbar;
Dunkel- und Tinted-Erscheinung werden nicht mitgeliefert. Auf Android gibt es
die Monochrom-Ebene.

**Empfehlung:** Entweder das `icon`-Objekt wiederherstellen (vorher prüfen, ob
`expo-alternate-app-icons` 8.0 die Objektform auch je Alternative annimmt —
die Plugin-Konfiguration erlaubt pro Eintrag ein `ios`-Objekt mit
`light`/`dark`/`tinted`) oder den Eintrag auf Android beschränken und die
beiden ungenutzten Dateien entfernen. Im Unreleased-Block korrigieren, nicht
nur ergänzen.

#### D-2 [MITTEL] CHANGELOG „Neues App-Symbol" beschreibt die Scheibe, Vorgabe ist Dunkelgrün

**Reproduziert** (Prüfsummen, Bilddateien angesehen).

`CHANGELOG.md:11`: „Das P² liegt jetzt auf einer Glasscheibe, die sich mit
Lichtkante und weichem Schatten vom Verlauf abhebt."

Das beschreibt `mobile/assets/icons/scheibe.png` (Verlaufsscheibe auf
Sandgrund). Die Vorgabe — was ohne Zutun auf dem Startbildschirm steht — ist
`mobile/assets/icon.png`, und die ist byteidentisch mit
`mobile/assets/icons/dunkel.png` (SHA-256 `b92d6268…`, 99 506 Byte): ein
dunkelgrünes Quadrat mit einem Verlaufsring und dem Verlaufs-P². Belegt durch
`mobile/app/(visitor)/settings/account.tsx:109` (`haupt: true` für „Dunkel")
und `tests/icon-switcher.test.js:33-38` („tragen das dunkelgrüne als
Vorgabe"). Der Eintrag zur Auswahl (`CHANGELOG.md:15`, „vier Gestaltungen —
dunkelgrün, heller Ring, Sand und Scheibe") stimmt mit `account.tsx:109-112`
und `app.json:57-76` überein.

**Empfehlung:** Den Eintrag Z. 11 auf das dunkelgrüne Symbol umschreiben und
die Scheibe als eine der vier Wahlmöglichkeiten nennen.

#### D-3 [MITTEL] `design/logo/README.md` beschreibt einen Stand, den es nicht mehr gibt

**Reproduziert** (PNG-Kopfzeilen und Prüfsummen).

- `:59-73` („Die drei iOS-Erscheinungen … stehen in `app.json` als Objekt —
  **nicht** als einzelner Pfad"): falsch seit `729bfa0`, siehe D-1.
- `:82` (`icon.png` = „Fassung 8, Alpha entfernt"): `icon.png` ist
  `icons/dunkel.png`; Fassung 8 (`8-quadratisch-1024.png`, SHA `f732c123…`)
  ist ein anderes Bild. Die vier Auswahlsymbole unter `mobile/assets/icons/`
  (`dunkel`, `ring`, `sand`, `scheibe`) kommen in keiner der beiden
  Logo-READMEs vor.
- `:22-26` („P² — das aktuelle App-Icon: Eine Glasscheibe auf dem
  Marken-Verlauf"): beschreibt die Scheibe, nicht die Vorgabe (D-2).
- Was stimmt: `icon-tinted.png` ≡ Fassung 3 (SHA `2185afe8…`),
  `android-icon-foreground.png` ≡ Fassung 5 (`2f20af7e…`),
  `android-icon-monochrome.png` ≡ Fassung 7 (`ad33ca7d…`); `icon.png` und
  `icon-dark.png` sind RGB ohne Alphakanal (Farbtyp 2), wie `:75` verlangt;
  `favicon.png` 48 × 48. `design/logo/varianten/README.md` beschreibt nur die
  Vorlagen und ist in sich stimmig.

**Empfehlung:** Abschnitt „Die drei iOS-Erscheinungen" streichen oder als
„derzeit nicht aktiv" kennzeichnen; Tabelle der abgeleiteten Symbole um die
vier Auswahlsymbole ergänzen und `icon.png` richtig zuordnen.

#### D-4 [HOCH] `TECH.md` auf Stand 3. August

**Reproduziert** (Zählungen im Repo, `npm audit`).

| Zeile | Aussage | Richtiger Wert am 26.09. |
|---|---|---|
| `:3` | Stand 3. August 2026, Build 26 | Letzter CHANGELOG-Abschnitt 1.0.0 (33) vom 14.09.; danach 29 Commits. Die Build-Nummer kommt aus App Store Connect (`.github/scripts/asc-build-number.py`), sie steht nirgends im Repo — TECH.md sollte sie nicht führen oder auf den CHANGELOG verweisen |
| `:26` | TanStack Query 5.101 | `^5.102.8` (`mobile/package.json:17`) |
| `:56`, `:187` | 36 direkte Abhängigkeiten | 37 — `expo-alternate-app-icons` kam mit `729bfa0` dazu (`package.json:19`) |
| `:58-60` | „Expo-Module (20)", Liste mit 19 Namen | 21 Pakete mit Präfix `expo` (inkl. `expo` selbst); in der Liste fehlen `expo-alternate-app-icons` und `@expo/metro-runtime` |
| `:78-81` | `npm audit`: 14 Hinweise, zwei hoch | **0 Hinweise** in 664 Paketen (gemessen 26.09. gegen `mobile/package-lock.json`, ohne Installation). Der Absatz ist überholt und sollte das Datum der Messung tragen |
| `:102-105` | Zwölf Collections | Dreizehn: `store_secrets` fehlt (`pocketbase/pb_migrations/1782690000_store_secret_collection.js:40`) |
| `:184` | App-Quelltext rund 7.800 Zeilen | 9.637 Zeilen (`mobile/app`, `mobile/components`, `mobile/lib`) |
| `:185` | Backend rund 2.300 Zeilen | 1.455 Zeilen Hooks; 3.041 inkl. Migrationen — die Zahl 2.300 passt zu keiner der beiden Lesarten |
| `:188` | 172 Commits | 302 |
| `:186` | 23 Bildschirme | stimmt (23 `.tsx` in `mobile/app/` ohne `_layout`) |

Stimmig: TypeScript `~6.0.3`, React Native 0.86.3, React 19.2.3, Expo SDK 57,
Expo Router 57, PocketBase 0.22.21 (`pocketbase/Dockerfile:16`), Node 22
(`mobile/.nvmrc`), iOS 16.4 (`mobile/ios/Podfile:25`), Hellmodus
(`app.json:10`), Bundle-ID, Schema `pp`, Adaptive Icon mit Monochrom-Ebene,
Cron-Tabelle (`cron.pb.js:16, 59, 102, 162`), die drei Endpunkte
(`scan.pb.js:35`, `push.pb.js:25, 53`), „Kein SSH aus der CI" (kein Treffer
in `.github/`), „nur noch `pb_data`" (`docker-compose.portainer.yml:37-49`),
`pocketbase` exakt 0.22.1. **Nicht aus dem Repo belegbar:** Android minSdk 24 /
targetSdk 36 — es gibt weder `expo-build-properties` noch einen
`android/`-Ordner; die Werte sind die SDK-57-Vorgaben, aber nirgends
festgeschrieben.

**Was im Steckbrief fehlt** (alles seit 15.09.): E-Mail-Bestätigung nach der
Registrierung, Passwort zurücksetzen, Konto löschen (`mobile/lib/hooks/useAuth.ts:52-56, 83-85, 131-149`);
der Mailversand als Betriebsvoraussetzung der Instanz (`docs/deploy.md:195-215`);
die Webseite samt Konto-Seite (`web/`); die vier Android-Mitteilungskanäle
(`mobile/lib/push.ts:20-56`); die Wahl des App-Symbols; unter „Datenschutz
nach Bauart" (`:166-176`), dass beim Check-in nur noch der Abstand gespeichert
wird (`pocketbase/pb_hooks/lib/points.js:325-329`).

**Empfehlung:** TECH.md auf den Stand des Release bringen und die Zählwerte mit
dem Kommando daneben notieren, mit dem sie entstanden sind — sonst veralten
sie beim nächsten Commit erneut.

#### D-5 [MITTEL] `README.md` Datenschutz: Koordinaten werden nicht mehr gespeichert

**Aus Code gelesen.** `README.md:204`: „Beim Check-in: Koordinaten und Abstand
zum Laden, sofern die Berechtigung erteilt wurde." Seit `23c5d65` (16.09.)
schreibt `doCheckin` nur noch `gps_distance_m`
(`pocketbase/pb_hooks/lib/points.js:325-329`, Kommentar: „die genauen
Koordinaten werden bewusst nicht gespeichert"); `docs/openapi.yaml:137-146`
sagt es richtig. Der Datenschutz-Abschnitt des README ist die öffentlich
verlinkbare Erklärung — er behauptet mehr Speicherung, als stattfindet. Zum
Vorteil der Nutzer:innen, aber falsch; `README.md:228` trägt „Stand: August
2026".

**Empfehlung:** Zeile auf „Abstand zum Laden" ändern, Stand-Datum anheben.

#### D-6 [MITTEL] `README.md` Funktionen: ×1,5 gibt es nicht mehr, neue Funktionen fehlen

**Aus Code gelesen.**

- `README.md:70`: Faktoren „auf ×1,5, ×2 oder ×3" — die Auswahl ist
  `[1, 2, 3]` (`mobile/app/(visitor)/admin/actions.tsx:16-17`), CHANGELOG
  1.0.0 (33) hat es unter „Aktions-Faktoren nur noch ×1, ×2, ×3" festgehalten.
- `README.md:48-49`: Filter „nach Zielgruppe, Art, Größe und Aufbewahrung" —
  dazu kamen „Neu (14 Tage)" und „Nur Schaufenster"
  (`mobile/app/(visitor)/store.tsx:30, 325-333`).
- Es fehlen: Passwort vergessen (`mobile/app/(auth)/login.tsx`), Konto löschen
  und E-Mail-Bestätigung (`settings/account.tsx:346-378, 465-528`), Wahl des
  App-Symbols (`account.tsx:411-413`), die Webseite (`web/`).
- `README.md:141-160` (Aufbau): `web/`, `tests/`, `docs/audit/` fehlen im Baum;
  `docs/` ist als „API-Beschreibung und Auslieferung" beschrieben, enthält aber
  auch die Audits und das Archiv.

#### D-7 [MITTEL] `README.md` Startanleitung

**Aus Code gelesen.**

- `README.md:126-127`: „Die Zugangsdaten kommen aus `pocketbase/.env.secrets`
  (nicht im Repository)." `docker-compose.yml` hat keine `env_file`-Anweisung;
  der Schlüssel wird als `${PB_ENCRYPTION_KEY}` aus der Umgebung gelesen
  (`docker-compose.yml:22`). `.env.secrets` steht zwar in `.gitignore:12`,
  wird aber von nichts geladen — wer dem README folgt, startet einen Container
  ohne Schlüssel. `CLAUDE.md:60-61` sagt es richtig („erwartet
  `PB_ENCRYPTION_KEY` aus der Umgebung").
- `README.md:112-117`: `npx expo start --dev-client`, „Erfordert ein
  installiertes Dev-Client-Build." `CLAUDE.md:47-51` und `mobile/package.json:7`
  nennen `npm start` = `expo start --go` als Normalweg und `--dev-client` nur
  „für Entwicklungs-Builds mit nativen Modulen". Beides ist gültig, das README
  verschweigt den einfacheren Weg.

**Empfehlung:** README an CLAUDE.md angleichen; entweder `env_file` in die
Compose-Datei aufnehmen oder den Satz zu `.env.secrets` streichen.

#### D-8 [MITTEL] CHANGELOG Unreleased führt „Geändert" und „Behoben" je zweimal

**Reproduziert** (`grep -n '^### ' CHANGELOG.md`). Überschriften im
Unreleased-Block: `### Geändert` (`:9`), `### Neu` (`:14`), `### Behoben`
(`:24`), `### Geändert` (`:28`), `### Behoben` (`:32`). Keep a Changelog
verlangt jede Rubrik einmal je Version; CLAUDE.md schreibt es vor. Derselbe
Befund war am 14.09. als M-4 (`ci-deploy.md`) geführt und mit `3d93029`
behoben — im neuen Block ist er nach vier Tagen wieder da.

**Empfehlung:** Auf Neu / Geändert / Behoben zusammenführen (Reihenfolge nach
Keep a Changelog: Neu vor Geändert).

#### D-9 [MITTEL] CHANGELOG-Vollständigkeit

**Reproduziert** (`git log 38b3725..HEAD`, Tabelle unten).

1. **`e16ab56` fehlt.** „fix(app): Groessenliste im Laden an alle Filter
   binden" (`mobile/app/(visitor)/store.tsx`, 15.09.) ist ein nutzerrelevanter
   Fehler — die Größenliste im Laden-Tab folgte nicht den übrigen Filtern —
   und hat keinen Eintrag; der Commit hat `CHANGELOG.md` nicht angefasst.
2. **`48b697c` fehlt, und dadurch ist Abschnitt 1.0.0 (33) falsch.**
   `CHANGELOG.md:90` sagt: „Weiße Schrift auf den farbigen Knöpfen war zu
   blass … Die Knopffläche ist jetzt satter, die Schrift bleibt weiß." Der
   Revert `48b697c` (14.09., nach `38b3725`) hat den abgedunkelten Verlauf
   samt Tokens `tealDeep`/`mintDeep`/`skyDeep`/`gradientOnDark` wieder
   entfernt; `mobile/components/ui/PPButton.tsx:117` nutzt `PP.gradient`.
   Der zweite Satzteil (Feld-Beschriftungen, Platzhalter, Zeitangaben
   aufgehellt — `ink3` von `#9AA8A7` auf `#657473`, `theme.ts:42`) gilt
   weiter. Der Eintrag beschreibt also ein halb zurückgenommenes Verhalten
   ohne Hinweis.
3. **`262abfd` schreibt in den geschlossenen Abschnitt.** Der Eintrag
   „+10 Punkte bei einem Sprung um 510" (`:170`) wurde nach dem Abschluss
   `38b3725` in 1.0.0 (33) eingefügt statt unter Unreleased. Ob Build 33 die
   Änderung enthält, ist aus dem Repo nicht zu entscheiden. NIEDRIG für sich,
   hier mitgeführt.

#### D-10 [NIEDRIG] CHANGELOG-Ton

**Reproduziert** (`grep`). Der Unreleased-Block hält die Regeln aus CLAUDE.md
ein (keine Dateinamen, keine Framework-Namen, keine Build-Nummern). Dagegen:
`:215` `RECORD_AUDIO`; `:218` „Expo SDK 54 → 57 … React Native von 0.81 auf
0.86, React auf 19.2"; `:219` „Expo SDK 56"; `:220` „API 36"; `:242`
„PocketBase-JS-SDK … 0.26 … 0.22"; `:247` `points_total`, `awardPoints()`,
`pb_hooks/lib/points.js`; `:259` „Expo SDK 54 + PocketBase". Die alten
Abschnitte (Juni) stammen von vor der Regel; der Sonstiges-Block von (33)
dehnt sie bewusst. Kein Handlungsbedarf für alte Abschnitte, für (33) eine
Formulierungsfrage.

#### D-11 [MITTEL] `CLAUDE.md` beschreibt die Auslieferung von Hand

**Aus Code gelesen.** `CLAUDE.md:145-147`: „Die Instanz unter
`/opt/stacks/plietsche-pb/` hat **kein Git-Arbeitsverzeichnis** — Hooks und
Migrationen werden von Hand kopiert." `:153-154`: „Nach jedem Eingriff an
`pb_hooks/` oder `pb_migrations/`: Stand des Servers abgleichen (Prüfsummen der
Dateien …)". Seit `f810a9e`/`cd20634` (14.09.) gilt: Abbild aus
`pocketbase/Dockerfile`, Auslieferung bei jedem Push auf `main`, Verify durch
`.github/scripts/deploy-verify.py`; die Verzeichnisse `pb_hooks/` und
`pb_migrations/` auf dem Host sind entfernt (`docs/deploy.md:139-141`,
`TECH.md:129-143`). Dazu `CLAUDE.md:21`: „`docker-compose.yml` (Deployment
hinter Traefik)" — in Produktion läuft `docker-compose.portainer.yml`
(`docker-compose.yml:5-8`). Der Absatz ab `:144` ist als Lehre aus dem
September richtig, als Arbeitsanweisung veraltet: Wer ihr folgt, kopiert in
Verzeichnisse, die nicht mehr gemountet sind, und hält das für ein Deploy.

**Empfehlung:** Den Absatz auf den neuen Weg umschreiben (Push auf `main` →
Verify lesen) und den Vorfall als Begründung stehen lassen.

#### D-12 [MITTEL] `docs/deploy.md`: innere Widersprüche, Hostnamen, `~/.claude`

**Reproduziert** (GitHub-API: `"private": false`).

- `:134` „Das GHCR-Paket ist öffentlich, weil das Repository öffentlich ist"
  gegen `:145` „Das Repo ist privat, das Abbild landet unter …". Das Repo ist
  öffentlich. Schritt 1 der Anleitung (`:145-149`) beschreibt damit eine
  Entscheidung, die nicht ansteht.
- `:3` „Stand: 14.09.2026", der Abschnitt „Mailversand" (`:195-215`) kam mit
  `916cfcf` am 16.09.
- `:204-206`: SMTP-Host `server.godsapp.de:587`, Postfach
  `noreply@plietsche-plünn.de`, Zugangsdaten „in `~/.claude/secrets.env`".
  Keine Zugangsdaten im Repo — aber ein Server-Hostname mit Port und der
  Verweis auf ein Verzeichnis eines KI-Werkzeugs auf einem privaten Rechner.
  Das ist für niemand anderen reproduzierbar und passt nicht zu CLAUDE.md
  („Keinerlei Hinweis auf Claude"). Gemeldet, wie CLAUDE.md es verlangt.
- `:69`: „Hennstedt-Seite" — Verweis auf ein anderes Projekt, das im Repo
  nicht vorkommt; für Außenstehende unverständlich.

Stimmig: Hook-Liste (sechs Dateien, `deploy.yml:100-105`), Untergrenze 19
Migrationen (`deploy.yml:119-120`; es sind 20), die fünf Verify-Prüfungen
(`deploy-verify.py:55-72`), Geheimnisse-Tabelle, absoluter `pb_data`-Pfad
(`docker-compose.portainer.yml:48`).

#### D-13 [MITTEL] `web/konto.html` und `web/nginx-konto.conf` sind nirgends dokumentiert

**Reproduziert** (`grep -n "konto" web/README.md docs/deploy.md README.md` →
kein Treffer). `fef88d6` (18.09.) hat die Bestätigungsseite und eine
nginx-Konfiguration hinzugefügt; `pocketbase/mail-vorlagen.py:11-15` erklärt,
dass PocketBase-`appUrl` auf die Webseite zeigt und `/_/#/auth/confirm-…` dort
landet. `web/README.md` beschreibt nur `index.html` und das Symbol
(`:1-45`); `docs/deploy.md` „Mailversand" nennt SMTP und Vorlagen, aber nicht,
dass ohne die Konto-Seite und die nginx-Regel (`nginx-konto.conf:14-21`) jeder
Bestätigungslink ins Leere läuft. Auch `mail-vorlagen.py` selbst — wie es
eingespielt wird — steht nirgends.

**Empfehlung:** In `web/README.md` beide Dateien, ihr scp-Ziel und die
nginx-Einbindung nachtragen; in `deploy.md` „Nach einer Neuinstallation zu
prüfen" um `appUrl` und die Konto-Seite ergänzen.

#### D-14 [MITTEL] SSH-Ziel und Produktions-Hostnamen im Repo

**Reproduziert** (`grep`). `web/README.md:19-20`: `scp web/index.html
root@server.godsapp.de:/opt/stacks/plietsche-web/site/` — Nutzer `root` plus
Hostname ist die Angabe eines SSH-Zugangs (ohne Schlüssel). CLAUDE.md
(`:211-216`) verbietet SSH-Zugänge im Repo. Hostnamen ohne Zugangsdaten:
`docs/openapi.yaml:76`, `docker-compose.yml:10, 50`,
`docker-compose.portainer.yml:2, 77`, `docs/deploy.md:5, 175, 204-205, 228`,
`web/README.md:3-4, 35, 57-59`, `web/konto.html:116`, `mobile/.env.example:2`.
Die App-Domain muss die App kennen; `server.godsapp.de` (Host mit Authentik,
Nextcloud, Portainer laut `docker-compose.portainer.yml:58`) müsste sie
nicht. Grenzwertig, hiermit gemeldet; die Entscheidung liegt beim Betreiber.

#### D-15 [NIEDRIG] `design/HANDOFF.md` ohne Archiv-Kennzeichnung

**Aus Code gelesen.** Das Briefing vor der Umsetzung, nie als historisch
markiert (anders als `docs/archiv/AUFTRAG-GRUNDLAGEN.md:1-10`). Widersprüche
zum heutigen Stand: „Kirchengemeinde Lokstedt" (`:9`) — der Laden ist in
Hennstedt (`README.md:192`, `web/index.html:6, 153, 186`); `zustand` (`:31`,
`:706`) gegen CLAUDE.md „keine eigene Client-State-Bibliothek"; Expo SDK 51+
(`:29`) gegen 57; `POST /api/scan` (`:346`, `:454`) gegen `/api/pp/scan`;
`(staff)`-Gruppe (`:58-67`, `:458`) gegen `(visitor)/admin`; Cronjobs
`streak-reminder`/`season-badges` (`:425`, `:438`), die es nicht gibt; ein
einzelner `campaigns.multiplier` (`:218`) gegen drei Faktoren; „Crash-Reporting
via Sentry (optional)" (`:541`) gegen „Kein Tracking"; `EXPO_PUBLIC_PB_URL=
https://pb.plietschepluenn.de` (`:713`) gegen `mobile/.env.example`.

**Empfehlung:** Nach `docs/archiv/` verschieben oder eine Kopfnotiz wie in
AUFTRAG-GRUNDLAGEN setzen.

#### D-16 [NIEDRIG] `docs/openapi.yaml`

**Reproduziert** (YAML geparst; alle vier `$ref`-Ziele vorhanden; `required`
⊆ `properties` in allen Schemata; `const` und `license.identifier` sind
gültiges OpenAPI 3.1). Gegen den Code:

- `:152-153` „Wird nur beim Check-in über den Türcode ausgewertet" — die
  Obergrenze wird vor der Verzweigung geprüft (`scan.pb.js:71-74`), ein
  Teile-Scan mit `items_count` über `max_items_take` bekommt ebenfalls 400.
  Beim Teile-Scan wird der Wert dann verworfen (`:143`, `itemsCount: 0`). Die
  Beschreibung sollte das nennen.
- `:29-33, 41-47, 56-60, 66-68, 110-113`: fünf Absätze „Behoben am
  14.09.2026". Das ist Änderungshistorie in einer Schnittstellenbeschreibung;
  sie gehört in den CHANGELOG, die Spezifikation beschreibt den Ist-Stand.
- `:76` Produktions-Host als `servers`-Eintrag (siehe D-14).
- Der Rückfall auf `store.checkin_qr_secret` (`scan.pb.js:60-67`) ist nicht
  dokumentiert — vertretbar, weil er nur für nicht migrierte Instanzen gilt.

Sonst stimmig: Alle drei `routerAdd`-Routen dokumentiert; Fehlertexte
wortgleich (`Kein QR-Code` `:42`, `Du bist nicht im Laden` `points.js:690`,
`Höchstens N Teile pro Besuch.` `:73`, `Nicht angemeldet` `:38`, `Unbekannter
QR-Code` `:125`, `Schon mitgenommen` `:127`, `Nicht mehr verfügbar` `:128`,
`Noch nicht freigegeben` `:132`, `Laden nicht konfiguriert` `:53`, `Kein Token`
`push.pb.js:31`, `Ungueltiger Token` `:17`); Antwortfelder beider Formen
vollständig (`scan.pb.js:97-104, 110-117, 165-174`); Token-Muster identisch
(`push.pb.js:14`); `platform`-Regel (`:45`); Bearer-Schema mit globalem
`security`. Die Codes 403 und 429 kommen im Code nicht vor und fehlen zu Recht.

#### D-17 [NIEDRIG] Veraltete Kommentare im Code

**Aus Code gelesen** (Stichprobe `pb_hooks/`, `mobile/lib/`, `mobile/app/_layout.tsx`).

| Stelle | Kommentar | Was nicht mehr stimmt |
|---|---|---|
| `mobile/app/_layout.tsx:139` | `{/* (staff) group is added in P2 */}` | Phasenplan aus HANDOFF; es gibt keine `(staff)`-Gruppe, Team- und Admin-Ansichten liegen unter `(visitor)/admin` und `(visitor)/items` |
| `mobile/lib/format.ts:194, 204, 227` | Beispiele mit „×1,5" | Der Faktor 1,5 ist entfernt (`actions.tsx:16-17`, CHANGELOG (33)) |
| `pocketbase/pb_hooks/lib/points.js:10` | `selfEntryBonus: 10, // extra per self-entered (approved) item` | Wird nirgends gelesen (`grep -rn selfEntryBonus pocketbase tests` → nur die Definition); beschreibt eine Regel, die es nicht gibt |
| `pocketbase/pb_hooks/lib/push.js:26-27` | „genauso wie die Opt-in-Zuordnung oben" | Die Zuordnung steht unten (`:41-45` und `:88-92`) |
| `pocketbase/pb_hooks/defaults.pb.js:76-78` | „Visitors can never self-approve because updateRule is staff-only" | Trifft zu, verschweigt aber, dass der Schutz nur eine Regel tief ist (Z-5, weiter offen) |

Unauffällig: Kopfkommentare von `scan.pb.js`, `cron.pb.js`, `push.pb.js`;
`useAuth.ts`, `queryClient.ts`, `errors.ts`, `push.ts`, `theme.ts`,
`Text.tsx:18-26` (beschreibt B-10 richtig als behoben).

#### D-18 [NIEDRIG] Kein Git-Tag, kein Tag-Schema

**Reproduziert** (`git tag`, `git ls-remote --tags`). Lokal kein Tag, remote
nur `pre-redesign`. `CLAUDE.md:201` „Git-Tags ohne `v`-Präfix, nach dem Schema
des Repos" — es gibt kein Schema, und 1.0.0 (33) ist nicht getaggt. Der
Release-Abschnitt lässt sich nur über den Commit `38b3725` abgrenzen.

**Empfehlung:** `1.0.0-33` auf `38b3725` setzen (oder `1.0.0+33`, dann in
CLAUDE.md festhalten) und künftig beim Schließen eines Abschnitts taggen.

#### D-19 [NIEDRIG] `docs/archiv/AUFTRAG-GRUNDLAGEN.md:14` nennt das Repo „privat"

Historisch richtig, heute falsch (siehe D-12). Die Datei ist als erledigt
gekennzeichnet (`:1-10`); ein Satz in der Kopfnotiz genügt. `:35` „16
Migrationen" (heute 20) und `:3` „86 Tests" (heute 470) sind als Momentaufnahme
erkennbar.

### Tabelle: CHANGELOG ↔ Commits seit dem Abschluss von 1.0.0 (33)

`git log --format='%h %s' 38b3725..HEAD` — 29 Commits.

| Hash | Betreff | CHANGELOG |
|---|---|---|
| `06b68dc` | feat(app): Symbolauswahl bleibt als Funktion | erfasst (`:15`) |
| `4d5555b` | test(scan): Tagesgrenze in der Ladenzeitzone statt lokal | nicht nutzerrelevant |
| `e215e1b` | fix(app): Symbol-Vorschauen kleiner, Rahmen ohne schwarze Kanten | erfasst (`:15`, umformuliert) |
| `729bfa0` | feat(app): Umschalter fuer drei Symbol-Entwuerfe | erfasst (`:15`); **entfernt zugleich Dunkel/Tinted, siehe D-1** |
| `fef88d6` | feat(mail): gestaltete Systemmails und eigene Bestaetigungsseiten | erfasst (`:17`) |
| `2bed59a` | feat(auth): Bestaetigungsmail nach der Registrierung | erfasst (`:16`) |
| `01ddb46` | design: App-Symbol in allen neun Erscheinungen | erfasst (`:12`) — **inzwischen falsch, D-1** |
| `6899fc0` | design: App-Symbol in groesserem Schnitt, Quelle jetzt als SVG | erfasst (`:11`) |
| `3f513e6` | design: Glaslinse mit P hoch 2 als App-Symbol | erfasst (`:11`) — **beschreibt nicht die Vorgabe, D-2** |
| `a455733` | design: P2 nebeneinander im Ring, in Work Sans Black | erfasst (`:11`, zwischenzeitlich) |
| `4d0ce4e` | design: abgeleitete Zeichen auf die neue Fassung ziehen | nicht nutzerrelevant (nur `web/README.md`) |
| `9325cd4` | design: kraeftigere Fassung des App-Symbols | erfasst (`:11`) |
| `916cfcf` | docs(deploy): Mailversand der Instanz festhalten | nicht nutzerrelevant |
| `f8f6188` | feat(auth): Passwort zuruecksetzen und Konto loeschen | erfasst (`:18-19`) |
| `23c5d65` | feat(scan): Koordinaten beim Check-in nicht mehr speichern | erfasst (`:10`) |
| `a39a931` | design: neues App-Symbol einsetzen | erfasst (`:11`) |
| `cfb2a6c` | feat(push): Android-Kanaele je Kategorie, Dringlichkeit auf iOS | erfasst (`:22`, `:30`) |
| `e16ab56` | fix(app): Groessenliste im Laden an alle Filter binden | **FEHLT** (D-9) |
| `7dd855c` | feat(app): Filter "Neu" und "Schaufenster" im Laden-Tab | erfasst (`:20-21`) |
| `31606f1` | fix(app): Schaufenster-Knopf farblich richtig herum, Pfeil entfernt | erfasst (`:26`, `:29`) |
| `61ad0db` | docs: Store-Auslieferung beschreiben, inkl. Entwurf vs. Freigabe | nicht nutzerrelevant |
| `1c47621` | feat(ci): Freigabestatus und Produktionsspur fuer Google Play waehlbar | nicht nutzerrelevant (CI) |
| `3d1fa5b` | design: Arbeitsfassungen von Zeichen und Verlauf fuer Illustrator | nicht nutzerrelevant |
| `81b1eff` | fix(ui): Absturz jeder Ansicht mit einem Schalter beheben | erfasst (`:34`) |
| `566593c` | docs(audit): Befunde 5-10 und zwei tests.md-Zeilen nachziehen | nicht nutzerrelevant |
| `8a72ddc` | test: awardPoints, recomputeTotal und den erlaubten Schaufenster-Fall | nicht nutzerrelevant |
| `48b697c` | revert(a11y): Knöpfe zurueck auf den hellen Markenverlauf | **FEHLT** — Rücknahme von `:90` ohne Eintrag (D-9) |
| `262abfd` | feat(scan): Punkte aus Abzeichen als eigenes Feld bonus_points ausweisen | erfasst, aber im geschlossenen Abschnitt (`:170`, D-9) |
| `dbac183` | docs(audit): M-4 nachziehen, CHANGELOG-Block ist geschlossen | nicht nutzerrelevant |

**Umgekehrte Richtung — CHANGELOG-Aussagen gegen den Code:** „vier
Gestaltungen … dunkelgrün, heller Ring, Sand und Scheibe" stimmt
(`account.tsx:109-112`, `app.json:60-73`). „Konto löschen: … Punktestand,
Serie, Abzeichen und Besuche werden dabei gelöscht; Teile … bleiben dort ohne
Bezug zur Person" stimmt: `visits`, `points_log`, `user_badges`,
`push_devices` und `action_counts` hängen mit `cascadeDelete: true` am Konto
(`1700000000_init_schema.js:148, 180, 249, 278`, `1700001000_action_counts.js:27`),
`items.created_by` hat `cascadeDelete: false` und ist nicht `required`
(`init_schema.js:92-94`) — PocketBase löst den Verweis beim Löschen. **Aber:**
Das Löschen läuft über `users.deleteRule`, und die ist in keiner Migration
gesetzt (Z-1, unverändert); sie existiert nur auf der Instanz. „Neu (14
Tage)" stimmt (`store.tsx:30`). „Mitteilungen auf Android einzeln einstellen"
stimmt (`push.ts:20-56`, vier Kanäle, `_layout.tsx:40`).

### Tabelle: `docs/openapi.yaml` ↔ Routen in `pocketbase/pb_hooks/`

`grep -n routerAdd pocketbase/pb_hooks/*.js` — drei Routen, keine weitere.

| Route (Code) | Dokumentiert | Codes im Code | Codes in der Doku | Abweichung |
|---|---|---|---|---|
| `POST /api/pp/scan` (`scan.pb.js:35`) | ja (`:91-272`) | 200, 400, 401, 404, 409, 410, 500 | 200, 400, 401, 404, 409, 410, 500 | `items_count`-Grenze auch beim Teile-Scan (D-16); Rückfall aufs Altfeld nicht genannt |
| `POST /api/pp/push/register` (`push.pb.js:25`) | ja (`:274-335`) | 200, 400, 401 | 200, 400, 401 | keine |
| `POST /api/pp/push/unregister` (`push.pb.js:53`) | ja (`:337-381`) | 200, 400, 401 | 200, 400, 401 | keine |

Record-Hooks (`defaults.pb.js`) und Cronjobs (`cron.pb.js`) sind keine
Routen und zu Recht nicht in der Spezifikation. Die Web-Seite `web/konto.html`
ruft ausschließlich PocketBase-Standardrouten (`confirm-verification`,
`confirm-email-change`, `confirm-password-reset`, `konto.html:153, 180, 212`).

### Geprüft und in Ordnung (Teil 1)

- `docs/push-channels.md` gegen `mobile/lib/push.ts:20-56` und
  `pocketbase/pb_hooks/lib/push.js:19-24`: Kennungen, Namen, Wichtigkeiten und
  `interruptionLevel` stimmen an allen drei Stellen überein; Kanäle werden beim
  App-Start angelegt (`_layout.tsx:40`), wie beschrieben.
- `docs/store-release.md` gegen `.github/workflows/release.yml:20-53` und
  `play-internal.yml:21-52`: Eingaben `version`, `plattformen`, `freigabe`
  (`completed`/`draft`), `hinweis`; Spuren `internal`/`alpha`/`beta`/`production`;
  Probelauf — deckungsgleich.
- `docs/deploy.md` Ablauf, Hook-Liste, Migrationszahl, Verify-Prüfungen,
  Geheimnisse (siehe D-12 für die Ausnahmen).
- `README.md` Links: `docs/deploy.md`, `docs/store-release.md`, `TECH.md`,
  `CHANGELOG.md`, `LICENSE` existieren; `mobile/assets/icon.png` existiert.
- `TECH.md` Stack-Versionen, Cron-Tabelle, Endpunkte, Plattform-Bundle,
  „Kein Tracking" (kein Sentry/Analytics-Paket in `package.json`).
- `design/logo/varianten/README.md` gegen die neun PNGs: Maße 1024 × 1024,
  Fassung 3/5/7 mit Alpha, wie beschrieben.
- Die 470 Tests laufen grün (`npm test`, 26.09.).

### Unklar / zu klären (Teil 1)

- **Fotomediathek-Berechtigung** (`TECH.md:162`): `app.json` trägt keinen
  `NSPhotoLibraryUsageDescription` und keinen Plugin-Eintrag für
  `expo-image-picker` (`app.json:14-18, 35-77`). Der Dialogtext kommt dann aus
  der Bibliothek, auf Englisch. Das ist kein Doku-Fehler, sondern ein
  App-Befund — gehört zum App- oder A11y-Durchgang.
- **Android minSdk/targetSdk** (`TECH.md:42`, `README.md:96`): aus dem Repo
  nicht belegbar (kein `expo-build-properties`, kein `android/`).
- **Build 33 und `262abfd`**: Ob der TestFlight-Build 33 `bonus_points`
  enthält, entscheidet sich in App Store Connect, nicht im Repo.
- **Store-Stand** (`TECH.md:198-199`, `store-release.md:290-291`): „versionCode
  1 in `internal`" ist eine Aussage über Google Play, nicht prüfbar.

---

## Teil 2 — Stand der Altbefunde

Grundlage: `docs/audit/ABNAHME.md` (Stand 14.09.2026, Code `05387b6`, danach
am selben Tag mehrfach nachgezogen). Seit `05387b6` sind 71 Commits
entstanden (`git log 05387b6..HEAD`). Geprüft am HEAD `06b68dc`. Zustände am
14.09. sind die der Tabellen in ABNAHME.md; wo der Text unter der Tabelle
schon weiter war (Nachtrag), steht es in der Spalte.

### Tabelle aller nachgeprüften Befunde

Legende Beleg: **R** = reproduziert (Kommando/Test ausgeführt), **C** = aus
Code gelesen.

#### `backend.md`

| Nr. | Kurztitel | 14.09. | Heute | Beleg |
|---|---|---|---|---|
| 1 | Türgeheimnis unangemeldet im Netz (KRITISCH) | BEHOBEN | **keine Regression** | R: `store-secret-migration.test.js` grün; C: `1782690000_store_secret_collection.js:40-50` (fünf Regeln `null`), `:87-89` (`store` angemeldet), `scan.pb.js:62-67` |
| 1b | Rotation des Codes | BEWUSST OFFEN | **weiter bewusst offen** | Betreiberentscheidung, kein Code-Bezug |
| 2 | Tageswechsel um 02:00 (KRITISCH) | BEHOBEN | **keine Regression, zusätzlich getestet** | R: `timezone.test.js`, `scan.test.js` (`4d5555b`, 19.09.: Tagesgrenze in der Ladenzeitzone) grün; C: `points.js:113-123` |
| 3 | Ohne GPS kein Geofence (HOCH) | BEWUSST OFFEN | **weiter bewusst offen** | C: `points.js:685-691` — `assertInGeofence` gibt ohne `lat`/`lng` `null` zurück; Begründung hängt an Befund 1, der behoben ist |
| 4 | Serie über KW 53 (HOCH) | BEHOBEN | **keine Regression** | R: `streak.test.js`, `cron.test.js:127-193` grün; C: `points.js:440-459` |
| 5 | Stärkste Aktion (MITTEL) | BEHOBEN | keine Regression | C: `points.js:160, 178-191` (`campaignBestMult`) |
| 6 | Gestufte Aktions-Abzeichen, Rest | BEWUSST OFFEN (Rest) | **weiter bewusst offen** | C: `cron.pb.js:116-127` (`continue` überspringt Abschnitt b); R: `cron.test.js:892` hält den Ist-Stand fest |
| 7–10 | tiers_json, bonus_points, Token-Form, Push-Wiederholung | BEHOBEN | keine Regression | C: `points.js:503-516`, `scan.pb.js:27-33, 101`, `push.pb.js:14-19`, `cron.pb.js:41-49`; R: 470 Tests grün |

#### `app.md`

| Nr. | Kurztitel | 14.09. | Heute | Beleg |
|---|---|---|---|---|
| 1 | Abmelden räumt Cache/Push-Token nicht auf (KRITISCH) | BEHOBEN, UNGETESTET | **behoben, weiter ungetestet** | C: `useAuth.ts:111-119` unverändert. `tests/account-delete.test.js` prüft dieselbe Reihenfolge für `deleteAccount` (`:33-70`), nicht für `logout` — das Muster für einen Quelltext-Test liegt jetzt vor |
| 2 | Freigeben aktualisiert Startseite nicht (HOCH) | BEHOBEN, UNGETESTET | behoben, ungetestet | C: `queryClient.ts:21-33` |
| 3 | Volunteer-Push scheitert (HOCH) | BEHOBEN, UNGETESTET | behoben, ungetestet | C: `admin/needs.tsx:37-38, 55, 173` (`canPush = isAdmin && !need`) |
| 4 | Englische SDK-Fehler (HOCH) | BEHOBEN, UNGETESTET | behoben, ungetestet | C: `lib/errors.ts`, `errorText` in 10 Screens, kein roher `e?.message` (grep) |
| 5 | `syncTotal` | BEHOBEN, UNGETESTET | behoben | C: kein Treffer für `syncTotal` in `mobile/` |
| 6 | Aktionen ändern → Aushang | BEHOBEN, UNGETESTET | behoben, ungetestet | C: `queryClient.ts:39-45`, `actions.tsx:13, 180` |
| 7 | Besucher lädt fremde Freigaben | an der Wurzel behoben | keine Regression | R: `read-rules-migration.test.js` grün; C: `1782710000_tighten_read_rules.js:81-104` |
| 8 | Scanner verwirft ersten Code | BEHOBEN, UNGETESTET | behoben, ungetestet | C: `scan.tsx:42-56` (3 s, `Promise.race`), `QRScanner.tsx:15-21` |
| 9 | „undefined Wochen Streak" | BEHOBEN, UNGETESTET | behoben, ungetestet | C: `scan.tsx:91, 182, 214` (`?? 0`) |
| 10 | Erfolgs-Hinweis überlagert | BEHOBEN, UNGETESTET | behoben, ungetestet | C: `admin/needs.tsx:60-72` (`onSaved` am OK-Knopf) |
| 11 | Kategorie-Schlüssel roh | BEHOBEN, UNGETESTET | behoben, ungetestet | C: `items/[id].tsx:15, 36-55, 100` |

Für `mobile/` gibt es weiterhin keine Laufzeit-Tests. Neu seit dem 14.09.
sind vier Quelltext-Tests (`account-delete`, `email-verify`, `icon-switcher`,
`worklet-purity`), die `.ts`/`.tsx`-Dateien als Text lesen — ein gangbarer
Weg für die Punkte 1, 2, 6 und 8.

#### `theme.md`

| Nr. | Empfehlung | 14.09. | Heute | Beleg |
|---|---|---|---|---|
| 1 | Deckkraft-Leiter | BEHOBEN, UNGETESTET | behoben; 3 `rgba()` außerhalb `theme.ts` (R: grep) | C: `theme.ts:65-88` |
| 2 | Rollen-Token | BEHOBEN, UNGETESTET | behoben; 3 Hex außerhalb (R: grep, vorher 5) | C: `theme.ts:25, 44, 48, 103-107, 111-117, 123-132` |
| 3 | 4er-Raster | BEHOBEN, UNGETESTET | behoben | C: `theme.ts:135-143` |
| 4 | Radien | BEHOBEN, UNGETESTET | behoben | C: `theme.ts:146-153` |
| 5 | Icon-Größen, `IconTile` | BEHOBEN, UNGETESTET | behoben; rohe `size={n}` an Icons: 2 (vorher 9) | C: `theme.ts:194-201, 213-215`; 7 Dateien nutzen `IconTile` |
| 6 | `PPText.size` als Stufen | BEHOBEN, UNGETESTET | behoben; 0 rohe Größen (R: grep) | C: `Text.tsx:10-16` |
| 7 | Plattformschicht | BEHOBEN, UNGETESTET | behoben | C: `radius()` in `PPButton.tsx:54`, `Pill.tsx:54`, `IconButton.tsx`; `isIOS`/`MD3_STATE`/`stateLayer` kein Treffer |
| 8 | `letterSpacing` skaliert | BEHOBEN, UNGETESTET | unverändert (nur CHANGELOG-Beleg) | — |
| 9 | Schatten/`glow` | BEHOBEN, UNGETESTET | behoben | C: `theme.ts:235-239` (`motion`), `glow` in `PPButton.tsx:123` |
| 10 | `PPTheme` | BEHOBEN, UNGETESTET | behoben | C: `theme.ts:242` (nur noch Kommentar) |

Teilweise getestet seit dem 14.09.: `tests/worklet-purity.test.js` (`81b1eff`)
verbietet Aufrufe der Theme-Hilfsfunktionen in Reanimated-Worklets — der
erste Test, der `theme.ts`-Nutzung absichert. Er entstand aus einem echten
Absturz nach der Zusammenführung (CHANGELOG `:34`).

#### `redundanz.md`

| Nr. | Befund | 14.09. | Heute | Beleg |
|---|---|---|---|---|
| 1 | Fünf Komponenten ohne Verwender | BEHOBEN, UNGETESTET | behoben | R: grep `GlassCard\|Toast\|ProgressBar\|ActivityRow` → kein Treffer |
| 2 | `campaignFactorsLabel` | BEHOBEN, UNGETESTET | behoben | C: `actions.tsx:14, 233-235` |
| 3 | `Motivation`-Typen exportiert | BEHOBEN, UNGETESTET | behoben | C: `format.ts:282, 293` (`interface` ohne `export`) |
| 4 | 16 ungenutzte Bezeichner (`tsc`) | BEHOBEN, UNGETESTET | **nicht prüfbar** — `tsc` braucht `mobile/node_modules`, das hier nicht installiert werden durfte | — |
| 5 | `tar`, `zustand` | BEHOBEN, UNGETESTET | behoben | C: `package.json:12-50` ohne beide |
| 6 | `unregisterPushToken` ohne Aufrufer | BEHOBEN, UNGETESTET | behoben | C: `useAuth.ts:113, 140` |
| 7 | Ungenutzte Exporte `theme.ts` | BEHOBEN (bis auf `PPTheme`) | **vollständig behoben** | C: `theme.ts:242` |
| 8 | `Role`, `BadgeKind` | BEHOBEN, UNGETESTET | behoben | C: `pb.ts:7, 38-41` |
| D1 | Faktoren in drei Fassungen | BEHOBEN, UNGETESTET | behoben | R: grep `campaignFactorRows` → kein Treffer |
| D2, D3 | Geofence, ISO-Woche | BEHOBEN | keine Regression | C: `points.js:451-459, 685-691`; R: Tests grün |
| D4 | Opt-in-Zuordnung doppelt in `push.js` | OFFEN | **noch offen** | C: `push.js:41-45` und `:88-92` wortgleich |
| D5 | Kleinere Wiederholungen | OFFEN | noch offen (Hinweis, kein Auftrag) | — |

#### `tests.md`

| Nr. | Befund | 14.09. | Heute | Beleg |
|---|---|---|---|---|
| 1.1 | `toBeTruthy()` auf Zeitstempel | OFFEN | **behoben** (`28cd576`) | C: `scan.test.js:462-470` konkrete Werte, Kommentar `:480` |
| 1.2 | `not.toBe('')` auf `sent_at` | OFFEN | **behoben** (`28cd576`) | C: `cron.test.js:224-226` |
| 1.3 | `not.toBe('')` auf `last_seen` | OFFEN | **behoben** | R: grep `not.toBe('')` in `push.test.js` → kein Treffer |
| 1.6 | `toHaveLength(480)` | OFFEN | **behoben** | C: `release-notes.test.js:101-108` (`toBe(lang.slice(0, 480))`) |
| 2.1a | `lib/push.js` ungetestet | OFFEN | **behoben, getestet** (`a54c377`, `cfb2a6c`) | R: `tests/push-lib.test.js` (echt geladen, `harness.js:315-318` `realPush`) grün |
| 2.2c | `year-badges` am 31.12. | OFFEN | **behoben, getestet** (`2e382c8`) | R: `cron.test.js:380-579`, 11 Tests, u. a. „vergibt am 31. Dezember die erreichte Stufe" |
| 2.2d | `action-badges` nur `single` | OFFEN | **behoben, getestet** (`2e382c8`) | R: `cron.test.js:704-930` (gestufte Abzeichen, 9 Tests) |
| 3.1 | Test, der sich selbst abschaltet | OFFEN | **behoben** | R: kein `return;` mehr in `cron.test.js`; „vergibt an einem gewöhnlichen Tag nichts" (`:419`) |
| 3.2 | Titel widerspricht Erwartung | OFFEN | **behoben** | C: `defaults.test.js:53-60` (Titel angepasst, Begründung im Kommentar) |
| 3.3 | `h.store.badges[0]` brüchig | OFFEN | **noch offen** | C: `badges.test.js:60, 70, 81` |
| 4.2 | `offset` verschluckt | OFFEN | **behoben** (`e73cf5f`) | C: `harness.js:283-291` (fünf Parameter, wirft bei ungültigem `offset`) |
| 4.3 | Sortierung `.reverse()` | OFFEN | **behoben** (`e73cf5f`) | C: `harness.js:204-215` |
| 4.4 | Keine Schemaprüfung, Handlisten | OFFEN | **noch offen** | C: `harness.js:31` (`NUMBER_FIELDS`), `:76` (`BOOLEAN_FIELDS`) — die zweite Handliste kam am 14.09. dazu (`8a72ddc`) |
| 4.5 | Filter-Injection nicht abbildbar | OFFEN | hinfällig (Grenze des Harness, kein behebbarer Befund — so schon im Bericht) | — |
| 5b | Zugriffsregeln der Migrationen ungetestet | TEILWEISE | **weiter teilweise**: 4 von 20 Migrationen (`store-secret`, `read-rules`, `push-attempts`, `tighten`) | R: drei Migrations-Testdateien grün; keine Tests für `users`, `needs`, `badges`, `campaigns`, `push_*` |
| 6 | Fünf lohnendste Tests | 2 von 5 | **5 von 5** | siehe 2.1a, 2.2c, 2.2d |

#### `ci-deploy.md`

| Nr. | Befund | 14.09. | Heute | Beleg |
|---|---|---|---|---|
| K-1 | Apple-Schlüssel im Stash (KRITISCH) | BEHOBEN, UNGETESTET | **keine Regression**; Widerruf bei Apple weiter nicht aus dem Repo feststellbar | R: nach `--unshallow` `git log --all -S"BEGIN PRIVATE KEY"` → nur `1b5fe1b`, `2d4c18d` (die Berichte); Stash eines fremden Rechners nicht prüfbar |
| H-1 | Schlüsselpfad in `eas.json` (HOCH) | BEHOBEN, UNGETESTET | keine Regression | C: `mobile/eas.json` ohne `submit`/`ascApiKey` |
| H-2 | Dritt-Actions auf Tags (HOCH) | BEHOBEN, UNGETESTET | keine Regression | R: alle 16 `uses:` in vier Workflows auf vollem SHA |
| H-3 | Probelauf verschiebt Vergleichsstand (HOCH) | BEHOBEN | keine Regression | R: `play-vergleichsstand.test.js` grün |
| M-1 | `pruefung`-Job ohne `setup-node` | OFFEN | **behoben** (`8c2bdbc`, 14.09., nach dem Abnahme-Stand; Tabelle in ABNAHME.md nicht nachgezogen) | C: `release.yml:86-99` (`setup-node` Node 22 vor `npm test`) |
| M-2 | TestFlight lädt vor den Hinweisen hoch | BEHOBEN, UNGETESTET | behoben, ungetestet | C: `testflight.yml:204, 222` vor `:239` |
| M-3 | Compose ohne Grenzen | BEHOBEN, UNGETESTET | behoben | C: `docker-compose.yml:41-47`, `docker-compose.portainer.yml:64-74` |
| M-4 | Versionsangaben, CHANGELOG-Rückstand | BEHOBEN | **Regression im Unreleased-Block** (doppelte Rubriken, D-8) | R: `grep '^### ' CHANGELOG.md` |
| N-1 | `import urllib.error` | BEHOBEN, UNGETESTET | behoben | C: `upload-play.py:28` |
| N-2, N-3 | Nummern/Netzfehler in Skripten | BEHOBEN, UNGETESTET | behoben | C: `asc-build-number.py:56` (`hole`), `play-version.py:30` (`oeffne`) |

#### Zugriffsregeln Z-1 … Z-8

| Nr. | Befund | 14.09. | Heute | Beleg |
|---|---|---|---|---|
| Z-1 | `users` ohne versionierte Regeln (KRITISCH → ENTWARNT) | entwarnt; Freigabe-Liste ohne Namen offen | **unverändert offen (Funktionsteil); Gewicht gestiegen** | C: keine Migration setzt `users.*Rule` (grep über `pb_migrations/`); `review.tsx:30` liest `expand.created_by.name`, bleibt für fremde Konten leer. Neu: „Konto löschen" (`f8f6188`) hängt an `users.deleteRule`, die nur auf der Instanz existiert — eine frisch aufgesetzte Instanz kann die Funktion still verlieren |
| Z-2 | `visits.createRule` (HOCH) | BEHOBEN | keine Regression | R: `read-rules-migration.test.js` grün; C: `1782710000:92-94` |
| Z-3 | `items.listRule` (HOCH) | BEHOBEN | keine Regression | C: `1782710000:81-84, 101-104` |
| Z-4 | `action_counts` (HOCH) | BEHOBEN | keine Regression | C: `1782710000:86, 96-99` |
| Z-5 | `items.status` nur eine Regel tief (MITTEL) | OFFEN | **noch offen** | C: `defaults.pb.js:26-44` nur für `users`; kein `onRecordBeforeUpdateRequest` für `items` |
| Z-6 | `needs.deleteRule` volunteer (NIEDRIG) | OFFEN | noch offen | C: `1700000700_badge_kinds_actions.js:65` |
| Z-7 | Rückfall auf `store.checkin_qr_secret` (NIEDRIG) | OFFEN | noch offen | C: `scan.pb.js:67` |
| Z-8 | `badges.listRule` gibt geheime Abzeichen preis (NIEDRIG) | OFFEN | noch offen | C: `1700000000_init_schema.js:200`, `1782670000_secret_badges.js` |

#### Barrierefreiheit B-1 … B-11 (Codeprüfung; die tiefe Prüfung macht ein anderer Agent)

Alle elf waren am 14.09. neu und ohne Zustand, also OFFEN — außer B-4
(BEWUSST OFFEN per Nachtrag). Die Commits `877b524`, `59abe40`, `4a6705c`,
`34c8073` und der Revert `48b697c` liegen nach dem Abnahme-Stand `05387b6`.

| Nr. | Befund | 14.09. | Heute | Beleg |
|---|---|---|---|---|
| B-1 | Keine einzige a11y-Auszeichnung (KRITISCH) | OFFEN | **behoben, ungetestet** (`877b524`, `59abe40`) | R: 228 Treffer `accessibility*` in 34 Dateien (vorher 0) |
| B-2 | 26 Icon-Knöpfe ohne Beschriftung (KRITISCH) | OFFEN | **behoben** | C: `IconButton.tsx:10` macht `accessibilityLabel` zur Pflicht; die drei folgenreichen: `review.tsx:148` „Einreichung ablehnen", `items/index.tsx:134` „… archivieren", `tiers.tsx:182` „Rang … löschen" |
| B-3 | Basiskomponenten nehmen kein Label an (KRITISCH) | OFFEN | **behoben** | C: `IconButton.tsx:37-41`, `PPButton.tsx:23-24, 96-101` (Label aus dem Titel, `busy` im Ladezustand), `Toggle.tsx:33-38`, `Stepper.tsx:43-70`, `Field.tsx:36-37`, `Pill.tsx:41-44` |
| B-4 | Weiß auf Teal 2,72:1 (KRITISCH) | BEWUSST OFFEN | **weiter bewusst offen** | C: `PPButton.tsx:117` `colors={PP.gradient}`, `theme.ts:44` `onBrand: '#FFFFFF'`; `48b697c` |
| B-5 | `ink3` 2,3–2,5:1 (HOCH) | OFFEN | **behoben** (`4a6705c`); Verhältnis nicht nachgerechnet | C: `theme.ts:30-42` `#657473` (laut Kommentar 4,88:1 / 4,53:1) |
| B-6 | Rangfarben als Text unlesbar (HOCH) | OFFEN | **noch offen** | C: `theme.ts:53-57` unverändert (`gold #E8B923`, `diamant #6FD3E8`) |
| B-7 | Kein Bedienelement mit 3:1 Nicht-Text-Kontrast (HOCH) | OFFEN | **noch offen** | C: `Field.tsx:73` `borderColor: alpha(PP.ink, 'subtle')` (0,08); `Toggle.tsx:19` `TRACK_OFF = alpha(PP.ink, 'medium')` (0,18) |
| B-8 | Trefferflächen unter 44 pt (HOCH) | OFFEN | **weitgehend behoben** | C: `Toggle.tsx:38` `hitSlop={8}` (28 + 16 = 44), `settings/store.tsx:124, 135` `hitSlop={10}`; 35 `hitSlop`-Stellen in `app/` und `components/` (R: grep). `Pill.tsx` selbst ist eine `View` (`:40`), die umgebenden `Pressable` tragen den `hitSlop` — ob alle, prüft der A11y-Durchgang |
| B-9 | Zustände nur über Farbe (MITTEL) | OFFEN | **ansagbar behoben; visuell offen** | C: `TabBar.tsx:108-112, 137-139` `accessibilityState={{ selected }}`, `Toggle.tsx:33-36` `role="switch"` + `checked`, `Dots.tsx:10-11` `progressbar`. Ein sichtbares zweites Merkmal für den aktiven Tab gibt es weiterhin nicht |
| B-10 | Sechs Farb-Zeichenketten (MITTEL) | OFFEN | **behoben** (`34c8073`) | R: grep `color="PP.` → nur der Kommentar in `Text.tsx:18, 26` |
| B-11 | `ColorPicker`-Zusicherung trifft nicht zu (MITTEL) | OFFEN | **noch offen** | C: `ColorPicker.tsx:7-8` „Alle Werte sind dunkel genug dafür"; `theme.ts:123-132` Bernstein `#d99320`, Koralle `#e2664f`, Wald `#4a8c56` unverändert |

### Zählung

Gezählt sind Befund-**Zeilen** der Tabellen in ABNAHME.md, die am 14.09.
mit OFFEN, BEHOBEN UNGETESTET, BEWUSST OFFEN oder „teilweise" standen (die
Summenzeile von ABNAHME.md zählt anders, weil sie `theme.md` als eine Zeile
führt; hier zählt jede geprüfte Zeile einzeln):

| Herkunft | Zeilen |
|---|---:|
| `backend.md` (1b, 3, 6) | 3 |
| `app.md` (1–6, 8–11) | 10 |
| `theme.md` (1–10) | 10 |
| `redundanz.md` (1–8, D1, D4, D5) | 11 |
| `tests.md` (1.1–1.3, 1.6, 2.1a, 2.2c, 2.2d, 3.1–3.3, 4.2–4.5, 5b, 6) | 16 |
| `ci-deploy.md` (K-1, H-1, H-2, M-1, M-2, M-3, N-1–N-3) | 9 |
| Zugriffsregeln (Z-1, Z-5–Z-8) | 5 |
| Barrierefreiheit (B-1–B-11) | 11 |
| **Summe geprüft** | **75** |

Davon heute:

| Zustand heute | Zeilen | davon HOCH oder KRITISCH |
|---|---:|---:|
| inzwischen behoben **und getestet** | 9 (1.1, 1.2, 1.3, 1.6, 2.1a, 2.2c, 2.2d, 3.1, 6) | 0 |
| inzwischen behoben, ungetestet | 12 (3.2, 4.2, 4.3, M-1, redundanz 7, B-1, B-2, B-3, B-5, B-8, B-9, B-10) | 5 (B-1, B-2, B-3, B-5, B-8) |
| behoben, weiter ungetestet — wie am 14.09. | 35 (app 1–6, 8–11; theme 1–10; redundanz 1, 2, 3, 5, 6, 8, D1; K-1, H-1, H-2, M-2, M-3, N-1, N-2, N-3) | 7 (app 1–4, K-1, H-1, H-2) |
| nicht prüfbar (Toolchain fehlt) | 1 (redundanz 4) | 0 |
| **noch offen** | **13** (3.3, 4.4, 5b, D4, D5, Z-1, Z-5, Z-6, Z-7, Z-8, B-6, B-7, B-11) | **2** (B-6, B-7) |
| bewusst offen, unverändert | 4 (1b, 3, 6, B-4) | 2 (3, B-4) |
| hinfällig | 1 (4.5) | 0 |

**Von den 75 sind heute noch 13 offen, davon 2 HOCH (B-6, B-7 — Kontraste,
Gestaltungsfragen für den Betreiber) und 0 KRITISCH.** Z-1 war KRITISCH und
ist entwarnt; offen ist nur der Funktionsteil (Freigabe-Liste ohne Namen),
dessen Gewicht durch „Konto löschen" gestiegen ist. 21 Zeilen sind seit dem
14.09. weitergekommen, 9 davon mit Test. Bei 35 Zeilen ist der Stand
„behoben, ungetestet" unverändert — für `mobile/` fehlt weiter jede
Laufzeit-Testinfrastruktur; die vier neuen Quelltext-Tests sind ein
Notbehelf.

**Regressionen bei BEHOBEN (KRITISCH/HOCH):** keine im Code. Alle 470 Tests
grün; Türgeheimnis, Tagesgrenze, KW 53, Abmelden, Zugriffsregeln Z-2–Z-4,
Apple-Schlüssel, `eas.json`, SHA-Pins, Vergleichsstand — alle Behebungen
vorhanden. Eine Regression in der Dokumentation: M-4 (D-8).

### Geprüft und in Ordnung (Teil 2)

- Alle als BEHOBEN geführten Befunde mit KRITISCH oder HOCH (backend 1, 2, 4;
  app 1; K-1, H-1, H-2, H-3; Z-2, Z-3, Z-4): Behebung vorhanden, Tests laufen.
- Die Nachträge in ABNAHME.md zu Befunden 5–10 (`backend.md`) stimmen mit dem
  Code überein.
- `worklet-purity.test.js` deckt genau die Fehlerart ab, die am 14.09. jede
  Ansicht mit Schalter abstürzen ließ (`81b1eff`).

### Unklar / zu klären (Teil 2)

- **`users`-Regeln versionieren (Z-1):** Mit „Konto löschen" hängt jetzt eine
  Nutzerfunktion an einer Regel, die nur auf der Instanz steht. Empfehlung
  gegenüber dem 14.09. verschärft: Migration mit den gemessenen Regeln
  (`list/view/update/delete = id = @request.auth.id`, `create = ""`) anlegen,
  plus Test — additiv, ändert auf der Instanz nichts.
- **ABNAHME.md nachziehen:** M-1, tests 1.1–1.6, 2.1a, 2.2c, 2.2d, 3.1, 3.2,
  4.2, 4.3 und B-1–B-3, B-5, B-8, B-10 stehen dort noch als OFFEN, sind aber
  am 14.09. (nach dem Abnahme-Stand) oder danach behoben worden. Die Tabellen
  beschreiben `05387b6`, nicht den Tag.
- **B-9 visuell:** Ansage ist gelöst; ob der aktive Tab ein zweites sichtbares
  Merkmal braucht, entscheidet der A11y-Durchgang.
- **redundanz 4 (`tsc --noUnusedLocals`):** ohne `mobile/node_modules` hier
  nicht ausführbar; gehört in einen Lauf mit installierter Toolchain.

---

## Abschluss

`git status --porcelain` nach dem Durchgang: nur diese Datei neu
(`docs/audit/release-2026-09/doku-und-altbefunde.md`). Kein Projektcode, keine
andere Doku geändert. Der `--unshallow`-Fetch hat die Historie
vervollständigt und einen Dependabot-Branch (`vitest-5.0.1`) sichtbar
gemacht; beides ändert nichts am Arbeitsbaum.
