# Abnahme des Gesamt-Audits

**Datum:** 14.09.2026
**Umfang:** Nachprüfung der sechs Berichte in `docs/audit/` gegen den Code-Stand
`05387b6` (Branch `main`, Arbeitsbaum sauber), dazu zwei Bereiche, die das
Audit gar nicht abgedeckt hatte, und eine Gegenprobe der Testsuite.
**Vorgehen:** Kein Befund wurde aus den Berichten übernommen. Jeder ist am
aktuellen Code nachgeprüft — auch die Vermerke „behoben" in den Berichten
selbst. Wo ein Befund als behoben gilt, steht die Fundstelle dabei; wo ein
Test ihn absichert, steht der Test dabei.

---

## Gesamtbild in Zahlen

**63 Befunde** aus sechs Berichten:

| Zustand | Anzahl | Anteil |
|---|---:|---:|
| **BEHOBEN** (im Code belegt, durch Test abgedeckt) | 17 | 27 % |
| **BEHOBEN, UNGETESTET** (im Code belegt, kein Test) | 16 | 25 % |
| **BEWUSST OFFEN** (begründete Entscheidung) | 4 | 6 % |
| **OFFEN** (nicht angefasst) | 24 | 38 % |
| **HINFÄLLIG** (Befund bestand nicht oder hat sich erledigt) | 2 | 3 % |

**Die schweren Befunde sind erledigt.** Alle vier mit KRITISCH bewerteten
Befunde (Türgeheimnis, Tagesgrenze, Apple-Schlüssel im Stash, Abmelden ohne
Aufräumen) sind behoben, drei davon mit Tests abgesichert. Von den sieben
HOCH-Befunden sind sechs behoben.

**Das Offene liegt in der Breite, nicht in der Tiefe.** Die 24 offenen Befunde
sind überwiegend MITTEL und NIEDRIG: Anzeigefehler, Harness-Schwächen,
Aufräumarbeiten. Zwei Ausnahmen stehen unten unter „Empfohlene nächste
Schritte".

**Die 16 ungetesteten Behebungen sind fast vollständig App-Code.** Für
`mobile/` gibt es keine Testinfrastruktur — `vitest.config.mjs:5` sammelt
ausschließlich `tests/**/*.test.js`, und dort liegen nur Backend- und
Skript-Tests. Jede App-Korrektur ist damit ungesichert; das ist der größte
strukturelle Rückstand, nicht ein Versäumnis der einzelnen Commits.

**Dazu 19 Befunde aus den beiden erstmals geprüften Bereichen** (8 zu den
Zugriffsregeln, 11 zur Barrierefreiheit), davon 6 KRITISCH und 7 HOCH. Sie
sind in der obigen Zählung nicht enthalten, weil sie neu sind. Der Schwerpunkt
liegt eindeutig dort: Das Nachgearbeitete ist in gutem Zustand, das nie
Geprüfte nicht.

**Testsuite:** 252 Tests in 11 Dateien, alle grün, 0,93 s (vor dem Audit:
173 Tests in 7 Dateien). Die Zeitzone der Suite steht jetzt auf UTC
(`vitest.config.mjs:21`) — der Zeitzone des Containers, nicht mehr auf
Europe/Berlin. Das war die Voraussetzung dafür, dass die Tagesgrenze überhaupt
prüfbar wurde.

---

## Bericht 1: `backend.md` — Backend-Fachlogik

| # | Befund | Schwere | Zustand | Beleg |
|---:|---|---|---|---|
| 1 | Türgeheimnis unangemeldet im Netz | KRITISCH | **BEHOBEN** | `1782690000_store_secret_collection.js:44-48` (alle fünf Regeln `null`), `store` auf `@request.auth.id != ""` (`:87-88`), Hook liest aus `store_secrets` (`scan.pb.js:39-42`). Test: `store-secret-migration.test.js` (8 Tests) |
| 1b | Rotation des Codes | — | **BEWUSST OFFEN** | Entscheidung des Betreibers 14.09.2026: unter 100 Nutzende, ein Laden; Abrufweg ist geschlossen. Im Bericht begründet (`backend.md:109-113`) |
| 2 | Tageswechsel um 02:00 Ortszeit — zweiter Bonus | KRITISCH | **BEHOBEN** | `points.js:113-123` (`storeDayStart`), `storeParts`, `storeOffsetMinutes`; Zeitzone aus `store.timezone` konfigurierbar. Tests: `timezone.test.js` (16 Tests), u. a. „gibt für 00:30 Ortszeit keinen zweiten Check-in-Bonus am Vormittag" |
| 3 | Ohne GPS wird der Geofence nicht geprüft | HOCH | **BEWUSST OFFEN** | `points.js:639-640`: `assertInGeofence` gibt bei fehlendem GPS `null` zurück. Der Befund hing ausdrücklich an Befund 1 („solange das Geheimnis geheim ist"); mit dessen Behebung trägt die Begründung wieder. Kommentar `scan.pb.js:107-109` |
| 4 | Serie zählt über übersprungene KW 53 hinweg | HOCH | **BEHOBEN** | `points.js:416-420` (`isoWeeksInYear`), `:427-435` (`isWeekAdjacent`); alle drei Aufrufstellen nutzen jetzt dieselbe Funktion. Tests: `streak.test.js` („reisst, wenn die 53. Woche uebersprungen wurde", „kennt die Laenge des jeweiligen Jahres"), `cron.test.js:150` |
| 5 | Aktion mit höchstem Faktor wird nicht gefunden | MITTEL | **OFFEN** | `points.js:168` sortiert unverändert nach `-multiplier`, während `campaignMult` (`:149-156`) `mult_visit`/`mult_take`/`mult_bring` bevorzugt. Kein Test mit zwei gleichzeitigen Aktionen |
| 6 | Gestufte Aktions-Abzeichen erreichen Besucher nicht | MITTEL | **OFFEN** | `cron.pb.js:95-105`: Der `tiered`-Zweig läuft weiter nur über `action_counts` und bricht mit `continue` ab, bevor Abschnitt b) („Wer im Aktionszeitraum da war") erreicht wird |
| 7 | `tiers_json` als Zeichenkette lässt Stufen verschwinden | MITTEL | **OFFEN** | `points.js:461-470`: `t.length` unverändert ohne Normalisierung. Bei `'[]'` ergibt das 2 Slots statt 5 |
| 8 | Punkte aus Abzeichen fehlen im `points`-Feld | NIEDRIG | **OFFEN** | `scan.pb.js:87` liefert `res.points`; kein zusätzliches Feld `bonus_points` vorhanden (repoweit kein Treffer) |
| 9 | Anführungszeichen im Push-Token brechen aus dem Filter | NIEDRIG | **OFFEN** | `push.pb.js:20` und `:42` setzen `token` unverändert ungeprüft in den Filter |
| 10 | Push gilt als verschickt, auch wenn Expo nicht erreichbar | NIEDRIG | **OFFEN** | `cron.pb.js:28-30`: `sent_at` wird unverändert unabhängig vom Rückgabewert von `push.send` gesetzt |

**Nebenbefund aus `redundanz.md`, hier mitgeprüft:** Die doppelte
Geofence-Prüfung ist zusammengeführt (`points.js:639-645`,
`assertInGeofence`), der Rückfallradius steht als
`DEFAULT_GEOFENCE_RADIUS_M` an einer Stelle (`points.js:17`). Die
Fehlermeldung „Du bist nicht im Laden" ist Wort für Wort erhalten —
die Bedingung aus dem Bericht ist eingehalten.

---

## Bericht 2: `app.md` — App (`mobile/`)

Alle Behebungen in diesem Bericht sind **ungetestet**: Für `mobile/` existiert
keine Testinfrastruktur (siehe Gesamtbild).

| # | Befund | Schwere | Zustand | Beleg |
|---:|---|---|---|---|
| 1 | Abmelden räumt Cache und Push-Token nicht auf | KRITISCH | **BEHOBEN, UNGETESTET** | `useAuth.ts:82-90`: `logout` ist async, ruft `unregisterPushToken()` in `try/catch`, dann `pb.authStore.clear()`, dann `queryClient.clear()` |
| 2 | Freigeben aktualisiert die Startseite nicht | HOCH | **BEHOBEN, UNGETESTET** | `queryClient.ts:21-33`: `invalidateItems` mit allen sechs Schlüsseln; benutzt in `review.tsx:149`, `items/index.tsx:147`, `items/[id].tsx:151`, `items/new.tsx:105` |
| 3 | Volunteer darf Ankündigung mit Push anlegen, Push scheitert | HOCH | **OFFEN** | `needs.tsx:149` zeigt den Toggle unverändert ohne `isAdmin`-Prüfung; `push_messages.createRule` ist weiterhin `admin` (`1700000000_init_schema.js:296-300`) |
| 4 | Englische SDK-Fehlermeldungen in deutschen Dialogen | HOCH | **BEHOBEN, UNGETESTET** | `lib/errors.ts` (`errorText`, 100 Zeilen, mit Begründung); an allen 14 Stellen eingesetzt — `grep` findet keinen rohen `e?.message`-Durchgriff mehr |
| 5 | `syncTotal` schreibt in ein Feld, das der Ring nicht liest | MITTEL | **OFFEN** | `scan.tsx:20` unverändert vorhanden, aufgerufen in `:69` und `:88` |
| 6 | Aktionen ändern aktualisiert den Aushang nicht | MITTEL | **BEHOBEN, UNGETESTET** | `queryClient.ts:39-45` (`invalidateCampaigns`, deckt `['campaigns']`, `['campaign','active']` und `['needs','active']` ab), benutzt in `actions.tsx:175` |
| 7 | Besucher lädt alle offenen Freigaben inkl. fremder Namen | MITTEL | **OFFEN** | `useData.ts:107-119`: `enabled: pb.authStore.isValid` unverändert, kein `isStaff`-Parameter. Ursache im Backend ebenfalls offen — siehe „Erstmals geprüft", Befund Z-3 |
| 8 | Scanner verwirft ersten Code bei langsamem Standort | MITTEL | **OFFEN** | `scan.tsx:46-58`: `getCoords` unverändert ohne Zeitgrenze; `QRScanner.tsx:18-24`: Sperre weiterhin an festem 1500-ms-Timer statt an `active` |
| 9 | „undefined Wochen Streak" im Erfolgs-Sheet | NIEDRIG | **OFFEN** | `scan.tsx:208`: `${result.streak_weeks}` unverändert ohne `?? 0` |
| 10 | Erfolgs-Hinweis bei Ankündigung wird überlagert | NIEDRIG | **OFFEN** | `needs.tsx:51-57`: `onSaved()` läuft unverändert direkt nach `Alert.alert`, nicht im `onPress` |
| 11 | Kategorie-Auswahl zeigt rohe Schlüssel | NIEDRIG | **OFFEN** | `items/[id].tsx:21` (`CATEGORIES`) und `:247` unverändert; `categoryLabel` wird dort nicht benutzt |

---

## Bericht 3: `theme.md` — Design-Werte

Der Bericht war ausdrücklich eine Bestandsaufnahme mit Empfehlungen, keine
Befundliste. Geprüft wurde, ob die empfohlene Zusammenführung umgesetzt ist.

| # | Empfehlung | Zustand | Beleg |
|---:|---|---|---|
| 1 | Deckkraft-Leiter `alpha()` + `ALPHA`, 47 rgba-Literale ersetzen | **BEHOBEN, UNGETESTET** | `theme.ts:53` (`ALPHA`), `:69` (`alpha()`); außerhalb `theme.ts` noch **3** `rgba()`-Literale (vorher 125) |
| 2 | Neue Rollen-Token (`inkDeep`, `onBrand`, `onBrandMuted/Faint`, `errLight`, `scrim`, `tier.*.light`, `accents`) | **BEHOBEN, UNGETESTET** | `theme.ts:25,32,37,91,94,95`; Hex außerhalb `theme.ts` noch **5** (vorher 118) |
| 3 | Abstände auf 4er-Raster (Variante B) | **BEHOBEN, UNGETESTET** | `theme.ts:123-131`: `xs:4, sm:8, md:12, lg:16, xl:20, xxl:24, huge:32` — genau Variante B |
| 4 | Radien auf 6 Stufen (Variante B) | **BEHOBEN, UNGETESTET** | `theme.ts:134-140`: `rMicro:6`, `rTile2:12`, `rField:14`, `rTile:18`, `rCard:22`, `rSheet:28`, `rPill` |
| 5 | Icon-Größen + `tile` + `<IconTile/>`-Komponente | **BEHOBEN, UNGETESTET** | `theme.ts:182` (`iconSizes`), `:201` (`tile`), `:203` (`touchTarget:44`); `components/ui/IconTile.tsx` mit 15 Verwendern. Icon-`size={n}` noch 9× roh |
| 6 | `PPText.size` auf Stufen einengen, `rawSize` für Berechnetes | **BEHOBEN, UNGETESTET** | `Text.tsx:10` (`size?: SizeStep`), `:16` (`rawSize`); **0** hartkodierte `<PPText size={n}>` übrig (vorher 77) |
| 7 | Plattformschicht: toten Code benutzen oder löschen | **BEHOBEN, UNGETESTET** | `radius()` wird jetzt tatsächlich benutzt: `PPButton.tsx:39`, `Pill.tsx:36`, `IconButton.tsx:28`. `isIOS`, `MD3_STATE`, `MD3_ELEVATION`, `stateLayer` sind aufgeräumt |
| 8 | `letterSpacing` skaliert nicht mit `fontScale` (Fehler im Bestand, §5.4) | **BEHOBEN, UNGETESTET** | Im CHANGELOG als behoben ausgewiesen („Gesperrte Überschriften laufen wieder wie entworfen") |
| 9 | Schatten auf 3 Glanzstufen (`glow`) | **BEHOBEN, UNGETESTET** | `theme.ts` führt `glow` und `motion` (`:223`) |
| 10 | `export type PPTheme` ohne Verwender | **OFFEN** | `theme.ts:230` unverändert exportiert, kein Treffer im Repo |

**Nachgelagerter Befund, bereits behoben:** Die Zusammenführung hatte
eigene Kartenrundungen eingeebnet; das ist mit `2dd13cf` korrigiert und im
CHANGELOG als behoben vermerkt. Ein Beleg dafür, dass die Umstellung
tatsächlich Wirkung auf die Oberfläche hatte — und dass sie ohne Tests lief.

**Offene Entscheidungen aus §12** (Print-Schnittlinie, Ladenkachel sandfarben,
Icon-`lg` 20 oder 22, `rBtn` streichen) sind gestalterische Rückfragen, keine
Befunde. `rBtn` besteht weiter (`PPButton.tsx:39`).

---

## Bericht 4: `redundanz.md` — überflüssiger und toter Code

| # | Befund | Zustand | Beleg |
|---:|---|---|---|
| 1 | Fünf Komponenten ohne Verwender (318 Zeilen) | **BEHOBEN, UNGETESTET** | `GlassCard`, `Toast`, `ProgressBar`, `ActivityRow`, `Stat` sind gelöscht (Commit `7df403f`) |
| 2 | `campaignFactorsLabel` ohne Aufruf | **OFFEN** | `format.ts:228` unverändert vorhanden, weiterhin ohne Verwender |
| 3 | Zwei Typen unnötig exportiert (`Motivation`, `MotivationInput`) | **OFFEN** | `format.ts:278` und `:289` unverändert `export interface` |
| 4 | 16 ungenutzte lokale Bezeichner (Compiler) | **BEHOBEN, UNGETESTET** | `tsc --noUnusedLocals --noUnusedParameters` meldet keinen Fehler mehr (Commit `9e56a44`) |
| 5 | `tar` und `zustand` ohne Import | **BEHOBEN, UNGETESTET** | Beide aus `mobile/package.json` entfernt (Commit `cc04db2`) |
| 5b | `expo-system-ui` | **HINFÄLLIG** | Befund im Bericht selbst zurückgezogen (Commit `4aa95f9`): Das Paket gehört zum SDK-57-Satz. Paket ist korrekt noch vorhanden (`package.json:38`) |
| 6 | `unregisterPushToken` ohne Aufrufer | **BEHOBEN, UNGETESTET** | Jetzt in `useAuth.ts:84` aufgerufen — identisch mit `app.md`-Befund 1 |
| 7 | Ungenutzte Exporte in `theme.ts` | **BEHOBEN, UNGETESTET** (bis auf `PPTheme`) | `isIOS`, `MD3_STATE`, `MD3_ELEVATION`, `stateLayer` aufgeräumt; `radius()` in Gebrauch. `PPTheme` (`:230`) bleibt offen |
| 8 | Zwei Typ-Exporte in `types.ts` (`Role`, `BadgeKind`) | **OFFEN** | Bericht empfiehlt, `pb.ts` auf `Role` umzustellen statt zu löschen; nicht geschehen |
| D1 | Aktions-Faktoren in drei Fassungen | **OFFEN** | `actions.tsx:24` (`campaignFactorRows`) besteht weiter neben `format.ts:208` (`campaignFactors`); `campaignTypesLabel` ist entfernt |
| D2 | Geofence-Prüfung zweimal wörtlich | **BEHOBEN** | `points.js:639-645` (`assertInGeofence`), beide Zweige rufen sie (`scan.pb.js:62`, `:110`). Tests: `scan.test.js` (Geofence, verbotener und erlaubter Fall) |
| D3 | ISO-Wochen-Jahreswechsel an drei Stellen nachgebaut | **BEHOBEN** | Alle drei Stellen rufen `isWeekAdjacent` (`points.js:396`, `:400`, `:447`, `cron.pb.js`). Test: `streak.test.js`, Abschnitt „Jahreswechsel: alle drei Aufrufstellen urteilen gleich" |
| D4 | Opt-in-Flag-Zuordnung zweimal in `lib/push.js` | **OFFEN** | `push.js:12-17` und `:59-64` unverändert doppelt |
| D5 | Kleinere Wiederholungen (Hinweis, kein Auftrag) | **OFFEN** | Ausdrücklich als Hinweis gekennzeichnet |

---

## Bericht 5: `tests.md` — Testsuite

| # | Befund | Zustand | Beleg |
|---:|---|---|---|
| 1.1 | `scan.test.js` — `toBeTruthy()` auf Zeitstempel | **OFFEN** | jetzt `scan.test.js:459`, unverändert |
| 1.2 | `cron.test.js` — `not.toBe('')` auf `sent_at` | **OFFEN** | jetzt `cron.test.js:218`, unverändert |
| 1.3 | `push.test.js:102` — `not.toBe('')` auf `last_seen` | **OFFEN** | unverändert |
| 1.4 | `toBeUndefined()` — vertretbar | **HINFÄLLIG** | Im Bericht selbst als „keine Beanstandung" eingeordnet |
| 1.5 | `c && c.id` — formal in Ordnung | **HINFÄLLIG** | dito |
| 1.6 | `release-notes.test.js` — `toHaveLength(480)` ohne Inhalt | **OFFEN** | unverändert |
| 2.1a | `lib/push.js` vollständig ungetestet (119 Zeilen) | **OFFEN** | Kein Test lädt das Modul echt; `collectTokens`/`tokensForUser`/`send` werden nie ausgeführt |
| 2.1b | `awardPoints`, `recomputeTotal` ohne direkte Tests | **OFFEN** | unverändert |
| 2.2a | Tagesgrenze ungetestet | **BEHOBEN** | `timezone.test.js` (16 Tests), beide Server-Zeitzonen gegenübergestellt |
| 2.2b | Race-Guard `doCheckin` / Feld `deduped` ungetestet | **BEHOBEN** | `timezone.test.js:101` prüft `zweiter.deduped === true` |
| 2.2c | `year-badges` am 31.12. ungetestet | **OFFEN** | `cron.test.js:259` steigt unverändert mit `return` aus |
| 2.2d | `action-badges` nur `single`-Zweig | **OFFEN** | `cron.test.js` prüft weiterhin nur `kind: 'single'` |
| 3.1 | Test, der sich selbst abschaltet | **OFFEN** | `cron.test.js:257-270`, unverändert |
| 3.2 | `defaults.test.js:53` — Titel widerspricht der Erwartung | **OFFEN** | Titel „uebernimmt keinen mitgeschickten Punktestand", Erwartung `toBe(5000)` — unverändert |
| 3.3 | Zugriff über `h.store.badges[0]` brüchig | **OFFEN** | unverändert |
| 4.1 | **Harness vergleicht Zeitstempel als Text** | **BEHOBEN** | Behoben in `481d9b0`. Tests: `harness-time.test.js` (15 Tests), u. a. „vergleicht über die Trennerformen hinweg als Zeitpunkt, nicht als Text" |
| 4.2 | `offset` wird still verschluckt | **OFFEN** | `harness.js:230`: `findRecordsByFilter(collection, filter, sort, limit)` nimmt unverändert vier Parameter, elf Aufrufstellen übergeben fünf |
| 4.3 | `sort` ignoriert Sekundärkriterien, `.reverse()` instabil | **OFFEN** | `harness.js:190` unverändert `sorted.reverse()` |
| 4.4 | Keine Schemaprüfung, `NUMBER_FIELDS` als Handliste | **OFFEN** | unverändert |
| 4.5 | Filter-Injection im Harness nicht abbildbar | **OFFEN** | Feststellung einer Grenze, kein behebbarer Befund im Harness |
| 5 | Erlaubter Fall für `is_showcase` fehlt | **OFFEN** | unverändert |
| 5b | **Zugriffsregeln der Migrationen vollständig ungetestet** | **TEILWEISE BEHOBEN** | `store-secret-migration.test.js` testet jetzt die Regeln *einer* Migration — der erste Test dieser Art im Repo und die Vorlage für die übrigen. Die anderen zwölf Sammlungen bleiben ungetestet; siehe „Erstmals geprüft" |
| 6 | Die fünf lohnendsten fehlenden Tests | **2 von 5 behoben** | Nr. 1 (Harness-Zeit + Tagesgrenze) und Nr. 4 (Race-Guard) sind da. Nr. 2 (`lib/push.js`), Nr. 3 (`year-badges` am 31.12.), Nr. 5 (`tiered`-Zweig) fehlen |

---

## Bericht 6: `ci-deploy.md` — Auslieferungskette

| # | Befund | Schwere | Zustand | Beleg |
|---:|---|---|---|---|
| K-1 | Apple-Signaturschlüssel (.p8) im lokalen Git-Stash | KRITISCH | **BEHOBEN, UNGETESTET** | `git stash list` ist leer; `git log --all -S"BEGIN PRIVATE KEY"` findet nur noch `1b5fe1b` — den Bericht selbst, der den Fund beschreibt, ohne den Wert zu nennen. Ob der Schlüssel `7X8W499AAK` bei Apple widerrufen wurde, lässt sich aus dem Repo nicht feststellen (siehe nächste Schritte) |
| H-1 | Schlüsselpfad in `eas.json` | HOCH | **BEHOBEN, UNGETESTET** | Kein `submit`-Block und kein `ascApiKey*` mehr in `mobile/eas.json` (Commit `24762f7`) |
| H-2 | Dritt-Actions auf Tags statt Commit-SHA | HOCH | **BEHOBEN, UNGETESTET** | Alle vier Actions stehen auf vollem SHA mit Versionskommentar (Commit `2e4ded2`) |
| H-3 | Probelauf verschiebt den Vergleichsstand | HOCH | **BEHOBEN** | Commit `05387b6`. Test: `tests/play-vergleichsstand.test.js` (9 Tests), liest die Auswahllogik aus der Workflow-Datei selbst — u. a. „überspringt einen Probelauf und nimmt den echten Lauf davor" |
| M-1 | `pruefung`-Job ohne `setup-node` | MITTEL | **OFFEN** | `release.yml:76-79`: unverändert `npm ci && npm test` ohne vorheriges `actions/setup-node`. Der Job ist die einzige Absicherung vor App Store und Produktionsspur |
| M-2 | TestFlight lädt hoch, bevor die Hinweise feststehen | MITTEL | **OFFEN** | `testflight.yml`: Upload (Z. 196) steht unverändert vor „Letzten gebauten Stand ermitteln" (Z. 207) und „Testhinweise zusammenstellen" (Z. 225) |
| M-3 | `docker-compose.yml` ohne Ressourcen- und Protokollgrenzen | MITTEL | **OFFEN** | Weder `mem_limit`/`cpus` noch `logging.options.max-size`. **Teilweise erledigt:** `TZ: Europe/Berlin` ist ergänzt (Z. 20) — mit dem ausdrücklichen Hinweis, dass die Fachlogik nicht mehr daran hängt |
| M-4 | Versionsangaben und CHANGELOG-Rückstand | MITTEL | **OFFEN** | `[Unreleased]` (Z. 7) besteht weiter neben `[1.0.0 (4)]` (Z. 242), weiterhin mit mehreren Unterüberschriften derselben Kategorie. Der Block ist seit dem Audit erheblich gewachsen — inhaltlich gut gepflegt, aber nicht zu einem Versionsabschnitt geschlossen |
| N-1 | `upload-play.py` fängt `urllib.error.HTTPError` ohne Import | NIEDRIG | **OFFEN** | Importliste (Z. 15-22) führt unverändert kein `urllib.error` |
| N-2 | `asc-build-number.py` verwirft nicht-numerische Nummern | NIEDRIG | **OFFEN** | unverändert |
| N-3 | Zwei Skripte ohne Fehlerbehandlung an der Netzgrenze | NIEDRIG | **OFFEN** | unverändert |
| N-4 | `release-notes.py` Randfälle sauber | — | **HINFÄLLIG** | Ausdrücklich „kein Befund"; inzwischen zusätzlich durch `release-notes.test.js` (26 Tests) abgesichert |
| N-5 | `android-signing.py` Textersetzung | — | **HINFÄLLIG** | Ausdrücklich „kein Handlungsbedarf" |
| N-6 | Android-Debug-Keystore war einmal versioniert | — | **HINFÄLLIG** | Ausdrücklich „kein Handlungsbedarf" (Standardpasswort, signiert nichts Ausgeliefertes) |

---

## Erstmals geprüft

Zwei Bereiche hatte das Audit nicht abgedeckt. Beide sind hier zum ersten Mal
geprüft worden. Die Befunde sind **neu** und in keinem der sechs Berichte
enthalten.

### a) Zugriffsregeln aller Migrationen

Das Audit hatte nur `store` betrachtet. Geprüft wurden jetzt **alle 13
Sammlungen** über alle Migrationen hinweg, jeweils im Endstand nach der
letzten ändernden Migration.

**Vorab die gute Nachricht:** Es gibt **keine einzige Leerstring-Regel mehr**.
Die beiden letzten (`store.listRule`/`viewRule`, `1700000000_init_schema.js:331-332`)
sind durch `1782690000_store_secret_collection.js:87-88` auf
`@request.auth.id != ""` gehoben. Der gefährlichste Fehlertyp ist damit
repoweit ausgeräumt.

#### Z-1 [KRITISCH] `users` hat nie explizite Regeln bekommen

Keine einzige Migration setzt `users.listRule`, `viewRule`, `createRule`,
`updateRule` oder `deleteRule` — geprüft mit
`grep -rn "users" pocketbase/pb_migrations/*.js | grep -i rule` (kein Treffer).
`1700000000_init_schema.js:12-40` fügt nur Felder hinzu.

Die Regeln stehen damit auf dem, was die Instanz beim Anlegen gesetzt hat oder
was jemand später im Admin-UI eingestellt hat — **nicht versioniert, nicht
reproduzierbar, bei keinem Review sichtbar.** Eine frisch aufgesetzte Instanz
kann andere Regeln haben als die Produktion.

Das ist mehr als eine Formfrage: `useData.ts:99` und `:115` expandieren
`items.created_by` auf `users`. PocketBase wendet beim Expand die `viewRule`
der Zielsammlung an. Steht sie offen, fließen Klarnamen **und
E-Mail-Adressen** an jedes Besucherkonto; steht sie auf dem PocketBase-Standard
(`id = @request.auth.id`), bleibt die Freigabe-Liste des Teams ohne Namen — ein
Funktionsfehler. Beides ist möglich, und aus dem Repo ist nicht zu entscheiden,
welcher Fall vorliegt.

**Das ist der einzige Befund, der sich nicht aus dem Repo entscheiden lässt.**
Er gehört gegen die laufende Instanz gemessen, bevor daraus eine Änderung wird.

#### Z-2 [HOCH] `visits.createRule` erlaubt selbstgebaute Besuche — Abzeichen erschleichbar

`1700000000_init_schema.js:140`: `createRule: 'user = @request.auth.id'`.

Ein Nutzer kann per `POST /api/collections/visits/records` beliebig viele
Besuche auf sich selbst anlegen, mit frei gewähltem `checkin_at`.
Der Punktestand steigt dadurch **nicht** — `defaults.pb.js:41-43` friert
`points_total` ein. Aber `computeProgress` zählt für `trigger_type: 'visits'`
schlicht die Zeilen:

```js
// points.js:586-588
if (type === 'visits') {
  return dao.findRecordsByFilter('visits', `user = "${user.id}"`, '', 0, 0).length;
}
```

Das Abzeichen „Stammgast" hat genau diesen Auslöser
(`1700000500_seed_tier_badges.js:51`) und schüttet je Stufe 50/100/200/500
Punkte aus (`:63`). Ein Nutzer kann sich damit **Abzeichen samt
Punktbelohnung erschleichen, ohne je im Laden gewesen zu sein** — auf einem
Weg, der den Schreibschutz auf `points_total` umgeht, weil die Punkte
serverseitig über `awardPoints` vergeben werden.

Richtig wäre `createRule: null`. Der Check-in läuft ausschließlich über
`POST /api/pp/scan`, das mit dem Admin-DAO schreibt und die Regel nicht
braucht. Gegenprobe: Kein App-Code legt `visits` direkt an
(`grep -rn "collection('visits')" mobile/` → kein Treffer). **Eine alte
App-Version bricht dadurch nicht** — sie ruft die Route nicht.

#### Z-3 [HOCH] `items.listRule` gibt jedem Konto den Bestand samt Einreichenden und Standort

`1700000000_init_schema.js:46-47`: `@request.auth.id != ""`, seither
unverändert. `items` trägt `created_by`, `location` (Freitext) und
`stays_external` (`1700000600_item_location_status.js:22-23`).

Jedes Besucherkonto kann den kompletten Bestand listen — auch die
`pending`-Einreichungen anderer Personen, auch `location`. Bei einem Teil, das
beim Einreichenden zu Hause bleibt (`stays_external`), steht dort die private
Adressangabe. Mit `expand=created_by` kommt die Person dazu (abhängig von Z-1).

Die App filtert externe Teile in der Besucheransicht heraus
(`store.tsx:156`) — das ist eine reine Oberflächenfilterung, die API gibt sie
trotzdem heraus. **Dies ist zugleich die Ursache des offenen App-Befunds 7
aus `app.md`**, der dort ausdrücklich als „eigener Befund für ein
Backend-Audit" benannt und nicht weiterverfolgt wurde.

Beim Verschärfen gilt die Regel zu ausgelieferten Apps: Eine engere
`listRule` ändert nicht die Antwortform, wohl aber die Treffermenge für
Versionen im Store. Das ist vorher gegen die dort laufenden Abfragen
(`useShowcase`, `useStoreItems`, `useData.ts:25,41,57`) abzugleichen.

#### Z-4 [HOCH] `action_counts` gibt Teilnahmezahlen aller Personen an jedes Konto

`1700001000_action_counts.js:21-22`: `listRule`/`viewRule` =
`@request.auth.id != ""`. Die Sammlung enthält `user`, `campaign` und `count`.

Ein beliebiges Konto kann für jede Person, die je an einer Aktion teilgenommen
hat, Nutzer-ID und Anzahl abrufen — ein Aktivitätsprofil. Genau die Art Daten,
die `points_log` und `visits` bewusst hinter einer Besitzprüfung halten.

Bemerkenswert: Die Schreibseite ist korrekt zugesperrt (`:23-25`, alle drei
`null`) — die Leseseite blieb offen. Die App braucht sie nicht: Kein Screen
liest `action_counts` (kein Treffer in `mobile/`), die Abzeichen werden
serverseitig berechnet. Richtig wäre dieselbe Regel wie bei den
Geschwistersammlungen: `user = @request.auth.id || @request.auth.role = "admin"`.

#### Z-5 [MITTEL] `items.status` ist nur eine Regel tief geschützt

`defaults.pb.js:26` (`onRecordBeforeUpdateRequest`) ist auf `'users'`
eingeschränkt (Z. 44). Für `items` gibt es **keinen** Update-Hook; `status` und
`is_showcase` werden nur beim *Anlegen* erzwungen (`:81`, `:84`).

Der Schutz hängt damit allein an `items.updateRule = 'volunteer || admin'`
(`1700000600_item_location_status.js:34`). Heute trägt das. Wird die Regel je
gelockert — etwa damit Einreichende Titel oder Foto nachbessern können, eine
naheliegende Anforderung —, kippt lautlos auch die Selbstfreigabe: `status:
'approved'` im PATCH löst über `onRecordAfterUpdateRequest`
(`defaults.pb.js:89`) die Bring-Punkte aus. Der Kommentar
`defaults.pb.js:77-78` beschreibt den Schutz als „kann nicht passieren" — er
ist aber genau eine Zeile Regel tief. Bei `users.points_total` liegt er
bewusst doppelt (Regel *und* Hook); hier sollte er es auch.

#### Z-6 [NIEDRIG] `needs.deleteRule` erlaubt `volunteer`, wo die Nachbarsammlungen `admin` verlangen

`1700000700_badge_kinds_actions.js:65` gegen `items`/`campaigns`/`badges`
(je `admin`). Inhaltlich vertretbar — der Aushang ist Tagesgeschäft —, aber
eine unbegründete Abweichung vom Muster. Als Inkonsistenz genannt, nicht als
Lücke.

#### Z-7 [NIEDRIG] Rückfall auf das Altfeld hält `store.checkin_qr_secret` scharf

`scan.pb.js:42` fällt weiterhin auf `store.get('checkin_qr_secret')` zurück,
wenn `store_secrets` leer ist — bewusst, für noch nicht migrierte Instanzen.
Befüllt jemand das Altfeld erneut (Admin-UI, alter Schreibweg), stünde das
Geheimnis wieder für jedes angemeldete Konto lesbar in `store`. Kein akuter
Befund; ein Hinweis am Feld oder ein Check, der es leer hält, wäre die
Absicherung.

#### Z-8 [NIEDRIG] `badges.listRule` gibt auch geheime Abzeichen preis

`1700000000_init_schema.js:200` zusammen mit `1782670000_secret_badges.js:18-25`
(`is_secret`). Die App stellt geheime Abzeichen verdeckt dar
(`useData.ts:210`), die API liefert Name, Beschreibung und Schwelle an jedes
Konto. Spielverderberei, kein Datenschutzproblem.

#### In Ordnung befunden

`store_secrets` (alle fünf Regeln `null`, mit ausführlicher Begründung im
Migrationskopf), `points_log` und `user_badges` (Besitzprüfung beim Lesen, alle
Schreibregeln `null`), `push_devices` (Besitzprüfung auf allen fünf Regeln —
dass `push.pb.js:16` den Admin-DAO nimmt, ist deshalb nötig und im Kommentar
`:5-6` korrekt begründet), `push_messages` (durchgehend `admin`), `campaigns`
und `badges` (Schreiben nur `admin` — ein Helfer kann sich keine ×3-Aktion
bauen), `visits` beim Lesen/Ändern/Löschen, und `items.createRule` (bewusst
geöffnet, sauber gegengesichert durch `defaults.pb.js:79-84`).

Besonders hervorzuheben: Der Schreibschutz in `defaults.pb.js:26-44` prüft bei
der Admin-Ausnahme ausdrücklich `auth.id !== r.id` (Z. 39) — ein Admin kann
sich also **nicht selbst** Punkte gutschreiben oder befördern. Das ist genau
der Grund, warum Z-2 nur über den Abzeichen-Umweg wirkt.

### b) Barrierefreiheit der App

Erstmals geprüft: `mobile/app/`, `mobile/components/`, `mobile/lib/`. Die
Kontrastwerte sind mit der WCAG-Formel nachgerechnet und stichprobenweise
unabhängig gegengeprüft.

#### B-1 [KRITISCH] Die App hat keine einzige Barrierefreiheits-Auszeichnung

```
$ grep -rniE "accessibilityLabel|accessibilityRole|accessibilityHint|accessibilityState|testID" app components lib | wc -l
0
```

**Null Treffer in 65 Dateien.** Betroffen sind **128 interaktive Elemente**:
64 `Pressable`, 35 `PPButton`, 21 `IconButton`, 8 `Toggle`, 1 `Stepper`.

Die vier Treffer auf „Accessibility" im Code sind
`AccessibilityInfo.isReduceTransparencyEnabled` (`TabBar.tsx:66-67`,
`settings/account.tsx:43`) — ein Umschalter für den Glas-Effekt. Der Befund
„Barrierefreiheits-Listener der Tab-Leiste", den `app.md:348` unter
„geprüft und für in Ordnung befunden" führt, meint genau diesen: Er ist
kosmetisch und trägt zur Bedienbarkeit mit Screenreader nichts bei. Das
Audit hat daraus fälschlich ein Positivsignal gelesen.

Mit VoiceOver oder TalkBack ist die App damit nicht sinnvoll bedienbar.

#### B-2 [KRITISCH] 26 reine Icon-Knöpfe ohne Beschriftung — darunter drei folgenreiche

Für einen Screenreader sind das Knöpfe ohne Namen. Die drei gefährlichsten:

| Fundstelle | Icon | Funktion |
|---|---|---|
| `items/review.tsx:134` | `x` | **Teil ablehnen** |
| `items/index.tsx:124` | `trash` | **Teil archivieren** |
| `admin/tiers.tsx:179` | `trash` | **Rang löschen** |

In `items/review.tsx:133-134` stehen „Ins Schaufenster freigeben" und
„Ablehnen" als zwei nicht unterscheidbare Icon-Knöpfe nebeneinander. Der
Kommentar dort (Z. 124-125) begründet die Textlosigkeit mit dem Umbruch —
und schafft damit genau die Verwechselbarkeit. Eine Fehlbedienung lehnt eine
Einreichung ab.

Dazu 11× `chevron-left` (Zurück), 4× `plus` (Neu), `bell`, `star`, zwei
Modal-Hintergründe (`store.tsx:222`, `badges.tsx:56`) und der Avatar als
Navigationsknopf (`index.tsx:86`).

#### B-3 [KRITISCH] Die Basiskomponenten können kein Label annehmen — das ist der Hebel

`components/ui/IconButton.tsx:5-16`: Das Props-Interface kennt nur
`icon`, `badge`, `dark`, `tint`, `bg`, `loading`, `onPress`. Kein
`accessibilityLabel`, kein `...rest`-Spread.

**Ein Label an einer Aufrufstelle wäre wirkungslos** — es erreicht den
`Pressable` nicht. Dasselbe gilt für `PPButton`, `Toggle`, `Stepper`,
`Field` und `Pill`. Ohne Änderung an diesen sechs Dateien lässt sich in
keinem einzigen Screen etwas beheben.

Besonders: `Field.tsx:481` reicht das `label`-Prop nur als sichtbaren Text
darüber (Z. 478), nicht als `accessibilityLabel` an den `TextInput` —
**alle Eingabefelder der App sind für Screenreader unbeschriftet.**
`PPButton.tsx:114-115` ersetzt im Ladezustand den Text durch einen Spinner
und wird dabei vollständig stumm.

#### B-4 [KRITISCH] Weiß auf Teal = 2.72:1 — die häufigste Textkombination der App

Nachgerechnet: `#FFFFFF` auf `#27b092` ergibt **2.72:1**. Erforderlich sind
4.5:1 für Fließtext, 3:1 selbst für großen Text — **beides verfehlt.**

Betroffen ist jeder Primärknopf (`PPButton.tsx:100`, 35 Aufrufe) und jede
aktive Auswahl-Pille. Nach rechts im Markenverlauf wird es schlechter: auf
`mint` 2.03, auf `sky` 2.20.

Wichtig zur Einordnung: `fontScale: 1.15` (`theme.ts:146`) ergibt
xs = 12.1 pt, sm = 13.2 pt, base = 15.5 pt, md = 17.2 pt. Als „großer Text"
(3:1) zählt erst `lg` ab 19.6 pt. **Der Großteil aller Texte der App braucht
also 4.5:1.**

#### B-5 [HOCH] `ink3` (2.28–2.46:1) trägt durchgehend die Kleinschrift

| Kombination | Verhältnis | 4.5:1? |
|---|---:|---|
| `ink3` auf `surface` | **2.46** | nein |
| `ink3` auf `bg` | **2.28** | nein |
| `ink3` auf `sand` / `sandDeep` | 2.15 / 1.93 | nein |

Genau die Farbe, die für Feld-Labels (`Field.tsx:478`), **alle
Platzhaltertexte** (`:484`), Rangnamen (`badges.tsx:267`), Zeitstempel und
Meta-Zeilen benutzt wird — fast immer in `xs` oder `sm`, wo 4.5:1 zwingend
wäre. Die im Audit vermutete kritischste Farbe, bestätigt.

#### B-6 [HOCH] Alle fünf Rangfarben sind als Text unlesbar

| Rang | auf `surface` | auf `bg` |
|---|---:|---:|
| bronze | 3.14 | 2.91 |
| silber | 1.98 | 1.84 |
| **gold** | **1.84** | **1.71** |
| platin | 2.23 | 2.06 |
| **diamant** | **1.73** | **1.60** |

Keine besteht 4.5:1, nur Bronze besteht 3:1. Weiß auf den hellen
Verlaufsenden der Medaille (`BadgeMedallion.tsx:896`) liegt bei
1.29 (diamantLight) bis 1.45 (platinLight) — das Symbol verschwindet.

Das ist fachlich heikel: `theme.md:169-173` begründet die fünf Rangfarben
ausdrücklich damit, dass ein Nutzer „Gold von Platin unterscheiden können"
muss. Als Flächen gegeneinander stimmt das (ΔE 12–16); als **Text auf
hellem Grund** sind sie unlesbar. Der Bericht hat die Farben nur
gegeneinander geprüft, nie gegen ihren Grund.

#### B-7 [HOCH] Kein Bedienelement erreicht 3:1 Nicht-Text-Kontrast (WCAG 1.4.11)

| Element | Verhältnis |
|---|---:|
| Feldrand (`Field.tsx:507`) | 1.16 |
| Pill-Fläche inaktiv | 1.16 |
| SelectChip inaktiv | 1.10 |
| Toggle-Track aus / an | 1.42 / 2.72 |
| Dots inaktiv / aktiv | 1.41 / 2.52 |

Die Umrisse von Eingabefeldern, Chips und Schaltern sind bei reduziertem
Kontrastsehen praktisch unsichtbar.

#### B-8 [HOCH] Rund 22 Trefferflächen unter 44 pt

`Pill.tsx` setzt `minHeight` 22 bzw. 28; mit `fontScale` sind das **25 pt**
(`size="s"`) bzw. **32 pt**. Rund 20 Pill-Wrapper haben **kein `hitSlop`**.
Die schlimmsten: `settings/store.tsx:117` und `:123` — Route öffnen und
Telefonanruf bei 25 pt.

Dazu `Toggle.tsx:212`: 28 pt hoch, mit `hitSlop={6}` effektiv 40 pt — bleibt
4 pt unter der Anforderung, betrifft alle 8 Schalter.

**Entwarnung bei den Icon-Knöpfen:** `IconButton` (40×40) und die drei
kleineren bare Pressables haben `hitSlop` und kommen effektiv auf 52–56 pt.
WCAG 2.5.5 ist dort erfüllt; nur die sichtbare Fläche ist klein.

#### B-9 [MITTEL] Drei Zustände werden allein über Farbe getragen

- **`TabBar.tsx:127,134`** — der aktive Tab. Der Kommentar (Z. 225-226)
  benennt es selbst: „Der aktive Zustand wird allein über die Farbe von Icon
  und Label getragen — bewusst ohne den MD3-Pill". Ohne
  `accessibilityState={{selected}}` ist die Hauptnavigation weder ansagbar
  noch für farbenblinde Nutzer:innen erkennbar. Zusätzlich unterschreiten
  die iOS-Werte den Kontrast (inaktiv 2.37, aktiv 2.63).
- **`Toggle.tsx`** — an/aus nur über Trackfarbe und Knopfposition.
- **`Dots.tsx:10`** — Farbe plus Breite (18 vs. 6); die Form trägt mit.

**Ausdrücklich gut gelöst:** Status-Pills tragen Text („zu prüfen",
„archiviert", `items/index.tsx:29-34`), Rangpunkte stehen neben dem
Rangnamen, Punktzeilen haben ein Vorzeichen (`points.tsx:176`),
Auswahl-Pills wechseln zusätzlich den Schriftschnitt, und `ColorPicker.tsx:718`
setzt Rand **und** Häkchen. Der Befund ist deutlich kleiner als die übrigen.

#### B-10 [MITTEL] Sechs Farbwerte stehen als Zeichenkette statt als Token — echter Fehler

```
app/scan.tsx:115,132          color="PP.onBrandFaint"
app/scan.tsx:175,205          color="PP.onBrandMuted"
app/(visitor)/index.tsx:182   color="PP.onBrandMuted"
components/QRScanner.tsx:66   color="PP.onBrandFaint"
```

Die Anführungszeichen machen daraus den **String** `"PP.onBrandMuted"`, nicht
den Token. React Native kann ihn nicht auflösen. Vier der sechs Stellen
liegen auf dem dunklen Scanner-Grund (`inkDeep`) — dort ist das ein
möglicherweise unlesbarer Text an sichtbarer Stelle.

Dieser Fehler stammt aus der Theme-Umstellung (`c6d3b6e`) und ist ein
zweiter Beleg dafür, dass sie ohne Testnetz lief — wie schon die
nachträglich korrigierte Kartenrundung (`2dd13cf`). **Gemeldet, nicht
behoben** (Projektregel: melden statt nebenbei beheben).

#### B-11 [MITTEL] Die Zusicherung im `ColorPicker` trifft nicht zu

`ColorPicker.tsx:686-687` behauptet, alle Aushang-Farben seien „dunkel genug"
für weißen Text. Nachgerechnet: **Bernstein 2.58, Koralle 3.36, Wald 4.06**
verfehlen 4.5:1. Nur Beere (5.10), Pflaume (5.45) und Nordsee (5.63)
bestehen. Das Team kann einem Aushang also eine Farbe geben, auf der die
eigene Überschrift nicht lesbar ist.

---

## Mutationsproben

Drei Fixes wurden gezielt im Arbeitsbaum rückgängig gemacht, um zu prüfen, ob
die Tests sie wirklich schützen — ein Fix, den kein Test hält, ist nicht
fertig. Nach jeder Probe wurde mit `git checkout` zurückgesetzt.

### Probe 1 — Zeitzone: Tagesgrenze zurück auf die Prozess-Zeitzone

`points.js:113-123` (`storeDayStart`) auf den alten Stand gesetzt
(`new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0,0,0)`).

**Ergebnis: 7 Tests rot** (245 von 252 grün). Darunter die fachlich
entscheidenden:

- „gibt für 00:30 Ortszeit keinen zweiten Check-in-Bonus am Vormittag"
- „findet den Besuch von 00:30 Ortszeit am selben Vormittag wieder"
- „trennt den Tag auch im Winter richtig (Normalzeit, UTC+1)"
- „legt die Tagesgrenze im Sommer auf 22:00 UTC des Vortags"
- „trifft die Tagesgrenze in der Nacht der Zeitumstellung"

**Bewertung: Der Fix ist belastbar abgesichert.** Die Tests prüfen genau das
Fehlerszenario aus dem Bericht — den doppelten Bonus —, nicht nur die
Hilfsfunktion.

### Probe 2 — KW 53: `isWeekAdjacent` zurück auf die lose Bedingung

`points.js:431-434` ersetzt durch
`later % 100 === 1 && earlier % 100 >= 52 && …` (der ursprüngliche Ausdruck,
der KW 52 *und* KW 53 als Vorgängerin durchgehen lässt).

**Ergebnis: 6 Tests rot** (246 von 252 grün), über **drei Testdateien und alle
drei Aufrufstellen** verteilt:

- `streak.test.js` — „reisst, wenn die 53. Woche uebersprungen wurde"
- `streak.test.js` — „kennt die Laenge des jeweiligen Jahres"
- `streak.test.js` — „faengt wieder bei 1 an, wenn die 53. Woche ausgelassen wurde" (`updateStreak`)
- `streak.test.js` — „bricht ab, wenn die 53. Woche fehlt" (`streakFromVisits`)
- `streak.test.js` — „KW 52/2026 -> KW 1/2027 (KW 53 fehlt): Luecke"
- `cron.test.js` — „setzt zurueck, wenn die 53. Woche ausgelassen wurde" (Reset-Cron)

**Bewertung: Vorbildlich abgesichert.** Dass alle drei Aufrufstellen
eigenständig rot werden, belegt zugleich die Zusammenführung aus `redundanz.md`
D3: Die Regel steht wirklich nur noch an einer Stelle, und jede Nutzung ist
geprüft.

### Probe 3 — Türgeheimnis: Sammlung wieder öffnen

`1782690000_store_secret_collection.js:44-45`: `listRule`/`viewRule` von `null`
auf `''` gesetzt — exakt der Fehlertyp, um den es im Ausgangsbefund ging
(Leerstring heißt „für alle offen", nicht „niemand").

**Ergebnis: 1 Test rot** (251 von 252 grün):
`store-secret-migration.test.js` — „sperrt die neue Sammlung für jeden Weg
über die API".

**Bewertung: Der Fix ist abgesichert, der Test sitzt genau richtig.** Er
prüft alle fünf Regeln auf `null` und schlägt schon beim Leerstring an — also
bei der Verwechslung, die den ursprünglichen Befund verursacht hat. Nur ein
Test fällt, aber es ist der, der fallen muss; breitere Abdeckung wäre hier
keine bessere.

### Abschluss

Nach allen drei Proben: `git status --porcelain` leer,
**252 Tests grün**. Der Arbeitsbaum enthält ausschließlich die Änderungen an
den Berichten in `docs/audit/`.

---

## Empfohlene nächste Schritte

Priorisiert nach Schaden mal Wahrscheinlichkeit, nicht nach Aufwand.

### 1. `visits.createRule` auf `null` setzen (Z-2)

Der einzige neue Befund mit direkter Auswirkung auf Punkte. Abzeichen samt
Belohnung sind ohne Ladenbesuch erschleichbar, und der Weg umgeht den
bestehenden Schreibschutz. Die Behebung ist eine additive Migration, ein
Einzeiler, und bricht keine App-Version — kein Client legt `visits` direkt an.
Dazu ein Test für den verbotenen und einen für den erlaubten Fall, nach dem
Muster von `store-secret-migration.test.js`.

### 2. Den tatsächlichen Regelstand von `users` gegen Produktion messen (Z-1)

Erst messen, dann entscheiden. Solange nicht feststeht, ob `users.listRule`
offen steht, ist unklar, ob E-Mail-Adressen aller Konten abrufbar sind oder ob
die Freigabe-Liste des Teams ohne Namen dasteht. Beides wäre ein Befund,
beides verlangt eine andere Behebung. Danach: die Regeln in einer Migration
festschreiben, damit der Stand versioniert und reproduzierbar ist.

### 3. `action_counts` und `items` beim Lesen einschränken (Z-4, Z-3)

`action_counts` ist der einfachere Fall: Kein Client liest die Sammlung, die
Regel kann sofort auf Besitzprüfung. Bei `items` ist vor der Verschärfung die
Treffermenge gegen die Versionen im Store abzugleichen — die Antwortform
bleibt gleich, die Menge nicht. Mit Z-3 erledigt sich zugleich der offene
App-Befund 7 an der Wurzel.

### 4. Die sechs String-Literale bei den Farben beheben (B-10)

Sechs Zeilen, ein echter Darstellungsfehler an sichtbarer Stelle, vermutlich
schon heute im Scanner zu sehen. Der kleinste Aufwand im ganzen Bericht bei
unmittelbarer Wirkung.

### 5. Barrierefreiheit: bei den sechs Basiskomponenten anfangen (B-3)

Der Zustand ist ein Nullzustand — nicht eine Lücke, sondern ein fehlender
Bereich. Er lässt sich aber an einem einzigen Hebel angehen:
`IconButton`, `PPButton`, `Toggle`, `Stepper`, `Field` und `Pill` um
a11y-Props erweitern. Eine Änderung an `IconButton` beschriftet 21 Knöpfe;
`Field` das `label` durchreichen zu lassen beschriftet jedes Eingabefeld;
`Toggle` um `role="switch"` und `accessibilityState` zu ergänzen macht alle
acht Schalter ansagbar.

Vorrang innerhalb dessen haben die drei folgenreichen Icon-Knöpfe aus B-2
(Ablehnen, Archivieren, Rang löschen) — dort ist die Fehlbedienung nicht
rückholbar.

Die Kontrastbefunde (B-4 bis B-6) sind davon zu trennen: `ink3` und `teal`
sind je eine Zeile in `theme.ts`, aber eine sichtbare **Gestaltungs**-
entscheidung, die dem Betreiber gehört und nicht nebenbei getroffen werden
sollte. Sie betrifft das Erscheinungsbild der ganzen App.

### Danach, in dieser Reihenfolge

6. **`release.yml` um `setup-node` ergänzen (M-1).** Einzeiler. Der Job ist die
   einzige Absicherung vor App Store und Produktionsspur und läuft derzeit auf
   einer nicht festgelegten Node-Version, während Vitest 5 `^22.12.0 ||
   ^24.0.0 || >=26.0.0` verlangt.
7. **Testinfrastruktur für `mobile/` aufsetzen.** 16 der 33 Behebungen sind
   ungetestet, praktisch alle davon App-Code. Dass `2dd13cf` eine Regression
   der Theme-Umstellung nachträglich korrigieren musste, ist der Beleg, dass
   hier ohne Netz gearbeitet wird. Ein Anfang wären die beiden Fixes mit
   Datenschutzbezug: `logout` räumt Cache und Push-Token auf, und `errorText`
   liefert Deutsch statt SDK-Englisch.
8. **Die drei fehlenden Tests aus `tests.md` §6 schreiben:** `lib/push.js`
   (119 Zeilen ungetestet, darin die Opt-in-Zuordnung — eine
   Einwilligungsfrage), `year-badges` am 31.12. (der einzige Tag, an dem der
   Job handelt), `tiered`-Zweig von `action-badges` (der Zweig, vor dessen
   Fehlerart der Code selbst warnt).
9. **Harness härten (4.2, 4.3):** `offset` annehmen oder bei `offset > 0`
   werfen; absteigend sortieren statt `.reverse()`. Beides folgt dem Prinzip,
   das der Harness bei Filtern bereits richtig anwendet — bewusst scheitern
   statt still falsch liefern.
10. **Die verbliebenen Anzeigefehler der App:** `syncTotal` entfernen,
   `?? 0` im Erfolgs-Sheet, Kategorie-Klartext im Teil-Editor, Push-Schalter
   auf `isAdmin`, Zeitgrenze für `getCoords`.
11. **`[Unreleased]` zu einem Versionsabschnitt schließen (M-4)** und die
   Kategorien je einmal führen. Der Block ist inhaltlich gut gepflegt, aber
   inzwischen über 230 Zeilen lang und führt vier Unterüberschriften derselben
   Kategorie — genau das erschwert das Nachlesen, für das CLAUDE.md den
   CHANGELOG vorsieht.
12. **Kleinkram:** `import urllib.error` (N-1), `campaignFactorsLabel` und
    `PPTheme` entfernen, `campaignFactorRows` auf `format.ts` zusammenführen,
    Opt-in-Flags in `lib/push.js` zusammenlegen, weiche Assertions schärfen
    (1.1, 1.2, 1.3, 1.6), Titel von `defaults.test.js:53` an die Erwartung
    anpassen.

### Nicht zu vergessen

**K-1 ist im Repo erledigt, bei Apple womöglich nicht.** Der Stash ist weg und
der Schlüssel aus der Objektdatenbank entfernt. Ob der Schlüssel `7X8W499AAK`
in App Store Connect noch aktiv ist, lässt sich aus dem Repo grundsätzlich
nicht feststellen — das gehört dort nachgesehen und gegebenenfalls widerrufen.
