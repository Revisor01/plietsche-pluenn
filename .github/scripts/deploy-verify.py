#!/usr/bin/env python3
# Prueft nach einem Deploy, ob der neue Stand tatsaechlich in Produktion
# angekommen ist.
#
# Aufruf: deploy-verify.py <basis-url>
# Beispiel: deploy-verify.py https://pb.xn--plietsche-plnn-rsb.de
#
# Warum das noetig ist, und warum /api/health dafuer nicht genuegt:
# Die Instanz lief im August vier Wochen auf einem alten Stand. Sie war in
# dieser Zeit durchgehend „gesund" — /api/health antwortet mit 200, solange
# der Prozess laeuft, und sagt ueber den Stand von Hooks und Migrationen
# nichts aus. Ein im Repo als behoben gefuehrter Sicherheitsfehler stand
# dadurch unbemerkt weiter offen.
#
# Deshalb prueft dieses Skript je Migration ein Schemamerkmal: nicht „ist die
# Migration vermerkt", sondern „ist das, was sie bewirken sollte, wirksam".
# Das faengt auch einen Fehlschlag mitten in einer Migration ab. Gelesen wird
# unangemeldet — ein Superuser-Zugang in einem GitHub-Tresor waere ein
# groesseres Zugestaendnis als der Nutzen rechtfertigt.
#
# DIE FALLE, um die es hier im Kern geht:
# PocketBase antwortet auf eine Regel, die nichts durchlaesst, mit HTTP 200
# und einer leeren Liste — NICHT mit 403. Ein 403 kommt nur bei listRule =
# null (Sammlung fuer niemanden ausser Superuser). Wer nur Statuscodes
# prueft, haelt eine offene Sammlung fuer geschlossen: Eine Sammlung ohne
# jede Leseregel liefert ebenfalls 200, nur eben mit Inhalt. Bei den
# 200er-Pruefungen wird deshalb zusaetzlich totalItems == 0 verlangt.
#
# Reine Standardbibliothek — auf dem Runner ist nichts weiter noetig.
import json
import os
import sys
import time
import urllib.error
import urllib.request

# Wie lange auf den Neustart gewartet wird. Der Portainer-Webhook antwortet
# sofort, der Container braucht danach ein paar Sekunden: Image ziehen,
# starten, Migrationen ausfuehren. Ueber Umgebungsvariablen steuerbar, damit
# die Tests nicht eine Minute lang warten muessen.
VERSUCHE = int(os.environ.get('VERIFY_VERSUCHE', '24'))
ABSTAND = float(os.environ.get('VERIFY_ABSTAND', '5'))
ZEITLIMIT = float(os.environ.get('VERIFY_ZEITLIMIT', '10'))

# Je Zeile: Pfad, erwarteter Status, erwartete Trefferzahl (None = egal),
# welche Migration das belegt.
#
# Die Sollwerte sind am 14.09.2026 unangemeldet gegen die laufende Instanz
# gemessen, nicht geschaetzt.
PRUEFUNGEN = (
    # listRule = null → die Sammlung existiert und ist ueber die API fuer
    # niemanden lesbar. Hier ist 403 die richtige Erwartung, und sie ist
    # zugleich der Beweis, dass die Sammlung ueberhaupt angelegt wurde:
    # Ein unbekannter Name liefert 404, kein 403.
    ('/api/collections/store_secrets/records', 403, None,
     '1782690000_store_secret_collection — Tuergeheimnis liegt in einer eigenen, '
     'fuer niemanden lesbaren Sammlung'),

    # Ab hier die 200er. Der Statuscode allein sagt nichts; entscheidend ist
    # totalItems == 0. Stuende hier eine Zahl groesser null, waere die
    # Sammlung unangemeldet offen.
    ('/api/collections/store/records', 200, 0,
     '1782690000_store_secret_collection — store verlangt eine Anmeldung'),
    ('/api/collections/items/records', 200, 0,
     '1782710000_tighten_read_rules — die Leseregel auf items greift'),
    ('/api/collections/action_counts/records', 200, 0,
     '1782710000_tighten_read_rules — die Besitzpruefung auf action_counts greift'),

    # Zum Schluss: laeuft die Instanz ueberhaupt. Alleine wertlos, zusammen
    # mit den Zeilen darueber die Abgrenzung „erreichbar, aber falsch" gegen
    # „nicht erreichbar".
    ('/api/health', 200, None,
     'die Instanz antwortet'),
)


def abrufen(url):
    """Holt eine Antwort und gibt (status, koerper-text) zurueck.

    Fehlerstatus wirft in urllib eine Ausnahme; hier ist der Status aber die
    eigentliche Information, deshalb wird sie ausgepackt. Bleibt die
    Verbindung ganz aus, kommt (None, grund) — das ist ein Server, der noch
    startet, kein falscher Stand.
    """
    anfrage = urllib.request.Request(url, headers={'Accept': 'application/json'})
    try:
        with urllib.request.urlopen(anfrage, timeout=ZEITLIMIT) as antwort:
            return antwort.status, antwort.read().decode('utf-8', 'replace')
    except urllib.error.HTTPError as fehler:
        return fehler.code, fehler.read().decode('utf-8', 'replace')
    except Exception as fehler:  # URLError, Timeout, abgerissene Verbindung
        return None, str(fehler)


def trefferzahl(koerper):
    """Liest totalItems aus einer Listenantwort. None, wenn es das Feld nicht gibt."""
    try:
        daten = json.loads(koerper)
    except ValueError:
        return None
    if isinstance(daten, dict) and isinstance(daten.get('totalItems'), int):
        return daten['totalItems']
    return None


def eine_runde(basis):
    """Prueft alle Merkmale einmal. Gibt (alles_gut, zeilen, erreichbar) zurueck."""
    zeilen = []
    alles_gut = True
    erreichbar = True

    for pfad, soll_status, soll_treffer, belegt in PRUEFUNGEN:
        status, koerper = abrufen(basis + pfad)

        if status is None:
            erreichbar = False
            alles_gut = False
            zeilen.append(f'  [warte] {pfad}: keine Antwort ({koerper})')
            continue

        if status != soll_status:
            alles_gut = False
            zeilen.append(
                f'  [FEHLT] {pfad}: HTTP {status}, erwartet {soll_status}'
                f'  → {belegt}'
            )
            continue

        if soll_treffer is not None:
            ist = trefferzahl(koerper)
            if ist is None:
                alles_gut = False
                zeilen.append(
                    f'  [FEHLT] {pfad}: HTTP {status}, aber keine Listenantwort '
                    f'mit totalItems  → {belegt}'
                )
                continue
            if ist != soll_treffer:
                # Der wichtigste Fall: Status stimmt, die Sammlung ist aber
                # offen. Genau das uebersieht eine Pruefung auf Statuscodes.
                alles_gut = False
                zeilen.append(
                    f'  [OFFEN] {pfad}: HTTP {status}, aber totalItems={ist} '
                    f'statt {soll_treffer} — die Sammlung gibt unangemeldet '
                    f'Daten heraus  → {belegt}'
                )
                continue
            zeilen.append(f'  [ok]    {pfad}: HTTP {status}, totalItems={ist}')
            continue

        zeilen.append(f'  [ok]    {pfad}: HTTP {status}')

    return alles_gut, zeilen, erreichbar


def main():
    if len(sys.argv) != 2:
        print('Aufruf: deploy-verify.py <basis-url>', file=sys.stderr)
        return 2

    basis = sys.argv[1].rstrip('/')
    if not basis.startswith(('http://', 'https://')):
        # Ohne diese Pruefung stirbt urllib mit einem Stacktrace statt mit
        # einer lesbaren Meldung — im Workflow-Log ist das nicht zu deuten.
        print(f'Basis-URL muss mit http:// oder https:// beginnen: {basis!r}',
              file=sys.stderr)
        return 2

    print(f'Pruefe den ausgelieferten Stand gegen {basis}')

    zeilen = []
    for versuch in range(1, VERSUCHE + 1):
        alles_gut, zeilen, erreichbar = eine_runde(basis)
        if alles_gut:
            print(f'\nRunde {versuch}:')
            for zeile in zeilen:
                print(zeile)
            print(f'\nAlle {len(PRUEFUNGEN)} Merkmale stimmen. '
                  'Der neue Stand ist angekommen.')
            return 0

        if versuch < VERSUCHE:
            grund = 'Server antwortet noch nicht' if not erreichbar \
                else 'noch nicht alle Merkmale da'
            print(f'Runde {versuch}/{VERSUCHE}: {grund}, warte {ABSTAND:g}s')
            time.sleep(ABSTAND)

    print(f'\nNach {VERSUCHE} Runden:')
    for zeile in zeilen:
        print(zeile)
    print('\nDer ausgelieferte Stand stimmt NICHT mit dem Repo ueberein.')
    print('Der Container laeuft moeglicherweise noch auf einem alten Abbild,')
    print('oder eine Migration ist nicht durchgelaufen. Container-Log ansehen.')
    return 1


if __name__ == '__main__':
    sys.exit(main())
