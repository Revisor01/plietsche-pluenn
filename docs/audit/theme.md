# Bestandsaufnahme: Design-Werte in der App

> **Abgenommen am 14.09.2026.** Der Stand jedes einzelnen Befunds — behoben,
> bewusst offen, offen oder hinfällig — steht in [`ABNAHME.md`](ABNAHME.md),
> jeweils am Code belegt. Behobene Befunde sind zusätzlich hier markiert;
> gelöscht wurde nichts.

Stand: 14.09.2026 · Umfang: `mobile/app/`, `mobile/components/`, `mobile/lib/`
(ohne `ios/`, `android/`, `node_modules/`) · 51 Quelldateien, 8.544 Zeilen.

Reine Bestandsaufnahme. Es wurde kein Code geändert.

**Ziel dieses Berichts ist Zusammenführung, nicht Vollständigkeit.** Ein Theme
mit 80 Farbtoken ist genauso unbrauchbar wie 80 hartkodierte Farben, nur mit
mehr Schreibarbeit. Gesucht ist die kleinste geschlossene Skala, auf die sich
der Ist-Zustand einsammeln lässt.

---

## 1. Das Ergebnis in vier Zahlen

| Kategorie | vorher (verschiedene Werte) | nachher (Token/Stufen) | Fundstellen |
|---|---:|---:|---:|
| **Farben** | 33 Hex + 47 rgba = **80** | **14 Rollen + 5 Ränge = 19** | 243 |
| **Abstände** | **24** | **7** | 394 |
| **Schriftgrößen** (PPText) | **17** | **8** | 77 |
| **Radien** | **21** | **6** | 65 |
| Icon-Größen | **17** | **6** | 58 |

Bei den Farben ist die Zusammenlegung fast kostenlos: von 80 Werten sind
47 bloß getönte Varianten von 12 Basisfarben, und die 12 Basisfarben sind
zu 10/12 schon Token. Bei Abständen, Schriftgrößen und Radien liegt der
Aufwand höher — dafür sind es dort echte Rundungen.

### Ergänzende Zählungen

| Kategorie | Fundstellen | Token-Nutzung daneben |
|---|---:|---|
| Farben `#hex` (ohne `theme.ts`) | 118 in 28 Dateien | `PP.<farbe>` breit genutzt |
| Farben `rgba()` (ohne `theme.ts`) | 125 in 39 Dateien | — |
| Abstände | 394 in 37 Dateien | `PP.space` **4×** |
| Schriftgrößen `<PPText size={n}>` | 77 | `PP.fontSizes` 96× |
| Icon-Größen `<Icon size={n}>` | 58 | keine |
| `letterSpacing` / `lineHeight` | 35 / 12 | keine |
| Radien | 65 in 31 Dateien | `PP.r*` **12×** |
| Feste Breiten/Höhen | 125 | keine |
| Schattenblöcke ausserhalb `theme.ts` | 6 (30 Eigenschaften) | `PP.shadow*` 9× |
| Icon-Namen als String | 111 | typisiert über `IconName` ✅ |

**Befund in einem Satz:** Das Farbsystem wird benutzt, das Abstands- und
Radiensystem praktisch nicht — `PP.space` steht 4 Nutzungen gegen 394
hartkodierte Abstände, `PP.r*` 12 gegen 65. Beide Skalen existieren nur auf
dem Papier, und zwar weil sie an den falschen Stellen Stufen haben (§4, §6).

### Die 10 dichtesten Dateien

| Datei | Farbe | Abstand | Schrift | Radius | Summe |
|---|---:|---:|---:|---:|---:|
| `app/(visitor)/index.tsx` | 13 | 29 | 17 | 6 | **65** |
| `app/scan.tsx` | 16 | 19 | 18 | 6 | **59** |
| `app/(visitor)/admin/badges.tsx` | 11 | 27 | 6 | 2 | **46** |
| `app/(visitor)/items/[id].tsx` | 10 | 30 | 3 | 3 | **46** |
| `app/(visitor)/store.tsx` | 12 | 19 | 6 | 8 | **45** |
| `app/(visitor)/badges.tsx` | 9 | 16 | 15 | 2 | **42** |
| `app/(visitor)/items/new.tsx` | 14 | 24 | 3 | 1 | **42** |
| `app/(visitor)/items/index.tsx` | 13 | 15 | 3 | 2 | **33** |
| `app/(visitor)/admin/needs.tsx` | 7 | 18 | 5 | 1 | **31** |
| `app/(visitor)/points.tsx` | 2 | 14 | 13 | 1 | **30** |

---

## 2. Methode: wann ist eine Zusammenlegung sichtbar?

Für Farben wird durchgehend **ΔE (CIE76, im Lab-Raum)** angegeben — der
übliche Maßstab für wahrgenommenen Abstand. Faustregeln:

| ΔE | Bedeutung |
|---|---|
| **< 2** | für das Auge identisch, auch im direkten Vergleich |
| **2–5** | nebeneinander eben noch unterscheidbar, getrennt nicht |
| **5–10** | nebeneinander klar verschieden, getrennt kaum |
| **> 10** | auch einzeln als andere Farbe erkennbar |

Auf einem Telefondisplay, mit Umgebungslicht und ohne direkten Vergleich,
liegt die praktische Schwelle eher bei ΔE ≈ 5. Zusammenlegungen unter 5 sind
im Bericht **unbedenklich**; alles darüber ist als **Designentscheidung,
Rückfrage nötig** markiert.

Für Abstände, Radien und Schriftgrößen gilt: eine Abweichung von **±2 pt**
ist an einer einzelnen Stelle nicht wahrnehmbar, wohl aber, wenn zwei so
gerundete Elemente direkt nebeneinander liegen. Deshalb wird unten nicht nur
der Versatz je Wert genannt, sondern auch, wie viele Fundstellen insgesamt
um ≥ 2 pt verschoben würden.

---

## 3. Farben: 80 Werte → 19 Token

### 3.1 Ausgangslage

- **33 verschiedene Hex-Werte** in 118 Fundstellen (ohne `theme.ts`).
- **47 verschiedene `rgba()`-Literale** in 125 Fundstellen — die sich aber
  auf nur **12 Basisfarben** verteilen. Der Rest ist Deckkraft.

Die Deckkraft-Streuung je Basisfarbe:

| Basis | entspricht | Fundstellen | verschiedene Deckkräfte | Werte |
|---|---|---:|---:|---|
| `#1a2e2c` | `PP.ink` | 49 | **11** | .035 .04 .05 .06 .08 .12 .15 .16 .18 .35 .55 |
| `#27b092` | `PP.teal` | 33 | **8** | .08 .10 .12 .14 .18 .25 .35 .5 |
| `#ffffff` | weiß | 19 | **12** | .18 .2 .22 .25 .3 .5 .55 .65 .7 .75 .85 .92 |
| `#e8a93b` | `PP.warn` | 8 | 3 | .12 .14 .45 |
| `#d9534f` | `PP.err` | 7 | 4 | .07 .10 .12 .22 |
| `#80b4e2` | `PP.sky` | 3 | 3 | .10 .12 .16 |
| `#e8b923` | `PP.gold` | 1 | 1 | .14 |
| `#79c4b0` | `PP.mint` | 1 | 1 | .10 |
| `#0a1a18` | — | 1 | 1 | .45 (Modal-Schleier) |
| `#000000` | — | 1 | 1 | .40 (Modal-Schleier) |
| `#b4965a` / `#8a6d3a` | — | 2 | 1 | .14 / .5 (Sandfläche) |

Elf Deckkräfte für denselben Ton sind keine Gestaltung, das ist Drift. Der
inaktive Pill ist mal `.05`, mal `.06`, mal `.08` — je nachdem, welcher Screen
zuerst geschrieben wurde.

### 3.2 Die Deckkraft-Leiter: 30 Werte → 6 Stufen

Erster und wirkungsvollster Schritt. Alle Deckkräfte auf sechs Stufen:

| Stufe | Wert | Ist-Werte, die darauf fallen | Fundstellen | max. Versatz |
|---|---:|---|---:|---:|
| `ghost` | 0.05 | .035 .04 .05 .07 | 12 | −0.015 |
| `subtle` | 0.08 | .06 .08 .10 | 42 | +0.02 |
| `soft` | 0.12 | .12 .14 | 27 | −0.02 |
| `medium` | 0.18 | .15 .16 .18 .20 .22 .25 | 15 | −0.07 |
| `strong` | 0.35 | .30 .35 | 2 | −0.05 |
| `veil` | 0.50 | .40 .45 .50 .55 | 9 | +0.10 |

Für die hellen Weißstufen über 0.6 (`.65 .7 .75 .85 .92`, 9 Fundstellen —
Text auf gefärbtem Grund) gilt gesondert: die gehören zu `onBrandMuted`
(§3.3), nicht auf diese Leiter.

**Sichtbarkeit:** Eine Änderung der Deckkraft um 0.02 auf einer getönten
Fläche ist im ΔE-Maß < 1 — unsichtbar. Der grösste Sprung ist `.25 → .18`
(einmal, `items/new.tsx:144`, ein Rand) und `.40 → .50` beim Schleier. **Beide
unbedenklich**, der Schleier wird dabei sogar einheitlich, wo heute drei
Werte (`.40`, `.45`, `.55`) nebeneinander dasselbe meinen.

### 3.3 Die Rollen-Palette: 14 Token

Nach Rolle im UI gruppiert, mit allen Ist-Werten, die darauf fallen:

| # | Token | Zielwert | Rolle | Ist-Werte darauf | ΔE max | sichtbar? |
|---:|---|---|---|---|---:|---|
| 1 | `bg` | `#F4F7F4` | Seitengrund | `#F4F7F4` | 0 | — |
| 2 | `surface` | `#FFFFFF` | Karten, Felder, Eingaben | `#FFFFFF`, `#fff` (62×) | 0 | — |
| 3 | `sand` | `#F4EFE6` | warme Zweitfläche | `#F4EFE6` | 0 | — |
| 4 | `sandDeep` | `#EBE3D2` | Sandfläche, tiefer | `#EBE3D2`, `rgba(180,150,90,.14)` | s.u. | **prüfen** |
| 5 | `inkDeep` | `#0e1c1b` | Vollbild-Dunkelgrund | `#0e1c1b`, `#0a1a18` | **1.37** | nein ✅ |
| 6 | `ink` | `#1A2E2C` | Text primär | `#1A2E2C` | 0 | — |
| 7 | `ink2` | `#5A6B6A` | Text sekundär | `#5A6B6A` | 0 | — |
| 8 | `ink3` | `#9AA8A7` | Text tertiär, deaktiviert | `#9AA8A7` | 0 | — |
| 9 | `hairline` | `#E5EDEB` | Trennlinien, ruhige Ränder | `#E5EDEB`, `#B7C4C2` | **15.10** | **ja → prüfen** |
| 10 | `onBrand` | `#FFFFFF` | Text/Icon auf gefärbtem Grund | `#fff` (45 der 62) | 0 | — |
| 11 | `onBrandMuted` | `rgba(255,255,255,0.85)` | Zweitzeile auf gefärbtem Grund | `.65 .7 .75 .85 .92` | s.u. | **prüfen** |
| 12 | `teal` | `#27b092` | Marke, Akzent, `ok` | `#27b092` (7×), `ok` | 0 | — |
| 13 | `warn` | `#E8A93B` | Warnung, „extern", „zu prüfen" | `#E8A93B` | 0 | — |
| 14 | `err` | `#D9534F` | Fehler, Löschen, Ablehnen | `#D9534F` | 0 | — |

Dazu die beiden Verlaufsfarben `mint` (`#79c4b0`) und `sky` (`#80b4e2`), die
nur im Markenverlauf und für die Aushang-Akzentfläche gebraucht werden —
sie sind keine Rollen, sondern Bestandteile von `PP.gradient`. Zählt man sie
mit, sind es 16.

**Dazu 5 Rang-Farben** (`bronze` `silver` `gold` `platin` `diamant`), die
fachlich unterscheidbar bleiben müssen: ein Nutzer muss Gold von Platin
unterscheiden können, sonst verliert der Rang seinen Sinn. Sie liegen
paarweise bei ΔE 12–16 auseinander — deutlich über der Schwelle, also
tatsächlich verschiedene Farben, keine Dubletten.

**Summe: 14 Rollen + 2 Verlauf + 5 Ränge = 21 Token.**

### 3.4 Was dabei verschwindet

| Ist-Wert | Fundstellen | wird zu | ΔE | Bewertung |
|---|---:|---|---:|---|
| `#0a1a18` (Schleier) | 1 | `alpha(inkDeep, veil)` | **1.37** | unsichtbar ✅ |
| `#000000` @ .40 (Schleier) | 1 | `alpha(inkDeep, veil)` | 19.34 roh, aber bei 50 % über Inhalt ≈ 3 | unsichtbar ✅ |
| 47 `rgba()`-Literale | 125 | `alpha(<token>, <stufe>)` | < 1 | unsichtbar ✅ |
| `#fff` (62×) | 62 | `surface` (17×) / `onBrand` (45×) | 0 | identisch ✅ |
| `#E0E0E0`, `#FFD658`, `#E89E58`, `#B9DCE8`, `#B6ECF6` | 5 | `tier.<rang>.light` | 0 | nur Umzug ✅ |
| `#ffb3b0` | 1 | `errLight` | 0 | eigener Token nötig (§3.6) |
| `#000` (QR-Modul, Toggle-Schatten) | 3 | bleibt roh | — | technisch bedingt ✅ |

### 3.5 Drei Zusammenlegungen, die eine Entscheidung brauchen

> **⚠ Designentscheidung, Rückfrage nötig**

**(a) `#B7C4C2` → `hairline` (`#E5EDEB`) · ΔE 15.10 · 1 Fundstelle**
`lib/qrsheet.ts:73` — die gestrichelte Schnittlinie auf dem gedruckten
QR-Blatt. ΔE 15 ist deutlich sichtbar, aber das Blatt geht auf **Papier**,
nicht auf ein Display: dort braucht eine Schnittlinie mehr Kontrast als eine
Trennlinie im UI, sonst ist sie nicht zu erkennen. **Empfehlung: nicht
zusammenlegen.** Als eigener Token `printCut` führen oder in `qrsheet.ts`
lassen — dort ist Print-Layout, kein App-Design.

**(b) `rgba(180,150,90,.14)` / `#8a6d3a` → `sandDeep` · 2 Fundstellen**
`app/(visitor)/settings/store.tsx:57,62` — die Ladenkachel ohne Foto.
`#8a6d3a` ist das Icon darauf und liegt ΔE 16 von `#b4965a` entfernt; beide
sind warme Brauntöne ohne Entsprechung im Theme. Der Grund wäre zu `sandDeep`
zusammenlegbar (ΔE gegen den 14-%-Aufschlag ≈ 4, unsichtbar), aber das Icon
braucht eine eigene dunkle Sandfarbe. **Empfehlung: einen Token `sandInk`
(`#8a6d3a`) ergänzen, den Grund auf `alpha(sandInk, subtle)` legen.** Das
kostet einen Token und beseitigt zwei Fremdkörper. Nur: ob die Ladenkachel
überhaupt sandfarben statt teal sein soll, ist eine Gestaltungsfrage — sie ist
heute die einzige Fläche in der App mit dieser Farbwelt.

**(c) `onBrandMuted`: 5 Weißstufen (.65 .7 .75 .85 .92) → eine · 9 Fundstellen**
Weiß bei 65 % auf teal gegen Weiß bei 92 % — das ist ein Kontrastunterschied,
den man **sieht**, wenn die Texte untereinanderstehen. Sie stehen aber in
verschiedenen Screens (`scan.tsx`, `index.tsx`, `Toast.tsx`, `QRScanner.tsx`),
nie nebeneinander. **Empfehlung: zwei Stufen statt fünf** — `onBrandMuted`
(0.85) für Zweitzeilen und `onBrandFaint` (0.70) für Kleinstschrift. Auf eine
einzige Stufe zu gehen würde die Hierarchie auf dem Scanner-Screen einebnen.
Das wäre dann Token Nr. 15.

### 3.6 Was eine eigene Rolle behalten muss

Nicht alles lässt sich einsammeln. Diese vier bleiben eigenständig, mit
Begründung:

| Token | Wert | Warum nicht zusammenlegbar |
|---|---|---|
| `errLight` | `#ffb3b0` | Fehlertext auf `inkDeep`. Gegen `err` ΔE **40** — auf dunklem Grund ist `err` unlesbar. Kontrastanforderung, keine Dublette. |
| `inkDeep` | `#0e1c1b` | Gegen `ink` ΔE **8.55**. Grenzfall, aber `inkDeep` ist Vollbildfläche, `ink` ist Text — als Textfarbe auf `ink`-Grund wäre nichts zu lesen. Rollen sind verschieden. |
| `mint`, `sky` | `#79c4b0`, `#80b4e2` | Bestandteile von `PP.gradient`. Gegeneinander ΔE **38.6** — der Verlauf lebt genau von diesem Abstand. |
| `accents[]` | 8 Hex | Auswahlpalette für Aushänge (`ColorPicker.tsx:10-17`). Kein UI-Ton, sondern **Daten**: die Menge der Farben, die das Team einem Aushang geben darf. Als Liste ins Theme, nicht als Rollen. Enthält Dubletten von `teal` und `sky` — die sollten auf die Token zeigen statt den Hex zu wiederholen. |

### 3.7 Bilanz Farben

**80 verschiedene Werte → 15 Rollen-Token + 2 Verlaufsfarben + 5 Rang-Farben
+ 1 Akzentliste (8 Werte, Daten) = 22 benannte Größen.**

Davon sind **13 schon heute im Theme**. Neu sind: `inkDeep`, `onBrand`,
`onBrandMuted`, `onBrandFaint`, `errLight`, `sandInk`, `tier.*.light`,
`accents[]` — und die Deckkraft-Leiter, die allein 125 Fundstellen ersetzt.

---

## 4. Abstände: 24 Werte → 7 Stufen

### 4.1 Zuordnung auf die heutige Skala (6/10/14/18/22/32)

| Ist | Anzahl | Stufe | Ziel | Abweichung |
|---:|---:|---|---:|---:|
| 1 | 15 | `xs` | 6 | **+5** |
| 2 | 19 | `xs` | 6 | **+4** |
| 3 | 8 | `xs` | 6 | **+3** |
| 4 | 23 | `xs` | 6 | +2 |
| 5 | 1 | `xs` | 6 | +1 |
| **6** | **34** | `xs` | 6 | ±0 ✅ |
| 7 | 2 | `xs` | 6 | −1 |
| 8 | 43 | `xs` | 6 | −2 |
| 9 | 1 | `sm` | 10 | +1 |
| **10** | **32** | `sm` | 10 | ±0 ✅ |
| 11 | 1 | `sm` | 10 | −1 |
| **12** | **70** | `sm` | 10 | **−2** |
| 13 | 1 | `md` | 14 | +1 |
| **14** | **30** | `md` | 14 | ±0 ✅ |
| 16 | 14 | `md` | 14 | −2 |
| 18 | 6 | `lg` | 18 | ±0 ✅ |
| **20** | **63** | `lg` | 18 | **−2** |
| 22 | 8 | `xl` | 22 | ±0 ✅ |
| 24 | 12 | `xl` | 22 | −2 |
| 28 | 4 | `xxl` | 32 | **+4** |
| 36 | 1 | `xxl` | 32 | −4 |
| 80 | 1 | — | — | Einzelfall (`_layout.tsx:40`, `paddingTop`) |
| 0, −2 | 5 | — | — | bleiben |

**Mittlerer Versatz: 1.80 pt. 273 von 389 Fundstellen (70 %) würden sich um
≥ 2 pt verschieben, 48 um ≥ 3 pt.** Das ist zu viel: bei 70 % verschobener
Fundstellen wird aus dem Einsammeln eine Neugestaltung.

### 4.2 Die Diagnose: die Skala sitzt falsch

Die beiden meistgenutzten Werte der App — **12 (70×)** und **20 (63×)** —
haben keine Stufe. Zusammen sind das 133 Fundstellen, ein Drittel aller
Abstände. Gleichzeitig wird `lg` (18) nur 6× und `xl` (22) nur 8× getroffen.

Die Skala stammt aus dem Entwurf (`design/HANDOFF.md`), der Code ist
daneben gelaufen und hat sich auf ein 4er-Raster eingependelt. Zu behaupten,
12 und 20 seien „Zufall", hält der Zählung nicht stand: ein Zufall kommt nicht
70× vor und schon gar nicht in 30 verschiedenen Dateien.

### 4.3 Skalenvarianten im Vergleich

Gemessen an allen 389 positiven Fundstellen:

| Variante | Stufen | mittl. Versatz | ≥ 2 pt | ≥ 3 pt |
|---|---:|---:|---:|---:|
| **IST** 6/10/14/18/22/32 | 6 | 1.80 pt | 273 (70 %) | 48 |
| A: 4/8/12/16/20/32 | 6 | 1.11 pt | 162 (42 %) | 33 |
| **B: 4/8/12/16/20/24/32** | **7** | **0.99 pt** | **150 (39 %)** | **21** |
| C: IST + 2 | 7 | 1.41 pt | 231 (59 %) | 6 |
| D: IST + 12 + 20 | 8 | 1.11 pt | 140 (36 %) | 48 |
| E: 4/8/12/16/20/24/32/40 | 8 | 0.97 pt | 150 (39 %) | 21 |

**Empfehlung: Variante B — `4 / 8 / 12 / 16 / 20 / 24 / 32`.**

- Halbiert den mittleren Versatz gegenüber heute (1.80 → 0.99 pt).
- Braucht **eine** Stufe mehr als heute, nicht zwei.
- Reines 4er-Raster: leicht zu merken, leicht einzuhalten, und jeder neue
  Wert fällt sofort auf.
- Die drei häufigsten Ist-Werte (12 → 70×, 8 → 43×, 20 → 63×) treffen
  **exakt**; das sind 176 Fundstellen ohne jede Verschiebung.
- Variante E (bis 40) bringt nichts: über 32 gibt es nur zwei Fundstellen.

**Reichen 6 Stufen?** Nein. Mit sechs Stufen (Variante A) fehlt die 24, und
die 12 Fundstellen dort müssten auf 20 oder 32 — ein Versatz von 4 bzw. 8 pt,
das ist sichtbar. **Die fehlende Stufe ist die 24.**

### 4.4 Was dabei nicht mitkommt

Die 42 Fundstellen mit `marginTop: 1 / 2 / 3` (und `-2`) sind **keine
Abstände im Sinne der Leiter**. Sie rücken ein Icon gegen die Grundlinie des
Textes daneben — optische Feinjustage, die nur diese eine Zeile betrifft.
Sie auf `4` zu runden wäre ein Versatz von bis zu 300 % und würde genau das
kaputt machen, wofür sie da sind. Diese Werte bleiben vor Ort (§8).

Rechnet man sie heraus, betrifft die Leiter **347 Fundstellen**, und der
mittlere Versatz von Variante B sinkt auf **0.76 pt**.

> **⚠ Designentscheidung, Rückfrage nötig:** Der Umstieg von der
> 6/10/14/18/22-Skala auf das 4er-Raster verändert den vertikalen Rhythmus der
> App leicht — Karteninnenabstand 14 → 16, Zeilenabstand 10 → 12. Das ist
> gegenüber dem heutigen Zustand **keine** Verschlechterung (heute sind 12 und
> 20 ohnehin die Mehrheit), aber es weicht vom ursprünglichen Entwurf in
> `design/HANDOFF.md` ab. Wenn der Entwurf bindend ist, wäre stattdessen
> Variante D (IST + 12 + 20) zu nehmen — acht Stufen, aber jede davon belegt.

---

## 5. Schriftgrößen: 17 Werte → 8 Stufen

### 5.1 Zuordnung auf `PP.fontSizes`

77 hartkodierte `<PPText size={n}>`, 17 verschiedene Werte:

| Ist | Anzahl | Stufe | Ziel | Abweichung |
|---:|---:|---|---:|---:|
| 10 | 3 | `xs` | 10.5 | +0.5 |
| **10.5** | 6 | `xs` | 10.5 | ±0 ✅ |
| **11** | **10** | `xs` | 10.5 | −0.5 |
| **11.5** | 4 | `sm` | 11.5 | ±0 ✅ |
| 12 | 4 | `sm` | 11.5 | −0.5 |
| 12.5 | 6 | `sm` | 11.5 | **−1.0** |
| **13** | **18** | `base` | 13.5 | +0.5 |
| **13.5** | 4 | `base` | 13.5 | ±0 ✅ |
| 14 | 5 | `base` | 13.5 | −0.5 |
| 15 | 2 | `md` | 15 | ±0 ✅ |
| 16 | 3 | `md` | 15 | **−1.0** |
| 18 | 1 | `lg` | 17 | **−1.0** |
| 19 | 1 | `lg` | 17 | **−2.0** |
| 22 | 3 | `xl` | 22 | ±0 ✅ |
| 24 | 3 | `xl` | 22 | **−2.0** |
| 30 | 1 | `xxl` | 28 | **−2.0** |
| 32 | 3 | `hero` | 32 | ±0 ✅ |

**Verteilung nach Zuordnung:** `xs` 19 · `sm` 14 · `base` 27 · `md` 5 ·
`lg` 2 · `xl` 6 · `xxl` 1 · `hero` 3.

**22 von 77 treffen exakt, 47 liegen ±0.5 daneben, 8 um ≥ 1 pt.**

### 5.2 Sichtbarkeit

Zu beachten: `PP.fontScale = 1.15` multipliziert jede Größe in `PPText`
durch (`Text.tsx:22`). Aus ±0.5 pt im Code werden also ±0.58 pt auf dem
Bildschirm.

- **±0.5 pt (47 Fundstellen):** bei Work Sans in dieser Größenordnung eine
  Änderung von rund 4 %. Nicht wahrnehmbar, auch nicht im Vergleich.
  **Unbedenklich.**
- **−1.0 pt (10 Fundstellen):** 12.5 → 11.5 und 16 → 15 und 18 → 17. Rund
  8 %. An einer Einzelstelle nicht auffällig; wo zwei davon direkt
  übereinanderstehen (`settings/store.tsx:112,115` — 14 und 12.5), bleibt der
  Unterschied nach der Rundung erhalten (15 vs. 11.5). **Unbedenklich.**
- **−2.0 pt (5 Fundstellen):** siehe unten.

> **⚠ Designentscheidung, Rückfrage nötig — 5 Fundstellen**
>
> | Stelle | Ist | Ziel | Was es ist |
> |---|---:|---:|---|
> | `badges.tsx:79` | 19 | 17 (`lg`) | Überschrift im Abzeichen-Blatt |
> | `badges.tsx:62`-Bereich, `index.tsx:96` | 24 | 22 (`xl`) | Kennzahl auf der Karte |
> | `Stat.tsx:16` | 24 | 22 (`xl`) | Kennzahl |
> | `points.tsx:89` | 30 | 28 (`xxl`) | Punktestand, grösste Zahl im Screen |
>
> Das sind die grossen Zahlen und Überschriften — genau die Stellen, an denen
> 2 pt (mit `fontScale` 2.3 pt) am ehesten auffallen. `points.tsx:89` hat
> ausserdem ein handgesetztes `lineHeight: 32`, das mitgezogen werden müsste.
> **Empfehlung: entweder diese fünf auf die nächste Stufe heben statt senken
> (19 → 22, 24 → 28, 30 → 32) oder eine Stufe `xl2` bei 24 ergänzen.** Die
> Entscheidung gehört zum Entwurf, nicht in ein Audit.

### 5.3 Sollte `size={n}` ganz verschwinden?

**Ja — und das ist die Voraussetzung dafür, dass einzelne Textgrößen
überhaupt zentral änderbar werden.** Heute geht nur der globale `fontScale`:
man kann die ganze App vergrössern, aber nicht „alle Kartenüberschriften
einen Punkt grösser". Solange 77 Stellen ihre Größe selbst mitbringen, gibt
es diesen Hebel nicht.

Technisch: `size?: number` in `PPTextProps` durch
`size?: keyof typeof PP.fontSizes` ersetzen. TypeScript weist dann jedes
`size={13}` als Fehler aus — die Umstellung ist vollständig überprüfbar und
kann nicht halb steckenbleiben.

**Wo das nicht aufgeht — vier Stellen, alle berechnet:**

| Stelle | Ausdruck | Warum |
|---|---|---|
| `components/ui/Avatar.tsx:27` | `size={size * 0.36}` | Initialen skalieren mit dem Avatar-Durchmesser, der von aussen kommt. |
| `components/BrandMark.tsx:24` | `size={iconSize ?? size * 0.5}` | dito für das Markenzeichen. |
| `components/ui/BadgeMedallion.tsx:66` | `size={size * 0.46}` | dito für die Medaille. |
| `components/ui/ProgressBar.tsx:25,27` | `borderRadius: height` | (kein Text, aber gleiche Logik) |

Diese drei sind **richtig so**: sie halten ein Verhältnis, keine Größe. Die
saubere Lösung ist eine zweite, ausdrücklich benannte Prop —
`rawSize?: number` — die genau diesen Fall zulässt und durch ihren Namen
sagt, dass hier bewusst an der Skala vorbeigearbeitet wird. Alle anderen 77
Stellen bekommen eine Stufe.

**Ergebnis: 17 Werte → 8 Stufen + 3 berechnete Ausnahmen.**

### 5.4 Was die Stufen noch mitbringen müssen

Zur Größe gehören drei Werte, die heute daneben von Hand gesetzt werden:

- **`lineHeight` — 12 Fundstellen** (16, 17, 18, 19, 21, 26, 32, 34). Jede
  Stelle rechnet für sich; die Verhältnisse liegen zwischen 1.06 und 1.46.
  Als Verhältnis an die Stufe gebunden (`tight` 1.1 / `snug` 1.25 /
  `normal` 1.45) verschwinden alle zwölf.
- **`letterSpacing` — 35 Fundstellen**. Zwei klare Muster: gesperrt
  (+0.1…+0.4, 23× — Kleinschrift-Labels, `0.3` allein 16×) und verdichtet
  (−0.2…−0.8, 12× — grosse Überschriften; je grösser, desto negativer). Das
  ist eine Typografie-Regel, 35× wiederholt.
- **Fehler im Bestand:** `Text.tsx:28-31` skaliert `fontSize` und
  `lineHeight` mit `fontScale`, **`letterSpacing` aber nicht**. Bei
  `fontScale: 1.15` stehen die Buchstaben grosser Überschriften darum enger,
  als sie entworfen wurden. Eine an die Stufe gebundene Laufweite behebt das
  nebenbei.

`fontWeight` ist dagegen sauber: nur 2 Fundstellen
(`app/_layout.tsx:45,47`, im Fehlerbildschirm ohne geladene Schriften),
sonst durchgehend `weight="…"` (semibold 69×, bold 17×, medium 7×).

### 5.5 Icon-Größen: 17 Werte → 6 Stufen

58 hartkodierte `<Icon size={n}>`, keinerlei Token:

| Stufe | Ziel | Ist-Werte | Fundstellen | max. Versatz |
|---|---:|---|---:|---:|
| `xs` | 12 | 11, 12, 13 | 3 | ±1 |
| `sm` | 16 | 15, 16 | 5 | −1 |
| `md` | 18 | 18 | **16** | ±0 ✅ |
| `lg` | 22 | 20, 22, 24 | 17 | ±2 |
| `xl` | 28 | 26, 28, 32 | 9 | ±4 |
| `hero` | 48 | 42, 44, 48 | 6 | −6 |
| — | — | 62, 64 | 2 | Onboarding-Zeichen, bleiben roh |

Die Standardgröße im Wrapper ist heute 22 (`icons.tsx:237`), genutzt wird
aber überwiegend 18 und 20.

> **⚠ Designentscheidung, Rückfrage nötig:** `xl` und `hero` runden um bis zu
> 6 pt. Bei einem Icon ist das relativ mehr als bei Schrift (48 → 42 sind
> 12 %) und an den Onboarding-Bildzeichen sichtbar. **Empfehlung: `lg` auf 20
> statt 22 legen** (trifft die 10 Fundstellen mit 20 exakt und die 22er nur um
> 2 daneben) und die drei Großstufen mit dem Entwurf abgleichen, statt sie
> aus dem Bestand zu mitteln.

---

## 6. Radien: 21 Werte → 6 Stufen

### 6.1 Zuordnung auf `PP.r*` (14/16/18/22/999)

| Ist | Anzahl | Token | Ziel | Abweichung |
|---:|---:|---|---:|---:|
| 2 | 1 | `rField` | 14 | **+12** |
| 3 | 1 | `rField` | 14 | **+11** |
| 4 | 2 | `rField` | 14 | **+10** |
| 5 | 1 | `rField` | 14 | **+9** |
| 6 | 2 | `rField` | 14 | **+8** |
| 7 | 1 | `rField` | 14 | **+7** |
| 8 | 1 | `rField` | 14 | **+6** |
| 10 | 2 | `rField` | 14 | **+4** |
| 11 | 3 | `rField` | 14 | +3 |
| **12** | **22** | `rField` | 14 | +2 |
| **14** | 7 | `rField` | 14 | ±0 ✅ |
| 16 | 1 | `rBtn` | 16 | ±0 ✅ |
| 17 | 1 | `rBtn` | 16 | −1 |
| **18** | 7 | `rTile` | 18 | ±0 ✅ |
| 20 | 1 | `rTile` | 18 | −2 |
| 22 | 1 | `rCard` | 22 | ±0 ✅ |
| 24 | 2 | `rCard` | 22 | −2 |
| 26 | 1 | `rCard` | 22 | **−4** |
| 28 | 4 | `rCard` | 22 | **−6** |
| 66 | 1 | — | — | halber Durchmesser `BrandMark` |
| 999 | 3 | `rPill` | 999 | ±0 ✅ |

**Mittlerer Versatz: 3.56 pt. 45 von 62 Fundstellen (73 %) verschieben sich
um ≥ 2 pt, 20 um ≥ 3 pt.** Noch schlechter als bei den Abständen.

### 6.2 Diagnose und Variantenvergleich

Dasselbe Muster: **12 ist der meistgenutzte Radius der App (22×) und hat
keinen Token**, während `rCard` (22) genau **einmal** roh vorkommt. Nach oben
fehlt eine Stufe für die Sheet-Oberkante (28, 4×), nach unten eine für die
Mikroradien (2–8, 9 Fundstellen an QR-Rahmen, Sheet-Griff, Fortschrittsbalken).

| Variante | Stufen | mittl. Versatz | ≥ 2 pt | ≥ 3 pt |
|---|---:|---:|---:|---:|
| **IST** 14/16/18/22 | 4 | 3.56 pt | 45 (73 %) | 20 |
| A: 12/14/18/22 | 4 | 2.44 pt | 21 (34 %) | 15 |
| **B: 6/12/14/18/22/28** | **6** | **1.15 pt** | **13 (21 %)** | **3** |
| C: 4/8/12/16/22/28 | 6 | 1.47 pt | 24 (39 %) | 1 |

**Empfehlung: Variante B — `6 / 12 / 14 / 18 / 22 / 28` (+ `rPill` 999).**

| Token | Wert | Rolle | Fundstellen |
|---|---:|---|---:|
| `rMicro` | 6 | QR-Rahmen, Sheet-Griff, Balken | 9 |
| `rTile2` | **12** | **Icon-Kachel** — neu, häufigster Radius | 27 |
| `rField` | 14 | Eingabefeld, Hinweisblock | 8 |
| `rTile` | 18 | Kachel, Bildfläche | 8 |
| `rCard` | 22 | Karte | 4 |
| `rSheet` | **28** | Oberkante Bottom Sheet — neu | 6 |
| `rPill` | 999 | Pill, runder Knopf | 3 |

Der mittlere Versatz fällt von 3.56 auf 1.15 pt, und nur noch 3 Fundstellen
verschieben sich um ≥ 3 pt (die `26`, die `20` und der `66er` in
`BrandMark.tsx`, der als `size/2` berechnet gehört und gar nicht auf die
Skala soll).

**`rBtn` (16) entfällt**: genau 1 Fundstelle, und `PPButton.tsx:38` setzt
für die kleine Größe ohnehin von Hand `14`. Die 16 geht auf `14` oder `18` —
ein Punkt Unterschied, unsichtbar. **21 Werte → 6 Stufen + 1 Pill.**

---

## 7. Icons

**Bibliothek:** `@expo/vector-icons` → `FontAwesome6`, durchgehend `solid`.
Einziger Import in `lib/icons.tsx:4`. Kein Screen importiert die Bibliothek
direkt — **das ist sauber gelöst und soll so bleiben.**

**Register:** `lib/icons.tsx` mappt 116 interne Namen (`IconName`) auf
FA6-Namen. Die Namen sind semantisch (`map-pin`, `qr-scan`, `helping-hand`),
nicht FA6-spezifisch — die Bibliothek liesse sich austauschen, ohne einen
Screen anzufassen. Dazu `BADGE_ICONS` (64 Namen, thematisch gruppiert) als
Auswahlliste für den Abzeichen-Editor.

**Nutzung:** 111 String-Literale (`<Icon name="…">` 39×, `icon="…"`-Prop 72×),
alle auf `IconName` typisiert — ein Tippfehler fällt beim Kompilieren auf.
**Die Literale sind kein Problem**: sie benennen, was an dieser Stelle gemeint
ist, und lassen sich nicht sinnvoll auf weniger Werte zusammenlegen.

**Was fehlt:**

1. **Größenskala** — siehe §5.5, 17 Werte ohne Token.
2. **Semantische Rollen.** Drei Bedeutungen stehen zusammen 29× als Literal
   da: `chevron-left` als Zurück (13×), `shirt` als Platzhalter für ein Teil
   ohne Foto (9×), `map-pin` als „extern" (7×). Diese drei gehören in eine
   Rollentabelle — nicht weil die Namen zu viele wären, sondern weil die
   *Zuordnung* eine Design-Entscheidung ist, die heute 29× wiederholt wird.
   Die übrigen ~80 Literale sind beschreibend und bleiben.
3. **Rang-Symbole.** Kein `tierIcon` — `medal` und `trophy` werden je nach
   Screen unterschiedlich gewählt.

---

## 8. Weitere Design-Werte

### 8.1 Schatten: 6 Blöcke ausserhalb des Themes → 3 Stufen

`PP.shadowCard` (7×) und `PP.shadowTabBar` (2×) werden genutzt,
`surfaceElevation()` 10×. Daneben stehen sechs vollständige Schattenblöcke,
zusammen 30 Einzeleigenschaften:

| Stelle | Farbe | Opazität | Radius | Offset y | Elev. | Zweck |
|---|---|---:|---:|---:|---:|---|
| `PPButton.tsx:99-105` | `PP.teal` | 0.32 | 18 | 6 | 4 | Primärknopf |
| `BadgeMedallion.tsx:59-63` | Rangfarbe | 0.40 | 12 | 4 | 4 | Medaille |
| `Card.tsx:52-55` | `colors[0] ?? teal` | 0.18 | 24 | 8 | — | Verlaufskarte |
| `BrandMark.tsx:17-21` | `PP.teal` | 0.32 | 30 | 12 | 6 | Markenzeichen |
| `Toast.tsx:69-73` | `PP.teal` | 0.28 | 30 | 14 | 8 | schwebende Meldung |
| `welcome.tsx:28-32` | `PP.teal` | 0.30 | 50 | 20 | 8 | Markenzeichen, gross |

Vier davon sind derselbe Gedanke — „farbiger Glanz unter einem
Markenelement" — in vier Abstufungen. `BrandMark` und `welcome` zeigen sogar
**dasselbe Element** in zwei Größen und driften in allen fünf Werten
auseinander.

**Zusammenlegung auf drei Stufen** (`s` / `m` / `l`), Farbe als Parameter:

| Stufe | Opazität | Radius | y | Elev. | ersetzt |
|---|---:|---:|---:|---:|---|
| `s` | 0.32 | 18 | 6 | 4 | Knopf, Medaille |
| `m` | 0.30 | 30 | 14 | 8 | Toast, Markenzeichen |
| `l` | 0.30 | 50 | 20 | 8 | Markenzeichen gross |

Die Verlaufskarte (0.18/24/8) bleibt ein Sonderfall — sie ist bewusst
weicher, weil die Karte selbst schon farbig ist. **6 Blöcke → 3 Stufen + 1
Sonderfall.**

### 8.2 Feste Elementmaße: 125 Fundstellen, davon 41 ein Muster

| Maß | Anzahl | Was es ist |
|---:|---:|---|
| 38×38 | 17 | Icon-Kachel klein (Listenzeile, Einstellung) — meist `borderRadius: 12` |
| 40×40 | 14 | Icon-Kachel mittel (Admin-Liste, `IconButton`, Toast) — `borderRadius: 12` |
| 44×44 | 10 | Antippfläche (Stepper, Berechtigungen) — `borderRadius: 12/14` |
| 46×46 | 7 | Farb-/Icon-Auswahlkachel, Toggle-Bahn |
| 48×48 | 4 | Icon-Kachel gross (Onboarding, Scanner) |
| 280 | 3 | `maxWidth` für zentrierten Fliesstext |
| 132, 240, 112, 64, 36, 34, 28, 12 | je 2–5 | Kachelhöhen, Ringe, Punkte, Griffe |

Die Gruppe 38/40/44/46/48 mit `borderRadius: 12` ist **dasselbe Element in
fünf Größen, 52× von Hand gebaut**: quadratische Fläche, weicher Radius,
getönter Grund, Icon mittig.

Das lässt sich auf **drei Größen** zusammenlegen (`s` 40 / `m` 44 / `l` 48).
38 → 40 und 46 → 44 sind Versätze von 2 pt an einem Quadrat — unsichtbar,
solange nicht zwei davon direkt nebeneinanderstehen (kommt nicht vor).

**Wichtiger als der Token ist hier die fehlende Komponente:** ein
`<IconTile size="s|m|l" tone=… icon=… />` ersetzt alle 52 Stellen, und die
Maße dahinter werden zum Implementierungsdetail, das niemand mehr tippt.
Ein Token allein verlagert die Wiederholung nur.

### 8.3 Randbreiten: 3 Konventionen → 2

`borderWidth: 1` (9×), `1.5` (2×), `borderLeftWidth: 4` (1×), dazu
`StyleSheet.hairlineWidth` (`TabBar.tsx:214`). Vorschlag: `hair`
(`hairlineWidth`) und `thin` (1). Die beiden `1.5` gehen auf `1` — der
Unterschied liegt bei einem physischen Pixel und ist auf keinem Gerät
sichtbar. Die `4` ist ein Akzentbalken, kein Rand, und bleibt. **4 → 2.**

### 8.4 Bewegung: 3 Dauern → 2

`Toast.tsx`: 200 ms (ein), 240 ms (aus, 2×), `withSpring({damping: 16,
stiffness: 160})`. `Toggle.tsx`: 150 ms (2×). Drei Dauern für dieselbe Art
Bewegung. Vorschlag: `fast` 150 (Schalter), `base` 220 (Ein-/Ausblenden) —
der Unterschied zwischen 200 und 240 ms ist bei einer einblendenden Meldung
nicht wahrnehmbar. **3 → 2 + 1 Feder.**

### 8.5 Opazität

`opacity:` kommt als Style **nicht ein einziges Mal** vor — Transparenz läuft
durchweg über `rgba()` und `pressedOpacity()`. Sauber.

---

## 9. Was NICHT ins Theme gehört

Das ist die andere Hälfte der Arbeit. Ein Theme, in dem jeder Einzelwert
landet, ist nur ein zweiter Ort für dieselbe Unordnung.

**Prüfstein:** Ein Wert gehört ins Theme, wenn eine Änderung an ihm die ganze
App betreffen **soll**. Lautet die Antwort auf „was passiert, wenn ich das
ändere?" — „hoffentlich nichts anderes", dann ist es Layout und bleibt vor Ort.

| Was | Fundstellen | Begründung |
|---|---:|---|
| **Optische Feinjustage** `marginTop: 1/2/3`, `-2` | 44 | Rückt ein Icon gegen die Grundlinie des Textes daneben. Betrifft genau diese Zeile. Auf `4` gerundet wäre das ein Versatz von bis zu 300 % — es macht kaputt, wofür der Wert da ist. |
| **Einmalige Bildhöhen** (280, 240, 200, 132) | ~10 | Bildproportion einer Ansicht. |
| **`maxWidth: 280`** | 3 | Textmaß eines Onboarding-Absatzes. |
| **`flex`, `alignItems`, `justifyContent`, `flexDirection`** | viele | Anordnung, nicht Gestalt. |
| **Berechnete Maße** (`size * 0.46`, `borderRadius: height`, `size/2`) | ~8 | Schon relativ, schon richtig. Brauchen die `rawSize`-Ausnahme (§5.3), keinen Token. |
| **Navigationsmaße** (`TAB_CLEARANCE = 100`, Leistenhöhe 64, `insets.top + 8`) | 6 | Gehören zur Navigationsstruktur. Liegen in `Screen.tsx` / `TabBar.tsx` genau richtig. |
| **QR-Kantenlängen** (48, 56, 160) | 3 | Lesbarkeit des Codes im Kontext, nicht Typografie. |
| **QR-Druckblatt-Millimeter** (`qrsheet.ts`) | ~15 | Print-Layout in HTML. Nur die vier **Farben** dort sind Theme-Sache. |
| **`#000` im QR-Modul, `#000` im Toggle-Schatten** | 3 | Technisch bedingt — ein QR-Code braucht echtes Schwarz. |
| **Mikroradien an konkreten Rahmen** (2, 3) | 2 | Passen sich einem gegebenen Element an. |

**Größenordnung:** Von 868 gezählten Fundstellen in den vier Hauptkategorien
gehören rund **760 auf eine Skala** und rund **110 bleiben Layout**. Der
Anspruch ist nicht null hartkodierte Werte — der Anspruch ist, dass keine
*Design-Entscheidung* mehr doppelt existiert.

---

## 10. Drei Befunde, die keine Skala löst

1. **Die Icon-Kachel ist eine fehlende Komponente, kein fehlender Token.**
   52 Stellen bauen von Hand nach:
   `<View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: <tint>, alignItems: 'center', justifyContent: 'center' }}><Icon …/></View>`.
   Token für 38, 12 und den Tint machen daraus dreimal so viel Schreibarbeit
   bei gleicher Wiederholung. Eine Komponente macht sie verschwinden.

2. **`app/_layout.tsx:38-56` umgeht das Theme vollständig** — nacktes
   `<Text>`, `fontWeight: '700'`, fünf Hex-Farben. Der Fehlerbildschirm läuft
   bewusst ohne geladene Schriften; das rechtfertigt `<Text>`, nicht die
   rohen Farben.

3. **Die Plattformschicht hat toten Code.** `stateLayer()`, `MD3_STATE`,
   `MD3_ELEVATION` und `isIOS` haben **null** Verwendungen ausserhalb von
   `theme.ts`. `radius(ios, android)` ebenfalls null — die 25 Treffer auf
   `radius` sind durchweg der gleichnamige Prop von `Card`/`GlassCard`/
   `BrandMark`. Statt `radius()` steht viermal von Hand
   `isAndroid ? MD3_SHAPE.x : PP.rY` (`Card.tsx:15,39`, `GlassCard.tsx:32`,
   `PPButton.tsx:38`, `IconButton.tsx:28`, `Pill.tsx:35`). Entweder das
   Werkzeug benutzen oder es entfernen — beides ist besser als der Zustand,
   in dem ein Leser nach dem Vorbild sucht und keines findet.

---

## 11. Struktur für die erweiterte `theme.ts`

Leitgedanken:

- **Nur ergänzen, nichts umbenennen.** Alle heutigen `PP.*`-Namen bleiben,
  sonst wird aus dem Aufräumen eine Migration über 51 Dateien.
- **Getönte Flächen werden berechnet, nicht abgeschrieben** — eine Funktion
  plus sechs Stufen statt 47 rgba-Literale.
- **Typografie als Rolle**: Größe, Schnitt, Zeilenhöhe und Laufweite gehören
  zusammen und skalieren gemeinsam mit `fontScale`.
- **Die Skalen bilden die Praxis ab**, nicht den ursprünglichen Entwurf —
  siehe die markierten Rückfragen in §4.4 und §5.2.

```ts
// mobile/lib/theme.ts  (Strukturentwurf)

import { Platform, StyleSheet } from 'react-native';
import type { IconName } from './icons';

// ── Rohfarben: die einzige Stelle mit Hex-Literalen ─────────────────────────
const RAW = {
  teal: '#27b092', mint: '#79c4b0', sky: '#80b4e2',
  bg: '#F4F7F4', surface: '#FFFFFF', sand: '#F4EFE6', sandDeep: '#EBE3D2',
  ink: '#1A2E2C', ink2: '#5A6B6A', ink3: '#9AA8A7', hairline: '#E5EDEB',
  inkDeep: '#0e1c1b',   // NEU — Vollbildgrund; schluckt auch #0a1a18 (ΔE 1.4)
  onBrand: '#FFFFFF',   // NEU — Text/Icon auf gefärbtem Grund (45 der 62 #fff)
  sandInk: '#8a6d3a',   // NEU — Schrift/Icon auf Sandfläche  (§3.5b)
  warn: '#E8A93B', err: '#D9534F', errLight: '#ffb3b0', // errLight NEU (ΔE 40)
  bronze: '#CD7F32', silver: '#B8B8B8', gold: '#E8B923',
  platin: '#7FB6C9', diamant: '#6FD3E8',
} as const;

/** Hex + Deckkraft → rgba(). Ersetzt 47 rgba-Literale an 125 Stellen. */
export function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(f, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Deckkraft-Leiter: 30 Ist-Werte → 6 Stufen (§3.2). */
export const ALPHA = {
  ghost: 0.05, subtle: 0.08, soft: 0.12,
  medium: 0.18, strong: 0.35, veil: 0.50,
} as const;
type AlphaStep = keyof typeof ALPHA;

export const PP = {
  ...RAW,

  gradient: [RAW.teal, RAW.mint, RAW.sky] as const,
  gradientSoft: [alpha(RAW.teal, 0.12), alpha(RAW.mint, 0.10), alpha(RAW.sky, 0.12)] as const,
  gradientAngle: 135,
  glass: alpha(RAW.surface, 0.65),
  glassDark: alpha(RAW.ink, 0.55),
  scrim: alpha(RAW.inkDeep, ALPHA.veil),   // NEU — ersetzt 3 Schleierwerte

  /** Text auf gefärbtem Grund — 2 Stufen statt 5 (§3.5c). */
  onBrandMuted: alpha(RAW.surface, 0.85),  // NEU
  onBrandFaint: alpha(RAW.surface, 0.70),  // NEU

  /** Getönte Flächen. Ersetzt rgba(26,46,44,0.06) & Co. */
  tint: {                                                        // NEU
    ink:  (a: AlphaStep = 'soft') => alpha(RAW.ink, ALPHA[a]),
    teal: (a: AlphaStep = 'soft') => alpha(RAW.teal, ALPHA[a]),
    warn: (a: AlphaStep = 'soft') => alpha(RAW.warn, ALPHA[a]),
    err:  (a: AlphaStep = 'soft') => alpha(RAW.err, ALPHA[a]),
    sky:  (a: AlphaStep = 'soft') => alpha(RAW.sky, ALPHA[a]),
    sand: (a: AlphaStep = 'soft') => alpha(RAW.sandInk, ALPHA[a]),
  },

  /** Ränge: fachlich unterscheidbar (ΔE 12–16), bleiben 5 Farben. */
  tier: {                                          // .light NEU (heute roh)
    bronze:  { base: RAW.bronze,  light: '#E89E58' },
    silber:  { base: RAW.silver,  light: '#E0E0E0' },
    gold:    { base: RAW.gold,    light: '#FFD658' },
    platin:  { base: RAW.platin,  light: '#B9DCE8' },
    diamant: { base: RAW.diamant, light: '#B6ECF6' },
  },

  /** Auswahlpalette für Aushänge — Daten, keine Rollen (§3.6). */
  accents: [                                                     // NEU
    { name: 'Teal', hex: RAW.teal }, { name: 'Sky', hex: RAW.sky },
    { name: 'Beere', hex: '#b0478a' }, { name: 'Koralle', hex: '#e2664f' },
    { name: 'Bernstein', hex: '#d99320' }, { name: 'Wald', hex: '#4a8c56' },
    { name: 'Pflaume', hex: '#7a5aa8' }, { name: 'Nordsee', hex: '#2d6e8e' },
  ] as const,

  // ── Abstände: 24 Werte → 7 Stufen, 4er-Raster (§4.3, Variante B) ──────────
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, huge: 32 },

  // ── Radien: 21 Werte → 6 Stufen + Pill (§6.2, Variante B) ────────────────
  rMicro: 6,    // NEU — QR-Rahmen, Sheet-Griff, Balken
  rTile2: 12,   // NEU — Icon-Kachel; häufigster Radius der App (22×)
  rField: 14,
  rTile: 18,
  rCard: 22,
  rSheet: 28,   // NEU — Oberkante Bottom Sheet
  rPill: 999,
  // rBtn (16) entfällt — 1 Fundstelle, geht auf rField/rTile

  // ── Typografie: 17 Werte → 8 Stufen (§5) ─────────────────────────────────
  fontScale: 1.15,
  font: {
    regular: 'WorkSans_400Regular', medium: 'WorkSans_500Medium',
    semibold: 'WorkSans_600SemiBold', bold: 'WorkSans_700Bold',
  },
  fontSizes: { xs: 10.5, sm: 11.5, base: 13.5, md: 15, lg: 17, xl: 22, xxl: 28, hero: 32 },
  leading:  { tight: 1.1, snug: 1.25, normal: 1.45, loose: 1.6 },        // NEU
  tracking: { hero: -0.8, title: -0.4, body: 0, label: 0.3, caps: 0.4 }, // NEU

  /** Textrollen — Größe, Schnitt, Zeilenhöhe und Laufweite als EIN Bündel. */
  text: {                                                        // NEU
    hero:     { size: 'hero', weight: 'bold',     leading: 'tight',  tracking: 'hero'  },
    title:    { size: 'xl',   weight: 'bold',     leading: 'snug',   tracking: 'title' },
    section:  { size: 'lg',   weight: 'semibold', leading: 'snug',   tracking: 'title' },
    body:     { size: 'base', weight: 'regular',  leading: 'normal', tracking: 'body'  },
    label:    { size: 'sm',   weight: 'semibold', leading: 'snug',   tracking: 'label' },
    caption:  { size: 'sm',   weight: 'regular',  leading: 'normal', tracking: 'body'  },
    overline: { size: 'xs',   weight: 'semibold', leading: 'snug',   tracking: 'caps'  },
  },

  // ── Icons: 17 Größen → 6 Stufen (§5.5) ───────────────────────────────────
  iconSizes: { xs: 12, sm: 16, md: 18, lg: 20, xl: 28, hero: 48 },       // NEU
  /** Rollen: was ein Symbol BEDEUTET (29 wiederholte Zuordnungen, §7). */
  icon: {                                                                 // NEU
    back: 'chevron-left', forward: 'chevron-right', close: 'x',
    add: 'plus', remove: 'minus', confirm: 'check', info: 'info',
    itemPlaceholder: 'shirt', external: 'map-pin', scan: 'qr-scan',
  } as Record<string, IconName>,
  tierIcon: {                                                             // NEU
    bronze: 'medal', silber: 'medal', gold: 'trophy',
    platin: 'crown', diamant: 'gem',
  } as Record<string, IconName>,

  // ── Maße wiederkehrender Elemente (§8.2) ─────────────────────────────────
  tile: { s: 40, m: 44, l: 48 },   // NEU — 5 Größen → 3; besser: <IconTile/>
  touchTarget: 44,                 // NEU — Mindestmaß Antippfläche
  border: { hair: StyleSheet.hairlineWidth, thin: 1 },  // NEU — 4 Werte → 2

  // ── Schatten: 6 Blöcke → 2 feste + 3 Glanzstufen (§8.1) ──────────────────
  shadowCard:   { shadowColor: RAW.ink, shadowOpacity: 0.06, shadowRadius: 16,
                  shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  shadowTabBar: { shadowColor: RAW.ink, shadowOpacity: 0.12, shadowRadius: 24,
                  shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  /** Farbiger Glanz unter einem Markenelement — 3 Stufen statt 4 Varianten. */
  glow: (color: string, level: 's' | 'm' | 'l' = 'm') => {        // NEU
    const s = { s: { o: 0.32, r: 18, y: 6,  e: 4 },
                m: { o: 0.30, r: 30, y: 14, e: 8 },
                l: { o: 0.30, r: 50, y: 20, e: 8 } }[level];
    return { shadowColor: color, shadowOpacity: s.o, shadowRadius: s.r,
             shadowOffset: { width: 0, height: s.y }, elevation: s.e };
  },

  // ── Bewegung: 3 Dauern → 2 (§8.4) ────────────────────────────────────────
  motion: { fast: 150, base: 220, spring: { damping: 16, stiffness: 160 } }, // NEU
} as const;

export type PPTheme = typeof PP;

// ── Plattformschicht ───────────────────────────────────────────────────────
// isAndroid / MD3_SHAPE / ripple() / pressedOpacity() / surfaceElevation()
// bleiben unverändert.
// ANMERKUNG: stateLayer(), MD3_STATE, MD3_ELEVATION, isIOS und radius() haben
// NULL Verwendungen ausserhalb dieser Datei (§10.3). Entweder in den
// Komponenten einsetzen — statt der 6 handgeschriebenen
// `isAndroid ? MD3_SHAPE.x : PP.rY` — oder entfernen.
```

### `PPText` nach der Umstellung

```ts
// size wird von `number` auf die Stufen eingeengt — TypeScript weist dann
// jedes verbliebene size={13} als Fehler aus, die Umstellung ist vollständig
// überprüfbar und kann nicht halb steckenbleiben (§5.3).
interface PPTextProps extends TextProps {
  role?: keyof typeof PP.text;          // setzt Größe+Schnitt+Zeile+Laufweite
  size?: keyof typeof PP.fontSizes;     // statt `number`
  rawSize?: number;                     // nur für berechnete Größen (3 Stellen)
  weight?: Weight;
  color?: string;
}
```

### Empfohlene Reihenfolge

| # | Schritt | ersetzt | Risiko |
|---:|---|---:|---|
| 1 | `alpha()` + `ALPHA` + `PP.tint.*` | 125 Fundstellen, 47 → 6 Werte | gering, rein additiv |
| 2 | `onBrand`, `onBrandMuted/Faint`, `inkDeep`, `scrim`, `errLight`, `tier.*.light`, `accents` | 80 Fundstellen | gering |
| 3 | `space` auf 4er-Raster, Screen für Screen | 347 Fundstellen | **§4.4 klären** |
| 4 | Radien auf 6 Stufen | 62 Fundstellen | **§6.2 klären** |
| 5 | `iconSizes` + `tile` + `<IconTile/>`-Komponente | 110 Fundstellen | mittel — Komponente |
| 6 | `size` einengen, `PP.text`-Rollen in `PPText` | 77 + 47 Fundstellen | **§5.2 klären**, grösste Umstellung |
| 7 | Plattformschicht: toten Code benutzen oder löschen | 5 Symbole | gering |

Jeder Schritt ist für sich abgeschlossen und bricht nichts, weil nur ergänzt
und nichts umbenannt wird. Die Schritte 3, 4 und 6 brauchen vorher die in
§4.4, §5.2, §5.5, §6.2 und §3.5 markierten Entscheidungen.

---

## 12. Offene Entscheidungen auf einen Blick

| § | Frage | Betrifft |
|---|---|---:|
| 3.5a | `#B7C4C2` (Schnittlinie Druck) zusammenlegen oder eigener Print-Token? | 1 |
| 3.5b | Bleibt die Ladenkachel sandfarben? Dann `sandInk` als Token. | 2 |
| 3.5c | 5 Weißstufen auf 1 oder auf 2 (`Muted`/`Faint`)? | 9 |
| 4.4 | 4er-Raster (Variante B) oder Entwurfsskala + 12 + 20 (Variante D)? | 347 |
| 5.2 | 5 grosse Schriftgrößen abrunden, aufrunden oder Stufe `xl2` (24)? | 5 |
| 5.5 | Icon-`lg` auf 20 oder 22? Großstufen aus dem Entwurf oder aus dem Bestand? | 17 |
| 6.2 | `rBtn` (16) ersatzlos streichen? | 2 |
