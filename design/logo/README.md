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

Eine **Glasscheibe** auf dem Marken-Verlauf, darauf das **P mit hochgestellter
2** in gebrochenem Weiß. Die Tiefe entsteht aus Lichtquelle oben links,
Vignette unten rechts, einem mehrstufigen Schattenstapel und einer Lichtkante
am Scheibenrand — bewusst zurückgenommen, damit das Zeichen führt.

Stand 18.09.2026 in einem größeren Schnitt: Das Zeichen füllt die Scheibe
deutlicher aus als die erste Fassung.

### Spezifikation

| | |
|---|---|
| Koordinatensystem | `viewBox 0 0 1024 1024` |
| Verlauf | `linear-gradient(135deg, #2bb091 0 %, #79c3b0 52 %, #80b3e1 100 %)` |
| Zeichen und Ring | `#fffffb` |
| Schattenfarbe | `#0a2c3a` |
| Scheibe | Radius 344 (67,2 % der Kantenlänge), Ring 12 |
| Ecken-Radius (gerundete Fassung) | 224 (21,9 %) |

Die Buchstaben sind **Outlines** — keine Schriftabhängigkeit, die Dateien sind
autark und brauchen keine externen Referenzen.

### Die Quellen

| Datei | Verwendung |
|---|---|
| `p2-quelle.svg` | **Primärasset**, ohne Ecken-Rundung — daraus wird alles abgeleitet |
| `p2-gerundet.svg` | mit Ecken-Rundung — Web, Favicon, In-App |
| `p2-quelle.png` | 1024er Raster der Quelle |
| `p2-gerundet.png` | 1024er Raster der gerundeten Fassung |

**Die gerundete Fassung gehört nicht in die App.** iOS und Android runden
selbst; ein eingebackener Radius gäbe doppelte Ecken oder Beschnitt. Sie ist
für Stellen gedacht, an denen das Symbol frei auf hellem Grund steht — etwa
die App-Seite auf simonluthe.de.

### Zwei Fallen beim Ableiten

**Blur-Radien skalieren nicht linear.** Kleinere Rastergrößen werden aus
`p2-quelle.png` **heruntergerechnet**, nicht aus dem SVG neu gerendert — sonst
matscht der Schattenstapel. Unter 64 px gehört ohnehin eine reduzierte Fassung
hin: Verlauf, Ring und Zeichen behalten, die drei Filter (`castBlur`,
`softBlur`, `discShadow`) weglassen.

**Die Monochrom-Fassung lässt sich nicht ableiten.** Android färbt sie selbst
ein; Volumen, Lichtkante und Schatten gingen dabei verloren und es bliebe ein
Fleck. Sie wird deshalb als Silhouette neu gebaut — Ring als sauberer Kreis,
das P² per Helligkeitsschwelle aus der Quelle gelöst.

### Die abgeleiteten Symbole

Alle in `mobile/assets/`, alle 1024 px außer dem Favicon:

| Datei | Besonderheit |
|---|---|
| `icon.png` | iOS — **ohne Alphakanal**, Apple lehnt Alpha ab |
| `splash-icon.png` | nur die Scheibe, transparent; der Verlauf kommt aus `app.json` |
| `android-icon-background.png` | nur der Verlauf, aus den Eckfarben der Quelle nachgebaut |
| `android-icon-foreground.png` | Scheibe freigestellt (r = 370, Saum für Lichtkante und Schatten) |
| `android-icon-monochrome.png` | Silhouette aus Ring und P², reines Weiß |
| `favicon.png` | 48 px, aus dem 1024er heruntergerechnet |

Der Vordergrund braucht **keine** Verkleinerung: Die Scheibe sitzt bei 67,2 %
der Halbfläche und damit klar innerhalb der Android-Sicherheitszone.

### Nach einem Austausch der Quelle prüfen

1. Zusammensetzen und **rund und als Squircle** beschneiden — sitzt die Scheibe
   frei, ohne die Schnittkante zu berühren?
2. `icon.png` auf 60 px herunterrechnen — bleibt das P² lesbar?
3. Hat `icon.png` wirklich keinen Alphakanal? (`sips -g hasAlpha`)
4. Rendert das SVG vollständig? (`rsvg-convert` — Filter fallen dort gern aus)

### Frühere Fassungen

Die Dateien ohne `p2-` im Namen (`icon.svg`, `mark-*.svg`, `print.svg`) gehören
zum **ersten** Zeichen mit dem angedeuteten Auge. Sie bleiben als Archiv liegen
und werden nicht mehr gepflegt.

Dazwischen lagen zwei verworfene Richtungen: ein dünnes, konstruiertes P² im
Ring (zu schwach bei kleinen Größen) und ein fettes „P2" nebeneinander in Work
Sans Black (zu laut).

Bei bestehendem `ios/`-Ordner zieht Expo das Icon **nicht** automatisch nach:
`ios/PlietschePlnn/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png`
muss mit `mobile/assets/icon.png` mitgezogen werden, sonst baut Xcode das alte.

Beim Export der IPA muss `stripSwiftSymbols` auf `false` stehen — mit dem
Standardwert bricht `xcodebuild -exportArchive` mit „Copy failed" ab.
