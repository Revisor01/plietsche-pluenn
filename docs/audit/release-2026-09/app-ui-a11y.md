# Release-Audit App — Design-System, Barrierefreiheit, Plattform, Laufzeit

| | |
|---|---|
| **Datum** | 26.09.2026 |
| **Commit** | `06b68dc8ecab232b722ca449308c3e24a9fe941f` (2026-09-19, „feat(app): Symbolauswahl bleibt als Funktion") |
| **Umfang** | `mobile/components/ui/*` (19 Bausteine), `components/TabBar.tsx`, `BrandMark.tsx`, `Dots.tsx`, `QRScanner.tsx`, `ShowcaseCard.tsx`, `lib/theme.ts`, `lib/icons.tsx`, `lib/format.ts`, alle 22 Screens unter `mobile/app/`, `app.json`, `assets/`. Zum Abgleich der Absicht: `design/HANDOFF.md`, `docs/audit/ABNAHME.md` (14.09.2026), `docs/audit/theme.md`. |
| **Vorgehen** | Statische Prüfung am Quelltext; jede Aussage mit `Datei:Zeile`. Kontraste mit der WCAG-2-Formel nachgerechnet (Skript `scratchpad/app-ui/contrast.py`, Ergebnis in §6). Zählungen mit dem jeweils genannten `grep`. `npx tsc --noEmit -p mobile/tsconfig.json` lief (node_modules vorhanden): **0 Fehler**. Bibliotheksverhalten (Pressable-Default, Splash-Plugin, Alternate-Icons, Reanimated) an den installierten Paketquellen unter `mobile/node_modules/` verifiziert. **Kein Gerät, kein Simulator** — alle Befunde sind „aus Code gelesen", sofern nicht anders gekennzeichnet. Kein Projektcode geändert. |

---

## 1. Zusammenfassung

Die Barrierefreiheit hat sich seit der Abnahme vom 14.09. grundlegend gedreht: Von damals null Auszeichnungen auf heute 237 (`grep -rniE "accessibilityLabel|accessibilityRole|…" app components lib | wc -l`), alle 70 `Pressable` tragen eine Rolle, `IconButton` erzwingt das Label per Typ, Schalter, Filter und Tabs melden ihren Zustand. Acht der elf A11y-Befunde vom 14.09. sind behoben oder auf Betreiberentscheidung geschlossen; offen bleiben der Nicht-Text-Kontrast (B-7), Rangfarben als Text an einer Stelle (B-6) und die unzutreffende Zusicherung im `ColorPicker` (B-11).

Neu gefunden habe ich 20 Befunde: **1 KRITISCH, 5 HOCH, 9 MITTEL, 5 NIEDRIG.** Der kritische Befund ist klein im Code und groß in der Wirkung: Zwei „Auffänger"-`Pressable` in Sheets (`DateField.tsx:103`, `badges.tsx:63`) verlassen sich auf `importantForAccessibility="no"`, das nur auf Android wirkt; auf iOS ist ein `Pressable` standardmäßig `accessible` und macht damit den gesamten Sheet-Inhalt zu einem einzigen VoiceOver-Element — der Datumswähler im Aktions-Editor ist so mit VoiceOver nicht bedienbar. Die HOCH-Befunde betreffen Eingabefelder hinter der iOS-Tastatur in allen Formularen außer Login/Registrierung, leere Zustände, die während des Ladens und bei Netzfehlern falsche Aussagen machen („Nichts zu prüfen — alle Vorschläge sind bearbeitet"), feste Knopfhöhen bei Systemschriftvergrößerung, sowie Teal, Warn- und Fehlerfarbe als Textfarbe auf hellem Grund (2,5–2,7:1 in 12–13 pt).

Design-System: Das Farbsystem ist durchgesetzt (0 UI-Hex-Literale außerhalb `theme.ts`), das Abstands- und Radiensystem weitgehend; es bleiben 17 hartkodierte Radien, sieben handgebaute Icon-Kacheln neben `IconTile`, ein Dutzend toter Tokens und ein unerreichbarer Screen mit zweitem Abmelden-Knopf. Der feste Hellmodus ist auf beiden Plattformen durchgezogen (expo-system-ui wird automatisch angewandt). Plattform: Safe Areas, Glass-Fallback, Datepicker-Aufteilung und Listener-Aufräumen sind sauber; der Splash ist ohne Konfiguration (weiß, ohne Logo, Asset ungenutzt), und die Symbolwahl erscheint auf Android, obwohl dort keine Symbole konfiguriert sind. Laufzeit: keine Speicherlecks gefunden, Worklet-Regel eingehalten, Thumbnails genutzt — aber keine einzige virtualisierte Liste; das Inventar rendert jedes Teil samt QR-SVG auf einmal.

**Release-Empfehlung für den Bereich: Freigabe mit Auflage.** Vor dem Release U-1 beheben (zwei Zeilen: `accessible={false}` an beiden Auffängern) und am Gerät mit VoiceOver bestätigen; U-2 (Tastatur) und U-3 (Leerzustände) sind für die erste Ladenwoche die spürbarsten Punkte und sollten in den nächsten Build. Die Kontrastbefunde (U-5, U-14) sind Gestaltungsfragen, die dem Betreiber gehören — ich lege die Zahlen vor, nicht die Entscheidung.

---

## 2. Befund-Tabelle

| ID | Kurztitel | Schwere | Nachweis |
|---|---|---|---|
| U-1 | Sheet-Auffänger machen Datumswähler und Abzeichen-Sheet auf iOS zu einem einzigen VoiceOver-Element | **KRITISCH** | aus Code gelesen (`DateField.tsx:103-107`, `badges.tsx:63`; `Pressable.js:252`) |
| U-2 | Eingabefelder hinter der iOS-Tastatur in allen Formularen außer Login/Registrierung | **HOCH** | aus Code gelesen (`Screen.tsx:41-49`) |
| U-3 | Leere Zustände unterscheiden nicht zwischen „lädt", „Fehler" und „leer" | **HOCH** | aus Code gelesen (`grep isLoading\|isError` → 0 Treffer) |
| U-4 | Feste Knopf- und Ringhöhen schneiden bei Systemschriftvergrößerung ab | **HOCH** | aus Code gelesen (`PPButton.tsx:50,68,90`; `Text.js:289`) |
| U-5 | Teal, Warn- und Fehlerfarbe als Text auf hellem Grund: 1,90–3,96:1 in Kleinschrift | **HOCH** | reproduziert (Rechnung §6) |
| U-6 | Ohne Lade-/Fehlerzustand zeigt die Startseite kurz „0 Punkte, Leg los" | **HOCH** (Teil von U-3, eigene Fundstelle) | aus Code gelesen (`index.tsx:55-79`) |
| U-7 | Statusleiste auf dem Scanner dunkel auf dunkel; Hinweistext ohne Schleier über Kamerabild | MITTEL | aus Code gelesen (`_layout.tsx:170`, `scan.tsx:109,134-141`) |
| U-8 | Splash ohne Konfiguration: weiß, ohne Logo; `splash-icon.png`, `icon-dark.png`, `icon-tinted.png` unbenutzt | MITTEL | reproduziert (Plugin-Defaults `getIosSplashConfig.js:13`) |
| U-9 | Symbolwahl erscheint auf Android, obwohl nur iOS-Symbole konfiguriert sind | MITTEL | aus Code gelesen (`app.json:53-71`, `ExpoAlternateAppIconsModule.kt:18`) |
| U-10 | Glocke trägt dauerhaft den „Neu"-Punkt | MITTEL | aus Code gelesen (`index.tsx:95`) |
| U-11 | Keine Überschriften-Rollen — keine Überschriftennavigation für Screenreader | MITTEL | aus Code gelesen (`grep accessibilityRole="header"` → 0) |
| U-12 | Screenreader-Semantik unvollständig: Fortschritt fehlt im Abzeichen-Label, Stepper-Container nicht `accessible` | MITTEL | aus Code gelesen (`badges.tsx:230`, `Stepper.tsx:60-70`) |
| U-13 | Sechs Textlinks unter 44 pt Trefferfläche (32–40 pt) | MITTEL | aus Code gelesen, gerechnet (§5.13) |
| U-14 | Nicht-Text-Kontrast durchgehend unter 3:1 (Feldrand 1,16, Schalter 1,42, Punkte 1,41) | MITTEL | reproduziert (Rechnung §6) — Gestaltungsentscheidung |
| U-15 | Eingabetext 14,5 pt fest, skaliert nicht mit `fontScale`; neben `DateField` (17,25 pt) sichtbar ungleich | MITTEL | aus Code gelesen (`Field.tsx:83`, `DateField.tsx:69`) |
| U-16 | CHANGELOG 1.0.0 (33) verspricht „sattere Knopffläche", die im Code zurückgenommen ist | MITTEL | reproduziert (`CHANGELOG.md:90` vs. `theme.ts` Verlauf) |
| U-17 | Keine virtualisierte Liste; Inventar rendert alle Teile samt QR-SVG auf einmal | MITTEL | aus Code gelesen (`grep FlatList` → 0; `items/index.tsx:100,238`) |
| U-18 | Toter Screen `settings/store.tsx` mit zweitem Abmelden-Knopf; tote Exports und Tokens | NIEDRIG | reproduziert (grep, §5.18) |
| U-19 | Radien, Abstände und Icon-Kacheln am Token vorbei | NIEDRIG | reproduziert (grep, §5.19) |
| U-20 | Reduce Motion nicht abgefragt | NIEDRIG | aus Code gelesen (`Toggle.tsx:23-28`) |
| U-21 | ErrorBoundary: Stack-Text 3,58:1, `paddingTop: 80` ohne Insets; `SystemInfo`-Promise ohne Abbruch | NIEDRIG | aus Code gelesen |

---

## 3. Befunde im Einzelnen

### U-1 [KRITISCH] Sheet-Auffänger machen Datumswähler und Abzeichen-Sheet auf iOS zu einem einzigen VoiceOver-Element

**Beschreibung.** Zwei Sheets legen einen `Pressable` mit leerem `onPress` um ihren Inhalt, damit ein Tipp ins Sheet es nicht schließt. Sie versuchen, ihn für den Screenreader unsichtbar zu machen — mit `importantForAccessibility="no"`. Dieses Prop ist **Android-only**. Auf iOS ist ein `Pressable` standardmäßig ein eigenes Accessibility-Element (`mobile/node_modules/react-native/Libraries/Components/Pressable/Pressable.js:252`: `accessible: accessible !== false`), und ein accessible Element **fasst seine Kinder zusammen**: VoiceOver sieht eine einzige, unbeschriftete Fläche, die inneren Knöpfe sind nicht mehr einzeln erreichbar.

**Fundstellen.**
- `mobile/components/ui/DateField.tsx:103-107` — der Auffänger umschließt die Leiste mit „Abbrechen"/„Fertig" (Z. 125-145) und den `DateTimePicker` (Z. 148-158).
- `mobile/app/(visitor)/badges.tsx:63` — der Auffänger umschließt die gesamte Abzeichen-Karte samt Beschreibung, Stufenliste und „Schließen"-Knopf (Z. 64-161).

**Auswirkung aus Nutzersicht.** Eine Admin mit VoiceOver kann im Aktions-Editor kein Datum setzen: Das Sheet öffnet sich (der Öffner `DateField.tsx:44-49` ist korrekt beschriftet), danach findet sie weder „Fertig" noch den Kalender, nur den Hintergrund „Datumsauswahl schließen". Da `save()` Start und Ende verlangt (`actions.tsx:61-64`), lässt sich keine Aktion anlegen. Im Abzeichen-Sheet wird der Inhalt vermutlich als zusammengezogener Text vorgelesen (RN aggregiert Kindtexte), aber „Schließen" ist nicht als Knopf erreichbar — hier hilft der Hintergrund „Abzeichen schließen" als Ausweg, deshalb ist diese Fundstelle für sich MITTEL.

**Nachweis.** Aus Code gelesen; Pressable-Default an der installierten RN-Quelle bestätigt. Am Gerät nicht geprüft — **vor dem Release mit VoiceOver bestätigen.** Der Einstufung nach Skala (Funktion für Screenreader unbedienbar) steht der begrenzte Kreis gegenüber: nur Admins, nur iOS.

**Empfehlung.** An beiden Stellen `accessible={false}` setzen (zusätzlich zu `importantForAccessibility="no"`, das für Android bleibt). Alternativ den Auffänger durch einen `View` mit `onStartShouldSetResponder={() => true}` ersetzen. Danach mit VoiceOver: Sheet öffnen, per Wischen „Abbrechen", Kalender, „Fertig" erreichen.

---

### U-2 [HOCH] Eingabefelder hinter der iOS-Tastatur

**Beschreibung.** `Screen` rendert einen `ScrollView` ohne `automaticallyAdjustKeyboardInsets` (`mobile/components/ui/Screen.tsx:41-49`); kein Formular außer Login und Registrierung ist in eine `KeyboardAvoidingView` gehüllt (`grep -rn KeyboardAvoidingView app` → nur `login.tsx:82`, `register.tsx:40`). iOS scrollt einen `UIScrollView` nicht von selbst zum fokussierten Feld; das Prop ist in RN 0.86 vorhanden (`ScrollView.d.ts:360`) und nicht gesetzt.

**Fundstellen (Felder im unteren Bildschirmdrittel).**
- `mobile/app/(visitor)/items/new.tsx:339` — „Notiz", letztes Feld vor dem Absenden.
- `mobile/app/(visitor)/items/new.tsx:304-320` — Abholadresse (Pflicht bei „Verbleibt bei mir").
- `mobile/app/(visitor)/settings/account.tsx:500-506` — „Passwort zur Bestätigung" beim Kontolöschen.
- `mobile/app/(visitor)/admin/tiers.tsx:156-189` — jede Rang-Zeile; bei fünf Rängen liegen die unteren hinter der Tastatur.
- `mobile/app/(visitor)/admin/badges.tsx:313-326` — Stufen „ab"/„Bonus".
- `mobile/app/(visitor)/admin/actions.tsx:103-104`, `admin/needs.tsx:110-111`, `items/[id].tsx:245-250`.

**Auswirkung.** Wer auf dem iPhone „Notiz" antippt, tippt blind: Das Feld liegt unter der Tastatur, der Text erscheint nicht sichtbar. Beim Kontolöschen ist das Passwortfeld ganz unten — der wichtigste Moment der Aufmerksamkeit findet unsichtbar statt. Android ist mit `adjustResize` (Standard, `@expo/config-plugins/build/android/WindowSoftInputMode.js:41-42`) vermutlich unbetroffen.

**Nachweis.** Aus Code gelesen.

**Empfehlung.** In `Screen.tsx` am `ScrollView` `automaticallyAdjustKeyboardInsets` setzen (iOS-only, harmlos auf Android) und `keyboardDismissMode="interactive"`. Für die drei kritischen Felder (Notiz, Abholadresse, Passwort zur Bestätigung) am Gerät prüfen, ob der Inhalt nach oben rollt.

---

### U-3 [HOCH] Leere Zustände unterscheiden nicht zwischen „lädt", „Fehler" und „leer"

**Beschreibung.** Kein Screen liest `isLoading`, `isPending` oder `isError` aus TanStack Query (`grep -rn "isLoading\|isError\|isPending\|isFetching" app components` → 0 Treffer). Solange `data` `undefined` ist — beim ersten Laden **und dauerhaft nach einem Netzfehler** (`retry: 1`, `queryClient.ts:7`) — zeigen alle Listen den Text für „wirklich leer".

**Fundstellen und Wortlaut.**
- `mobile/app/(visitor)/items/review.tsx:181-197` — „Nichts zu prüfen — alle Vorschläge sind bearbeitet."
- `mobile/app/(visitor)/items/index.tsx:238-247` — „Keine Teile in dieser Ansicht."
- `mobile/app/(visitor)/store.tsx:265-281` — „Keine Teile in dieser Ansicht."
- `mobile/app/(visitor)/showcase.tsx:64-72` — „Gerade ist nichts im Schaufenster."
- `mobile/app/(visitor)/points.tsx:134-139` — „Noch keine Punkte in dieser Kategorie."
- `mobile/app/(visitor)/admin/actions.tsx:251`, `admin/badges.tsx:443`, `admin/needs.tsx:262` — „Noch keine …".
- `mobile/app/(visitor)/badges.tsx:200-287` — leeres Raster ohne jeden Text.
- `mobile/app/(visitor)/items/[id].tsx:60-66` — Kopfzeile „…", akzeptabel als Ladeanzeige, aber bei Fehler dauerhaft.

**Auswirkung.** Eine Helferin ohne Netz im Laden öffnet „Freigaben" und liest: alle Vorschläge sind bearbeitet. Das ist eine falsche fachliche Aussage, nicht ein fehlender Spinner. Auf der Startseite (U-6) sieht jede Person beim Kaltstart kurz 0 Punkte, Rang „—" und „Leg los" — der Motivationstext für Neulinge (`format.ts:312-319`, weil `totalPoints === 0` und `daysSinceVisit === null`).

**Nachweis.** Aus Code gelesen.

**Empfehlung.** Ein `ListState`-Baustein (Spinner / Fehlertext mit „Nochmal laden" / Leer-Text), gespeist aus `isPending`/`isError`; an den neun Stellen einsetzen. Die Startseite rendert die Fortschrittskarte erst, wenn `user` vorliegt, oder zeigt einen Platzhalter ohne Zahl.

---

### U-4 [HOCH] Feste Knopf- und Ringhöhen schneiden bei Systemschriftvergrößerung ab

**Beschreibung.** `PPText` setzt weder `allowFontScaling={false}` noch `maxFontSizeMultiplier` (`grep -rn "allowFontScaling\|maxFontSizeMultiplier" app components lib` → 0); RN skaliert Text standardmäßig mit der Systemeinstellung (`Text.js:289`), **zusätzlich** zu `PP.fontScale = 1,15` (`theme.ts:148`). Das ist richtig so — nur die Container wachsen nicht mit.

**Fundstellen.**
- `mobile/components/ui/PPButton.tsx:50` — `h = 52 / 44 / 36`, angewendet als `height: h` (Z. 68) in einem Container mit `overflow: 'hidden'` (Z. 90). Bei 200 % Systemschrift misst `size="s"`-Text 15,5 × 2 = 31 pt Glyphenhöhe in 36 pt Höhe; jeder Umbruch (z. B. „Aus Schaufenster", `items/index.tsx:128`; „QR-Etiketten drucken", `:231`) wird abgeschnitten.
- `mobile/app/(visitor)/index.tsx:146-162` — `GradientRing size={120}` mit drei Textzeilen darin (xs, hero 36,8 pt, xs); ab ~150 % läuft der Punktestand aus dem Ring.
- `mobile/components/TabBar.tsx:183` — iOS-Leiste `height: 64` bei Icon 28 + Label xs; bei 200 % (24 pt) ist die Leiste gefüllt, darüber wird gekappt.
- `mobile/app/(visitor)/admin/actions.tsx:127` — `width: 104` mit `numberOfLines={1}` für „Vorbeikommen" (sm) — kürzt schon bei ~130 %.
- `mobile/app/(visitor)/admin/badges.tsx:315` — `width: 78` für Rangnamen.

**Auswirkung.** Nutzer:innen mit vergrößerter Schrift (iOS „Größerer Text", Android „Schriftgröße") sehen abgeschnittene Knopfbeschriftungen — genau die Gruppe, für die die App-eigene Skalierung um 15 % gedacht war.

**Nachweis.** Aus Code gelesen; nicht am Gerät gemessen.

**Empfehlung.** `height` in `PPButton` durch `minHeight` ersetzen und `paddingVertical` setzen; `maxFontSizeMultiplier={1.6}` als Obergrenze auf `PPText` (Kompromiss zwischen Lesbarkeit und Layout); den Ring ab `fontScale > 1.3` (aus `useWindowDimensions().fontScale`) größer rendern oder die Zahl daneben statt hinein setzen. Am Gerät mit 200 % durch Startseite, Inventar und Scanner-Sheet gehen.

---

### U-5 [HOCH] Teal, Warn- und Fehlerfarbe als Text auf hellem Grund

**Beschreibung.** Die Abnahme hat B-4 (Weiß **auf** Teal) als Betreiberentscheidung geschlossen. Nicht Gegenstand dieser Entscheidung war die umgekehrte Kombination: Teal **als Schrift** auf Weiß oder Seitengrund. Sie liegt bei 2,52–2,72:1 und steht überwiegend in `xs`/`sm` (12,1–13,2 pt), wo 4,5:1 gilt. Dieselbe Lage bei `warn` (2,06:1) und `err` (3,96:1, auf getönter Fläche 3,15–3,58:1).

**Fundstellen (Auswahl, alle geprüft).**

| Farbe | Wo | Größe | Verhältnis |
|---|---|---:|---:|
| teal | `Pill.tsx:22-23` Standardfarbe → `points.tsx:95` „+N diese Woche", `permissions.tsx:122,134`, `settings/store.tsx:126` „Route", `items/index.tsx:31` „Schaufenster", `actions.tsx:239` „aktiv", `items/[id].tsx:94` Punkte, `needs.tsx:104` Vorlagen | xs/sm | 2,35–2,53 |
| teal | `SectionTitle.tsx:28` „Alles ansehen" | sm | 2,52 |
| teal | `TabBar.tsx:102,132` aktiver Tab-Titel | xs | 2,63 (iOS) / 2,72 (Android) |
| teal | `PPButton.tsx:58` Ghost-Variante („Zurücksetzen", „Archivieren", „Rang hinzufügen") | md | 2,52 |
| teal | `settings/store.tsx:85` Öffnungszeiten, `points.tsx:183` Punktzeile, `index.tsx:177` „Noch N bis", `actions.tsx:235` Faktoren, `register.tsx:113` „Anmelden", `DateField.tsx:142` „Fertig" | sm–md | 2,52–2,72 |
| warn | `index.tsx:352` „N Teile warten" | sm | 2,06 |
| warn | `items/index.tsx:30` Status „zu prüfen" auf getönter Pille | xs | 1,90 |
| err | `Field.tsx:44` Fehlertext | xs | 3,96 |
| err | `account.tsx:459,493,528` Abmelden/Konto löschen | base | 3,15–3,96 |
| gold/… | `index.tsx:157` Rangname unter dem Punktestand (`tierColor`) | xs | 1,84 (Gold), 1,73 (Diamant) — Rest von B-6 |

**Auswirkung.** Nebeninformationen — wann der Laden offen hat, was ein Teil an Punkten bringt, welcher Filter aktiv ist — sind bei Sonnenlicht und bei eingeschränktem Sehen die am schlechtesten lesbaren Texte der App. Die Fehlermeldung unter einem Feld erreicht knapp nicht 4,5:1.

**Nachweis.** Reproduziert per Rechnung (§6).

**Empfehlung.** Wie bei B-4 eine **Gestaltungsentscheidung des Betreibers** — daher hier nur die Optionen: (a) eine Textvariante `tealText` (z. B. `#1a7f69`, 4,6:1 auf Weiß) nur für Schrift, Flächen bleiben Teal; (b) Kleinschrift in Teal auf `ink2` umstellen und Teal als Fläche tragen lassen; (c) bewusst offen lassen wie B-4. Für `err` als Fehlertext reicht ein dunkleres `#c4423e` (5,0:1). Am Gerät im Laden bei Tageslicht anschauen, nicht an Zahlen entscheiden.

---

### U-6 [HOCH] Startseite zeigt kurz „0 Punkte, Rang —, Leg los"

Siehe U-3; eigene Fundstelle, weil hier nicht eine Liste leer bleibt, sondern eine **falsche Zahl** steht. `mobile/app/(visitor)/index.tsx:55-56` (`total = user?.points_total ?? 0`), `:68-76` (`motivationFor` mit `totalPoints: 0`, `daysSinceVisit: null` → „Leg los", `format.ts:312-319`), `:142` (Screenreader-Label „0 Punkte, Rang —"). Beim Kaltstart bis `['me']` antwortet; nach Abmelden/Anmelden eines zweiten Kontos ebenso (`queryClient.clear()`, `useAuth.ts:118`). Empfehlung wie U-3.

---

### U-7 [MITTEL] Statusleiste auf dem Scanner; Text über Kamerabild ohne Schleier

- `mobile/app/_layout.tsx:170` setzt global `<StatusBar style="dark" />`. Der Scanner steht auf `PP.inkDeep` (`scan.tsx:109`) und darüber die Kamera — Uhrzeit und Akku erscheinen dunkel auf dunkel. `scan.tsx` setzt keinen eigenen `StatusBar`.
- `mobile/app/scan.tsx:113-121` (Titel „Tür oder Teil") und `:134-141` (Hinweis „Halt die Kamera …", `onBrandFaint`) liegen ohne Schleier direkt auf dem Live-Bild. Der Kontrast hängt von der Szene ab — vor einem hellen Kleiderständer ist Weiß-70 % nicht lesbar. Auf dem dunklen Rand ist es in Ordnung (9,03:1 auf `inkDeep`).

**Empfehlung.** In `scan.tsx` `<StatusBar style="light" />` (expo-status-bar stapelt; beim Schließen greift wieder `dark`). Unter Titel und Hinweis einen Verlauf `alpha(inkDeep, 'veil') → transparent` (`PP.scrim` existiert bereits ungenutzt, `theme.ts:96`).

---

### U-8 [MITTEL] Splash ohne Konfiguration; drei Icon-Assets unbenutzt

**Beschreibung.** `app.json:50` listet `"expo-splash-screen"` ohne Optionen. Das Plugin fällt dann auf `backgroundColor: '#ffffff'` und **kein Bild** zurück (`expo-splash-screen/plugin/build/getIosSplashConfig.js:13-14`, `getAndroidSplashConfig.js:12`). `assets/splash-icon.png` (1024², vorhanden) wird nirgends referenziert (`grep -rn "splash-icon" .` außerhalb node_modules → 0). Ebenso unreferenziert: `assets/icon-dark.png` und `assets/icon-tinted.png` — `app.json:9` setzt nur `"icon": "./assets/icon.png"`, kein `ios.icon: { light, dark, tinted }`; iOS 18 erzeugt Dunkel/Getönt dann selbst aus dem hellen Symbol.

**Auswirkung.** Der Start zeigt eine leere weiße Fläche, dann springt der Grund auf `#F4F7F4` und die App erscheint — kein Markenmoment, ein sichtbarer Farbsprung. Die für Dark/Tinted gestalteten Symbole (`design:` „App-Symbol in allen neun Erscheinungen", Commit `01ddb46`) kommen nicht an.

**Nachweis.** Reproduziert an den Plugin-Defaults; das Prebuild-Ergebnis ist nicht im Repo (`ios/` enthält nur Podfile), am Gerät nicht gesehen.

**Empfehlung.** `["expo-splash-screen", { "image": "./assets/splash-icon.png", "imageWidth": 160, "backgroundColor": "#F4F7F4" }]` und `"ios": { "icon": { "light": "./assets/icon.png", "dark": "./assets/icon-dark.png", "tinted": "./assets/icon-tinted.png" } }`.

---

### U-9 [MITTEL] Symbolwahl erscheint auf Android, obwohl dort keine Symbole konfiguriert sind

**Beschreibung.** `app.json:53-71` konfiguriert die vier Alternativsymbole ausschließlich mit `ios`-Pfaden. Der Android-Teil des Moduls meldet `supportsAlternateIcons` **fest** `true` (`expo-alternate-app-icons/android/.../ExpoAlternateAppIconsModule.kt:18`), unabhängig davon, ob Aliase existieren. Die Weiche in `account.tsx:125-133` („Dieses Gerät kann das App-Symbol nicht wechseln") wird auf Android also nie erreicht; die vier Kacheln werden angezeigt. Ein Tipp ruft `setComponentEnabledSetting` für `.MainActivityRing` (`…Module.kt:43-47`), eine Komponente, die ohne `android`-Konfiguration nicht im Manifest steht.

**Auswirkung.** Android-Nutzer:innen sehen eine Funktion, die entweder mit „Klappt nich" (`account.tsx:141`) endet oder — je nach Verhalten des PackageManagers bei unbekannter Komponente — ohne Rückmeldung nichts tut. Vor dem Kontolöschen ist das der einzige Bereich der Profilseite, der nicht funktioniert.

**Nachweis.** Aus Code gelesen; am Gerät **zu klären** (§8). Die Reihenfolge im Kotlin-Code (neue Komponente zuerst aktivieren, dann alte deaktivieren) schließt einen unsichtbaren Launcher aus.

**Empfehlung.** Entweder je Symbol `android: { foregroundImage, backgroundColor }` ergänzen (das Plugin erzeugt dann Aliase und Mipmaps, `withAndroidManifestUpdate.js:22-46`) oder den Abschnitt auf Android per `Platform.OS === 'ios'` ausblenden.

---

### U-10 [MITTEL] Glocke trägt dauerhaft den „Neu"-Punkt

`mobile/app/(visitor)/index.tsx:95`: `<IconButton icon="bell" badge …>` — `badge` ist konstant `true`; es gibt keinen Zustand, der ihn steuert (`grep -rn "badge" app | grep IconButton` → nur diese Stelle). Der Punkt (`IconButton.tsx:57-70`, `PP.warn`) signalisiert „hier ist etwas Neues" und ist immer da. Nutzer:innen lernen, ihn zu ignorieren — und das Label „Benachrichtigungen" sagt nichts über den Punkt. Empfehlung: `badge` entfernen oder an einen echten Zustand knüpfen (z. B. Push-Erlaubnis noch nicht erteilt).

---

### U-11 [MITTEL] Keine Überschriften-Rollen

`grep -rn 'accessibilityRole="header"' app components` → 0. `PPHeader.tsx:32-39` (Seitentitel), `SectionTitle.tsx:23-25` (31 Abschnittsüberschriften), Sheet-Titel (`store.tsx:310-313`, `badges.tsx:81-83`) sind für VoiceOver-Rotor und TalkBack-„Überschriften" unsichtbar. Auf einer Profilseite mit sieben Abschnitten (`account.tsx:326-438`) bedeutet das: durchwischen, statt springen. Empfehlung: `accessibilityRole="header"` am Titel-`PPText` in `PPHeader` und `SectionTitle` — zwei Stellen, wirkt an 49 Überschriften.

---

### U-12 [MITTEL] Screenreader-Semantik unvollständig

- **Fortschritt fehlt im Abzeichen-Label.** `badges.tsx:230` setzt ein explizites `accessibilityLabel` („Name, Stufe" bzw. „noch offen"). Ein explizites Label ersetzt die Kindtexte — die Zeile „3/5 bis Silber" (`:279-281`) wird nicht mehr vorgelesen. Sehende sehen den Fortschritt, Hörende nur den Stand.
- **Stepper-Container nicht `accessible`.** `Stepper.tsx:60-70` gibt dem umschließenden `View` `accessibilityRole="adjustable"`, `accessibilityValue` und `accessibilityActions`, aber nicht `accessible`. Ohne `accessible` ist ein `View` auf iOS kein Element; Rolle, Wert und Wischgesten greifen nicht. Bedienbar bleibt es über die beiden Knöpfe „Weniger"/„Mehr" (`:72,78`), der aktuelle Wert wird aber nicht mit angesagt.
- **Doppelte accessible-Ebene.** `Pill.tsx:42` setzt `accessible`; in Filtern liegt die Pille in einem ohnehin accessible `Pressable` (`points.tsx:114-128`, `items/index.tsx:211-223`, u. a. 17 Stellen). iOS nimmt die äußere Ebene; auf Android/TalkBack kann das zu zwei Fokusstopps je Chip führen — **zu klären** (§8).

**Empfehlung.** Label in `badges.tsx` um die Fortschrittszeile ergänzen; `accessible` am Stepper-Container; `Pill` das `accessible` nur setzen, wenn ein eigenes `accessibilityLabel` übergeben wird.

---

### U-13 [MITTEL] Sechs Textlinks unter 44 pt Trefferfläche

Rechnung: sichtbare Höhe ≈ Schriftgröße × 1,15 (`fontScale`) × ~1,2 (Zeilenhöhe) + 2 × `hitSlop`.

| Fundstelle | Element | Größe | hitSlop | effektiv |
|---|---|---:|---:|---:|
| `components/ui/SectionTitle.tsx:27` | „Alles ansehen" | sm 13,2 pt → ~16 pt | 8 | **~32 pt** |
| `app/(auth)/login.tsx:128-134` | „Passwort vergessen?" | sm → ~16 pt | 12 | **~40 pt** |
| `app/(auth)/register.tsx:106-111` | „Schon dabei? Anmelden" | base 15,5 → ~19 pt | 8 | **~35 pt** |
| `components/ui/DateField.tsx:125,133-141` | „Abbrechen", „Fertig" | md 17,25 → ~21 pt | 8 | **~37 pt** |
| `components/ui/Field.tsx:50-54` | Auge (Passwort zeigen) | Icon 18 pt | 10 | **38 pt** |

Die Pillen-Wrapper und Schalter sind seit dem 14.09. in Ordnung (B-8 → §4). Empfehlung: `hitSlop={PP.touchTarget - …}` ist umständlich; einfacher `minHeight: 44` mit `justifyContent: 'center'` an diesen Pressables, beim Auge `hitSlop={13}`.

---

### U-14 [MITTEL] Nicht-Text-Kontrast unter 3:1 (WCAG 1.4.11) — B-7 unverändert offen

| Element | Fundstelle | Verhältnis |
|---|---|---:|
| Feldrand `alpha(ink,'subtle')` auf Weiß | `Field.tsx:73`, `DateField.tsx:59` | 1,16 |
| Toggle-Spur aus / an | `Toggle.tsx:19-20` | 1,42 / 2,72 |
| Toggle-Knopf auf Spur aus | `Toggle.tsx:47` | 1,42 |
| Dots inaktiv / aktiv | `Dots.tsx:21` | 1,41 / 2,52 |
| Pill inaktiv auf Seitengrund | `points.tsx:123` u. a. | 1,16 |
| SelectChip inaktiv (Rand gegen Fläche) | `store.tsx:147-149` | 1,06 |
| Ring-Spur | `GradientRing.tsx:21` | 1,16 |
| Kartenkante Weiß auf `bg` | `Card.tsx:19` | 1,08 |

Der Schalter trägt „an/aus" für Sehende über Spurfarbe (1,42 vs. 2,72) **und** Knopfposition — die Position rettet ihn. Eingabefelder auf einer weißen Karte sind bei reduziertem Kontrastsehen nicht als Felder erkennbar; das sichtbare Label darüber (`Field.tsx:25-34`) hilft. Wie U-5 eine Gestaltungsfrage; Zahlen liegen vor.

---

### U-15 [MITTEL] Eingabetext 14,5 pt fest, skaliert nicht mit `fontScale`

`mobile/components/ui/Field.tsx:81-87`: `fontSize: 14.5` direkt am `TextInput`, an `PP.fontSizes` und `PP.fontScale` vorbei. Alles um das Feld herum ist um 15 % größer als entworfen, der eingegebene Text nicht. Sichtbar wird es dort, wo `Field` und `DateField` nebeneinander stehen: `admin/actions.tsx:103-108` — „Name"/„Beschreibung" in 14,5 pt, „Von"/„Bis" darunter mit dem Wert in `md` = 17,25 pt (`DateField.tsx:67-75`). Zwei Feldtypen, zwei Schriftgrößen, eine Karte. Empfehlung: `fontSize: PP.fontSizes.md * PP.fontScale` (= 17,25) oder umgekehrt `DateField` auf `base`; eine Entscheidung, zwei Dateien.

---

### U-16 [MITTEL] CHANGELOG verspricht eine zurückgenommene Änderung

`CHANGELOG.md:90` unter `## [1.0.0 (33)] – 2026-09-14`: „Weiße Schrift auf den farbigen Knöpfen war zu blass … **Die Knopffläche ist jetzt satter**, die Schrift bleibt weiß." Der Code trägt den ursprünglichen Verlauf (`theme.ts:15-17,89`; `PPButton.tsx:117` `colors={PP.gradient}`), 2,72:1 — die Abnahme dokumentiert die Rücknahme (`ABNAHME.md`, B-4: „auf Ansage wieder zurückgenommen … die zugehörigen Tokens sind entfernt"). Die Skripte unter `.github/scripts/` speisen aus dem CHANGELOG die Release-Notes für TestFlight und Play (CLAUDE.md, „Die Skripte der Auslieferung"); Nutzer:innen lesen also eine Verbesserung, die es nicht gibt. Empfehlung: Den Satz auf den tatsächlichen Stand kürzen („Feld-Beschriftungen, Platzhalter und Zeitangaben sind dunkler") — die zweite Hälfte des Eintrags stimmt (`ink3` von `#9AA8A7` auf `#657473`).

---

### U-17 [MITTEL] Keine virtualisierte Liste; Inventar rendert alle Teile samt QR-SVG

`grep -rn "FlatList\|SectionList" app components` → 0. Alle Listen sind `.map()` in einem `ScrollView`:
- `mobile/app/(visitor)/items/index.tsx:238-241` — `useAllItems` lädt **alle** Teile inkl. Archiv (`getFullList`, `useData.ts:97`), je Zeile ein Bild **und** ein `react-native-qrcode-svg` mit 48 px (`:100`) — bei 300 Teilen 300 SVG-Bäume beim Öffnen des Tabs.
- `mobile/app/(visitor)/store.tsx:266-273` — `getFullList` (`useData.ts:73`), jedes Teil mit `Image` (Thumb 400×400, gut: `format.ts:253-256`).
- `mobile/app/(visitor)/points.tsx:141-192` — bis 300 Einträge (`usePointsLog(300)`).
- Keine `React.memo` an `ItemRow`, `StoreCard`, `PendingCard`; ein Filterwechsel rendert alle Zeilen neu.

Kein `expo-image` im Projekt (`package.json`); RN `Image` cached auf beiden Plattformen, aber ohne Speicherobergrenze pro Liste. Für die heutige Ladengröße (Dutzende Teile) unkritisch; für das Team-Inventar mit wachsendem Archiv auf Android-Einsteigergeräten die erste Stelle, die ruckelt. Empfehlung: `FlatList` mit `removeClippedSubviews`, `windowSize={5}`, `initialNumToRender={8}` fürs Inventar und den Laden; QR-Vorschau im Inventar durch ein statisches Icon ersetzen (der Code steht als Text daneben, der Bogen wird ohnehin gedruckt).

---

### U-18 [NIEDRIG] Toter Screen, tote Exports, tote Tokens

- **`mobile/app/(visitor)/settings/store.tsx`** ist registriert (`(visitor)/_layout.tsx:24`), aber unerreichbar: `grep -rn "settings/store" app components lib | grep -v _layout` → 0; nicht in `ALLOWED_LINKS` (`push.ts:125-132`). Er enthält einen zweiten Abmelden-Knopf in genau der Form (Sekundär-Button mit Pfeil nach links, `:148-150`), die `CHANGELOG.md:112` als abgelöst beschreibt („Abmelden sichtbar gestaltet: … Jetzt eine abgesetzte, rot beschriftete Karte", umgesetzt in `account.tsx:445-463`). Dieselbe Sache, zweimal anders gelöst.
- **`useMyItems`** (`useData.ts:35-48`) — 0 Verwender.
- **Tokens ohne Verwender** (`grep -rn "PP.<name>" app components lib` je 0): `PP.icon` (semantische Icon-Zuordnung, `theme.ts:213-219`), `PP.motion.base`, `PP.motion.spring`, `PP.glass`, `PP.glassDark`, `PP.scrim`, `PP.border`, `PP.touchTarget`, `PP.gradientAngle`, `PP.leading.snug`, `PP.sandDeep`. Zwei davon sind nicht nur tot, sondern **umgangen**: `PP.scrim` existiert (`theme.ts:96`), während `store.tsx:288` und `badges.tsx:60` denselben Schleier inline als `alpha(PP.inkDeep, "veil")` bauen; `PP.touchTarget = 44` existiert, während 25 Stellen `hitSlop={8}`/`{10}` von Hand setzen.

---

### U-19 [NIEDRIG] Radien, Abstände und Icon-Kacheln am Token vorbei

- **Radien**: 17 Literale (`grep -rnoE "borderRadius\s*:\s*[0-9]+|radius=\{[0-9]+\}" app components`): `radius={26}` (`index.tsx:145`), `{24}` (`badges.tsx:64`), `{20}` (`index.tsx:223`, `points.tsx:83`, `scan.tsx:172,202`), `{18}` (`badges.tsx:233`, `register.tsx:56`), `borderRadius: 11` (`points.tsx:167`, `settings/store.tsx:101`, `Toggle.tsx:46`), `17` (`store.tsx:318`, `account.tsx:164`), `13` (`account.tsx:171`), `66` (`welcome.tsx:25`), `3`/`2` (Sheet-Griff `store.tsx:306`, `scan.tsx:293` — `PP.rMicro` wäre gemeint). Karten laufen damit in **fünf** Radien (18/20/22/24/26) statt einem.
- **Kartenpolster**: 44 × `pad={N}` mit sieben Werten (0/12/14/16/18/20/22); `pad={14}` 17-mal, `pad={16}` 11-mal — der Standard `PP.space.lg = 16` wird also meist überschrieben.
- **Abstände**: 43 Literale außerhalb `theme.ts`, davon 42 Feinjustagen von 1–3 pt (`marginTop: 2`) — hinnehmbar; einer nicht: `paddingTop: 80` in `_layout.tsx:49` (ErrorBoundary, ignoriert Insets).
- **Handgebaute Icon-Kacheln** trotz `IconTile` (dessen Kommentar `IconTile.tsx:23-26` genau dieses Muster benennt): `index.tsx:207-210`, `:225-228`, `:277-288`, `:317-329`; `settings/store.tsx:97-108`; `scan.tsx:270-277,298-313`; `store.tsx:318` — 7 Stellen, `IconTile` selbst 6-mal verwendet.
- **Hex-Farben außerhalb `theme.ts`**: 5 Treffer (`grep -rnoE "#[0-9a-fA-F]{3,8}\b" app components lib --include=*.ts --include=*.tsx | grep -v theme.ts`), davon 2 im Kommentar (`format.ts:394`), 1 Fallback (`format.ts:415`), 2 Druckfarben (`qrsheet.ts:37`). **Im UI-Code: 0.** Das Farbsystem ist durchgesetzt.
- **Rohes `<Text>`**: 4 Stellen, alle in der `ErrorBoundary` (`_layout.tsx:62-69`) und dort begründet (muss ohne geladene Schrift stehen).

---

### U-20 [NIEDRIG] Reduce Motion nicht abgefragt

`grep -rni "reducedmotion\|reduceMotion" app components lib` → 0. Die einzige Reanimated-Animation ist der Schalter (`Toggle.tsx:23-28`, 150 ms `withTiming`); `useReducedMotion` ist in der installierten Version vorhanden (`react-native-reanimated/lib/typescript/index.d.ts:31`). Modale nutzen `animationType="fade"/"slide"` (`store.tsx:285`, `badges.tsx:55`, `DateField.tsx:95`), der Scanner `slide_from_bottom` (`_layout.tsx:138`) — Systembewegungen, die iOS bei „Bewegung reduzieren" teils selbst abflacht. Wirkung gering; Empfehlung: im Toggle `duration: reduced ? 0 : PP.motion.fast`.

---

### U-21 [NIEDRIG] ErrorBoundary und Kleinigkeiten

- `_layout.tsx:69`: Stack-Trace in `ink3` auf `inkDeep` = 3,58:1 in `xs` — im Fehlerfall soll man das lesen können; `onBrandFaint` (9,03:1) läge bereit.
- `_layout.tsx:49`: `paddingTop: 80` statt Insets — auf Geräten mit hoher Statusleiste knapp, auf Android edge-to-edge unter der Statusleiste möglich.
- `account.tsx:49-52`: `AccessibilityInfo.isReduceTransparencyEnabled().then(setReduceTransparency)` ohne Abbruchflag — `setState` nach Unmount möglich (kein Leck, seit React 18 auch keine Warnung; `TabBar.tsx:62-71` macht es mit `alive` vor).

---

## 4. Stand der A11y-Befunde vom 14.09.2026 (ABNAHME.md, B-1 … B-11)

| Nr. | Befund (14.09.) | Stand 26.09. | Fundstelle / Nachweis |
|---|---|---|---|
| A11y-1 (B-1) | Keine einzige Barrierefreiheits-Auszeichnung | **behoben** | 237 Auszeichnungen (`grep -rniE "accessibilityLabel\|accessibilityRole\|accessibilityHint\|accessibilityState\|accessibilityValue\|accessibilityActions\|accessible\b\|importantForAccessibility\|accessibilityElementsHidden" app components lib \| wc -l`). 70 `Pressable`, davon 67 mit direkter Rolle, 3 in `PPButton` über den Spread `{...a11y}` (`PPButton.tsx:96-101,113,140,158`). |
| A11y-2 (B-2) | 26 Icon-Knöpfe ohne Beschriftung | **behoben** | Label ist Pflichtprop (`IconButton.tsx:10`). Die drei folgenreichen: Ablehnen `review.tsx:146-154` („Einreichung ablehnen" + Hint), Archivieren `items/index.tsx:132-141` (Titel + Hint), Rang löschen `tiers.tsx:179-187`. Modal-Hintergründe `store.tsx:286-292`, `badges.tsx:56-61`; Avatar `index.tsx:86-94`. |
| A11y-3 (B-3) | Basiskomponenten können kein Label annehmen | **behoben** | `IconButton.tsx:10-11,37-40`; `PPButton.tsx:23-24,96-101` (Label aus Kindern, `busy` im Ladezustand); `Toggle.tsx:10-11,33-36`; `Stepper.tsx:14,43-45,62-70`; `Field.tsx:36-37` (Label + Fehler als Hint, sichtbares Label ausgeblendet `:30-31`); `Pill.tsx:16-17,42-44`. Rest → U-12 (Stepper-Container ohne `accessible`). |
| A11y-4 (B-4) | Weiß auf Teal 2,72:1 | **hinfällig** (Betreiberentscheidung 14.09., geschlossen) | Stand unverändert 2,72:1 (`PPButton.tsx:58,117`; `theme.ts:89`). Nicht erneut vorgeschlagen. **Achtung:** `CHANGELOG.md:90` behauptet das Gegenteil → U-16. Die umgekehrte Kombination (Teal als Text) war nicht Teil der Entscheidung → U-5. |
| A11y-5 (B-5) | `ink3` 2,28–2,46:1 | **behoben** | `theme.ts:39` `#657473`: 4,88 auf `surface`, 4,53 auf `bg` (§6). Rest: 4,47 auf `alpha(ink,'ghost')`-Zeilen (`items/[id].tsx:115-118`), 4,27 auf `sand` (dort steht kein `ink3`-Text: `Avatar.tsx:45` nutzt `ink`). |
| A11y-6 (B-6) | Rangfarben als Text unlesbar | **teilweise offen** | Abzeichen-Sammlung nutzt `ink`/`ink2` für Namen (`badges.tsx:253,266-282`) — dort behoben. Offen: `index.tsx:154-161` Rangname in `tierColor(...)` als `xs`-Text (Gold 1,84, Diamant 1,73, §6); Medaillon-Symbol Weiß auf hellem Verlaufsende (`BadgeMedallion.tsx:44,56`), Nicht-Text. |
| A11y-7 (B-7) | Kein Bedienelement erreicht 3:1 Nicht-Text-Kontrast | **offen** | Werte unverändert: Feldrand 1,16, Toggle 1,42/2,72, Dots 1,41/2,52, Pill 1,16, SelectChip 1,06 → U-14. |
| A11y-8 (B-8) | ~22 Trefferflächen unter 44 pt | **weitgehend behoben** | Pillen-Wrapper mit `hitSlop` 8–10 (`settings/store.tsx:124,135` → 45 pt; `points.tsx:120`, `items/index.tsx:218`, `permissions.tsx:132`, `actions.tsx:139`, u. a.); Toggle `hitSlop={8}` → 44 pt (`Toggle.tsx:37-38`); SelectChip vertikal 6 → ~48 pt (`store.tsx:142`). Rest: fünf Textlinks 32–40 pt → U-13. |
| A11y-9 (B-9) | Drei Zustände nur über Farbe | **behoben** | Tab: `accessibilityState={{selected}}` (`TabBar.tsx:112,139`) plus Schriftschnitt (`:118,145`); Toggle: `role="switch"` + `checked` (`Toggle.tsx:33-36`); Dots: `progressbar` + „Schritt n von m" (`Dots.tsx:9-11`). Für Sehende trägt der Tab weiterhin Farbe + Gewicht — Teal vs. `ink3` unterscheidet sich auch in der Helligkeit, hinnehmbar. |
| A11y-10 (B-10) | Sechs Farbwerte als Zeichenkette | **behoben** | `grep -rn 'color="PP\.' app components` → nur die zwei Kommentarzeilen `Text.tsx:18,26`. Alle sechs Stellen tragen `color={PP.…}` (`scan.tsx:115,138,181,211`, `index.tsx:232`, `QRScanner.tsx:72`). Zusätzlich Laufzeitwarnung im Dev-Modus (`Text.tsx:31-39`). |
| A11y-11 (B-11) | Zusicherung im `ColorPicker` trifft nicht zu | **offen** | Kommentar `ColorPicker.tsx:6-9` sagt weiter „Alle Werte sind dunkel genug" für weißen Text. Nachgerechnet (§6): Basisfarbe Bernstein 2,58, Koralle 3,36, Wald 4,06 — und die Aktions-Karte zeichnet einen Verlauf bis `lighten(+0,42)` (`format.ts:428-432`, `index.tsx:224`), auf dessen hellem Ende **jede** Farbe unter 2,5:1 fällt (Beere 2,42, Nordsee 2,45, Pflaume 2,40). Ankündigungen sind unbetroffen (dunkler Text auf 8-%-Tönung, `index.tsx:196-215`). |

---

## 5. Zu einzelnen Prüfpunkten der Aufgabenstellung

**Touch-Ziele (44 × 44 pt).** In Ordnung: `IconButton` 40 + 2×8 = 56 (`IconButton.tsx:41-45`); `Stepper`-Knöpfe 44 (`Stepper.tsx:47-48`); `Toggle` 28 + 2×8 = 44; `ColorPicker`/`IconPicker` 46; Tab-Items ≥ 52 hoch bei ≥ 60 breit (`TabBar.tsx:182-207,227-232`); Scanner-Schließen 40 + 16 (`scan.tsx:270-273,127`); Filter-Schließen 34 + 20 (`store.tsx:317-319`); Rang löschen 36 + 16 (`tiers.tsx:183-184`); Symbolwahl 62 + 6 + 4 (`account.tsx:161-174`). Unter 44 → U-13.

**Farbe als einziger Informationsträger.** Geprüft und in Ordnung: Schaufenster-Stern trägt Text „Ins/Aus Schaufenster" und wechselt Variante (`items/index.tsx:117-130`); Abzeichen-Stufen stehen als Name und Zähler (`badges.tsx:270-281,110-147`); Serie als „N Wochen Streak" (`format.ts:344,354`); Punkte mit Vorzeichen (`points.tsx:184`); Status-Pillen tragen Text (`items/index.tsx:28-34`); Bestätigungsstand mit Icon Häkchen/Uhr + Text (`account.tsx:350-358`); ColorPicker Rand + Häkchen (`ColorPicker.tsx:43-50,69-73`); Öffnungstage zusätzlich fett und mit „–" (`settings/store.tsx:82-87`); Aktionsfaktoren als Text (`index.tsx:254-257`).

**Fokus-Reihenfolge.** Baumreihenfolge folgt der Leserichtung; Modale (`store.tsx:285`, `badges.tsx:55`, `DateField.tsx:95`) übernehmen den Fokus auf iOS systemseitig. Nach U-1 ist innerhalb der Sheets zu prüfen, ob „Abbrechen" vor dem Kalender kommt.

**Bilder.** Teilefotos liegen in beschrifteten `Pressable` (`ShowcaseCard.tsx:11-15`, `store.tsx:36-40`, `items/index.tsx:56-60`, `review.tsx:72-76`) und werden nicht einzeln fokussiert — korrekt als dekorativ behandelt; ein Alt-Text zum Foto selbst gibt es nicht (die Karte nennt Titel und Größe/Punkte). Freistehend ohne Auszeichnung: `showcase.tsx:28` (GridCard ist kein Pressable), `items/[id].tsx:82` — werden übersprungen, was für ein Produktfoto vertretbar ist; `accessibilityIgnoresInvertColors` fehlt überall (bei „Farben umkehren" werden Fotos invertiert) — NIEDRIG, nicht als eigener Befund geführt.

**Fester Hellmodus.** `app.json:10` `userInterfaceStyle: "light"`; `expo-system-ui` ist installiert und wird als „versioned Expo SDK package" automatisch als Plugin angewandt (`@expo/prebuild-config/build/plugins/withDefaultPlugins.js:171`) → Info.plist `UIUserInterfaceStyle Light` (`withIosUserInterfaceStyle.js`) und Android-Strings (`withAndroidUserInterfaceStyle.js:21-26`). Damit erben Systemdialoge (`Alert.alert`, Datepicker-Dialog) und die iOS-Tastatur das helle Erscheinungsbild. Statusbar explizit `dark` (`_layout.tsx:170`) — Ausnahme Scanner → U-7. `DateTimePicker` zusätzlich `themeVariant="light"` (`DateField.tsx:153`). Liquid Glass läuft mit `colorScheme` auto, folgt also dem erzwungenen hellen Trait der App (`TabBar.tsx:154-157`). Splash → U-8.

**Plattform.** `expo-glass-effect`: `isLiquidGlassAvailable()` lazy und in try/catch (`TabBar.tsx:16-22`), Fallback `BlurView intensity=60 tint=light` (`:168-170`) für iOS < 26 und bei „Transparenz reduzieren" (`:60-72`, mit `alive`-Flag und `sub.remove()`); native Prüfung `#available(iOS 26)` (`GlassContainer.swift:23`). Android nutzt weder Glass noch Blur (`:97-126`, MD3-Leiste). Safe Areas: `Screen.tsx:35-36` (oben), Tab-Leiste iOS `Math.max(insets.bottom, 12)` (`:129`), Android `paddingBottom: insets.bottom` (`:99`); Scanner `insets.top/bottom` (`scan.tsx:113,134,146`); Onboarding oben/unten (`welcome.tsx:16`, `how.tsx:22`, `permissions.tsx:53`); Login/Registrierung oben (`login.tsx:86`, `register.tsx:44`), unten kein Inset — Inhalt ist oben verankert, unkritisch. Edge-to-Edge: `app.json` setzt nichts; mit SDK 57/targetSdk 36 ist es systemseitig erzwungen (`react-native-edge-to-edge` ist nicht separat im Lockfile, `expo-modules-core` bringt `EdgeToEdgePackage.kt`). Inhalte hinter Systemleisten habe ich nicht gefunden. Zurück-Geste: `predictiveBackGestureEnabled: false` (`app.json:29`), alle drei Modale mit `onRequestClose`. Haptik nur bei Scan-Ergebnis und Stepper (`scan.tsx:68,74,88`; `Stepper.tsx:20,25`) — angemessen. Datepicker: iOS eigenes Sheet mit `display="inline"`, `locale="de-DE"`, Übernahme erst bei „Fertig" (`DateField.tsx:94-162`); Android Systemdialog (`:80-91`) — die Begründung im Kommentar (`:19-23`) ist nachvollziehbar. Schriftladen: `useFonts` mit 2,5-s-Notausgang, Splash bleibt bis dahin (`_layout.tsx:24,145-164`); vorher `return null` unter dem Splash — kein Blitzen. 

**Laufzeit.** Worklet-Reinheit: nur `Toggle.tsx` nutzt Reanimated; Spurfarben vorab berechnet (`:19-20`); `tests/worklet-purity.test.js` deckt `app/`, `components/`, `lib/` ab und enthält die Gegenprobe (`:111-122`). Shared Values im Render: keine. Listener/Timer: alle mit Cleanup — `_layout.tsx:89-95` (cancelled-Flag), `:98-104` (`sub.remove()`), `:122-130`, `:155-158` (`clearTimeout`); `TabBar.tsx:60-72`; `useAuth.ts:12-26`; `QRScanner.tsx` ohne Listener (Sperre über Ref, `:16-31`). `scan.tsx:53-55` lässt einen 3-s-Timer laufen, der harmlos auflöst — kein Leck. Kein `AppState`, kein `watchPosition`. Thumbnails: `pb.files.getURL(..., { thumb: '400x400' })` (`format.ts:253-256`) überall in Listen; nur die Detailansicht nutzt ebenfalls den Thumb (`items/[id].tsx:71,144`) — kein Vollbild. `useEffect`-Ketten: `items/[id].tsx:48-58` (Hydration auf `item.id`), `push.tsx:32-41` (setzt Prefs bei jeder `user`-Änderung neu — nach eigenem Toggle kommt der Server-Stand zurück, korrekt), `tiers.tsx:39-49` — unauffällig.

---

## 6. Kontrast-Tabelle (WCAG 2, relative Luminanz; getönte Flächen als Komposit über dem Grund)

| Kombination | Vordergrund | Hintergrund | Verhältnis | Soll | erfüllt |
|---|---|---|---:|---:|---|
| ink auf bg | `#1a2e2c` | `#f4f7f4` | 13,23:1 | 4,5 | ja |
| ink auf surface | `#1a2e2c` | `#ffffff` | 14,28:1 | 4,5 | ja |
| ink2 auf bg | `#5a6b6a` | `#f4f7f4` | 5,19:1 | 4,5 | ja |
| ink2 auf surface | `#5a6b6a` | `#ffffff` | 5,61:1 | 4,5 | ja |
| ink2 auf sand | `#5a6b6a` | `#f4efe6` | 4,89:1 | 4,5 | ja |
| ink2 auf sandDeep (nirgends Text) | `#5a6b6a` | `#ebe3d2` | 4,39:1 | 4,5 | nein |
| ink3 auf bg | `#657473` | `#f4f7f4` | 4,53:1 | 4,5 | ja |
| ink3 auf surface | `#657473` | `#ffffff` | 4,88:1 | 4,5 | ja |
| ink3 auf alpha(ink,ghost) über surface (`items/[id].tsx:115`) | `#657473` | `#f4f5f4` | 4,47:1 | 4,5 | knapp nein |
| ink3 auf sand (kein Text dort) | `#657473` | `#f4efe6` | 4,27:1 | 4,5 | nein |
| ink3 auf inkDeep (ErrorBoundary) | `#657473` | `#0e1c1b` | 3,58:1 | 4,5 | nein |
| ink2 auf alpha(ink,subtle) über surface (Pill inaktiv) | `#5a6b6a` | `#edeeee` | 4,82:1 | 4,5 | ja |
| ink2 auf alpha(ink,subtle) über bg (Pill inaktiv) | `#5a6b6a` | `#e3e7e4` | 4,49:1 | 4,5 | knapp nein |
| ink2 auf Hint info / warn (über bg) | `#5a6b6a` | `#e4f1ec` / `#f3eede` | 4,83:1 | 4,5 | ja |
| **weiß auf teal** (B-4, geschlossen) | `#ffffff` | `#27b092` | **2,72:1** | 4,5 / 3 | nein |
| weiß auf mint / sky | `#ffffff` | `#79c4b0` / `#80b4e2` | 2,03 / 2,20 | 4,5 | nein |
| onBrandMuted (weiß 85 %) auf teal | `#dff3ef` | `#27b092` | 2,36:1 | 4,5 | nein |
| onBrandFaint (weiß 70 %) auf inkDeep (Scanner-Rand) | `#b7bbbb` | `#0e1c1b` | 9,03:1 | 4,5 | ja |
| errLight auf inkDeep | `#ffb3b0` | `#0e1c1b` | 10,27:1 | 4,5 | ja |
| **teal als Text auf surface** | `#27b092` | `#ffffff` | **2,72:1** | 4,5 / 3 | nein |
| **teal als Text auf bg** | `#27b092` | `#f4f7f4` | **2,52:1** | 4,5 / 3 | nein |
| teal auf alpha(teal,subtle) über surface / bg (Pill-Standard) | `#27b092` | `#eef9f6` / `#e4f1ec` | 2,53 / 2,35 | 4,5 | nein |
| teal auf Tab-Leiste iOS (Blur ≈ weiß 50 % über bg) | `#27b092` | `#fafbfa` | 2,63:1 | 4,5 | nein |
| ink3 auf Tab-Leiste iOS (inaktiv) | `#657473` | `#fafbfa` | 4,71:1 | 4,5 | ja |
| warn als Text auf surface | `#e8a93b` | `#ffffff` | 2,06:1 | 4,5 | nein |
| warn auf alpha(warn,soft) über surface | `#e8a93b` | `#fcf5e7` | 1,90:1 | 4,5 | nein |
| err als Text auf surface (Fehlertext) | `#d9534f` | `#ffffff` | 3,96:1 | 4,5 | nein |
| err auf alpha(err,medium) über surface (Konto löschen) | `#d9534f` | `#f8e0df` | 3,15:1 | 4,5 | nein |
| sky als Text auf surface | `#80b4e2` | `#ffffff` | 2,20:1 | 4,5 | nein |
| sandInk auf sand | `#8a6d3a` | `#f4efe6` | 4,24:1 | 4,5 | nein (nur Icon) |
| bronze / silber / gold / platin / diamant auf surface | — | `#ffffff` | 3,14 / 1,98 / 1,84 / 2,23 / 1,73 | 4,5 | nein |
| weiß auf Aushang Beere / Pflaume / Nordsee (Basis) | `#ffffff` | `#b0478a` / `#7a5aa8` / `#2d6e8e` | 5,10 / 5,45 / 5,63 | 4,5 | ja |
| weiß auf Aushang Koralle / Bernstein / Wald (Basis) | `#ffffff` | `#e2664f` / `#d99320` / `#4a8c56` | 3,36 / 2,58 / 4,06 | 4,5 | nein |
| weiß auf hellem Verlaufsende (+0,42) aller acht Aushang-Farben | `#ffffff` | z. B. `#d194bb` | 1,54–2,45 | 4,5 | nein |
| [Nicht-Text] Feldrand alpha(ink,subtle) auf surface | `#edeeee` | `#ffffff` | 1,16:1 | 3 | nein |
| [Nicht-Text] Toggle-Spur aus / an | `#d6d9d9` / `#27b092` | `#ffffff` | 1,42 / 2,72 | 3 | nein |
| [Nicht-Text] Dots inaktiv / aktiv | `#cdd3d0` / `#27b092` | `#f4f7f4` | 1,41 / 2,52 | 3 | nein |
| [Nicht-Text] SelectChip-Rand inaktiv | `#e3e7e4` | `#e9edea` | 1,06:1 | 3 | nein |
| [Nicht-Text] Kartenkante surface auf bg | `#ffffff` | `#f4f7f4` | 1,08:1 | 3 | nein |
| [Nicht-Text] ColorPicker-Auswahlrand ink auf teal | `#1a2e2c` | `#27b092` | 5,24:1 | 3 | ja |

Rechenweg und Vollständigkeit: `scratchpad/app-ui/contrast.py` (Kompositfarben nach `alpha()` aus `theme.ts:70-77`, Aufhellung nach `lighten()` aus `format.ts:414-421`).

---

## 7. Geprüft und in Ordnung

- **Typprüfung**: `npx tsc --noEmit -p mobile/tsconfig.json` → 0 Fehler (strict).
- **Basis-Bausteine tragen Semantik**: `IconButton.tsx:37-40` (Rolle, Label, Hint, `disabled`/`busy`); `PPButton.tsx:27-34,96-101` (Label aus Kindern, bleibt im Ladezustand ansagbar); `Toggle.tsx:33-38` (`switch`, `checked`, 44 pt); `Field.tsx:25-42` (Label am Input, Fehler als Hint, sichtbares Label ausgeblendet); `Pill.tsx:41-44` (Auswahlzustand nur wenn Auswahl); `DateField.tsx:44-49` (Label, Wert, Hint); `Dots.tsx:8-11`; `ColorPicker.tsx:30-33,58-61`; `IconPicker.tsx:20-22`; `SectionTitle.tsx:27` (Aktion mit Bezug „Alles ansehen: Schaufenster").
- **Folgenreiche Knöpfe erklären die Folge**: `review.tsx:148-149`, `items/index.tsx:135-136`, `index.tsx:108`, `store.tsx:246`.
- **Worklet-Regel** eingehalten und getestet (`Toggle.tsx:14-20`; `tests/worklet-purity.test.js`).
- **Kein Speicherleck gefunden** (alle Listener/Timer mit Gegenstück, §5).
- **Farbsystem durchgesetzt**: 0 UI-Hex-Literale außerhalb `theme.ts`; `rgba()` nur über `alpha()`/`withAlpha()`; Token-Namen als Zeichenkette abgeschafft (B-10).
- **Plattform-Design-Sprache** konsistent über `radius()`, `ripple()`, `pressedOpacity()`, `surfaceElevation()` (`theme.ts:283-340`) in `Card`, `PPButton`, `IconButton`, `Pill`, `TabBar`.
- **Liquid Glass**: Fallback-Kette iOS 26 → Blur → Android MD3 (`TabBar.tsx`), Reduce-Transparency berücksichtigt, Admin-Diagnose (`account.tsx:43-102`).
- **Safe Areas** oben und unten auf allen Screens (§5); Android-Leiste mit `insets.bottom`.
- **Tastatur**: Login/Registrierung mit `KeyboardAvoidingView` (`login.tsx:82-85`, `register.tsx:40-43`), `onSubmitEditing` auf dem letzten Feld, `keyboardShouldPersistTaps="handled"` (`Screen.tsx:45`), passende `keyboardType`/`autoComplete`/`textContentType`.
- **Alert-Texte**: 56 `Alert.alert`, alle deutsch, Bestätigungen mit `style: 'destructive'` und „Abbrechen".
- **Thumbnails** statt Vollbilder in allen Listen (`format.ts:253-256`).
- **Pillen wachsen mit der Schrift** (`Pill.tsx:32-37`); `PPText` skaliert `lineHeight`/`letterSpacing` mit (`Text.tsx:64-73`).
- **Assets**: alle Symbole 1024 × 1024 (`file assets/*.png assets/icons/*.png`); Android adaptive Icon vollständig (Vorder-, Hintergrund, Monochrom, `app.json:20-25`).
- **Orientierung** Hochformat, iPad ausgeschlossen (`app.json:8,13`).
- **Datepicker** je Plattform sinnvoll aufgeteilt, iOS mit Verwerfen-Semantik (`DateField.tsx:34-35,133-137`).
- **Fehlerbildschirm** ohne Schriftabhängigkeit (`_layout.tsx:43-75`), mit „Neu versuchen".
- **Sicherheitsrelevant nichts gefunden**: keine Zugangsdaten, Adressen oder Tokens im Quelltext des Prüfbereichs.

---

## 8. Unklar / zu klären

1. **U-1 am Gerät bestätigen** (iPhone, VoiceOver): Aktionen → Von → wird „Fertig" erreicht? Erwartung nach Codeanalyse: nein.
2. **Android/TalkBack, Filter-Chips**: Führt `accessible` auf `Pill` innerhalb eines accessible `Pressable` (`Pill.tsx:42`, `points.tsx:114-128`) zu zwei Fokusstopps je Chip?
3. **Android, Symbolwahl** (U-9): Endet ein Tipp mit „Klappt nich", ohne Wirkung oder mit Absturz? Kotlin wirft bei unbekannter Komponente vermutlich `IllegalArgumentException` → Promise-Fehler → Alert; nicht gemessen.
4. **Android-Tastatur mit Edge-to-Edge** (SDK 57, targetSdk 36): `adjustResize` ist Standard (`WindowSoftInputMode.js:41-42`); ob Login/Registrierung mit `behavior={undefined}` (`login.tsx:84`) korrekt hochrollen, ist am Gerät zu prüfen.
5. **Android-Tablets**: nicht ausgeschlossen (kein `screenOrientation`-/Größenfilter); das Raster (`store.tsx:269` `width: '47%'`) skaliert, Karten werden sehr breit. Ob das gewollt ist: Betreiberfrage.
6. **Scanner-Text über Kamerabild** (U-7): Kontrast ist szenenabhängig; ohne Gerät nicht messbar.
7. **Splash am Gerät** (U-8): Prebuild-Ausgabe nicht im Repo; die Plugin-Defaults sind belegt, das tatsächliche Bild nicht gesehen.
8. **Stepper-Wischgesten** (U-12): ob `adjustable` ohne `accessible` auf iOS wirklich wirkungslos ist, ist am Gerät zu bestätigen (Erwartung: ja).
9. **Systemschrift 200 %** (U-4): Ausmaß der Beschneidung an Startseite, Inventar und Scanner-Sheet am Gerät.

---

*Arbeitsdateien: `scratchpad/app-ui/contrast.py`. Kein Projektcode geändert; `git status` vor dem Schreiben dieses Berichts: sauber.*
