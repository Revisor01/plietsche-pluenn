# Store-Screenshots

Die Bilder für App Store und Google Play. Sie werden **roh** abgelegt — ohne
Geräterahmen, ohne Text. Das Rahmen und Betexten übernimmt das Grafik-Studio
(`grafik.simonluthe.de`); ein gerahmter Screenshot lässt sich nicht mehr neu
zuschneiden, ein roher schon.

Das Verfahren stammt aus dem Moin-Kark-Projekt; die dort gefundenen Fallen
stehen in `STORE-SCREENS-VERFAHREN.md` im Projektroot.

## Was gezeigt wird

Elf Motive. Jedes muss durch das Bild gedeckt sein: keine Aussage im Text, die
man auf dem Screenshot nicht sieht.

| # | Ansicht | Schlagzeile | Zeile darunter |
|---|---|---|---|
| 1 | Startseite mit Punktestand und Rang | Dein Tauschkonto. | Punkte, Rang und Serie auf einen Blick. |
| 2 | Laden-Tab, Galerie mit Fotos | Sieh, was da ist. | Der ganze Bestand, bevor du losgehst. |
| 3 | Laden-Tab mit gesetzten Filtern | Finde deine Größe. | Nach Art, Größe und Zustand filtern. |
| 4 | Teil-Detailansicht | Jedes Teil im Blick. | Foto, Größe, Zustand und Punktwert. |
| 5 | Scanner (Kamera mit Rahmen) | Einchecken per QR. | Ein Scan im Laden, Punkte sind da. |
| 6 | Teil einstellen (Formular mit Foto) | Bring, was du nicht mehr trägst. | Foto machen, einstellen, Punkte sammeln. |
| 7 | Einreichung in der Freigabe-Liste | Das Team schaut drüber. | Freigegeben, und die Punkte sind da. |
| 8 | Abzeichen-Tab | Sammle Abzeichen. | Für Bringen, für Serien, für Aktionen. |
| 9 | Punkte-Übersicht mit Rängen | Steig auf. | Von Bronze bis Diamant. |
| 10 | Admin-Bereich (Punkte-Ränge oder Aktionen) | Der Laden in deiner Hand. | Punkte, Ränge und Aktionen selbst einstellen. |
| 11 | Benachrichtigung auf dem Sperrbildschirm | Wir erinnern dich. | Bevor deine Serie abläuft. |

**Mehr Motive als Plätze.** Google Play nimmt höchstens **8** je Geräteklasse,
Apple **10**. Es muss also ausgewählt werden; die Motive 1–3, 5, 6, 8, 9 und 11
tragen den Nutzen für Besucher:innen, 4, 7 und 10 zeigen die Tiefe. Welche
davon in welchen Store gehen, entscheidet der Betreiber.

Motiv 10 zeigt Funktionen, die nur das Team sieht. Bei Google Play gehört dann
unter **App-Zugriff** ein Testzugang hinterlegt, sonst kann die Prüfung diesen
Teil nicht öffnen.

Motiv 11 braucht eine **echte Mitteilung über den eigenen Server** — so, wie
Nutzer:innen sie bekommen. Der Weg steht unten.

## Geräte und Größen

| Plattform | Gerät | Größe |
|---|---|---|
| iOS | iPhone 17 Pro Max | 1320 × 2868 |
| Android | Pixel 9 | 1080 × 2424 |

## Vor dem Abgreifen

**Release bauen, nicht Debug.** Der Debug-Build legt eine gelbe Warnleiste über
das Bild und braucht einen laufenden Bundler.

**Statusleiste vereinheitlichen** — sonst steht auf jedem Bild eine andere
Uhrzeit und ein anderer Akkustand:

```bash
# iOS
xcrun simctl status_bar <UDID> override \
  --time "09:41" --batteryState charged --batteryLevel 100 \
  --cellularBars 4 --wifiBars 3

# Android
adb shell settings put global sysui_demo_allowed 1
adb shell am broadcast -a com.android.systemui.demo -e command enter
adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 0941
adb shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false
adb shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false
```

**Kameraberechtigung vorab erteilen**, sonst steht der Systemdialog im Bild
(Motiv 4):

```bash
xcrun simctl privacy <UDID> grant camera de.godsapp.plietschepluenn
```

## Bedienen statt raten

Koordinaten zu raten trifft nicht. Erst die Bedienhilfen-Struktur auslesen,
dann über die Beschriftung tippen:

```bash
# iOS
idb ui describe-all --udid <UDID>     # AXLabel + frame je Element
idb ui tap --udid <UDID> <x> <y>

# Android
adb shell uiautomator dump /sdcard/ui.xml
adb shell input tap <x> <y>
```

Bei mehreren Treffern auf dieselbe Beschriftung das **kleinste** Element
nehmen — das ist der Knopf, nicht der Kasten darum.

## Die Benachrichtigung (Motiv 8)

Anders als bei Moin Kark plant diese App **keine** Mitteilungen lokal; alles
läuft über den Server. Für das Bild also:

1. Eine `push_message` im Backend anlegen, `scheduled_at` ein bis zwei Minuten
   in der Zukunft, Kategorie `streak`.
2. Die App **in den Hintergrund** legen (`KEYCODE_HOME` bzw. Home-Geste) —
   im Vordergrund zeigt Android kein Banner.
3. Den Cronjob zustellen lassen (läuft jede Minute) und sofort abgreifen.

Auf Android braucht das die **Play-Dienste im Emulator** (`google_apis`), weil
die Zustellung über FCM geht. Das schlanke `default`-Abbild genügt hier nicht.

Zur Kontrolle: `adb shell cmd notification list` zeigt, ob überhaupt etwas
angekommen ist.

## Wohin die Bilder gehören

`design/store/ios/` und `design/store/android/`, benannt nach der Nummer des
Motivs (`01-start.png` …). Roh, unverändert, in voller Gerätegröße.

## Zu prüfen, bevor etwas hochgeladen wird

- **Keine personenbezogenen Daten im Bild.** Der Bestand kann Namen von
  Einreichenden enthalten, bei extern gelagerten Teilen sogar Privatadressen.
  Vor dem Hochladen jedes Bild daraufhin ansehen.
- **Plattformunterschiede.** Wo die App auf iOS und Android verschieden
  aussieht, taugt ein Bild nicht für beide Stores.
- **Grenzen:** Google Play höchstens 8 Bilder je Geräteklasse, Apple 10.

## Stand der Aufnahmen

**iOS (19.09.2026):** Simulator „Store 17 Pro Max" angelegt, Release-Fassung
gebaut und installiert, Statusleiste auf 09:41 gesetzt. Abgegriffen sind
Startseite, Laden, Abzeichen und Punkte — in `design/store/ios/`.

### Zwei Fallen, die hier Zeit gekostet haben

**Die Pods passten nicht zum Projekt.** Nach einem `prebuild --clean` ist die
eingecheckte `Podfile.lock` veraltet; `pod install` hangelt sich dann von
Abhängigkeit zu Abhängigkeit („You should run pod update …"). Die Lockdatei
einmal löschen und neu auflösen lassen. Und: `pod install` scheitert an einem
nativen Compiler-Schritt, wenn es die SDK der Command Line Tools erwischt —
vorher setzen:

```bash
export SDKROOT=$(xcrun --sdk macosx --show-sdk-path)
```

**Das @-Zeichen.** `idb ui text` schickt Tastencodes, die der Simulator nach
seinem Tastaturlayout auslegt. Auf Deutsch wird aus `@` ein `"`, die Anmeldung
scheitert. Abhilfe: Simulator auf US-Layout stellen, dann das Zeichen einzeln
senden:

```bash
xcrun simctl spawn <UDID> defaults write com.apple.Preferences \
  AppleKeyboards -array "en_US@sw=QWERTY"
idb ui text --udid <UDID> "$(printf '@')"
```

### Vor dem Hochladen zu klären

Im Laden steht ein Testteil **„xnxn, Gr. 345, 0 P"** — offensichtlich ein
Überbleibsel. Das gehört nicht in einen Store-Screenshot; entweder vorher
aufräumen oder ein Bild ohne dieses Teil wählen.
