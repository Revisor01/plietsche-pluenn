# Audit: Auslieferungskette

Geprüft am 14.09.2026 gegen den Stand `a1fb5d3` (Branch `main`, Arbeitsverzeichnis sauber).

Umfang: `.github/` (Workflows, Python-Skripte), `docker-compose.yml`, `mobile/app.json`,
`mobile/eas.json`, `package.json`, `mobile/package.json`, `.gitignore`, Geheimnisse im
Arbeitsbaum und in der Git-Historie, Abhängigkeiten.

Jeder Befund nennt Datei und Zeile sowie das Kommando, mit dem er geprüft wurde.

## Kernzahlen

| Größe | Wert |
|---|---|
| `npm audit --omit=dev` (Wurzel) | 0 Schwachstellen |
| `npm audit --omit=dev` (`mobile/`) | 0 Schwachstellen |
| `npm audit` inkl. dev (beide) | 0 Schwachstellen |
| Versionierte Dateien | 160 (`git ls-files \| wc -l`) |
| Workflows | 4 |
| Python-Skripte in `.github/scripts/` | 5 |
| Geheimnisse im versionierten Stand | keine |
| Geheimnisse in der lokalen Objekt-Datenbank | 1 (Stash, nie gepusht) |

Repo-Sichtbarkeit: **privat**
(`gh repo view Revisor01/plietsche-pluenn --json visibility` → `"PRIVATE"`).

---

## KRITISCH

### K-1 — Apple-Signaturschlüssel (.p8) liegt im lokalen Git-Stash

**Fundstelle:** Stash-Commit `d07af46`, Datei `AuthKey_7X8W499AAK.p8` (6 Zeilen,
PKCS#8-Block). Erreichbar über `refs/stash`, Eintrag
`stash@{0}: On main: pre-redesign-cleanup-stash`.

**Art:** privater App-Store-Connect-API-Schlüssel (ES256). Der Wert steht
bewusst nicht in diesem Bericht.

**Geprüft mit:**

```
git log --all --oneline -S"BEGIN PRIVATE KEY"      # -> d07af46
git show --stat --format="" d07af46                # -> AuthKey_7X8W499AAK.p8
git for-each-ref …  merge-base --is-ancestor       # -> ERREICHBAR via refs/stash
git branch -r --contains d07af46                   # -> leer
```

**Einordnung — wichtig für die Dringlichkeit:**

- Der Commit hängt **ausschließlich** an `refs/stash`. Kein Branch und kein Tag
  enthält ihn (`git branch -a --contains d07af46` und `git tag --contains` sind
  beide leer).
- Er ist **nie auf `origin`** gelandet: `git branch -r --contains d07af46`
  liefert nichts. Stashes werden von `git push` grundsätzlich nicht übertragen.
- Das Repo bei GitHub ist privat.

Der Schlüssel ist damit **nicht veröffentlicht**, aber er liegt unverschlüsselt
in der lokalen Objekt-Datenbank und überlebt jedes `git clone --mirror`, jedes
Backup des `.git`-Verzeichnisses und jedes versehentliche `git push
refs/stash`. Ein Schlüssel, der einmal in einer Objektdatenbank liegt, gilt als
kompromittiert, sobald diese Datenbank das Gerät verlässt.

**Zusatzbefund:** Die Schlüssel-ID im Stash (`7X8W499AAK`) ist **nicht** dieselbe
wie die in `mobile/eas.json:28` hinterlegte (`6JGT8ZLHRJ`). Es handelt sich also
um einen älteren, möglicherweise noch gültigen Schlüssel — ob er bei Apple noch
aktiv ist, lässt sich aus dem Repo nicht feststellen und muss in App Store
Connect nachgesehen werden.

**Empfehlung:** Den Schlüssel `7X8W499AAK` in App Store Connect widerrufen,
falls er dort noch aktiv ist. Danach den Stash verwerfen (`git stash drop`) und
die unerreichbaren Objekte einsammeln
(`git reflog expire --expire-unreachable=now --all && git gc --prune=now`).

---

## HOCH

### H-1 — Absoluter Pfad auf einen privaten Schlüssel steht im Repo — **BEHOBEN 14.09.2026**

> **Behoben am 14.09.2026.** Der `submit`-Block ist aus `mobile/eas.json`
> entfernt. Gegenprobe vorher: `eas submit` kommt in keinem Workflow und in
> keinem npm-Skript vor — die Workflows legen den Schlüssel selbst aus
> `secrets.ASC_KEY_P8_BASE64` ab und laden ohne EAS hoch. Der Block war
> tatsächlich ungenutzt.


**Fundstelle:** `mobile/eas.json:27`

```json
"ascApiKeyPath": "/Users/simonluthe/.claude/secrets/AuthKey_6JGT8ZLHRJ.p8",
```

dazu `mobile/eas.json:28` `ascApiKeyId` und `:29` `ascApiKeyIssuerId`.

**Geprüft mit:** `cat -n mobile/eas.json`, `git log --all --oneline -- mobile/eas.json`
(seit `f0f3142` versioniert).

**Art:** Kein Geheimnis im Wortsinn — die Datei selbst liegt außerhalb des Repos
und wurde nie eingecheckt (`git log --all --diff-filter=A -- '*.p8'` findet nur
den Stash aus K-1). Aber: Die Kombination aus **Schlüssel-ID**, **Issuer-ID** und
dem **genauen Ablageort auf der Platte** ist eine Wegbeschreibung. Wer Lesezugriff
auf das Repo und irgendwann auf den Rechner bekommt, weiß sofort, welche Datei
er sucht.

CLAUDE.md verlangt ausdrücklich: „Keine Server-Adressen mit Zugangsdaten, keine
SSH-Zugänge […] Auch nicht als Beispiel oder Platzhalter mit echtem Wert."
Ein echter Benutzername im Pfad und eine echte Schlüssel-ID fallen darunter.

**Empfehlung:** Den `submit`-Block aus `eas.json` entfernen oder auf
Umgebungsvariablen umstellen. Die Workflows nutzen ihn ohnehin nicht — sie
legen den Schlüssel selbst aus `secrets.ASC_KEY_P8_BASE64` ab
(`testflight.yml:74-81`, `release.yml:106-113`). Der Block ist also toter Ballast
mit Informationswert für Dritte.

### H-2 — Dritt-Actions sind auf Tags gepinnt, nicht auf Commit-SHA

**Fundstellen:** in allen vier Workflows:

- `actions/checkout@v7` — `tests.yml:27,46`, `testflight.yml:47`,
  `play-internal.yml:53`, `release.yml:56,85,243`
- `actions/setup-node@v7` — `tests.yml:29,48`, `testflight.yml:62`,
  `play-internal.yml:69`, `release.yml:96,255`
- `actions/setup-java@v5` — `play-internal.yml:58`, `release.yml:247`
- `gradle/actions/setup-gradle@v6` — `play-internal.yml:64`, `release.yml:253`

**Geprüft mit:** `grep -rhoE "uses: [^ ]+" .github/workflows/ | sort -u`

Ein beweglicher Tag zeigt auf das, worauf ihn die Eigentümerin zeigen lässt.
Wird ein Action-Repo übernommen oder ein Tag verschoben, laufen im nächsten
Durchgang fremde Befehle in einem Job, der den Android-Keystore, das
iOS-Verteilungszertifikat und den Google-Play-Dienstkontoschlüssel im Speicher
hat. Das ist bei `gradle/actions` (Dritt-Organisation) gewichtiger als bei
`actions/*` (GitHub selbst), betrifft aber beide.

**Empfehlung:** Auf vollständige Commit-SHA pinnen, mit dem Tag als Kommentar
dahinter. Dependabot ist bereits für `github-actions` eingerichtet
(`.github/dependabot.yml:64-72`) und hebt auch SHA-Pins an.

### H-3 — Ein erfolgreicher Probelauf verschiebt den Vergleichsstand und verschluckt die nächsten Release-Notes

**Fundstellen:** `play-internal.yml:156-172` (Schritt „Letzten gebauten Stand
ermitteln") zusammen mit `play-internal.yml:30-33` (Eingabe `probelauf`).

Der Vergleichspunkt für die Hinweise ist der Commit des letzten **erfolgreichen**
Laufs dieses Workflows:

```
.../actions/workflows/play-internal.yml/runs?status=success&branch=${GITHUB_REF_NAME}&per_page=1
```

Ein Probelauf (`probelauf: true`) veröffentlicht nichts — er verwirft die
Play-Bearbeitung (`upload-play.py:121-124`) —, endet aber trotzdem mit
`status=success`. Beim nächsten echten Lauf gilt damit der Commit des
**Probelaufs** als „zuletzt ausgeliefert". Alle Änderungen bis dahin fallen aus
den Hinweisen heraus, obwohl sie noch nie bei einem Menschen angekommen sind.

**Geprüft mit:** `grep -n "status=success" .github/workflows/*.yml`; Ablauf des
Probelaufs gegen `upload-play.py:121-124` gelesen.

Laut CLAUDE.md landet das Ergebnis dieser Skripte „ungeprüft in TestFlight und
in der Produktionsspur bei Google Play". Ein Probelauf am Vortag führt also
dazu, dass in der Produktionsspur „Kleinere Verbesserungen unter der Haube."
steht, wo eigentlich zwei Wochen Arbeit hingehörten.

**Empfehlung:** Probeläufe aus der Abfrage ausschließen — etwa indem der
Probelauf den Job bewusst mit einem neutralen Ergebnis beendet, oder indem der
Vergleichsstand aus einer Quelle kommt, die nur echte Veröffentlichungen kennt
(z. B. der zuletzt in der Spur stehende `versionCode` bzw. dessen Commit).

---

## MITTEL

### M-1 — `pruefung`-Job startet Vitest 5 ohne passende Node-Version

**Fundstelle:** `release.yml:50-76`

Der Job hat `- uses: actions/checkout@v7` (Zeile 56) und danach direkt:

```yaml
      - name: Tests
        run: |
          npm ci
          npm test
```

Ein `actions/setup-node` fehlt — anders als in allen übrigen Jobs
(`tests.yml:29`, `release.yml:96`, `release.yml:255`). Der Job läuft also auf
dem, was das `ubuntu-latest`-Abbild vorinstalliert hat.

Vitest 5 verlangt `"node": "^22.12.0 || ^24.0.0 || >=26.0.0"`
(`node_modules/vitest/package.json:109-111`), die Wurzel `>=22.12.0`
(`package.json:13-15`).

**Geprüft mit:**

```
grep -n '"engines"' -A3 node_modules/vitest/package.json
sed -n '50,76p' .github/workflows/release.yml
```

Stimmt die vorinstallierte Version nicht, bricht der einzige Testlauf vor einer
Veröffentlichung ab — im besten Fall sichtbar, im schlechteren Fall erst nach
einem Abbildwechsel bei GitHub, mitten in einem Release.

Das wiegt hier schwerer als anderswo: Der `pruefung`-Job ist die **einzige**
Absicherung, die vor App Store und Produktionsspur steht (`needs: pruefung` in
`release.yml:80` und `:238`).

**Empfehlung:** `actions/setup-node@…` mit `node-version: 22` und
`cache-dependency-path: package-lock.json` ergänzen, wie in `tests.yml:29-33`.

### M-2 — TestFlight lädt hoch, bevor die Hinweise feststehen

**Fundstelle:** `testflight.yml:196-240`

Reihenfolge im Job: „Zu App Store Connect hochladen" (Zeile 196) → „Letzten
gebauten Stand ermitteln" (Zeile 207) → „Testhinweise zusammenstellen"
(Zeile 225).

Scheitert die Erzeugung der Hinweise, ist der Build bei Apple bereits
angekommen und die Build-Nummer verbraucht. Er steht dann ohne „Was gibt es
Neues zu testen" in TestFlight.

Der Workflow fängt den Fall, dass der Build noch nicht sichtbar ist, sauber ab
(`testflight.yml:313-316`: Hinweis ausgeben, `SystemExit(0)`). Den Fall, dass
`release-notes.py` selbst scheitert, fängt er nicht — dann bricht der Job ab und
der hochgeladene Build bleibt unbeschriftet.

`play-internal.yml` macht es richtig herum (Hinweise Zeile 174, Upload Zeile 189).

**Geprüft mit:** `grep -n "name: " .github/workflows/testflight.yml`

**Empfehlung:** Die beiden Schritte „Letzten gebauten Stand ermitteln" und
„Testhinweise zusammenstellen" vor den Upload ziehen, wie im Play-Workflow.

### M-3 — `docker-compose.yml` ohne Ressourcengrenzen und ohne Protokollbegrenzung

**Fundstelle:** `docker-compose.yml:5-29`

Der Dienst setzt weder `mem_limit`/`cpus` (bzw. `deploy.resources.limits`) noch
`logging.options.max-size`. Auf `server.godsapp.de` laufen laut CLAUDE.md
Authentik, Nextcloud AIO, Traefik, Portainer und weitere Stacks auf derselben
Maschine. Ein durchdrehender Prozess oder eine volllaufende Protokolldatei
trifft dort alles andere mit.

**Geprüft mit:** `cat -n docker-compose.yml`

**Bewertet, aber in Ordnung:**

- Kein `latest`-Tag: das Abbild ist exakt gepinnt
  (`ghcr.io/muchobien/pocketbase:0.22.21`, Zeile 7) — genau so, wie es
  `.github/dependabot.yml:40-42` für die PocketBase-Hauptversion beschreibt.
- Keine Port-Veröffentlichung: es gibt keinen `ports:`-Block. Der Zugang läuft
  ausschließlich über die Traefik-Labels (Zeilen 24-27) im externen Netz
  `traefik` (Zeilen 28-33). Nach außen ist damit nichts offen.
- Kein Geheimnis in der Datei: `PB_ENCRYPTION_KEY` kommt als
  `${PB_ENCRYPTION_KEY}` aus der Umgebung (Zeile 14).
- `restart: unless-stopped` (Zeile 9) und ein Healthcheck (Zeilen 19-23) sind
  gesetzt.

**Anmerkung zu den Volume-Rechten:** `./pb_hooks` und `./pb_migrations` (Zeilen
17-18) sind schreibbar eingehängt. PocketBase braucht dort nur Lesezugriff; ein
`:ro` würde verhindern, dass ein Fehler in der Anwendung die Fachlogik auf der
Platte verändert. `./pb_data` (Zeile 16) muss schreibbar bleiben.

### M-4 — Versionsangaben laufen auseinander

**Geprüft mit:**

```
python3 -c "import json;print(json.load(open('package.json'))['version'])"                 # 1.0.0
python3 -c "import json;print(json.load(open('mobile/package.json'))['version'])"          # 0.1.0
python3 -c "import json;print(json.load(open('mobile/app.json'))['expo']['version'])"      # 1.0.0
grep -nE "^## \[" CHANGELOG.md                                                             # [Unreleased], [1.0.0 (4)] …
```

| Datei | Zeile | Version |
|---|---|---|
| `package.json` | 3 | `1.0.0` |
| `mobile/package.json` | 3 | `0.1.0` |
| `mobile/app.json` (`expo.version`) | — | `1.0.0` |
| `CHANGELOG.md` letzter Abschnitt | 232 | `1.0.0 (4)` |

`mobile/package.json` weicht mit `0.1.0` ab. Das ist **so gewollt**: CLAUDE.md
beschreibt genau diesen Stand („Paketversion 0.1.0, App-Version 1.0.0"), und das
Paket ist `private: true`, wird also nie veröffentlicht.

Der echte Befund liegt woanders: **Der `CHANGELOG.md` steht bei `1.0.0 (4)`
(27.06.2026), während die App laut Projektgedächtnis bei Build 21 auf TestFlight
liegt.** Zwischen `[Unreleased]` (Zeile 7) und `[1.0.0 (4)]` (Zeile 232) liegen
rund 225 Zeilen ungeordneter Einträge — ein `[Unreleased]`-Abschnitt, der über
Monate gewachsen ist und mehrere Unterüberschriften derselben Kategorie führt
(„Geändert", „Geändert (Erscheinungsbild)", „Geändert (Abzeichen & Symbole)",
„Neu (Etiketten & Abzeichen-Details)").

Keep a Changelog sieht je Version genau einen Abschnitt je Kategorie vor. Der
jetzige Stand erschwert genau das, wofür CLAUDE.md den CHANGELOG vorsieht:
„Bei Unklarheiten zum Fachlichen […] erst im CHANGELOG nachlesen."

**Empfehlung:** Beim nächsten Release den `[Unreleased]`-Block zu einem
Versionsabschnitt schließen und die Kategorien je einmal führen.

`mobile/app.json` enthält **keine** `ios.buildNumber` und keinen
`android.versionCode` — beide werden zur Laufzeit von den Workflows eingetragen
(`testflight.yml:94-107`, `play-internal.yml:93-111`). Das ist stimmig, weil die
Nummern aus den Stores kommen und nicht aus dem Repo.

---

## NIEDRIG

### N-1 — `upload-play.py` fängt `urllib.error.HTTPError`, ohne `urllib.error` zu importieren

**Fundstelle:** `.github/scripts/upload-play.py:77` fängt
`urllib.error.HTTPError`; die Importliste (`:15-22`) führt `urllib.parse` und
`urllib.request`, aber nicht `urllib.error`.

**Geprüft mit:**

```
grep -n "^import\|^from" .github/scripts/upload-play.py
python3 -c "import urllib.request; import urllib; print(hasattr(urllib,'error'))"   # True
```

In CPython funktioniert das, weil `urllib.request` seinerseits `urllib.error`
importiert und damit als Attribut des Pakets `urllib` verfügbar macht. Der
Fehlerpfad ist also heute **nicht** kaputt.

Er hängt aber an einer Einzelheit der Standardbibliothek, die niemand zugesagt
hat. Fiele sie weg, schlüge ausgerechnet die Fehlerbehandlung mit einem
`NameError` fehl — und zwar an der Stelle, die laut Kommentar
(`upload-play.py:78-81`) nach einem konkreten Vorfall am 04.09.2026 eingebaut
wurde, um genau diese Diagnose zu liefern.

`play-version.py:18` importiert `urllib.error` korrekt und ausdrücklich; hier
fehlt es schlicht.

**Empfehlung:** `import urllib.error` ergänzen.

### N-2 — `asc-build-number.py` verwirft nicht-numerische Build-Nummern stillschweigend

**Fundstelle:** `.github/scripts/asc-build-number.py:62-68`

```python
    for build in daten.get('data', []):
        wert = build['attributes'].get('version') or '0'
        if str(wert).isdigit():
            nummern.append(int(wert))
    naechste = (max(nummern) if nummern else 0) + 1
```

Stünde bei Apple eine Build-Nummer in einer anderen Form (etwa `1.0.0.23`),
fiele sie durch `isdigit()` und würde beim Maximum nicht mitgezählt. Die
errechnete nächste Nummer wäre dann womöglich schon vergeben, und der Upload
schlüge erst bei Apple fehl — nach einem vollständigen macOS-Build.

Praktisch ist das unwahrscheinlich, weil die Nummern von genau diesem Skript
vergeben werden und damit immer rein numerisch sind. Es ist aber ein stiller
Ausfall statt einer Fehlermeldung.

Ebenfalls ohne Behandlung: `limit=200` (Zeile 57) ohne Paginierung. Ab dem
201. Build im Store liefert die Abfrage nicht mehr alle Nummern. Dank
`sort=-version` steht die höchste vorne — bei numerischer Sortierung geht das
gut; Apple sortiert `version` jedoch als Zeichenkette, womit `9` hinter `100`
landen kann. Bei aktuell Build 21 ist das kein Thema, ab Build 100 wäre es eines.

**Geprüft mit:** `cat -n .github/scripts/asc-build-number.py`

### N-3 — `play-version.py` und `asc-build-number.py` ohne Fehlerbehandlung an der Netzgrenze

**Fundstellen:** `play-version.py:56-57` und `:67-69`,
`asc-build-number.py:58-60` — jeweils `urllib.request.urlopen` ohne `try`.

Ein HTTP-Fehler führt zu einem Python-Stapelabzug im Protokoll. Das ist nicht
gefährlich (der Job bricht ab, bevor etwas gebaut wird), aber die Diagnose ist
mühsam: Bei Google steht der Grund im Antwortkörper, und den zeigt `urllib`
nicht — genau der Punkt, den `upload-play.py:78-87` für sich schon gelöst hat.

`play-version.py` räumt immerhin auf: Die angelegte Bearbeitung wird in einem
`finally` verworfen (`:80-85`).

**Geprüft mit:** `cat -n .github/scripts/play-version.py`

### N-4 — `release-notes.py`: Randfälle sind sauber abgedeckt

Kein Befund, aber geprüft und hier festgehalten, weil das Skript laut CLAUDE.md
ungeprüft in die Stores schreibt. Getestet gegen Wegwerf-Repos:

| Fall | Ergebnis | Bewertung |
|---|---|---|
| Normalfall, gemischte Commits | interne (`chore:`, `fix(ci):`) korrekt gefiltert | in Ordnung |
| `SEIT_COMMIT` unbekannter Hash | Rückfall auf die letzten 20 (`:46-49`) | in Ordnung |
| Alle Commits intern | „Kleinere Verbesserungen unter der Haube." (`:74-76`) | in Ordnung |
| Repo ohne jeden Commit | derselbe Ersatztext, Rückgabewert 0 | in Ordnung |
| `VORGABE` mit 600 Zeichen, Ziel `play` | auf 480 gekürzt | unter der Play-Grenze |
| 8 überlange Commit-Betreffs, Ziel `play` | 368 Zeichen | unter der Play-Grenze |
| dieselben, Ziel `testflight` | 983 Zeichen | unter der TestFlight-Grenze |

Die Grenzen greifen doppelt und mit Luft: `release-notes.py:17` kürzt auf 480
(Play) bzw. 3900 (TestFlight), `upload-play.py:98-101` bricht zusätzlich ab,
bevor überhaupt eine Bearbeitung angelegt wird, wenn 500 Zeichen überschritten
sind. Die Einzelzeile ist auf 120 Zeichen begrenzt (`:63`), und es werden
höchstens acht Punkte übernommen (`:81`). Die Kommentare in beiden Skripten
verweisen auf den Vorfall vom 04.09.2026, der dazu geführt hat.

Ein Gedanke bleibt: Ist `VORGABE` genau 500 Zeichen lang und das Ziel
`testflight`, greift die Kürzung auf 3900 — für TestFlight richtig. Für `play`
greift 480, ebenfalls richtig. Beide Wege sind stimmig.

**Geprüft mit:** Wegwerf-Repos unter `/tmp` mit gestellten Commits, Aufruf von
`.github/scripts/release-notes.py` als Prozess (dasselbe Vorgehen, das
CLAUDE.md für die Tests dieser Skripte beschreibt).

### N-5 — `android-signing.py` verlässt sich auf eine Textersetzung im erzeugten Gradle-Projekt

**Fundstelle:** `.github/scripts/android-signing.py:39` (`inhalt.replace('android {', …, 1)`)
und `:43-46` (Regex auf den `buildTypes`/`release`-Block).

Ändert Expo den Aufbau des erzeugten `app/build.gradle`, greift die Ersetzung
nicht mehr. Das Skript behandelt den Fall aber ausdrücklich: `:48-51` bricht mit
Rückgabewert 1 und einer verständlichen Meldung ab, statt ein debug-signiertes
Paket weiterzureichen. Auch der Fall „`app/build.gradle` fehlt" ist abgefangen
(`:29-32`), ebenso der wiederholte Aufruf (`:35-37`).

Das ist die richtige Bauweise für ein Skript dieser Art. Bleibt als Restrisiko,
dass die Ersetzung an einer *anderen* als der gemeinten Stelle greift — dagegen
hilft nur, dass sie nur einmal ausgeführt wird (`count=1`).

Kein Handlungsbedarf, hier nur zur Kenntnis.

### N-6 — Android-Debug-Keystore war einmal versioniert

**Fundstelle:** `mobile/android/app/debug.keystore`, hinzugefügt in `0881da9`
(„chore: track existing codebase files"), entfernt in `f0f3142`.

**Geprüft mit:**

```
git log --all --diff-filter=A --oneline --name-only -- "*.keystore" "*.jks" "*.p8" "*.p12"
git cat-file -e origin/main:mobile/android/app/debug.keystore   # nicht vorhanden
git ls-files | grep -iE "keystore|\.jks|\.p8|\.p12"             # leer
```

Der Commit `0881da9` liegt auf `origin/main`, die Datei ist also in der
Historie des Remote-Repos. Es handelt sich um den **Debug**-Keystore, den Android
SDKs mit überall gleichem Standardpasswort (`android`) erzeugen — er signiert
keine ausgelieferten Pakete und ist kein Geheimnis. Der Release-Keystore kommt
ausschließlich aus `secrets.ANDROID_KEYSTORE_BASE64`
(`play-internal.yml:126-129`, `release.yml:293-296`) und war nie im Repo.

Kein Handlungsbedarf. Festgehalten, damit ein späterer Durchgang nicht erneut
darüber stolpert.

---

## Geprüft und ohne Befund

Diese Punkte standen im Auftrag und wurden geprüft; sie sind in Ordnung.

**Geheimnisse im versionierten Stand.** `git grep` über alle 160 versionierten
Dateien (ohne die Lock-Dateien) nach privaten Schlüsseln, `api_key=`,
`password=`, `secret=`, `token=`, `Bearer …`, `AIza…`, `ghp_`, `github_pat_`,
`sk-`, `xox[baprs]-` und `ExponentPushToken` findet nur Feldnamen, Beispielwerte
(`docs/openapi.yaml:225`: `ExponentPushToken[xxxx…]`), Funktionsparameter
(`mobile/lib/hooks/useAuth.ts:30`) und Testwerte
(`tests/push.test.js:14`). Keine echten Werte.

**`mobile/.env`.** Vorhanden im Arbeitsbaum (56 Byte), aber **nicht versioniert**
und korrekt ignoriert:

```
git ls-files mobile/ | grep -i env      # nur mobile/.env.example
git check-ignore -v mobile/.env         # .gitignore:10:.env
git log --all --oneline -- mobile/.env  # leer
```

Inhalt ist ausschließlich `EXPO_PUBLIC_PB_URL` — kein Geheimnis, und die Adresse
steht ohnehin offen in `mobile/.env.example:2`.

**`.gitignore`.** Deckt die relevanten Muster ab: `.env` (Zeile 10), `*.p8`/`*.p12`
(14-15), `GoogleService-Info.plist`/`google-services.json` (16-17),
`*.jks`/`*.keystore` (28-29), `pocketbase/pb_data/` (38) und — bemerkenswert
sorgfältig — `test-qrcodes.html` (51) mit der Begründung, dass die Datei das
Türgeheimnis als Bild enthält. Die Datei liegt im Arbeitsbaum und ist nicht
versioniert.

**Türgeheimnis (`checkin_qr_secret`).** Kommt im versionierten Stand nur als
Feldname, Schema-Definition (`pocketbase/pb_migrations/1700000000_init_schema.js:349`)
und Testwert vor. Der Produktivwert wird beim Seeding zufällig erzeugt
(`pocketbase/pb_migrations/1700000100_seed.js:25`: `$security.randomString(32)`)
und steht nirgends im Repo.

**Rechte des `GITHUB_TOKEN`.** Alle vier Workflows setzen einen
`permissions`-Block auf `contents: read` (`tests.yml:19-20`,
`testflight.yml:27-28`, `play-internal.yml:35-36`, `release.yml:36-37`). Das ist
das Minimum und passt zu dem, was die Workflows tun: Sie lesen den Quelltext und
fragen die Actions-API nach vergangenen Läufen (`testflight.yml:219-221`,
`play-internal.yml:168-170`, `release.yml:322-324`). Der Kommentar an diesen
Stellen erklärt auch, warum kein Git-Tag als Vergleichspunkt dient — der
eingebaute Token darf keine Referenz setzen, die auf Workflow-Dateien zeigt.

**Script Injection.** Keine. Sämtliche Eingaben aus `github.event`/`inputs`
erreichen die `run:`-Blöcke ausschließlich über `env:` und werden dort als
Shell-Variable in Anführungszeichen gelesen: `inputs.hinweis` →
`VORGABE` (`testflight.yml:228`, `play-internal.yml:177`, `release.yml:329`),
`inputs.backend` → `EXPO_PUBLIC_PB_URL` (`testflight.yml:112`,
`play-internal.yml:116`), `inputs.version` → `EINGABE` (`release.yml:61`),
`inputs.spur` → `SPUR`, `inputs.probelauf` → `PROBELAUF`
(`play-internal.yml:191-192`). Die einzigen direkten `${{ }}`-Einsetzungen in
`run:`-Blöcken sind `needs.pruefung.outputs.version` (`release.yml:228` und
`:349`) — dieser Wert stammt aus `release.yml:63-70` und ist dort gegen
`mobile/app.json` geprüft worden, kann also nur eine dort stehende
Versionszeichenkette sein.

Geprüft mit:
`grep -rnE '^\s+.*\$\{\{' .github/workflows/` und Durchsicht jedes Treffers.

**`pull_request_target`.** Wird nirgends verwendet
(`grep -rn "pull_request_target" .github/workflows/` → leer). Der einzige
Workflow, der auf Pull Requests reagiert, ist `tests.yml` mit `pull_request`
(Zeile 10) — er hat keinen Zugriff auf Geheimnisse und läuft im
Fork-Kontext ohne Schreibrechte.

**Geheimnisse in Protokollen.** Alle Werte aus `secrets.*` gehen über `env:` in
die Schritte und werden von GitHub in der Ausgabe maskiert. An keiner Stelle
wird ein Geheimnis mit `echo` ausgegeben; die `base64 --decode`-Aufrufe schreiben
in Dateien (`testflight.yml:80`, `play-internal.yml:89`, `:129`). Der
iOS-Schlüssel bekommt `chmod 600` (`testflight.yml:81`, `release.yml:113`), die
`.p12` wird nach dem Import gelöscht (`testflight.yml:139`, `release.yml:159`).
Der Google-Dienstkontoschlüssel landet unter `/tmp/gplay-sa.json`
(`play-internal.yml:89`) und bleibt dort bis zum Ende des Laufs — auf einem
Wegwerf-Runner unkritisch, aber er wird auch nicht ausdrücklich entfernt.

**Abhängigkeiten.** Beide `npm audit --omit=dev` melden 0 Schwachstellen, ebenso
beide Läufe inklusive dev-Abhängigkeiten. Das deckt sich mit den letzten beiden
Commits (`ceeb9c0` „gemeldete Schwachstellen in der App schliessen", `a1fb5d3`
„Vitest 4 auf 5 anheben"). Die `overrides` in `mobile/package.json:58-69` halten
mehrere verwundbare Unterabhängigkeiten fest auf korrigierten Ständen.

**Dependabot.** Sauber eingerichtet (`.github/dependabot.yml`) und mit einer
Begründung versehen, die das Expo-SDK-Problem richtig beschreibt: Die an das SDK
gebundenen Pakete sind ausgenommen (`:28-44`), weil Einzelupdates den nativen
Teil brechen. Wurzel und `mobile/` sind getrennt, GitHub Actions ist erfasst.

---

## Zusammenfassung nach Schwere

| Schwere | Anzahl | Befunde |
|---|---|---|
| KRITISCH | 1 | K-1 Apple-.p8 im lokalen Stash |
| HOCH | 3 | H-1 Schlüsselpfad in `eas.json`, H-2 Actions auf Tags gepinnt, H-3 Probelauf verschiebt Vergleichsstand |
| MITTEL | 4 | M-1 fehlendes `setup-node`, M-2 Upload vor Hinweisen, M-3 Compose ohne Grenzen, M-4 CHANGELOG-Rückstand |
| NIEDRIG | 6 | N-1 bis N-6 |

Die dringendste Einzelmaßnahme ist K-1: nachsehen, ob der Schlüssel `7X8W499AAK`
in App Store Connect noch aktiv ist, ihn gegebenenfalls widerrufen und
anschließend den Stash samt unerreichbarer Objekte entfernen.
