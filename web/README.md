# Landingpage

Die öffentliche Seite unter **plietsche-plünn.de** (Punycode:
`xn--plietsche-plnn-rsb.de`), mit und ohne `www`.

Eine einzelne statische Datei, kein Bauvorgang, keine Abhängigkeiten. Inhalte
stammen aus der Seite der Kirchengemeinde
(`kirche-hennstedt.de/gemeindeleben/plietsche-pluenn/`) und aus dem
`store`-Datensatz im Backend.

## Auslieferung

Die Seite läuft als statische Datei hinter nginx. Neu ausgeliefert wird, indem
`web/index.html` und `mobile/assets/icon.png` in das Verzeichnis der Seite auf
dem Webserver kopiert werden.

Nginx liest die Dateien bei jeder Anfrage; ein Neustart ist nicht nötig.

Das Symbol wird bewusst nicht doppelt im Repo gehalten — es ist dasselbe wie
`mobile/assets/icon.png` und wird von dort kopiert.

**Genau darin liegt die Falle:** Ändert sich das App-Symbol, merkt das hier
niemand: Die Seite liegt ausschließlich auf dem Webserver, kein Bauvorgang, keine
Prüfung. Am 16.09.2026 zeigte die Seite deshalb noch das übernächste alte
Zeichen, zwei Fassungen hinterher. Wer `mobile/assets/icon.png` neu erzeugt,
kopiert es **im selben Zug** hierher und prüft danach:

```bash
curl -s "https://xn--plietsche-plnn-rsb.de/icon.png?v=$(date +%s)" | shasum -a 256
shasum -a 256 mobile/assets/icon.png
```

Beide Prüfsummen müssen gleich sein.

## Was hier gepflegt werden muss

- **Öffnungszeiten** stehen als HTML in der Seite und zusätzlich im
  `store`-Datensatz (`hours_json`), den die App liest. Wer sie ändert, muss an
  beide Stellen — die Seite zieht sie nicht aus dem Backend.
- **„Bald verfügbar"**: Sobald die App in den Stores ist, gehören dort die
  echten Links hin.
