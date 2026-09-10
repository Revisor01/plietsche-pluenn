#!/usr/bin/env python3
# Stellt die Testhinweise aus den Commit-Betreffs seit dem letzten Upload
# zusammen. Aufruf: release-notes.py [testflight|play]
#
# Die Umgebungsvariable VORGABE hat Vorrang — wer beim Start des Workflows
# einen eigenen Text eintraegt, bekommt genau diesen.
#
# Laengengrenzen: Google Play erlaubt hoechstens 500 Zeichen je Sprache und
# scheitert sonst erst beim Abschluss mit einer irrefuehrenden
# Rechte-Fehlermeldung. TestFlight erlaubt 4000.
import os
import re
import subprocess
import sys

ZIEL = sys.argv[1] if len(sys.argv) > 1 else 'testflight'
GRENZE = 480 if ZIEL == 'play' else 3900
# Wie weit zurueck, wenn kein frueherer Stand bekannt ist. Bewusst grosszuegig:
# Lieber ein paar Punkte zu viel als eine leere Liste.
RUECKFALL = '-20'

# Reine Interna interessieren Tester:innen nicht.
INTERN = re.compile(r'^(chore|ci|test|docs|refactor|style|build)(\(.+\))?:')
VORSILBE = re.compile(r'^\w+(\(.+?\))?:\s*')


def commits():
    """Betreffs seit dem zuletzt gebauten Stand, sonst die letzten 20.

    Der Vergleichspunkt kommt aus der Umgebung (SEIT_COMMIT); der Workflow
    ermittelt ihn aus dem vorigen erfolgreichen Lauf. Fehlt er oder kennt das
    Repo den Commit nicht mehr, greift der Rueckfall.
    """
    seit = os.environ.get('SEIT_COMMIT', '').strip()
    bereich = RUECKFALL
    if seit:
        bekannt = subprocess.run(['git', 'cat-file', '-e', f'{seit}^{{commit}}'],
                                 capture_output=True)
        if bekannt.returncode == 0:
            bereich = f'{seit}..HEAD'

    roh = subprocess.run(['git', 'log', '--format=%s', bereich],
                         capture_output=True, text=True).stdout.strip()
    return [z.strip() for z in roh.split('\n') if z.strip()]


def zeilen():
    ergebnis = []
    for betreff in commits():
        if INTERN.match(betreff):
            continue
        text = VORSILBE.sub('', betreff).strip()
        if text and text not in ergebnis:
            ergebnis.append(text[:120])
    return ergebnis


def main():
    vorgabe = os.environ.get('VORGABE', '').strip()
    if vorgabe:
        print(vorgabe[:GRENZE])
        return

    punkte = zeilen()
    if not punkte:
        print('Kleinere Verbesserungen unter der Haube.')
        return

    # So viele Punkte, wie in die Grenze passen — lieber weniger und
    # vollstaendig als abgeschnitten.
    text = ''
    for punkt in punkte[:8]:
        kandidat = f'{text}\n- {punkt}' if text else f'- {punkt}'
        if len(kandidat) > GRENZE:
            break
        text = kandidat
    print(text or punkte[0][:GRENZE])


if __name__ == '__main__':
    main()
