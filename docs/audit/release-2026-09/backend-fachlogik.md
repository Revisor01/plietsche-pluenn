# Release-Audit 2026-09: Backend-Fachlogik

**Datum:** 26.09.2026
**Geprüfter Commit:** `06b68dc` (Branch `main`)
**Umfang:** `pocketbase/pb_hooks/lib/points.js` (692 Zeilen), `scan.pb.js` (175),
`defaults.pb.js` (156), `cron.pb.js` (197); `lib/push.js` und `push.pb.js` nur, soweit
sie Fachlogik berühren. Zum Verständnis der gewollten Logik gegengelesen:
`CHANGELOG.md`, `docs/openapi.yaml`, die 19 Migrationen in `pocketbase/pb_migrations/`,
`tests/harness.js` und die Backend-Tests in `tests/`. Zugriffsregeln und Sicherheit
sind nicht Teil dieses Berichts (eigener Prüfbereich).

**Vorgehen.** Jede Funktion der vier Hook-Dateien wurde gelesen, nicht überflogen.
Verdachtsfälle wurden auf zwei Wegen nachgestellt:

1. **Im Harness** (`tests/harness.js`, Vitest) mit Wegwerf-Tests im Scratchpad — für
   Fachlogik, die sich in Node prüfen lässt.
2. **In der echten Laufzeit.** Das Dockerfile pinnt `ghcr.io/muchobien/pocketbase:0.22.21`.
   Dieselbe Version wurde als Binärdatei (`pocketbase_0.22.21_linux_amd64`) ins Scratchpad
   geladen und mit einer Kopie von `pb_hooks/` und `pb_migrations/` auf einer leeren
   Datenbank gestartet. Dann per REST: Superuser anlegen, Besucherkonto registrieren,
   Türcode scannen, Teil scannen, Teil einreichen und freigeben, Punktestand per PATCH
   angreifen, Push-Token registrieren, Aktion anlegen. Dazu ein Sondier-Hook (nur im
   Scratchpad), der einzelne Bibliotheksfunktionen direkt aufruft und Goja-Eigenheiten
   abfragt. Das Repo wurde dabei nicht verändert; der Arbeitsbaum ist sauber.

Der zweite Weg war entscheidend: **Drei der vier schweren Befunde sind im Harness
unsichtbar** und zeigen sich erst in Goja bzw. gegen echte PocketBase-Datensätze.
Die 470 Tests im Repo sind alle grün und beweisen an dieser Stelle nichts (siehe B-17).

Die Berichte vom 14.09.2026 (`docs/audit/`) wurden zur Orientierung gelesen, aber
nichts daraus übernommen; die dort als behoben geführten Punkte 2, 4, 5, 7, 8, 10
wurden am aktuellen Code nachgeprüft (Ergebnis unter „Geprüft und in Ordnung" bzw.
B-3 für Punkt 7).

---

## Zusammenfassung

Die Fachlogik ist, gelesen als JavaScript, sauber gebaut: Punkte werden aus dem Verlauf
neu gerechnet, die ISO-Wochenlogik samt 53. Woche und Zeitumstellung stimmt, die
Idempotenz-Sperren (Bring-Punkte, Abzeichen-Stufen, Push-Versand) halten, und die
Antwortformen der Scan-Route entsprechen dem Vertrag in `docs/openapi.yaml`. **In der
Laufzeit, für die sie geschrieben ist, funktioniert sie aber an drei Stellen nicht.**
Erstens: PocketBase führt jeden Handler in einem isolierten Kontext aus, in dem
Datei-globale Konstanten und Funktionen nicht existieren. `scan.pb.js` ruft eine solche
Funktion in allen drei Erfolgszweigen — **jeder Tür- und Teile-Scan endet mit HTTP 400
„Something went wrong"**, nachdem Besuch, Punkte und `taken_at` bereits geschrieben
sind; die Push-Registrierung scheitert aus demselben Grund vollständig. Zweitens: Goja
kann das Datumsformat, in dem PocketBase Felder zurückgibt (`2026-09-26 07:41:38.726Z`,
Leerzeichen statt `T`), nicht parsen. Damit ist **die Serie dauerhaft auf 1, das
nächtliche Zurücksetzen löscht jede Serie, das Serien-Abzeichen bleibt bei 0, das
Treue-Abzeichen wird nie vergeben**, und die Zielgruppe „inaktiv" greift falsch.
Drittens kommt `tiers_json` als Byte-Array an, sodass die Begrenzung der Abzeichen-Stufen
auf die gepflegten Ränge nie wirkt. Dazu eine Migration, die an eine Datenbank-ID der
Produktionsinstanz gebunden ist und eine frische Instanz am Start hindert.

Alle vier wurden **in PocketBase 0.22.21 reproduziert**, nicht nur gelesen. Ob die
Produktion die betroffenen Hook-Stände schon fährt, ließ sich von hier nicht messen;
die drei auslösenden Commits (`262abfd`, `db6b04f`, `7f19c41`) liegen nach der
Einrichtung des automatischen Deploys (`cd20634`), sodass es sehr wahrscheinlich ist.
Der Datums- und der `tiers_json`-Befund betreffen dagegen Code, der seit Wochen
ausgeliefert ist.

**Release-Empfehlung für diesen Bereich: nicht freigeben.** B-1 und B-2 müssen behoben
und — anders als bisher — gegen die echte PocketBase-Version geprüft sein, bevor die
App in den Laden geht. Der Weg dahin ist kurz: B-1 ist ein Verschieben von drei
Helfern, B-2 ein Datums-Parser an sechs Stellen, und der Praxistest gegen die gepinnte
Binärdatei ist in dieser Prüfung bereits einmal durchgespielt worden.

---

## Befunde im Überblick

| ID | Kurztitel | Schwere | Nachweis |
|---|---|---|---|
| B-1 | Datei-globale Helfer sind im PocketBase-Handler nicht sichtbar — Scan-Route und Push-Registrierung brechen ab | KRITISCH | reproduziert (PocketBase 0.22.21) |
| B-2 | Goja parst PocketBase-Datumswerte nicht — Serie, Reset-Cron, Treue-Abzeichen, „inaktiv"-Zielgruppe rechnen mit `Invalid Date` | KRITISCH | reproduziert (PocketBase 0.22.21) |
| B-3 | `tiers_json` kommt als Byte-Array — Stufenbegrenzung nach Rängen wirkt nie, Rang-Seed läuft leer | HOCH | reproduziert (PocketBase 0.22.21) |
| B-4 | Migration an Produktions-ID gebunden — frische Instanz startet nicht | HOCH | reproduziert (PocketBase 0.22.21) |
| B-5 | Vom Superuser angelegte Teile landen als „zu prüfen" ohne Einreicher | MITTEL | reproduziert (PocketBase 0.22.21) |
| B-6 | Keine Transaktion um Scan und Check-in — Teilzustände und Doppelvergabe bei Nebenläufigkeit | MITTEL | Simulation im Harness, Rest aus Code gelesen |
| B-7 | Ausgeblendete Abzeichen (`is_visible = false`) zahlen weiter Punkte aus | MITTEL | reproduziert (Harness) |
| B-8 | Teilnahme-Einzelabzeichen kommt erst mit dem Nachtlauf, nicht bei der Freigabe | NIEDRIG | reproduziert (Harness) |
| B-9 | Ein Fehler bei einem Datensatz bricht den Cron-Lauf für alle folgenden ab | NIEDRIG | aus Code gelesen |
| B-10 | Korrekturrecht für App-Admins im Schreibschutz ist über die API unerreichbar | NIEDRIG | reproduziert (PocketBase 0.22.21) |
| B-11 | SKU-Vergabe kippt bei `PP-10000` und bei fremden SKUs ohne Ziffer | NIEDRIG | reproduziert (Harness) |
| B-12 | `qr_code` nicht eindeutig — zweites Teil mit gleichem Code ist unerreichbar | NIEDRIG | reproduziert (Harness) |
| B-13 | Konfigurierte 0 gilt als „nicht gepflegt" (Punktwerte, Radius, Teilepunkte) | NIEDRIG | reproduziert (Harness) |
| B-14 | Fehlertexte: PocketBase hängt einen Punkt an; „Ungueltiger Token" ohne Umlaut; irreführender Text bei archiviertem Teil ohne Zeitstempel | NIEDRIG | reproduziert (PocketBase 0.22.21) / Harness |
| B-15 | Toter Code und doppelte Literale (`selfEntryBonus`, `_deviceId`, `lat/lng` an `doCheckin`, Teilepunkte 30 an zwei Stellen) | NIEDRIG | aus Code gelesen |
| B-16 | Kein Schutz gegen unbeabsichtigtes Anheben der PocketBase-Version — die Hooks sind vollständig 0.22-gebunden | NIEDRIG | aus Code gelesen |
| B-17 | Der Harness kann B-1, B-2 und B-3 grundsätzlich nicht finden | MITTEL | reproduziert (Harness grün, Laufzeit rot) |

Zählung: 2 KRITISCH, 2 HOCH, 4 MITTEL, 9 NIEDRIG.

---

## B-1 — Datei-globale Helfer sind im PocketBase-Handler nicht sichtbar (KRITISCH)

**Beschreibung.** PocketBase 0.22 lädt die `*.pb.js`-Dateien in einer Lade-VM, gibt
aber jeden Handler (Route, Cron, Record-Hook) als Quelltext an einen Pool getrennter
Ausführungs-VMs weiter. Dort existieren nur die PocketBase-Globals (`$app`, `$apis`,
`require`, `__hooks` …) — **nicht** die Konstanten und Funktionen, die auf oberster
Ebene der Datei stehen. Die PocketBase-Dokumentation nennt das „Handlers scope" und
empfiehlt, geteilten Code per `require()` **innerhalb** des Handlers zu laden. Die
Bibliotheken `lib/points.js` und `lib/push.js` werden genau so eingebunden und sind
deshalb nicht betroffen. Drei Stellen halten sich nicht daran:

- `scan.pb.js:27-33` — `function awardBadgesAndCountBonus(...)` auf Dateiebene,
  aufgerufen in `:95`, `:108` und `:163`, also in **allen drei Erfolgszweigen** der
  Route (zweiter Türscan, erster Türscan, Teile-Scan).
- `push.pb.js:14-19` — `const EXPO_TOKEN_RE` und `function assertExpoToken`,
  aufgerufen in `:32` und `:59`, also bei **jeder** An- und Abmeldung eines Geräts.
- `cron.pb.js:13` — `const MAX_SEND_ATTEMPTS = 5`, gelesen in `:46` im Fehlerpfad
  des Minuten-Jobs.

**Auswirkung aus Nutzersicht.**
- *Tür-Scan:* Besuch, Check-in-Punkte, Serie und Stepper-Punkte werden geschrieben
  (`doCheckin` läuft vor dem Aufruf durch), dann bricht die Route ab. Die App zeigt
  den englischen PocketBase-Standardtext „Something went wrong while processing your
  request." und keinen Punktestand. Wer den Türcode mit `items_count` erneut scannt,
  bekommt die Stepper-Punkte **erneut** gutgeschrieben (`scan.pb.js:91-93` läuft vor
  `:95`), ohne je eine Bestätigung zu sehen.
- *Teile-Scan:* Das Teil wird als mitgenommen markiert und die Punkte sind gebucht
  (`:153`, `:160-161`), dann Fehler. Der zweite Versuch antwortet „Schon mitgenommen".
- *Abzeichen:* `checkBadges` sitzt hinter dem Aufruf und läuft bei Scans **nie**.
  Stammgast-, Holer- und Serien-Abzeichen bewegen sich nur noch, wenn zufällig eine
  Freigabe (`defaults.pb.js:133`) oder ein Nachtlauf `checkBadges` für die Person ruft.
- *Push:* Kein Gerät kann sich registrieren oder abmelden → es kommen keine
  Mitteilungen an, und der Widerruf über die App schlägt fehl.
- *Cron:* Ist Expo nicht erreichbar, wirft der Job bei `:46`, bevor `saveRecord` in
  `:47` den Zähler schreibt. `send_attempts` bleibt 0, die Nachricht wird **jede Minute
  ohne Ende** erneut versucht, und alle weiteren fälligen Nachrichten desselben Laufs
  bleiben liegen. Genau das, wogegen der Zähler eingebaut wurde.

**Nachweis (reproduziert).** PocketBase 0.22.21, frische Datenbank, Repo-Hooks:

```
GET  /api/probe/scope   (Sondier-Hook mit einer Konstante und einer Funktion auf Dateiebene)
→ {"constant":"ERR: TOP_LEVEL_CONST is not defined","helper":"ERR: topLevelHelper is not defined"}

POST /api/pp/scan {"qr_code":"<Türgeheimnis>"}                → HTTP 400 "Something went wrong…"
POST /api/pp/scan {"qr_code":"<Türgeheimnis>","items_count":2} → HTTP 400 "Something went wrong…"
Datenbank danach: visits = 1 Zeile (points_awarded 10);
                  points_log = ('checkin',10,'Check-In im Laden'), ('checkin',10,'2 Teile mitgenommen');
                  users.points_total = 20, streak_weeks = 1

POST /api/pp/scan {"qr_code":"PP-0001"} (zweites Konto)        → HTTP 400 "Something went wrong…"
Datenbank danach: items.taken_at = 2026-09-26 07:47:12.755Z, user2.points_total = 40,
                  user_badges für dieses Konto: 0 Zeilen (checkBadges lief nicht)
POST /api/pp/scan {"qr_code":"PP-0001"} erneut                  → HTTP 409 "Schon mitgenommen."

POST /api/pp/push/register {"expo_token":"ExponentPushToken[abcDEF123]"} → HTTP 400 "Something went wrong…"
POST /api/pp/scan {"qr_code":"gibt-es-nicht"}                  → HTTP 404 "Unbekannter QR-Code."  (Fehlerpfade vor dem Aufruf funktionieren)
```

Der Harness (`tests/harness.js:447-449`) lädt Datei und Handler in **einen**
`vm`-Kontext; dort ist die Funktion sichtbar, und `tests/scan.test.js` ist grün.

**Stand der Auslieferung.** Die drei Stellen stammen aus `262abfd` (Scan),
`db6b04f` (Push) und `7f19c41` (Cron), alle vom 14.09.2026 und alle **nach**
`cd20634` („Auslieferung eingerichtet und in Betrieb"). Der Deploy-Workflow läuft bei
jedem Push auf `pocketbase/**`. Ich konnte die Instanz nicht befragen; zu messen ist:
Türcode-Scan mit einem Testkonto → kommt 400 „Something went wrong", ist B-1 draußen.

**Empfehlung.** Die drei Helfer in `lib/points.js` bzw. `lib/push.js` verschieben
(z. B. `lib.awardBadgesAndCountBonus`, `push.assertExpoToken`, `push.MAX_SEND_ATTEMPTS`)
und im Handler über das `require`-Ergebnis ansprechen. Eine Regel dazu in `CLAUDE.md`:
„In `*.pb.js` steht auf Dateiebene nichts außer `routerAdd`/`cronAdd`/`onRecord*`."
Prüfung gegen die echte Laufzeit, siehe B-17.

---

## B-2 — Goja parst PocketBase-Datumswerte nicht (KRITISCH)

**Beschreibung.** PocketBase gibt Datumsfelder als `types.DateTime` zurück; in einer
Zeichenkette (`${rec.get('checkin_at')}`) wird daraus `2026-09-26 07:41:38.726Z` —
Leerzeichen statt `T`. Node akzeptiert das, **Goja nicht**: `new Date('2026-09-26
07:41:38.726Z').getTime()` ist `NaN`. Das gilt auch innerhalb derselben Anfrage,
denn `record.set('streak_last_visit', iso)` normalisiert den Wert sofort zu
`DateTime`. Sechs Stellen bauen darauf:

| Stelle | Ausdruck | Wirkung mit `Invalid Date` |
|---|---|---|
| `lib/points.js:467` `updateStreak` | `isoWeek(new Date(lastStr))` → `NaN` | `thisWeek === NaN` falsch, `isWeekAdjacent(NaN, …)` falsch → **Serie wird bei jedem Besuch auf 1 gesetzt** (`:474`) |
| `lib/points.js:412` `streakFromVisits` | `isoWeek(new Date(raw))` je Besuch → `NaN` | `weeks[0] !== thisWeek` und nicht benachbart → **liefert immer 0** (`:420`); das ist der Fortschritt des Serien-Abzeichens (`:646`) |
| `cron.pb.js:80` `streak-reset` | `isoWeek(new Date(last))` → `NaN` | Bedingung `:85` immer wahr → **jede Serie > 0 wird jede Nacht um 3:05 auf 0 gesetzt** |
| `cron.pb.js:184` `year-badges` | `new Date(…)`, `isNaN` → `continue` | **kein Besuch zählt, kein Treue-Abzeichen wird je vergeben** |
| `lib/points.js:206-208` `campaignApplies` (`inactive14d`) | `(now - Invalid Date)/86400000 >= 14` → `false` | Aktion „nur für Inaktive" gilt **nur für Konten ohne jeden Besuch**, für tatsächlich Inaktive nicht |
| `lib/push.js:65` `collectTokens` (`inactive14d`) | `days = NaN; if (days < 14) continue` → nie | Push-Zielgruppe „inaktiv" **erreicht alle**, auch wer gestern da war (aus Code gelesen) |

Nicht betroffen: alle Filter-Vergleiche (`hasVisitToday`, `findActiveCampaign`,
`action-badges`), weil PocketBase dort selbst vergleicht; und die Leerprüfungen
`${item.get('taken_at')}.trim() !== ''`.

**Auswirkung aus Nutzersicht.** „Wochen in Folge" steht nach jedem Check-in auf 1
und ist am nächsten Morgen 0. Die Push-Bestätigung „N Wochen in Folge — weiter so!"
(`points.js:368`) kommt nie. Das Abzeichen „Durchhalter" bleibt auf 0/2. Am 31.12.
passiert nichts. Wer als Zielgruppe „streak2plus" gepflegt hat, erreicht niemanden.
Alle vier Fixes des CHANGELOG-Abschnitts „Serie" (1.0.0 (33)) sind in Produktion
unwirksam, obwohl sie im Harness grün sind.

**Nachweis (reproduziert).** Sondier-Hook, der die echten Bibliotheksfunktionen gegen
echte Datensätze ruft. Ausgangslage: ein Konto mit einem Besuch heute; dann
`streak_last_visit` auf vor 7 Tagen und `streak_weeks` auf 3 gesetzt und neu geladen:

```
reload                     = "2026-09-19 07:50:02.527Z"   ← so kommt das Feld zurück
parsedValid                = false
isoWeekLast                = NaN            isoWeekNow = 202639
updateStreak               → streak_weeks = 1             (erwartet 4)
cronWouldReset (Bed. :85)  = true                         (erwartet false: Vorwoche = Karenz)
streakFromVisits           = 0                            (erwartet 1: ein Besuch diese Woche)
yearsCounted (wie :182-189)= 0                            (erwartet 1)
inactive14d, letzter Besuch vor 30 Tagen → campaignApplies = false   (erwartet true)
```

Zusätzlich direkt: `new Date('2026-08-03 22:04:48.063Z')` → `INVALID`,
`new Date('2026-08-03T22:04:48.063Z')` → gültig. Der Harness speichert, was `set()`
bekommt (ISO mit `T`), und die Tests seeden ISO-Strings — er kann diesen Unterschied
nicht sehen (`tests/harness.js:106-108`). Ausgerechnet der Kommentar in
`harness.js:157-159` beschreibt die Leerzeichen-Form, bildet sie aber nur im Filter
nach, nicht bei `get()`.

**Empfehlung.** Ein Parser an einer Stelle in `lib/points.js` (etwa
`parsePbDate(v)`: Leerstring → `null`, sonst `new Date(String(v).replace(' ', 'T'))`),
an allen sechs Stellen verwenden; alternativ `rec.getDateTime(feld).time().unix()`.
Die App macht es in `mobile/app/(visitor)/admin/actions.tsx:30-33` bereits richtig
vor. Im Harness `FakeRecord.get` für Datumsfelder auf die PocketBase-Form umstellen,
damit die Suite den Fall künftig trägt.

---

## B-3 — `tiers_json` kommt als Byte-Array (HOCH)

**Beschreibung.** `record.get()` liefert für ein `json`-Feld `types.JsonRaw`, also
`[]byte`. Goja bildet eine Go-Slice als Array ab: `Array.isArray(...)` ist `true`,
`.length` ist die **Zahl der Bytes**, `JSON.stringify` ergibt Zahlen. `asArray`
(`lib/points.js:503-516`) reicht so ein „Array" unverändert durch, und
`tierSlotCount` (`:485-496`) rechnet `Math.min(5, byteLänge)` — bei jeder gepflegten
Rangliste mit mehr als vier Zeichen also 5. Der im CHANGELOG (1.0.0 (33)) als
behoben geführte Fehler „Server vergab Stufen, die die App nicht zeigt" ist in
Produktion damit **nicht** behoben; der Test `badges.test.js` prüft gegen JS-Arrays
und Strings, nie gegen Bytes.

Derselbe Mechanismus lässt die Seed-Migration `1700000800_diamant_tiers.js:56`
ins Leere laufen: `!rec.get('tiers_json')` ist bei einem leeren `JsonRaw`-Objekt
`false`, die Standardränge werden auf einer frischen Instanz nie eingetragen.

**Auswirkung aus Nutzersicht.** Entfernt das Team einen Rang (drei statt fünf), zeigt
die App drei Stufen, der Server vergibt und **bezahlt** weiter Platin und Diamant —
Punkte, die niemand sieht und niemand erklären kann. Ohne gepflegte Ränge (frische
Instanz) gibt es keinen Rang-Ring auf der Startseite.

**Nachweis (reproduziert).** Nach `PATCH store {tiers_json: [Bronze, Silber, Gold]}`:

```
GET /api/probe/tiers
→ isArray: true, length: 81, asArray: "[91,123,34,97,116,…,93]", tierSlotCount: 5   (erwartet 3)
Vor dem PATCH (frische Instanz nach allen Migrationen): length 0, stringified "[]"
→ Rang-Seed aus 1700000800 nicht angekommen
```

**Empfehlung.** JSON-Felder als Text lesen und parsen: `rec.getString('tiers_json')`
(JsonRaw hat `String()`) → `JSON.parse`. `asArray` entsprechend erweitern:
kein `Array.isArray` auf dem Rohwert, sondern erst in Text wandeln. Migration
`1700000800` analog (`getString` prüfen). Testfall mit Byte-Array im Harness
oder besser gegen die echte Laufzeit (B-17).

---

## B-4 — Migration an eine Produktions-ID gebunden (HOCH)

**Beschreibung.** `pocketbase/pb_migrations/1782637408_updated_store.js:4` sucht die
Sammlung über `findCollectionByNameOrId("8hdpqi33x65ptii")` — die Datenbank-ID der
`store`-Sammlung **einer** Instanz (die Datei ist ein Export der Admin-Oberfläche,
Commit `5552836`). Auf jeder anderen Instanz existiert diese ID nicht; die Migration
wirft, PocketBase bricht die Migrationskette ab und **startet nicht**. Inhaltlich ist
sie außerdem redundant zu `1700000800_diamant_tiers.js:42-50`, und ihr Rückwärtsgang
(`:22-38`) fügt das Feld erneut hinzu statt es zu entfernen.

**Auswirkung.** Produktion ist nicht betroffen (dort ist die Migration als angewandt
vermerkt). Jede frische Instanz — zweiter Standort, Wiederaufbau ohne `pb_data`,
Test- oder Staging-Umgebung, ein Praxistest in der CI — fällt beim Start um. Der
Deploy-Workflow prüft die Zahl der Migrationsdateien (`deploy.yml`), nicht ob sie auf
leerem Grund durchlaufen.

**Nachweis (reproduziert).**

```
$ pocketbase serve --migrationsDir <Kopie von pb_migrations> (leeres pb_data)
Error: Failed to apply migration 1782637408_updated_store.js: sql: no rows in result set
```

Nach Entfernen dieser einen Datei aus der Kopie liefen die übrigen 18 Migrationen
durch und die Instanz startete. Für alle weiteren Messungen dieses Berichts lief die
Instanz ohne diese Datei.

**Empfehlung.** Die Datei auf `findCollectionByNameOrId('store')` umschreiben und
idempotent machen (Feld nur anlegen/anpassen, wenn nötig), oder — da `1700000800`
dasselbe tut — auf eine leere `migrate(() => {}, () => {})` reduzieren; die Datei
selbst muss bleiben, weil ihr Name in der Produktion vermerkt ist. Dazu ein
CI-Schritt „Migrationen auf leerer Datenbank durchlaufen lassen" (B-17).

---

## B-5 — Vom Superuser angelegte Teile landen als „zu prüfen" (MITTEL)

**Beschreibung.** `defaults.pb.js:73-84` liest `e.httpContext.get('authRecord')`. Für
den PocketBase-Superuser (Admin-Oberfläche, `admin`-Token) ist das `null`; die Rolle
fällt auf `'visitor'` (`:79`), das Teil wird `pending` (`:81`), `is_showcase` wird auf
`false` gezwungen (`:84`) und `created_by` bleibt leer (`:74`). Der Superuser ist im
Hook nur beim **Ändern** von Nutzern berücksichtigt (`:36-37`), nicht beim Anlegen
von Teilen.

**Auswirkung.** Wer Bestand über die Admin-Oberfläche einpflegt (die Existenz von
`1782637408` zeigt, dass sie benutzt wird), sieht die Teile nicht im Laden-Tab und
nicht im Schaufenster, bis jemand sie aus der App freigibt. Punkte fürs Bringen
entstehen dabei nicht (kein `created_by`) — das ist richtig, der Umweg über die
Freigabe aber nicht.

**Nachweis (reproduziert).**

```
POST /api/collections/items/records  (Superuser-Token)  {"title":"Hose","points":30}
→ status: "pending", sku PP-0002, created_by: ""
POST /api/pp/scan {"qr_code":"PP-0002"} → HTTP 409 "Noch nicht freigegeben."
```

**Empfehlung.** `e.httpContext.get('admin')` wie im Nutzer-Hook auswerten und den
Superuser als Team behandeln (`approved`, Schaufenster nach Angabe).

---

## B-6 — Keine Transaktion um Scan und Check-in (MITTEL)

**Beschreibung.** Kein Hook nutzt `$app.dao().runInTransaction(...)`. In `scan.pb.js`
werden Besuch, mehrere `points_log`-Zeilen, `users.points_total`, `streak_*`,
`action_counts`, `items.taken_at` und `user_badges` in getrennten Schreibvorgängen
gesetzt. Zwei Folgen:

1. **Teilzustände bei Fehlern.** Bricht die Route nach den Schreibvorgängen ab
   (heute durch B-1, morgen durch jeden anderen Fehler in `checkBadges`), sind Besuch
   und Punkte da, die Antwort fehlt. B-1 hat das live gezeigt (20 Punkte, ein Besuch,
   zwei Fehlermeldungen).
2. **Wettläufe.** Der Doppel-Check-in-Schutz (`lib/points.js:310`) prüft ohne Sperre
   erneut; zwei Anfragen, die beide vor dem ersten `saveRecord` prüfen, legen zwei
   Besuche an. Beim Teile-Scan gibt es keinen zweiten Blick: zwei Konten, die dasselbe
   Teil innerhalb weniger Millisekunden scannen, bekommen beide die Punkte
   (`scan.pb.js:127` prüft, `:160` schreibt). `recomputeTotal` (`:237-248`) kann bei
   zwei parallelen Vergaben den kleineren Stand zuletzt speichern (heilt sich bei der
   nächsten Vergabe). PocketBase 0.22 führt Handler parallel aus (VM-Pool), SQLite
   serialisiert nur die Schreibvorgänge.

**Auswirkung.** Doppelter Besuchsbonus bei zwei gleichzeitigen Anfragen (die App
sperrt die Kamera während eines Scans, was den Alltagsfall abfängt); zwei Personen
mit Punkten für ein Teil beim Tablet im Laden — selten, aber real.

**Nachweis.** Wettlauf im Harness simuliert (beide Guards sehen noch keinen Besuch):
2 Besuche, 20 Punkte. Die Teilzustände sind unter B-1 live gemessen. Der echte
Wettlauf zweier Anfragen ist aus dem Code gelesen.

**Empfehlung.** Beide Zweige der Scan-Route in `runInTransaction` legen, im
Teile-Zweig `taken_at` als Erstes setzen und speichern (Konflikt = 409), erst dann
Punkte buchen. Für den Besuch reicht die Transaktion um `hasVisitToday` + `saveRecord`.

---

## B-7 — Ausgeblendete Abzeichen zahlen weiter Punkte aus (MITTEL)

**Beschreibung.** `checkBadges` (`lib/points.js:544`) lädt `badges` mit `1=1` und
bewertet jedes — auch solche mit `is_visible = false`. Laut Migration
`1782670000_secret_badges.js:6-8` bedeutet unsichtbar „Entwurf, ausrangiert — auch wer
es erfüllt hat, sieht es nicht". Der Server legt trotzdem `user_badges` an und
schüttet Stufen-Boni aus (`:588-596`).

**Auswirkung.** Ein Entwurf mit Belohnung, den das Team noch nicht freigegeben hat,
oder ein ausrangiertes Abzeichen zahlt Punkte, die im Verlauf als „Entwurf — bronze"
stehen; der Kontostand springt, ohne dass in der Sammlung etwas dazukommt.

**Nachweis (reproduziert, Harness).** Abzeichen `is_visible: false`, `tier_bronze: 1`,
`reward_bronze: 500`; Türscan → `bonus_points: 500`, `points_total: 510`.

**Empfehlung.** Fachlich klären, was „unsichtbar" heißen soll (nicht bewerten, oder
bewerten ohne Bonus). Dann in `checkBadges` filtern (`is_visible = true`) oder den
Bonus aussetzen; `is_secret` bleibt davon unberührt (das zählt ausdrücklich).

---

## B-8 — Teilnahme-Einzelabzeichen kommt erst mit dem Nachtlauf (NIEDRIG)

**Beschreibung.** Bei der Freigabe ruft `defaults.pb.js:133` `checkBadges`, aber für
`kind = 'single'` mit `trigger_type = 'action_participation'` ist `autoEval` falsch
(`lib/points.js:573`); vergeben wird nur im Cron `action-badges` um 3:20. Der Kommentar
über dem Job (`cron.pb.js:94-96`, „Der Regelfall läuft sofort") stimmt nur für
gestufte Abzeichen.

**Auswirkung.** Wer ein Teil zur Aktion bringt, sieht das Teilnahme-Abzeichen erst am
nächsten Morgen; die Push „Dein Teil ist freigegeben" (`defaults.pb.js:143-149`)
nennt es nicht.

**Nachweis (reproduziert, Harness).** Freigabe mit `campaign` und `mult_bring: 2`,
verknüpftes Einzelabzeichen: `user_badges.current_tier = 'none'`, Punkte nur fürs
Bringen (10).

**Empfehlung.** Entweder in `defaults.pb.js` nach `checkBadges` das verknüpfte
Einzelabzeichen per `grantBadge` vergeben, oder den Kommentar im Cron an den
tatsächlichen Ablauf anpassen.

---

## B-9 — Ein Fehler bei einem Datensatz bricht den Cron-Lauf ab (NIEDRIG)

**Beschreibung.** In `streak-reset` stehen `dao.saveRecord(u)` (`cron.pb.js:74`, `:87`)
außerhalb jedes `try`, in `push-scheduled` ebenso `dao.saveRecord(msg)` (`:47`, `:52`).
Ein Speicherfehler an einer Person oder Nachricht beendet den Lauf für alle folgenden.
`action-badges` und `year-badges` kapseln je Datensatz sauber.

**Nachweis.** Aus Code gelesen. **Empfehlung.** `try/catch` je Schleifendurchlauf,
wie in den anderen beiden Jobs.

---

## B-10 — Korrekturrecht für App-Admins ist über die API unerreichbar (NIEDRIG)

**Beschreibung.** `defaults.pb.js:38-39` lässt eine Person mit `role = 'admin'` fremde
Punktestände korrigieren. Die `users`-Sammlung trägt aber die PocketBase-Standardregel
`updateRule: id = @request.auth.id` (keine Migration ändert sie), sodass ein App-Admin
den fremden Datensatz gar nicht erreicht. Der Zweig ist toter Code; der Test
`defaults.test.js:146-153` („laesst die Verwaltung korrigieren") prüft einen Weg, den
es über die API nicht gibt. Der CHANGELOG-Satz „das Team behält seine
Korrekturmöglichkeit" gilt nur für den Superuser in der Admin-Oberfläche.

**Nachweis (reproduziert).** Konto `gast` per Superuser auf `role: admin` gesetzt, dann
`PATCH /api/collections/users/records/<andere Person> {"points_total":777}` mit dem
Token von `gast` → HTTP 404; Stand unverändert (40). Superuser-PATCH → 250, angenommen.

**Empfehlung.** Zugriffsregeln sind Sache des anderen Prüfbereichs. Fachlich ist zu
entscheiden, ob App-Admins korrigieren sollen; wenn nein, Zweig und Test entfernen,
wenn ja, Regel und Hook zusammen anfassen.

---

## B-11 — SKU-Vergabe kippt bei `PP-10000` und fremden SKUs (NIEDRIG)

**Beschreibung.** `defaults.pb.js:53` sortiert `-sku` **textlich**. Bis `PP-9999`
deckt sich das mit der Zahl; `PP-10000` sortiert vor `PP-9999`, die höchste Nummer wird
falsch gelesen, und der Hook vergibt `PP-10000` erneut → der eindeutige Index weist
das Anlegen ab, und zwar bei **jedem** weiteren Teil. Eine über die API gesetzte SKU
ohne Ziffern (`ZZ-alt`) sortiert ganz nach oben; `match(/(\d+)/)` findet nichts,
`next` bleibt 1 → `PP-0001` doppelt.

**Nachweis (reproduziert, Harness).** Bestand `PP-9999, PP-10000` → nächste SKU
`PP-10000`; Bestand `PP-0001, ZZ-alt` → nächste SKU `PP-0001`. Die App schickt keine
SKU (`mobile/lib/api.ts:116`), der zweite Fall braucht die API oder Admin-Oberfläche.

**Empfehlung.** Alle SKUs mit Muster `PP-\d+` laden und numerisch das Maximum bilden,
oder die Breite auf fünf Stellen heben, bevor der Bestand 9.999 erreicht (aktuell 30
Teile — kein Handlungsdruck, aber eine Zeitbombe mit bekanntem Zünder).

---

## B-12 — `qr_code` nicht eindeutig (NIEDRIG)

**Beschreibung.** Auf `items.qr_code` liegt nur ein Index, kein eindeutiger
(`1700000000_init_schema.js:109`). `findFirstRecordByData` (`scan.pb.js:123`) nimmt
den ersten Treffer. Ist der mitgenommen, antwortet die Route 409 „Schon mitgenommen",
obwohl das zweite Teil mit demselben Code verfügbar ist.

**Nachweis (reproduziert, Harness).** Zwei Teile mit `X-1`, erstes `taken_at` gesetzt →
409. Über die App entsteht das nicht (QR = SKU), nur über eigene Codes.

**Empfehlung.** Eindeutigen Index anlegen (additiv, nach Bereinigung von Dubletten)
oder in der Route nach `taken_at = ""` filtern.

---

## B-13 — Konfigurierte 0 gilt als „nicht gepflegt" (NIEDRIG)

**Beschreibung.** `config()` (`lib/points.js:134-137`) nimmt `v > 0 ? v : Rückfall`.
Wer `pts_checkin` bewusst auf 0 setzt (etwa eine Aktion „nur Bringen zählt"), bekommt
10. Dasselbe bei `max_items_take` (0 → 7), `geofence_radius_m` (0 → 150, `:688`) und
Teilepunkten (0 → 30, `defaults.pb.js:69`, `scan.pb.js:150`; dort als Absicht
kommentiert, `:65-68`).

**Nachweis (reproduziert, Harness).** `pts_checkin: 0, pts_take: 0, max_items_take: 0`
→ `{checkin: 10, takePerItem: 5, maxItemsTake: 7}`.

**Empfehlung.** Entweder im Admin-Bereich 0 verbieten und das dokumentieren, oder
„nicht gepflegt" an `null` statt an 0 binden. Kein Fehler, aber eine stille Falle.

---

## B-14 — Fehlertexte (NIEDRIG)

- PocketBase normalisiert `ApiError`-Meldungen und hängt einen Punkt an: live
  `"Unbekannter QR-Code."`, `"Schon mitgenommen."`, `"Noch nicht freigegeben."`.
  `docs/openapi.yaml` dokumentiert die Texte ohne Punkt. Die App vergleicht nicht
  wörtlich (`mobile/lib/errors.ts` reicht Server-Texte durch), daher nur Doku-Abweichung.
- `push.pb.js:17`: „Ungueltiger Token" — die übrigen Meldungen tragen Umlaute
  („Höchstens", „Nicht mehr verfügbar").
- Ein Teil mit `status = 'archived'`, aber leerem `archived_at`, meldet „Noch nicht
  freigegeben" (`scan.pb.js:131-132`), weil `archived_at` zuerst geprüft wird (`:128`).
  Die App setzt beim Archivieren beide Felder (`mobile/lib/api.ts:170-174`), also nur
  über die API erreichbar. Nachweis: Harness.

---

## B-15 — Toter Code und doppelte Literale (NIEDRIG)

- `lib/points.js:10` `POINTS.selfEntryBonus` wird nirgends gelesen.
- `lib/push.js:157` `batch[j]._deviceId` ist nie gesetzt; der Ausdruck fällt immer
  auf `targets[i + j].deviceId` zurück (richtig, aber irreführend).
- `scan.pb.js:107`, `:143` übergeben `lat`/`lng` an `doCheckin`, das sie seit
  `23c5d65` nicht mehr liest (`lib/points.js:325-329`).
- Teilepunkte 30 stehen zweimal fest im Code (`defaults.pb.js:69`, `scan.pb.js:150`);
  `CLAUDE.md` verlangt konfigurierbare Punktwerte auf `store`. Ein `pts_item_default`
  wäre konsequent.

---

## B-16 — Vollständig an PocketBase 0.22 gebunden (NIEDRIG)

Alle Hooks nutzen die 0.22-API (`$app.dao()`, `onRecordBefore*Request`, `e.record`,
`e.httpContext`, `$apis.requestInfo(c).data`, `c.get('authRecord')`, `new Dao(db)` in
Migrationen). Das ist **richtig** für das gepinnte `0.22.21` und wurde live bestätigt.
Ab 0.23 heißt es `$app.findRecordById`, `onRecordCreateRequest`, `e.next()`, `e.auth`;
kein Hook und keine Migration würde mehr laden. Es gibt keinen Test und keinen
CI-Schritt, der die Version im Dockerfile mit der API-Nutzung abgleicht — der einzige
Schutz ist der Kommentar im Dockerfile. Empfehlung: ein Praxistest gegen die gepinnte
Binärdatei (B-17) macht jede Anhebung sofort sichtbar.

---

## B-17 — Der Harness kann B-1, B-2 und B-3 nicht finden (MITTEL)

**Beschreibung.** `tests/harness.js` ist als Nachbau gut gemacht, hat aber drei
strukturelle blinde Flecken, die genau die Laufzeit-Eigenschaften betreffen, an denen
die Fachlogik in Produktion scheitert:

1. Hook-Datei und Handler laufen in **einem** `vm`-Kontext (`:447-449`) — die
   Handler-Isolation von PocketBase fehlt (B-1).
2. `FakeRecord.get` gibt zurück, was `set` bekam (`:98-108`) — Datumsfelder kommen
   als ISO-mit-`T`, nicht in der PocketBase-Form (B-2).
3. `json`-Felder sind JS-Werte, keine Bytes (B-3).

Das ist kein Vorwurf an den Harness — ein Nachbau kann diese Dinge nur kennen, wenn
man sie einmal gesehen hat. Aber die Suite mit 470 grünen Tests hat den Eindruck
erzeugt, die Fachlogik sei geprüft, während Scan, Serie und Stufen in der echten
Laufzeit nicht funktionieren. `CLAUDE.md` warnt vor genau dieser Verwechslung („Grüne
Tests beweisen das nicht") — bisher nur in Richtung App und Server, nicht in Richtung
Laufzeit.

**Nachweis.** `npm test` → 470/470 grün. Dieselben Hooks in PocketBase 0.22.21 →
B-1 bis B-4 (Messungen oben). Der gesamte Praxistest — Binärdatei laden, leere
Datenbank, Migrationen, Konto, Scan, Freigabe — läuft in unter einer Minute.

**Empfehlung.** Einen Rauchtest in `tests.yml`/`deploy.yml` aufnehmen, der die gepinnte
Binärdatei (Version aus dem Dockerfile lesen) mit `pb_hooks/` und `pb_migrations/` auf
leerem `pb_data` startet und per REST mindestens prüft: Registrierung → Türscan 200 mit
`points: 10` → zweiter Türscan `already_checked_in: true` → Teil einreichen, freigeben,
Bring-Punkte → Push-Registrierung 200. Dazu den Harness in den Punkten 2 und 3 an
PocketBase angleichen. Das Skript dieser Prüfung liegt nicht im Repo (Wegwerf im
Scratchpad), die Schritte stehen oben vollständig.

---

## Geprüft und in Ordnung

Alles hier wurde bewusst geprüft und hat gehalten — im Harness, gegen die echte
PocketBase 0.22.21 (markiert mit *live*) oder durch Lesen.

**Punkte und Konfiguration**
- Rückfall- und Konfigurationswerte stimmen überein: `POINTS` 10/5/5 und
  `DEFAULT_MAX_ITEMS_TAKE` 7 (`lib/points.js:6-13`) gegen den Seed in
  `1782650000_configurable_points.js:27-30`; `DEFAULT_GEOFENCE_RADIUS_M` 150 gegen
  `1700000100_seed.js:23`. Kein Pfad rechnet mit dem Rückfall, wenn `store` gepflegt
  ist — `config()` wird in beiden Zweigen der Route und in `doCheckin` frisch gelesen
  (`scan.pb.js:69`, `lib/points.js:300`), `defaults.pb.js:117` ebenso.
- *live:* Check-in bucht 10, Stepper 2 × 5 (`points_log`-Zeilen mit den zugesagten
  Labels „Check-In im Laden", „2 Teile mitgenommen"); Teil 30 × 3 = 90 bei laufender
  Aktion; `action_counts` wird um 1 erhöht (`scan.pb.js:157`). Der Datumsfilter von
  `findActiveCampaign` (`lib/points.js:184`) funktioniert in echter PocketBase.
- `points_total` als Summe des Verlaufs, selbstheilend (`lib/points.js:237-248`);
  durch `tests/points-award.test.js` abgedeckt, Verhalten nachgelesen.
- Stepper: einmal gerundet auf Anzahl × Wert × Faktor (`lib/points.js:333`); Obergrenze
  doppelt — 400 mit Text in `scan.pb.js:72-74`, harter Deckel in `lib/points.js:306`.
- Nicht-numerisches `items_count` („abc") wird zu 0 (`parseInt` → `NaN`, `NaN || 0`
  in `:305`); *live* Besuch mit `items_count 0, points_awarded 10`.

**Serie (soweit nicht durch B-2 betroffen — die Rechenregeln selbst stimmen)**
- `isoWeek` bestimmt den Kalendertag in der Ladenzeitzone (`lib/points.js:382-390`);
  `isoWeeksInYear` (`:440-444`) und `isWeekAdjacent` (`:451-459`) behandeln KW 52/53
  am Jahreswechsel korrekt, alle drei Aufrufstellen (`updateStreak`, `streakFromVisits`,
  `streak-reset`) benutzen dieselbe Funktion. Die Fälle 2015/2020/2026/2032 sowie der
  Sprung über ein ganzes Jahr sind in `tests/streak.test.js` abgedeckt und stimmen.
- Sommer-/Winterzeit: `lastSundayUtc` (`:41-46`) trifft den letzten Sonntag im März und
  Oktober um 01:00 UTC (EU-Regel); `storeDayStart` (`:113-123`) zieht den Versatz zweimal
  nach und liegt in beiden Umstellungsnächten richtig (`tests/timezone.test.js`
  nachgerechnet). `TZ_CACHE_MS` 30 s begrenzt die `store`-Abfragen (`:72-85`).
- Karenz: Serie überlebt eine Woche ohne Besuch, nicht zwei (`cron.pb.js:85`); Reset
  zieht den Abzeichen-Fortschritt mit (`:77`, `:88`).

**Aktionen**
- Zeitraum inklusive an beiden Enden: `starts_at <= now && ends_at >= now`
  (`lib/points.js:184`); die App schreibt `ends_at` als lokales 23:59:59
  (`mobile/app/(visitor)/admin/actions.tsx:39-45`), der Endtag ist also drin.
- Faktoren: `mult_<typ>` vor `multiplier` vor 1,0 (`:149-156`); die App setzt
  `multiplier = max(mult_*)` (`actions.tsx:77`), sodass Sortierung und Rückfall
  zusammenpassen. Bei zwei gleichzeitigen Aktionen gewinnt der höchste Einzelfaktor,
  stabil bei Gleichstand (`:188-193`); Zielgruppe vor Faktor (`:194-196`). Durch
  `tests/streak.test.js` („zwei Aktionen gleichzeitig") abgedeckt.
- Teilnahme zählt nur, worauf die Aktion Bonus gibt (`bumpActionCount`, `:275`) —
  entspricht dem CHANGELOG („Teilnahme zählt, worauf es Bonus gibt").
- Bring-Punkte mit dem Faktor der **zugeordneten** Aktion, auch wenn sie bei der
  Freigabe schon vorbei ist (`defaults.pb.js:106-115`) — gewollt („credited").

**Abzeichen**
- Stufenlogik: `badgeTiers` schneidet erst auf die Slot-Zahl, dann leere Stufen weg
  (`lib/points.js:519-529`); `reachedTier` nimmt die höchste erreichte (`:532-538`);
  jede übersprungene Stufe wird einzeln belohnt, keine Rücknahme bei sinkendem
  Fortschritt, `unlocked_at` bleibt beim ersten Wert (`:588-600`). Einzelabzeichen
  zahlen den Bonus genau einmal (`:565-582`). `grantBadge` ist idempotent (`:607-626`).
- Geheime Abzeichen (`is_secret`) sind reine Anzeigelogik; der Server behandelt sie
  wie alle anderen — richtig so.
- Löschen: `user_badges.badge` hat `cascadeDelete: true`
  (`1700000000_init_schema.js:279`), Zeilen verschwinden mit dem Abzeichen, gezahlte
  Punkte bleiben mit `ref_id` im Verlauf. Ein gelöschtes Abzeichen an einer Aktion
  (`campaigns.badge`) wird im Cron abgefangen (`cron.pb.js:114`), eine gelöschte Aktion
  an einem Abzeichen in `computeProgress` (`lib/points.js:652-657`).
- Treue-Abzeichen: Job handelt nur am 31.12. in Ladenzeit (`cron.pb.js:167-168`),
  zählt Kalenderjahre in Ladenzeit (`:187`), nur `kind = single` (`:172`), idempotent
  über `grantBadge`. (Rechenweg richtig; Wirkung durch B-2 blockiert.)
- Aktions-Abzeichen: gestuft ausschließlich über `checkBadges`/`computeProgress`
  (`cron.pb.js:118-127`), einstufig über `grantBadge` an Beitragende und Anwesende im
  Zeitraum (`:129-154`), Dopplungen über `seen` vermieden.

**Scan-Route**
- Tür vs. Teil: Vergleich mit dem Geheimnis aus `store_secrets`, Rückfall auf das
  Altfeld, leeres Geheimnis führt nicht zu „jeder Code ist die Tür"
  (`scan.pb.js:62-67`, `:84`); *live:* unbekannter Code → 404.
- Reihenfolge der Ablehnungen: mitgenommen 409 → archiviert 410 → nicht freigegeben
  409 (`:127-132`); Altbestand ohne `status` bleibt scanbar (`:131`). *live:* 409
  „Noch nicht freigegeben." für pending, 409 „Schon mitgenommen." nach Mitnahme.
- Einmal am Tag: zweiter Türscan legt keinen zweiten Besuch an, zählt aber Teile
  (`:89-105`); *live* bestätigt (visits = 1 nach zwei Scans). Tagesgrenze nach
  Ladenzeit (`lib/points.js:251-263`, Filter-Vergleich, von B-2 nicht betroffen).
- Geofence: ohne Koordinaten keine Prüfung (bewusst, `lib/points.js:678-686`), mit
  Koordinaten Radius aus `store` oder 150 m, Text „Du bist nicht im Laden" wörtlich
  wie in `docs/openapi.yaml`; gilt für Tür und Teil (`scan.pb.js:87`, `:137`).
  Koordinaten werden nicht gespeichert, nur der gerundete Abstand (`lib/points.js:329`).
- Antwortformen entsprechen `docs/openapi.yaml` (`CheckinResult`, `ItemResult`);
  `bonus_points` ist additiv, `points` unverändert — der Vertrag mit Build 33
  (`mobile/lib/api.ts:4-16`) hält. (Sichtbar wird die Antwort erst nach B-1.)
- Datenschutz: kein Nutzerbezug am Teil, kein Teilbezug im Verlauf
  (`scan.pb.js:153`, `:159-161`); *live:* Item trägt nur `taken_at`.

**Record-Hooks**
- *live:* Neue Person bekommt `role visitor`, `points_total 0`, `streak_weeks 0`,
  `onboarding_complete false`, Push Serie/Aktion/Abzeichen an, Sonstiges aus.
- *live:* Schreibschutz — Besucherin setzt `points_total 99999, streak_weeks 77`:
  beides auf den gespeicherten Stand zurückgesetzt, `name` geändert; Superuser darf
  korrigieren (`e.httpContext.get('admin')` funktioniert in 0.22.21).
- *live:* Besucherin legt Teil an → `pending`, `is_showcase false` trotz `true` im
  Body, `created_by` gesetzt, `sku PP-0001 = qr_code`, `points 30`.
- *live:* Freigabe → +5 Bring-Punkte, `brought_awarded true`; erneute Freigabe und
  weitere Änderung (Schaufenster) zahlen nicht noch einmal. Bestand vom Team zahlt
  nicht (`defaults.pb.js:101-102`); fehlender `created_by` → kein Effekt (`:94-95`).
  Freigabe → Rücknahme → erneute Freigabe: Flag bleibt, kein zweites Mal.
- SKU-Vergabe aus der höchsten Nummer, nicht der Zeilenzahl (`:50-60`) — im
  Normalbereich richtig (Einschränkung B-11).

**Cron und Push**
- Zeitpunkte: Container läuft mit `TZ: Europe/Berlin` (`docker-compose.yml:28`,
  `docker-compose.portainer.yml:41`); die Ausdrücke `5 3`, `20 3`, `40 3` liegen
  nachts, die Fachlogik hängt nicht daran (Ladenzeit aus `store.timezone`).
- Idempotenz: `streak-reset` schreibt nur bei Änderung; `action-badges` und
  `year-badges` über idempotente Vergabe; `push-scheduled` filtert `sent_at = ""` und
  setzt `sent_at` einmal. *live:* fällige Nachricht nach einer Minute verschickt,
  `sent_at` gesetzt, `send_attempts 0`, kein zweiter Versand. Der Fehlerpfad (Expo
  nicht erreichbar) ließ sich hier nicht auslösen; er ist von B-1 betroffen.
- *live:* Ein Token, das Expo als `DeviceNotRegistered` meldet, wird gelöscht
  (`lib/push.js:155-158`; `push_devices` danach leer).
- Stapel zu 100 mit richtiger Empfänger-Indizierung `targets[i + j]` (`lib/push.js:140-157`).

**Goja / PocketBase-Version**
- *live:* `**`, `String.prototype.padStart`, `Array.from`, stabiles `sort`,
  Template-Literale, `for…of`, Arrow-Funktionen laufen in Goja 0.22.21. Kein
  `?.`, `??`, `async`, Spread oder Klassen in den Hooks.
- Alle verwendeten PocketBase-APIs gehören zu 0.22 und laden fehlerfrei (Routen,
  Record-Hooks, `$http.send`, `ApiError`, `new Record`, Migrationen mit `new Dao(db)`).
  Version im Dockerfile: `0.22.21`, passend.

---

## Unklar / zu klären

1. **Läuft B-1 bereits in Produktion?** Sehr wahrscheinlich (Commits nach Einrichtung
   des Auto-Deploys), aber nicht gemessen. Zur Klärung: mit einem Testkonto
   `POST /api/pp/scan` mit dem Türcode gegen `pb.xn--plietsche-plnn-rsb.de` — 400
   „Something went wrong" bestätigt; außerdem die Läufe von `deploy.yml` seit dem
   14.09. ansehen. Falls ausgeliefert: Besuche und Punkte der Testläufe des Teams
   seit dem 14.09. auf doppelte Stepper-Zeilen prüfen.
2. **Gleichzeitige Aktionen mit verschiedenen Schwerpunkten.** Laufen „Kommen ×3" und
   „Mitnehmen ×2" parallel, gilt pro Scan nur **eine** Aktion — die mit dem höchsten
   Einzelfaktor (`lib/points.js:160-166`, `:190-193`); der Mitnahme-Bonus der zweiten
   fällt weg. Das ist so im CHANGELOG beschrieben, fachlich aber überraschend. Zu
   klären, ob je Handlungstyp die jeweils beste Aktion gelten soll.
3. **Zielgruppen von Aktionen** (`target_role`: `streak2plus`, `inactive14d`,
   `visitor`): Der Aktions-Editor der App setzt kein Zielgruppenfeld
   (`actions.tsx` enthält keines); die Funktion ist nur über die Admin-Oberfläche
   nutzbar. Ist sie in Gebrauch? Wenn nicht, lässt sich B-2 dort mit geringerer
   Dringlichkeit behandeln; wenn ja, gehört der Editor nachgezogen.
4. **Ränge in Produktion.** B-3 wirkt nur, wenn weniger als fünf Ränge gepflegt sind.
   Wie viele stehen aktuell in `store.tiers_json`, und in welcher Form schreibt der
   Admin-Bereich „Punkte & Ränge" das Feld? Beides bestimmt, ob heute schon
   unsichtbare Stufen bezahlt werden.
5. **Treue-Abzeichen am 31.12.:** Der Job läuft um 3:40 Ortszeit; ein erster Besuch
   überhaupt am 31.12. nach 3:40 zählt erst ein Jahr später als „aktives Jahr".
   Randfall, aber ist ein Lauf am 1.1. um 3:40 für das Vorjahr gemeint gewesen?
6. **Was heißt `is_visible = false` fachlich** — nicht bewerten, oder bewerten ohne
   Bonus (B-7)? Der CHANGELOG sagt es nicht.
7. **Superuser als Teammitglied** (B-5): Soll die Admin-Oberfläche ein legitimer Weg
   sein, Bestand anzulegen? Dann gehört der Superuser im Hook zum Team; wenn nicht,
   gehört das in `docs/deploy.md`.

---

*Arbeitsbaum nach der Prüfung: unverändert bis auf diesen Bericht. Wegwerf-Skripte,
Sondier-Hooks, die PocketBase-Binärdatei und die Testdatenbank liegen ausschließlich
im Scratchpad und sind nicht Teil des Repos.*
