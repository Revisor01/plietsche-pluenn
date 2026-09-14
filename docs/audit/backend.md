# Audit: Backend-Fachlogik

> **Abgenommen am 14.09.2026.** Der Stand jedes einzelnen Befunds — behoben,
> bewusst offen, offen oder hinfällig — steht in [`ABNAHME.md`](ABNAHME.md),
> jeweils am Code belegt. Behobene Befunde sind zusätzlich hier markiert;
> gelöscht wurde nichts.

**Datum:** 14.09.2026
**Prüfer:** Code-Audit gegen `CLAUDE.md` (Projektregeln) und die Testsuite in `tests/`

## Umfang

Geprüft wurden die PocketBase-Hooks und die Migrationen:

| Datei | Zeilen |
|---|---|
| `pocketbase/pb_hooks/lib/points.js` | 497 |
| `pocketbase/pb_hooks/lib/push.js` | 119 |
| `pocketbase/pb_hooks/scan.pb.js` | 143 |
| `pocketbase/pb_hooks/defaults.pb.js` | 155 |
| `pocketbase/pb_hooks/cron.pb.js` | 167 |
| `pocketbase/pb_hooks/push.pb.js` | 46 |
| `pocketbase/pb_migrations/` (13 Dateien) | 1.264 |
| **Summe** | **2.391** |

Gegengelesen: `tests/` (7 Dateien, 2.523 Zeilen, 173 Tests — alle grün, Laufzeit
1,04 s), `vitest.config.mjs`, `docker-compose.yml`.

**Gegen Produktion gemessen.** Mehrere Befunde sind nicht aus dem Code
geschlossen, sondern an der laufenden Instanz `pb.plietsche-plünn.de` und im
Container `plietsche-pocketbase` auf `server.godsapp.de` nachgewiesen. Die
jeweiligen Messungen stehen beim Befund.

**Gegenprobe zur Abgrenzung:** Für jede Sammlung wurde ein unangemeldeter
Lesezugriff gemessen. `items`, `badges`, `users`, `visits`, `points_log`,
`campaigns`, `push_devices`, `push_messages`, `user_badges`, `action_counts`
und `needs` liefern durchweg `totalItems: 0` — die Regeln greifen dort. Ein
unangemeldeter Schreibversuch auf `items` wurde abgewiesen und hat in der
Datenbank nichts hinterlassen (Bestand vor und nach dem Test: 30 Teile,
neuester Eintrag unverändert vom 02.08.2026). Es bleibt genau **eine**
Sammlung übrig, die tatsächlich offen steht — siehe Befund 1.

---

## Befunde

### [KRITISCH] Das Türgeheimnis steht unangemeldet im Netz

**Fundstelle:** `pocketbase/pb_migrations/1700000000_init_schema.js:328-353`

```js
const store = new Collection({
  name: 'store',
  type: 'base',
  listRule: '',
  viewRule: '',
  ...
  new SchemaField({ name: 'checkin_qr_secret', type: 'text', options: { max: 128 } }),
```

In PocketBase bedeutet die **leere Zeichenkette** bei `listRule`/`viewRule`
nicht „niemand", sondern „alle, auch ohne Anmeldung". `null` wäre „nur
Superuser". Die `store`-Sammlung enthält aber `checkin_qr_secret` — genau den
Code, der am Aushang an der Ladentür hängt und den `scan.pb.js:47` als Beweis
dafür nimmt, dass jemand im Laden steht. Keine der zwölf späteren Migrationen
ändert diese Regeln; ein `grep` über alle Migrationen nach `store` und `Rule`
findet keine Korrektur.

**Gemessen (14.09.2026, ohne Anmeldung, ohne Token):**

```
$ curl https://pb.xn--plietsche-plnn-rsb.de/api/collections/store/records
HTTP 200
{"items":[{"checkin_qr_secret":"<32 Zeichen, im Klartext lesbar>",
  "lat":54.3025,"lng":9.226,"geofence_radius_m":2000,
  "pts_checkin":10,"pts_take":5,"max_items_take":7, ...}]}
```

**Fehlerszenario:** Jemand ruft die URL im Browser auf und hat das Geheimnis.
Er schickt `POST /api/pp/scan` mit genau diesem Wert als `qr_code` — **ohne**
`gps_lat`/`gps_lng`. `scan.pb.js:50` prüft den Geofence nur, wenn beide Werte
mitkommen; fehlen sie, wird er übersprungen (Befund 2). Ergebnis: täglicher
Check-in-Bonus plus fortlaufende Serie, von jedem Ort der Welt, für jedes
angemeldete Konto. Der Kontostand, die Ränge und die Bestenliste sind damit
frei erfindbar. Zusätzlich liegen Standort und Radius des Ladens offen.

~~Erschwerend: Das Geheimnis lässt sich nicht heimlich wechseln — es hängt
gedruckt an der Ladentür. Ein Wechsel bedeutet Aushang neu drucken.~~

> **Diese Annahme war falsch (richtiggestellt 14.09.2026).** Ein Aushang war
> zum Zeitpunkt des Audits nie gedruckt worden; der Laden ist noch nicht in
> Betrieb. Die Einschätzung stammte aus einer älteren Notiz über eine frühere
> Rotation und ist ungeprüft in den Befund eingeflossen.
>
> Sie hat die Empfehlung unnötig schwer gemacht: Schritt 2 wurde zunächst
> abgelehnt, weil der vermeintliche Aufwand — neuer Aushang, Verteilung — nicht
> im Verhältnis zu stehen schien. Tatsächlich kostete die Rotation einen
> API-Aufruf. **Eine Annahme über die Welt außerhalb des Codes gehört
> nachgefragt, nicht aus einer Notiz übernommen.**

**Empfehlung:** Zwei Schritte, beide nötig.
1. `checkin_qr_secret` aus der öffentlich lesbaren Sammlung herausnehmen —
   entweder in eine eigene Sammlung mit `listRule: null` verschieben, oder
   `store` auf `@request.auth.id != ""` setzen und das Geheimnis nie an den
   Client ausliefern. Die App braucht es nicht: Sie schickt den gescannten
   Code an den Server, der Vergleich passiert in `scan.pb.js:47`.
2. Danach den Code rotieren — der alte ist verbrannt. (Erledigt am 14.09.2026;
   ein Aushang war noch nicht gedruckt, es gab also nichts zu ersetzen.)

Zu beachten: Die App liest `store` für Öffnungszeiten, Adresse und Ränge. Wer
die Sammlung auf angemeldet umstellt, muss prüfen, ob eine Ansicht sie vor dem
Login braucht. Das Feld selbst gehört aber in keinem Fall in die Antwort.

### Stand 14.09.2026: Schritt 1 behoben, Schritt 2 bewusst nicht

**Schritt 1 ist erledigt.** Das Geheimnis liegt in einer eigenen Sammlung
`store_secrets`, deren fünf Zugriffsregeln auf `null` stehen — über die
REST-API kommt niemand daran, auch nicht angemeldet. `store` selbst verlangt
jetzt `@request.auth.id != ""`. Geprüft und belegt: Login, Registrierung und
das Onboarding lesen `store` nicht, das Schließen der Regel bricht also keine
Ansicht. Der Scan-Hook liest aus der neuen Sammlung, mit Rückfall auf das
Altfeld für noch nicht migrierte Instanzen.

**Schritt 2 — Rotation — zunächst bewusst unterlassen, dann doch ausgeführt.**
Die ursprüngliche Entscheidung des Betreibers am 14.09.2026 lautete: Die App
wird von unter 100 Personen in einem einzelnen Laden genutzt; der Aufwand
(neuer Aushang, Verteilung) steht nicht im Verhältnis zum Risiko, nachdem der
Abrufweg geschlossen ist.

**Diese Abwägung fiel weg, als das Repository öffentlich gestellt wurde.** Der
gemessene Wert stand im Klartext in genau diesem Bericht — die `curl`-Ausgabe
oben war beim Anlegen ungefiltert übernommen worden. In einem privaten Repo war
das vertretbar, in einem öffentlichen nicht.

Deshalb am 14.09.2026 rotiert, vor dem Öffentlichmachen. Gegenprobe: Der alte
Wert liefert an `POST /api/pp/scan` jetzt `404 Unbekannter QR-Code`, der neue
`200`. Der Wert in der Versionsgeschichte ist damit wertlos; ein Umschreiben der
Historie erübrigt sich. Der neue Wert steht in keiner Datei des Repos.

Ein Aushang war zu diesem Zeitpunkt noch nicht gedruckt — die Rotation hatte
deshalb keine Folgen außerhalb des Servers.

Aus demselben Grund bleibt `geofence_radius_m` vorerst auf 2000 (siehe
Nebenbefund weiter unten): Der Radius ist ohne GPS ohnehin nicht bindend, und
die Ortsprüfung stützt sich auf das Türgeheimnis, das nun wieder geschützt ist.

---

### [KRITISCH] Der Tageswechsel liegt um 02:00 Uhr Ortszeit — zweiter Bonus möglich — **BEHOBEN 14.09.2026**

> **Behoben am 14.09.2026.** Tagesgrenze, Kalenderwoche und Jahreszahl werden
> jetzt in der Ladenzeitzone gerechnet statt aus der Prozess-Umgebung geerbt:
> `points.js:113-123` (`storeDayStart`), dazu `storeParts` und
> `storeOffsetMinutes`. Die Zeitzone ist auf dem `store`-Datensatz pflegbar
> (`store.timezone`, Rückfall `Europe/Berlin`). Die Suite läuft jetzt in UTC —
> der Zeitzone des Containers —, nicht mehr in Europe/Berlin.
>
> Abgesichert durch `tests/timezone.test.js` (16 Tests), u. a. „gibt für 00:30
> Ortszeit keinen zweiten Check-in-Bonus am Vormittag“ und „trifft die
> Tagesgrenze in der Nacht der Zeitumstellung“. Mutationsprobe gelaufen: Mit
> dem alten Stand fallen 7 Tests.

**Fundstelle:** `pocketbase/pb_hooks/lib/points.js:126-137`

```js
hasVisitToday(userId, now) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const startIso = start.toISOString().replace('T', ' ');
```

`getFullYear/getMonth/getDate` und der `new Date(...)`-Konstruktor mit
Einzelwerten arbeiten in der **Zeitzone des Prozesses**. Der Container setzt
keine Zeitzone:

```yaml
# docker-compose.yml:12-17 — kein TZ in environment
environment:
  PB_ENCRYPTION_KEY: ${PB_ENCRYPTION_KEY}
```

**Gemessen auf dem Server (14.09.2026):**

```
$ docker exec plietsche-pocketbase date
Mon Sep 14 10:27:10 UTC 2026
$ docker exec plietsche-pocketbase sh -c 'echo $TZ'
            (leer)
$ date        # Host
Mo 14. Sep 12:27:10 CEST 2026
```

Der Container läuft in **UTC**, der Laden steht in Deutschland (CEST, UTC+2).
Der „Tag" des Servers beginnt damit um **02:00 Uhr Ortszeit**, nicht um
Mitternacht.

**Fehlerszenario (nachgerechnet):** Jemand checkt Montag um **00:30 Ortszeit**
ein. Gespeichert wird `2026-08-02 22:30:00Z` — für den Server der *Sonntag*.
Derselbe Mensch checkt Montag um 10:00 Ortszeit erneut ein:

```
Filter-Startwert für den 2. Scan: "2026-08-03 00:00:00.000Z"
1. Besuch gespeichert als:        "2026-08-02 22:30:00.000Z"
Wird gefunden (>= Start)?         false   →  ZWEITER Check-in-Bonus
```

`hasVisitToday` meldet „noch kein Besuch heute", `doCheckin` legt einen zweiten
Besuch an und schreibt den vollen Bonus ein zweites Mal gut. Auch der
Race-Guard in `points.js:184` greift nicht — er ruft dieselbe Funktion.

Dass solche Zeitstempel real vorkommen, zeigt der Produktionsbestand:

```
$ sqlite3 /pb_data/data.db "SELECT id,checkin_at FROM visits ORDER BY created DESC"
687kypa5q8xipv6 | 2026-08-03 22:04:48.063Z     ← = Mo 04.08. 00:04 Ortszeit
7xgzphqjhv6a4k9 | 2026-08-04 01:30:33.866Z     ← = Mo 04.08. 03:30 Ortszeit
```

Der Eintrag um `22:04Z` liegt nach Ortszeit bereits am Montag, wird vom Server
aber dem Sonntag zugerechnet. Bei nur fünf Besuchen in der Datenbank ist noch
kein Doppelbonus entstanden, der Mechanismus steht aber scharf.

Derselbe Fehler wirkt auf die **Serie**: `isoWeek` (`points.js:252-259`) liest
ebenfalls lokale Datumsteile. Ein Check-in Montag 00:30 Ortszeit wird der
**Vorwoche** zugeschlagen:

```
isoWeek(2026-08-02T22:30:00Z)  →  202631   (Sonntag, Vorwoche)
isoWeek(2026-08-03T08:00:00Z)  →  202632   (Montag)
```

Und auf die Treue-Abzeichen: `cron.pb.js:156` zählt Jahre über
`new Date(checkin_at).getFullYear()`. Ein Besuch am 01.01. um 00:30 Ortszeit
liefert `2025` statt `2026` — ein Jahr fehlt in der Zählung.

**Warum kein Test das findet:** `vitest.config.mjs:10` nagelt die Zeitzone
absichtlich auf `Europe/Berlin`:

```js
env: { TZ: 'Europe/Berlin' },
```

Die Begründung im Kommentar ist richtig (ohne feste Zeitzone wandern die
Ergebnisse), die gewählte Zeitzone ist aber **nicht die des Servers**. Die
Suite prüft damit durchgehend gegen eine Umgebung, die es in Produktion nicht
gibt. Das ist genau der Fall, vor dem die Projektregel „grüne Tests beweisen
das nicht" warnt.

**Empfehlung:** Die Tagesgrenze fachlich festlegen statt sie von der
Prozess-Umgebung erben zu lassen. Zwei gangbare Wege:
- `TZ: Europe/Berlin` in `docker-compose.yml` setzen — ein Einzeiler, behebt
  Tageswechsel, Serie und Jahreszählung auf einen Schlag, und bringt die
  Testzeitzone mit der Produktion in Deckung. Achtung: die Cron-Ausdrücke in
  `cron.pb.js` verschieben sich dann um zwei Stunden (3:05 UTC → 3:05 MESZ);
  das ist hier unkritisch, sollte aber bewusst geschehen.
- Oder die Tagesgrenze im Code explizit auf Europe/Berlin rechnen und die
  Zeitzone nirgends aus `new Date()` ableiten.

In beiden Fällen gehört ein Test dazu, der die Grenze mit einem Zeitstempel
zwischen 22:00Z und 24:00Z prüft.

---

### [HOCH] Ohne GPS wird der Geofence gar nicht geprüft — **BEWUSST OFFEN (14.09.2026)**

> **Bewusst offen, 14.09.2026.** Der Befund hing ausdrücklich an Befund 1
> („Diese Begründung trägt, solange das Geheimnis geheim ist“). Mit dessen
> Behebung ist das Geheimnis wieder geschützt, und der GPS-freie Weg bleibt —
> wie im Befund selbst vorgesehen — bestehen. Die Prüfung ist zugleich auf
> eine Fassung zusammengeführt (`points.js:639-645`, `assertInGeofence`);
> der Rückfallradius steht als `DEFAULT_GEOFENCE_RADIUS_M` an einer Stelle.

**Fundstelle:** `pocketbase/pb_hooks/scan.pb.js:49-54` und `102-106`

```js
let distance = null;
if (lat != null && lng != null) {
  distance = lib.distanceM(lat, lng, store.get('lat'), store.get('lng'));
  const radius = store.get('geofence_radius_m') || 150;
  if (distance > radius) throw new ApiError(400, 'Du bist nicht im Laden');
}
```

Ob GPS mitgeschickt wird, entscheidet allein der Client. Wer die Felder
weglässt, umgeht die Prüfung vollständig — es gibt keinen Zweig, der ein
Fehlen ahndet.

**Gemessen (Harness, Laden auf 54.3/9.2, Radius 100 m, Anfrage ohne GPS):**

```
{"type":"checkin","already_checked_in":false,"points":10,
 "points_total":10,"streak_weeks":1}
```

Der Kommentar in `scan.pb.js:100-102` nennt das bewusst so und begründet es:
„ohne GPS fallen wir darauf zurück, dem QR-Geheimnis im Laden zu vertrauen."
Diese Begründung trägt, **solange das Geheimnis geheim ist**. In Verbindung
mit Befund 1 ist sie hinfällig: Das Geheimnis steht im Netz, und der einzige
verbleibende Ortsbeweis ist abschaltbar. Deshalb hier als eigener Befund und
nicht als Stilfrage — die beiden Lücken zusammen ergeben erst den vollen
Schaden.

Der Test `scan.test.js:155` („lässt einen Check-in ohne GPS zu") hält dieses
Verhalten ausdrücklich fest. Er ist nicht falsch; er beschreibt eine
Entscheidung, die mit Befund 1 neu zu treffen ist.

**Empfehlung:** Nach Behebung von Befund 1 kann der GPS-freie Weg bestehen
bleiben. Bleibt das Geheimnis erreichbar, muss GPS verpflichtend werden — dann
aber mit bewusster Entscheidung, was mit Geräten ohne Standortfreigabe
geschieht (die App kennt den Fall, siehe Fehlermeldung „Du bist nicht im
Laden").

---

### [HOCH] Serie zählt über eine übersprungene Woche 53 hinweg weiter — **BEHOBEN 14.09.2026**

> **Behoben am 14.09.2026.** `isoWeeksInYear(year)` (`points.js:416-420`)
> bestimmt, ob ein Jahr 52 oder 53 Kalenderwochen hat; `isWeekAdjacent`
> (`:427-435`) lässt nur noch die tatsächlich letzte Woche des Vorjahres als
> Vorgängerin von KW 1 gelten. `updateStreak` und der Reset-Cron rufen jetzt
> dieselbe Funktion, statt die Regel nachzubauen — damit ist zugleich der
> Redundanz-Befund „ISO-Woche an drei Stellen“ erledigt.
>
> Abgesichert durch `tests/streak.test.js` („reisst, wenn die 53. Woche
> uebersprungen wurde“, „kennt die Laenge des jeweiligen Jahres“) und
> `tests/cron.test.js` („setzt zurueck, wenn die 53. Woche ausgelassen
> wurde“). Mutationsprobe gelaufen: Mit dem alten Ausdruck fallen 6 Tests
> über alle drei Aufrufstellen.

**Fundstelle:** `pocketbase/pb_hooks/lib/points.js:300-303`

```js
isWeekAdjacent(earlier, later) {
  if (later - earlier === 1) return true;
  return later % 100 === 1 && earlier % 100 >= 52 && Math.floor(later / 100) - Math.floor(earlier / 100) === 1;
}
```

Die Bedingung `earlier % 100 >= 52` lässt sowohl KW52 als auch KW53 als
Vorgänger von KW1 durchgehen. In Jahren mit **53 ISO-Wochen** (2015, 2020,
2026, 2032 …) ist aber nur KW53 der echte Vorgänger. KW52 → KW1 bedeutet dort
eine **ausgelassene Woche** — die Serie müsste reißen.

**Gemessen:**

```
isoWeek(2020-12-21) → 202052        isoWeek(2021-01-04) → 202101
isWeekAdjacent(202053, 202101) → true    (richtig)
isWeekAdjacent(202052, 202101) → true    (falsch — KW53 fehlt dazwischen)
```

**Fehlerszenario:** Jemand hat eine Serie von 5 Wochen, letzter Besuch am
21.12.2020 (KW52). Die Woche vom 28.12. bis 03.01. (KW53) lässt er aus. Am
04.01.2021 (KW1) kommt er wieder. `updateStreak` (`points.js:315`) hat
dieselbe Lücke im zweiten Zweig:

```js
} else if (thisWeek - lastWeek === 1 || (thisWeek % 100 === 1 && lastWeek % 100 >= 52)) {
  user.set('streak_weeks', current + 1);
```

Gemessen im Harness:

```
streak_weeks vorher: 5
updateStreak(user, 2021-01-04)
streak_weeks nachher: 6        ← erwartet: 1
```

Die Serie läuft weiter, obwohl eine Woche fehlt. Dieselbe Funktion treibt
`streakFromVisits` (`points.js:293`) — also auch den Abzeichen-Fortschritt —
und den Reset-Cron (`cron.pb.js:59`), dessen Karenzprüfung die Lücke ebenfalls
nicht bemerkt (`202052 → 202101`: `diff=49`, Sonderfall greift, **kein** Reset).

Der Fehler wirkt in beide Richtungen unschön: Er verlängert eine Serie
unverdient und verhindert gleichzeitig, dass der Reset-Cron sie einfängt.

**Wie oft:** Ein 53-Wochen-Jahr tritt etwa alle 5–6 Jahre auf; **2026 ist
eines** (KW53 vom 28.12.2026 bis 03.01.2027). Der Fall steht also zum
kommenden Jahreswechsel an.

**Warum kein Test das findet:** `streak.test.js:76` („trägt über den
Jahreswechsel") und `:87` („ist am Jahreswechsel eine Woche nachsichtig")
prüfen beide nur Übergänge, bei denen das Verhalten stimmt.
`streak.test.js:205` hält sogar einen verwandten Befund fest („setzt eine Serie
über eine Lücke von zwei Jahren fort"), aber nicht diesen.

**Empfehlung:** Die Zahl der ISO-Wochen des früheren Jahres bestimmen (ein
Jahr hat 53 Wochen, wenn der 28.12. in KW53 fällt) und nur diese letzte Woche
als Vorgänger von KW1 zulassen. Dazu je ein Test für `202053 → 202101`
(fortsetzen) und `202052 → 202101` (reißen) — und derselbe Fall für den
Reset-Cron.

---

### [MITTEL] Aktion mit dem höchsten Faktor wird nicht gefunden

**Fundstelle:** `pocketbase/pb_hooks/lib/points.js:59-73`

```js
rows = $app.dao().findRecordsByFilter(
  'campaigns', `starts_at <= "${iso}" && ends_at >= "${iso}"`, '-multiplier', 0, 0);
...
for (const c of rows) {
  if (!user || this.campaignApplies(c, user, now)) return c;
}
```

Der Kommentar darüber verspricht: „Find the **highest-multiplier** campaign
active right now." Sortiert wird aber nach dem **alten** Sammelfeld
`multiplier`, während `campaignMult` (`points.js:46-53`) die neuen Felder
`mult_visit` / `mult_take` / `mult_bring` bevorzugt und `multiplier` nur als
Rückfall nimmt. Laufen zwei Aktionen gleichzeitig, gewinnt die mit dem höheren
*alten* Wert — nicht die, die tatsächlich mehr Punkte bringt.

**Gemessen (Harness, beide Aktionen laufen, Besucherin passt auf beide):**

```
c1 „klein":  multiplier=5, mult_take=1
c2 „gross":  multiplier=1, mult_take=10

findActiveCampaign → wählt "klein"
campaignMult(gewählt,'take') → 1
```

**Fehlerszenario:** Das Team legt eine Dauer-Aktion „Besuchswoche" mit
`multiplier: 3` an (Alt-Feld, aus einer früheren Pflege) und darüber eine
kurze „Holwoche" mit `mult_take: 5`. Wer in der Holwoche ein Teil scannt,
bekommt den einfachen Wert statt des fünffachen — die beworbene Aktion wirkt
nicht, und niemand sieht warum. Zusätzlich zählt `bumpActionCount`
(`points.js:149`) die Teilnahme dann nicht mit, weil der Faktor der
*gewählten* Aktion nicht über 1 liegt — das zugehörige Aktions-Abzeichen
bleibt ebenfalls aus.

Der Fall setzt zwei gleichzeitig laufende Aktionen voraus. Das Schema erlaubt
sie (`campaigns` hat keine Überlappungsprüfung), und `findActiveCampaign`
iteriert ausdrücklich über mehrere Zeilen — die Funktion ist also für diesen
Fall gebaut, nur falsch sortiert.

**Warum kein Test das findet:** `streak.test.js:336-380` prüft
`findActiveCampaign` nur mit **einer** laufenden Aktion. Der Fall „zwei
Aktionen gleichzeitig" fehlt vollständig.

**Empfehlung:** Entweder den fachlich richtigen Faktor je Handlungstyp zum
Auswahlkriterium machen (`findActiveCampaign(now, user, type)` und in JS nach
`campaignMult(c, type)` sortieren), oder — falls gleichzeitige Aktionen fachlich
nicht vorgesehen sind — das ausdrücklich festhalten und beim Anlegen
verhindern. So oder so ein Test mit zwei laufenden Aktionen.

---

### [MITTEL] Gestufte Aktions-Abzeichen erreichen niemanden, der nur da war

**Fundstelle:** `pocketbase/pb_hooks/cron.pb.js:76-101`

Der Kommentar über dem Job nennt ausdrücklich zwei Fälle, die er abfangen soll:

```
//   - Teilnahme durch reinen Besuch (kein gebrachtes Teil)
//   - Aktion/Badge erst nachträglich verknüpft, Beiträge lagen schon vor
```

Der Code löst das aber nur für **einstufige** Abzeichen. Für gestufte bricht er
vorher ab:

```js
if (`${badge.get('kind')}` === 'tiered') {
  let counts = [];
  try {
    counts = dao.findRecordsByFilter('action_counts', `campaign = "${camp.id}" && count > 0`, '', 0, 0);
  } catch (_) {}
  for (const c of counts) {
    try { lib.checkBadges(dao.findRecordById('users', `${c.get('user')}`)); } catch (_) {}
  }
  continue;
}
```

Er läuft ausschließlich über `action_counts` — und dort steht nur, wer schon
einen Beitrag *gezählt* bekommen hat. Der Abschnitt „b) Wer im Aktionszeitraum
da war" (`cron.pb.js:116-128`), der genau den versprochenen Besuchs-Fall
abdeckt, liegt **hinter** dem `continue` und wird für gestufte Abzeichen nie
erreicht.

**Gemessen (Harness):** Aktion `c1` mit gestuftem Abzeichen `b1`
(`trigger_type: action_participation`, `tier_bronze: 1`), eine Besucherin mit
einem Besuch im Aktionszeitraum, keine `action_counts`-Zeile:

```
runCron('action-badges')
user_badges danach: []          ← erwartet: bronze
```

**Fehlerszenario:** Das Team fährt eine Besuchsaktion mit einem gestuften
Abzeichen („1 Besuch = Bronze, 3 = Silber"). Wer nur vorbeikommt und nichts
bringt, bekommt gar nichts — weder sofort (`doCheckin` zählt
`bumpActionCount(user, camp, 'visit', 1)` nur, wenn `mult_visit > 1`, siehe
`points.js:149`) noch nachträglich über diesen Job. Für einstufige Abzeichen
funktioniert derselbe Aufbau. Der Unterschied ist für das Team nicht
erkennbar; im Verwaltungsbereich ist „gestuft" nur ein Auswahlfeld.

**Empfehlung:** Im gestuften Zweig die Besucher:innen des Aktionszeitraums
mit aufnehmen — die Menge aus Abschnitt b) bilden und für diese Personen
ebenfalls `checkBadges` laufen lassen. `checkBadges` liest den Fortschritt
über `computeProgress` aus `action_counts`; damit das greift, muss der Besuch
dort auch ankommen, also `bumpActionCount` für `visit` unabhängig vom Faktor
zählen oder `computeProgress` für `action_participation` die Besuche im
Zeitraum mitzählen lassen. Welche der beiden Auslegungen gewollt ist, ist eine
fachliche Frage — der CHANGELOG gibt sie nicht her, hier wäre nachzufragen.

---

### [MITTEL] `tiers_json` als Zeichenkette lässt Abzeichen-Stufen verschwinden

**Fundstelle:** `pocketbase/pb_hooks/lib/points.js:329-338`

```js
tierSlotCount() {
  try {
    const s = $app.dao().findFirstRecordByFilter('store', '1=1');
    const t = s ? s.get('tiers_json') : null;
    const n = t && t.length ? t.length : 5;
    return Math.max(1, Math.min(5, n));
  } catch (_) {
    return 5;
  }
}
```

`t.length` ist für ein Array die Zahl der Ränge — für eine **Zeichenkette**
aber die Zahl der Zeichen. PocketBase liefert ein `json`-Feld je nach
Schreibweg als Array oder als JSON-String zurück.

**Gemessen:**

```
tiers_json = '[]'                        → tierSlotCount() = 2   (erwartet: 5)
tiers_json = '[{"a":1},{"b":2}]'         → tierSlotCount() = 5   (erwartet: 2)
```

Der erste Fall ist der schädliche: Bei zwei Slots schneidet `badgeTiers`
(`points.js:349`) die Liste nach Silber ab. Gold, Platin und Diamant sind
damit für **jedes** gestufte Abzeichen unerreichbar — auch die zugehörigen
Punkte werden nie ausgeschüttet.

**Wie realistisch:** In Produktion steht derzeit ein echtes Array:

```
$ curl .../store/records
"tiers_json":[{"at":150,"name":"Bronze"},{"at":750,"name":"Silber"},
              {"at":1500,"name":"Gold"},{"at":3000,"name":"Platin"},
              {"at":6000,"name":"Diamant"}]
```

Die Lage ist also gerade in Ordnung. Sie hängt aber daran, auf welchem Weg das
Feld zuletzt beschrieben wurde — die Seed-Migration
(`1700000800_diamant_tiers.js:56`) schreibt ein echtes Array, ein
Verwaltungs-Client oder ein API-Aufruf kann einen String schreiben. Der Code
fängt diesen Unterschied nicht ab, und der Fehler wäre stumm: keine
Fehlermeldung, nur fehlende Stufen.

**Warum kein Test das findet:** `badges.test.js:74-107` prüft `tierSlotCount`
ausschließlich mit Arrays. Der Harness setzt den Wert direkt als
JavaScript-Array, der String-Fall kommt nicht vor.

**Empfehlung:** Den Wert vor der Längenprüfung normalisieren — ist er eine
Zeichenkette, erst `JSON.parse` versuchen — und nur ein echtes Array zählen.
Dazu ein Test mit `tiers_json` als String.

---

### [NIEDRIG] Punkte aus Abzeichen fehlen im `points`-Feld der Antwort

**Fundstelle:** `pocketbase/pb_hooks/scan.pb.js:73-82`

```js
const res = lib.doCheckin(user, now, { lat, lng, distance, itemsCount });
lib.checkBadges(user);
const fresh = $app.dao().findRecordById('users', auth.id);
return c.json(200, {
  ...
  points: res.points,
  points_total: fresh.get('points_total'),
```

`points` stammt aus `doCheckin` und kennt nur Besuchsbonus und Stepper-Punkte.
`checkBadges` läuft **danach** und kann zusätzlich Punkte gutschreiben
(`points.js:398` und `:415`). `points_total` wird frisch gelesen und enthält
sie, `points` nicht.

**Gemessen (Harness, Abzeichen „Erster Besuch" mit `reward_bronze: 500`):**

```
{"type":"checkin","already_checked_in":false,
 "points":10,              ← zeigt nur den Check-in
 "points_total":510,       ← enthält die 500 aus dem Abzeichen
 "streak_weeks":1}
```

**Fehlerszenario:** Beim ersten Besuch meldet die App „+10 Punkte", der
Kontostand springt aber um 510. Die Differenz ist für Nutzer:innen nicht
erklärbar — sie sehen eine Zahl, die nicht zur anderen passt, genau in dem
Moment, in dem das Abzeichen freigeschaltet wird. Derselbe Effekt tritt im
Teil-Zweig auf (`scan.pb.js:137`).

Kein Rechenfehler — der Kontostand stimmt. Es ist eine falsche Anzeige an der
sichtbarsten Stelle.

**Empfehlung:** Antwortform **nicht** ändern (`points` bleibt, was es ist —
die Regel „ausgelieferte Apps nie brechen" gilt). Stattdessen ein **zusätzliches**
Feld ergänzen, etwa `bonus_points`, und die App es addieren lassen, sobald eine
neue Version draußen ist. Neue Felder hinzufügen ist ausdrücklich erlaubt.

---

### [NIEDRIG] Anführungszeichen im Push-Token brechen aus dem Filter aus

**Fundstelle:** `pocketbase/pb_hooks/push.pb.js:20` und `:42`

```js
rec = dao.findFirstRecordByFilter('push_devices', `expo_token = "${token}"`);
...
const rec = dao.findFirstRecordByFilter('push_devices', `expo_token = "${token}" && user = "${auth.id}"`);
```

`token` kommt ungeprüft aus dem Anfragekörper (`push.pb.js:12`) und wird ohne
Maskierung in den Filter gesetzt. Ein Token wie `x" || user = "andereId`
verändert den Ausdruck.

Das ist die **einzige** solche Stelle: Ein `grep` über alle interpolierten
Filter in `pb_hooks/` findet 18 Fundstellen, aber in den übrigen 16 stammt der
eingesetzte Wert aus einer PocketBase-Id (`user.id`, `camp.id`, `badge.id`,
`auth.id`) oder einem serverseitig erzeugten Zeitstempel — dort kann nichts
Fremdes einfließen.

**Warum nur NIEDRIG:** Der Schaden ist begrenzt. Das `findFirstRecordByFilter`
dient nur dazu, eine vorhandene Zeile zu finden; anschließend wird `user` auf
die aufrufende Person gesetzt (`push.pb.js:25`). Ein Angreifer könnte den
Push-Token einer fremden Person auf sein eigenes Konto umschreiben — also der
anderen Person die Nachrichten abdrehen und sie selbst empfangen. Das ist
ärgerlich, aber weder Rechteausweitung noch Datenabfluss aus anderen
Sammlungen. Beim Abmelden (`:42`) bindet die zweite Bedingung zusätzlich an
`auth.id`, ein `||` hebelt sie allerdings aus.

Der Harness kann das nicht nachstellen — `matchesFilter`
(`tests/harness.js:101`) trennt nur an `&&` und wirft bei `||`. Deshalb steht
der Befund auf Code-Lesung, nicht auf Messung. Der Verlauf der Werte in den
Filter ist aber eindeutig.

**Empfehlung:** PocketBase kennt parametrisierte Filter
(`$dbx.exp` / Platzhalter-Syntax). Ersatzweise den Token vor der Verwendung
gegen das Expo-Format prüfen (`ExponentPushToken[…]`, nur Buchstaben, Ziffern,
Binde- und Unterstriche) und alles andere mit 400 abweisen. Dazu ein Test für
den verbotenen und einen für den erlaubten Fall.

---

### [NIEDRIG] Push-Nachricht gilt als verschickt, auch wenn Expo nicht erreichbar war

**Fundstelle:** `pocketbase/pb_hooks/cron.pb.js:22-30`

```js
for (const msg of due) {
  ...
  push.send(targets, `${msg.get('title')}`, `${msg.get('body')}`, ...);
  msg.set('sent_at', new Date().toISOString());
  dao.saveRecord(msg);
}
```

`push.send` (`lib/push.js:113`) fängt Netzwerkfehler ab und schweigt:

```js
} catch (_) {
  // network error — skip this batch, try next run
}
```

Der Kommentar sagt „try next run" — einen nächsten Versuch gibt es aber nicht.
`sent_at` wird unabhängig vom Ergebnis gesetzt, und der Filter in `cron.pb.js:18`
(`sent_at = ""`) holt die Nachricht danach nie wieder.

**Fehlerszenario:** Expo ist für zwei Minuten nicht erreichbar (oder die
Firewall-Regeln für ausgehenden Docker-Verkehr fehlen — ein auf diesem Server
bekanntes Muster, siehe `CLAUDE.md`, Abschnitt „KeyHelp Firewall + Docker").
Eine für 10:00 Uhr geplante Ankündigung läuft ins Leere und gilt als erledigt.
Niemand erfährt davon: Es gibt keine Fehlermeldung, im Verwaltungsbereich steht
ein Häkchen, und `send` liefert `{sent: 0}` zurück, was der Aufrufer nicht
auswertet.

**Empfehlung:** Den Rückgabewert von `send` auswerten und `sent_at` nur setzen,
wenn mindestens eine Zustellung bestätigt wurde — sonst die Nachricht stehen
lassen und beim nächsten Lauf erneut versuchen. Damit das nicht ewig kreist,
einen Zähler für Versuche mitführen. Dazu ein Test, der `send` scheitern lässt
und prüft, dass `sent_at` leer bleibt.

---

## Was geprüft und für in Ordnung befunden wurde

**Punkte und Schreibschutz**
- `recomputeTotal` (`points.js:112`) rechnet den Kontostand aus dem
  `points_log` neu, statt im Speicher hochzuzählen. Damit kann er nicht
  driften, auch nicht bei mehreren `awardPoints`-Aufrufen in einer Anfrage.
  Gegengeprüft mit einem Konto, dessen `points_total` künstlich auf 999 stand
  und ohne Log-Zeilen korrekt auf 0 zurückfiel.
- Der Schreibschutz in `defaults.pb.js:26-44` hält: `points_total`,
  `streak_weeks`, `streak_last_visit` und `role` werden auf den gespeicherten
  Wert zurückgesetzt. Die Ausnahmen sind eng gefasst — Superuser, und ein
  App-Admin nur auf **fremden** Datensätzen (`auth.id !== r.id`). Die
  Rechteausweitung „Admin erhöht seinen eigenen Stand" ist ausgeschlossen und
  in `defaults.test.js:139` ausdrücklich getestet.
- `points_log` hat `createRule: null` — gegen Produktion gemessen: ein
  unangemeldeter `POST` liefert `403 Only admins can perform this action`.
  Punkte lassen sich also nicht direkt einschreiben.
- Ein Punktwert von 0 legt weiterhin eine Log-Zeile an — gewollt, damit der
  Verlauf lückenlos bleibt.
- `config()` (`points.js:24-41`) fängt negative und fehlende Werte ab: Bei
  `pts_checkin: -5`, `pts_take: 0`, `max_items_take: 0` greifen durchgehend die
  Rückfallwerte (10/5/5/7). Gemessen.

**Abzeichen**
- Doppelvergabe ausgeschlossen: `checkBadges` zweimal hintereinander auf
  demselben Konto schüttet den Bonus nur einmal aus (gemessen: 50 → 50).
  `grantBadge` meldet beim zweiten Aufruf `false` und zahlt nicht erneut.
- Stufen werden beim Überspringen einzeln belohnt und bei sinkendem
  Fortschritt nicht zurückgenommen (`points.js:410-422`), beides getestet.
- `streak_weeks` als Abzeichen-Auslöser wird bewusst aus den Besuchen
  abgeleitet (`points.js:464-469`) statt aus dem client-nahen Zählerfeld —
  eine saubere Entscheidung, die einen echten Manipulationsweg schließt.
- Treue- und Aktions-Abzeichen werden von `checkBadges` nicht von selbst
  vergeben (`points.js:395`), sondern nur über ihre eigenen Routinen.

**Scan-Route**
- Anmeldepflicht (401), leerer Code (400), unbekannter Code (404), bereits
  mitgenommenes Teil (409), archiviertes Teil (410) und nicht freigegebenes
  Teil (409) greifen alle.
- Das Höchstmaß mitgenommener Teile wird zweifach begrenzt: einmal mit Fehler
  in `scan.pb.js:35` und zusätzlich hart in `doCheckin` (`points.js:180`).
- Ein mitgenommenes Teil wird ohne Verweis auf die Person markiert
  (`scan.pb.js:129`) — die Datenschutz-Zusage aus dem Schemakommentar wird
  eingehalten. Gemessen: der `visits`-Datensatz enthält keine Teil-Id, die
  `points_log`-Zeile keinen Fremdschlüssel.
- Ein leeres `checkin_qr_secret` führt nicht dazu, dass beliebige Codes als
  Tür-Code gelten — der Leerwert wird vorher abgefangen (404).

**Sonstiges**
- Die SKU-Vergabe (`defaults.pb.js:46-60`) leitet sich von der höchsten
  vergebenen Nummer ab, nicht von der Zeilenzahl. Gemessen: `PP-0009`/`PP-0010`
  → `PP-0011`, und `PP-0099`/`PP-0100` → `PP-0101`. Der naheliegende
  Textsortier-Fehler tritt nicht auf, weil die feste Breite von vier Stellen
  Text- und Zahlensortierung zur Deckung bringt. Wird die Nummer je fünfstellig
  (`PP-10000`), kippt das — derzeit aber kein Defekt.
- Die Punkte fürs Bringen werden über `brought_awarded` genau einmal vergeben,
  auch bei erneuter Freigabe (gemessen). Bestand, den das Team selbst
  eingepflegt hat, zählt nicht (`defaults.pb.js:102`).
- Die Migrationen sind durchweg **additiv**: Sie legen Felder und Sammlungen
  an, erweitern `select`-Wertelisten (`trigger_type`, `tier`, `current_tier`,
  `points_log.kind`) und entfernen nichts. Feldumbenennungen gibt es keine. Ein
  Wert, den eine ältere App-Version liest, verschwindet an keiner Stelle. Die
  Regel „ausgelieferte Apps nie brechen" ist auf der Schema-Seite eingehalten.
  Einzige Lockerung: `items.createRule` von „nur Team" auf „alle Angemeldeten"
  (`1700000600`), abgesichert durch den Hook, der Besucher-Einreichungen auf
  `pending` zwingt.
- Die Antwortformen von `/api/pp/scan` und `/api/pp/push/*` sind unverändert
  und in `scan.test.js:395-410` festgeschrieben.
- Der Race-Guard gegen doppelten Check-in (`points.js:184`) ist im Rahmen
  dessen, was ohne Transaktion geht, sauber gebaut: Er prüft direkt vor dem
  Einfügen erneut und zählt im Kollisionsfall nur die Teile, nicht den Bonus.
  Ein echter Wettlauf zweier gleichzeitiger Anfragen bleibt theoretisch
  möglich (zwischen Prüfung und Einfügen liegt kein Schloss), das Fenster ist
  aber klein und der Aufwand für eine Transaktion in der Hook-Umgebung hoch.
  Kein Befund — die verbleibende Lücke ist bewusst und dokumentiert.
- Die Stapelbildung in `push.send` (`lib/push.js:93-111`) indiziert die
  Empfänger korrekt über `targets[i + j]`, auch jenseits des ersten
  100er-Blocks. Der tote Zweig `batch[j]._deviceId` greift nie, schadet aber
  nichts.
- `push-scheduled` verschickt eine bereits versandte Nachricht kein zweites Mal
  (Filter `sent_at = ""`, getestet in `cron.test.js:165`).
- `year-badges` prüft Monat und Tag und tut an gewöhnlichen Tagen nichts
  (`cron.pb.js:140`) — gegen die UTC-Uhr des Containers ist der 31.12.
  zuverlässig getroffen. Die Jahreszählung selbst ist von Befund 2 betroffen.
- Alle vier Cronjobs kapseln ihre Schleifen in `try/catch`, sodass ein
  fehlerhafter Datensatz nicht den ganzen Lauf abbricht. Das ist an dieser
  Stelle richtig — mit der Einschränkung aus dem letzten Befund, dass
  `push-scheduled` den Fehler dann auch verschluckt.
- Keine Geheimnisse im Quelltext: Weder Zugangsdaten noch Schlüssel stehen in
  den Hooks oder Migrationen. `PB_ENCRYPTION_KEY` kommt aus der Umgebung. Die
  Datei `pocketbase/.env.secrets` ist über `.gitignore:13` (`*.secrets`)
  ausgeschlossen und nicht im Repo versioniert — geprüft mit `git check-ignore`
  und `git ls-files`. Ihr Inhalt wurde nicht geöffnet.
