# Logo

Das P mit angedeutetem Auge — Zeichnung von Simon Luthe (Illustrator),
hier als ein Pfad mit `fill-rule="evenodd"` aufbereitet: Bauch und Auge sind
echte Aussparungen, keine übereinandergelegten Flächen. Dadurch trägt die
Form jede Farbkombination und taugt als Stanz-, Präge- und Stempelvorlage.

Die Kontur ist gegenüber der Erstzeichnung um 10 Einheiten ausgedünnt
(Außenkante nach innen, Aussparungen nach außen — die Strichstärke sinkt also
von beiden Seiten, die Form bleibt an Ort und Stelle). `icon.svg` hält den
Pfad einmal in `<defs id="pp-mark">`; die 60 Schattenstufen referenzieren ihn
per `<use>`, statt ihn zu kopieren.

| Datei | Verwendung |
|---|---|
| `icon.svg` | App-Icon: Marken-Verlauf, langer Schatten (80 px, 22 % Deckkraft) |
| `mark-white.svg` | Weiß freigestellt — auf dunklem Grund |
| `mark-teal.svg` | Einfarbig Teal `#27b092` — Briefpapier, Web |
| `mark-black.svg` | Einfarbig Schwarz freigestellt |
| `print.svg` | Schwarz auf Weiß — Stempel, einfarbiger Druck |

## P² — das aktuelle App-Icon

Seit dem 18.09.2026: eine **Glaslinse** auf dem Marken-Verlauf, darauf ein
filigranes **P mit hochgestellter 2**. Die Linse hat echtes Volumen — heller
Lichtsaum oben, weicher Schlagschatten unten — und hebt das Zeichen von der
Fläche ab, ohne es fett zu machen.

Die Zeichnung ist **keine SVG-Konstruktion**, sondern kommt als gerendertes
PNG aus Claude Design. Darum liegt hier keine Vektorquelle: Volumen,
Lichtsaum und Schatten sind Teil des Bildes.

| Datei | Verwendung |
|---|---|
| `p2-quelle.png` | **Quelle**, 1024 px, randlos — alle Symbole werden hieraus abgeleitet |
| `p2-gerundet.png` | dieselbe Zeichnung mit eingebackener Ecken-Rundung |

**`p2-gerundet.png` gehört nicht in die App.** iOS und Android runden selbst;
ein eingebackener Radius gäbe doppelte Ecken oder Beschnitt. Sie liegt nur für
Stellen bereit, an denen das Symbol frei auf hellem Grund steht.

### Maße

Die Linse sitzt mittig, Außenkante bei **70,6 %** der Halbfläche (Radius 362
von 512), also 150 px Rand. Das liegt innerhalb der Android-Sicherheitszone —
das Vordergrundbild braucht deshalb **keine** Verkleinerung, anders als bei den
früheren Fassungen.

### Die abgeleiteten Symbole

Alle in `mobile/assets/`, alle 1024 px außer dem Favicon:

| Datei | Besonderheit |
|---|---|
| `icon.png` | iOS — **ohne Alphakanal**, Apple lehnt Alpha ab |
| `splash-icon.png` | nur die Linse, transparent; der Verlauf kommt aus `app.json` |
| `android-icon-background.png` | nur der Verlauf, aus den Eckfarben der Quelle nachgebaut |
| `android-icon-foreground.png` | nur die Linse, freigestellt (Kreis r = 370, Kante leicht geglättet) |
| `android-icon-monochrome.png` | Silhouette aus Ring und P², reines Weiß |
| `favicon.png` | 48 px, ohne Alpha |

**Zur Monochrom-Fassung:** Android färbt sie selbst ein, Volumen und Schatten
gehen dabei verloren. Sie wird deshalb nicht aus der Linse abgeleitet, sondern
als Silhouette neu gebaut — Ring als sauberer Kreis, das P² per Helligkeits-
schwelle aus der Quelle gelöst. Wer die Quelle austauscht, sieht sie sich
gesondert an; ein Automatismus trifft hier nicht immer.

### Nach einem Austausch der Quelle prüfen

1. Zusammensetzen und **rund und als Squircle** beschneiden — sitzt die Linse
   frei, ohne die Schnittkante zu berühren?
2. `icon.png` auf 60 px herunterrechnen — bleibt das P² lesbar?
3. Hat `icon.png` wirklich keinen Alphakanal? (`sips -g hasAlpha`)

### Frühere Fassungen

Die Dateien ohne `p2-` im Namen (`icon.svg`, `mark-*.svg`, `print.svg`) gehören
zum **ersten** Zeichen mit dem angedeuteten Auge. Sie bleiben als Archiv liegen
und werden nicht mehr gepflegt.

Dazwischen lagen zwei verworfene Richtungen: ein dünnes, konstruiertes P² im
Ring (zu schwach bei kleinen Größen) und ein fettes „P2" nebeneinander in Work
Sans Black (zu laut). Beide sind aus dem Ordner entfernt.

Bei bestehendem `ios/`-Ordner zieht Expo das Icon **nicht** automatisch nach:
`ios/PlietschePlnn/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png`
muss mit `mobile/assets/icon.png` mitgezogen werden, sonst baut Xcode das alte.

Beim Export der IPA muss `stripSwiftSymbols` auf `false` stehen — mit dem
Standardwert bricht `xcodebuild -exportArchive` mit „Copy failed" ab.
