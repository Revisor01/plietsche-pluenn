# Plietsche Plünn — Technischer Steckbrief

Stand: 26. Oktober 2026 · App-Version 1.0.0 (Build 33)

---

## Kurzfassung

Native App für eine Kleiderkammer: Besucher:innen checken per QR-Code im Laden ein,
nehmen Kleidung mit, bringen eigene Teile vorbei und sammeln dafür Punkte, Ränge und
Abzeichen. Eine Codebasis für iOS und Android, jeweils in der plattformtypischen
Designsprache. Backend selbst gehostet, kein Cloud-Dienst Dritter.

---

## Stack

| Ebene | Technologie | Version |
|---|---|---|
| Sprache | TypeScript | 6.0 |
| App-Framework | React Native | 0.86.3 |
| | React | 19.2.3 |
| | Expo SDK | 57 |
| Architektur | React Native New Architecture (Fabric, TurboModules) | verpflichtend ab SDK 55 |
| Navigation | Expo Router (dateibasiert, typisierte Routen) | 57.0 |
| Server-State | TanStack Query | 5.104 |
| Client-State | lokales `useState` (keine eigene Bibliothek) | — |
| Backend | PocketBase (Go, eingebettetes SQLite) | 0.40.4 |
| Backend-Logik | JavaScript-Hooks (Goja-Runtime) | ES5-kompatibel |
| Container | eigenes Docker-Abbild (`pocketbase/Dockerfile`) | — |
| Build | iOS in Xcode Cloud, Android mit Gradle in GitHub Actions | — |

**Laufzeitanforderung Entwicklung:** Node 26 LTS

---

## Plattformen

| | |
|---|---|
| iOS | ab 16.4, iPhone (kein iPad) |
| Android | minSdk 24, targetSdk 36 (Android 16), compileSdk 36 |
| | Adaptive Icon mit Monochrom-Ebene (Themed Icons) |
| Ausrichtung | nur Hochformat |
| Erscheinungsbild | fester Hellmodus |
| Bundle-ID / Package | `de.godsapp.plietschepluenn` |
| URL-Schema | `pp://` |

> Google Play verlangt ab dem 31. August 2026 targetSdk 36 für neue Apps und Updates.
> Diese Vorgabe ist erfüllt.

---

## Abhängigkeiten

40 direkte Abhängigkeiten.

**Expo-Module (22):** router · camera · location · notifications · secure-store ·
image-picker · file-system · constants · device · font · splash-screen · status-bar ·
system-ui · linking · blur · glass-effect · linear-gradient · haptics · print · sharing ·
alternate-app-icons · build-properties

**Weitere Bibliotheken:** react-native-reanimated · react-native-worklets ·
react-native-gesture-handler · react-native-screens · react-native-safe-area-context ·
react-native-svg · react-native-qrcode-svg · qrcode · @react-native-community/datetimepicker ·
react-native-share · @expo/vector-icons (Font Awesome 6) · @expo-google-fonts/work-sans ·
@expo/metro-runtime · pocketbase-js-sdk · @tanstack/react-query

> `expo-print`, `expo-sharing` und `qrcode` erzeugen den QR-Etikettenbogen
> (`lib/qrsheet.ts`) als PDF; `react-native-qrcode-svg` zeigt einzelne Codes im
> Screen.

**Schrift:** Work Sans (400/500/600/700), lokal gebündelt

> `pocketbase` (JS-SDK) ist exakt auf 0.22.1 gepinnt, die Version der
> ausgelieferten Apps. Die Integrationstests (`npm run test:integration`) prüfen
> die Wege der App mit diesem SDK gegen den Server 0.40.4.

**Bekannte Meldungen aus `npm audit`** (26.10.2026): fünf hohe, keine kritischen. Alle
hängen an zwei Paketen im Expo-Kommandozeilenwerkzeug (`node-forge`, `zod`) und landen
nicht im ausgelieferten App-Bundle. Für beide gibt es in keiner Expo-Version bis SDK 58
einen Fix.

**Aktualisierung:** Die meisten Abhängigkeiten sind an das Expo SDK oder die
PocketBase-Serverversion gebunden und werden nur gemeinsam angehoben
(`npx expo install expo@^<major> --fix`). Dependabot ist entsprechend eingeschränkt und
schlägt Updates im Wesentlichen nur noch für `@tanstack/react-query` vor — siehe
`.github/dependabot.yml`.

> **TypeScript folgt dem SDK:** 6.0, wie SDK 57 es erwartet (`~6.0.3`), nicht 7.x.
> Dependabot lässt für `typescript` nur Patch-Stände zu.

---

## Datenhaltung

**PocketBase mit SQLite**, verschlüsselt über `PB_ENCRYPTION_KEY`. Dreizehn Collections:

`users` · `items` · `visits` · `points_log` · `badges` · `user_badges` ·
`campaigns` · `action_counts` · `needs` · `push_devices` · `push_messages` · `store` ·
`store_secrets`

Zugriff über PocketBase-Collection-Rules; punkte- und abzeichenrelevante Tabellen sind
ausschließlich serverseitig beschreibbar.

**Auf dem Gerät:** Anmeldedaten in der iOS-Keychain bzw. dem Android-Keystore
(`expo-secure-store`). Kein lokaler Datenbank-Cache.

---

## Automatische Abläufe (Server)

| Job | Takt | Zweck |
|---|---|---|
| `push-scheduled` | jede Minute | fällige Benachrichtigungen zustellen |
| `streak-reset` | täglich 03:05 | abgelaufene Besuchsserien zurücksetzen |
| `action-badges` | täglich 03:20 | Aktions-Abzeichen nachvergeben |
| `year-badges` | täglich 03:40 | Treue-Abzeichen am 31.12. |

**Eigene Endpunkte:** `POST /api/pp/scan` (universeller Scanner, erkennt Tür- und
Teile-Codes selbst) · `POST /api/pp/push/register` · `POST /api/pp/push/unregister` ·
`GET /api/pp/version` (welcher Commit läuft, für die Prüfung nach dem Deploy)

---

## Auslieferung des Backends

Push auf `main` → Tests → Abbild bauen und zu `ghcr.io` schieben →
Webhook → Prüfung gegen die laufende Instanz. Kein SSH aus der CI;
der Server zieht selbst.

Hooks und Migrationen liegen im Abbild (`pocketbase/Dockerfile`); der Stack
mountet nur `pb_data`. Nach dem Deploy prüft `.github/scripts/deploy-verify.py`
je Migration ein Schemamerkmal und den Commit der geladenen Hooks.

---

## Tracking und Analytik

**Keine.** Kein Analytics-SDK, kein Crash-Reporter, keine Werbe-IDs, keine
Drittanbieter-Telemetrie. Geprüft über Abhängigkeitsbaum und Quelltextsuche.

Die App spricht ausschließlich mit dem eigenen Backend und — beim Versand von
Benachrichtigungen — mit dem Expo-Push-Dienst.

**Angeforderte Berechtigungen:**

| Berechtigung | Wofür | Pflicht |
|---|---|---|
| Kamera | QR-Codes scannen | ja, für Check-in |
| Standort | Prüfen, ob jemand wirklich im Laden ist | nein, Check-in geht auch ohne |
| Benachrichtigungen | Punktebestätigung, Aktionen, Abzeichen | nein, kategorieweise abwählbar |
| Fotomediathek | Foto beim Einstellen eines Teils | nur bei Bedarf |

---

## Datenschutz nach Bauart

- Ein mitgenommenes Teil speichert **keine Referenz auf die Person**, die es genommen
  hat — nur einen Zeitstempel. Die Verbindung „Person X nahm Teil Y" existiert in der
  Datenbank nicht.
- Das Punktekonto führt nur eine Klartextnotiz, keinen Fremdschlüssel auf das Teil.
- Interne Lagerorte sind für normale Nutzer:innen unsichtbar.
- Wer ein Teil selbst vorbeibringt, gibt keine Adresse an.
- GPS-Daten werden nur beim Check-in erhoben.
- Push ist vierfach getrennt abwählbar, „Sonstiges" standardmäßig aus, mit echtem
  Abmelde-Endpunkt.

---

## Umfang

| | |
|---|---|
| App-Quelltext | rund 10.300 Zeilen TypeScript |
| Backend-Quelltext | rund 3.500 Zeilen JavaScript (Hooks und Migrationen) |
| Bildschirme | 23 |
| Fremdabhängigkeiten (direkt) | 40 |

---

## Projektdaten

| | |
|---|---|
| Repository | https://github.com/Revisor01/plietsche-pluenn |
| Lizenz | AGPL-3.0 |
| iOS | im App Store |
| Android | bei Google Play |
| Entwicklung | Simon Luthe |
| Kontakt | mail@simonluthe.de |
