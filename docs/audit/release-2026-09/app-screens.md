# Release-Audit 09/2026 — Fachliche Bildschirme der App

| | |
|---|---|
| **Datum** | 26.09.2026 |
| **Stand** | Commit `06b68dc8ecab232b722ca449308c3e24a9fe941f` (19.09.2026, „feat(app): Symbolauswahl bleibt als Funktion") |
| **Umfang** | `mobile/app/(visitor)/` (index, store, showcase, items/index, items/[id], items/new, items/review, points, badges, settings/store, admin/actions, admin/badges, admin/needs, admin/tiers), `mobile/app/scan.tsx`, `components/QRScanner.tsx`, `components/ShowcaseCard.tsx`, `lib/qrsheet.ts`, `lib/format.ts`, `lib/icons.tsx`. Zum Abgleich gelesen: `lib/hooks/useData.ts`, `lib/api.ts`, `lib/queryClient.ts`, `lib/errors.ts`, `lib/types.ts`, `components/ui/*`, `components/TabBar.tsx`, `pocketbase/pb_hooks/lib/points.js`, `scan.pb.js`, `defaults.pb.js`, `cron.pb.js`, die Regel-Migrationen, `CHANGELOG.md`, `docs/openapi.yaml`. |
| **Nicht im Umfang** | Auth, Navigation-Guard, Datenzugriff (`lib/api.ts`, `useAuth`, `queryClient`) — prüft ein anderer Agent. Hier nur: Verwenden die Screens die Daten richtig? |
| **Vorgehen** | Jede Datei vollständig gelesen; App-Rechnung (Rang, Stufen, Serie) neben die Backend-Rechnung in `lib/points.js` gelegt. Wo ein Vergleichswert nötig war, wurden Backend-Funktionen über `tests/harness.js` und eine isolierte Kopie von `lib/format.ts` (Imports gestubbt, Scratchpad) in einem temporären Vitest-Test gegeneinander ausgeführt — 6 Prüfungen, danach gelöscht. `tests/worklet-purity.test.js` wurde ausgeführt (3/3 grün). `npx tsc --noEmit` **übersprungen**: `mobile/node_modules` existiert nicht, `npm install` in `mobile/` war untersagt. Kein Projektcode geändert. |
| **Kennzeichnung** | Je Befund: **reproduziert** (durch ausgeführten Vergleich oder Test) oder **aus Code gelesen**. |
| **Hinweis zum Arbeitsbaum** | Beim Start war `package-lock.json` bereits als geändert markiert (nicht durch dieses Audit); nach den Testläufen zeigte `git status` den Baum sauber. Am Ende des Audits ist `git status` sauber bis auf diesen Bericht. |

---

## Zusammenfassung

Die Rechenlogik der App stimmt mit dem Backend überein, soweit die App überhaupt rechnet: Die Rang-Rückfallwerte (150/750/1500/3000/6000) sind identisch mit dem Seed der Migration, die Stufenzahl aus `tiers_json` wird auf beiden Seiten gleich ermittelt (Array-Länge, 1–5, leer = 5), und für **gestufte** Abzeichen liefert `badgeTierInfo` in allen geprüften Fortschrittswerten dieselbe Stufe wie `reachedTier` auf dem Server — bei fünf wie bei drei Rängen. Die Serie rechnet die App gar nicht selbst, sie zeigt `users.streak_weeks` an; ein Ablaufdatum („läuft am X ab") gibt es in der App nicht. Der im CHANGELOG beschriebene Worklet-Absturz ist behoben, der zugehörige Test läuft grün, und außer dem Schalter benutzt kein Screen Reanimated (der Punkte-Ring ist statisches SVG).

Der schwerste Befund liegt bei den **Einzel-Abzeichen** (Treue, Aktions-Teilnahme, „Erster Besuch"): Die App leitet „verdient" ausschließlich aus den Stufen-Schwellen ab, die bei Einzel-Abzeichen null sind, und liest `user_badges.current_tier` an keiner Stelle. Ein vom Server vergebenes Einzel-Abzeichen — samt gutgeschriebener Bonuspunkte in der Historie — steht in der Sammlung dauerhaft als „Noch offen"; geheime Einzel-Abzeichen klappen nie auf. Das ist reproduziert (Server: `gold`, App: `none`).

Drei weitere Befunde sind HOCH: Der Scanner bietet bei verweigerter Kamera auf iOS **keinen Rückweg** (Vollbild-Modal ohne Schließen-Knopf im Sperrzustand) und keinen Weg in die Einstellungen; im Admin lässt sich ein Punktwert auf **0** setzen, den der Server als „nicht gepflegt" liest und mit dem Rückfallwert bezahlt, während die App 0 anzeigt; und „Freigeben" aus Inventar und Detailansicht **überspringt die Aktionsabfrage**, sodass Einreicher:innen während einer laufenden Aktion die versprochenen Bonus-Bringpunkte nicht bekommen.

Dazu kommen elf mittlere Befunde (stiller Fehlschlag beim Gutschreiben zusätzlicher Teile, Ablehnen ohne Rückfrage, ein „hängender" Größenfilter, nicht angezeigte Abzeichen-Bonuspunkte nach dem Scan, Lücken in der Punkte-Historie, zwei unerreichbare Screens, fehlende Fehlerbehandlung im Teil-Editor, Performance-Fallen bei großen Listen) und zehn Hygiene-Punkte (Pluralformen, Begriffe, veraltete Changelog-Aussagen zum QR-Bogen).

**Release-Empfehlung für diesen Bereich: Freigabe nur mit Auflage.** F-1 muss vor dem Release behoben werden, sobald ein Einzel-Abzeichen gepflegt ist oder gepflegt werden soll (der CHANGELOG wirbt mit Treue- und Aktions-Abzeichen). F-2 und F-4 sollten mit ins Release, F-3 lässt sich kurzfristig durch die Auflage „keine 0 eintragen" entschärfen. Alles Weitere ist nachzuziehen, blockiert aber nicht.

---

## Befund-Tabelle

| ID | Kurztitel | Screen | Schwere | Nachweis |
|---|---|---|---|---|
| F-1 | Einzel-Abzeichen erscheinen nie als „Geschafft" — App ignoriert `current_tier` | badges.tsx | HOCH | reproduziert |
| F-2 | Kamera verweigert: kein Zurück (iOS), kein Weg in die Einstellungen | scan.tsx, QRScanner.tsx | HOCH | aus Code gelesen |
| F-3 | Punktwert 0 im Admin: App zeigt 0, Server zahlt Rückfallwert | admin/tiers.tsx | HOCH | reproduziert (Backend-Seite) |
| F-4 | Freigeben aus Inventar/Detail ohne Aktionsabfrage — Bonus-Bringpunkte entfallen | items/index.tsx, items/[id].tsx | HOCH | aus Code gelesen |
| F-5 | „Teile gutschreiben" verschluckt Fehler stumm | scan.tsx | MITTEL | aus Code gelesen |
| F-6 | Ablehnen in der Freigabe archiviert ohne Rückfrage | items/review.tsx | MITTEL | aus Code gelesen |
| F-7 | Gewählte Größe verschwindet aus der Liste, bleibt aber als Filter aktiv | store.tsx | MITTEL | aus Code gelesen |
| F-8 | Abzeichen-Bonus (`bonus_points`) nach dem Scan nicht angezeigt | scan.tsx | MITTEL | aus Code gelesen |
| F-9 | Punkte-Historie: Art „bring" fehlt in Typ und Filter, Faktor unsichtbar, „diese Woche" = 7 Tage | points.tsx | MITTEL | aus Code gelesen |
| F-10 | „Neu" richtet sich nach dem Einstelldatum, nicht nach der Freigabe | store.tsx, index.tsx | MITTEL | aus Code gelesen |
| F-11 | Zwei Screens unerreichbar: Ladeninfos (mit Öffnungszeiten, Abmelden) und Schaufenster-Raster | settings/store.tsx, showcase.tsx | MITTEL | aus Code gelesen |
| F-12 | Teil-Editor: Freigeben/Archivieren ohne Fehlerbehandlung und Sperre, Speichern ohne Pflichtfelder | items/[id].tsx | MITTEL | aus Code gelesen |
| F-13 | Teil einstellen: nur Fotogalerie, kein Kamera-Aufnehmen; Punktwert nicht setzbar; Abbruch ohne Warnung | items/new.tsx | MITTEL | aus Code gelesen |
| F-14 | Große Listen als ScrollView+map, Inventar rendert je Zeile ein QR-SVG | store.tsx, items/index.tsx, badges.tsx | MITTEL | aus Code gelesen |
| F-15 | Aktion am selben Tag kann als „Ende vor Start" abgewiesen werden | admin/actions.tsx | MITTEL | aus Code gelesen |
| F-16 | Pluralformen: „1 Wochen Streak", „1 Teile gutschreiben", „1 Teile mitgenommen" | scan.tsx, points.tsx | NIEDRIG | aus Code gelesen |
| F-17 | Begriffe uneinheitlich: Streak/Serie, Badge/Abzeichen, Helfer/Team, „P"/„Punkte" | mehrere | NIEDRIG | aus Code gelesen |
| F-18 | QR-Bogen: CHANGELOG verspricht 4 je Reihe + Zustand/Punktwert, Code liefert 3 ohne beides; archivierte Teile werden mitgedruckt | lib/qrsheet.ts, items/index.tsx | NIEDRIG | aus Code gelesen |
| F-19 | Aushang: Motivations-Pill aus Leit-Faktor, Zielgruppe der Aktion unberücksichtigt | index.tsx | NIEDRIG | aus Code gelesen |
| F-20 | Rollen-Gating rein clientseitig (Deep Link), Backend schützt; Geheim-Abzeichen nur in der UI verborgen | TabBar, admin/*, badges.tsx | NIEDRIG | aus Code gelesen |
| F-21 | Abzeichen-Editor: Umschalten Stufen→Einzel lässt `tier_diamant` stehen; Listenzeile ohne Diamant | admin/badges.tsx | NIEDRIG | aus Code gelesen |
| F-22 | Punkte-Historie auf 300 Einträge begrenzt, kein Nachladen | points.tsx | NIEDRIG | aus Code gelesen |
| F-23 | E-Mail-Hinweis verschwindet erst nach Pull-to-Refresh, Scan oder Neustart | index.tsx | NIEDRIG | aus Code gelesen |
| F-24 | Löschen (Aktion/Aushang) ohne Fehlerbehandlung; Schaufenster-Schalter mit stillem Rückfall | admin/actions.tsx, admin/needs.tsx, items/[id].tsx | NIEDRIG | aus Code gelesen |
| F-25 | Historien-Datum ohne Jahr ab 7 Tagen | lib/format.ts | NIEDRIG | aus Code gelesen |

**Summe:** KRITISCH 0 · HOCH 4 · MITTEL 11 · NIEDRIG 10.

---

## Befunde im Einzelnen

### F-1 — Einzel-Abzeichen erscheinen nie als „Geschafft" (HOCH, reproduziert)

**Beschreibung.** Die Sammlung entscheidet „verdient" allein über `badgeTierInfo(b, progress, ranks).current !== 'none'`. `badgeTierInfo` baut die Stufen aus `tier_bronze … tier_diamant` und filtert alle mit Schwelle 0 heraus. Bei `kind: 'single'` schreibt der Editor genau diese Felder auf 0 (`admin/badges.tsx:99`), also gibt es keine Stufe, `current` bleibt `'none'`, `earned` ist `false`. Das Feld `user_badges.current_tier`, in dem der Server das Ergebnis ablegt (`'gold'` = verdient), wird in der App an keiner Stelle gelesen — `grep current_tier mobile/` trifft nur `types.ts:107` und einen Kommentar.

**Fundstelle.** `mobile/app/(visitor)/badges.tsx:204-205` (Kachel), `:31-32` (Blatt), `:237` (Ring), `:272` (Text „Noch offen"); `mobile/lib/format.ts:99-149`; Server: `pocketbase/pb_hooks/lib/points.js:565-582` (setzt `current_tier = 'gold'`, vergibt `points_reward`), `:607-626` (`grantBadge`).

**Auswirkung.** Ein Besucher erreicht „Erster Besuch" (Einzel, Schwelle 1) — der Server schreibt `gold`, bucht den Bonus in die Historie und schickt ggf. eine Push. In der Sammlung steht das Abzeichen grau mit „Noch offen"; im Blatt ebenso. Treue-Abzeichen zum Jahresende und Aktions-Teilnahme (beides nur als Einzel möglich) sind damit nie sichtbar verdient. Ein **geheimes** Einzel-Abzeichen klappt nie auf (`veiled = is_secret && !earned`, `badges.tsx:210`). Die Punkte sind da, das Abzeichen nicht — genau die Diskrepanz, die der CHANGELOG für andere Stellen als Fehler beschreibt.

**Nachweis.** Temporärer Vitest-Test (gelöscht): Harness mit Badge `{kind:'single', trigger_type:'visits', trigger_value:1, points_reward:50}` und einem Besuch → `checkBadges` → `user_badges[0].current_tier === 'gold'`, `points_total === 50`; `badgeTierInfo(badge, progress).current === 'none'`. Zweiter Fall über `grantBadge` (Treue): Server `gold`, App `none`. Beide grün = Diskrepanz bestätigt. Gegenprobe: gestufte Abzeichen liefern für 12 Fortschrittswerte bei fünf und bei drei Rängen identische Stufen auf beiden Seiten.

**Empfehlung.** Für `kind === 'single'` `earned` aus `ub.current_tier !== 'none'` ableiten (oder generell: `earned = ub?.current_tier && ub.current_tier !== 'none'`, Stufe aus `current_tier` statt aus den Schwellen — dann folgt die App auch bei nachträglich geänderten Schwellen dem Server, siehe „Unklar"). Vorher Test, der den heutigen Stand festhält; dann Fix im selben Commit.

### F-2 — Kamera verweigert: kein Zurück, kein Weg in die Einstellungen (HOCH, aus Code gelesen)

**Beschreibung.** `CameraGate` ersetzt bei `granted === false` **alle** Kinder durch die Hinweisfläche — auch die obere Leiste mit dem Schließen-Knopf, die als Kind übergeben wird. Der Scanner läuft als `fullScreenModal` (kein Wischen zum Schließen auf iOS). Der Knopf „Kamera erlauben" ruft `requestPerm`; hat die Person die Kamera systemweit dauerhaft abgelehnt, zeigt iOS keinen Dialog mehr — der Knopf tut sichtbar nichts. `Linking.openSettings()` wird nicht angeboten.

**Fundstelle.** `mobile/app/scan.tsx:110-131` (Schließen-Knopf innerhalb von `CameraGate`), `mobile/components/QRScanner.tsx:53-82`, `mobile/app/_layout.tsx:138` (`presentation: 'fullScreenModal'`).

**Auswirkung.** Wer beim ersten Tipp auf „Scannen" die Kamera ablehnt, sitzt auf iOS in einem Vollbild ohne Ausweg und muss die App beenden. Beim nächsten Versuch dasselbe. Android kommt über die Hardware-Zurück-Taste heraus, bekommt aber ebenfalls keinen Hinweis, wo die Freigabe nachzuholen ist.

**Nachweis.** `CameraGate` gibt bei `!granted` `permWrap` ohne `children` zurück (`QRScanner.tsx:65-79`); der einzige `router.back()` des Screens steht in den `children` (`scan.tsx:123`).

**Empfehlung.** Schließen-Knopf außerhalb von `CameraGate` rendern; bei `canAskAgain === false` (`useCameraPermissions` liefert es) statt „Kamera erlauben" einen Knopf „Einstellungen öffnen" mit `Linking.openSettings()`.

### F-3 — Punktwert 0 im Admin: App zeigt 0, Server zahlt Rückfallwert (HOCH, reproduziert)

**Beschreibung.** `parseNum` klemmt auf `min = 0`, Speichern schickt 0 (`savePointConfig`). Der Server liest `v && v > 0 ? v : def` — 0 gilt als „nicht gepflegt" und fällt auf 10/5/5/7 zurück. Der Editor zeigt nach dem Neuladen weiter 0 (`String(s.pts_bring ?? 5)` — `??` greift bei 0 nicht).

**Fundstelle.** `mobile/app/(visitor)/admin/tiers.tsx:15-19, 42-45, 60-63, 89`; `pocketbase/pb_hooks/lib/points.js:134-143`; dieselbe Lesart in `scan.tsx:32` (`store?.max_items_take ?? 7` → 0 bleibt 0, Stepper-Maximum 0, Server erlaubt 7).

**Auswirkung.** Ein Admin, der z. B. „Pro gebrachtem Teil: 0" einträgt, um Bring-Punkte auszusetzen, sieht in der App 0 und glaubt, es gelte — der Server zahlt weiter 5. Bei `max_items_take = 0` kann in der App niemand Teile nachtragen, während der Server 7 zulässt.

**Nachweis.** Harness: `store {pts_checkin:0, pts_take:0, pts_bring:0, max_items_take:0}` → `lib.config()` = `{checkin:10, takePerItem:5, bringPerItem:5, maxItemsTake:7}` (temporärer Test, grün).

**Empfehlung.** In `tiers.tsx` `min = 1` für die drei Punktwerte erzwingen und sagen, dass 0 nicht möglich ist — oder fachlich klären, ob 0 erlaubt sein soll; dann muss der Server `== null` statt `> 0` prüfen (Backend-Änderung, additiv).

### F-4 — Freigeben aus Inventar und Detail ohne Aktionsabfrage (HOCH, aus Code gelesen)

**Beschreibung.** Nur `items/review.tsx` fragt „Zählt zu einer Aktion?" und übergibt `campaignId`. Die Knöpfe „Freigeben" im Inventar (Filter „Zu prüfen") und in der Detailansicht rufen `approveItem(item.id, false)` ohne Aktion. Der Server rechnet den Bring-Faktor nur, wenn `items.campaign` gesetzt ist; ohne bleibt es beim Grundwert und die Teilnahme wird nicht gezählt.

**Fundstelle.** `mobile/app/(visitor)/items/index.tsx:111`, `mobile/app/(visitor)/items/[id].tsx:238`, Vergleich `items/review.tsx:45-55`; Server `pocketbase/pb_hooks/defaults.pb.js:106-131`.

**Auswirkung.** Während „Winterkleidung ×2 aufs Bringen" gibt eine Helferin ein Teil im Inventar frei: die Einreicherin bekommt 5 statt 10 Punkte, ihr Aktions-Abzeichen zählt nicht mit, der Aushang hat etwas anderes versprochen.

**Nachweis.** `approveItem`-Signatur `(id, showcase = false, campaignId?)` in `lib/api.ts:144-150`; die beiden Aufrufe übergeben kein drittes Argument.

**Empfehlung.** Die Abfrage in eine gemeinsame Funktion ziehen und an allen drei Stellen verwenden — oder Freigeben außerhalb der Freigabe-Liste ausbauen.

### F-5 — „Teile gutschreiben" verschluckt Fehler stumm (MITTEL, aus Code gelesen)

**Beschreibung.** `addExtraItems` fängt jeden Fehler mit leerem `catch {}`. Mögliche Antworten des Servers: „Höchstens N Teile pro Besuch." (400), „Du bist nicht im Laden" (400), Netzfehler.

**Fundstelle.** `mobile/app/scan.tsx:82-99`, insbesondere `:94-96`.

**Auswirkung.** Die Person tippt „3 Teile gutschreiben", der Spinner läuft, dann steht das Blatt unverändert da — ohne Punkte, ohne Hinweis. Wer erneut tippt, weiß nicht, ob es beim ersten Mal geklappt hat.

**Empfehlung.** `Alert.alert('Fehler', errorText(e, 'Konnte die Teile nicht gutschreiben.'))` wie an den anderen Stellen des Screens.

### F-6 — Ablehnen archiviert ohne Rückfrage (MITTEL, aus Code gelesen)

**Beschreibung.** Der rote X-Knopf ruft `archiveItem` sofort; keine Bestätigung, kein Rückgängig. Die Detailansicht fragt beim Archivieren nach („Archivieren?"), die Freigabe nicht.

**Fundstelle.** `mobile/app/(visitor)/items/review.tsx:57-67, 146-154`; Vergleich `items/[id].tsx:200-205`.

**Auswirkung.** Ein Fehltipp auf schmalem Gerät (drei Knöpfe in einer Zeile, `:132-155`) lehnt die Einreichung endgültig ab; die Einreicherin erfährt nichts, das Teil ist nur noch über die PocketBase-Verwaltung zurückzuholen.

**Empfehlung.** Bestätigungsdialog wie in der Detailansicht.

### F-7 — Gewählte Größe verschwindet aus der Liste, bleibt aber Filter (MITTEL, aus Code gelesen)

**Beschreibung.** Die Größenliste ist — wie im CHANGELOG beschrieben — an alle anderen Filter gebunden. Der gewählte Wert `size` wird aber nur beim Wechsel der Zielgruppe zurückgesetzt (`selectGroup`), nicht bei Art, Aufbewahrung, Schaufenster oder Neu. Fällt die gewählte Größe aus der Liste, wird ihr Chip nicht mehr gerendert; sind gar keine Größen übrig, verschwindet die ganze Zeile — der Filter bleibt aktiv und zählt in „Filter (n)".

**Fundstelle.** `mobile/app/(visitor)/store.tsx:186-204` (Liste), `:211` (Filter), `:224-228` (Reset nur bei Gruppe), `:230` (Zähler), `:344-346` (Zeile nur bei Optionen).

**Auswirkung.** Größe „M" wählen, dann „Neu" einschalten (keine neuen M-Teile): Ergebnis „Keine Teile in dieser Ansicht", Filterzähler 2, keine Größenzeile — die Ursache ist unsichtbar, nur „Zurücksetzen" hilft.

**Empfehlung.** `size` auf `null` setzen, wenn es nicht mehr in `sizes` vorkommt (z. B. im `useMemo` prüfen oder Effekt), oder den Chip der gewählten Größe immer mitrendern.

### F-8 — Abzeichen-Bonus nach dem Scan nicht angezeigt (MITTEL, aus Code gelesen)

**Beschreibung.** Der Server liefert seit dem Umbau `bonus_points` als zusätzliches Feld (Kommentar in `scan.pb.js:10-33`, Beispiel in `docs/openapi.yaml`: `points: 10, bonus_points: 500, points_total: 510`). `ScanResult` kennt das Feld nicht, das Blatt zeigt nur `points`.

**Fundstelle.** `mobile/lib/api.ts:4-16`, `mobile/app/scan.tsx:182, 214`; Server `pocketbase/pb_hooks/scan.pb.js:95-117, 163-174`.

**Auswirkung.** Genau der im Server-Kommentar beschriebene Effekt bleibt in der App bestehen: „+10 Punkte", der Ring springt um 510.

**Empfehlung.** `bonus_points?: number` in `ScanResult`, im Blatt als eigene Zeile „+500 Bonus (Abzeichen)" zeigen, wenn > 0.

### F-9 — Punkte-Historie: Art „bring" fehlt, Faktor unsichtbar, „diese Woche" = 7 Tage (MITTEL, aus Code gelesen)

**Beschreibung.** (a) Der Server schreibt Bring-Punkte mit `kind: 'bring'` (`defaults.pb.js:123`); `PointsLog['kind']` kennt den Wert nicht, die Filter haben nur Alle/Check-Ins/Teile/Badges — Bring-Einträge erscheinen nur unter „Alle", unter „Teile" (Filter `scan`) nicht. Nachgetragene Teile vom Check-in laufen als `kind: 'checkin'` („3 Teile mitgenommen"), also ebenfalls nicht unter „Teile". (b) Der Faktor einer Aktion steht nur im Bring-Label („Teil gebracht (Aktion ×2)"); Check-in und Mitnehmen werden mit Faktor gerechnet (`points.js:332-333`, `scan.pb.js:150`), das Label nennt ihn nicht — „Check-In im Laden +20" ist nicht erklärbar. (c) „+X diese Woche" summiert die letzten 7×24 h, nicht die Kalenderwoche, an der die Serie hängt.

**Fundstelle.** `mobile/lib/types.ts:62`, `mobile/app/(visitor)/points.tsx:13-20, 52-56, 73-76, 95`; Server `defaults.pb.js:119-123`, `points.js:313, 337-339`.

**Auswirkung.** Wer nach seinen gebrachten Teilen sucht, findet sie unter „Teile" nicht; Bonuspunkte aus Aktionen sind nicht nachvollziehbar; „diese Woche" widerspricht der Wochenlogik der Serie.

**Empfehlung.** `'bring'` in Typ und Filter aufnehmen (Filter „Teile" auf `scan || bring`), Faktor im Server-Label ergänzen (additiv, Textänderung), „letzte 7 Tage" schreiben oder auf Kalenderwoche umstellen.

### F-10 — „Neu" richtet sich nach dem Einstelldatum, nicht nach der Freigabe (MITTEL, aus Code gelesen)

**Beschreibung.** Filter „Neu (14 Tage)" und „Neu im Laden" auf der Startseite nutzen `created`. Ein Besucher-Vorschlag bekommt `created` beim Einreichen; sichtbar wird er erst mit der Freigabe. Zeitzone ist unkritisch (rollierende 14×24 h ab Gerätezeit).

**Fundstelle.** `mobile/app/(visitor)/store.tsx:20-30, 197-199, 215-218`; `mobile/lib/hooks/useData.ts:51-64` (`sort: '-created'`).

**Auswirkung.** Ein vor drei Wochen eingereichtes, heute freigegebenes Teil ist im Laden neu, taucht aber weder unter „Neu" noch unter „Neu im Laden" auf; bei einem Freigabe-Rückstau verschwinden Teile aus „Neu", bevor sie je zu sehen waren.

**Empfehlung.** Fachlich klären; technisch bräuchte es ein Freigabedatum (`approved_at`, additiv) oder `updated` als Näherung.

### F-11 — Zwei Screens sind unerreichbar (MITTEL, aus Code gelesen)

**Beschreibung.** `settings/store.tsx` („Der Laden": Öffnungszeiten, Adresse, Route, Telefon, **Abmelden**) und `showcase.tsx` (Schaufenster-Raster) sind im Tab-Layout registriert, aber kein `router.push` und kein Link führt hin (`grep -rn "settings/store\|showcase'" mobile/` trifft nur `_layout.tsx`). „Alles ansehen" am Schaufenster geht in den Laden-Tab.

**Fundstelle.** `mobile/app/(visitor)/_layout.tsx:24, 26`; `mobile/app/(visitor)/index.tsx:365-369`; `settings/store.tsx:147-151` (zweiter Abmelden-Knopf).

**Auswirkung.** Öffnungszeiten und Adresse des Ladens sind in der App nirgends sichtbar; toter Code mit eigener Logik (`fmtHours`) und einem Abmelde-Weg ohne die Karte aus `account.tsx`.

**Empfehlung.** Entweder verlinken (z. B. aus dem Konto oder der Startseite) oder entfernen. Ein Türgeheimnis-QR wird in keinem der beiden gezeigt — richtig so, das Geheimnis liegt in der gesperrten Sammlung.

### F-12 — Teil-Editor: Freigeben/Archivieren ohne Fehlerbehandlung, Speichern ohne Pflichtfelder (MITTEL, aus Code gelesen)

**Beschreibung.** „Freigeben" im gelben Banner (`:238`) und „Archivieren" im Dialog (`:203`) haben kein `try/catch` und keinen `busy`-Zustand — ein Fehler wird zur unbehandelten Promise-Ablehnung, Doppeltippen ist möglich. `save` prüft den Titel nicht (leerer Titel wird gesendet), `points` mit `parseInt(...) || 0`: leeres oder ungültiges Feld setzt still 0 Punkte. Der Schaufenster-Schalter ist auch bei `pending` aktiv (Inventar bietet ihn dort nicht).

**Fundstelle.** `mobile/app/(visitor)/items/[id].tsx:158-205, 232-241, 298`.

**Auswirkung.** Ein Tippfehler im Punktefeld („3o") macht aus 30 Punkten 0, ohne Warnung; ein Server-Fehler beim Freigeben bleibt ohne Meldung.

**Empfehlung.** Wie in `review.tsx`: `try/catch` mit `errorText`, `busy`, Titel-Pflicht, Punkte-Validierung mit Hinweis.

### F-13 — Teil einstellen: nur Galerie, kein Kamera-Aufnehmen; Punktwert nicht setzbar; Abbruch ohne Warnung (MITTEL, aus Code gelesen)

**Beschreibung.** `pickPhoto` nutzt ausschließlich `launchImageLibraryAsync`; `launchCameraAsync` fehlt, obwohl die Kamera-Berechtigung vorhanden ist. Bild: `quality: 0.7`, Zuschnitt 4:5 — Ausrichtung wird vom Picker korrigiert, Größe bleibt ungeprüft (Server-Grenze 4 MB, Fehler wäre „Die Datei ist zu groß."). Der Punktwert lässt sich beim Anlegen nicht setzen (Server: 30), nur nachträglich im Editor. Zurück-Pfeil verwirft alle Eingaben ohne Rückfrage. Doppel-Submit ist über `loading` korrekt gesperrt. Standort-Pflicht bei „Verbleibt bei mir" ist umgesetzt (`:81-84`).

**Fundstelle.** `mobile/app/(visitor)/items/new.tsx:57-70, 72-118, 125`.

**Auswirkung.** Im Laden muss die Helferin erst ein Foto mit der Kamera-App machen und dann in der Galerie suchen; ein versehentlicher Wisch zurück löscht das halb ausgefüllte Formular.

**Empfehlung.** Auswahl „Aufnehmen / Aus Galerie", optionales Punktefeld für das Team, Warnung bei ungespeicherten Eingaben.

### F-14 — Große Listen als ScrollView+map, QR-SVG je Inventarzeile (MITTEL, aus Code gelesen)

**Beschreibung.** Laden (`getFullList`, alle freigegebenen Teile), Inventar (`getFullList`, alle Teile aller Status, mit `expand`) und Sammlung rendern jeweils alle Einträge sofort; das Inventar erzeugt pro Zeile zusätzlich ein `QRCode`-SVG. Bilder haben feste Maße (gut), aber kein explizites Caching. Paginierung bricht dagegen nirgends ab: Laden/Inventar laden vollständig, Schaufenster 12 bzw. 200, Freigabe 100.

**Fundstelle.** `mobile/app/(visitor)/store.tsx:266-273`, `items/index.tsx:100, 237-240`, `badges.tsx:200-287`; `lib/hooks/useData.ts:67-104`.

**Auswirkung.** Bei einigen hundert Teilen wird das Inventar spürbar träge (hunderte SVG-Codes werden gezeichnet, obwohl nur zehn sichtbar sind); der Laden lädt jeden Mount neu (`staleTime: 0`).

**Empfehlung.** `FlatList` mit `keyExtractor` für Laden und Inventar; QR-Vorschau im Inventar lazy oder nur in der Detailansicht.

### F-15 — Aktion am selben Tag kann als „Ende vor Start" abgewiesen werden (MITTEL, aus Code gelesen)

**Beschreibung.** `DateField` initialisiert den Entwurf mit `new Date()` — inklusive aktueller Uhrzeit — und gibt das Datum mit dieser Uhrzeit zurück. `save` vergleicht `end < start` auf ganze Zeitstempel. Wer für eine Ein-Tages-Aktion erst „Bis" und dann „Von" wählt, hat `start` einige Sekunden nach `end` → „Das Enddatum muss nach dem Startdatum liegen." Gespeichert würde ohnehin 00:00 bis 23:59:59 (`dayStartIso`/`dayEndIso`).

**Fundstelle.** `mobile/app/(visitor)/admin/actions.tsx:35-43, 51-52, 65-67`; `mobile/components/ui/DateField.tsx:38, 88, 149`.

**Auswirkung.** Ein Tages-Event („Nightshopping") lässt sich je nach Reihenfolge der Eingabe nicht anlegen; die Meldung ist irreführend.

**Empfehlung.** Vor dem Vergleich beide auf Tagesbeginn normieren (`dayStartIso(end) < dayStartIso(start)`).

### F-16 — Pluralformen (NIEDRIG, aus Code gelesen)

`scan.tsx:214` „+10 Punkte · 1 Wochen Streak"; `scan.tsx:239` „1 Teile gutschreiben"; Server-Label `points.js:313, 339` „1 Teile mitgenommen" landet so in der Historie; `items/[id].tsx:94` „1 Punkte" möglich. Vorbild ist `index.tsx:354` („Teil wartet / Teile warten").

### F-17 — Begriffe uneinheitlich (NIEDRIG, aus Code gelesen)

„Streak" (`format.ts:344-357`, `scan.tsx:214`) neben „Serie" (`push.ts:23-25`, `account.tsx:292`); „Badges" (`points.tsx:19`, `admin/badges.tsx:390, 403, 410, 443`) neben „Abzeichen" (Sammlung, Blatt, Hinweise); „Helfer" (`items/new.tsx:110, 131`) neben „Team"; „30 P" (`store.tsx:84`, `items/index.tsx:84`) neben „+30 Punkte" (`ShowcaseCard.tsx:38`). Der CHANGELOG verwendet durchgehend Serie, Abzeichen, Team.

### F-18 — QR-Bogen: CHANGELOG und Code widersprechen sich; archivierte Teile werden gedruckt (NIEDRIG, aus Code gelesen)

CHANGELOG 1.0.0 (33) verspricht „vier Etiketten pro Reihe, je mit … Zustand, Nummer und Punktwert". Code: Etikett 60 mm + 4 mm Abstand auf 190 mm Nutzbreite → **3 je Reihe** (`qrsheet.ts:66-77`); Punktwert und Zustand bewusst weggelassen (`:41-42`). `printSheet` filtert nur `taken_at` (`items/index.tsx:185`) — unter „Alle" bekommen auch **archivierte** und noch **ungeprüfte** Teile ein Etikett. Inhalt der Codes (`qr_code || sku`) stimmt mit `scan.pb.js:123` (Suche nach `qr_code`) überein, solange `qr_code` gesetzt ist (Server setzt es beim Anlegen, `defaults.pb.js:62-64`); Escaping deckt `& < > "` ab, Umlaute laufen über `charset=utf-8`, lange Titel werden auf zwei Zeilen gekappt.

### F-19 — Aushang: Motivations-Pill aus Leit-Faktor, Zielgruppe unberücksichtigt (NIEDRIG, aus Code gelesen)

`index.tsx:73` speist `campaignBonusLabel(leadCampaign?.multiplier)` — den Maximalfaktor aller Typen. Erhöht eine Aktion nur „Bringen ×2", lautet die Pill „Doppelte Punkte" und der Text „jetzt vorbeikommen lohnt sich besonders" (`format.ts:331-339`) — Vorbeikommen bringt aber nichts extra. Die Aktionskarten darunter zeigen die Faktoren korrekt je Typ (`index.tsx:218-263`). `useActiveCampaigns` filtert nicht nach `target_segment`; der Server wendet Aktionen nur auf die Zielgruppe an (`points.js:200-215`). Der App-Editor bietet keine Zielgruppe an, das Feld ist nur über die PocketBase-Verwaltung erreichbar — dann sähe ein Besucher eine Aktion, die für ihn nicht gilt. Kommende Aktionen werden weder Besuchern noch (als „kommend") dem Admin angezeigt (`actions.tsx:183-186, 239` nur „aktiv").

### F-20 — Rollen-Gating rein clientseitig; Geheim-Abzeichen nur in der UI verborgen (NIEDRIG, aus Code gelesen)

Sichtbarkeit: Tab „Teile" nur Staff (`TabBar.tsx:45, 77`), Verwaltungslinks nur Staff/Admin (`account.tsx:416-428`), Teil-Editor nur Staff (`items/[id].tsx:70`). Die Screens selbst (`items/index`, `items/review`, `admin/*`) prüfen keine Rolle; per Deep Link (`pp://`) erreicht ein Besucher sie und sieht Knöpfe, die mit 403 („Dafür fehlt dir die Berechtigung.") scheitern. **Serverseitig ist alles abgesichert:** items update/create volunteer|admin (`1700000600_item_location_status.js:33-34`), campaigns/badges/store admin (`1700000000_init_schema.js:111-113, 202-204, 333-335`), needs volunteer|admin (`1700000700_badge_kinds_actions.js:63-65`), push_messages admin (`init_schema.js:298`, in der App durch `canPush` berücksichtigt, `needs.tsx:37-38`), Lesen von items nach Status/Eigentum (`1782710000_tighten_read_rules.js`). Der Vorbefund „Volunteer sieht Push-Schalter" ist behoben. Geheime Abzeichen: Name und Beschreibung kommen mit `useBadges` auf jedes Gerät (`badges` listRule `@request.auth.id != ""`); verborgen wird nur in der Darstellung — für eine Spielmechanik vertretbar, aber kein Schutz.

### F-21 — Abzeichen-Editor: `tier_diamant` bleibt beim Umschalten stehen; Listenzeile unvollständig (NIEDRIG, aus Code gelesen)

`draftToInput` nullt für `single` nur bronze…platin (`admin/badges.tsx:99-100`), nicht `tier_diamant`/`reward_diamant`. Ein gestuftes Abzeichen mit Diamant-Ziel, auf „Einzel" umgestellt, behält die Schwelle; die App würde es dann über `badgeTierInfo` ab dieser Schwelle als „verdient" zeigen (siehe F-1, umgekehrter Fall), der Server bewertet Einzel über `trigger_value`. Die Übersichtszeile zeigt `bronze/silber/gold/platin` ohne Diamant (`:427`), bei Einzel-Abzeichen „0/0/0/0". `slug` wird aus dem Namen gebildet; zwei gleiche Namen ergeben einen 400 („Die Eingabe passt so nicht.") ohne Nennung der Ursache.

### F-22 — Punkte-Historie auf 300 Einträge begrenzt (NIEDRIG, aus Code gelesen)

`usePointsLog(300)` → `getList(1, 300)` (`points.tsx:40`, `useData.ts:197`), kein Nachladen. Bei wöchentlichem Besuch mit Teilen (~5 Einträge/Woche) ist die Grenze nach gut einem Jahr erreicht; ältere Einträge fehlen still. `weekTotal` ist davon nicht betroffen.

### F-23 — E-Mail-Hinweis aktualisiert sich spät (NIEDRIG, aus Code gelesen)

Der Hinweis hängt an `['me']` (`index.tsx:102`, `useData.ts:6-16`) mit `staleTime` 30 s und ohne Fokus-Refetch (`queryClient.ts:8`). Die Tabs bleiben gemountet, also kein Refetch beim Tab-Wechsel. Er verschwindet nach Bestätigung erst durch Pull-to-Refresh, einen Scan (`qc.invalidateQueries()`, `scan.tsx:71`) oder Neustart. Der Weg ins Profil und der Text sind in Ordnung.

### F-24 — Löschen ohne Fehlerbehandlung, stiller Rückfall am Schaufenster-Schalter (NIEDRIG, aus Code gelesen)

`actions.tsx:97` und `needs.tsx:84` rufen `deleteCampaign`/`deleteNeed` im Dialog ohne `try/catch` — scheitert es, passiert sichtbar nichts. `items/[id].tsx:197` setzt den Schalter bei Fehler zurück, ohne zu sagen, warum.

### F-25 — Datum ohne Jahr ab 7 Tagen (NIEDRIG, aus Code gelesen)

`relativeDay` (`format.ts:258-267`) gibt ab dem 7. Tag „26. September" ohne Jahr — bei Einträgen aus dem Vorjahr nicht unterscheidbar. Zeitzone: Gerätezeit, `de-DE`; passend für eine persönliche Historie.

---

## Screen-für-Screen: geprüft und in Ordnung

**index.tsx (Startseite).** Rang über `nextTier(total, store.tiers_json)` (`:55-56`) — Rückfallwerte gleich dem Migrations-Seed (reproduziert), „—" unterhalb des ersten Rangs, Fortschritt 0..1 geklemmt (`format.ts:167-186`). Serie aus `users.streak_weeks`, vom Server geschützt (`defaults.pb.js:26-44`) und nächtlich zurückgesetzt (`cron.pb.js:59-91`). Ring ist statisches SVG ohne Reanimated (`GradientRing.tsx`); Worklet-Test grün, einziger Worklet in `Toggle.tsx:19-28` mit vorab berechneten Farben. Aushang: Ankündigungen einer laufenden Aktion werden korrekt geschluckt (`:60-61`), Faktoren je Typ (`:218-263`). „Neu im Laden": 6 neueste freigegebene, nicht vergebene Teile (`useData.ts:51-64`). Freigabe-Karte nur für Staff (`:297-359`), Zähler mit korrektem Plural. Pull-to-Refresh invalidiert alles (`:49-53`). E-Mail-Hinweis versperrt nichts und führt ins Profil.

**store.tsx (Laden).** Filter Zielgruppe/Art/Größe/Aufbewahrung/Schaufenster/Neu kombinierbar, Art nur bei Damen/Herren (`:231`), Größen numerisch sortiert `de` (`:203`), Ergebniszähler mit Plural (`:371`), leerer Zustand (`:274-279`), Pull-to-Refresh (`:178-182`), extern gelagerte Teile mit Schild (`:58-78`). Detail-Link mit `from` für den Rückweg (`:269`).

**showcase.tsx.** Leerer Zustand vorhanden (`:67-71`), 200er-Limit reicht für ein kuratiertes Schaufenster — aber unerreichbar (F-11).

**items/index.tsx (Inventar).** Statuspillen in sinnvoller Vorrangordnung (`:28-34`), Aktionen nur bei nicht vergebenen Teilen (`:105`), Doppeltippen über `busy` gesperrt (`:42-52`), Fehler mit `errorText` (`:48`), Änderungen invalidieren alle sechs Bestandsansichten (`:161-164`, `queryClient.ts:21-33`). Schaufenster-Knopf zeigt jetzt den Zustand (CHANGELOG-Fix, `:124`). Druck nur für die gefilterte Auswahl mit Leer-Prüfung (`:184-199`).

**items/[id].tsx (Detail/Bearbeiten).** Besucheransicht ohne `location` (`:124-125`, Kommentar hält die Absicht fest), extern/Scan-Hinweis je nach Lagerort (`:130-138`), Kategorie aus der einen Quelle in `format.ts` (`:36-41`), Hydrierung an `item.id` gebunden (`:48-58`), Speichern mit Foto per FormData (`:162-174`), Archivieren mit Rückfrage (`:200-205`).

**items/new.tsx (Einstellen).** Pflicht: Name, Ziel („Bringe ich in den Laden" / „Verbleibt bei mir"), Standort bei „Verbleibt bei mir" (`:72-84`); Standort wird nur gespeichert, wenn erfasst (`:85-88`); Schaufenster nur Staff, Server erzwingt es zusätzlich (`defaults.pb.js:84`); Status setzt der Server (`defaults.pb.js:79-81`); Erfolgsdialog mit Rückweg und Invalidierung (`:105-111`); Doppel-Submit gesperrt (`:343`).

**items/review.tsx (Freigabe).** Aktionsabfrage vor der Freigabe (`:45-55`), getrennte `busy`-Zustände je Knopf (`:29`), Fehler mit `errorText`, leerer Zustand (`:191-197`), Einreicher:in und Abhol-Standort sichtbar (`:102-117`), QR-Vorschau, Rückweg mit `from`.

**points.tsx (Historie).** Nur eigene Einträge (`useData.ts:194-200`), Gruppierung nach Tag, Uhrzeit `de-DE`, Vorzeichen und Farbe je Betrag (`:183-186`), leerer Zustand je Filter, Pull-to-Refresh invalidiert Historie und Konto (`:45-50`).

**badges.tsx (Sammlung).** Gestufte Abzeichen: Stufennamen und -anzahl aus den Rängen (`badgeTierSlots`), Fortschritt und nächste Stufe stimmen mit `reachedTier` überein (reproduziert, 5 und 3 Ränge), Ring-Verlaufs-IDs je Abzeichen eindeutig (`:238`, `GradientRing.tsx:32`), Blatt mit allen Stufen und Stand je Stufe (`:110-147`), Geheim-Verhüllung für gestufte Abzeichen korrekt (`:210`), eigene Farbe bei Einzel-Abzeichen validiert (`normalizeHex`).

**settings/store.tsx (Ladeninfos).** Öffnungszeiten aus `hours_json` im Seed-Format „15-18" → „15 – 18 Uhr" (`:20-26`), Route/Telefon über `Linking` — aber unerreichbar (F-11). Kein Türgeheimnis in der App, richtig.

**admin/actions.tsx.** Faktoren ×1/×2/×3 je Typ, `multiplier` = Maximum für Sortierung/Altbestand (`:77`) — deckungsgleich mit `campaignBestMult` im Server; Zeitraum als lokale Tagesgrenzen in UTC (`:38-43`); Ende-vor-Start-Prüfung vorhanden (F-15 zur Uhrzeit); Änderungen invalidieren Aushang und Ankündigungen (`:180`, `queryClient.ts:39-45`); Faktorenzeile getrennt vom Zeitraum (CHANGELOG-Fix, `:230-237`).

**admin/badges.tsx.** Stufenzeilen aus den Rängen (`:121, 313-326`), Kopplung Abzeichen↔Aktion beidseitig gepflegt (`:146-151`), Schwelle bei Aktions-Teilnahme ausgeblendet, weil der Server sie nicht auswertet (`:288-295`, `points.js:573`), Pflicht Name und gekoppelte Aktion (`:130-137`), Löschen mit Rückfrage und Fehlerbehandlung (`:160-177`).

**admin/needs.tsx.** Push nur Admin und nur beim Anlegen (`:33-38`) — Vorbefund behoben; Push-Fehler hält den Dialog offen, bis quittiert (`:64-69`); `campaign: ''` statt `undefined`, damit die Verknüpfung lösbar bleibt (`:49-51`); Hinweis, dass verknüpfte Ankündigungen während der Aktion unsichtbar sind (`:156-165`).

**admin/tiers.tsx.** Ränge strikt aufsteigend, Name Pflicht, Leerzeilen verworfen (`:69-85`), `max_items_take ≥ 1` (`:63-67`), Speichern invalidiert `store` (`:91-92`), Hydrierung an `store.id`.

**scan.tsx / QRScanner.tsx.** Entprellung an `active` gekoppelt statt an einen Timer (`QRScanner.tsx:23-31`) — der Vorbefund ist behoben; Standort mit 3-s-Zeitgrenze, danach ohne Koordinaten (`scan.tsx:42-60`), Server trägt die Prüfung über den Code (`points.js:685-691`); Standortberechtigung erst beim Scan erfragt, Ablehnung ohne Blockade; Fehlertexte des Servers wörtlich („Du bist nicht im Laden", „Schon mitgenommen", „Höchstens N Teile pro Besuch.") über `errorText` (`errors.ts:36-37, 83-84`); Rückfallwerte gegen „undefined" gesetzt (`:182, 214`); Stepper-Maximum aus `store.max_items_take` wie der Server (`:32`, `scan.pb.js:71-75`); Haptik bei Erfolg/Fehler; Rückweg über `router.back()` im Erfolgs- und Fehlerfall. Keine Taschenlampe, keine manuelle Code-Eingabe (siehe Unklar).

**lib/qrsheet.ts.** Code-Inhalt = `qr_code || sku`, identisch zur Server-Suche; HTML-Escaping; Codes als `data:`-URI (offline vollständig); A4 mit `@page`; Fehlerkorrektur M; Rückfall auf Druckdialog ohne Teilen-Funktion (`:94-100`).

**lib/format.ts.** Kategorie-Quelle für die ganze App, `de-DE`-Zahlen (`:189`), Farb-Helfer validieren streng (`:395-401`), Motivationslogik mit Plural (`:344, 354`).

**lib/icons.tsx.** Feste Namenszuordnung mit Rückfall `circle` (`:238`); `BADGE_ICONS` ohne Werkzeug-Symbole; die App verwendet nur definierte Namen.

**Texte.** Alle Nutzertexte deutsch, Backend-Meldungen deutsch; Datumsformate `de-DE` bzw. TT.MM.JJJJ (`DateField.tsx:9-14`); Ausnahmen in F-16/F-17.

---

## Unklar / zu klären

1. **Geänderte Schwellen bei gestuften Abzeichen.** Der Server stuft nie herab (`points.js:588`), die App rechnet aus `progress` und Schwellen neu. Hebt ein Admin eine Schwelle an, zeigt die App eine niedrigere Stufe als der Server gespeichert hat; die Bonuspunkte bleiben. Ob das gewollt ist, muss fachlich entschieden werden; die Lösung von F-1 (Stufe aus `current_tier`) würde beide Seiten angleichen.
2. **`tiers_json` als Zeichenkette.** Der Server dokumentiert, dass ein JSON-Feld je Schreibweg als Array oder als String kommt (`points.js:498-516`). Über die REST-API liefert PocketBase JSON-Felder als natives JSON, die App hat daher keinen `asArray`-Schutz — `nextTier`/`badgeTierSlots` würden bei einem String mit `.sort is not a function` abstürzen. Nicht reproduzierbar ohne laufende Instanz; gegen die Produktion zu prüfen (`GET /api/collections/store/records`).
3. **Legacy-Teile ohne `qr_code`.** Etiketten und Detailansicht zeigen `qr_code || sku`; der Server sucht nur nach `qr_code`. Existieren in der Instanz Teile mit leerem `qr_code` (Altbestand vor `defaults.pb.js`), scannt ihr Etikett ins Leere („Unbekannter QR-Code"). Datenbestand der Instanz prüfen.
4. **Serie „läuft am X ab".** Die App nennt kein Ablaufdatum; die Motivation warnt ab 7 Tagen ohne Besuch (`format.ts:342`), die Serie reißt aber erst nach Ende der Folge-Kalenderwoche (`cron.pb.js:85`). Ob eine Erinnerungs-Push mit Datum existiert, liegt außerhalb dieses Bereichs (`lib/push.js`, `push_messages`).
5. **Sortierung des Leit-Aushangs.** `useActiveCampaigns` sortiert nach `-multiplier`, der Server nach `campaignBestMult`. Für in der App angelegte Aktionen ist beides gleich (`multiplier` = Maximum); für Aktionen, die direkt in PocketBase gepflegt wurden, kann die App eine andere Aktion nach vorn stellen als der Server anwendet.
6. **Taschenlampe und manuelle Eingabe.** Beides fehlt im Scanner. Ob es im Laden (Beleuchtung, beschädigte Etiketten) gebraucht wird, ist eine fachliche Frage; als Befund nicht gewertet.
7. **Bildgröße beim Upload.** `quality: 0.7` ohne Maßbegrenzung; ob aktuelle Geräte damit unter der Server-Grenze von 4 MB bleiben, wäre am Gerät zu messen. Der Fehlertext „Die Datei ist zu groß." ist vorbereitet (`errors.ts:101-102`).
8. **TypeScript-Prüfung.** `tsc --noEmit` konnte ohne `mobile/node_modules` nicht laufen. Die Verwendung von `campaignFactorsLabel`, `TIER_COLORS[info.current]` u. ä. wurde nur gelesen, nicht vom Compiler bestätigt.
9. **Produktionsstand.** Alle Aussagen gelten für den Repo-Stand. Ob die Instanz unter `/opt/stacks/plietsche-pb/` die Regel-Migrationen (`1782710000_tighten_read_rules.js`) und Hooks dieses Stands trägt, prüft das Backend-/Deploy-Audit; die Rollen-Aussagen in F-20 setzen es voraus.
