# Logo

Quellen des App-Symbols P². Die neun Fassungen in `varianten/` (je 1024 × 1024)
werden eingesetzt, nicht abgeleitet; `icon.svg`, `mark-*.svg` und `print.svg`
sind das frühere Zeichen und bleiben als Archiv.

| Fassung | wird zu |
|---|---|
| 8 quadratisch | `mobile/assets/icon.png`, Alpha entfernt |
| 2 iOS dunkel | `icon-dark.png`, Alpha entfernt |
| 3 iOS tinted | `icon-tinted.png` |
| 5 / 6 / 7 Android | `android-icon-foreground.png`, `-background.png` (Alpha entfernt), `-monochrome.png`; 5 auch `splash-icon.png` |
| 9 gerundet | `favicon.png` (48 px) |

Nach einem Austausch: `sips -g hasAlpha` auf `icon.png` und `icon-dark.png`,
`ios/PlietschePlnn/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png`
mitziehen und `web/` neu ausliefern (siehe `web/README.md`).
