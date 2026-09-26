# Release-Audit September 2026 — Gesamtabnahme

**Datum:** 26.09.2026
**Geprüfter Stand:** Commit `06b68dc` (Branch `main`, Arbeitsbaum sauber)
**Anlass:** Freigabe für den ersten Store-Release (App-Version 1.0.0)
**Umfang:** Das gesamte Repo in neun Bereichen, jeder von einer eigenen Prüfung
mit eigenem Bericht in diesem Verzeichnis. Diese Abnahme fasst zusammen,
führt Doppelungen zusammen, hält die Gegenprüfungen fest und spricht die
Release-Empfehlung aus.

**Vorgehen:** Neun Prüfungen liefen parallel und unabhängig voneinander, jede
mit klarem Zuschnitt und der Auflage, jeden Befund mit Fundstelle zu belegen
und zu kennzeichnen, ob er reproduziert oder nur aus dem Code gelesen ist.
Die Berichte vom 14.09.2026 (`docs/audit/`) dienten nur zur Orientierung;
kein Befund wurde daraus übernommen, ohne am heutigen Code nachgeprüft zu
sein. Die Koordination hat aus jedem Bericht die wichtigsten Behauptungen
stichprobenartig selbst nachvollzogen (Abschnitt „Gegenprüfungen") und die
beiden kritischen Laufzeitbefunde des Backends unabhängig mit der gepinnten
PocketBase-Binärdatei reproduziert.

**Was nicht geprüft werden konnte:** Es gab keinen Zugang zur laufenden
Instanz, zu EAS, App Store Connect, Google Play oder einem Gerät. Alle
Aussagen gelten für den Code-Stand im Repo. Laut Projektregel ist ein Befund
erst behoben, wenn er dort gemessen wurde, wo er auftritt; für die
Sicherheitsbefunde steht die Messliste im Sicherheitsbericht. Ein nativer
Build (Xcode, Gradle) war nicht ausführbar; die Messstelle dafür bleibt die
CI. VoiceOver- und TalkBack-Befunde sind aus dem Code gelesen und gehören am
Gerät bestätigt.

---

## Release-Entscheidung

**Nicht freigeben.** Der Stand ist deutlich besser als vor zwei Wochen, und
das Meiste, was damals offen war, ist erledigt oder weitergekommen. Aber vier
Dinge stehen einem Release im Weg, und zwei davon hätten im Laden sofort
Wirkung:

1. **Die Scan-Route bricht in der echten PocketBase ab.** PocketBase führt
   jeden Handler isoliert aus; Konstanten und Funktionen auf Dateiebene
   existieren dort nicht. Die Scan-Route ruft eine solche Funktion in allen
   drei Erfolgszweigen, die Push-Registrierung bei jeder An- und Abmeldung.
   Der Tür- und der Teile-Scan schreiben Besuch, Punkte und „mitgenommen",
   dann kommt HTTP 400 „Something went wrong". Kein Gerät kann sich für
   Mitteilungen anmelden. Reproduziert in PocketBase 0.22.21, zweimal
   unabhängig. Die auslösenden Commits liegen nach der Einrichtung des
   automatischen Deploys; der Stand ist sehr wahrscheinlich ausgeliefert.
   (Backend-Fachlogik B-1)
2. **Goja parst die Datumswerte von PocketBase nicht.** Felder kommen als
   `2026-09-26 07:41:38.726Z` zurück, mit Leerzeichen statt `T`. `new Date`
   darauf ergibt `Invalid Date`. Damit steht die Serie nach jedem Besuch auf 1,
   der nächtliche Reset löscht jede Serie, das Serien-Abzeichen bleibt bei 0,
   das Treue-Abzeichen wird nie vergeben. Reproduziert, seit Wochen im
   ausgelieferten Code. (B-2)
3. **Jede Person kann sich als Admin registrieren.** Die Sammlung `users`
   läuft mit den PocketBase-Standardregeln, keine Migration begrenzt beim
   Anlegen die Felder, und der Hook setzt `visitor` nur, wenn keine Rolle
   mitkommt. Ein direkter Aufruf der Registrierung mit `role: "admin"` und
   beliebigem `points_total` genügt. Ein bestehender Test sichert das Verhalten
   sogar als gewollt ab. (Sicherheit S-1, App-Grundgerüst A-1)
4. **Abholadressen sind nach Freigabe für alle Angemeldeten lesbar.** Bei
   „Verbleibt bei mir" ist die Adresse Pflicht und landet in `items.location`;
   nach der Freigabe erlaubt die Leseregel jedem Konto den Datensatz. Die App
   blendet das Feld nur aus. (S-2)

Dazu kommen Punkte, die den Store-Release selbst blockieren, ohne den Laden
zu treffen: Es gibt keine Datenschutzerklärung und keine Web-Adresse für die
Kontolöschung (beides verlangen Apple und Google), und die
Play-Versionshinweise bestünden aus rohen Commit-Betreffs. (C-1 bis C-3, S-5)

**Der Weg zur Freigabe ist kurz.** Keiner der Blocker braucht einen Umbau:
drei Helfer in die Handler verschieben, ein Datumsparser an sechs Stellen,
eine Migration für `users`, eine Regel oder ein zweites Feld für die Adresse,
zwei statische Seiten. Was ihn lang macht, ist die Auflage, die dieses Audit
zum zweiten Mal in Folge bestätigt: **Die Testsuite kann keinen der vier
schweren Backend-Befunde sehen.** Der Node-Harness kennt weder die isolierten
Handler noch das PocketBase-Datumsformat noch Byte-Arrays für JSON-Felder.
Ein Praxistest gegen die gepinnte Binärdatei muss vor dem Release in die CI,
sonst bleibt jeder grüne Lauf eine Aussage über den Harness, nicht über die
Laufzeit.

---

## Gesamtbild in Zahlen

| Bereich | Bericht | KRITISCH | HOCH | MITTEL | NIEDRIG | Empfehlung des Berichts |
|---|---|---:|---:|---:|---:|---|
| Backend-Fachlogik | `backend-fachlogik.md` | 2 | 2 | 4 | 9 | nicht freigeben |
| Backend-Sicherheit & Datenschutz | `backend-sicherheit.md` | 2 | 3 | 8 | 4 | nicht freigeben |
| App-Grundgerüst (Auth, Navigation, Daten) | `app-grundgeruest.md` | 1 | 1 | 10 | 9 | nicht freigeben |
| App: fachliche Screens | `app-screens.md` | 0 | 4 | 11 | 10 | mit Auflage |
| App: UI, Barrierefreiheit, Plattform | `app-ui-a11y.md` | 1 | 5 | 9 | 5 | mit Auflage |
| Tests & Harness | `tests.md` | 2 | 2 | 6 | 3 | niedriges Vertrauen bei Datums- und JSON-Feldern |
| CI, Deployment, Store-Reife | `ci-deploy-release.md` | 0 | 4 | 8 | 5 | nicht freigeben |
| Dokumentation & Altbefunde | `doku-und-altbefunde.md` | 0 | 2 | 12 | 5 | — |
| Toolchain & Abhängigkeiten | `toolchain-abhaengigkeiten.md` | 0 | 2 | 3 | 9 | mit Auflage |
| Gegenprüfung der Koordination | dieser Bericht, O-1 | 0 | 1 | 0 | 0 | — |
| **Summe (mit Doppelungen)** | | **8** | **26** | **71** | **59** | |

Die Zahlen sind je Bericht gezählt; einige Befunde tauchen in zwei Berichten
aus verschiedenen Blickwinkeln auf (siehe „Zusammengeführte Befunde"). Ohne
diese Doppelungen sind es **5 kritische** und **22 hohe** Befunde. Dass der
Datumsparser (B-2 / T-1) und das Byte-Array (B-3 / T-2) von zwei Prüfungen
unabhängig voneinander gegen dieselbe PocketBase-Version gemessen wurden,
ist kein Zählfehler, sondern die stärkste Bestätigung in diesem Audit.

Die Kritischen verteilen sich auf drei Ursachen: zwei Laufzeitbefunde im
Backend (Handler-Scope, Datumsparser), zwei Zugriffsbefunde (Registrierung,
Abholadresse) und ein Barrierefreiheitsbefund (Sheet-Auffänger machen den
Datumswähler auf iOS mit VoiceOver unbedienbar). Alle fünf sind je in
wenigen Zeilen zu beheben.

**Testsuite:** 470 Tests in 22 Dateien, alle grün, 3,6 s (14.09.: 276 Tests
in 12 Dateien). Typprüfung der App: 0 Fehler. `npm audit`: 0 Meldungen in
App und Test-Root.

---

## Zusammengeführte Befunde

Mehrere Prüfungen haben dasselbe Problem von verschiedenen Seiten gesehen.
Hier die Zuordnung, damit niemand doppelt arbeitet:

| Thema | Berichte | Ein Fix |
|---|---|---|
| Registrierung übernimmt `role` | S-1, A-1, S-4 (Regeln nicht versioniert) | Migration mit `createRule` auf `users`, die `role`, `points_total`, `streak_weeks` ausschließt; Hook erzwingt `visitor`; Test `defaults.test.js:39-42` umdrehen |
| Datenschutzerklärung / Kontolöschung im Web | S-5, C-2, C-3 | zwei statische Seiten unter der Domain, Links in App und Landingpage |
| Abzeichen-Bonus nach Scan nicht angezeigt | A-3, F-8 | `bonus_points` in `api.ts` typisieren und in `scan.tsx` addieren |
| Splash weiß ohne Bild, ungenutzte Icon-Dateien | U-8, C-7, W-10, D-1, C-8 | `expo-splash-screen` konfigurieren; entweder `icon` als Objekt mit dark/tinted zurück in `app.json` oder CHANGELOG-Zeile streichen |
| Punktwert 0 gilt als „nicht gepflegt" | B-13, F-3 | `val()` in `points.js:134-137` auf `!= null` statt `> 0`, App-Validierung „mindestens 1" |
| Große Listen ohne Virtualisierung | F-14, U-17 | `FlatList` in Laden, Inventar, Abzeichen; QR-SVG im Inventar nur auf Abruf |
| Leer-, Lade- und Fehlerzustand ununterscheidbar | U-3, U-6, F-5, F-12 | `isLoading`/`isError` aus den Queries lesen und anzeigen |
| Dokumentation zur Auslieferung widerspricht sich | C-12, D-11, D-12, D-7 | `CLAUDE.md`, `README.md`, `deploy.md` auf den Stand „Abbild per Workflow" bringen |
| `legacy-peer-deps` und Overrides | C-17, W-1, W-3, W-7, W-8 | Overrides auf das Nötige kürzen (siehe W-1), Begründung in `package.json` |
| Fototext auf iOS englisch | A-12, C-6 | `expo-image-picker` als Plugin mit deutschem Text in `app.json` |
| iOS-Fotos: `mobile/ios/` teilweise getrackt | W-2, C-14 | `git rm -r --cached mobile/ios` |
| Kein Rate-Limit | S-7 (neu), Altbefund Z-6 | PocketBase-Update auf 0.22.55 bringt die Filter-Drossel; Login-Drossel per Traefik oder PocketBase-Einstellung |
| Datumsparser in Goja | B-2, T-1 | eine Hilfsfunktion in `lib/points.js`, sechs Aufrufstellen; Harness liefert Datumsfelder künftig in der PocketBase-Form |
| `tiers_json` als Byte-Array | B-3, T-2 | `asArray` in `points.js` um den Byte-Array-Fall ergänzen; Harness liefert JSON-Felder wie PocketBase |
| Migration an Produktions-ID gebunden | B-4, T-3 | `findCollectionByNameOrId("store")` statt fester ID; CI-Schritt „Migrationen auf leerer Datenbank" |

---

## Gegenprüfungen der Koordination

Jeder Bericht wurde vor der Übernahme an mindestens einer tragenden Aussage
selbst am Code nachvollzogen. Ergebnis: **kein Bericht musste korrigiert
werden.** Im Einzelnen:

| Bericht | Geprüfte Behauptung | Ergebnis |
|---|---|---|
| Backend-Fachlogik | B-1 Handler-Scope, B-2 Datumsparser | **Unabhängig reproduziert** mit PocketBase 0.22.21 und einem eigenen Sondier-Hook: `TOP is not defined`, `helper is not defined`; `new Date("2026-09-26 07:41:38.726Z").getTime()` → `NaN`, dieselbe Zeichenkette mit `T` → `1790408498726` |
| Backend-Sicherheit | S-1 Registrierung, S-2 Abholadresse | `defaults.pb.js:8` setzt `visitor` nur bei leerer Rolle; keine Migration setzt Regeln auf `users`; `1782710000_tighten_read_rules.js:82-84` gibt `status = "approved"` für alle Angemeldeten frei; `items/new.tsx:87-98` schreibt die Adresse nach `location` |
| App-Grundgerüst | A-1 | wie S-1; `useAuth.ts:41` sendet `role: 'visitor'`, was nur die App bindet |
| App-Screens | F-1 Einzel-Abzeichen, F-4 Freigabe ohne Aktionsabfrage | `badges.tsx:32,205` leitet „Geschafft" nur aus `info.current` ab, `current_tier` wird nirgends gelesen; `items/index.tsx:111` und `items/[id].tsx:238` rufen `approveItem(id, false)` ohne Kampagne, nur `review.tsx:45-52` fragt |
| UI & Barrierefreiheit | U-1 Auffänger, U-2 Tastatur, U-3 Ladezustand | `DateField.tsx:103-107` und `badges.tsx:63` setzen nur `importantForAccessibility` (Android); `KeyboardAvoidingView` nur in `login.tsx` und `register.tsx`; `grep isLoading\|isError\|isPending mobile/app` → 0 Treffer |
| CI/Deploy/Store | C-1 Release-Notes, C-4 Deploy-Verify, Datenschutz-Links | `release-notes.py:81` nimmt `punkte[:8]`; `deploy-verify.py:55-67` prüft zwei Migrationen; `docker-compose.portainer.yml:28` zieht `:latest`; `konto.html` kennt drei `confirm-`-Fälle; kein Treffer für „Datenschutz" in App oder `web/index.html` |
| Doku & Altbefunde | D-1 Icon-Konfiguration | `app.json:9` hat `icon` als einfachen Pfad, keine dark/tinted-Variante |
| Tests & Harness | T-3 feste Sammlungs-ID, T-4 Quelltext-Tests | `1782637408_updated_store.js:4,23` ruft `findCollectionByNameOrId("8hdpqi33x65ptii")`; `tests/email-verify.test.js:13-86` liest Dateien per `readFileSync` und prüft mit `toContain`/`toMatch` auf Zeichenketten |
| Toolchain | W-1 ESM-Override, W-2 getracktes `mobile/ios/` | `decode-uri-component@0.5.0` hat `"type": "module"`, `query-string` verlangt `^0.2.2`; `git ls-files mobile/ios` liefert drei Dateien trotz `/ios` in `mobile/.gitignore:40` |

### O-1 — Mitnahme-Limit gilt pro Anfrage, nicht pro Besuch (HOCH, reproduziert)

Ein eigener Befund der Koordination, der in keinem Teilbericht steht; der
Fachlogik-Bericht führt die Obergrenze unter „in Ordnung", weil sie pro
Anfrage tatsächlich greift.

**Beschreibung.** Der CHANGELOG verspricht „Maximal 7 Teile pro Besuch (Wert
einstellbar): Mehr Teile lassen sich beim Scannen/Eintragen nicht
gutschreiben." Der Code deckelt nur `items_count` **je Anfrage**
(`scan.pb.js:71-75`, `points.js:305-306`). Ist der Besuch des Tages schon
angelegt, bucht der Zweig „bereits eingecheckt" die Zählerpunkte bei jedem
weiteren Tür-Scan erneut (`scan.pb.js:89-104`), ohne die heute schon
gutgeschriebenen Teile zu summieren. Gescannte Einzelteile zählen gar nicht
gegen das Limit (`scan.pb.js:150-153`). Ohne Koordinaten findet keine
Geofence-Prüfung statt (`points.js:686`), der Tür-Code reicht also aus, auch
von zu Hause.

**Nachweis.** Probe im Harness: Tür-Code dreimal mit `items_count: 7` und ohne
GPS gesendet → `points_total` 115 statt der zugesagten höchstens 45 (10 + 7 × 5).
In der echten Laufzeit greift zusätzlich B-1: Die Punkte werden gebucht, dann
antwortet die Route mit 400, und die App zeigt nichts an, sodass eine
Wiederholung naheliegt.

**Auswirkung.** Wer den Tür-Code einmal gesehen hat, kann sich pro Anfrage
35 Punkte gutschreiben, beliebig oft am Tag. Ränge und Abzeichen werden
entwertet.

**Empfehlung.** Vor der Gutschrift die Summe der heute bereits gebuchten
Teile (`visits.items_count` des Tages plus Teile-Scans) gegen
`max_items_take` prüfen und nur den Rest gutschreiben; Teile-Scans
mitzählen. Test: drei Tür-Scans mit je 7 Teilen ergeben höchstens 45 Punkte.

---

## Die kritischen und hohen Befunde nach Bereich

Kurzfassung mit Verweis; Details, Fundstellen und Nachweise stehen in den
Teilberichten.

### Backend-Fachlogik

- **B-1 KRITISCH** — Datei-globale Helfer im Handler undefiniert: Scan-Route
  und Push-Registrierung brechen ab, Cron-Zähler `MAX_SEND_ATTEMPTS` im
  Fehlerpfad ebenso. Fix: die drei Helfer in die Handler ziehen oder per
  `require` aus `lib/` laden.
- **B-2 KRITISCH** — `new Date` auf PocketBase-Datumsstrings an sechs
  Stellen. Fix: ein Parser in `lib/points.js`, der das Leerzeichen ersetzt,
  und alle sechs Stellen darauf umstellen.
- **B-3 HOCH** — `tiers_json` kommt als Byte-Array; die Begrenzung der
  Abzeichen-Stufen auf gepflegte Ränge wirkt nie, der Rang-Seed läuft leer.
- **B-4 HOCH** — Migration `1782637408_updated_store.js` ist an eine
  Collection-ID der Produktion gebunden; eine frische Instanz startet nicht.
  Das blockiert jede Staging-Umgebung und jeden CI-Praxistest.

### Backend-Sicherheit & Datenschutz

- **S-1 KRITISCH** — Registrierung übernimmt `role`, `points_total`,
  `streak_weeks`.
- **S-2 KRITISCH** — Abholadresse nach Freigabe für alle lesbar.
- **S-3 HOCH** — PocketBase 0.22.21 liegt 34 Patch-Stände hinter 0.22.55;
  darunter der Backport für CVE-2024-45338 und eine Filter-Drossel.
  Dependabot überwacht kein Docker.
- **S-4 HOCH** — Regeln der `users`-Sammlung in keiner Migration versioniert;
  der Stand ist nur aus einer Messung vom 14.09. bekannt.
- **S-5 HOCH** — Keine Datenschutzerklärung; README-Angaben zu Koordinaten
  und Adresse falsch.

### App-Grundgerüst

- **A-1 KRITISCH** — siehe S-1.
- **A-2 HOCH** — Kein `authRefresh` beim Start, kein 401-Handler: Nach
  Passwort-Reset auf einem anderen Gerät, Kontolöschung oder Token-Ablauf
  bleibt die App auf einer leeren Startseite statt zum Login zu führen.

### App: fachliche Screens

- **F-1 HOCH** — Einzel-Abzeichen erscheinen nie als „Geschafft"; die App
  liest `current_tier` nicht.
- **F-2 HOCH** — Kamera verweigert: auf iOS kein Rückweg aus dem Scanner,
  kein Weg in die Einstellungen.
- **F-3 HOCH** — Punktwert 0 im Admin: App zeigt 0, Server zahlt Rückfallwert.
- **F-4 HOCH** — Freigabe aus Inventar und Detailansicht ohne Aktionsabfrage;
  Bonus-Bringpunkte entfallen.

### App: UI, Barrierefreiheit, Plattform

- **U-1 KRITISCH** — Sheet-Auffänger machen Datumswähler und Abzeichen-Sheet
  auf iOS zu einem einzigen VoiceOver-Element. Fix: `accessible={false}`.
- **U-2 HOCH** — Eingabefelder hinter der iOS-Tastatur in allen Formularen
  außer Login und Registrierung.
- **U-3 / U-6 HOCH** — Kein Screen unterscheidet „lädt", „Fehler" und „leer";
  die Startseite zeigt kurz „0 Punkte, Leg los".
- **U-4 HOCH** — Feste Knopf- und Ringhöhen schneiden bei
  Systemschriftvergrößerung ab.
- **U-5 HOCH** — Teal, Warn- und Fehlerfarbe als Kleintext auf hellem Grund
  mit 1,90 bis 3,96:1. Gestaltungsentscheidung, dem Betreiber vorzulegen.

### CI, Deployment, Store-Reife

- **C-1 HOCH** — Play-Versionshinweise aus rohen Commit-Betreffs; die acht
  neuesten Punkte sind Design-Commits, Konto löschen und Passwort vergessen
  fehlen.
- **C-2 HOCH** — Keine Web-Adresse zur Kontolöschung (Play-Pflicht).
- **C-3 HOCH** — Keine Datenschutzerklärung, kein Impressum unter einer URL.
- **C-4 HOCH** — Deploy-Verify prüft zwei von zwanzig Migrationen und keinen
  Commit-Bezug; der Stack zieht `:latest`. Ein Container vom 14.09. besteht
  die Prüfung heute grün.

### Dokumentation

- **D-1 HOCH** — CHANGELOG verspricht iOS-Symbol in Dunkel- und
  Tinted-Erscheinung; `app.json` liefert es seit `729bfa0` nicht mehr.
- **D-4 HOCH** — `TECH.md` auf Stand 3. August: acht Zahlen falsch, vier
  Funktionen fehlen.

### Toolchain

- **W-1 HOCH** — Override `decode-uri-component@^0.5.0` ist reines ESM;
  `query-string` (Expo Router) lädt es per `require`. Heute nur im
  Rückfallpfad erreichbar, also schlafend.
- **W-2 HOCH** — `mobile/ios/` teilweise getrackt trotz Ignore-Regel;
  `expo run:ios` und EAS überspringen deshalb den Prebuild.

---

## Tests & Harness

Die Suite ist stabil: drei Läufe 470/470 in rund 3 s, grün unter drei
verschiedenen Zeitzonen, keine `skip`/`only`/`todo`, kein Test ohne
`expect`, Deploy und Store-Release durch `needs:` hinter die Tests gesperrt,
alle 61 in den Hooks verwendeten Feldnamen existieren im Schema.

**Wie viel Vertrauen verdient ein grüner Lauf?** Hoch für Filterlogik,
Punktesummen, Geofence, Token-Prüfung, Regelwortlaut der Migrationen und
Push-Zuordnung. **Niedrig für alles, was Datums- oder JSON-Felder aus
Datensätzen liest** — Serie, Reset, Serien- und Treue-Abzeichen, Ränge. Dort
beweist die Suite heute Node-Verhalten, und die Produktion weicht nachweislich
ab:

- **T-1 KRITISCH** — Der Harness liefert Datumsfelder in der `T`-Form, die
  Goja parst; PocketBase liefert die Leerzeichen-Form, die Goja nicht parst.
  Über 60 Serien-Tests sind damit grün für eine Laufzeit, die es in der
  Produktion nicht gibt. (deckungsgleich mit B-2, unabhängig gemessen)
- **T-2 KRITISCH** — `tiers_json` kommt in PocketBase als Byte-Array; der
  Harness liefert ein Array oder eine Zeichenkette. Der in der Abnahme vom
  14.09. als BEHOBEN geführte Befund 7 (`tiers_json` als Zeichenkette) ist in
  der Produktion offen; `badges.test.js:118` ist grün mit einer Fixture, die
  es so nicht gibt. (deckungsgleich mit B-3)
- **T-3 HOCH** — Die Migrationskette läuft auf einer frischen Instanz nicht
  durch (feste Sammlungs-ID, danach doppelte Spalte). Kein Test und kein
  CI-Schritt bemerkt es; Staging und Wiederherstellung aus dem Repo sind
  damit unmöglich. (deckungsgleich mit B-4)
- **T-4 HOCH** — Die Tests zu E-Mail-Bestätigung, Passwort-Reset, Konto
  löschen und App-Symbol lesen Quelltext und prüfen auf Zeichenketten.
  Mutationsprobe: Ein auskommentierter Aufruf bleibt in allen drei Tests
  grün. Sie zählen als Tests, sichern aber kein Verhalten.
- **T-11 NIEDRIG** — `--sequence.shuffle` macht zwei bis vier Tests in
  `release-notes.test.js` rot: geteiltes Wegwerf-Repo mit kumulativen Commits.

Dazu aus den anderen Berichten: Der Harness kann B-1 (Handler-Scope)
grundsätzlich nicht finden (Fachlogik B-17), und ein bestehender Test sichert
das Übernehmen einer mitgeschickten Rolle als gewolltes Verhalten ab
(`tests/defaults.test.js:39-42`, Sicherheit S-1). Der Test ist nach dem Fix
umzudrehen.

**Empfehlung des Test-Berichts, hier übernommen:** Der Harness bekommt
`DATE_FIELDS` und `JSON_FIELDS` und liefert diese Felder in der
PocketBase-Form; damit werden die bestehenden Serien- und Rang-Tests zu Recht
rot und zeigen B-2 und B-3. Dazu ein Rauchtest gegen die gepinnte Binärdatei
in der CI (rund 2 s), und ein Mutationstest je Quelltext-Test oder deren
Umstellung auf Verhalten.

---

## Stand der Altbefunde vom 14.09.2026

Nachgeprüft im Doku-Bericht, Teil 2. Von 75 Befund-Zeilen, die damals offen,
ungetestet oder bewusst offen standen:

| Zustand heute | Anzahl |
|---|---:|
| weitergekommen (behoben oder getestet) | 21, davon 9 mit Test |
| unverändert „behoben, ungetestet" | 35 |
| noch offen | 13 (0 KRITISCH, 2 HOCH: Kontraste B-6/B-7) |
| bewusst offen | 4 |
| hinfällig | 1 |
| nicht prüfbar | 1 |

Regressionen bei den als BEHOBEN geführten KRITISCH- und HOCH-Befunden gibt
es keine. Eine Doku-Regression: Die doppelten CHANGELOG-Rubriken (M-4) sind im
neuen Unreleased-Block wieder da. Die 35 ungetesteten Behebungen sind fast
vollständig App-Code; für `mobile/` gibt es weiterhin keine Tests.

---

## Was in Ordnung ist

Damit der Bericht nicht nur aus Befunden besteht — das hier hat gehalten und
ist je Bericht mit Fundstellen belegt:

- **Backend:** Punktestand wird aus dem Verlauf neu gerechnet; ISO-Woche,
  53. Woche und Zeitumstellung stimmen; Bring-Punkte einmalig pro Teil;
  Aktionsfaktor samt Teilnahmezähler; 404/409-Pfade; Schreibschutz für
  Punkte und Serie; alle verwendeten APIs passen zu PocketBase 0.22.
- **Sicherheit:** Türgeheimnis in gesperrter Sammlung; Besuche nicht
  fälschbar; Aktivitätsprofile und offene Einreichungen nur für die eigene
  Person; Push-Token vor dem Filter geprüft; Koordinaten werden nicht mehr
  gespeichert; Kontolöschung mit Passwortprüfung; Token nur im URL-Fragment.
- **App:** Sitzung im SecureStore, Abmelden räumt auf; Backend-Fehlertexte
  kommen deutsch durch; Cache-Invalidierung nach Scan vollständig; Rang- und
  Stufenrechnung identisch mit dem Backend; Scanner-Entprellung; Worklets rein;
  `tsc` ohne Fehler.
- **Auslieferung:** alle sieben Actions auf SHA gepinnt; Rechte minimal; keine
  Geheimnisse in Protokollen; Test-Gate vor dem Backend-Deploy; Android-
  Fotoberechtigung Play-konform; targetSdk 36; kein Sign-in-with-Apple nötig.
- **Abhängigkeiten:** `npm audit` 0; exakte Pins begründet; SDK 0.22.1 passt
  zum Server 0.22.21; keine Copyleft-Lizenz zur Laufzeit.

---

## Empfohlene Reihenfolge

Nach Schaden mal Wahrscheinlichkeit, nicht nach Aufwand.

### Vor dem Release, im Backend (ein Deploy, danach gegen die Instanz messen)

1. **B-1** Helfer in die Handler — drei Dateien, kein Verhalten ändert sich.
2. **B-2** Datumsparser — eine Funktion, sechs Aufrufstellen. Danach
   `streak_weeks` in der Produktion prüfen: Der Wert steht heute bei allen
   auf höchstens 1.
3. **S-1 / A-1** `createRule` auf `users` und Hook, der `visitor` erzwingt;
   Test umdrehen. Danach messen: Registrierung mit `role: "admin"` muss
   `visitor` ergeben.
4. **S-2** Adresse aus der offenen Leseregel nehmen — eigenes Feld nur für
   Team, oder `location` in der Regel ausschließen. Danach messen.
5. **O-1** Tageslimit statt Anfragelimit.
6. **B-3** `tiers_json` als Byte-Array auspacken.
7. **B-4** Migration von der Produktions-ID lösen — Voraussetzung für 9.
8. **S-3** PocketBase auf 0.22.55; Dependabot für Docker.
9. **Praxistest in die CI:** Binärdatei aus dem Dockerfile, leere Datenbank,
   Migrationen durchlaufen, Scan gegen den Tür-Code, Ergebnis 200. Der
   Fachlogik-Bericht beschreibt den Ablauf; er läuft unter einer Minute.
   Ohne diesen Schritt bleibt jeder grüne Lauf der Suite eine Aussage über
   den Harness.

### Vor dem Release, in der App (ein Build)

10. **A-2** `authRefresh` beim Start, 401 → Auth-Store leeren.
11. **F-1** `current_tier` lesen. **F-2** Schließen-Knopf und Weg in die
    Einstellungen. **F-4** Aktionsabfrage in allen drei Freigabe-Wegen.
12. **U-1** `accessible={false}` an den beiden Auffängern; am Gerät mit
    VoiceOver bestätigen. **U-2** Tastatur-Ausweichfläche in `Screen.tsx`.
    **U-3** Lade- und Fehlerzustand anzeigen.
13. **W-1, W-2, W-3, W-4** in einem Vorbereitungs-Commit; danach
    `expo-doctor` grün.
14. **A-3 / F-8** `bonus_points` anzeigen. **A-12 / C-6** deutscher Fototext.
15. **Splash** konfigurieren; **D-1 / C-8** Icon-Versprechen einlösen oder
    streichen.

### Vor dem Store-Eintrag (außerhalb des Codes)

16. **C-2, C-3, S-5** Datenschutzerklärung, Impressum, Kontolöschungs-Seite
    unter der Domain; Links in App und Landingpage.
17. **C-1** Release-Notes von Hand pflegen oder das Skript auf einen
    CHANGELOG-Auszug umstellen.
18. **C-9** Demo-Konto und Erklärung für den Reviewer, warum er nicht
    einchecken kann.
19. **C-4** Deploy-Verify auf alle Migrationen und den Commit-Bezug erweitern.

### Danach

Die mittleren und niedrigen Befunde aller Berichte, die Dokumentation (`TECH.md`,
`README.md`, `CLAUDE.md`-Abschnitt zur Auslieferung, CHANGELOG-Rubriken) und
ein minimales Test-Setup für reine Funktionen in `mobile/lib/`.

---

## Auf der Produktion nachzumessen

Der Sicherheitsbericht enthält am Ende eine Liste von 13 Messungen ohne
Zugangsdaten. Dazu aus dieser Abnahme:

- Nach B-1: `POST /api/pp/scan` mit Tür-Code antwortet 200 mit `points`.
- Nach B-2: `streak_weeks` in `users` zeigt Werte über 1 bei Stammgästen;
  `points_log` enthält keine doppelten Zeilen „Teile mitgenommen" zum selben
  Besuch (Folge von B-1 und O-1 seit dem 14.09.).
- Nach S-1: Registrierung mit `role: "admin"` legt ein `visitor`-Konto an.
- Nach S-2: Ein Besucherkonto liest bei fremden freigegebenen Teilen kein
  `location`.
- Nach O-1: Dreimal Tür-Code mit `items_count: 7` ergibt insgesamt höchstens
  `pts_checkin + max_items_take × pts_take`.
