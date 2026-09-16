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
konstruiertes P mit hochgestellter 2, kein Marken-P. Die Zeichnung kommt aus
Illustrator (`p2-illustrator.svg`) und ist die Quelle für alle Symbole.

Seit dem 16.09.2026 sind die Striche kräftiger: Ring 80, P 60, Ziffer 25
Einheiten bei 2048 Kantenlänge, Ringradius 720,5. Die Buchstaben sind echte
Schriftformen, die zusätzlich eine Kontur tragen — daher wirken sie voller als
eine reine Strichzeichnung. Der Schatten ist ein weicher Schlagschatten
(17 Einheiten Versatz, 14,2 Weichzeichnung, Grau bei 80 %), kein Stufenschatten.

Damit ist auch die alte Einschränkung erledigt: Die vorige, dünnere Fassung
wurde unter etwa 56 px grenzwertig. Bei 60 px sind Ring und Zeichen jetzt klar
getrennt lesbar.

### Falle beim Export aus Illustrator

Illustrator schreibt die Filterbereiche als feste Nutzerkoordinaten
(`x`, `y`, `width`, `height`), lässt aber `filterUnits="userSpaceOnUse"` weg.
Ohne diese Angabe gilt nach SVG-Norm `objectBoundingBox`: Die Zahlen werden
dann als **Vielfache der Objektgröße** gelesen, der Filterbereich landet weit
außerhalb der Zeichenfläche — und alles mit Schatten verschwindet spurlos.
Sichtbar wird das erst beim Rendern; im Illustrator und in manchen Vorschauen
sieht die Datei richtig aus.

In der Fassung im Repo sind die Bereiche deshalb **entfernt**, damit der
Normwert (−10 %/120 %) greift, der Strich und Schatten sauber umschließt.
Wer eine neue Fassung aus Illustrator einspielt, prüft das zuerst:
`rsvg-convert` rendern lassen und nachsehen, ob Ring und Zeichen da sind.

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
