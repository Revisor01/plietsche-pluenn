# Übergabe: Store-Veröffentlichung

Stand 19.09.2026. Was fehlt, was zu ändern ist, und wie es weitergeht.

## Wo es steht

**Fertig und im Repo** (`design/store/`), roh und ohne Rahmen:

| | iOS (1320 × 2868) | Android (1080 × 2424) |
|---|---|---|
| Start | ✓ | ✓ |
| Laden | ✓ | ✓ |
| Filter | ✓ | — |
| Teil-Ansicht | ✓ | — |
| Scanner | ✓ | ✓ |
| Einstellen | ✓ | — |
| Freigabe | ✓ | — |
| Abzeichen | ✓ | ✓ |
| Punkte | ✓ | ✓ |
| Mitteilung | — | — |

Alle mit dem Besucher-Konto `test@plietsche.de` aufgenommen, nicht als Admin —
sonst öffnet sich ein Teil als Bearbeiten-Formular statt als Ansicht.

Simulator „Store 17 Pro Max" und Emulator `Pixel_9` laufen noch.

## Was noch zu tun ist

### 1. Die fehlenden Screens

Android: Filter, Teil-Ansicht, Einstellen. Simon hilft vor Ort.

**Die Mitteilung fehlt auf beiden Plattformen** — und das lässt sich im
Simulator nicht lösen:

- **iOS:** `xcrun simctl push` meldet „Notification sent", es erscheint aber
  nichts. Die App hat die Benachrichtigungs-Erlaubnis nie bekommen, und ohne
  sie verwirft iOS die Zustellung stillschweigend. `simctl privacy … grant
  notifications` schlägt fehl (NSPOSIXErrorDomain code=1); die Erlaubnis muss
  aus der App kommen.
- **Android:** Der Emulator registriert kein Push-Token, echter Push geht
  damit nicht. Eine per `cmd notification post` erzeugte Mitteilung trägt den
  Absender „Shell" — unbrauchbar für den Store. Sperren lässt sich der
  Emulator auch nicht, es ist keine Bildschirmsperre eingerichtet.

**Empfehlung:** Dieses eine Bild auf einem echten Gerät aufnehmen. Dort ist
die Erlaubnis erteilt, ein Token registriert, und der Sperrbildschirm echt.

### 2. Die Abzeichen umbenennen

Alle vier tragenden Namen sind männlich. Vorschlag — Tätigkeit statt Person,
das umgeht die Frage, statt sie mit Doppelnennung zu erschlagen:

| Bisher | Neu | Auslöser |
|---|---|---|
| Bringer | **Gebracht** | `items_brought` |
| Holer | **Mitgenommen** | `scans` |
| Stammgast | **Vorbeigekommen** | `visits` |
| Durchhalter | **Drangeblieben** | `streak_weeks` |

Alternative mit Substantiven: *Bringen / Mitnehmen / Vorbeikommen /
Dranbleiben*. Das entspricht genau den drei Aktionstypen der Kampagnen
(`visit`, `take`, `bring`) und wäre in sich stimmig.

„Winterkinder" bleibt — das ist ein Aktionsname, kein Rollenname.

**Achtung:** Die Namen stehen in der Datenbank (`badges.name`), nicht im Code.
Ändern über die API oder den Admin-Bereich der App. Die `slug`-Werte sollten
bleiben, daran hängt die Zuordnung.

### 3. Neue Abzeichen — Vorschläge

Es gibt Daten, die kein Abzeichen nutzt:

| Idee | Auslöser | Warum |
|---|---|---|
| **Ausgeglichen** | gebracht ≈ mitgenommen | Der Gedanke des Tauschladens. Belohnt als einziges ein Verhältnis, nicht eine Menge. |
| **Erstes Teil** | erste Einreichung | Der wichtigste Moment, bisher ungewürdigt. |
| **Vielfalt** | Teile aus ≥ 4 Kategorien | Belohnt Breite statt Masse. |
| **Kinderkram** | Teile für Kinder gebracht | Kindersachen werden am schnellsten zu klein, der Laden lebt davon. |
| **Vier Jahreszeiten** | in jeder Jahreszeit da gewesen | Passt zum saisonalen Kleidertausch. |
| **Jahrestreu** | ein Kalenderjahr aktiv | Der Cronjob für Treue-Abzeichen läuft bereits zum Jahresende und vergibt nichts. |

Empfehlung: mit **Ausgeglichen** und **Erstes Teil** anfangen. Das eine trifft
den Kern, das andere den Anfang.

Neue Auslöser brauchen Arbeit in `lib/points.js` — die vorhandenen
`trigger_type`-Werte (`items_brought`, `scans`, `visits`, `streak_weeks`,
`action_participation`) decken sie nicht ab.

### 4. Veröffentlichen

**Apple:** Screens hochladen, Version anlegen, Build binden, zur Prüfung
einreichen. Der jüngste Build ist 47; 44–46 sind ebenfalls gültig.

**Google:** Vor der Produktionsspur stehen **14 Tage geschlossener Test** mit
mindestens 12 Testenden — die Tester stehen laut Simon bereit. Ablauf und die
Falle mit `draft` stehen in `docs/store-release.md`.

Vorher in der Play Console auszufüllen: Kurz- und vollständige Beschreibung,
Feature-Grafik, Inhaltsbewertung, Datensicherheit, Zielgruppe. Die
Datenschutzerklärung liegt unter
`simonluthe.de/apps/plietschepluenn/datenschutz/`.

**App-Zugriff:** Teile der App sind erst nach Anmeldung sichtbar. Dort einen
Testzugang hinterlegen, sonst kann die Prüfung sie nicht öffnen.

## Fallen, die schon Zeit gekostet haben

**`simctl` überschreibt keine vorhandene Datei.** Der Screenshot bleibt still
der alte — die Bilder sahen unverändert aus, obwohl die App längst umgestellt
war. Vorher löschen.

**`idb ui text` und das @-Zeichen.** Es schickt Tastencodes, die der Simulator
nach seinem Layout auslegt; auf Deutsch wird aus `@` ein `"`. Simulator auf
US-Layout stellen, dann das Zeichen einzeln senden:

```bash
xcrun simctl spawn <UDID> defaults write com.apple.Preferences \
  AppleKeyboards -array "en_US@sw=QWERTY"
idb ui text --udid <UDID> "$(printf '@')"
```

**Podfile.lock nach `prebuild --clean`.** Sie passt dann nicht mehr zum
erzeugten Projekt; `pod install` hangelt sich von Abhängigkeit zu
Abhängigkeit. Löschen und neu auflösen lassen — und vorher
`export SDKROOT=$(xcrun --sdk macosx --show-sdk-path)`, sonst scheitert ein
nativer Compiler-Schritt an der SDK der Command Line Tools.

**Android braucht das JS-Bundle im APK.** `-PbundleInDebug=true` greift bei
Expo nicht. Vorher erzeugen:

```bash
npx expo export:embed --platform android --dev false \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res
```

Und `-PreactNativeArchitectures=arm64-v8a`, sonst baut Gradle vier
Architekturen und sprengt bei 8 GB den Speicher.

**Die Anmeldung überlebt den App-Neustart im Simulator nicht.** Auf dem Gerät
schon; im Simulator ist die Keychain flüchtiger.

**Nie Emulator und Simulator gleichzeitig.** Bei 8 GB führt das zum Abschuss.
Erst bauen, dann starten.

## Was an den Daten geändert wurde

Für die Screens bereinigt — **archiviert, nicht gelöscht**, eine Sicherung
aller 30 Teile lag vorher vor:

- „xnxn" (Gr. 345, 0 P)
- „Blaue Jeansjacke" (ohne Punktwert)
- „Eichen-Kleiderschrank"

Das Admin-Konto heißt jetzt **Wiebke** statt „Admin" und hat eine Serie von
drei Wochen. Das Besucher-Konto `test@plietsche.de` hat das Passwort des
Admin-Kontos bekommen.

Im Punkteverlauf steht noch eine Zeile „Teil gebracht: xnxn" — eine Zeile im
Verlauf, fällt auf dem Screenshot kaum auf. Wer sie weghaben will, muss den
`points_log`-Eintrag entfernen.
