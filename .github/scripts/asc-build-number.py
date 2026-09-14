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
import urllib.error
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


def hole(url):
    """Ruft die API und macht einen Fehler lesbar.

    Ohne Behandlung landete ein HTTP-Fehler als Python-Stapelabzug im
    Protokoll, und der GRUND steht bei Apple im Antwortkoerper, den urllib
    nicht zeigt. Der Job bricht so oder so ab, bevor etwas gebaut wird — aber
    die Diagnose soll nicht am Protokoll scheitern.
    """
    anfrage = urllib.request.Request(url, headers={'Authorization': f'Bearer {token()}'})
    try:
        with urllib.request.urlopen(anfrage) as antwort:
            return json.load(antwort)
    except urllib.error.HTTPError as fehler:
        koerper = fehler.read().decode('utf-8', 'replace')
        print(f'App Store Connect antwortete {fehler.code} {fehler.reason}:',
              file=sys.stderr)
        print(koerper[:2000], file=sys.stderr)
        raise SystemExit(1)
    except urllib.error.URLError as fehler:
        print(f'App Store Connect nicht erreichbar: {fehler.reason}', file=sys.stderr)
        raise SystemExit(1)


def main():
    url = (f'https://api.appstoreconnect.apple.com/v1/builds'
           f'?filter%5Bapp%5D={APP_ID}&limit=200&sort=-version')
    daten = hole(url)

    # Nicht-numerische Nummern (etwa '1.0.0.23') fielen bisher stillschweigend
    # durch isdigit() und zaehlten beim Maximum nicht mit — die errechnete
    # naechste Nummer waere dann womoeglich schon vergeben, und der Upload
    # schluege erst bei Apple fehl, nach einem vollstaendigen macOS-Build.
    # Vergeben werden die Nummern zwar von genau diesem Skript, aber wenn je
    # eine andere Form auftaucht, soll das auffallen statt still zu wirken.
    nummern, fremd = [], []
    for build in daten.get('data', []):
        wert = str(build['attributes'].get('version') or '0')
        if wert.isdigit():
            nummern.append(int(wert))
        else:
            fremd.append(wert)

    if fremd:
        print(f'Abbruch: {len(fremd)} Build-Nummer(n) in unerwarteter Form, '
              f'z. B. {", ".join(sorted(set(fremd))[:5])}. Eine daraus '
              f'errechnete Nummer koennte schon vergeben sein.', file=sys.stderr)
        raise SystemExit(1)

    # limit=200 ohne Paginierung: Apple sortiert `version` als Zeichenkette,
    # womit ab dem 201. Build die hoechste Nummer aus dem Fenster fallen kann.
    # Bis dahin ist Luft; damit es dann auffaellt, steht hier eine Warnung.
    if len(daten.get('data', [])) >= 200:
        print('Warnung: 200 Builds zurueckgeliefert — die Abfrage ist am '
              'Limit. Ab hier braucht sie Paginierung, sonst kann die '
              'hoechste Nummer fehlen.', file=sys.stderr)

    naechste = (max(nummern) if nummern else 0) + 1
    print(f'build={naechste}')
    print(f'Bisher hoechste Nummer: {max(nummern) if nummern else 0} '
          f'-> naechste: {naechste}', file=sys.stderr)


if __name__ == '__main__':
    main()
