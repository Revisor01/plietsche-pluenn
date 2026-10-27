#!/usr/bin/env python3
# Naechste freie Versionsnummer aus Google Play, weil ein Zaehler im Git auseinanderliefe. Aufruf: play-version.py <service-account.json> <paketname>
import base64
import json
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

SA_JSON, PAKET = sys.argv[1], sys.argv[2]
API = f'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{PAKET}'


def b64url(daten):
    return base64.urlsafe_b64encode(daten).rstrip(b'=')


def oeffne(anfrage, was):
    """urlopen, das einen Fehler lesbar macht.

    Google legt den Grund in den Antwortkoerper; urllib zeigt nur den
    Statuscode, im Protokoll stand sonst nur ein Python-Stapelabzug.
    """
    try:
        return urllib.request.urlopen(anfrage)
    except urllib.error.HTTPError as fehler:
        koerper = fehler.read().decode('utf-8', 'replace')
        print(f'{was}: Google antwortete {fehler.code} {fehler.reason}:', file=sys.stderr)
        print(koerper[:2000], file=sys.stderr)
        raise SystemExit(1)
    except urllib.error.URLError as fehler:
        print(f'{was}: Google Play nicht erreichbar: {fehler.reason}', file=sys.stderr)
        raise SystemExit(1)


def token():
    with open(SA_JSON) as f:
        sa = json.load(f)
    now = int(time.time())
    kopf = b64url(json.dumps({'alg': 'RS256', 'typ': 'JWT'}).encode())
    inhalt = b64url(json.dumps({
        'iss': sa['client_email'],
        'scope': 'https://www.googleapis.com/auth/androidpublisher',
        'aud': sa['token_uri'],
        'iat': now,
        'exp': now + 3600,
    }).encode())
    signatur_basis = kopf + b'.' + inhalt
    with tempfile.NamedTemporaryFile('w', suffix='.pem') as schluessel:
        schluessel.write(sa['private_key'])
        schluessel.flush()
        signatur = subprocess.run(
            ['openssl', 'dgst', '-sha256', '-sign', schluessel.name],
            input=signatur_basis, capture_output=True, check=True).stdout
    jwt = signatur_basis + b'.' + b64url(signatur)
    koerper = urllib.parse.urlencode({
        'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion': jwt.decode(),
    }).encode()
    anfrage = urllib.request.Request(sa['token_uri'], data=koerper, method='POST')
    anfrage.add_header('Content-Type', 'application/x-www-form-urlencoded')
    with oeffne(anfrage, 'Token holen') as antwort:
        return json.loads(antwort.read())['access_token']


def main():
    zugang = token()

    def ruf(methode, pfad, daten=None, streng=True):
        anfrage = urllib.request.Request(f'{API}{pfad}', data=daten, method=methode)
        anfrage.add_header('Authorization', f'Bearer {zugang}')
        anfrage.add_header('Content-Type', 'application/json')
        # streng=False im finally, sonst verdeckt ein SystemExit den eigentlichen Fehler.
        if streng:
            antwort = oeffne(anfrage, f'{methode} {pfad}')
        else:
            antwort = urllib.request.urlopen(anfrage)
        with antwort:
            roh = antwort.read()
            return json.loads(roh) if roh else {}

    bearbeitung = ruf('POST', '/edits', b'')['id']
    try:
        pakete = ruf('GET', f'/edits/{bearbeitung}/bundles').get('bundles', [])
        nummern = [b.get('versionCode', 0) for b in pakete]
        naechste = (max(nummern) if nummern else 0) + 1
        print(f'code={naechste}')
        # Auf stderr, damit die Ausgabe fuer GITHUB_OUTPUT sauber bleibt.
        print(f'Bisher hoechste Nummer: {max(nummern) if nummern else 0} '
              f'-> naechste: {naechste}', file=sys.stderr)
    finally:
        # Die Bearbeitung war nur zum Nachsehen da.
        try:
            ruf('DELETE', f'/edits/{bearbeitung}', streng=False)
        except Exception:
            pass


if __name__ == '__main__':
    main()
