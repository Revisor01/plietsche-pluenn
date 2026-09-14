# Audit der Testsuite

> **Abgenommen am 14.09.2026.** Der Stand jedes einzelnen Befunds — behoben,
> bewusst offen, offen oder hinfällig — steht in [`ABNAHME.md`](ABNAHME.md),
> jeweils am Code belegt. Behobene Befunde sind zusätzlich hier markiert;
> gelöscht wurde nichts.

Stand: 14.09.2026 — geprüft gegen die Regeln in `CLAUDE.md`, Abschnitt „Tests".

## Testlauf

```
npm test   →   Test Files  7 passed (7)
                    Tests  173 passed (173)
                 Duration  1.32 s
```

Alle Tests laufen grün, ohne Warnungen, in 1,32 Sekunden. Vitest 5, Node 22,
Zeitzone über `vitest.config.mjs:10` fest auf `Europe/Berlin` genagelt — das ist
richtig so und verhindert Ergebnisse, die vom Rechner abhängen.

**Gesamteinschätzung:** Die Suite ist überdurchschnittlich gut. Die Tests prüfen
fast durchgehend konkrete Zahlen statt Existenz, sie sind auf Deutsch
kommentiert und begründen, *warum* ein Fall zählt. Mehrere Tests halten
bewusst einen Befund fest, statt ihn zu verstecken (`streak.test.js:205`). Das
ist genau der Ton, den die Projektregeln verlangen.

Die Schwäche liegt nicht in den vorhandenen Tests, sondern **im Harness**: Er
ist an zwei Stellen gutmütiger als PocketBase, und an einer davon ist der
Unterschied so groß, dass ein echter Produktionsfehler unentdeckt bliebe.

---

## 1. Weiche Assertions

Die Regel „weiche Assertions gelten als Fehler" wird weitgehend eingehalten.
Es gibt **keinen** einzigen `expect.any()`, kein `toBeDefined()` auf einem
Zähler und kein `expect([a, b]).toContain(...)`. Gefunden wurden sechs
Fundstellen, davon vier echte Beanstandungen.

### 1.1 `scan.test.js:349` — `toBeTruthy()` auf einem Zeitstempel

```js
expect(item.taken_at).toBeTruthy();
```

`toBeTruthy()` geht auch bei `"x"`, `1` oder `true` durch. Der Test soll
belegen, dass das Teil mit dem *Zeitpunkt des Scans* markiert wurde.

**Stattdessen prüfen:** Dass `taken_at` ein ISO-Zeitstempel von heute ist —
etwa `expect(item.taken_at.slice(0, 10)).toBe(new Date().toISOString().slice(0, 10))`,
besser noch gegen eine vor dem Aufruf festgehaltene Zeitspanne.

### 1.2 `cron.test.js:150` und `cron.test.js:162` — `not.toBe('')`

```js
expect(`${h.records.msg.get('sent_at')}`).not.toBe('');
```

Belegt nur, dass irgendetwas eingetragen wurde. Ein Hook, der `sent_at` auf
`"ja"` setzt, käme damit durch — und der Filter im Cronjob
(`cron.pb.js:18`, `sent_at = ""`) würde die Nachricht danach nie wieder
anfassen, ganz gleich was drinsteht. Der Wert ist also fachlich egal, solange
er nicht leer ist. Trotzdem ist die Prüfung zu lasch:

**Stattdessen prüfen:** `sent_at` als Datum von heute, wie unter 1.1. Die
Gegenprobe in Zeile 162 (`toBe('')`) ist dagegen korrekt scharf.

### 1.3 `push.test.js:102` — `not.toBe('')` auf `last_seen`

```js
expect(`${h.rows('push_devices')[0].last_seen}`).not.toBe('');
```

Gleiche Schwäche. Der Test heißt „vermerkt, wann der Token zuletzt gesehen
wurde" — geprüft wird aber nur *dass* etwas vermerkt wurde, nicht *wann*.

**Stattdessen prüfen:** Der Zeitstempel liegt zwischen dem Zeitpunkt vor und
nach dem Aufruf.

### 1.4 `scan.test.js:178` und `scan.test.js:350` — `toBeUndefined()`

```js
expect(h.rows('items')[0].taken_at).toBeUndefined();
expect(item.user).toBeUndefined();
```

Das ist hier **vertretbar und sogar richtig**: `rows()` gibt die rohen
gesetzten Felder zurück, `undefined` heißt „nie gesetzt". Für die
Datenschutz-Zusage („am Teil steht nicht, wer es geholt hat") ist genau das die
richtige Aussage. Keine Beanstandung — aber siehe 4.4: Der Harness
unterscheidet „nie gesetzt" und „leer" anders als PocketBase, weshalb diese
Prüfung strenger *wirkt*, als sie in Produktion ist.

### 1.5 `streak.test.js:346`, `:355`, `:362`, `:374`, `:384` — `c && c.id`

```js
const c = h.lib.findActiveCampaign(jetzt, h.records.user);
expect(c && c.id).toBe('c1');
```

Der `&&`-Kurzschluss ist ein Schutz gegen `null`, verwässert aber die Aussage
nicht: Bei `null` schlägt der Test fehl (`null !== 'c1'`). Formal in Ordnung,
stilistisch unschön. Keine Beanstandung.

### 1.6 `release-notes.test.js:104` — `toHaveLength(480)`

```js
const [zeile] = hinweise('play', { VORGABE: lang });
expect(zeile).toHaveLength(480);
```

Prüft die Länge, aber nicht den Inhalt. Ein Skript, das 480 beliebige Zeichen
ausgibt, käme durch.

**Stattdessen prüfen:** Zusätzlich `expect(zeile).toBe('a'.repeat(480))` —
belegt, dass **vorn** gekürzt wurde und nicht etwa das Ende genommen.

---

## 2. Abdeckungslücken

### 2.1 Zuordnung: Was ist getestet, was nicht

**`lib/points.js` (497 Zeilen) — die zentrale Rechenlogik**

| Funktion | Getestet in | Bewertung |
|---|---|---|
| `config()` | nur mittelbar über `scan.test.js` | Rückfallwerte ungetestet |
| `campaignMult()` | `streak.test.js:229–259` | vollständig |
| `findActiveCampaign()` | `streak.test.js:336–386` | gut |
| `campaignApplies()` | `streak.test.js:261–295` | gut |
| `awardPoints()` | — | **keine direkten Tests** |
| `recomputeTotal()` | — | **keine direkten Tests** |
| `hasVisitToday()` | nur mittelbar | **Tagesgrenze ungetestet** |
| `bumpActionCount()` | `streak.test.js:297–334` | gut |
| `doCheckin()` | nur mittelbar über die Route | **Race-Guard ungetestet** |
| `pushCheckinConfirmation()` | — | **gar nicht getestet** |
| `isoWeek()` | `streak.test.js:38–59` | gut, inkl. Jahreswechsel |
| `streakFromVisits()` | `streak.test.js:95–164` | sehr gut |
| `isWeekAdjacent()` | `streak.test.js:61–93` | sehr gut |
| `updateStreak()` | `streak.test.js:166–227` | gut, Befund dokumentiert |
| `tierSlotCount()` | `badges.test.js:97–105` | gut |
| `badgeTiers()` | `badges.test.js:57–106` | sehr gut |
| `reachedTier()` | `badges.test.js:108–136` | sehr gut |
| `checkBadges()` | `badges.test.js:211–373` | sehr gut |
| `grantBadge()` | `badges.test.js:375–404` | gut |
| `computeProgress()` | `badges.test.js:138–209` | sehr gut |
| `distanceM()` | nur mittelbar über Geofence | ausreichend |

**`lib/push.js` (119 Zeilen) — vollständig ungetestet**

Der Harness ersetzt das Modul komplett durch einen Stub
(`harness.js:291–300`). `collectTokens()`, `tokensForUser()` und `send()`
werden **nie ausgeführt**. Das ist die größte Einzellücke der Suite: Dort liegt
die Zuordnung von Nachrichtenkategorie zu Opt-in-Feld
(`push.js:12–16`, `push.js:59–63`) — also die Entscheidung, wer eine
Benachrichtigung bekommt und wer nicht. Ein Vertippen bei
`push_badge_enabled` schickt Nachrichten an Leute, die sie abbestellt haben.
Das ist eine DSGVO-relevante Einwilligung, kein Schönheitsfehler.

Nebenbefund beim Lesen: `push.js:110` liest `batch[j]._deviceId`, ein Feld,
das in `push.js:83–89` nie gesetzt wird. Der `||`-Rückfall auf
`targets[i + j].deviceId` greift immer, das Verhalten stimmt also — aber der
erste Teil ist toter Code und verschleiert, dass die Indexrechnung
`targets[i + j]` die eigentliche Logik ist.

**`scan.pb.js` — `POST /api/pp/scan`:** gut abgedeckt (`scan.test.js`,
422 Zeilen). Alle Fehlercodes (401/400/404/409/410), Geofence, Punktwerte,
Antwortform.

**`defaults.pb.js` — vier Record-Hooks:** alle vier getestet
(`defaults.test.js`, 370 Zeilen). Der Schreibschutz ist mit sieben Tests der
am besten abgesicherte Teil des Repos.

**`push.pb.js` — zwei Routen:** beide getestet (`push.test.js`), inklusive
Fremdzugriff.

**`cron.pb.js` — vier Cronjobs:**

| Cronjob | Getestet | Lücke |
|---|---|---|
| `push-scheduled` | `cron.test.js:127–181` | Segment-Zielgruppen ungetestet |
| `streak-reset` | `cron.test.js:32–125` | gut abgedeckt |
| `action-badges` | `cron.test.js:205–268` | **nur der `single`-Zweig** |
| `year-badges` | `cron.test.js:183–203` | **nur der Nicht-31.12.-Fall** |

### 2.2 Unbehandelte Grenzfälle

**Jahreswechsel.** Bei `isoWeek` und `isWeekAdjacent` vorbildlich abgedeckt
(`streak.test.js:47`, `:76–92`), inklusive des Sonderfalls KW 53. Beim
**`year-badges`-Cronjob dagegen gar nicht**: `cron.test.js:189` steigt am
31. Dezember mit `return` aus, statt das Datum zu stellen — der einzige Tag,
an dem der Job überhaupt etwas tut, wird nie geprüft. Ein Test, der am 31.12.
läuft, prüft nichts; an allen anderen 364 Tagen prüft er nur, dass nichts
passiert.

**Zeitzone.** Global richtig gesetzt (`vitest.config.mjs:10`), aber die eine
Stelle, die tatsächlich zeitzonenabhängig rechnet — `hasVisitToday()` in
`points.js:126–137`, die lokale Mitternacht — hat **keinen Test an der
Grenze**. Alle drei Tests dazu (`scan.test.js:362`, `:374`, `:383`) setzen die
Uhrzeit auf 9:00 Ortszeit, weit weg von jeder Grenze. Siehe Abschnitt 4.1:
Genau hier ist der Harness kaputt.

**Gleichzeitige Anfragen.** `doCheckin()` enthält einen ausdrücklichen
Race-Guard (`points.js:182–192`, kommentiert als „Race guard") mit eigenem
Rückgabefeld `deduped: true`. **Kein Test ruft `doCheckin` zweimal auf**, und
das Feld `deduped` kommt in der gesamten Suite nicht vor. Nachgestellt:
Zwei Aufrufe hintereinander liefern korrekt `{points: 10, visitId: null,
deduped: true}` — das Verhalten stimmt, ist aber ungesichert.

**Fehlende Datensätze.** Teilweise abgedeckt: `config()` mit fehlendem
`store` (Rückfallwerte) ist ungetestet, ebenso `scan.pb.js:28`
(„Laden nicht konfiguriert", 500). Der Fall, dass ein `user_badges`-Eintrag
auf ein gelöschtes Abzeichen zeigt, ist offen.

**Ungültige Eingaben.** Gut bei leeren Werten und Obergrenzen
(`scan.test.js:72`, `:261`). Offen: negative `items_count`, `items_count` als
Text (`"drei"`), `gps_lat` ohne `gps_lng`, Zahlen als Zeichenkette.
`points.js:179` fängt das mit `Math.max(0, parseInt(...))` zwar ab — nur
belegt das kein Test.

---

## 3. Tests, die nichts prüfen

Es gibt **keinen Test ohne Assertion**. Drei Stellen sind trotzdem
beanstandenswert:

### 3.1 `cron.test.js:189–202` — der Test, der sich selbst abschaltet

```js
const heute = new Date();
if (heute.getMonth() === 11 && heute.getDate() === 31) return;
```

Am 31. Dezember läuft der Test durch, ohne irgendetwas zu prüfen — und meldet
sich grün. An jedem anderen Tag prüft er nur die Verneinung. Der eigentliche
Zweck des Jobs, das Vergeben von Treue-Abzeichen, ist **nie** geprüft.

### 3.2 `defaults.test.js:53–58` — Test und Erwartung widersprechen dem Titel

```js
it('uebernimmt keinen mitgeschickten Punktestand', () => {
  const rec = neuerNutzer(h, { points_total: 5000 });
  expect(rec.get('points_total')).toBe(5000);
});
```

Der Titel sagt „übernimmt keinen", die Erwartung prüft, dass er **doch**
übernommen wird. Der Hook (`defaults.pb.js:9`) setzt nur, wenn `== null`, und
5000 ist nicht null — technisch also korrekt festgehalten. Aber der Titel
behauptet das Gegenteil des Geprüften. Wer die Suite überfliegt, liest hier
eine Absicherung, die es nicht gibt. Die Registrierung ist tatsächlich nur
dadurch geschützt, dass die `createRule` in PocketBase das Feld sperrt — was
**kein Test belegt**.

**Empfehlung:** Titel zu „lässt einen mitgeschickten Punktestand stehen —
der Schutz liegt in der createRule" ändern und einen Kommentar ergänzen, der
auf die eigentliche Absicherung verweist.

### 3.3 `badges.test.js:60`, `:70`, `:81` — Zugriff über `h.store.badges[0]`

Funktioniert, umgeht aber die `records`-Zuordnung über `__name`. Bei einem
zweiten Abzeichen im Seed bricht der Index still. Kein Fehler, nur brüchig.

---

## 4. Harness-Treue — der wichtigste Teil

Der Harness (`tests/harness.js`, 401 Zeilen) ist sorgfältig gebaut und
dokumentiert seine Vereinfachungen im Kommentar. Er ist an mehreren Stellen
bewusst streng: Ein nicht unterstützter Filter **wirft**
(`harness.js:104`), statt still ein falsches Ergebnis zu liefern — genau
richtig. Die Unterscheidung zwischen Zahlenfeldern (Rückgabe `0`) und
Textfeldern (Rückgabe `''`) in `harness.js:31–78` bildet ein echtes
PocketBase-Verhalten korrekt nach.

Es gibt trotzdem **fünf Stellen, an denen der Harness gutmütiger ist als
PocketBase.** Die erste ist ein echter Fehler.

### 4.1 Zeitstempel-Vergleich ist kaputt — Grenzfälle fallen falsch aus — **BEHOBEN 14.09.2026**

> **Behoben am 14.09.2026.** `matchesFilter` im Harness vergleicht Zeitstempel
> jetzt als Zeitpunkt statt als Zeichenkette — die Trennerformen (`T` gegen
> Leerzeichen) fallen damit nicht mehr auseinander.
>
> Abgesichert durch `tests/harness-time.test.js` (15 Tests), u. a. „vergleicht
> über die Trennerformen hinweg als Zeitpunkt, nicht als Text“, „trennt Tage
> korrekt: gestern Abend zählt nicht zu heute“ und die Gegenproben, dass reine
> Zahlen- und Textfelder weiterhin wie bisher verglichen werden.
>
> Damit war die Voraussetzung für die Tests an der Tagesgrenze geschaffen
> (`tests/timezone.test.js`) — der Befund, den dieser Bericht als „die
> lohnendste fehlende Prüfung“ benannt hatte.

**Das ist der schwerwiegendste Befund des Audits.**

`harness.js:121–124` vergleicht Zeitstempel als Zeichenketten:

```js
case '>=':
  return isNaN(Number(value)) ? `${actual}` >= value : ...
```

Die Hooks speichern Zeitpunkte mit `toISOString()` — also mit **`T`** als
Trenner (`points.js:196`: `visit.set('checkin_at', now.toISOString())`).
Die Filtergrenze bauen sie dagegen mit **Leerzeichen**
(`points.js:131`: `.replace('T', ' ')`), weil PocketBase das so erwartet.

`T` hat den Zeichenwert 0x54, das Leerzeichen 0x20. Beim Zeichenkettenvergleich
gewinnt damit **jeder** Wert mit `T` gegen jede Grenze mit Leerzeichen, sobald
der Datumsteil gleich ist — die Uhrzeit wird nie erreicht.

Nachgestellt und bestätigt:

```
'2026-09-09T21:59:00.000Z' >= '2026-09-09 22:00:00.000Z'   →  true
                                                    erwartet:  false
```

**Folge in der Suite:** `hasVisitToday()` liefert im Harness `true` für einen
Besuch von *gestern Abend*. Gemessen mit `TZ=Europe/Berlin`:

```
Besuch gestern 23:00 Ortszeit  →  2026-09-13T21:00:00.000Z
Grenze im Hook (heute 00:00)   →  2026-09-13 22:00:00.000Z
hasVisitToday(...)             →  true      (richtig wäre: false)
```

PocketBase vergleicht Datumsfelder **als Datum**, nicht als Zeichenkette, und
würde hier korrekt `false` liefern.

**Warum das gefährlich ist:** Ein Test, der prüft „wer gestern um 23 Uhr da
war, bekommt heute früh seinen Besuchsbonus", wäre im Harness **rot, obwohl
die Produktion richtig liegt**. Nach der Projektregel („Schlägt ein Test fehl,
erst prüfen, ob er recht hat") bestünde dann die reale Gefahr, die Erwartung
an den kaputten Harness anzupassen — und damit einen Fehler einzubauen, den
niemand mehr sieht. Dass es diesen Test heute nicht gibt (alle drei Tests
setzen 9:00 Ortszeit), ist Glück, nicht Absicherung.

**Behebung:** In `matchesFilter` erkennen, ob Wert und Vergleichswert
Zeitstempel sind, und dann über `Date.parse()` vergleichen — oder beide Seiten
vor dem Vergleich auf dieselbe Trennerform normalisieren
(`.replace('T', ' ')`).

### 4.2 Der `offset`-Parameter wird still verschluckt

`harness.js:182` nimmt vier Parameter:

```js
findRecordsByFilter(collection, filter, sort, limit)
```

Die Hooks rufen durchgehend mit **fünf** auf, zuletzt `offset`:
`points.js:65`, `points.js:132`, `points.js:269`, `points.js:455`,
`cron.pb.js:18`, `cron.pb.js:43`, `cron.pb.js:95`, `cron.pb.js:121`,
`cron.pb.js:149`, `push.js:20`, `push.js:43`.

Gemessen:

```
findRecordsByFilter('t', 'n > 0', '', 2, 2)  →  [t1, t2]
                              PocketBase gäbe:  [t3, t4]
```

Heute übergeben alle Aufrufe `offset = 0`, der Unterschied wirkt sich also
nicht aus. Aber der Harness **meldet nichts**: Würde jemand eine Seitenabfrage
einbauen, liefen die Tests weiter grün, während die Produktion die falsche
Seite liest. Das widerspricht dem Prinzip, das der Harness bei Filtern selbst
richtig anwendet („bewusst scheitern statt still falsch liefern").

**Behebung:** Parameter annehmen und anwenden — oder bei `offset > 0` werfen.

### 4.3 `sort` ignoriert Sekundärkriterien und ist nicht stabil

`harness.js:131–143` versteht genau **ein** Feld mit optionalem `-`.
PocketBase erlaubt mehrere, kommagetrennt. Zudem kehrt der Harness eine
bereits sortierte Liste mit `.reverse()` um (`harness.js:142`) statt absteigend
zu sortieren — bei gleichen Werten dreht das die Reihenfolge gleicher
Elemente um, PocketBase tut das nicht.

Wirkt sich heute auf `findActiveCampaign` aus (`points.js:65`, sortiert nach
`-multiplier`): Bei zwei Aktionen mit demselben Faktor wählt der Harness die
*letzte*, PocketBase die *erste*. `streak.test.js:365` testet die Auswahl nur
mit **verschiedenen** Faktoren (3 und 2) — der Gleichstand ist ungeprüft und
verhielte sich in Produktion anders.

### 4.4 Keine Validierung, keine Schemaprüfung, keine Pflichtfelder

`FakeDao.saveRecord()` (`harness.js:190–195`) schreibt alles. Bestätigt:
Ein Feld, das im Schema gar nicht existiert, wird anstandslos gespeichert.
PocketBase prüft gegen das Schema in `pb_migrations/` (16 Migrationen),
weist unbekannte Felder ab und erzwingt Pflichtfelder, eindeutige Indizes
(`items.sku`, `push_devices.expo_token`) und Wertebereiche.

**Konkrete Folge:** Der Test `defaults.test.js:169` („zählt von der höchsten
vergebenen Nummer weiter") begründet sich ausdrücklich mit dem eindeutigen
Index auf `sku` — aber der Harness hat diesen Index nicht. Würde die Logik
doppelte SKUs erzeugen, bliebe der Test grün und PocketBase wiese den Datensatz
beim Speichern ab. Der Test prüft die Absicht, nicht die Wirkung.

Ebenso: Die Feldtypen sind nur über die Liste `NUMBER_FIELDS`
(`harness.js:31–65`) nachgebildet — eine Handliste, die beim Hinzufügen eines
Zahlenfeldes im Schema stillschweigend veraltet. Ein neues Zahlenfeld gäbe dann
`''` statt `0` zurück, und `== null`-Prüfungen im Hook verhielten sich im Test
anders als in Produktion. Genau der Fehler, den der Kommentar in
`harness.js:27–30` zu verhindern versucht — die Lösung ist aber nicht gegen das
Schema abgesichert.

### 4.5 Filter-Injection wird nicht abgebildet

Die Hooks bauen Filter durch Zeichenketten-Verkettung, ohne die Werte zu
maskieren: `points.js:116` (`user = "${user.id}"`), `push.pb.js:20`
(`expo_token = "${token}"`), `push.pb.js:42`. `expo_token` kommt **direkt aus
dem Request-Body** (`push.pb.js:13`) und ist der einzige dieser Werte, der
nicht serverseitig vergeben wird.

Der Harness zerlegt Filter mit einem Regex (`harness.js:103`) und kann
eingeschleuste Anführungszeichen gar nicht ausdrücken — ein
Injection-Versuch endet dort mit `false` oder einem geworfenen Fehler,
niemals mit erweitertem Zugriff. PocketBase parst dagegen echtes
Filter-SQL.

Ein Token wie `x" || user != "` ergäbe in `push.pb.js:42` den Filter
`expo_token = "x" || user != "" && user = "..."` — ob PocketBase das abweist
oder auswertet, lässt sich **im Harness grundsätzlich nicht feststellen**.
Das ist keine Behauptung eines Fehlers, sondern die Feststellung, dass diese
Klasse von Fehlern hier prinzipiell unsichtbar bleibt. Sie gehört gegen eine
laufende Instanz geprüft.

### 4.6 Was der Harness richtig macht

Der Fairness halber, weil es die Beurteilung der Suite trägt:

- **Fehlende Datensätze werfen** (`harness.js:166`, `:173`, `:178`) — genau
  wie PocketBase, und die Hooks verlassen sich darauf (`points.js:156`,
  `points.js:373`).
- **Nicht unterstützte Filter werfen** statt still `false` zu liefern
  (`harness.js:104`).
- **Der Push-Versand ist ersetzt** (`harness.js:291`) — ein Test darf keine
  echten Nachrichten schicken. Richtig, kostet aber die gesamte Abdeckung von
  `lib/push.js` (siehe 2.1).
- **`lib`-Instanzen werden zwischengespeichert** (`harness.js:302`), damit Hook
  und Test auf demselben Zustand arbeiten.
- **`this`-Bindung bleibt erhalten** (`harness.js:317`) — `points.js` ruft sich
  intern über `this` auf, ein destrukturierter Export wäre kaputt gegangen.

---

## 5. Sicherheitstests: verbotener und erlaubter Fall

Die Regel verlangt je einen Test für beide Seiten. Bilanz:

| Prüfung | verboten | erlaubt | Bewertung |
|---|---|---|---|
| Punktestand selbst setzen | `defaults.test.js:94` | `:124` (Admin), `:133` (Superuser) | **vollständig** |
| Serie selbst setzen | `defaults.test.js:100` | über Admin-Pfad mitgedeckt | vollständig |
| Rolle selbst vergeben | `defaults.test.js:106` | `:124` | **vollständig** |
| Admin ändert eigenen Stand | `defaults.test.js:139` | `:124` (fremd) | **vollständig, vorbildlich** |
| Andere Felder durchlassen | — | `defaults.test.js:113` | erlaubter Fall geprüft |
| Teil selbst freigeben | `defaults.test.js:227` | `:220` (Team) | **vollständig** |
| Ins Schaufenster stellen | `defaults.test.js:234` | — | **erlaubter Fall fehlt** |
| Fremden Token abmelden | `push.test.js:125` | `:118` (eigener) | **vollständig** |
| Scan ohne Anmeldung | `scan.test.js:65` | jeder andere Test | vollständig |
| Push-Route ohne Anmeldung | `push.test.js:27`, `:107` | übrige Tests | vollständig |
| Nicht freigegebenes Teil scannen | `scan.test.js:326` | `:198` (freigegeben) | **vollständig** |
| Geofence | `scan.test.js:125` | `:113`, `:143` | **vollständig** |

Das ist die stärkste Seite der Suite. **Eine Lücke:** Für das Schaufenster
(`defaults.pb.js:84`) gibt es nur den verbotenen Fall
(`defaults.test.js:234`). Es fehlt der Test, dass ein Teammitglied ein Teil
sehr wohl ins Schaufenster stellen darf — sonst käme eine Änderung durch, die
`is_showcase` grundsätzlich auf `false` zwingt.

**Zweite Lücke, grundsätzlicher:** Alle Berechtigungstests prüfen die
**Hooks**. Die eigentliche Zugriffssteuerung von PocketBase liegt in den
`listRule`/`createRule`/`updateRule` der Migrationen — und die sind
**vollständig ungetestet**. `defaults.pb.js:77` verlässt sich ausdrücklich
darauf („Visitors can never self-approve because updateRule is staff-only").
Diese Zusage kann der Harness nicht einlösen; sie braucht einen Test gegen
eine laufende Instanz.

---

## 6. Die fünf lohnendsten fehlenden Tests

Sortiert danach, wie viele echte Fehler sie finden würden.

### 1. Den Zeitstempel-Vergleich im Harness reparieren und an der Tagesgrenze testen

**Warum zuerst:** Solange `harness.js:121` Zeitstempel als Zeichenketten
vergleicht, ist **jeder** Test an einer Tagesgrenze unzuverlässig — er kann
grün sein, obwohl die Produktion falsch liegt, und rot, obwohl sie richtig
liegt. Das entwertet nicht einen Test, sondern eine ganze Klasse.

**Zu schreiben:** Erst `matchesFilter` auf echten Datumsvergleich umstellen
(`Date.parse`, wenn beide Seiten als Datum lesbar sind). Dann drei Tests für
`hasVisitToday()`: Besuch gestern 23:00 Ortszeit (`false` — heute ist der
Bonus fällig), Besuch heute 00:30 Ortszeit (`true`), Besuch heute 23:59
(`true`). Ohne den Harness-Fix schlägt der erste fehl, obwohl er recht hat.

**Findet:** Falsch vergebene oder falsch verweigerte Besuchsboni um
Mitternacht — und schützt davor, den Fehler beim nächsten roten Test in die
Erwartung einzubauen.

### 2. `lib/push.js` gegen einen echten Aufruf testen, statt es zu ersetzen

**Warum:** 119 Zeilen ohne eine einzige ausgeführte Zeile, darin die
Zuordnung von Nachrichtenkategorie zu Opt-in-Feld. Wer sich dort vertippt,
schickt Nachrichten an Leute, die sie abbestellt haben — eine
Einwilligungsfrage, kein Anzeigefehler. Niemand merkt es, bis sich jemand
beschwert.

**Zu schreiben:** Den Harness so erweitern, dass `lib/push.js` echt geladen
wird und nur `$http.send` ein Stub ist. Dann: Für jede der vier Kategorien
(`streak`, `campaign`, `badge`, sonstige) je ein Test mit eingeschaltetem und
ausgeschaltetem Opt-in — verbotener und erlaubter Fall, wie die Regel es
verlangt. Dazu die Segmente (`by_role`, `streak2plus`, `inactive14d`) und das
Entfernen toter Token.

**Findet:** Nachrichten an Abgemeldete, verschluckte Nachrichten an
Angemeldete, falsch zugeordnete Kategorien.

### 3. Den `year-badges`-Cronjob mit gestelltem Datum am 31. Dezember prüfen

**Warum:** Der einzige Tag, an dem der Job handelt, wird nie geprüft
(`cron.test.js:189` steigt dann aus). Treue-Abzeichen werden einmal im Jahr
vergeben — ein Fehler fällt frühestens zwölf Monate später auf, und in der
Zwischenzeit fehlt den Leuten ihr Abzeichen.

**Zu schreiben:** Über `vi.setSystemTime(new Date('2026-12-31T04:00:00'))`
das Datum stellen. Dann: Person mit Besuchen in drei Kalenderjahren bekommt
das Abzeichen mit `trigger_value: 3`, nicht das mit `trigger_value: 5`;
Person mit Besuchen in einem Jahr bekommt keins; ein bereits vergebenes wird
nicht erneut vergeben; und — der Grenzfall — ein Besuch am 31.12. selbst zählt
noch für dieses Jahr. Der bestehende Test auf „an einem gewöhnlichen Tag
passiert nichts" bleibt, ohne die `return`-Ausnahme.

**Findet:** Falsch gezählte aktive Jahre, doppelte Vergabe, das
Zeitzonenproblem beim Jahreswechsel (`cron.pb.js:156` nimmt `getFullYear()`
in lokaler Zeit, `checkin_at` ist UTC — ein Besuch am 1.1. um 00:30 Ortszeit
zählt ins Vorjahr).

### 4. Den Race-Guard in `doCheckin()` absichern

**Warum:** Der Code hat einen ausdrücklichen Schutz gegen den doppelten
Check-in samt eigenem Rückgabefeld `deduped` (`points.js:182–192`) — und
**kein Test ruft die Funktion zweimal auf**. Ein Doppeltipp im Laden ist der
wahrscheinlichste Bedienfehler überhaupt, und das Ergebnis wäre ein doppelter
Besuchsbonus. Nachgemessen stimmt das Verhalten heute — ungesichert.

**Zu schreiben:** `doCheckin` zweimal mit demselben `now` aufrufen. Erwartung:
genau **ein** Besuch in `visits`, `points_total` genau einmal um den
Besuchsbonus erhöht, zweiter Rückgabewert `{deduped: true, visitId: null}`.
Zweite Fassung mit `itemsCount: 2` beim zweiten Aufruf: Die Teile zählen
(10 Punkte), der Besuchsbonus nicht. Dazu die Gegenprobe über die Route, dass
`already_checked_in: true` zurückkommt.

**Findet:** Doppelte Boni bei Doppeltipp, Netzwerk-Wiederholung oder zwei
Geräten — und sichert das Feld `deduped` als Vertragsbestandteil ab.

### 5. Den `tiered`-Zweig von `action-badges` und das Zusammenspiel mit `checkBadges` prüfen

**Warum:** `cron.pb.js:92–101` behandelt gestufte Aktions-Abzeichen bewusst
anders als einfache — mit der ausdrücklichen Begründung im Kommentar,
`grantBadge` würde sie „sofort auf Gold setzen und die Stufen überspringen".
Genau dieser Zweig ist **ungetestet**; `cron.test.js:211` und `:242` prüfen
nur `kind: 'single'`. Die Fehlerart, vor der der Kommentar warnt, ist die
teuerste im Repo: übersprungene Stufen bedeuten zu viele vergebene Punkte, und
vergebene Punkte lassen sich nicht zurücknehmen.

**Zu schreiben:** Aktion mit verknüpftem `tiered`-Abzeichen und
`action_counts` von 4 bei Schwellen 2/5/10. Erwartung: `current_tier` steht
auf `bronze`, **nicht** auf `gold`, und genau die Bronze-Belohnung wurde
gutgeschrieben. Dazu die Gegenprobe mit `kind: 'single'`, dass dort weiterhin
`grantBadge` greift — verbotener und erlaubter Fall derselben Verzweigung.
Ergänzend der Zweig b) in `cron.pb.js:117–128`: Wer im Aktionszeitraum nur
*da war*, ohne etwas zu bringen, bekommt das Abzeichen ebenfalls.

**Findet:** Übersprungene Stufen und die dabei zu viel vergebenen Punkte —
den Fehler, den der Code selbst als Gefahr benennt.

---

## 7. Kleinere Empfehlungen

- `defaults.test.js:53` — Titel an die geprüfte Erwartung anpassen (siehe 3.2)
  und den tatsächlichen Schutzmechanismus im Kommentar benennen.
- `harness.js:182` — `offset` annehmen oder bei `offset > 0` werfen (siehe 4.2).
- `harness.js:131` — absteigend sortieren statt `.reverse()`, damit gleiche
  Werte ihre Reihenfolge behalten (siehe 4.3).
- `harness.js:31` — die Liste `NUMBER_FIELDS` gegen die Migrationen prüfen,
  damit sie nicht still veraltet (siehe 4.4).
- Ein erlaubter Fall für `is_showcase` durch das Team fehlt (siehe 5).
- Die PocketBase-Zugriffsregeln aus `pb_migrations/` brauchen einen Test gegen
  eine laufende Instanz — der Harness kann sie grundsätzlich nicht abbilden.
- `push.js:110` — `batch[j]._deviceId` ist toter Code und verschleiert die
  Indexrechnung (siehe 2.1).
