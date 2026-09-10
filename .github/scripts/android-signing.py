#!/usr/bin/env python3
# Haengt die Signaturkonfiguration in das von expo prebuild erzeugte
# Gradle-Projekt ein. Aufruf im Verzeichnis mobile/android:
#   android-signing.py
#
# Warum hier und nicht im Repo: android/ entsteht bei jedem Lauf neu, und die
# Zugangsdaten zum Keystore sollen nirgends im Quelltext stehen. Sie reicht der
# Workflow beim Aufruf als -P-Parameter herein.
import pathlib
import re
import sys

# findProperty statt property: property() wirft, sobald ein Wert fehlt — und
# zwar schon beim Auswerten der Datei, also auch bei Aufgaben, die mit dem
# Signieren nichts zu tun haben. Die Werte kommen ueber -P vom Workflow.
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

    # Der Release-Block signiert sonst weiter mit dem Debug-Schluessel — damit
    # liesse sich das Paket bauen, aber Google Play wuerde es ablehnen.
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
