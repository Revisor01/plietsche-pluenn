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
2**. Das Zeichen ist in Work Sans 400 gesetzt, Scheibe r 370 mit 12 px Ring,
gebrochenes Weiß `#fffffb`.

Seit dem 18.09.2026 liegen **alle neun Fassungen** vor — je eine für jede
Erscheinung, die iOS und Android kennen. Sie kommen fertig aus Claude Design
und werden hier **nicht abgeleitet**, sondern eingesetzt.

### Die Quellen

Alle in `varianten/`, alle 1024 × 1024:

| Datei | Verwendung |
|---|---|
| `1-ios-hell-1024.png` | Standard, voller Verlauf |
| `2-ios-dunkel-1024.png` | Dark Appearance — **Apple erzeugt sie nicht selbst** |
| `3-ios-tinted-1024.png` | Tinted — Graustufen auf transparent, das System tönt |
| `4-ios-clear-1024.png` | Clear/Glas (iOS 26), Verlauf auf ~28 % — derzeit ungenutzt |
| `5-android-vordergrund-1024.png` | nur das Zeichen, transparent |
| `6-android-hintergrund-1024.png` | nur der Verlauf, randfüllend |
| `7-android-monochrom-1024.png` | Silhouette in reinem Weiß, für Themed Icons |
| `8-quadratisch-1024.png` | ohne Rundung — App Store und Play Store |
| `9-gerundet-1024.png` | Radius 224 (21,9 %) — Web, Favicon, In-App |

`varianten/README.md` hält die Spezifikation der Vorlage fest.

### Farben

| | |
|---|---|
| Verlauf hell | `linear-gradient(135deg, #2bb091 0 %, #79c3b0 52 %, #80b3e1 100 %)` |
| Verlauf dunkel | `linear-gradient(135deg, #125a4a 0 %, #2c6459 52 %, #2f5a7e 100 %)` |
| Zeichen und Ring | `#fffffb` (monochrom und tinted: `#ffffff`) |
| Schatten | `#0a2c3a` |

### Die drei iOS-Erscheinungen

Sie stehen in `app.json` als Objekt — **nicht** als einzelner Pfad:

```json
"icon": {
  "light":  "./assets/icon.png",
  "dark":   "./assets/icon-dark.png",
  "tinted": "./assets/icon-tinted.png"
}
```

`expo prebuild` erzeugt daraus die drei Einträge im AppIcon-Set samt
`luminosity`-Schlüsseln. Von Hand ist dort nichts zu pflegen. Geprüft: Ein
Prebuild legt alle drei Dateien korrekt an.

**Hell und dunkel ohne Alphakanal** (Apple lehnt Alpha für das Icon ab),
**tinted mit** — dort ist der transparente Grund gerade der Sinn.

### Die abgeleiteten Symbole

| Datei | Quelle |
|---|---|
| `icon.png` | Fassung 8, Alpha entfernt |
| `icon-dark.png` | Fassung 2, Alpha entfernt |
| `icon-tinted.png` | Fassung 3, unverändert |
| `android-icon-foreground.png` | Fassung 5, unverändert |
| `android-icon-background.png` | Fassung 6, Alpha entfernt |
| `android-icon-monochrome.png` | Fassung 7, unverändert |
| `splash-icon.png` | Fassung 5 (Zeichen ohne Grund) |
| `favicon.png` | Fassung 9 auf 48 px heruntergerechnet |

Der Android-Vordergrund braucht **keine** Verkleinerung: Das Motiv liegt schon
in den mittleren 66 %, wie es die Sicherheitszone verlangt.

### Nach einem Austausch der Quellen prüfen

1. Zusammensetzen und **rund und als Squircle** beschneiden — sitzt die Scheibe
   frei, ohne die Schnittkante zu berühren?
2. `icon.png` auf 60 px herunterrechnen — bleibt das P² lesbar?
3. Haben `icon.png` und `icon-dark.png` wirklich keinen Alphakanal?
   (`sips -g hasAlpha`)
4. `expo prebuild --platform ios --clean` laufen lassen und nachsehen, ob
   `Contents.json` alle drei Erscheinungen enthält.

### Frühere Fassungen

Die Dateien ohne `p2-` im Namen (`icon.svg`, `mark-*.svg`, `print.svg`) gehören
zum **ersten** Zeichen mit dem angedeuteten Auge. Sie bleiben als Archiv liegen
und werden nicht mehr gepflegt. `p2-quelle.svg` und `p2-gerundet.svg` sind der
Stand vom 18.09.2026 vormittags — der engere Schnitt ohne die Varianten.

Dazwischen lagen zwei verworfene Richtungen: ein dünnes, konstruiertes P² im
Ring (zu schwach bei kleinen Größen) und ein fettes „P2" nebeneinander in Work
Sans Black (zu laut).

Bei bestehendem `ios/`-Ordner zieht Expo das Icon **nicht** automatisch nach:
`ios/PlietschePlnn/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png`
muss mit `mobile/assets/icon.png` mitgezogen werden, sonst baut Xcode das alte.

Beim Export der IPA muss `stripSwiftSymbols` auf `false` stehen — mit dem
Standardwert bricht `xcodebuild -exportArchive` mit „Copy failed" ab.
