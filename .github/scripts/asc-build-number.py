#!/usr/bin/env python3
# Ermittelt die naechste freie Build-Nummer in App Store Connect.
# Ausgabe: "build=<zahl>" (fuer GITHUB_OUTPUT)
#
# Erwartet in der Umgebung: ASC_KEY_ID, ASC_ISSUER_ID, ASC_APP_ID und den
# passenden Schluessel unter ~/.appstoreconnect/private_keys/.
#
# Die Nummer kommt aus dem Store und nicht aus dem Repo: Sie muss dort
# eindeutig aufsteigen, und ein Zaehler im Git liefe frueher oder spaeter
# auseinander. Beruecksichtigt werden alle Builds, auch abgelaufene.
#
# Reine Standardbibliothek plus openssl — auf dem Runner ist beides da.
import base64
import json
import os
import subprocess
import sys
import time
import urllib.request

KEY_ID = os.environ['ASC_KEY_ID']
ISSUER = os.environ['ASC_ISSUER_ID']
APP_ID = os.environ['ASC_APP_ID']
KEY_PFAD = os.path.expanduser(f'~/.appstoreconnect/private_keys/AuthKey_{KEY_ID}.p8')


def b64url(rohdaten):
    return base64.urlsafe_b64encode(rohdaten).rstrip(b'=').decode()


def roh_signatur(der):
    """DER (zwei INTEGER in einer SEQUENCE) in das r||s der JWS-Signatur."""
    anfang = 2 if der[1] < 0x80 else 3 + (der[1] & 0x7F) - 1
    werte, pos = [], anfang
    for _ in range(2):
        laenge = der[pos + 1]
        werte.append(int.from_bytes(der[pos + 2:pos + 2 + laenge], 'big'))
        pos += 2 + laenge
    return b''.join(w.to_bytes(32, 'big') for w in werte)


def token():
    jetzt = int(time.time())
    kopf = b64url(json.dumps({'alg': 'ES256', 'kid': KEY_ID, 'typ': 'JWT'},
                             separators=(',', ':')).encode())
    inhalt = b64url(json.dumps({'iss': ISSUER, 'iat': jetzt, 'exp': jetzt + 900,
                                'aud': 'appstoreconnect-v1'},
                               separators=(',', ':')).encode())
    basis = f'{kopf}.{inhalt}'
    der = subprocess.run(['openssl', 'dgst', '-sha256', '-sign', KEY_PFAD],
                         input=basis.encode(), capture_output=True, check=True).stdout
    return f'{basis}.{b64url(roh_signatur(der))}'


def main():
    url = (f'https://api.appstoreconnect.apple.com/v1/builds'
           f'?filter%5Bapp%5D={APP_ID}&limit=200&sort=-version')
    anfrage = urllib.request.Request(url, headers={'Authorization': f'Bearer {token()}'})
    with urllib.request.urlopen(anfrage) as antwort:
        daten = json.load(antwort)

    nummern = []
    for build in daten.get('data', []):
        wert = build['attributes'].get('version') or '0'
        if str(wert).isdigit():
            nummern.append(int(wert))

    naechste = (max(nummern) if nummern else 0) + 1
    print(f'build={naechste}')
    print(f'Bisher hoechste Nummer: {max(nummern) if nummern else 0} '
          f'-> naechste: {naechste}', file=sys.stderr)


if __name__ == '__main__':
    main()
