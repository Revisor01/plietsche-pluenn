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

Seit Build 30 trägt die App das P² im Kreis: ein schlichtes, geometrisch
konstruiertes P mit hochgestellter 2, kein Marken-P. Ring, Stamm, Bogen und
Ziffer sind Strichzüge mit runden Enden — Ring 92, P 118, Ziffer 101
Einheiten stark. Der lange Schatten ist gegenüber `icon.svg` zurückgenommen
(26 Stufen, 13 % Deckkraft), damit die Form auch klein vorn bleibt.

| Datei | Verwendung |
|---|---|
| `p2-icon.svg` | App-Icon: Marken-Verlauf, langer Schatten |
| `p2-mark-white.svg` | Weiß freigestellt — auf dunklem Grund |
| `p2-mark-teal.svg` | Einfarbig Teal `#27b092` — Briefpapier, Web |

Die App-Assets in `mobile/assets/` werden hieraus abgeleitet:
`icon.png` (iOS, 1024, ohne Alpha), `android-icon-foreground.png` (512,
Motiv auf 60 % der Fläche), `android-icon-monochrome.png` (432, für
eingefärbte Startbildschirme), `android-icon-background.png` (512, Verlauf).

Bei bestehendem `ios/`-Ordner zieht Expo das Icon **nicht** automatisch nach:
`ios/PlietschePlnn/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png`
muss mit `mobile/assets/icon.png` mitgezogen werden, sonst baut Xcode das alte.

Beim Export der IPA muss `stripSwiftSymbols` auf `false` stehen — mit dem
Standardwert bricht `xcodebuild -exportArchive` mit „Copy failed" ab.
