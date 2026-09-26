# Release-Audit 26.09.2026 — Testsuite

| | |
|---|---|
| **Datum** | 26.09.2026 |
| **Commit** | `06b68dc` (feat(app): Symbolauswahl bleibt als Funktion) |
| **Umfang** | `tests/` (22 `*.test.js`, `harness.js`, `helper/pb-stub.mjs`), `vitest.config.mjs`, `package.json`; Aussagekraft für `pocketbase/pb_hooks/` (4 Hooks, 2 Bibliotheken), `pocketbase/pb_migrations/` (19 Dateien), `.github/scripts/` (6 Python-Skripte), `.github/workflows/tests.yml` und die Test-Schritte in `deploy.yml`/`release.yml`. Einschätzung zu `mobile/`. |
| **Vorgehen** | Quelltext gelesen (Harness, alle Hooks, alle Tests), gezielte `grep`-Zählungen, Suite 3× gelaufen, 2× mit `--sequence.shuffle`, 3× unter fremden Zeitzonen (Scratch-Config), Mutationsprobe an einem Quelltext-Grep-Test, Harness-Sonde gegen Node-Verhalten und — entscheidend — **Sondierung gegen die echte PocketBase 0.22.21** (das in `pocketbase/Dockerfile:16` gepinnte Release, offizielles Binary, mit den Migrationen und `lib/` aus dem Repo, in einem Wegwerfverzeichnis). Quelltexte von PocketBase v0.22.21 und der darin gebundelten goja-Version (`fa6d1ed5e4b6`) zur Absicherung gelesen. Kein Projektcode geändert. |
| **Laufzeit** | 3 Läufe: `Duration 2.94 s / 3.08 s / 3.09 s` (vitest), `real 3.66–3.85 s`. 22 Dateien, **470 Tests grün**, 0 übersprungen. |
| **Kennzeichnung** | Jeder Befund trägt **reproduziert** (Experiment ausgeführt) oder **aus Code gelesen**. |

Zu beachten: Während der Prüfung lagen in `docs/audit/release-2026-09/` zeitweise Berichte anderer Prüfer:innen derselben Runde (`app-*.md`, `ci-deploy-release.md`, `doku-und-altbefunde.md`); dieser Bericht ist der zur Testsuite. Der frühere `docs/audit/tests.md` (14.09.2026) und `ABNAHME.md` wurden nur zur Orientierung gelesen; nichts daraus ungeprüft übernommen.

---

## Zusammenfassung

Die Suite ist handwerklich gut: 470 Tests in 3 Sekunden, stabil über drei Läufe und drei Zeitzonen, ohne `skip`/`only`/`todo`, ohne `it`-Block ohne `expect` (428 Blöcke geprüft), mit sauberen Fehlerfall-Mustern und einem Harness, der sich selbst testet. Das Problem liegt nicht in den Tests, sondern **zwischen Harness und Laufzeit** — und es ist größer als beim letzten Audit angenommen. Der Harness bildet PocketBase in Node nach; die Hooks laufen in Goja. An zwei Stellen weichen die beiden Welten so ab, dass die Suite Verhalten bestätigt, das in Produktion **nachweislich nicht** eintritt: (1) PocketBase liefert Datumsfelder als `"2026-09-26 10:00:00.000Z"` (Leerzeichen), und `new Date(...)` dieser Form ist in Goja **`Invalid Date`** — Node parst sie. Damit sind in Produktion die Serie (`updateStreak` liefert immer 1), der nächtliche Serien-Reset (setzt jede Serie zurück), die Serien-Abzeichen (`streakFromVisits` = 0), die Treue-Abzeichen (jeder Besuch wird übersprungen) und die Zielgruppe „14 Tage inaktiv" (trifft alle) betroffen — gemessen mit der echten 0.22.21, mit den Migrationen des Repos. (2) Das JSON-Feld `tiers_json` kommt als Byte-Array (`Array.isArray` = `true`, `.length` = Bytezahl); `tierSlotCount()` liefert 5 bei drei gepflegten Rängen und **2 bei `"[]"`** — genau der Fehler, den `ABNAHME.md` als Befund 7 „behoben" führt und den `badges.test.js:118` grün bestätigt. Beide Befunde sind KRITISCH im Sinne der Skala: Der Harness verdeckt einen Fehler, der in Produktion sicher auftritt. Dazu kommt: Die Migrationskette ist auf einer frischen Datenbank nicht lauffähig (fest verdrahtete Sammlungs-ID, doppelte Spalte), was kein Test und kein CI-Schritt bemerkt. Die Tests für alles, was seit dem 14.09. an der App dazukam (E-Mail-Bestätigung, Konto löschen, Passwort-Reset, App-Symbol), prüfen Textvorkommen in Quelldateien; ein auskommentierter Aufruf bleibt grün.

**Wie viel Vertrauen verdient ein grüner Lauf?** Hoch für alles, was der Harness getreu abbildet — Filter mit Leerzeichen-Datum, Punktesummen, Geofence, Token-Prüfung, Migrations-Regelwortlaut, Push-Zuordnung, Wochen-Arithmetik auf *korrekt geparsten* Daten. **Niedrig** für alles, was ein Datums- oder JSON-Feld aus einem Datensatz liest und in JavaScript weiterverarbeitet: Dort beweist die Suite heute nur Node-Semantik. Ein grüner Lauf ist damit eine notwendige, aber keine hinreichende Bedingung — bis der Harness Datumsfelder in PocketBase-Form liefert und ein Rauchtest gegen das echte Binary im CI läuft, muss jede Aussage über Serie, Ränge und Jahres-Abzeichen **auf der Instanz** nachgemessen werden (CLAUDE.md: „Ein Fix im Repo ist kein Fix auf dem Server").

---

## Befund-Tabelle

| ID | Kurztitel | Schwere | Nachweis |
|---|---|---|---|
| T-1 | Datumsfelder aus PocketBase ergeben in Goja `Invalid Date` — Serie, Reset, Serien- und Treue-Abzeichen, „inaktiv 14 Tage" in Produktion falsch; Harness und Tests sehen es nicht | **KRITISCH** | reproduziert (echte 0.22.21) |
| T-2 | JSON-Feld `tiers_json` ist in Goja ein Byte-Array; `tierSlotCount()` liefert 5 statt 3 bzw. 2 statt 5 — „behobener" Befund 7 ist in Produktion offen, Test grün | **KRITISCH** | reproduziert (echte 0.22.21) |
| T-3 | Migrationskette auf frischer Instanz nicht lauffähig (`1782637408_updated_store.js`: feste Sammlungs-ID, doppelte Spalte `tiers_json`) — kein Test, kein CI-Schritt | **HOCH** | reproduziert |
| T-4 | Tests für E-Mail-Bestätigung, Konto löschen, Passwort-Reset, App-Symbol prüfen Textvorkommen; auskommentierter Aufruf bleibt grün | **HOCH** | reproduziert (Mutationsprobe) |
| T-5 | Harness akzeptiert Filter, die PocketBase ablehnt, und gleicht `T`/Leerzeichen in Datumsfiltern an — ein Hook ohne `.replace('T',' ')` wäre grün und fände in Produktion 0 Treffer | MITTEL | reproduziert |
| T-6 | Harness speichert Nicht-Schema-Felder, kennt keine UNIQUE-Indizes und keine unbekannten Sammlungen; `saveRecord` kann nie scheitern — Teilschreibungen und Doppelscan-Race nicht prüfbar | MITTEL | reproduziert |
| T-7 | Fehlende fachliche Randfälle (Limit exakt, Faktor 0/<1, Start=Ende, Nutzer ohne Rolle, unbekannte Ladenzeitzone, Push-Textvarianten, `campaignBestMult`, `config()`-Rückfall) | MITTEL | aus Code gelesen |
| T-8 | Drei von sechs Skripten ohne Test (`android-signing.py`, `asc-build-number.py`, `play-version.py`); Fehlerpfade in `release-notes.py` offen | MITTEL | aus Code gelesen |
| T-9 | 16 von 19 Migrationen ohne Test; die drei Migrationstests stubben `findCollectionByNameOrId` und würden T-3 nie finden | MITTEL | aus Code gelesen |
| T-10 | `mobile/` ohne Tests; reine Funktionen sind wegen Modul-Importen (`./pb`, `./theme`) nicht ohne Mocks importierbar | MITTEL | aus Code gelesen |
| T-11 | Reihenfolgeabhängigkeit in `release-notes.test.js` (`--sequence.shuffle` → 2–4 rot) | NIEDRIG | reproduziert |
| T-12 | TestFlight- und Play-Internal-Workflows laufen ohne Testschritt; `tests.yml` verlässt sich auf `python3`/`git` des Runners | NIEDRIG | aus Code gelesen |
| T-13 | Weiche Assertions (Liste unten): zwei `toBeTruthy`, zwei Untergrenzen, sieben `toBeUndefined` auf harness-spezifischen Momentaufnahmen | NIEDRIG | aus Code gelesen |

---

## Befunde im Einzelnen

### T-1 — Datumsfelder aus PocketBase sind in Goja `Invalid Date` — **KRITISCH** — reproduziert

**Beschreibung.** PocketBase 0.22 speichert und liefert Datumsfelder als `types.DateTime`; dessen `String()` ist `"2006-01-02 15:04:05.000Z"` — Leerzeichen als Trenner (`tools/types/datetime.go:12,47-52`, v0.22.21). Die Hooks lesen solche Felder per Template-String und parsen sie mit `new Date(...)`:

- `cron.pb.js:80` — `lib.isoWeek(new Date(last))`, `last` = `users.streak_last_visit` (Datumsfeld, `1700000000_init_schema.js:32`)
- `cron.pb.js:184` — `new Date(\`${v.get('checkin_at')}\`)` (year-badges)
- `lib/points.js:208` — `campaignApplies`, Segment `inactive14d`
- `lib/points.js:412` — `streakFromVisits`
- `lib/points.js:467` — `updateStreak`
- `lib/push.js:65` — `collectTokens`, Segment `inactive14d`

Die in PocketBase 0.22.21 gebundelte goja-Version (`go.mod:15`, `dop251/goja v0.0.0-20240822155948-fa6d1ed5e4b6`) kennt in `date.go:34-56` die Layouts `"2006-01-02T15:04:05Z0700"` und `"2006-01-02 15:04:05"`, aber **keins mit Leerzeichen *und* Zonenkennung**. Die Form mit Leerzeichen und `Z` läuft in `date_parser.go:99-101` auf „extra text: Z" — `Invalid Date`. Node/V8 parst dieselbe Zeichenkette anstandslos.

**Messung gegen die echte Laufzeit** (offizielles Binary `pocketbase version 0.22.21`, Migrationen des Repos, `lib/points.js` und `lib/push.js` unverändert, Sondierungs-Hook über `routerAdd`):

```
new Date("2026-09-26 10:00:00.000Z")   → Invalid Date
new Date("2026-09-26T10:00:00.000Z")   → 2026-09-26T10:00:00.000Z
new Date("2026-09-26 10:00:00Z")       → Invalid Date
new Date("2026-09-26 10:00:00")        → 2026-09-26T10:00:00.000Z

visits.checkin_at nach Neuladen        → "2026-09-26 10:00:00.000Z"
new Date(`${checkin_at}`)              → Invalid Date
lib.isoWeek(…)                         → NaN
users.streak_last_visit nach Neuladen  → "2026-09-19 07:51:17.665Z"
lib.updateStreak(user, jetzt) bei streak_weeks=3, letzter Besuch vor 7 Tagen
                                       → streak_weeks = 1   (erwartet 4)
streak-reset (cron.pb.js:70-90 nachgestellt): thisWeek=202639, lastWeek=NaN
                                       → zurücksetzen = true
lib.streakFromVisits(user mit Besuch heute)   → 0   (erwartet 1)
lib.campaignApplies(inactive14d, Besuch heute) → true (erwartet false)
push.collectTokens('inactive14d', …) trifft jemanden mit Besuch heute → 1 (erwartet 0)
year-badges: isNaN(new Date(checkin_at))       → true (Besuch wird übersprungen)
lib.hasVisitToday(…)                            → true  (Filter-Vergleich, korrekt)
```

**Warum die Suite grün ist.** Zwei Ursachen, die sich decken:

1. `tests/harness.js:98-108` — `FakeRecord.get()` gibt zurück, was `set()` oder der Seed hineingelegt hat. Nach `set('checkin_at', now.toISOString())` liefert der Harness `"…T…Z"`, PocketBase `"… …Z"` (Harness-Sonde: `get() nach set(toISOString())` → `"2026-09-26T10:00:00.000Z"`). Es gibt keine Liste `DATE_FIELDS`, wie es sie für Zahlen (`:31-66`) und Wahrheitswerte (`:76-88`) gibt.
2. Die Tests seeden Datumsfelder fast ausschließlich in `T`-Form: 113 Stellen `'JJJJ-MM-TTThh:mm:ss.sssZ'` (u. a. `cron.test.js` 42, `streak.test.js` 29, `timezone.test.js` 29) plus 41 `toISOString()`-Seeds; die PocketBase-Form kommt **nur** in vier Harness-Selbsttests vor (`harness-query.test.js:180-181`, `harness-time.test.js:273,283`) — und dort nur als Filtergrenze, nie als Eingabe von `new Date()`.

  (Zählung: `grep -cE "'[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z'" tests/*.test.js` bzw. mit Leerzeichen.)

Die 60 Tests in `streak.test.js`, die 16 in `timezone.test.js` und die Reset-Tests in `cron.test.js:32-193` beweisen damit, dass die Wochen-Arithmetik auf **gültigen** Date-Objekten stimmt. Sie beweisen nicht, dass je ein gültiges Date-Objekt entsteht.

**Auswirkung (welcher Produktionsfehler trotz grüner Suite durchrutscht).** Auf der Instanz mit 0.22.21 kann `streak_weeks` nie über 1 steigen (`updateStreak`: `isoWeek(NaN)` ist weder gleich noch benachbart → Zweig `else` → 1); der Cron `streak-reset` setzt um 3:05 jede Serie mit gesetztem `streak_last_visit` auf 0; das Abzeichen „Durchhalter" (`trigger_type: streak_weeks`) bleibt bei 0; die Treue-Abzeichen zum Jahresende können nie vergeben werden; eine Aktion mit Zielgruppe „14 Tage inaktiv" gilt für alle, und eine Push-Nachricht an „inaktiv" geht an jede Person mit Gerät. Die Push-Bestätigung nennt die Serie nie („ab 2 Wochen", `points.js:363`). Das Symptom aus dem CHANGELOG (`CHANGELOG.md:155`, „Durchhalter zeigte 1/2 Wochen in Folge") passt zu genau diesem Bild.

**Was das für frühere Abnahmen heißt.** `ABNAHME.md` Befunde 2 („Tageswechsel") und 4 („Serie über KW 53") sind im Repo behoben und getestet — aber der Code, der daraus in Produktion Wochen berechnet, bekommt `NaN`. Beide Behebungen sind auf der Instanz **nicht wirksam**, weil eine Ebene darunter jede Serie ohnehin bei 1 endet.

**Empfehlung.**
1. Hook-seitig eine einzige Hilfsfunktion für PocketBase-Datumsstrings (`new Date(\`${v}\`.trim().replace(' ', 'T'))`) und alle sechs Stellen darauf umstellen. Alternativ `record.getDateTime(f)` — dann aber im Harness nachbilden.
2. Harness: `DATE_FIELDS` einführen; `set()` normalisiert auf PocketBase-Form, `get()` liefert sie. Dann werden die bestehenden Tests **von selbst rot**, bis (1) umgesetzt ist — so, wie es CLAUDE.md verlangt („zuerst der Test, der den Fehler zeigt").
3. Ein Rauchtest gegen das echte Binary (siehe Abschnitt „Empfehlung Rauchtest" unten): Die hier gefahrene Sondierung dauert unter zwei Sekunden und braucht kein Docker.
4. **Auf der Instanz messen** (nicht in der Suite): Verteilung von `users.streak_weeks`, Fortschritt der `streak_weeks`-Abzeichen in `user_badges`, Empfängerzahl der letzten „inaktiv"-Nachricht. Erst dann gilt der Befund als behoben.

---

### T-2 — `tiers_json` ist in Goja ein Byte-Array; `tierSlotCount()` rechnet mit Bytes — **KRITISCH** — reproduziert

**Beschreibung.** `lib/points.js:485-495` (`tierSlotCount`) liest `store.tiers_json` und zählt die gepflegten Ränge; `:502-517` (`asArray`) soll dabei „Array oder JSON-Zeichenkette" auspacken. PocketBase 0.22 liefert ein `json`-Feld aber als `types.JsonRaw` (`models/record.go:305-306` → `schema_field.go:312-343`), ein `[]byte`. Goja bildet ein Go-Slice als array-artiges Objekt der Klasse `Array` ab (`object_goarray_reflect.go:61`), `Array.isArray` prüft genau diese Klasse (`runtime.go:2824-2834`). Folge: `Array.isArray(jsonRaw)` ist `true`, `.length` ist die **Bytezahl** des JSON-Texts, `asArray` reicht das Byte-Array durch.

**Messung gegen die echte Laufzeit** (Sondierung wie bei T-1, `lib/points.js` unverändert):

```
tiers_json = [Bronze 150, Silber 750, Gold 1500] (3 Ränge)
  typeof                → object
  Array.isArray         → true
  .length               → 81            (Bytes des JSON-Texts)
  asArray(tiers_json)   → [91,123,34,97,116, …]   (Bytecodes)
  tierSlotCount()       → 5             (erwartet 3)
tiers_json = "[]" (gesetzt als String)  → Array.isArray true, .length 2, tierSlotCount() → 2   (erwartet 5)
tiers_json = []   (gesetzt als Array)   → tierSlotCount() → 2   (erwartet 5)
tiers_json = null                       → tierSlotCount() → 5
```

**Warum die Suite grün ist.** `badges.test.js:78,91,103,332` seeden `tiers_json` als JS-Array, `:112,122,130` als JS-String — beides Formen, die PocketBase **nie** liefert. Der Harness (`harness.js:98-104`) reicht sie unverändert durch. Der Test `badges.test.js:118` („nimmt bei leerer Rangliste als Zeichenkette fuenf Stufen an") ist damit die genaue Umkehrung der Produktion: dort 5, in Produktion 2.

**Auswirkung.** Beide Hälften von `ABNAHME.md` Befund 7 stehen in Produktion offen: Bei drei gepflegten Rängen vergibt der Server weiter Platin und Diamant (5 Stufen), die die App nach `badgeTierSlots()` (`mobile/lib/format.ts:89-97`) gar nicht mehr anzeigt; bei leerer Rangliste `[]` schneidet er nach Silber ab. Punkte-Boni (`reward_platin`, `reward_diamant`) werden entsprechend zu viel oder zu wenig gutgeschrieben. Der Commit `fe8c607`, der das beheben sollte, hat das Verhalten in Produktion nicht geändert.

**Empfehlung.** `asArray` muss zuerst in Text wandeln — `\`${value}\`` liefert dank `JsonRaw.String()` den JSON-Text (gemessen: `String()` → `[{"at":150,…}]`) — und dann `JSON.parse` versuchen; ein echtes JS-Array nur akzeptieren, wenn seine Elemente Objekte sind, nicht Zahlen. Im Harness ein `JSON_FIELDS`-Verzeichnis, das `get()` als array-artiges Objekt mit Byte-Länge und `toString()` = JSON-Text liefert — dann fällt der bestehende Test `:118` um, wie er soll. Messung auf der Instanz: `tiers_json` des `store`-Datensatzes lesen, `user_badges.current_tier` nach Stufen zählen.

---

### T-3 — Migrationskette auf frischer Instanz nicht lauffähig — **HOCH** — reproduziert

**Beschreibung.** `pocketbase/pb_migrations/1782637408_updated_store.js:4,23` greift auf die Sammlung über eine feste ID zu: `dao.findCollectionByNameOrId("8hdpqi33x65ptii")`. Diese ID stammt von der Produktionsinstanz (Admin-UI-Export, Commit `f0edc99`, 01.07.2026). Auf einer frisch aus `1700000000_init_schema.js` aufgebauten Datenbank existiert sie nicht.

**Messung.** `pocketbase serve` (0.22.21) mit den 19 Migrationen des Repos auf leerer Datenbank:

```
Error: Failed to apply migration 1782637408_updated_store.js: sql: no rows in result set
```

Nach Ersatz der ID durch `"store"` (nur in der Wegwerfkopie) scheitert dieselbe Migration erneut:

```
Error: Failed to apply migration 1782637408_updated_store.js:
  SQL logic error: error in table store after rename: duplicate column name: tiers_json (1)
```

Ursache: `1700000800_diamant_tiers.js:34-36` (Commit `5552836`, 02.08.2026) legt `tiers_json` bereits an — mit Guard —, `1782637408_updated_store.js:7-19` legt es **ohne Guard** ein zweites Mal an. Auf der Instanz lief `1782637408` chronologisch zuerst (Juli), `1700000800` kam später dazu und übersprang das Feld; auf einer frischen Datenbank gilt die Dateinamen-Reihenfolge, und die kehrt das um.

**Auswirkung.** Wiederherstellung aus Backup + Migrationen, eine Staging-Instanz, ein Integrationstest gegen das echte Binary — nichts davon lässt sich aus dem Repo aufbauen. Die Vollständigkeitsprüfung in `deploy.yml:115-121` zählt Migrationsdateien (`≥ 19`), prüft aber nicht, ob sie zusammen laufen. Die Migrationstests (`store-secret-migration.test.js:248-257`, `read-rules-migration.test.js:73-83`, `push-attempts-migration.test.js:71-82`) stubben `findCollectionByNameOrId` mit einer Map nach **Namen** und könnten die feste ID nicht bemerken.

**Empfehlung.** `1782637408_updated_store.js` auf Name-Lookup und `getFieldByName`-Guard umstellen (additiv, ändert auf der Instanz nichts — dort ist die Migration bereits als angewendet vermerkt). Im CI ein Schritt „frische Instanz migriert durch" mit dem echten Binary (siehe Rauchtest); das ist derselbe Aufbau wie für T-1/T-2.

---

### T-4 — Quelltext-Grep-Tests für die Funktionen seit dem 14.09. — **HOCH** — reproduziert

**Beschreibung.** Die Tests für die seit dem 14.09.2026 hinzugekommenen App-Funktionen lesen `.ts`/`.tsx`-Dateien als Text und prüfen `indexOf`/`toContain`/`toMatch`:

| Datei | prüft | Hook-Logik oder Fixture? |
|---|---|---|
| `tests/email-verify.test.js` (11 Tests) | `useAuth.ts` enthält `requestVerification` im `register`-Rumpf, nach `authWithPassword`, in `try{}`; `account.tsx` enthält `verified`, `Spam`; `index.tsx` enthält `!user?.verified` | **nur Text** — kein Aufruf wird ausgeführt |
| `tests/account-delete.test.js` (7 Tests) | `deleteAccount`: `indexOf('authWithPassword') < indexOf('.delete(id)')`, `unregisterPushToken` davor, `authStore.clear()` danach; `login.tsx` enthält „Passwort vergessen?" und „Falls es ein Konto" | **nur Text** |
| `tests/icon-switcher.test.js` (9 Tests) | vier PNGs existieren, `app.json`-Plugin-Liste, `account.tsx` enthält `setAlternateAppIcon`, `supportsAlternateIcons`, kein `borderWidth` in den 320 Zeichen nach `<Image` | Dateien + Text; `haupt.png`-Bytegleichheit (`:33-35`) ist die einzige harte Prüfung |
| `tests/worklet-purity.test.js` (3 Tests) | statische Analyse: kein Theme-Helfer in Worklet-Rümpfen, mit Gegenprobe (`:93-103`) | brauchbare statische Regel — die Ausnahme in dieser Gruppe |

**Mutationsprobe** (Kopie von `mobile/lib/hooks/useAuth.ts` im Scratchpad, beide Aufrufzeilen `await pb.collection('users').requestVerification(email);` auskommentiert, Prüflogik aus `email-verify.test.js:12-29,36-48` unverändert nachgestellt):

```
auskommentierte Zeilen: 2
"wird nach dem Anlegen des Kontos angefordert"  → GRUEN trotz Mutation
"wird erst nach der Anmeldung angefordert"      → GRUEN trotz Mutation
"lässt die Registrierung nicht an der Mail scheitern" → GRUEN trotz Mutation
```

Dasselbe Muster gilt für `account-delete.test.js:20-51`: `indexOf('authWithPassword')` findet auch einen Kommentar; die Reihenfolge-Prüfung „Passwort vor Löschung" (`:219-227`) — eine **Sicherheitszusage** laut Kopfkommentar `:6-8` — ist gegen ein `// authWithPassword` blind.

**Auswirkung.** Die Funktionen, die Nutzer:innen seit dem 14.09. bekommen haben, sind faktisch ungetestet; die Tests geben ein Sicherheitsgefühl, das sie nicht decken. Die Dateien sagen das selbst (`email-verify.test.js:7-8`: „Geprüft wird die Quelle, nicht das Laufzeitverhalten") — das ist ehrlich, ändert aber nichts an der Aussagekraft.

**Empfehlung.** Kurzfristig: Kommentare vor der Prüfung entfernen (`src.replace(/\/\/.*$/gm, '')`) und die Prüfung an Aufrufe binden (`requestVerification(`). Mittelfristig: die Logik in `useAuth.ts` (`register`, `deleteAccount`, `requestPasswordReset`) gegen ein gestelltes `pb`-Objekt ausführen — dazu muss `useAuth.ts` `pb` injizierbar machen oder die Ablauflogik in eine Datei ohne React-Native-Import wandern (siehe T-10).

---

### T-5 — Harness akzeptiert Filter, die PocketBase ablehnt, und gleicht Datumsformen an — MITTEL — reproduziert

**Beschreibung.** `harness.js:142-202` (`matchesFilter`) und `:255-259` sind großzügiger als `daos/record.go:296-299` (`invalid or empty filter expression`) und `tools/search/filter.go:129-141`:

| Eingabe | Harness (Sonde) | PocketBase 0.22.21 (gemessen) |
|---|---|---|
| Filter `""` | 1 Treffer (`harness.js:144`) | `GoError: invalid or empty filter expression` |
| Filter `gibtsnicht = "1"` (unbekanntes Feld) | `false` (kein Treffer, kein Fehler) | Fehler |
| Filter `status = pending` (rechts ohne Anführungszeichen) | `true` (`harness.js:152` behandelt es als Literal) | Fehler (rechts wäre ein Feldname) |
| Filter `1=1` | `true` | 1 Treffer — **stimmt überein** |
| `checkin_at >= "2026-09-26T09:00:00.000Z"` (T-Form) bei gespeichertem `10:00` | Treffer (Zeitvergleich, `harness.js:164-183`) | **0 Treffer** (Textvergleich, `'T'` 0x54 > `' '` 0x20) |
| `checkin_at >= "2026-09-26 09:00:00.000Z"` (Leerzeichen) | Treffer | 1 Treffer — stimmt überein |
| Sortierung `-checkin_at` bei gemischten Formen | Zeichenkettenvergleich (`harness.js:221-227`): `"…T09"` vor `"… 10"` | in Produktion einheitliche Form, daher nicht vergleichbar |

Die Hooks bauen ihre Datumsgrenzen heute durchgehend mit `.replace('T', ' ')` (`points.js:181,257`, `cron.pb.js:19,143-144`) — **richtig**. Der Harness würde aber auch einen Hook durchwinken, der das vergisst.

**Auswirkung.** Kein aktueller Produktionsfehler; aber der nächste Filter mit Tippfehler, unbekanntem Feld oder vergessener `replace` bleibt grün und liefert in Produktion Fehler oder 0 Treffer — ein `hasVisitToday`, das immer `false` sagt, gäbe jeden Tag beliebig viele Check-in-Boni.

**Empfehlung.** `matchesFilter` strenger machen: leerer Ausdruck wirft; rechte Seite muss Zahl oder `"…"` sein; Feldnamen gegen eine je Sammlung gepflegte Feldliste prüfen (die Liste gibt es ohnehin, sobald T-1/T-2 `DATE_FIELDS`/`JSON_FIELDS` einführen); Datumsfelder als Zeichenkette in PocketBase-Form vergleichen statt als Zeitpunkt — dann fällt eine T-Form-Grenze wie in Produktion durch.

---

### T-6 — `saveRecord` kann nie scheitern; Schema, UNIQUE, Sammlungen ungeprüft — MITTEL — reproduziert

| Fall | Harness (Sonde) | PocketBase 0.22.21 (gemessen) |
|---|---|---|
| `set('tippfehler_feld', 'x')` + `saveRecord` + neu laden | Feld bleibt (`{"tippfehler_feld":"x"}`) | Feld verworfen (`ColumnValueMap`, `models/record.go:491-497`); `get()` → `null` |
| zweites `push_devices` mit demselben `expo_token` | 2 Zeilen gespeichert | `UNIQUE constraint failed: push_devices.expo_token` |
| `findCollectionByNameOrId('gibtsnicht')` | `{name, id}` zurück (`harness.js:243-245`) | `sql: no rows in result set` |
| `findRecordsByFilter` auf unbekannter Sammlung | `[]` | Fehler |
| Select-Wert außerhalb der Liste (`kind: 'gibtsnicht'`) | gespeichert | gespeichert — stimmt überein (Dao validiert nicht) |
| Nullwerte: Zahl → 0, Datum → `""`, Relation → `""` | wie PocketBase | stimmt überein |
| `findFirstRecordByFilter` ohne Treffer / `findRecordById` unbekannt | wirft | wirft — stimmt überein |

**Auswirkung.** (a) Ein Feldnamen-Tippfehler in einem Hook wäre grün und würde in Produktion still nichts speichern. Gegenprobe: Alle 61 in den Hooks per `set`/`get` benutzten Feldnamen kommen in den Migrationen vor (`comm -23` über beide Listen: nur `authRecord`/`admin`, die Kontextschlüssel sind) — heute kein Treffer, aber kein Test schützt das. (b) `push.pb.js:36-46` verlässt sich für das Upsert auf den UNIQUE-Index; ein Race zweier gleichzeitiger Registrierungen würde in Produktion mit Fehler enden, im Harness mit zwei Zeilen. (c) Der Race-Guard in `doCheckin` (`points.js:311-320`) ist nur sequentiell getestet (`timezone.test.js:91-107`, `deduped`); ein echter Doppelscan (zwei Anfragen, zwei Goja-VMs) ist im Harness nicht darstellbar. (d) Reihenfolgen wie `scan.pb.js:153-161` (Punkte gutschreiben, dann Teil als mitgenommen markieren) können im Harness nie halb scheitern; Tests für „Punkte ohne Markierung" oder umgekehrt fehlen deshalb.

**Empfehlung.** Feldliste je Sammlung aus den Migrationen ableiten (ein kleines Skript, das `pb_migrations/` in einer Stub-Umgebung wie in `read-rules-migration.test.js` ausführt und die Felder sammelt) und `set()` auf unbekannte Felder werfen lassen; UNIQUE-Indizes aus denselben Migrationen (`init_schema.js:98,260,288`, `1700001000:31`) im `saveRecord` prüfen; einen injizierbaren Fehler für `saveRecord` anbieten, um Teilschreibungen zu testen.

---

### T-7 — Fehlende fachliche Randfälle — MITTEL — aus Code gelesen

Getestet ist viel (Tabelle unten), aber diese Fälle fehlen (jeweils `grep` über `tests/*.test.js` ohne Treffer):

| Randfall | Code | Fehlt |
|---|---|---|
| `items_count` **exakt** am Limit (7 bei `max_items_take: 7`) | `scan.pb.js:71-75`, `points.js:302-303` | nur 8 getestet (`scan.test.js:388-400`); `grep 'items_count: 7'` → 0 |
| Faktor 0, Faktor < 1 (`mult_take: 0.5`), negativer Faktor | `points.js:150-157` (`v && v > 0`), `bumpActionCount :274` (`<= 1` → keine Teilnahme) | kein Test; 1,5 ist getestet (`scan.test.js:380`), 1 als Legacy-Rückfall (`streak.test.js:411`) |
| Aktion mit `starts_at === ends_at` bzw. Grenze auf die Sekunde | `points.js:181-184` (`<=`, `>=`) | kein Test |
| `store`-Datensatz fehlt | `scan.pb.js:49-54` → 500 „Laden nicht konfiguriert"; `config()` Rückfallwerte `points.js:126-141` | 500-Zweig ungetestet; Rückfall auf `POINTS.*` nur indirekt (`grep 'POINTS\.'` → 0) |
| Nutzer ohne Rolle (`role: ''`) bei der Freigabe | `defaults.pb.js:101-102` (`role !== 'visitor'` → **keine** Bring-Punkte) | kein Test — ein Konto aus der Zeit vor `1700000200_role_optional.js` bekäme still nichts |
| Unbekannte Ladenzeitzone (`timezone: 'Europe/London'`) | `points.js:48-55` — alles außer `UTC` wird still als Berlin gerechnet | kein Test; Verhalten ist auch nicht dokumentiert |
| `campaignBestMult` direkt | `points.js:161-167` | nur über `findActiveCampaign` |
| `pushCheckinConfirmation` Textvarianten („1 Teil"/„Teile", Serie ≥ 2, `points <= 0`) | `points.js:352-373` | nur der Kanal (`push-lib.test.js:420`) |
| Cron `push-scheduled` Obergrenze 20 je Lauf | `cron.pb.js:22` | kein Test |
| `awardBadgesAndCountBonus` bei negativer Differenz | `scan.pb.js:27-33` (`diff > 0 ? diff : 0`) | kein Test |
| Doppelscan gleichzeitig | siehe T-6 | im Harness nicht darstellbar |
| Cron bei leerer Datenbank | `cron.test.js:34,197,415,583` | **vorhanden** — in Ordnung |
| Migration doppelt / rückwärts | `store-secret:388-412`, `push-attempts:157-171`, `read-rules:371-378` | für 3 von 19 vorhanden (T-9) |

---

### T-8 — Skripte der Auslieferung: drei ohne Test, Fehlerpfade offen — MITTEL — aus Code gelesen

| Skript | Tests | Was fehlt |
|---|---|---|
| `release-notes.py` | 7 (`release-notes.test.js`) | `SEIT_COMMIT` gesetzt und bekannt (`:43-49`), unbekannt → Rückfall (`RUECKFALL`), 8-Punkte- und `GRENZE`-Kürzung der Commit-Liste (`:80-86`; getestet ist nur die `VORGABE`-Kürzung), Deduplizierung gleicher Betreffs (`:62`), 120-Zeichen-Kappung (`:63`) |
| `deploy-verify.py` | 10 (`deploy-verify.test.js`, mit `helper/pb-stub.mjs` als eigenem Prozess — sauber) | Pfad „nicht erreichbar" (`status is None`, `:114-118`) mit späterem Erfolg; ungültige `VERIFY_*`-Werte; `totalItems` als String |
| `upload-play.py` | 13 (`upload-play-status.test.js`) — Statusprüfung vor dem Netz (`:79-84`) plus **Quelltext-Grep** (`:131-137`) und Workflow-YAML-Grep (`:141-179`) | 500-Zeichen-Grenze (`:120-126`), `call()`-Fehlertext (`:94-112`); der eigentliche Upload ist ohne Netz nicht testbar — akzeptabel |
| `android-signing.py` | **0** | `app/build.gradle` fehlt → 1; `ppRelease` schon da → 0; kein `signingConfig` im Release-Block → 1; erfolgreiche Ersetzung. Alles reine Textverarbeitung, in Sekunden testbar |
| `asc-build-number.py` | **0** | `roh_signatur()` (DER→r‖s, `:91-99`) und die Auswertung `:149-171` (nicht-numerische Nummern → Abbruch, 200er-Warnung, `max+1`) sind rein — aber `:81-83` liest `os.environ[...]` beim Import, das Modul ist ohne Umgebung nicht ladbar |
| `play-version.py` | **0** | `sys.argv` beim Import (`:22`); Fehlerlesbarkeit `oeffne()` (`:30-47`) ungetestet |

Alle Skript-Tests laufen ohne Netz (Stub auf `127.0.0.1`, Attrappen-SA-Datei, Wegwerf-Git-Repo) und ohne Geheimnisse; sie brauchen `python3` (lokal 3.11.15) und `git`. In `tests.yml` ist beides **nicht** eingerichtet (kein `setup-python`), es wird das Runner-Image vorausgesetzt — funktioniert auf `ubuntu-latest`, ist aber implizit (siehe T-12).

---

### T-9 — 16 von 19 Migrationen ohne Test — MITTEL — aus Code gelesen

Getestet: `1782690000_store_secret_collection` (8), `1782710000_tighten_read_rules` (21, mit eigenem Regel-Auswerter `darf()`, der selbst geprüft wird — gut), `1782720000_push_send_attempts` (6). Ohne Test u. a. `1782700000_store_timezone.js` (neu seit 14.09.; setzt `Europe/Berlin` als Standard — die Grundlage von T-1), `1782650000_configurable_points.js` (die konfigurierbaren Punktwerte), `1700000800_diamant_tiers.js` (legt `tiers_json` an, T-2/T-3), `1782637408_updated_store.js` (T-3). Die drei vorhandenen Migrationstests stubben `Dao.findCollectionByNameOrId` mit einer Map nach Namen (`store-secret-migration.test.js:248-252`) — eine feste ID würde dort einfach nicht gefunden und der Test schlüge fehl, aber nur, wenn es ihn gäbe.

**Empfehlung.** Statt 16 Einzelstubs: ein Test, der **alle** Migrationen in Dateinamen-Reihenfolge gegen das echte Binary auf leerer Datenbank laufen lässt (T-3 hätte ihn rot gemacht) und anschließend je Migration ein Schemamerkmal prüft — dieselbe Liste wie in `deploy-verify.py` (`PRUEFUNGEN`).

---

### T-10 — `mobile/` ohne Tests — MITTEL — aus Code gelesen

`vitest.config.mjs:5` sammelt nur `tests/**/*.test.js`; `mobile/package.json:6-11` hat kein `test`-Skript; CI prüft die App nur mit `tsc --noEmit` (`tests.yml:59-61`). Was sich ohne Expo testen ließe — und was dem im Weg steht:

| Datei | Reine Funktionen | Hindernis |
|---|---|---|
| `mobile/lib/format.ts` | `nextTier` (`:167-186`, **die Rang-Berechnung der Startseite**, `points.tsx:70`, `index.tsx:56`), `badgeTierSlots` (`:89-97`), `badgeTierInfo` (`:99-153`), `categoryGroup/Type/Label` (`:27-58`), `conditionLabel`, `initials` (`:269-274`), `relativeDay` (`:258-267`, **zeitzonenabhängig**, benutzt lokale Zeit), `motivationFor` (`:308-…`), `campaignFactors`, `normalizeHex`/`withAlpha`/`lighten` (`:395-426`) | `format.ts:1-2` importiert `./pb` (instanziert PocketBase mit `expo-secure-store`, `pb.ts:4-23`) und `./theme` (importiert `react-native`, `theme.ts:7`). Ohne Alias/Mocks nicht ladbar |
| `mobile/lib/errors.ts` | `errorText` (`:59-…`) — deutsche Fehlertexte, Statuscode-Zuordnung | **keine Importe** — heute schon mit Vitest testbar |
| `mobile/lib/push.ts` | `parseDeepLink` (`:134-148`, Allowlist für Deep-Links — sicherheitsrelevant) | `Notifications.DEFAULT_ACTION_IDENTIFIER` aus `expo-notifications` |
| `mobile/lib/qrsheet.ts` | `esc()` (`:22-28`, HTML-Escaping für den Druckbogen) und `label()` sind **nicht exportiert**; Modul importiert `expo-print`/`expo-sharing` | Extraktion nötig |

**Minimales, sinnvolles Setup.** (1) Eine zweite Vitest-Projektdatei (`vitest.workspace`), die `mobile/lib/**/*.test.ts` sammelt und `react-native`, `expo-secure-store`, `expo-notifications`, `pocketbase` per `resolve.alias` auf kleine Stubs zeigt — dann sind `format.ts`, `errors.ts`, `push.ts` sofort importierbar, TypeScript über esbuild ohne Expo-Toolchain. (2) Alternativ und sauberer: `nextTier`/`badgeTier*`/Farb-Helfer in ein importfreies `lib/ranks.ts`/`lib/color.ts` ziehen. (3) Ein Kreuztest, der `mobile/lib/format.ts:badgeTierSlots` und `pocketbase/pb_hooks/lib/points.js:tierSlotCount` mit **derselben** `tiers_json`-Fixture füttert — genau die Stelle, an der T-2 heute Server und App auseinanderlaufen lässt. Aufwand: ein Nachmittag; Ertrag: Rang-Berechnung, Fehlertexte und Deep-Link-Allowlist unter Test.

---

### T-11 — Reihenfolgeabhängigkeit in `release-notes.test.js` — NIEDRIG — reproduziert

```
npx vitest run --sequence.shuffle            → seed 1790408489315: 4 failed | 466 passed
npx vitest run --sequence.shuffle --sequence.seed=42 → 2 failed | 468 passed
   × filtert Interna am Typ — chore, ci, test, docs, refactor
   × filtert Interna am Bereich, auch wenn der Typ fix oder feat ist
```

Die vier Tests in `release-notes.test.js:57-92` teilen sich ein Repo aus `beforeAll` (`:48-50`) und bauen **kumulativ** Commits auf; `:69` und `:81` erwarten „nur der eine echte Punkt aus dem Test davor". `:113-124` tauscht dazu die modulweite Variable `repo` aus. Im Standardlauf (Dateireihenfolge) stets grün, unter Shuffle rot — falsch-rot, nicht falsch-grün, aber es macht `--sequence.shuffle` als Werkzeug gegen geteilten Zustand unbrauchbar. Alle anderen 21 Dateien sind reihenfolgeunabhängig (jeder Test baut per `loadHook` einen eigenen DAO).

**Empfehlung.** Je Test ein eigenes Wegwerf-Repo (`repoAnlegen()` in `beforeEach`), Erwartungen unabhängig vom Vortest formulieren.

---

### T-12 — Nicht alle Auslieferungswege laufen über die Tests — NIEDRIG — aus Code gelesen

| Workflow | Auslöser | Tests? | Node |
|---|---|---|---|
| `tests.yml` | `push`/`pull_request` auf `main` | `npm ci && npm test` + `tsc --noEmit` (App) | 22 |
| `deploy.yml` | `push` auf `main` (`pocketbase/**`), `workflow_dispatch` | Job `tests` → `deploy` mit `needs: tests` (`:80-82`, ohne `always()`) — **blockiert** | 22 |
| `release.yml` | `workflow_dispatch` | Job `pruefung` mit `npm test` (`:97-99`) → `ios`/`android` mit `needs: pruefung` — **blockiert** | 22 |
| `testflight.yml` | `workflow_dispatch` | **kein Testschritt** | — |
| `play-internal.yml` | `workflow_dispatch` | **kein Testschritt** | — |

Deploy und Store-Release sind abgesichert; TestFlight- und interne Play-Builds nicht. Da Tester:innen die ersten sind, die eine Regression sehen sollen, wäre der Schritt dort billig. `tests.yml` setzt kein `setup-python` (die Skript-Tests brauchen `python3` und `git` vom Runner-Image); `deploy.yml:162` pinnt für `deploy-verify.py` 3.12, die Tests liefen lokal mit 3.11 — kein Fehler, aber zwei verschiedene Interpreter.

---

### T-13 — Weiche Assertions — NIEDRIG — aus Code gelesen

Gesamtbild: Die Regel aus CLAUDE.md wird weitgehend eingehalten. `grep -nE 'toBeDefined|toBeTruthy|expect\.any|\.skip|\.todo|\.only'` liefert **kein** `toBeDefined`, **kein** `expect.any`, **kein** `skip/todo/only`. Statuscodes werden nie mit `toContain` geprüft. Die 22 `try { … } catch (e) { err = e }`-Blöcke in `scan.test.js` und `push.test.js` sind **nicht** vakuum: bleibt der Wurf aus, ist `err` `undefined` und `expect(err.status)` wirft — der Test wird rot (allerdings mit `TypeError` statt Klartext; `expect(() => …).toThrow()` wie in `scan.test.js:73-75` wäre lesbarer). Eine Heuristik über alle 428 erkannten `it`-Blöcke fand **keinen** ohne `expect`.

Verbleibende weiche Stellen:

| Fundstelle | Ausdruck | Bewertung |
|---|---|---|
| `icon-switcher.test.js:26` | `expect(plugin).toBeTruthy()` | weich; die Folgezeile `:27` prüft dann konkret — akzeptabel, aber `toBeDefined`-Äquivalent |
| `store-secret-migration.test.js:173` | `expect(sec).toBeTruthy()` | dito, `:174-178` prüfen konkret |
| `play-vergleichsstand.test.js:100` | `expect(perPage).toBeGreaterThanOrEqual(20)` | Untergrenze statt Wert des Workflows |
| `worklet-purity.test.js:92` | `expect(files.length).toBeGreaterThan(20)` | Plausibilitätsprüfung; in Ordnung |
| `points-award.test.js:64`, `scan.test.js:182,183,206,486,487`, `store-secret-migration.test.js:237` | `toBeUndefined()` auf `h.rows()`-Momentaufnahmen | prüfen „Feld nie gesetzt" — nur im Harness möglich; in PocketBase wäre das Feld `""`/`0`. Harness-spezifisch, kein Fehler |
| `cron.test.js:228-229`, `push.test.js:111-112,124`, `scan.test.js:483-484` | Zeitfenster `vorher ≤ gesetzt ≤ nachher` | angemessen für Zeitstempel |
| `account-delete.test.js:26,39,40,49`, `email-verify.test.js:19,38` | `indexOf(...) > -1` | Textvorkommen — siehe T-4 |
| `scan.test.js:690,706` | `Object.keys(res.body).toContain(feld)` | bewusst offene Feldliste (Vertrag erlaubt Hinzufügen) — richtig so |

Nicht mehr vorhanden (seit 14.09. bereinigt, Commit `28cd576`): `toBeTruthy()` auf `taken_at`, `not.toBe('')` auf `sent_at`/`last_seen`, `toHaveLength(480)`.

---

## Harness-API ↔ echte PocketBase 0.22.21 (JSVM)

Version laut `pocketbase/Dockerfile:16`: `ghcr.io/muchobien/pocketbase:0.22.21` — die 0.22-Linie (`$app.dao()`, `onRecord*Request`, `e.record`/`e.httpContext`), **nicht** 0.23+. Alle Hook-Aufrufe sind für 0.22 korrekt; ein Sprung auf 0.23 würde jeden Hook brechen (`dao()` entfällt, Hook-Namen ändern sich) — der Harness bildet 0.22 nach, das passt zur gepinnten Version.

| API | Hooks benutzen | Harness (`tests/harness.js`) | PocketBase 0.22.21 | Status |
|---|---|---|---|---|
| `$app.dao()` | ja (alle) | `:370-372` | vorhanden | ✓ |
| `findRecordById(col, id)` | 13× | wirft bei Fehlen (`:247-253`) | wirft (`sql: no rows`) | ✓ gemessen |
| `findFirstRecordByFilter(col, filter)` | 8× | wirft bei 0 Treffern (`:255-259`) | wirft | ✓ gemessen |
| `findFirstRecordByData(col, feld, wert)` | 1× (`scan.pb.js:123`) | `:261-265` | `daos/record.go:241-243` | ✓ |
| `findRecordsByFilter(col, filter, sort, limit, offset)` | 22× | `:283-295`, `offset` umgesetzt, `limit 0` = alle | wie PocketBase; **leerer Filter → Fehler** | ⚠ Harness nimmt `""` an (T-5) |
| Filter-Syntax | `feld = "x"`, `!= ""`, `> 0`, `>=/<= "Datum"`, `&&`, `1=1` | `:142-202`; unbekanntes Feld → `false`; unquoted → Literal | unbekanntes Feld/unquoted → Fehler; `1=1` ok | ⚠ (T-5) |
| Datumsvergleich im Filter | Grenzen mit `.replace('T',' ')` | Zeitpunkt-Vergleich, T und Leerzeichen gleichwertig (`:164-183`) | Textvergleich; T-Form-Grenze → 0 Treffer | ⚠ gemessen (T-5) |
| Sortierung `-feld` | 5× | stabil, ein Feld (`:216-228`) | stabil | ✓ (`harness-query.test.js`) |
| `saveRecord` | 12× | nie Fehler; Nicht-Schema-Felder bleiben; kein UNIQUE (`:297-302`) | Nicht-Schema-Feld verworfen; UNIQUE wirft | ⚠ gemessen (T-6) |
| `deleteRecord` | 2× | `:304-309` | — | ✓ |
| `findCollectionByNameOrId` | 5× | liefert immer `{name,id}` (`:243-245`) | wirft bei unbekannt | ⚠ gemessen (T-6) |
| `new Record(collection)` | 6× | `:366-368` | vorhanden | ✓ |
| `record.get()` — Zahl/Bool nicht gesetzt | überall | `0`/`false` (`:31-104`) | `0`/`false` | ✓ gemessen |
| `record.get()` — **Datum** | 6× per `new Date(\`${…}\`)` | Rohwert (T-Form nach `toISOString()`) | `types.DateTime`, `String()` = Leerzeichen-Form → **Goja `Invalid Date`** | ✗ **KRITISCH** gemessen (T-1) |
| `record.get()` — **JSON** | 1× (`tiers_json`) | Rohwert (Array oder String) | `types.JsonRaw` = Byte-Array, `Array.isArray` `true`, `.length` = Bytes | ✗ **KRITISCH** gemessen (T-2) |
| `record.get()` — Relation (maxSelect 1) | `user`, `campaign`, `badge` | String | String; nicht gesetzt `""` | ✓ gemessen |
| `record.get()` — Select außerhalb der Liste | — | gespeichert | gespeichert (Dao validiert nicht) | ✓ gemessen |
| `record.id` | ja | `:94` | ja | ✓ |
| `expand` / `expandRecord` | **nicht benutzt** | nicht nachgebildet | — | n/a |
| `ApiError(status, msg)` | 14× | `:339-345` | vorhanden | ✓ |
| `routerAdd(method, path, handler)` | 3× | `:379-381` | vorhanden (0.22) | ✓ |
| `c.get('authRecord')`, `c.get('admin')`, `c.json(status, body)` | ja | `:477-488` | vorhanden | ✓ |
| `$apis.requestInfo(c).data` | 3× | `:374-377` | vorhanden | ✓ |
| `cronAdd(name, expr, fn)` | 4× | `:383-385` (Ausdruck wird nur gespeichert) | vorhanden; Ausdruck nicht validiert | ✓ (Ausdrücke geprüft in `cron.test.js:33-36,196-199,414-417,582-585`) |
| `onRecordBeforeCreateRequest/BeforeUpdateRequest/AfterUpdateRequest(fn, 'col')` | 4× | `:389-397`, `fireRecordHook` mit `e.record`, `e.httpContext.get()` | vorhanden (0.22), `e.record` trägt bereits die Anfragewerte | ✓ |
| `$http.send({url, method, body, headers, timeout})` → `res.json` | 1× | `:405-416` mit Antwort-Warteschlange | vorhanden | ✓ |
| `require(\`${__hooks}/lib/…\`)`, `module.exports` | ja | `:418-443`, `loadLib` | goja_nodejs `require` | ✓ |
| `$os`, `$security` | Hooks: nein; Migration `1782690000`: `$security.randomString` | Migrationstests stubben `$security` | vorhanden | ✓ |
| Transaktionen (`runInTransaction`) | **nicht benutzt** | nicht nachgebildet | vorhanden | n/a (siehe T-6 d) |
| Nebenläufigkeit (VM-Pool) | Hooks laufen parallel je Anfrage | Harness: eine VM, sequentiell | mehrere VMs | ⚠ Race nicht darstellbar (T-6) |
| Migrationsumgebung (`migrate`, `Dao`, `SchemaField`, `Collection`) | 19 Migrationen | in 3 Testdateien einzeln gestubbt, Lookup nach **Name** | Lookup nach Name **oder ID** | ⚠ feste ID nicht bemerkt (T-3) |

---

## Fachliche Abdeckung

Tests je Funktion (Datei, in der die Funktion direkt oder über die Route läuft; Zählung per `grep -l` und Lesen der `describe`-Blöcke).

| Funktion / Regel | Fundstelle | Tests | Fehlende Randfälle / Bewertung |
|---|---|---|---|
| **lib/points.js** | | | |
| `storeTimezone`, `forgetStoreTimezone` | `:72-96` | `timezone.test.js:187-240` (Standard Berlin, gepflegt UTC, Puffer, Verwerfen) | unbekannter Wert (`'Europe/London'` → still Berlin) |
| `storeParts`, `storeDayStart` | `:100-128` | `timezone.test.js:242-273` (Sommer/Winter, beide Umstellungsnächte), `cron.test.js` (year-badges) | — |
| `config()` | `:130-146` | indirekt überall (`pts_checkin` 10/25, `pts_take` 4/5, `max_items_take` 7) | Rückfallwerte ohne `store`; Wert `0` → Standard |
| `campaignMult` | `:150-157` | `streak.test.js:399-429` (4) | Faktor 0/<1 |
| `campaignBestMult` | `:161-167` | nur über `findActiveCampaign` (`streak.test.js:551-618`) | direkt |
| `findActiveCampaign` | `:178-195` | `streak.test.js:506-627` (10), `harness-query.test.js:172-194` | Start = Ende; Grenze auf die Sekunde |
| `campaignApplies` | `:197-214` | `streak.test.js:431-465` (5, inkl. `inactive14d` ohne Besuch) | **in Produktion durch T-1 gebrochen** (`inactive14d` mit Besuch) — Test grün |
| `awardPoints`, `recomputeTotal` | `:218-250` | `points-award.test.js` (14: Zeile, `ref_id`, Abzug, Drift, veraltetes Objekt, Idempotenz) | gut |
| `hasVisitToday` | `:253-266` | `timezone.test.js:72-136` (5×2 Zeitzonen), `harness-time.test.js` | in Produktion korrekt (Filter), gemessen ✓ |
| `bumpActionCount` | `:273-295` | `streak.test.js:467-504` (5), `defaults.test.js:376-418` | — |
| `doCheckin` | `:301-346` | `scan.test.js` (Punkte, Stepper, Aktion, Geofence-Abstand), `timezone.test.js:91-123`, `cron.test.js` | Doppelscan gleichzeitig (T-6) |
| `pushCheckinConfirmation` | `:352-373` | `push-lib.test.js:415-…` (Kanal) | Textvarianten, `points <= 0`, Serie ≥ 2 (T-7) |
| `isoWeek`, `isoWeeksInYear`, `isWeekAdjacent` | `:378-389,421-448` | `streak.test.js:38-138,353-397` (Jahreswechsel 52/53, alle drei Aufrufstellen), `timezone.test.js:141-185` | Arithmetik gut; **Eingabe in Produktion `NaN`** (T-1) |
| `streakFromVisits` | `:396-419` | `streak.test.js:140-269` (13) | **in Produktion 0** (T-1) — Test grün |
| `updateStreak` | `:452-470` | `streak.test.js:271-351` (9), `timezone.test.js:163-182` | **in Produktion immer 1** (T-1) — Test grün |
| `tierSlotCount`, `asArray` | `:485-517` | `badges.test.js:57-133` (9, Array/String/`'[]'`/unlesbar) | **Produktion liefert Byte-Array** (T-2) — Tests grün mit falscher Fixture |
| `badgeTiers`, `reachedTier` | `:520-540` | `badges.test.js:57-163` | — |
| `checkBadges` (gestuft, einzeln) | `:542-599` | `badges.test.js:238-400` (13), `cron.test.js:704-953`, `scan.test.js:777-884` (`bonus_points`) | Abzeichen mit `trigger_value: 0` (→ `|| 1`) |
| `grantBadge` | `:602-624` | `badges.test.js:402-431`, `cron.test.js:581-702` | — |
| `computeProgress` | `:626-660` | `badges.test.js:165-236` (8) | — |
| `distanceM`, `assertInGeofence` | `:663-691` | `scan.test.js:119-307` (12, inkl. Metergenauigkeit, Rückfall 150 m) | gut |
| **lib/push.js** | | | |
| `CHANNELS`, `channelFor` | `:19-30` | `push-lib.test.js:359-413` (je Kategorie, fehlend/leer, Kennungen gleich App) | — |
| `collectTokens` | `:38-82` | `push-lib.test.js:57-187` (14, Einwilligung je Kategorie, alle Segmente) | `inactive14d` **in Produktion trifft alle** (T-1) — Test `:154-169` grün |
| `tokensForUser` | `:87-106` | `push-lib.test.js:189-226` (4) | — |
| `send` | `:123-168` | `push-lib.test.js:228-357` (9: Stapel >100, tote Token, Netzfehler, Zuordnung 2. Stapel) | gut |
| **scan.pb.js** `POST /api/pp/scan` | `:35-175` | `scan.test.js` (47: 401/400/404/409/410, Geofence, Punkte, Rundung, Limit 8, Antwortform, Geheimnis getrennt, `bonus_points`) | Limit exakt 7; 500 ohne `store`; Doppelscan |
| **push.pb.js** `register`/`unregister` | `:23-66` | `push.test.js` (18: Upsert, Umzug, `last_seen`, Token-Form 5 verboten/3 erlaubt je Route) | UNIQUE-Race (T-6) |
| **defaults.pb.js** `users` before-create | `:6-19` | `defaults.test.js:27-97` (7) | — |
| `users` before-update (Schreibschutz) | `:26-44` | `defaults.test.js:99-177` (7, verboten/erlaubt, Admin, Superuser, Admin am eigenen Stand) | `findRecordById` wirft → `return` (`:33`) ungetestet |
| `items` before-create (SKU, QR, 30 Punkte, Status, Schaufenster) | `:46-85` | `defaults.test.js:179-291` (12) | SKU-Zähler bei `PP-9999` |
| `items` after-update (Bring-Punkte) | `:89-156` | `defaults.test.js:293-418` (7, doppelt, pending, Team-Bestand, Faktor, Teilnahme) | Nutzer ohne Rolle; `created_by` leer; Push-Bestätigung (`:137-151`) |
| **cron.pb.js** `push-scheduled` | `:16-54` | `cron.test.js:195-378` (10, inkl. Expo nicht erreichbar, 5 Versuche, ohne Empfänger) | Obergrenze 20 |
| `streak-reset` | `:59-91` | `cron.test.js:32-193` (14, Karenz, KW 53, Zukunft, Abzeichen-Fortschritt) | **in Produktion setzt er alle zurück** (T-1) — Tests grün |
| `action-badges` | `:102-156` | `cron.test.js:581-953` (13, einfach/gestuft, nur da gewesen, nachträglich verknüpft) | Aktion ohne `ends_at` |
| `year-badges` | `:162-197` | `cron.test.js:380-579` (10), `timezone.test.js:276-320` | **in Produktion überspringt er jeden Besuch** (T-1) — Tests grün |
| **Migrationen** | 19 Dateien | 3 getestet (T-9) | Kette auf frischer DB (T-3) |
| **Skripte** | 6 | 3 getestet (T-8) | — |

---

## Weiche Assertionen — vollständige Liste

Suchbefehl: `grep -nE 'toBeDefined|toBeUndefined|toBeTruthy|toBeFalsy|expect\.any|toBeGreaterThan|toBeLessThan|toContain\(|\.skip|\.todo|\.only|not\.toThrow' tests/*.test.js` (98 Zeilen, davon die weichen):

- `toBeTruthy` (2): `icon-switcher.test.js:26`, `store-secret-migration.test.js:173`
- Untergrenzen statt Wert (2): `play-vergleichsstand.test.js:100` (`>= 20`), `worklet-purity.test.js:92` (`> 20`)
- `toBeUndefined` auf `rows()`-Momentaufnahmen (7): `points-award.test.js:64`, `scan.test.js:182,183,206,486,487`, `store-secret-migration.test.js:237` — harness-spezifisch, in PocketBase wäre das Feld `""`
- Textvorkommen als Verhaltensnachweis (T-4): `account-delete.test.js:26,39,40,41,49,50,59,60,68,74,75,83,84,95`; `email-verify.test.js:19,29,38,39,48,54,61,69,73,78,86,92,98`; `icon-switcher.test.js:43,48,59,69,76,77,83`; Quelltext-Grep auf Python/YAML: `upload-play-status.test.js:131-137,153-175`, `play-vergleichsstand.test.js:90-91`
- `toBeDefined`: 0 · `expect.any`: 0 · `.skip/.todo/.only`: 0 · `toContain` auf Statuscodes: 0 · `it` ohne `expect`: 0 von 428

---

## Geprüft und in Ordnung

- **Stabilität:** 3 Läufe, jeweils 470/470 grün, 2,94–3,09 s (vitest) — keine Flakiness. Reihenfolge: 21 von 22 Dateien shuffle-fest (T-11 ist die Ausnahme).
- **Zeitzonen-Unabhängigkeit:** Suite unter `TZ=Europe/Berlin` (Scratch-Config), `TZ=Pacific/Auckland` und `TZ=America/Los_Angeles` (Prozess-Umgebung, Config ohne `TZ`) jeweils 470/470 grün; `vitest.config.mjs:21` setzt `UTC` (Container-Zeitzone) und überschreibt eine Prozess-`TZ` (Gegenprobe grün). `timezone.test.js` stellt `process.env.TZ` je Test explizit um (`:25-36`) und prüft beide Server-Zeitzonen.
- **Harness-Selbsttests** (`harness-query.test.js` 15, `harness-time.test.js` 8): `offset`, stabile Sortierung, Nullwerte je Typ, Zeitstempelvergleich über Trennerformen — sauber begründet und korrekt.
- **Fehlerfall-Muster** in `scan.test.js`/`push.test.js` sind nicht vakuum (siehe T-13); `expect(() => …).toThrow('Nicht angemeldet')` in `scan.test.js:73-75`.
- **Sicherheitstests je verbotener/erlaubter Fall:** Token-Form (`push.test.js:181-247`, 5 verboten × 2 Routen, 3 erlaubt × 2 Routen, fremder Eintrag bleibt), Schreibschutz Punktestand/Serie/Rolle (`defaults.test.js:99-177`), Türgeheimnis getrennt und in keiner Antwort (`scan.test.js:568-665`), Leseregeln mit Regel-Auswerter samt Selbsttest (`read-rules-migration.test.js:176-206`), `store_secrets` mit `null`-Regeln (`store-secret-migration.test.js:341-351`).
- **Vertragsschutz Antwortform:** `scan.test.js:667-716` prüft Mindestmenge und Werte, lässt Ergänzungen zu — entspricht CLAUDE.md „Neue Felder hinzufügen ist erlaubt".
- **Migrationstests idempotent und rückwärts** für die drei getesteten Migrationen (`store-secret:388-412`, `push-attempts:157-171`, `read-rules:371-378`).
- **`realPush`-Modus** (`harness.js:317-318,430-437`): `lib/push.js` läuft echt, nur `$http.send` ist gestellt — die Einwilligungslogik ist damit wirklich unter Test.
- **Hook-Feldnamen:** alle 61 per `set`/`get` benutzten Feldnamen existieren in den Migrationen (`comm`-Abgleich, nur `authRecord`/`admin` als Kontextschlüssel übrig). `points_log.kind = 'bring'` ist in der Select-Liste (`1700000400_tier_badges.js:59`).
- **PocketBase-Verhalten, das der Harness richtig trifft (gemessen):** `findFirstRecordByFilter` wirft bei 0 Treffern; `findRecordById` wirft; `1=1` als Filter gültig; Leerzeichen-Datumsgrenze im Filter trifft; Nullwerte `0`/`false`/`""`; Relation als String; `limit 0` = alle.
- **CI-Sperren:** `deploy.yml` (`needs: tests`, ohne `always()`) und `release.yml` (`needs: pruefung`) lassen ohne grüne Suite nichts durch; `tests.yml` läuft bei Push und PR auf `main` mit Node 22, `npm ci`, gepinnten Actions.
- **Skript-Tests laufen offline und ohne Geheimnisse** (Stub-Server `127.0.0.1`, Attrappen, Wegwerf-Repos), `python3` 3.11.15 vorhanden.

---

## Unklar / zu klären

1. **Ist-Zustand auf der Instanz zu T-1:** Wie ist `users.streak_weeks` heute verteilt (erwartet nach Befund: nur 0 und 1)? Steht `user_badges.progress` der `streak_weeks`-Abzeichen überall auf 0? Wie viele Empfänger:innen hatte die letzte Nachricht mit Segment `inactive14d`? — Nur über die Admin-API der Instanz messbar; hier nicht möglich. Bis dahin gilt: im Repo gemessen (echtes Binary, gleiche Version), auf dem Server **nicht** gemessen.
2. **Ist-Zustand zu T-2:** Wie viele Ränge stehen in `store.tiers_json` der Instanz, und gibt es `user_badges.current_tier` in `platin`/`diamant`, obwohl weniger Ränge gepflegt sind?
3. **Läuft die Instanz wirklich auf 0.22.21?** `deploy-verify.py` prüft Schemamerkmale, nicht die Version. `/api/health` von 0.22 nennt keine Version; ein Blick ins Admin-UI oder `docker image inspect` klärt es. Wäre dort inzwischen 0.23+, sähe das Bild komplett anders aus (jeder Hook bräche).
4. **`record.getDateTime(f).time()`** als Alternative zum String-Parsen: Ob Goja ein Go-`time.Time` als brauchbares Objekt liefert, wurde nicht gemessen; die Empfehlung in T-1 (String-Ersatz `' '`→`'T'`) ist deshalb der sichere Weg.
5. **`git status`** zeigte während der Prüfung zeitweise `?? docs/audit/release-2026-09/app-ui-a11y.md`, `app-grundgeruest.md`, `app-screens.md`, `ci-deploy-release.md`, `doku-und-altbefunde.md` — Berichte anderer Prüfer:innen aus derselben Runde, nicht Teil dieses Audits; beim abschließenden Abgleich war nur noch `tests.md` unversioniert. Zu Beginn stand außerdem `package-lock.json` als geändert (`-27 Zeilen`); die Änderung stammte nicht aus diesem Audit und war am Ende nicht mehr vorhanden.
6. **Andere PocketBase-Instanz im Prüf-Sandkasten:** Während der Sondierung lief auf `127.0.0.1:8099` eine Instanz einer anderen Prüfung (`scratchpad/backend-fachlogik/pb/`); die eigene Sondierung wich auf Port 8137 aus und wurde nach PID beendet. Falls der Backend-Bericht Messungen gegen 0.22.21 enthält, sollten sie mit T-1/T-2 übereinstimmen.

---

## Empfehlung: Rauchtest gegen das echte Binary

Die hier gefahrene Sondierung ist als Test wiederholbar und kostet unter zwei Sekunden Laufzeit:

1. `pocketbase_0.22.21_linux_amd64.zip` (offizielles Release, ~12 MB) einmal je CI-Lauf laden oder cachen; Version aus `pocketbase/Dockerfile` lesen, damit Test und Abbild nicht auseinanderlaufen.
2. `pocketbase serve` auf freiem Port mit `--migrationsDir=pocketbase/pb_migrations --hooksDir=<Wegwerfverzeichnis mit lib/ + Sonden-Hook>` und leerer `--dir`.
3. Der Sonden-Hook registriert `GET /probe` und prüft: alle Migrationen angewendet (deckt T-3), `new Date(\`${record.get(datumsfeld)}\`)` gültig (T-1), `lib.tierSlotCount()` bei 3 Rängen = 3 und bei `[]` = 5 (T-2), `lib.updateStreak` über eine Woche = +1.
4. Vitest ruft `/probe` und vergleicht konkrete Werte; danach Prozess nach PID beenden.

Das ersetzt den Harness nicht — er bleibt für die Fachlogik-Tests das richtige Werkzeug —, aber es schließt die Lücke, die dieser Bericht in zwei KRITISCH-Befunden gefunden hat: Der Harness kann nur so treu sein, wie jemand ihn baut; das Binary ist die Wahrheit.

---

*Alle Wegwerfdateien (Scratch-Configs, Harness-Sonde, PocketBase-Binary, Migrations-Kopie, `pb_data`, heruntergeladene Quelltexte) wurden nach der Messung gelöscht; `git status` zeigt am Ende außer `?? docs/audit/release-2026-09/tests.md` keine Änderung, `git diff` ist leer.*
