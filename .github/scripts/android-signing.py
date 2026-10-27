#!/usr/bin/env python3
# Haengt die Signierung in das von prebuild erzeugte Gradle-Projekt ein; Aufruf in mobile/android: android-signing.py
import pathlib
import re
import sys

# findProperty, weil property() schon beim Auswerten wirft, wenn ein Wert fehlt.
SIGNATUR_BLOCK = """
    signingConfigs {
        ppRelease {
            storeFile file(project.findProperty('PP_KEYSTORE_PATH') ?: 'nicht-gesetzt.jks')
            storePassword project.findProperty('PP_KEYSTORE_PASSWORD') ?: ''
            keyAlias project.findProperty('PP_KEY_ALIAS') ?: ''
            keyPassword project.findProperty('PP_KEY_PASSWORD') ?: ''
        }
    }
"""


def main():
    pfad = pathlib.Path('app/build.gradle')
    if not pfad.exists():
        print('app/build.gradle nicht gefunden — lief prebuild durch?', file=sys.stderr)
        return 1

    inhalt = pfad.read_text()
    if 'ppRelease' in inhalt:
        print('Signaturkonfiguration steht bereits.')
        return 0

    inhalt = inhalt.replace('android {', 'android {' + SIGNATUR_BLOCK, 1)

    # Sonst signiert Release mit dem Debug-Schluessel, und Google Play lehnt ab.
    inhalt, ersetzt = re.subn(
        r'(buildTypes\s*\{.*?release\s*\{[^}]*?)signingConfig\s+signingConfigs\.\w+',
        r'\1signingConfig signingConfigs.ppRelease',
        inhalt, count=1, flags=re.DOTALL)

    if not ersetzt:
        print('Kein signingConfig im Release-Block gefunden — bitte pruefen, '
              'wie expo prebuild das Projekt inzwischen aufbaut.', file=sys.stderr)
        return 1

    pfad.write_text(inhalt)
    print('Signaturkonfiguration eingehaengt.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
