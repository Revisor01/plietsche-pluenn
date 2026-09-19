# Store-Screens: erprobtes Verfahren

Aus der Moin-Kark-Sitzung vom 18./19.09.2026. Zehn Screens (5× iOS, 5× Android)
sind damit entstanden. Hier steht, was funktioniert hat — und woran ich
gescheitert bin.

> **Inhalte komplett neu denken.** Übernehmt das Vorgehen, nicht die Motive
> oder Texte. Eure App hat andere Funktionen; überlegt aus diesen heraus,
> welche Ansichten sie am besten zeigen.

## 1. iOS: `idb` statt `cliclick`

`cliclick` und AppleScript funktionieren NICHT zuverlässig. Knöpfe, die über
einer Karte oder einem anderen Nativ-View liegen, nehmen synthetische
Mausklicks nicht an — daran ist mein erster kompletter Anlauf gescheitert.

`idb` schickt echte Berührungen:

    idb connect <UDID>
    idb ui describe-all --udid <UDID>    # Bedienhilfen-Struktur als JSON
    idb ui tap --udid <UDID> <x> <y>
    idb ui swipe --udid <UDID> <x1> <y1> <x2> <y2> --duration 0.4

Der Gewinn ist `describe-all`: zu jedem Element `AXLabel` und `frame`. Damit
tippt ihr über die Beschriftung statt über geratene Koordinaten.

```python
import json, sys, subprocess
udid, label = sys.argv[1], sys.argv[2]
els = json.loads(subprocess.run(["idb","ui","describe-all","--udid",udid],
                                capture_output=True, text=True).stdout)
cand = [e for e in els if (e.get("AXLabel") or "").strip() == label] \
    or [e for e in els if label.lower() in (e.get("AXLabel") or "").lower()]
cand.sort(key=lambda e: e["frame"]["width"] * e["frame"]["height"])  # Knopf, nicht Container
f = cand[0]["frame"]
subprocess.run(["idb","ui","tap","--udid",udid,
                str(int(f["x"]+f["width"]/2)), str(int(f["y"]+f["height"]/2))])
```

Voraussetzung: `accessibilityLabel` an den Knöpfen. Fehlt das — nachrüsten,
hilft auch echten Nutzer:innen.

**Weiteres:**
- **Release-Build, nicht Debug.** Debug legt eine gelbe Warnleiste übers Bild
  und braucht einen laufenden Metro-Bundler.
  `xcodebuild -workspace X.xcworkspace -scheme X -configuration Release \
   -sdk iphonesimulator -destination 'id=<UDID>' -derivedDataPath <pfad> \
   CODE_SIGNING_ALLOWED=NO build`
- **Gerät:** iPhone 17 Pro Max → 1320×2868 (Apples Pflichtgröße).
  `xcrun simctl io <UDID> screenshot` liefert sie ohne Nachskalieren.
- **Statusleiste:** `xcrun simctl status_bar <UDID> override --time "09:41"
  --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3`
- **Zustand** direkt in der AsyncStorage-Datei setzen:
  `<datacontainer>/Library/Application Support/<bundleid>/RCTAsyncLocalStorage_V1/manifest.json`
  (Werte roh, wie der Code sie schreibt.)
- **Berechtigungen vorab:** `xcrun simctl privacy <UDID> grant location <bundleid>`

## 2. Android: voller Emulator, aber schlankes Abbild

`google_apis_playstore` ist zu schwer — auf einem 8-GB-Mac stürzte der
Emulator reproduzierbar ab ("System UI isn't responding"). Mit `default`
lief er stabil, Boot in 17 Sekunden.

    sdkmanager "system-images;android-36;default;arm64-v8a"
    avdmanager create avd -n Shots -k "system-images;android-36;default;arm64-v8a" -d pixel_9
    # ~/.android/avd/Shots.avd/config.ini:
    hw.ramSize=3072
    hw.gpu.enabled=yes
    hw.gpu.mode=host

Nur möglich, wenn eure App die Play-Dienste nicht braucht (bei uns MapLibre
statt Google Maps). **Prüfen, bevor ihr das schlanke Abbild nehmt.**

**Bauen:**
- `ANDROID_HOME` und `ANDROID_SDK_ROOT` setzen, sonst "SDK location not found".
- `-PreactNativeArchitectures=arm64-v8a` — sonst baut Gradle vier Architekturen
  parallel und sprengt den Speicher.
- **JS-Bundle muss ins APK**, sonst "Unable to load script". Der Schalter
  `-PbundleInDebug=true` greift in Expo-Projekten NICHT. Stattdessen:
  `npx expo export:embed --platform android --dev false \
   --bundle-output android/app/src/main/assets/index.android.bundle \
   --assets-dest android/app/src/main/res`
  Danach normal bauen. **Erzeugte Dateien hinterher löschen** — bei mir 73
  unversionierte Einträge.

**Tippen** über `uiautomator`:

    adb shell uiautomator dump /sdcard/ui.xml
    adb shell cat /sdcard/ui.xml     # content-desc + bounds, Mitte ausrechnen
    adb shell input tap <x> <y>

**Statusleiste:**

    adb shell settings put global sysui_demo_allowed 1
    adb shell am broadcast -a com.android.systemui.demo -e command enter
    adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 0941
    adb shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false
    adb shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false

**Zustand setzen:**

    adb shell run-as <package> sqlite3 databases/RKStorage \
      "INSERT OR REPLACE INTO catalystLocalStorage (key,value) VALUES ('k','v');"

## 3. Push-Benachrichtigungen — hier bin ich gescheitert

Kein brauchbarer Screen entstanden. Was ich gelernt habe:

- **Android zeigt kein Banner, solange die App im Vordergrund ist.** Die
  Benachrichtigung wird still zugestellt. App vorher per `KEYCODE_HOME` in den
  Hintergrund legen.
- Lokale Erinnerungen hängen an festen Zeitpunkten. Emulator-Uhr vorstellen:
  `adb shell "date MMDDhhmmYYYY.ss"` — **Format genau beachten**, ich habe mir
  dreimal ein falsches Jahr eingehandelt (0526, 2020, 0226).
- **Jede Erinnerung feuert nur einmal.** Wer durch die Zeit springt, verbraucht
  sie ohne Bild. Also: App in den Hintergrund, Uhr EINMAL exakt über den
  Auslösezeitpunkt, sofort `adb exec-out screencap -p`.
- Kontrolle: `adb shell cmd notification list`
- Aufgeklappt geht immer: `adb shell cmd statusbar expand-notifications` —
  lesbar, aber kein Banner. Im Emulator steht dort auch "Serial console
  enabled" als Störer.
- **Auf iOS zuerst `xcrun simctl push` versuchen** — der Simulator kann
  Benachrichtigungen direkt zustellen. Habe ich nicht mehr ausprobiert, wäre
  aber mein erster Versuch.

## 4. Texte auf den Screens

**Keine Aussage, die das Bild nicht deckt.** Unser Grafik-Agent musste drei
Texte korrigieren, weil sie mehr behaupteten als zu sehen war: "Filtern statt
suchen: nach Gemeinde, Kategorie oder Zeitraum" stand über einem Bild, das nur
Kategorie-Chips zeigte.

Aufbau, der funktioniert: kurze Schlagzeile (3–5 Wörter, Punkt am Ende),
darunter eine Zeile, die sie konkret macht.

Zwei Fallen:
- **Plattformunterschiede im Bild.** Unser Knopf heißt auf iOS "In Apple Karten
  öffnen", auf Android "In Google Maps öffnen". Der iOS-Screenshot taugte
  deshalb nicht fürs Play-Deck.
- **Personenbezogene Daten.** Unser Detail-Screenshot zeigte einen Klarnamen
  samt Privatadresse. Das muss jemand *entscheiden*, nicht aus Versehen im
  Store landen.

## 5. Weitere Fallen

- **Play erlaubt max. 8 Screenshots je Gerätetyp**, Apple 10. Bei Google
  nachgeprüft. Wir hatten zuerst 10 für Play geplant — wäre abgewiesen worden.
- **Simulator/Emulator nur auf ausdrückliche Ansage** starten. Simons Regel in
  der globalen CLAUDE.md; der Mac ist seine Arbeitsmaschine.
- **Speicher im Blick behalten.** 8 GB RAM. Emulator plus Gradle-Bau
  gleichzeitig hat mehrfach zum Abschuss geführt. Erst bauen, dann Emulator.
