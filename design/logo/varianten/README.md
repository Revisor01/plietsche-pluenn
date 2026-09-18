# Plietsche Plünn — App-Icon, alle Varianten

Alle Dateien 1024 × 1024 px, PNG. Grundform überall identisch: Glasscheibe (r 370) mit 12 px Ring, Zeichen P² in Work Sans 400, gebrochenes Weiß #fffffb.

## iOS

| Datei | Verwendung |
| --- | --- |
| `1-ios-hell-1024.png` | Standard-Erscheinung, voller Verlauf, deckend |
| `2-ios-dunkel-1024.png` | Dark-Appearance. Gedämpfter Verlauf (#125a4a → #2c6459 → #2f5a7e), Ring und Zeichen zurückgenommen. Apple erzeugt diese Fassung nicht selbst |
| `3-ios-tinted-1024.png` | Tinted. Graustufen auf transparentem Grund, kein Verlauf, keine Schatten — das System legt die Tönung auf |
| `4-ios-clear-1024.png` | Clear / Glas (iOS 26). Verlauf auf ~28 % Deckkraft, Wallpaper scheint durch |

In Xcode unter *AppIcon* → Appearances: Any, Dark, Tinted. Alle drei als 1024er ohne Ecken-Rundung und ohne Alpha in der hellen Fassung einlegen.

## Android (Adaptive Icon)

| Datei | Verwendung |
| --- | --- |
| `5-android-vordergrund-1024.png` | `ic_launcher_foreground` — nur das Zeichen, transparent. Motiv liegt in der mittleren 66 % (660 px), der Rand wird vom System beschnitten |
| `6-android-hintergrund-1024.png` | `ic_launcher_background` — nur der Verlauf, randfüllend |
| `7-android-monochrom-1024.png` | `ic_launcher_monochrome` für Themed Icons — reines Weiß (#ffffff) auf transparent, ohne Schatten und Verläufe. Android färbt selbst ein |

## Stores und Web

| Datei | Verwendung |
| --- | --- |
| `8-quadratisch-1024.png` | Quadratisch ohne Rundung — App Store und Play Store |
| `9-gerundet-1024.png` | Radius 224 px (21.9 %) — Web, Favicon, In-App |

## Farben

- Verlauf hell: `linear-gradient(135deg, #2bb091 0%, #79c3b0 52%, #80b3e1 100%)`
- Verlauf dunkel: `linear-gradient(135deg, #125a4a 0%, #2c6459 52%, #2f5a7e 100%)`
- Zeichen und Ring: `#fffffb` (monochrom und tinted: `#ffffff`)
- Schattenfarbe: `#0a2c3a`
