# Plietsche Plünn — Technischer Steckbrief

Stand: 3. August 2026 · App-Version 1.0.0 (Build 21)

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
| Sprache | TypeScript | 5.9 |
| App-Framework | React Native | 0.86.2 |
| | React | 19.2.3 |
| | Expo SDK | 57 |
| Architektur | React Native New Architecture (Fabric, TurboModules) | verpflichtend ab SDK 55 |
| Navigation | Expo Router (dateibasiert, typisierte Routen) | 57.0 |
| Server-State | TanStack Query | 5.100 |
| Client-State | Zustand | 5.0 |
| Backend | PocketBase (Go, eingebettetes SQLite) | 0.22.21 |
| Backend-Logik | JavaScript-Hooks (Goja-Runtime) | ES5-kompatibel |
| Container | Docker Compose hinter Traefik | — |
| Build | EAS CLI, lokale Xcode-Archive | ≥ 12.0 |

**Laufzeitanforderung Entwicklung:** Node 22 LTS

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

36 direkte Abhängigkeiten.

**Expo-Module (18):** router · camera · location · notifications · secure-store ·
image-picker · constants · device · font · splash-screen · status-bar · system-ui ·
linking · blur · glass-effect · linear-gradient · haptics

**Weitere Bibliotheken:** react-native-reanimated · react-native-worklets ·
react-native-gesture-handler · react-native-screens · react-native-safe-area-context ·
react-native-svg · react-native-qrcode-svg · @react-native-community/datetimepicker ·
@expo/vector-icons (Font Awesome 6) · @expo-google-fonts/work-sans · pocketbase-js-sdk ·
@tanstack/react-query · zustand

**Schrift:** Work Sans (400/500/600/700), lokal gebündelt

> Die JS-SDK-Version muss zur PocketBase-Server-Hauptversion passen — deshalb ist
> `pocketbase` exakt auf 0.22.1 festgenagelt.

**Bekannte Meldungen aus `npm audit`:** 14 Hinweise, davon zwei hoch, keine kritischen.
Alle betreffen ausschließlich Entwicklungswerkzeuge (`react-devtools-core`, `@expo/cli`,
`@expo/fingerprint`) und landen nicht im ausgelieferten App-Bundle — im gebauten Bundle
ist keines dieser Pakete enthalten.

**Aktualisierung:** 33 der 36 Abhängigkeiten sind an das Expo SDK oder die
PocketBase-Serverversion gebunden und werden nur gemeinsam angehoben
(`npx expo install expo@^<major> --fix`). Dependabot ist entsprechend eingeschränkt und
schlägt nur für die drei freien Pakete Updates vor (`@tanstack/react-query`, `zustand`,
`typescript`) — siehe `.github/dependabot.yml`.

---

## Datenhaltung

**PocketBase mit SQLite**, verschlüsselt über `PB_ENCRYPTION_KEY`. Zwölf Collections:

`users` · `items` · `visits` · `points_log` · `badges` · `user_badges` ·
`campaigns` · `action_counts` · `needs` · `push_devices` · `push_messages` · `store`

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
Teile-Codes selbst) · `POST /api/pp/push/register` · `POST /api/pp/push/unregister`

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
| App-Quelltext | rund 7.800 Zeilen TypeScript |
| Backend-Quelltext | rund 2.300 Zeilen JavaScript |
| Bildschirme | 23 |
| Fremdabhängigkeiten (direkt) | 36 |
| Commits | 172 |

---

## Projektdaten

| | |
|---|---|
| Repository | https://github.com/Revisor01/plietsche-pluenn |
| Lizenz | *noch nicht festgelegt* |
| iOS | in Vorbereitung zur Einreichung (TestFlight läuft) |
| Android | noch nicht eingereicht |
| Entwicklung | Simon Luthe |
| Kontakt | mail@simonluthe.de |
