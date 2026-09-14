# Redundanz-Audit — überflüssiger, doppelter und toter Code

Stand: 14.09.2026 · Umfang: `mobile/app/`, `mobile/components/`, `mobile/lib/`,
`pocketbase/pb_hooks/`, `docs/openapi.yaml`, Repo-Wurzel.
Ausgenommen: `ios/`, `android/`, `node_modules`, `.git`.

**Es wurde kein Code geändert.** Die Befunde sind Vorschläge, keine Eingriffe.

## Wie geprüft wurde

- Verwender wurden mit `grep -rn` über das **ganze** Repo gesucht, nicht nur über
  den Ordner des Fundes. Bei jedem Befund steht das Belegkommando.
- Ungenutzte lokale Bezeichner kommen zusätzlich aus dem Compiler:
  `npx tsc --noEmit --noUnusedLocals --noUnusedParameters -p tsconfig.json`
  (in `mobile/`). Der Compiler sieht auch, was ein `grep` überliest.
- Abhängigkeiten wurden gegen `package-lock.json` gegengeprüft: Ein Paket ohne
  Import kann trotzdem als Peer eines anderen gebraucht werden.
- Vor dem Audit liefen die Tests: **173 Tests in 7 Dateien, alle grün.**
  Der Compiler meldet ohne die Zusatzschalter keinen Fehler.

Expo Router lädt Dateien allein über ihren Pfad, ohne Import. Deshalb wurde
**keine** Datei unter `mobile/app/` als ungenutzt gemeldet — dort ist die Lage
über `grep` grundsätzlich nicht zu klären, und alle Dateien entsprechen einer
erreichbaren Route.

---

## Sicher löschbar

Kein Verwender im Repo, keine Route, kein Vertrag nach außen.

### 1. Fünf Komponenten ohne jeden Verwender

| Datei | Zeilen | Export |
|---|---|---|
| `mobile/components/ui/GlassCard.tsx` | 81 | `GlassCard` |
| `mobile/components/ui/Toast.tsx` | 101 | `Toast` |
| `mobile/components/ui/ProgressBar.tsx` | 46 | `ProgressBar` |
| `mobile/components/ActivityRow.tsx` | 61 | `ActivityRow` |
| `mobile/components/ui/Stat.tsx` | 29 | `Stat` |

Zusammen **318 Zeilen**. Alle fünf sind in `mobile/components/ui/index.ts`
(Zeilen 3, 5, 13, 15) re-exportiert — der Barrel-Eintrag ist der einzige
Treffer, den `grep` außerhalb der Datei selbst findet.

```bash
grep -rn "\bGlassCard\b" mobile/app mobile/components mobile/lib tests \
  | grep -v "mobile/components/ui/index.ts"
# → nur mobile/components/ui/GlassCard.tsx:24 (die Definition selbst)
```
Dasselbe Ergebnis für `Toast`, `ProgressBar`, `ActivityRow`, `Stat`.

Anmerkung zu `GlassCard`: Der einzige weitere Treffer auf „TabBar" stammt aus
einem **Kommentar** in `GlassCard.tsx:54`, nicht aus einem Import. Die
tatsächliche Glasfläche der Tab-Leiste steckt eigenständig in
`mobile/components/TabBar.tsx` (`GlassTabBar`, genutzt in
`mobile/app/(visitor)/_layout.tsx:3`). `GlassCard` hat damit auch fachlich
keinen Platz mehr.

Anmerkung zu `ProgressBar`: Enthält eine eigene Tier-Farbtabelle
(`TIER_COLOR`, Zeilen 12–17) **ohne** `diamant` — sie ist also nicht nur
ungenutzt, sondern seit der Einführung der fünften Stufe auch unvollständig.
Die gepflegte Fassung ist `tierColor()` in `mobile/lib/format.ts:240`.

**Löschbar:** ja, samt der vier Zeilen im Barrel. Reines UI, keine API.

### 2. `campaignFactorsLabel` — Funktion ohne einen einzigen Aufruf

`mobile/lib/format.ts:228–237`

```bash
grep -rn "campaignFactorsLabel" . --exclude-dir=node_modules \
  --exclude-dir=.git --exclude-dir=ios --exclude-dir=android
# → nur mobile/lib/format.ts:228 (die Definition)
```

Die Funktion baut den Fließtext „Vorbeikommen ×3 · Mitnehmen ×1,5". Genau
diesen Text baut ein zweites Mal `campaignTypesLabel` in
`mobile/app/(visitor)/admin/actions.tsx:35` — die ebenfalls niemand aufruft
(siehe „Doppelte Logik", Punkt 1). Es gibt also zwei Fassungen derselben
Formatierung, und beide sind tot.

**Löschbar:** ja, beide.

### 3. Zwei Typen ohne Verwender

- `mobile/lib/format.ts:278–287` — `interface Motivation`
- `mobile/lib/format.ts:289–302` — `interface MotivationInput`

```bash
grep -rn "MotivationInput\|: Motivation\b" . --exclude-dir=node_modules \
  --exclude-dir=.git --exclude-dir=ios --exclude-dir=android
# → nur format.ts:289 und format.ts:304
```

**Achtung, kein Pauschal-Löschen:** `motivationFor()` (Zeile 304) **wird**
benutzt (2 Treffer in `mobile/app/(visitor)/index.tsx`) und nutzt beide Typen
in seiner eigenen Signatur. Die Typen sind also nicht tot, sondern nur
unnötig **exportiert**. Richtig ist, das `export` zu entfernen, nicht den Typ.

### 4. Ungenutzte lokale Bezeichner (Compiler-Befund)

Vollständige Liste aus `tsc --noUnusedLocals --noUnusedParameters`:

| Datei:Zeile | Bezeichner |
|---|---|
| `mobile/app/(visitor)/admin/actions.tsx:35` | `campaignTypesLabel` (Funktion, 10 Zeilen) |
| `mobile/app/(visitor)/admin/actions.tsx:174` | `router` |
| `mobile/app/(visitor)/admin/badges.tsx:338` | `router` |
| `mobile/app/(visitor)/admin/needs.tsx:158` | `router` |
| `mobile/app/(visitor)/admin/tiers.tsx:11` | `Card` (Import) |
| `mobile/app/(visitor)/admin/tiers.tsx:24` | `router` |
| `mobile/app/(visitor)/items/[id].tsx:25` | `router` |
| `mobile/app/(visitor)/items/new.tsx:35` | `router` |
| `mobile/app/(visitor)/settings/push.tsx:1` | `Pressable` (Import) |
| `mobile/app/(visitor)/settings/push.tsx:23` | `router` |
| `mobile/app/(visitor)/settings/store.tsx:30` | `router` |
| `mobile/app/(visitor)/showcase.tsx:45` | `router` |
| `mobile/components/QRScanner.tsx:1` | `useState` (Import) |
| `mobile/components/QRScanner.tsx:4` | `PP` (Import) |
| `mobile/components/ui/IconButton.tsx:2` | `surfaceElevation` (Import) |
| `mobile/components/ui/Toggle.tsx:1` | `View` (Import) |

Auffällig: **neun** Vorkommen von `const router = useRouter()` ohne einen
einzigen Aufruf von `router`. Das ist der Rückstand aus der Umstellung auf
`useGoBack()` (`mobile/lib/hooks/useGoBack.ts`), die die Navigation
übernommen hat — die alte Zeile blieb jedes Mal stehen. Mit ihr fällt in
mehreren Dateien auch der Import `useRouter` weg.

**Löschbar:** ja, alle. Reine Interna.

### 5. Drei Abhängigkeiten ohne Import

`mobile/package.json`

| Paket | Zeile | Befund |
|---|---|---|
| `tar` (`^7.5.22`) | 47 | kein Import, kein Peer |
| `zustand` (`^5.0.15`) | 51 | kein Import, kein Peer |
| `expo-system-ui` (`~57.0.2`) | 39 | kein Import, kein Peer, nicht in `app.json` |

```bash
grep -rnE "from ['\"]tar['\"]|require\(['\"]tar['\"]\)" \
  mobile/app mobile/components mobile/lib      # → keine Treffer
grep -rn "zustand" mobile/app mobile/components mobile/lib mobile/app.json
                                                # → keine Treffer
grep -rn "expo-system-ui\|SystemUI" \
  mobile/app mobile/components mobile/lib mobile/app.json   # → keine Treffer
```

Gegenprobe auf Peers über `package-lock.json`: für alle drei
`required by: NOBODY`. Zum Vergleich: `react-native-screens`, `expo-linking`
und `@expo/metro-runtime` haben ebenfalls keinen direkten Import, werden aber
von `expo-router` verlangt — **die bleiben.**

`tar` in einer React-Native-App ist ein Node-Paket ohne Zweck auf dem Gerät.
`zustand` ist bemerkenswert: `CLAUDE.md` führt es als Client-State-Bibliothek
des Projekts, tatsächlich benutzt die App ausschließlich TanStack Query und
lokalen `useState`. Beim Entfernen gehört der Satz in `CLAUDE.md` und
`TECH.md` mit korrigiert.

**Löschbar:** ja. Danach `npm --prefix mobile install` und einen Build laufen
lassen — Metro zieht Pakete nur über Importe, ein Fehler fiele sofort auf.

---

## Wahrscheinlich löschbar, Prüfung nötig

### 6. `unregisterPushToken` — tot im Code, aber das ist der eigentliche Fehler

`mobile/lib/push.ts:87–99`

```bash
grep -rn "unregisterPushToken" mobile/app mobile/components mobile/lib tests
# → nur mobile/lib/push.ts:87 (die Definition)
```

Die Funktion ruft `POST /api/pp/push/unregister` — die einzige Stelle im Repo,
die das täte. **Kein Verwender heißt hier nicht „überflüssig", sondern
„vergessen".** Der Kommentar über der Funktion nennt den Zweck: „DSGVO-Opt-out
/ Logout".

Der Abmelde-Weg läuft heute über `useAuth().logout` in
`mobile/lib/hooks/useAuth.ts:68`, und der ist eine einzige Zeile:
`pb.authStore.clear()`. Der Push-Token bleibt damit auf dem Server stehen und
dem abgemeldeten Konto zugeordnet. Meldet sich danach jemand anders auf dem
Gerät an, verschiebt zwar `push/register` den Token (`push.pb.js:19–24`), aber
bis dahin bekommt das Gerät weiter die Nachrichten des vorigen Kontos.
Benutzt wird `logout` an zwei Stellen:
`mobile/app/(visitor)/settings/store.tsx:137` und
`mobile/app/(visitor)/settings/account.tsx:264`.

**Nicht löschen.** Der richtige Schritt ist, `logout` in `useAuth.ts:68` vor
`authStore.clear()` `unregisterPushToken()` aufrufen zu lassen. Das ist eine
Verhaltensänderung und braucht nach Projektregel einen Test im selben Commit.

**Kann das eine alte App-Version brechen?** Nein. Die Route bleibt, wie sie
ist; es kommt nur ein Aufrufer dazu. Alte App-Versionen rufen sie ohnehin nicht.

### 7. Ungenutzte Exporte in `mobile/lib/theme.ts`

| Zeile | Export | Befund |
|---|---|---|
| 99 | `type PPTheme` | kein einziger Treffer im Repo |
| 113 | `const isIOS` | kein einziger Treffer im Repo |
| 120 | `const MD3_STATE` | nur intern, `theme.ts:183` |
| 145 | `const MD3_ELEVATION` | nur intern, `theme.ts:191` |
| 151 | `function radius` | **kein Aufruf** im Repo |
| 159 | `function stateLayer` | nur intern, `theme.ts:183` |

```bash
grep -rn "\bPPTheme\b\|\bisIOS\b" mobile/app mobile/components mobile/lib tests
# → nur theme.ts:99 und theme.ts:113
grep -rnE "[^a-zA-Z]radius\(" mobile/app mobile/components mobile/lib \
  | grep -v "lib/theme.ts"    # → keine Treffer
```

Die Prüfung auf `radius(` musste mit Wortgrenze laufen: ein schlichtes
`grep radius` liefert 24 Treffer, die aber alle `borderRadius:` sind — die
Funktion selbst ruft niemand.

`MD3_STATE`, `MD3_ELEVATION` und `stateLayer` sind **nicht tot**, sie werden
nur nicht von außen gebraucht: `ripple()` und `surfaceElevation()` benutzen sie
intern, und diese beiden sind mit 8 bzw. 10 Treffern gut in Gebrauch. Hier also
nur das `export` entfernen, nicht den Code.

`PPTheme`, `isIOS` und `radius` sind vollständig tot. **Prüfung nötig, weil**
`isIOS` und `radius` erkennbar zur Plattform-Schicht gehören (`CLAUDE.md`:
„Liquid Glass (iOS) + MD3 (Android) aus einer Codebasis"). Sie sind als
Gegenstücke zu `isAndroid` (27 Treffer) und `surfaceElevation` gedacht. Ob sie
weg sollen oder noch gebraucht werden, ist eine Design-Entscheidung — technisch
sind sie entbehrlich.

### 8. Zwei ungenutzte Typ-Exporte in `mobile/lib/types.ts`

- Zeile 1: `export type Role = 'visitor' | 'volunteer' | 'admin'` — kein Treffer.
  Dieselbe Union steht ein zweites Mal wörtlich in `mobile/lib/pb.ts:36`
  (`role: 'visitor' | 'volunteer' | 'admin'`), dort aber inline statt über den
  Typ. Statt `Role` zu löschen, wäre `pb.ts` besser darauf umzustellen.
- Zeile 70: `export type BadgeKind` — nur intern in `types.ts:79` benutzt.
  Das `export` kann weg, der Typ nicht.

---

## Nicht anfassen (Store-Apps)

Grundlage: `CLAUDE.md`, Abschnitt „Ausgelieferte Apps nie brechen" — eine
Version im Store ist Leserin der API und lässt sich nicht mitdeployen.

### Alle drei selbstgebauten Routen bleiben

| Route | Hook | Aufrufer im Repo | In `openapi.yaml` |
|---|---|---|---|
| `POST /api/pp/scan` | `scan.pb.js:10` | `mobile/lib/api.ts:24` | ja (Z. 42) |
| `POST /api/pp/push/register` | `push.pb.js:7` | `mobile/lib/push.ts:36` | ja (Z. 199) |
| `POST /api/pp/push/unregister` | `push.pb.js:34` | **keiner** (siehe Punkt 6) | ja (Z. 253) |

```bash
grep -rn "routerAdd" pocketbase/pb_hooks/    # → genau diese drei
grep -rn "/api/pp" mobile/                   # → api.ts:24, push.ts:36, push.ts:92
```

**`/api/pp/push/unregister` hat im Repo keinen aktiven Aufrufer — und ist
trotzdem tabu.** Genau der Fall, vor dem `CLAUDE.md` warnt: Dass der Aufruf
hier fehlt, sagt nichts darüber, ob eine ältere App-Version auf einem Gerät ihn
schickt. Diese Route ist der Widerruf der Push-Einwilligung; sie zu entfernen
hieße, eine DSGVO-Funktion für bestehende Installationen abzuschalten. Sie
bleibt, unabhängig davon, ob Punkt 6 umgesetzt wird.

**Kann ein Löschen eine alte App-Version brechen?** Ja, bei allen dreien.
`/api/pp/scan` trägt die gesamte Kernfunktion der App.

### Keine Route fehlt, keine ist zu viel dokumentiert

`docs/openapi.yaml` deckt exakt die drei vorhandenen Routen ab. Geprüft wurde
auch der Inhalt, nicht nur die Pfadliste:

- `CheckinResult` (Z. 307–328) verlangt `type`, `already_checked_in`, `points`,
  `points_total`, `streak_weeks` — `scan.pb.js:66–72` und `:78–84` liefern
  genau diese fünf Felder, in beiden Zweigen.
- `ItemResult` (Z. 330–363) verlangt `type`, `label`, `points`, `item_points`,
  `checkin_points`, `did_checkin`, `points_total` — `scan.pb.js:135–142`
  liefert genau diese sieben. `streak_weeks` ist hier zu Recht **nicht**
  gefordert und wird auch nicht gesendet.
- `Ok` (Z. 365–371): `push.pb.js:31` und `:45` liefern beide `{ ok: true }`.
- Die Fehlercodes 400/401/404/409/410/500 der Doku entsprechen den
  `ApiError`-Würfen in `scan.pb.js` (Z. 13, 16, 31, 53, 88–93, 105) samt der
  deutschen Texte.

**Keine Abweichung gefunden.** Hier ist nichts aufzuräumen.

### `test-qrcodes.html` in der Repo-Wurzel

30.906 Bytes, nirgends referenziert:

```bash
grep -rn "test-qrcodes" . --exclude-dir=node_modules --exclude-dir=.git \
  --exclude=package-lock.json
# → nur .gitignore:55
```

**Die Datei ist bereits in `.gitignore` (Zeile 55), mit Begründung:**
„Test-QR-Codes: enthalten das Tür-Geheimnis des Ladens als Bild". Sie liegt
also nur lokal und ist nie im Repo gelandet — kein Repo-Befund.

Trotzdem ein Hinweis, weil es um ein Geheimnis geht: Laut Projektgedächtnis
wurde der Tür-Code am 03.08.2026 rotiert, die Datei stammt vom 03.08.2026
13:27 Uhr. Ob sie den aktuellen oder einen alten Code zeigt, ist von hier aus
nicht zu sagen. Wer sie nicht mehr braucht, löscht sie lokal — im Repo ist
nichts zu tun. **Kein Grund, an `.gitignore` zu rühren.**

Sonst ist die Wurzel sauber: `CHANGELOG.md`, `CLAUDE.md`, `README.md`,
`TECH.md`, `LICENSE`, `docker-compose.yml`, `package.json`,
`vitest.config.mjs` gehören alle dorthin. `docs/archiv/AUFTRAG-GRUNDLAGEN.md`
ist erkennbar bewusst archiviert.

---

## Doppelte Logik zum Zusammenführen

### 1. Aktions-Faktoren: drei Fassungen derselben Formatierung

| Fundstelle | Zeilen | Zustand |
|---|---|---|
| `mobile/lib/format.ts:208–225` | `campaignFactors` | **benutzt** (2 Treffer) |
| `mobile/lib/format.ts:228–237` | `campaignFactorsLabel` | tot |
| `mobile/app/(visitor)/admin/actions.tsx:23–33` | `campaignFactorRows` | benutzt, lokal |
| `mobile/app/(visitor)/admin/actions.tsx:35–43` | `campaignTypesLabel` | tot |

`campaignFactorRows` ist eine wörtliche Kopie von `campaignFactors`. Der
Unterschied ist **ein einziges Wort**: das erste Label heißt lokal `'Kommen'`
statt `'Vorbeikommen'`. Struktur, Rückfall auf das alte `multiplier`-Feld,
Reihenfolge und Rückgabetyp sind identisch.

Dass es zwei Fassungen gibt, ist bereits sichtbar geworden:
`actions.tsx:236` baut den Fließtext von Hand neu
(`.map((f) => \`${f.label} ×${factorLabel(f.factor)}\`)`) — also ein drittes
Mal das, was `campaignFactorsLabel` täte, wenn es jemand riefe.

**Zusammenführen:** `campaignFactors` aus `format.ts` in `actions.tsx`
importieren, die lokale Kopie samt `campaignTypesLabel` löschen. Wenn dort
wirklich „Kommen" statt „Vorbeikommen" stehen soll, ist das ein Parameter, kein
zweiter Funktionskörper. `campaignFactorsLabel` entweder für Zeile 236 benutzen
oder mitlöschen. **Kein API-Bezug — reine Anzeige, keine alte App betroffen.**

### 2. Geofence-Prüfung zweimal wörtlich in derselben Datei

`pocketbase/pb_hooks/scan.pb.js:51–53` und `:103–105`

```js
// Zeile 51–53 (Tür-Zweig)
distance = lib.distanceM(lat, lng, store.get('lat'), store.get('lng'));
const radius = store.get('geofence_radius_m') || 150;
if (distance > radius) throw new ApiError(400, 'Du bist nicht im Laden');

// Zeile 103–105 (Teile-Zweig)
const d = lib.distanceM(lat, lng, store.get('lat'), store.get('lng'));
const radius = store.get('geofence_radius_m') || 150;
if (d > radius) throw new ApiError(400, 'Du bist nicht im Laden');
```

Identisch bis auf den Variablennamen (`distance` / `d`). Der einzige echte
Unterschied: Der Tür-Zweig **behält** die Distanz, weil `doCheckin` sie später
als `gps_distance_m` in den Besuch schreibt (`points.js:201`); der Teile-Zweig
verwirft sie.

Der Rückfallwert `150` steht hier zweimal fest verdrahtet. Nach Projektregel
(„Punktwerte sind konfigurierbar, nicht fest verdrahtet") gehört so ein
Standardwert an **eine** Stelle — `lib/points.js` hält die anderen Rückfallwerte
bereits in `POINTS` und `DEFAULT_MAX_ITEMS_TAKE` (Z. 6–13).

**Zusammenführen:** eine Funktion `lib.assertInGeofence(store, lat, lng)` in
`points.js`, die die Distanz zurückgibt oder wirft. Beide Zweige rufen sie; der
Tür-Zweig nutzt den Rückgabewert weiter.

**Kann das eine alte App-Version brechen?** Nein, solange Status **400** und der
Text „Du bist nicht im Laden" unverändert bleiben — beide stehen so in
`openapi.yaml:141–152`. Der Umbau darf die Fehlermeldung nicht anfassen.

### 3. Jahreswechsel der ISO-Woche an drei Stellen nachgebaut

| Fundstelle | Ausdruck |
|---|---|
| `points.js:300–303` | `isWeekAdjacent()` — die saubere Fassung, prüft zusätzlich das Jahr |
| `points.js:315` | `thisWeek - lastWeek === 1 \|\| (thisWeek % 100 === 1 && lastWeek % 100 >= 52)` |
| `cron.pb.js:59` | `thisWeek - lastWeek > 1 && !(thisWeek % 100 === 1 && lastWeek % 100 >= 52)` |

Dreimal dieselbe Regel „Woche 1 folgt auf Woche 52/53". `points.js:300`
(`isWeekAdjacent`) ist die gründlichste Fassung: Sie prüft mit
`Math.floor(later / 100) - Math.floor(earlier / 100) === 1` zusätzlich, dass
das Jahr wirklich um genau eins gestiegen ist. **Die beiden Kopien tun das
nicht.** `updateStreak` (`points.js:315`) und der Cron (`cron.pb.js:59`)
würden Woche 202601 auch als Nachfolgerin von Woche 202052 durchgehen lassen —
zwei Jahre Abstand. In der Praxis fällt das kaum auf, weil `streak_last_visit`
selten so alt ist; sauber ist es nicht.

`isWeekAdjacent` wird bislang nur an einer Stelle benutzt (`points.js:289, 293`,
in `streakFromVisits`).

**Zusammenführen:** `points.js:315` und `cron.pb.js:59` auf `isWeekAdjacent`
umstellen. **Das ist eine Verhaltensänderung an der Serien-Logik** — nach
Projektregel („Nichts an der App-Logik ändern, solange kein Test den bisherigen
Stand absichert") erst Tests für den Jahreswechsel schreiben, dann umstellen.
`tests/streak.test.js` und `tests/cron.test.js` sind die passenden Dateien.

**Kann das eine alte App-Version brechen?** Nein — die Serie kommt über die
CRUD-Route des `users`-Datensatzes, das Feld `streak_weeks` bleibt ein Integer.
Nur der berechnete Wert kann sich in einem seltenen Randfall ändern.

### 4. Opt-in-Flag-Zuordnung zweimal in `lib/push.js`

`pocketbase/pb_hooks/lib/push.js:12–17` und `:59–64` — Zeichen für Zeichen
derselbe Block:

```js
const flag =
  category === 'streak' ? 'push_streak_enabled'
  : category === 'campaign' ? 'push_campaign_enabled'
  : category === 'badge' ? 'push_badge_enabled'
  : 'push_other_enabled';
```

Dazu kommt in beiden Funktionen dieselbe Geräte-Schleife
(`collectTokens` Z. 41–50, `tokensForUser` Z. 66–76): `push_devices` für einen
Nutzer laden, `expo_token` trimmen, `{token, userId, deviceId}` sammeln,
Fehler schlucken.

**Zusammenführen:** `flagFor(category)` und `devicesOf(user)` als zwei kleine
Helfer; `collectTokens` und `tokensForUser` rufen beide. Der echte Unterschied
zwischen den Funktionen — `collectTokens` filtert zusätzlich nach Segment
(Z. 32–40) — bleibt unberührt.

**Kein API-Bezug**, beides ist serverintern. Keine alte App betroffen.

### 5. Kleinere Wiederholungen (Hinweis, kein Auftrag)

- `new Date().toISOString().replace('T', ' ')` — die PocketBase-Filter-Schreibweise
  eines Zeitstempels: `mobile/lib/hooks/useData.ts:126` und `:156`,
  `pocketbase/pb_hooks/cron.pb.js:16`, `pocketbase/pb_hooks/lib/points.js:60`
  und `:128`. Fünf Stellen, jeweils eine Zeile. Ein Helfer wäre möglich, der
  Gewinn ist gering.
- Tier-Farben an drei Stellen: `mobile/lib/format.ts:240` (`tierColor`,
  gepflegt), `mobile/components/ui/BadgeMedallion.tsx` (`TIER_COLORS`, benutzt)
  und `mobile/components/ui/ProgressBar.tsx:12` (`TIER_COLOR`, **tot und ohne
  `diamant`**). Mit dem Löschen von `ProgressBar` (Punkt 1) erledigt sich die
  dritte von selbst; ob `TIER_COLORS` und `tierColor` zusammengehören, wäre
  getrennt zu entscheiden.

---

## Was ausdrücklich in Ordnung ist

Damit die Liste nicht länger wirkt, als die Lage ist:

- **Kein auskommentierter Code.** Geprüft mit
  `grep -rnE "^\s*//\s*(const|let|function|import|return|if|export|<)"` über
  `mobile/app`, `mobile/components`, `mobile/lib` und `pocketbase/pb_hooks`.
  Einzige Treffer: zwei Zeilen Anwendungsbeispiel im Kopfkommentar von
  `mobile/lib/hooks/useGoBack.ts:12–13` — die gehören dorthin.
- **Kein `TODO`, `FIXME` oder `deprecated`** im ganzen geprüften Umfang.
- **`mobile/lib/api.ts` ist praktisch vollständig in Gebrauch:** 18 von 18
  Funktionen haben Verwender. Nur die Typen `PointConfig` (Z. 67) und
  `NewItemInput` (Z. 103) werden außerhalb nicht namentlich genannt — sie
  stehen in den Signaturen benutzter Funktionen und sind damit nicht tot.
- **Keine verwaiste Datei unter `mobile/app/`.** Jede entspricht einer Route.
- **`docs/openapi.yaml` ist deckungsgleich mit den Hooks** — Pfade, Felder,
  Fehlercodes und Texte.
- **173 Tests, alle grün**, in 7 Dateien.

---

## Reihenfolge

1. **Punkt 4** — ungenutzte Bezeichner, allen voran die neun toten
   `const router`. Compiler-belegt, kein Risiko, betrifft 11 Dateien.
2. **Punkt 1** — die fünf Komponenten, 318 Zeilen. Kein Verwender, kein API-Bezug.
3. **Punkt 5** — `tar`, `zustand`, `expo-system-ui` aus `mobile/package.json`.
   `CLAUDE.md` und `TECH.md` zu Zustand mitziehen.
4. **Punkt 6** — `unregisterPushToken` an `logout` hängen. Kein Aufräumen,
   sondern ein echter Fehler: abgemeldete Geräte bekommen weiter Push.
   Braucht einen Test.
5. **Doppelte Logik 1 und 4** — Aktions-Faktoren und Push-Flags. Beides ohne
   API-Bezug, beides mechanisch.
6. **Doppelte Logik 2 und 3** — Geofence und ISO-Woche. Zuletzt, weil sie
   Fachlogik berühren: erst Tests, dann Umbau, und die Fehlermeldung
   „Du bist nicht im Laden" bleibt Wort für Wort stehen.

Grobe Schätzung des Umfangs: rund **400 Zeilen** entfernbar (318 Komponenten,
gut 30 tote Bezeichner und Funktionen, gut 50 durch Zusammenführen der
Duplikate), plus drei Einträge in `package.json`.
