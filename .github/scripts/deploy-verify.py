#!/usr/bin/env python3
# Prueft nach dem Deploy je Migration ein Schemamerkmal und den Hook-Commit, weil /api/health nur sagt, dass der Prozess laeuft. Aufruf: deploy-verify.py <basis-url>
import json
import os
import sys
import time
import urllib.error
import urllib.request

# Wartezeit auf den Neustart, per Umgebung verkuerzbar fuer die Tests.
VERSUCHE = int(os.environ.get('VERIFY_VERSUCHE', '24'))
ABSTAND = float(os.environ.get('VERIFY_ABSTAND', '5'))
ZEITLIMIT = float(os.environ.get('VERIFY_ZEITLIMIT', '10'))
ERWARTETER_COMMIT = os.environ.get('ERWARTETER_COMMIT', '').strip()
VERSION_PFAD = '/api/pp/version'

# Pfad, Status, Trefferzahl, belegende 0.22-Migration; gemessen am 14.09.2026, unter 0.40 von tests/integration/migrations.test.js bestaetigt.
PRUEFUNGEN = (
    # 403 heisst listRule null und belegt zugleich, dass die Sammlung existiert (sonst 404).
    ('/api/collections/store_secrets/records', 403, None,
     '1782690000_store_secret_collection — Tuergeheimnis liegt in einer eigenen, '
     'fuer niemanden lesbaren Sammlung'),

    # Bei 200 zaehlt totalItems == 0, sonst ist die Sammlung offen.
    ('/api/collections/store/records', 200, 0,
     '1782690000_store_secret_collection — store verlangt eine Anmeldung'),
    ('/api/collections/items/records', 200, 0,
     '1782710000_tighten_read_rules — die Leseregel auf items greift'),
    ('/api/collections/action_counts/records', 200, 0,
     '1782710000_tighten_read_rules — die Besitzpruefung auf action_counts greift'),

    # Superuser sind ab 0.23 eine eigene Sammlung (403), unter 0.22 fehlt sie (404).
    ('/api/collections/_superusers/records', 403, None,
     'PocketBase 0.40 laeuft — die Sammlung _superusers existiert und ist '
     'geschlossen (unter 0.22 gibt es sie nicht)'),

    # Grenzt „erreichbar, aber falsch“ gegen „nicht erreichbar“ ab.
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


def commit_pruefen(basis, soll):
    """Vergleicht den Commit der geladenen Hooks. Gibt (gut, zeile, erreichbar) zurueck."""
    status, koerper = abrufen(basis + VERSION_PFAD)
    if status is None:
        return False, f'  [warte] {VERSION_PFAD}: keine Antwort ({koerper})', False
    if status != 200:
        return False, (f'  [FEHLT] {VERSION_PFAD}: HTTP {status}, erwartet 200'
                       '  → die geladenen Hooks kennen die Route nicht'), True
    try:
        ist = json.loads(koerper).get('commit')
    except (ValueError, AttributeError):
        ist = None
    ist = ist.strip() if isinstance(ist, str) else ''
    if ist != soll:
        return False, (f'  [ALT]   {VERSION_PFAD}: laeuft auf {ist[:7] or "(leer)"}, '
                       f'erwartet {soll[:7]}  → die Hooks sind nicht vom '
                       'ausgelieferten Commit'), True
    return True, f'  [ok]    {VERSION_PFAD}: Commit {ist[:7]}', True


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
                # Status stimmt, die Sammlung ist aber offen.
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

    if ERWARTETER_COMMIT:
        gut, zeile, antwortet = commit_pruefen(basis, ERWARTETER_COMMIT)
        zeilen.append(zeile)
        alles_gut = alles_gut and gut
        erreichbar = erreichbar and antwortet

    return alles_gut, zeilen, erreichbar


def main():
    if len(sys.argv) != 2:
        print('Aufruf: deploy-verify.py <basis-url>', file=sys.stderr)
        return 2

    basis = sys.argv[1].rstrip('/')
    if not basis.startswith(('http://', 'https://')):
        # Sonst stirbt urllib mit unlesbarem Stacktrace.
        print(f'Basis-URL muss mit http:// oder https:// beginnen: {basis!r}',
              file=sys.stderr)
        return 2

    print(f'Pruefe den ausgelieferten Stand gegen {basis}')
    if ERWARTETER_COMMIT:
        print(f'Erwarteter Commit der Hooks: {ERWARTETER_COMMIT}')

    zeilen = []
    for versuch in range(1, VERSUCHE + 1):
        alles_gut, zeilen, erreichbar = eine_runde(basis)
        if alles_gut:
            print(f'\nRunde {versuch}:')
            for zeile in zeilen:
                print(zeile)
            anzahl = len(PRUEFUNGEN) + (1 if ERWARTETER_COMMIT else 0)
            print(f'\nAlle {anzahl} Merkmale stimmen. '
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
