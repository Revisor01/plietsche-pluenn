#!/bin/bash
# Xcode Cloud, nach dem Klonen: Abhaengigkeiten, natives Projekt aus app.json,
# Backend-Adresse, Pods und Pruefung der Signierung. Ohne sie fehlen
# node_modules, Pods und Version.
set -euo pipefail

REPO="${CI_PRIMARY_REPOSITORY_PATH:?Nur fuer Xcode Cloud gedacht.}"
MOBILE="$REPO/mobile"
PBXPROJ="$MOBILE/ios/PlietschePlnn.xcodeproj/project.pbxproj"
cd "$MOBILE"

export HOMEBREW_NO_AUTO_UPDATE=1 HOMEBREW_NO_INSTALL_CLEANUP=1
LINIE=$(tr -d '[:space:]' < .nvmrc)
brew install "node@$LINIE" cocoapods
NODE_PREFIX=$(brew --prefix "node@$LINIE")
export PATH="$NODE_PREFIX/bin:$PATH"
HAUPT=$(node -p 'process.versions.node.split(".")[0]')
[ "$HAUPT" = "$LINIE" ] || { echo "FEHLER: Node $HAUPT statt Linie $LINIE aus .nvmrc."; exit 1; }

# Xcode Cloud vergibt die Build-Nummer. Sie kommt in app.json, aus der prebuild
# sie ins Projekt schreibt; die Nummer dort ist die Untergrenze.
# shellcheck disable=SC2016
node -e '
const fs = require("fs"); const datei = process.argv[1]; const neu = Number(process.env.CI_BUILD_NUMBER);
const app = JSON.parse(fs.readFileSync(datei, "utf8")); const alt = Number(app.expo.ios.buildNumber);
if (!Number.isInteger(neu) || !(neu > alt)) { console.error(`FEHLER: Xcode-Cloud-Build ${process.env.CI_BUILD_NUMBER} liegt nicht ueber buildNumber ${alt}. In App Store Connect unter Xcode Cloud > Settings > Build Number die naechste Nummer hoeher setzen.`); process.exit(1); }
app.expo.ios.buildNumber = String(neu); fs.writeFileSync(datei, JSON.stringify(app, null, 2) + "\n");
console.log(`Version ${app.expo.version}, iOS-Build ${neu}`);' "$MOBILE/app.json"

npm ci --legacy-peer-deps

# Xcode 27 laesst ExpoModulesJSI vor 57.0.5 Warnungen ausgeben, die der innere
# Build als "error:" meldet, und Xcode bricht die Skriptphase ab (expo/expo#49120).
# Faellt das Paket je unter 57.0.5, meldet diese Pruefung es frueh.
# shellcheck disable=SC2016
node -e '
const [xcode, jsi] = process.argv.slice(1);
const haupt = Number((/^Xcode (\d+)/.exec(xcode) || [])[1]);
const [a, b, c] = jsi.split(".").map(Number);
if (!(haupt > 0) || !/^\d+\.\d+\.\d+/.test(jsi)) { console.error(`FEHLER: Versionen nicht erkannt: "${xcode}", expo-modules-jsi "${jsi}".`); process.exit(1); }
const behoben = a > 57 || (a === 57 && (b > 0 || c >= 5));
if (haupt >= 27 && !behoben) { console.error(`FEHLER: ${xcode} bricht den Bau von expo-modules-jsi ${jsi} ab (behoben erst ab 57.0.5). Expo-SDK anheben oder im Xcode-Cloud-Workflow Xcode 26.6 einstellen.`); process.exit(1); }
console.log(`${xcode}, expo-modules-jsi ${jsi}`);' "$(xcodebuild -version | sed -n 1p)" "$(node -p 'require("expo-modules-jsi/package.json").version')"
# Die Adresse wird beim Buendeln fest eingebaut. Sie ist oeffentlich, steht in
# .env.example und ist die Produktion, wie bei der Android-Fassung.
cp .env.example .env

# Ab Expo 57 raeumt prebuild ohne --no-clean ios/ ab und erzeugt es neu.
CI=1 npx expo prebuild --platform ios --no-install --no-clean
/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' ios/PlietschePlnn/Info.plist | grep -qx "$CI_BUILD_NUMBER" \
  || { echo "FEHLER: Info.plist traegt nicht Build $CI_BUILD_NUMBER."; exit 1; }

cd "$MOBILE/ios"
for versuch in 1 2 3; do
  pod install && break
  [ "$versuch" -lt 3 ] || { echo "FEHLER: pod install nach 3 Versuchen fehlgeschlagen."; exit 1; }
  sleep 20
done
grep -q '^export NODE_BINARY=' .xcode.env.local || { echo "FEHLER: .xcode.env.local nennt kein Node."; exit 1; }

# Xcode Cloud signiert selbst; das Projekt signiert automatisch mit dem Team aus
# app.json. Eine feste Signierung braucht es hier nicht.
grep -q 'DEVELOPMENT_TEAM = J459G9CJT5;' "$PBXPROJ" || { echo "FEHLER: DEVELOPMENT_TEAM fehlt in project.pbxproj."; exit 1; }
if grep -q 'CODE_SIGN_STYLE = Manual;' "$PBXPROJ"; then echo "FEHLER: project.pbxproj signiert manuell."; exit 1; fi
echo "Signierung automatisch mit Team J459G9CJT5."
