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

## P2 — das aktuelle App-Icon

Seit dem 17.09.2026 steht **P und 2 gleich groß nebeneinander** im Ring, ohne
hochgestellte Ziffer. Gesetzt in **Work Sans Black (900)** — derselben Familie,
die die App für ihre Texte benutzt. Die Buchstaben sind als Konturen in die
Datei eingebettet; es muss also keine Schrift installiert sein.

Die Maße bei 2048 Kantenlänge:

| | |
|---|---|
| Zeichenbreite | 1000 (P und 2 verschränkt, Abstand −70 Font-Einheiten) |
| Ringstärke | 208 |
| Ringradius (Mitte) | 840 |
| Luft innen | 154 |
| Rand außen | 80 |

**Die Ringstärke ist keine freie Wahl:** Sie entspricht der gemessenen
Stammbreite des P in diesem Schnitt — 164 von 462 Einheiten Versalhöhe, also
35,5 %. Nur dadurch wirken Ring und Zeichen gleich fett. Wer die eine Größe
ändert, rechnet die andere mit, sonst kippt das Verhältnis.

Die frühere Fassung war unter etwa 56 px grenzwertig. Diese hält bei 60 px
klar durch: Ring und Zeichen bleiben getrennt lesbar.

### Wie die Datei entsteht

`p2-quelle.svg` wird **erzeugt**, nicht gezeichnet: Ein Skript liest die
Konturen von `P` und `2` aus der Work-Sans-Datei, setzt sie verschränkt und
legt Ring und Verlauf darum. Deshalb heißt sie nicht mehr `p2-illustrator.svg`
— aus Illustrator kommt hier nichts mehr.

Das hat einen praktischen Vorteil: Strichstärke, Abstand und Ringmaß sind
Zahlen im Skript, keine Handarbeit. Eine neue Abstufung ist eine Änderung von
drei Werten.

### Die Dateien

`p2-quelle.svg` ist die **Quelle**. Die übrigen werden daraus abgeleitet und
nicht von Hand geändert:

| Datei | Verwendung |
|---|---|
| `p2-quelle.svg` | Quelle — hier ändern |
| `p2-icon.svg` | App-Icon: Verlauf und Zeichen, wie die Quelle |
| `p2-mark-white.svg` | Weiß freigestellt — auf dunklem Grund |
| `p2-mark-teal.svg` | Einfarbig Teal `#27b092` — Briefpapier, Web |

Die Marken tragen keinen Schatten und keinen Hintergrund: Sie sollen auf
beliebigem Grund sitzen.

Die Dateien ohne `p2-` im Namen (`icon.svg`, `mark-*.svg`, `print.svg`) gehören
zum **früheren** Zeichen mit dem angedeuteten Auge. Sie bleiben als Archiv
liegen und werden nicht mehr gepflegt.

Die App-Assets in `mobile/assets/` werden hieraus abgeleitet, alle 1024 px:

| Datei | Besonderheit |
|---|---|
| `icon.png` | iOS — **ohne Alphakanal**, Apple lehnt Alpha ab |
| `splash-icon.png` | nur das Motiv, der Verlauf kommt aus `app.json` |
| `android-icon-background.png` | nur der Verlauf, ohne Alpha |
| `android-icon-foreground.png` | Motiv auf **82 %**, zentriert |
| `android-icon-monochrome.png` | reines Weiß, Android färbt selbst ein |
| `favicon.png` | 48 px, ohne Alpha |

**Zu den 82 %:** Android beschneidet das Vordergrundbild je nach Gerät rund,
als Squircle oder als Quadrat. Die Ringaußenkante liegt bei 92 % der
Halbfläche — bei den früher benutzten 92 % Skalierung fiel sie fast genau auf
die runde Schnittkante, und es entstand eine doppelte Kontur. Mit 82 % bleiben
rund 73 px Abstand. Wer den Ring verändert, prüft das nach: zusammensetzen,
rund **und** als Squircle beschneiden, ansehen.

Bei bestehendem `ios/`-Ordner zieht Expo das Icon **nicht** automatisch nach:
`ios/PlietschePlnn/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png`
muss mit `mobile/assets/icon.png` mitgezogen werden, sonst baut Xcode das alte.

Beim Export der IPA muss `stripSwiftSymbols` auf `false` stehen — mit dem
Standardwert bricht `xcodebuild -exportArchive` mit „Copy failed" ab.
