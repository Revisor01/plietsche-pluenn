# Release-Audit 2026-09 — Toolchain und Abhängigkeiten (App `mobile/` und Test-Root)

| | |
|---|---|
| **Datum** | 26.09.2026 |
| **Stand** | Commit `06b68dc` („feat(app): Symbolauswahl bleibt als Funktion", 19.09.2026). Arbeitsbaum zu Beginn: `package-lock.json` im Repo-Root lokal verändert (siehe W-11), sonst sauber. |
| **Werkzeuge** | Node v22.22.2, npm 10.9.7 (Container). `mobile/.nvmrc` = 22, CI `setup-node` = 22, Root `engines.node` ≥ 22.12.0. expo-doctor 1.20.4 (per `npx` nachgeladen). |
| **Umfang** | Installierbarkeit, Typprüfung, Expo-Gesundheit, Sicherheit und Notwendigkeit der Abhängigkeiten, Pins und Overrides in `mobile/package.json`, Lizenzen, Bundle-Größe und Assets, Node-/npm-Anforderungen des Test-Roots. |
| **Nicht im Umfang** | Fachlogik, UI, Backend-Hooks, CI-Ablauf im Detail (eigener Bericht `ci-deploy-release.md`). Kein Apple-/Google-/EAS-Zugang, kein Xcode, kein Android-SDK im Container — der native Build selbst konnte nicht ausgeführt werden. |
| **Vorgehen** | Jeder Befehl im Container ausgeführt, Dauer gemessen, Ausgabe unten gekürzt protokolliert. Wo ein Befehl Dateien anlegen würde (`expo export`, Auflösungsproben ohne Overrides / ohne `legacy-peer-deps`, Vorlage `expo-template-bare-minimum`, Typed-Routes-Deklaration), lief er in eine Kopie im Scratchpad oder in ein eigenes Ausgabeverzeichnis. Projektdateien und Lockfiles wurden nicht verändert; `npm ci`, nicht `npm install`. |
| **Kennzeichnung** | *reproduziert* = Werkzeug hat es hier gezeigt · *aus Code gelesen* = aus Quelltext (Projekt oder Bibliothek in `node_modules`) hergeleitet, nicht auf einem Gerät nachgestellt |

## Zusammenfassung

Die App **kompiliert**: `npm ci` installiert in 17 s ohne Peer-Konflikt-Abbruch, `tsc --noEmit` meldet **0 Fehler** in 65 Dateien (auch mit den generierten Expo-Router-Routentypen, die im Repo und in der CI fehlen), und ein vollständiger Metro-Export für iOS und Android läuft in 57 s durch (Hermes-Bytecode 5,2 / 5,4 MB). `npm audit` meldet in `mobile/` **0 Schwachstellen** — sowohl mit als auch ohne Entwicklungswerkzeuge — und im Repo-Root ebenfalls 0; die Angabe in `TECH.md` („14 Hinweise, zwei hoch") ist damit überholt. Die exakten Pins (`react-native-reanimated` 4.5.1, `react-native-worklets` 0.10.1, `react-native-svg` 15.15.4, `@react-native-community/datetimepicker` 9.1.0) entsprechen genau den Vorgaben des SDK 57 (`bundledNativeModules.json`), und `pocketbase` 0.22.1 passt zum Server 0.22.21 im Dockerfile.

Zwei Befunde sind ernst. **W-1 (HOCH):** Der Override `decode-uri-component@^0.5.0` erzwingt ein reines ES-Modul unter `query-string@7.1.3` (Abhängigkeit von `expo-router`), das es per `require()` lädt — der Aufruf endet mit `TypeError: decodeComponent is not a function` (in Node reproduziert; Metro übersetzt den Default-Export nach `exports.default`, sodass dasselbe Objekt statt der Funktion zurückkommt). In `expo-router` 57.0.21 liegt die betroffene `parse`-Stelle nur im Rückfallpfad der Link-Verarbeitung, daher stürzt die App heute vermutlich nicht ab; der Override ist aber dem Bau nach falsch und wartet auf das nächste Patch-Release, das den Pfad wieder benutzt. **W-2 (HOCH):** `mobile/ios/` ist teilweise eingecheckt (`Podfile`, veraltetes `Podfile.lock`, `.xcode.env`) trotz `/ios` in `.gitignore`. expo-doctor stuft das Projekt deshalb als „nicht CNG" ein; `expo run:ios` und ein EAS-Build würden den Prebuild überspringen und an einem fehlenden Xcode-Projekt scheitern. Die CI ist nur deshalb nicht betroffen, weil sie `--clean` verwendet.

Mittelschwer: Der Metro-Override 0.84.6 widerspricht der exakten Vorgabe 0.84.5 von `@expo/metro` (expo-doctor rot, ohne erkennbaren Sicherheitsgrund); zehn Expo-Pakete liegen hinter dem SDK-57-Patchstand; und das Bundle trägt rund **6 MB ungenutzte Schriften** je Plattform (alle 18 Work-Sans-Schnitte statt 4, alle 19 Icon-Fonts statt 2), weil über die Paketwurzel importiert wird. Der Rest ist Hygiene: drei überflüssige Overrides, `legacy-peer-deps` verdeckt acht Peer-Pakete, Lockfiles stammen von npm 11 während CI und Container npm 10 nutzen, ungenutzte Assets, veraltete Zahlen in `TECH.md`.

**Release-Empfehlung für den Bereich:** **Freigabe möglich, sobald W-1 und W-2 behoben sind** — beides sind Änderungen von wenigen Zeilen (`overrides` kürzen, `git rm -r --cached mobile/ios`), die vor dem Release-Build zwingend in einem eigenen Commit mit anschließendem `npx expo-doctor` grün laufen sollten. W-3 und W-4 (`expo install --fix`) gehören in denselben Vorbereitungs-Commit, W-5 ist ein lohnender, risikoarmer Größengewinn. Der native Build (Xcode, Gradle) war hier nicht ausführbar und bleibt der letzte offene Nachweis — die CI-Läufe sind dafür die Messstelle.

## Befund-Tabelle

| ID | Kurztitel | Schwere | Nachweis |
|---|---|---|---|
| W-1 | Override `decode-uri-component@^0.5.0` ist ESM-only; `query-string@7` (expo-router) lädt es per `require()` → `TypeError` beim Parsen von Query-Strings | HOCH | reproduziert (Node) + aus Code gelesen (Metro-Plugin, expo-router) |
| W-2 | `mobile/ios/` teilweise eingecheckt trotz `.gitignore`; veraltetes `Podfile.lock`; expo-doctor „non-CNG"; `expo run:ios` / EAS überspringen Prebuild | HOCH | reproduziert (expo-doctor, `git ls-files -i`) + aus Code gelesen (`@expo/cli`) |
| W-3 | Metro-Override 0.84.6 gegen exakte Vorgabe 0.84.5 von `@expo/metro`; gemischte Metro-Version im Baum | MITTEL | reproduziert (expo-doctor, `npm ls`) |
| W-4 | 10 Expo-Pakete hinter dem SDK-57-Patchstand (u. a. `expo`, `expo-router`, `expo-notifications`, `expo-location`) | MITTEL | reproduziert (`expo install --check`, expo-doctor) |
| W-5 | Bundle enthält 34 ungenutzte Schriftdateien (~6 MB je Plattform) durch Import über die Paketwurzel | MITTEL | reproduziert (`expo export`, Asset-Liste) |
| W-6 | Native Vorlage wird beim Build ungepinnt aus npm geladen (`expo-template-bare-minimum@sdk-57`) | NIEDRIG | aus Code gelesen (`@expo/cli`) + reproduziert (`npm view`) |
| W-7 | `legacy-peer-deps` in `.npmrc` und CI verdeckt 8 Peer-Pakete; CI-Begründung nicht mehr zutreffend | NIEDRIG | reproduziert (Auflösungsprobe) |
| W-8 | Drei Overrides überflüssig (`browserslist`, `brace-expansion`, `@xmldom/xmldom`) | NIEDRIG | reproduziert (Auflösungsprobe ohne Overrides) |
| W-9 | `TECH.md` nennt veraltete Audit- und Versionszahlen | NIEDRIG | reproduziert (`npm audit`) |
| W-10 | Ungenutzte Assets (`splash-icon.png`, `icon-dark.png`, `icon-tinted.png`, `favicon.png`); `ring.png` 678 KB als Vorschaubild | NIEDRIG | reproduziert (grep, `expo config`, Export) |
| W-11 | Lockfiles von npm 11 erzeugt, CI/Container npm 10; `mobile/package.json` ohne `engines` | NIEDRIG | reproduziert (Lockfile-Merkmale, Root-Lock-Diff) |
| W-12 | Deprecated `text-encoding@0.7.0` als Laufzeitabhängigkeit (via `react-native-qrcode-svg`) | NIEDRIG | reproduziert (`npm ci`, `npm ls`) |
| W-13 | Typed Routes aktiviert, aber weder lokal noch in der CI geprüft (Deklaration wird nicht erzeugt) | NIEDRIG | reproduziert (tsc mit/ohne generierte Typen) |
| W-14 | Lizenz AGPL-3.0 und Store-Vertrieb: unproblematisch nur, solange keine Fremdbeiträge ohne Rechteübertragung eingehen | NIEDRIG / Unklar | aus Code gelesen (LICENSE, README) |

## Befunde im Einzelnen

### W-1 — Override `decode-uri-component@^0.5.0` bricht `query-string@7` (HOCH)

**Beschreibung.** `mobile/package.json` überschreibt `decode-uri-component` auf `^0.5.0`. Diese Version ist ein reines ES-Modul (`"type": "module"`, `exports: { default: "./index.js" }`, kein `require`-Einstieg). Der einzige Verbraucher im Baum ist `query-string@7.1.3` (Abhängigkeit von `expo-router@57.0.21`), das `^0.2.2` verlangt und CommonJS ist:

```js
// node_modules/query-string/index.js
const decodeComponent = require('decode-uri-component');   // Zeile 3
…
return decodeComponent(value);                              // Zeile 233, in decode()
```

`require()` eines ES-Moduls liefert das Modul-Objekt `{ default: fn }`, nicht die Funktion. Der Aufruf schlägt fehl.

**Nachweis (reproduziert, Node 22.22.2):**

```
$ node -e "const qs=require('./node_modules/query-string'); qs.parse('?item=%41bc&x=1')"
FEHLER: TypeError decodeComponent is not a function
```

**Nachweis für Metro (aus Code gelesen):** `@expo/metro-config` setzt `experimentalImportSupport: true` (`build/ExpoMetroConfig.js:345`). Damit übersetzt `metro-transform-plugins/src/import-export-plugin.js` den Default-Export in `exports.default = LOCAL` (Zeilen 28–30, 379–388) und setzt `__esModule`; ein `require()` aus CommonJS erhält dieses Objekt ohne Interop. Verhalten im Bundle also wie in Node. (Ein isoliertes Metro-Testbundle aus dem Scratchpad ließ sich nicht bauen, weil Metro Module außerhalb des Projektwurzelverzeichnisses nicht auflöst; ein Testeintrag in `mobile/` hätte den Arbeitsbaum verändert und wurde unterlassen.)

**Erreichbarkeit heute (aus Code gelesen).** In `expo-router@57.0.21` ruft nur `build/react-navigation/core/getStateFromPath.js:499` `queryString.parse(query)` auf. Dieser Pfad ist der Rückfall in `react-navigation/native/NavigationContainer.js:104` (`linking?.getStateFromPath ?? core_1.getStateFromPath`) und `useLinking.native.js:64`; expo-router liefert über `build/link/linking.js` seine eigene Fassung `build/fork/getStateFromPath.js`, in der der Aufruf auskommentiert ist (Zeilen 536–546) und ein eigener Parser läuft. Die übrigen Stellen (`fork/getPathFromState.js:273`, `fork/getPathFromState-forks.js:71`) nutzen nur `queryString.stringify`, das `decodeComponent` nicht anfasst. Die App selbst importiert `query-string` nicht. **Ein Absturz ist mit dem heutigen expo-router deshalb nicht zu erwarten; er ist genau ein Patch-Release oder eine Konfigurationsänderung (`linking.getStateFromPath` überschreiben) entfernt.**

**Warum der Override da ist.** Ohne Overrides meldet `npm audit` `decode-uri-component <=0.4.2` als *moderate* („Denial of service via exponential decoding of malformed percent-encoded input"); die einzige nicht betroffene Version ist 0.5.0 — und die ist ESM-only. Der Override tauscht also eine im App-Kontext unerreichbare DoS-Meldung (die Funktion wird nicht aufgerufen) gegen einen echten, wenn auch heute schlafenden Laufzeitfehler.

**Auswirkung.** Sobald ein Query-String über den betroffenen Pfad läuft, `TypeError` beim Verarbeiten eines Deep Links oder einer Navigation mit Parametern — in einer App, die auf Deep Links (`pp://`, Push-Nachrichten) baut.

**Empfehlung.** Override entfernen; `query-string@7` zieht dann 0.2.2. Die verbleibende `npm audit`-Meldung in `TECH.md` als bewusst akzeptiert dokumentieren (Begründung: `parse` wird von expo-router nicht aufgerufen) oder per `npm audit`-Ausnahme in der CI führen. Nicht auf eine 0.2.x-/0.4.x-Fassung mit CJS hoffen — sie existiert nicht. Danach `npx expo export` und den Deep-Link-Pfad (`pp://…?…`) auf einem Gerät prüfen.

### W-2 — `mobile/ios/` teilweise eingecheckt; Prebuild-Widerspruch (HOCH)

**Beschreibung.** Getrackt sind `mobile/ios/.xcode.env`, `mobile/ios/Podfile`, `mobile/ios/Podfile.lock` (`git ls-files -i -c --exclude-standard` listet genau diese drei als „getrackt, aber ignoriert"). `mobile/.gitignore` enthält `/ios` und `/android` („generated native folders"). Beides — die Dateien und die Ignore-Regel — kam im selben Commit `e73cf5f` („fix(tests): Harness an PocketBase angleichen …", 14.09.2026), dessen Commit-Body die iOS-Dateien nicht erwähnt. Kein `.xcodeproj`, kein `.xcworkspace`, keine `Podfile.properties.json`.

**Nachweis (reproduziert).** expo-doctor: „✖ Check for app config fields that may not be synced in a non-CNG project — This project contains native project folders but also has native configuration properties in app.json … When the android/ios folders are present, EAS Build will not sync the following properties: scheme, orientation, icon, userInterfaceStyle, ios, android, plugins." Das `Podfile.lock` ist veraltet: `Expo (57.0.9)`, `React-Core (0.86.2)` gegenüber installiert `expo` 57.0.22 / `react-native` 0.86.3.

**Nachweis (aus Code gelesen).** `@expo/cli/build/src/run/ensureNativeProject.js:40`: `if (!fs.existsSync(path.join(projectRoot, platform))) prebuildAsync(…) else return true` — ein vorhandenes `ios/` gilt als fertiges Natives Projekt, der Prebuild entfällt. Ohne Workspace schlägt `pod install`/`xcodebuild` fehl. EAS Build behandelt ein Projekt mit `ios/`-Ordner ebenso als „bare" (expo-doctor sagt es oben selbst). Die CI (`testflight.yml`, `release.yml`) ist nur deshalb unberührt, weil sie `npx expo prebuild --platform ios --clean` ausführt und den Ordner vorher löscht — wobei sie dabei getrackte Dateien entfernt, was im Runner folgenlos bleibt.

**Auswirkung.** `npm run ios` (= `expo run:ios`) lokal und jeder EAS-Build (`eas.json` mit drei Profilen liegt im Repo) scheitern sicher; Entwickler:innen sehen ein Podfile, das nichts über den tatsächlichen Build aussagt. `TECH.md` beschreibt bewusst den Managed/CNG-Weg — die drei Dateien widersprechen dem.

**Empfehlung.** `git rm -r --cached mobile/ios` (die Ignore-Regel ist schon da). Danach `npx expo-doctor` — der Check wird grün. Wer das Podfile als Dokumentation behalten will, legt es unter `docs/` ab, nicht unter `ios/`.

### W-3 — Metro-Override 0.84.6 gegen Vorgabe 0.84.5 (MITTEL)

**Beschreibung.** `overrides` setzen `metro`, `metro-config`, `metro-transform-worker` exakt auf 0.84.6. `@expo/metro@56.0.2` verlangt alle drei exakt in 0.84.5 (`npm ls`: „overridden"); `@react-native/community-cli-plugin@0.86.3` verlangt `^0.84.3` und wäre mit 0.84.5 zufrieden. Die Metro-Unterpakete, die nicht überschrieben sind (`metro-cache`, `metro-resolver`, `metro-source-map`, `metro-file-map`, …), liegen weiterhin in 0.84.5 unter `node_modules/@expo/metro/node_modules/` — der Baum mischt zwei Metro-Patchstände.

**Nachweis (reproduziert).** expo-doctor: „✖ Check for overridden dependencies — `@expo/metro` should install `metro@0.84.5`, but 0.84.6 is installed … Advice: Remove the resolution/override for metro, metro-config, and metro-transform-worker". Die Auflösungsprobe **ohne** Overrides ergibt `npm audit` ohne jede Meldung zu Metro — ein Sicherheitsgrund für den Override ist nicht erkennbar. Veröffentlichungsdaten: 0.84.5 am 19.08.2026, 0.84.6 am 02.09.2026 (`npm view metro time`); Release-Notes zu 0.84.6 waren aus dem Container nicht abrufbar (GitHub-API ohne Freigabe). Eine Begründung im Repo (Commit-Body `e73cf5f`, `CHANGELOG.md`, `TECH.md`) gibt es nicht.

**Auswirkung.** Der Export lief hier fehlerfrei, das Risiko ist also nicht akut; aber Expo unterstützt die Mischung ausdrücklich nicht („unsupported and may cause unexpected behavior"), und der rote Doctor-Check verdeckt künftige echte Abweichungen.

**Empfehlung.** Die drei Metro-Overrides entfernen, `npm install` (einmalig, dann `npm ci`), Doctor prüfen. Falls 0.84.6 einen konkreten Fehler behebt, gehört die Begründung in `TECH.md` und der Pin auf `@expo/metro` statt auf Metro.

### W-4 — Zehn Expo-Pakete hinter dem SDK-57-Patchstand (MITTEL)

**Nachweis (reproduziert, `npx expo install --check`, 26.09.2026):** siehe Tabelle unten. Betroffen sind u. a. `expo` (57.0.22 → ~57.0.25), `expo-router` (57.0.21 → ~57.0.23), `expo-notifications` (57.0.18 → ~57.0.21), `expo-location` (57.0.17 → ~57.0.20), `expo-image-picker` (57.0.17 → ~57.0.20). Die Bereiche in `package.json` (`~57.0.x`) lassen die Stände zu; nur das Lockfile ist alt.

**Auswirkung.** Push (`expo-notifications`), Standort beim Check-in (`expo-location`) und Kamera/Foto (`expo-image-picker`) sind die drei sichtbarsten Funktionen der App; ihre Patch-Releases wurden nicht mitgenommen. Was sie ändern, war aus dem Container nicht nachlesbar (Changelogs auf GitHub) — „Unklar" unten.

**Empfehlung.** Vor dem Release-Build `npx expo install --check` → `--fix` in einem eigenen Commit (`chore(deps)`), danach `npm ci`, `tsc`, `expo-doctor`, Export und ein Gerätetest von Push, Standort, Scan. `TECH.md` erlaubt genau das („nur gemeinsam angehoben").

### W-5 — 34 ungenutzte Schriftdateien im Bundle (~6 MB je Plattform) (MITTEL)

**Beschreibung.** `app/_layout.tsx` importiert `WorkSans_400Regular … 700Bold` aus `@expo-google-fonts/work-sans` (Paketwurzel). Deren `index.js` enthält 18 `require('./…/WorkSans_….ttf')` — Metro verfolgt jedes `require`, ohne ungenutzte Exporte zu entfernen. Gleiches bei `@expo/vector-icons`: die App nutzt `FontAwesome6` (2 Stellen) und `FontAwesome` (1 Stelle), importiert aber über `'@expo/vector-icons'`, dessen Index alle Icon-Familien lädt.

**Nachweis (reproduziert, `npx expo export --platform ios --platform android`, 57 s).** Die Asset-Liste enthält 38 `.ttf`: alle 18 Work-Sans-Schnitte (100 Thin bis 900 Black, je aufrecht und kursiv; zusammen 3,2 MB, genutzt 4 = 0,75 MB), alle 19 Icon-Fonts von vector-icons (4,0 MB; genutzt FontAwesome6 Solid/Regular/Brands + FontAwesome ≈ 0,87 MB — `MaterialCommunityIcons.ttf` allein 1,3 MB) sowie `MaterialSymbols_400Regular.ttf` (967 KB) über `expo-router → expo-symbols`. Assets je Plattform laut `metadata.json`: iOS 64 Dateien / 7,93 MB, Android 68 Dateien / 8,86 MB; davon rund 6 MB vermeidbar.

**Auswirkung.** Größerer Download und mehr Speicher auf dem Gerät; für den Offline-Start ist die Lage sonst richtig: die Schriften werden gebündelt, nichts wird zur Laufzeit nachgeladen (bestätigt durch die Asset-Liste; `useFonts` lädt aus dem Bundle).

**Empfehlung.** Schnittweise importieren: `import { WorkSans_400Regular } from '@expo-google-fonts/work-sans/400Regular'` (das Paket liefert je Schnitt ein eigenes `index.js`) und `import FontAwesome6 from '@expo/vector-icons/FontAwesome6'`. Der MaterialSymbols-Font hängt an expo-router und ist nicht beeinflussbar. Nach der Änderung Export wiederholen und die `.ttf`-Zahl (erwartet: 4 + 4 + 1) prüfen.

### W-6 — Native Vorlage ungepinnt (NIEDRIG)

`app.json` nennt keine `expo-build-properties`, `expo config --type introspect` liefert weder `android.compileSdkVersion/targetSdkVersion/minSdkVersion` noch `ios.deploymentTarget`. Die Werte entstehen erst beim `expo prebuild`: `@expo/cli/build/src/prebuild/resolveTemplate.js:103–117` lädt ohne `--template` das npm-Paket **`expo-template-bare-minimum@sdk-57`** (dist-tag, heute 57.0.27; verlangt `expo ~57.0.25`). Aus dieser Vorlage stammen `platform :ios, … || '16.4'` und `IPHONEOS_DEPLOYMENT_TARGET = 16.4` sowie `gradle.properties` mit `edgeToEdgeEnabled=true`, `newArchEnabled=true`, `hermesEnabled=true`. Die Android-SDK-Stufen kommen aus `react-native@0.86.3/gradle/libs.versions.toml` (`minSdk = "24"`, `targetSdk = "36"`, `compileSdk = "36"`), gelesen vom Expo-Gradle-Plugin (`ExpoRootProjectPlugin.kt:53–55`). **Alle Werte stimmen mit `TECH.md` überein** (iOS ≥ 16.4, minSdk 24, targetSdk/compileSdk 36). Risiko: Ein neues Template-Patch ändert das native Projekt ohne Änderung im Repo. Empfehlung: in `TECH.md` festhalten, woher die Werte kommen; optional `--template expo-template-bare-minimum@57.0.27` in der CI für Reproduzierbarkeit.

### W-7 — `legacy-peer-deps` verdeckt Peer-Pakete; Begründung überholt (NIEDRIG)

`mobile/.npmrc`: `legacy-peer-deps=true`; die CI setzt zusätzlich `npm ci --legacy-peer-deps` mit dem Kommentar „lassen sich mit npm 10 nicht strikt auflösen". **Reproduziert:** Eine Auflösung mit npm 10.9.7 **ohne** die Einstellung, aber mit dem vorhandenen Lockfile (`npm install --package-lock-only --legacy-peer-deps=false`, Kopie im Scratchpad) gelingt in 2 s mit nur `npm warn ERESOLVE overriding peer dependency` und ergänzt genau acht Pakete: `react-dom@19.3.0` (+ `scheduler`), `@react-native/metro-config@0.86.3`, `@react-native/babel-preset`, `@react-native/metro-babel-transformer`, drei Babel-Plugins. Ohne Lockfile ebenso (21 s, Exit 0). Die Aussage im CI-Kommentar trifft mit dem heutigen npm nicht mehr zu. Was verdeckt wird: `react-native-worklets@0.10.1` deklariert `@react-native/metro-config` als Peer, referenziert es aber in keinem Quelltext (harmlos); `react-dom` ist Peer der Web-Anteile von `expo-router` (`@expo/ui`, `@radix-ui/*`, `vaul`) — für eine reine Native-App irrelevant. Risiko der Einstellung: Ein echter Konflikt (z. B. ein natives Modul gegen die RN-Version) installiert künftig still und fällt erst zur Laufzeit auf; `expo-doctor` deckt nur die dem SDK bekannten Pakete. Empfehlung: CI-Kommentar korrigieren; probeweise ohne `legacy-peer-deps` installieren und Export/Build prüfen — wenn grün, Einstellung entfernen.

### W-8 — Drei Overrides überflüssig (NIEDRIG)

Auflösungsprobe ohne `overrides` (Kopie im Scratchpad): `browserslist` → 4.29.1 (Eltern verlangen `^4.25.0`, `^4.28.7`, `^4.24.0`), `brace-expansion` → 5.0.12 (`minimatch@10.2.6` verlangt `^5.0.8`), `@xmldom/xmldom` → 0.8.15 (`@expo/plist` verlangt `^0.8.8`). Die drei Overrides erzwingen also nichts, was der Bereich nicht ohnehin zuließe; sie heben nur das Lockfile. `npm audit` meldet ohne Overrides zu keinem der drei etwas. **Begründet und behalten:** `xcode → uuid ^11.1.1` (ohne Override `uuid@7.0.3` mit *moderate* „Missing buffer bounds check in v3/v5/v6"); `uuid@11` liefert einen CJS-Einstieg, `xcode/lib/pbxProject.js:91` ruft `uuid.v4()` — geprüft: `require('uuid').v4()` aus dem xcode-Kontext funktioniert. Empfehlung: die drei entfernen, das Lockfile per `npm update browserslist brace-expansion @xmldom/xmldom` aktualisieren.

### W-9 — `TECH.md` veraltet (NIEDRIG)

„Bekannte Meldungen aus `npm audit`: 14 Hinweise, davon zwei hoch" — heute **0** in `mobile/` (mit und ohne `--omit=dev`) und **0** im Root (reproduziert). „TanStack Query 5.101" — installiert 5.102.8. „Node 22 LTS" korrekt. Schrift „lokal gebündelt" korrekt, aber alle 18 Schnitte (W-5). Empfehlung: Abschnitt bei der Behebung von W-1/W-3/W-8 mitschreiben, inklusive der dann bewusst akzeptierten `decode-uri-component`-Meldung.

### W-10 — Ungenutzte und übergroße Assets (NIEDRIG)

Keine Referenz in `mobile/` außer `assets/`: `splash-icon.png` (108 KB), `icon-dark.png` (336 KB), `icon-tinted.png` (48 KB), `favicon.png` (8 KB). Ursache: `app.json` hat keinen `splash`-Block und das Plugin `expo-splash-screen` steht ohne Optionen — `getAndroidSplashConfig.js` fällt auf `backgroundColor '#ffffff'` ohne Bild zurück, `expo config` zeigt `splash: undefined` (Startbildschirm ist weiß und leer; UI-Bewertung im Screen-Bericht). `icon` ist ein String, nicht `{ light, dark, tinted }` — die iOS-18-Varianten werden nicht ausgeliefert. `favicon.png`: kein Web-Ziel. Im JS-Bundle landen nur `assets/icons/*.png` (Vorschau der Symbolauswahl in `settings/account.tsx`): `ring.png` 678 KB gegenüber 48–104 KB der drei anderen bei identischen 1024×1024 px — als Vorschaubild überdimensioniert. Empfehlung: Splash konfigurieren oder Datei löschen; Icon-Objekt mit Varianten oder Dateien löschen; `ring.png` verlustfrei nachkomprimieren.

### W-11 — Lockfiles von npm 11, Werkzeuge auf npm 10 (NIEDRIG)

`mobile/package-lock.json` (lockfileVersion 3) enthält 4 `libc`-Einträge, der Root-Lock in `HEAD` 10 — das Feld schreibt erst npm 11. CI (`setup-node` 22 → npm 10.9.x) und Container (10.9.7) sind älter. Beobachtet zu Beginn dieser Prüfung: der Root-`package-lock.json` war lokal verändert (`engines` ergänzt, `libc`-Felder entfernt — die Handschrift eines `npm install` mit npm 10); nach `npm ci` im Root war der Unterschied verschwunden, der Arbeitsbaum sauber. `npm ci` ist von der Differenz unbeeindruckt, jedes `npm install` mit npm 10 schreibt den Lock aber um und erzeugt Rauschen in Commits. `mobile/package.json` hat kein `engines`-Feld. Empfehlung: `engines: { node: ">=22.12", npm: ">=11" }` (oder `packageManager`) in beiden `package.json`, `setup-node` mit `npm i -g npm@11` oder umgekehrt die Locks einmal mit npm 10 schreiben.

### W-12 — `text-encoding@0.7.0` deprecated (NIEDRIG)

Einzige Deprecation bei `npm ci`: „text-encoding@0.7.0: no longer maintained". Laufzeitabhängigkeit via `react-native-qrcode-svg@6.3.21` (auch das aktuelle 6.3.26 verlangt `text-encoding ^0.7.0`). Keine bekannte Schwachstelle; Polyfill für `TextEncoder`, den Hermes inzwischen mitbringt. Empfehlung: beobachten; bei einem Wechsel des QR-Renderers berücksichtigen.

### W-13 — Typed Routes ohne Prüfung (NIEDRIG)

`app.json` setzt `experiments.typedRoutes: true`, `tsconfig.json` bindet `.expo/types/**/*.ts` und `expo-env.d.ts` ein — beide existieren nach `npm ci` nicht (sie entstehen erst durch `expo start`/`export`/`customize`), auch nicht in der CI (`tests.yml`: `npm ci` → `npx tsc --noEmit`). Die Routen-Strings werden dort also als `string` geprüft. **Reproduziert:** Die Deklaration wurde hier über `@expo/router-server/build/typed-routes` (`regenerateDeclarations`) ins Scratchpad erzeugt und mit einer erweiterten tsconfig eingebunden — `tsc` weiterhin **0 Fehler** in 66 Dateien; alle heute verwendeten Routen sind gültig. Das Ergebnis gilt für diesen Stand, die Prüfung selbst fehlt im Ablauf. Empfehlung: in der CI vor `tsc` einmal `npx expo customize tsconfig.json`-frei die Typen erzeugen (z. B. `EXPO_NO_TELEMETRY=1 npx expo export --platform ios --output-dir /tmp/x` oder ein kleines Skript wie oben), oder auf `typedRoutes` verzichten.

### W-14 — AGPL-3.0 und Store-Vertrieb (NIEDRIG / Unklar)

`LICENSE` ist die GNU AGPL v3, `README.md` („wer die App oder das Backend betreibt, muss seine Änderungen ebenfalls offenlegen") und `TECH.md` bestätigen es; `mobile/package.json` ist `private` ohne `license`-Feld. Für den Rechteinhaber selbst ist der Vertrieb über App Store und Play Store unproblematisch — der Lizenzgeber bindet sich nicht an seine eigene Lizenz. Heikel wird es erst mit **Fremdbeiträgen ohne Rechteübertragung**: Deren Code stünde nur unter AGPL, und die App-Store-Bedingungen gelten seit dem VLC-Fall (2011) als mit der GPL-Familie unvereinbar. Empfehlung: Beitragsregel (CLA oder „nur eigene Beiträge") festhalten, solange die App im Store liegt. **Laufzeitabhängigkeiten sauber:** 190 Pakete unter `npm ls --omit=dev`, Lizenzen 162 MIT, 11 ISC, 4 BlueOak-1.0.0, 2 Apache-2.0, je 1 „MIT AND OFL-1.1" (Schriftpaket), „(MIT OR CC0-1.0)", „MIT AND Apache-2.0", Unlicense, „(Unlicense OR Apache-2.0)"; kein GPL/LGPL/AGPL. Nur Werkzeug: `lightningcss` (MPL-2.0, via `@expo/metro-config`), `node-forge` („BSD-3-Clause OR GPL-2.0", dual, via `@expo/cli`). Ob die Store-Verträge im konkreten Fall Bedingungen stellen, ist juristisch und hier nicht prüfbar.

## Tabelle: `tsc`-Fehler

`npx tsc --noEmit -p mobile/tsconfig.json` — Dauer 4 s, Exit 0, **0 Fehler**, 65 Projektdateien (ohne `node_modules`). Mit generierten Routentypen (Scratchpad): 0 Fehler, 66 Dateien.

| Datei:Zeile | Text | Einordnung |
|---|---|---|
| — | keine | — |

Konfiguration (`mobile/tsconfig.json` + `expo/tsconfig.base`): `strict: true` ✓, `skipLibCheck: true` (Vorgabe von Expo; Bibliothekstypen werden nicht geprüft), `noUncheckedIndexedAccess` **nicht** gesetzt (Index-Zugriffe gelten als definiert — Hinweis, kein Befund), `moduleResolution: bundler`, `customConditions: ["react-native"]`, `paths: { "@/*": ["./*"] }` (im Code **0** Verwendungen des Alias). Hinweis: `baseUrl` ist in TypeScript 6 deprecated (TS5101) — das Projekt setzt es nicht, gut so.

## Tabelle: `npm audit`

| Ort | Befehl | Ergebnis | Dauer |
|---|---|---|---|
| `mobile/` | `npm audit` | **0 Schwachstellen** (info 0, low 0, moderate 0, high 0, critical 0; 655 geprüfte Pakete) | 1 s |
| `mobile/` | `npm audit --omit=dev` | **0** | < 1 s |
| Repo-Root | `npm audit` | **0** (38 Pakete) | < 1 s |
| Scratchpad, `mobile/package.json` **ohne `overrides`** | `npm audit --package-lock-only` | 17 *moderate*, 0 high — Wurzeln: `decode-uri-component <=0.4.2` (DoS bei fehlerhafter Eingabe) und `uuid <11.1.1` (v3/v5/v6 Puffergrenze); die übrigen 15 Einträge sind deren Verbraucher (`query-string`, `expo-router`, `xcode`, `@expo/config-plugins`, `expo`, …) | 12 s |

| Paket | Schwere | Laufzeit / Werkzeug | Bemerkung |
|---|---|---|---|
| *(mit Overrides)* — | — | — | keine Meldung |
| *(ohne Overrides)* `decode-uri-component` 0.2.2 | moderate | Laufzeit (via `expo-router → query-string`), Funktion `decode` wird von expo-router 57.0.21 **nicht aufgerufen** | siehe W-1 |
| *(ohne Overrides)* `uuid` 7.0.3 | moderate | Werkzeug (nur `xcode` beim Prebuild; v4 wird genutzt, v3/v5/v6 nicht) | Override behalten (W-8) |

Die Aussage in `TECH.md` („14 Hinweise, zwei hoch, nur Entwicklungswerkzeuge") ist überholt (W-9).

## Tabelle: `npx expo install --check` (26.09.2026, Exit 1, < 1 s; `package.json` danach unverändert, geprüft per `diff`)

| Paket | installiert | vom SDK 57 erwartet |
|---|---|---|
| `@expo/metro-runtime` | 57.0.15 | ~57.0.16 |
| `expo` | 57.0.22 | ~57.0.25 |
| `expo-constants` | 57.0.18 | ~57.0.19 |
| `expo-glass-effect` | 57.0.3 | ~57.0.4 |
| `expo-image-picker` | 57.0.17 | ~57.0.20 |
| `expo-linking` | 57.0.10 | ~57.0.11 |
| `expo-location` | 57.0.17 | ~57.0.20 |
| `expo-notifications` | 57.0.18 | ~57.0.21 |
| `expo-router` | 57.0.21 | ~57.0.23 |
| `expo-sharing` | 57.0.19 | ~57.0.22 |

Exakte Pins gegen `expo/bundledNativeModules.json` (SDK 57): `react-native-reanimated` 4.5.1 ✓, `react-native-worklets` 0.10.1 ✓, `react-native-svg` 15.15.4 ✓, `@react-native-community/datetimepicker` 9.1.0 ✓, `react-native` 0.86.3 ✓, `react` 19.2.3 ✓, `react-native-gesture-handler` ~2.32.0 ✓, `react-native-screens` ~4.26.0 ✓, `react-native-safe-area-context` ~5.7.0 ✓, `@expo/vector-icons` ^15.0.2 ✓. `expo-alternate-app-icons` 8.0.0 (nicht im SDK-Verzeichnis) verlangt `expo >= 53` ✓. `typescript` 6.0.3 = vom SDK erwartetes `~6.0.3` ✓.

## Protokoll der Befehle

| Befehl (in `mobile/`, sofern nicht anders) | Dauer | Ergebnis (gekürzt) |
|---|---|---|
| `npm ci --no-fund` | 17 s | `added 654 packages … found 0 vulnerabilities`; eine Deprecation: `text-encoding@0.7.0: no longer maintained`; keine Peer-Fehler (`.npmrc legacy-peer-deps=true`) |
| `npx tsc --noEmit -p tsconfig.json` | 4 s | Exit 0, keine Ausgabe |
| `npx expo-doctor` (1.20.4) | 4 s | `18/21 checks passed. 3 checks failed`: Overridden dependencies (Metro, W-3) · non-CNG project (W-2) · Patch version mismatches, 10 Pakete (W-4) |
| `npx expo install --check` | < 1 s | 10 Pakete, s. Tabelle; `Found outdated dependencies`; `package.json` unverändert |
| `npx expo config --type introspect --json` / `--type public --json` | 1 s | löst auf; `sdkVersion 57.0.0`; kein `splash`; Plugins vollständig aufgelöst; keine SDK-Stufen im Ergebnis (W-6). Nebenbefund für den Screen-Bericht: aufgelöste Android-Rechte enthalten zusätzlich `RECORD_AUDIO`, `READ_/WRITE_EXTERNAL_STORAGE`; iOS-`infoPlist` enthält englische Standardtexte `NSPhotoLibraryUsageDescription`, `NSMicrophoneUsageDescription`, `NSFaceIDUsageDescription`, `NSLocationAlways…` aus Plugin-Vorgaben |
| `npm audit --json`, `npm audit --omit=dev --json` | 1 s | je 0 |
| `npm outdated` | 2 s | Wanted ≠ Current bei 12 Paketen (die 10 aus `expo install --check` sowie `@tanstack/react-query` 5.102.8 → 5.104.0, `react-native-qrcode-svg` 6.3.21 → 6.3.26). Latest weit voraus, aber SDK-gebunden: `react-native` 0.87.1, `react-native-gesture-handler` 3.3.0, `react-native-reanimated` 4.7.0, `react-native-worklets` 0.13.0, `typescript` 7.0.2, `pocketbase` 0.28.1 (Server-gebunden) |
| `npx expo export --platform ios --platform android --output-dir <scratch>` | 57 s | Exit 0; Bundles `entry-….hbc` iOS 5,21 MB / Android 5,40 MB; Assets iOS 64 (7,93 MB) / Android 68 (8,86 MB); 38 `.ttf` (W-5); legt `mobile/.expo/dev/logs/export.log` an (gitignored; danach entfernt) |
| Scratchpad: `npm install --package-lock-only --legacy-peer-deps=false` mit Repo-Lock | 2 s | Exit 0, `npm warn ERESOLVE overriding peer dependency`; +8 Pakete (W-7) |
| Scratchpad: dasselbe ohne Lock | 21 s | Exit 0, gleiche Warnung; 83 Pakete zusätzlich, 96 Versionsunterschiede (ohne Lock frische Auflösung — nur als Gegenprobe) |
| Scratchpad: `package.json` ohne `overrides`, Auflösung + `npm audit --package-lock-only` | 12 s | 17 moderate (W-1, W-8); `metro` → 0.84.5, `browserslist` → 4.29.1, `brace-expansion` → 5.0.12, `@xmldom/xmldom` → 0.8.15, `decode-uri-component` → 0.2.2, `uuid` → 7.0.3 |
| Scratchpad: `npm pack expo-template-bare-minimum@sdk-57` | < 1 s | 57.0.27; `Podfile` 16.4, `pbxproj` `IPHONEOS_DEPLOYMENT_TARGET = 16.4`, `gradle.properties` `edgeToEdgeEnabled=true`, `newArchEnabled=true`; SDK-Stufen aus `react-native/gradle/libs.versions.toml` 24/36/36 |
| Scratchpad: Typed-Routes-Deklaration erzeugen + `tsc` | 4 s | `router.d.ts` (10 KB) erzeugt; 0 Fehler, 66 Dateien (W-13) |
| `node -e "require('query-string').parse('?item=%41bc')"` | < 1 s | `TypeError decodeComponent is not a function` (W-1) |
| Repo-Root: `npm ci --no-fund` | 1 s | 37 Pakete, 0 Schwachstellen; Vitest 5.0.0, `engines.node ^22.12.0 || ^24.0.0 || >=26.0.0` erfüllt (Node 22.22.2) |
| `git status --short` (Ende) | — | nur die Berichte in `docs/audit/release-2026-09/` untracked; `mobile/package-lock.json` unverändert; kein `.expo/`, keine `ios/`-Änderung |

## Geprüft und in Ordnung

- **Installation:** `npm ci` in 17 s, reproduzierbar aus dem Lockfile, ohne Peer-Abbruch; einzige Deprecation W-12.
- **Typprüfung:** 0 Fehler, `strict: true`; auch mit generierten Routentypen 0 Fehler.
- **Bundling:** Metro-Export für beide Plattformen fehlerfrei, Hermes-Bytecode wird erzeugt (`hermesEnabled`). Damit ist die JavaScript-Seite des Builds nachgewiesen; die native Seite (Xcode/Gradle) siehe „Unklar".
- **Node/npm-Anforderungen:** Node 22.22.2 ≥ 22.12 (Root `engines`, Vitest 5); `.nvmrc` 22; CI `node-version: 22`. Konsistent (bis auf die npm-Hauptversion der Lockfiles, W-11).
- **`npm audit`:** 0 / 0 / 0 (mobile, mobile prod, root).
- **Exakte Pins:** alle vom SDK 57 exakt vorgegeben (Tabelle oben) — begründet.
- **`pocketbase` 0.22.1:** passt zum Server `ghcr.io/muchobien/pocketbase:0.22.21` (`docker-compose.yml`, `pocketbase/Dockerfile`; Hauptversion 0.22 ↔ 0.22 ✓). Aus dem abgerufenen SDK-Changelog (`pocketbase/js-sdk`, 892 Zeilen): 0.23.0 fügt nur `pb.realtime.onDisconnect` hinzu; die letzten Brüche liegen in 0.22.0 (bereits enthalten). Ein Server-Sprung auf PocketBase 0.23+ bräche also **nicht primär das App-SDK**, sondern die JavaScript-Hooks und Migrationen in `pocketbase/pb_hooks` / `pb_migrations` (neue Hook-API, `_superusers` statt `admins`) — diese Einordnung ist aus Kenntnis der PocketBase-Release-Notes, nicht hier gemessen. Die Pin-Begründung in `TECH.md` bleibt richtig: SDK und Server gemeinsam heben, nach dem Hook-Umbau.
- **`uuid`-Override für `xcode`:** nötig (Advisory) und funktionsfähig (`v4()` geprüft).
- **Schriften offline:** Work Sans wird gebündelt, nicht nachgeladen (Asset-Liste des Exports); `useFonts` mit 2,5-s-Rückfall auf Systemschrift in `_layout.tsx`.
- **SDK-Stufen:** iOS 16.4, Android minSdk 24 / targetSdk 36 / compileSdk 36 — entsprechen `TECH.md` und der Play-Store-Vorgabe (targetSdk 36 ab 31.08.2026); Herkunft in W-6 dokumentiert. Edge-to-Edge ist auf Android aktiv (SDK-57-Vorgabe).
- **Lizenzen der Laufzeitabhängigkeiten:** kein Copyleft (W-14).
- **Arbeitsbaum:** nach allen Befehlen sauber bis auf die Berichte; `mobile/package-lock.json` zu keinem Zeitpunkt verändert; `.expo/` (von `expo export` angelegt, gitignored) entfernt.

## Unklar / nur außerhalb prüfbar

- **Nativer Build** (`pod install`, `xcodebuild`, `gradlew bundleRelease`): kein Xcode, kein Android-SDK im Container. Messstelle sind die CI-Läufe `testflight.yml` / `play-internal.yml` / `release.yml` (siehe Bericht `ci-deploy-release.md`).
- **Inhalt der zehn ausstehenden Expo-Patches** (W-4) und der **Metro-0.84.6-Änderungen** (W-3): Changelogs liegen auf GitHub; der Zugriff war aus dem Container nicht freigegeben (`GitHub access to this repository is not enabled for this session`). Die Empfehlung `expo install --fix` hängt nicht davon ab.
- **EAS-Build-Verhalten bei vorhandenem `ios/`-Ordner** (W-2): aus expo-doctor-Meldung und `@expo/cli`-Quelltext hergeleitet, nicht mit `eas build` ausgeführt.
- **Metro-Interop für W-1** ist aus dem Plugin-Quelltext gelesen und in Node reproduziert; ein Bundle-Test aus dem Scratchpad scheiterte an Metros Projektwurzel-Auflösung. Ein Test im Projekt wäre ein Einzeiler in `mobile/`, den ich nicht angelegt habe.
- **Lizenz/Store** (W-14): juristische Frage, hier nur die Sachlage.
- **Größe des fertigen IPA/AAB:** ohne nativen Build nicht messbar; die hier gemessenen 13–14 MB (Bytecode + Assets) je Plattform sind der JavaScript-Anteil.
