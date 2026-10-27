# Landingpage

Statische Seite für plietsche-plünn.de (`xn--plietsche-plnn-rsb.de`), ohne Bauvorgang.
Ausliefern: `web/index.html` und `mobile/assets/icon.png` ins Verzeichnis der
Seite auf dem Webserver kopieren. Nach jedem neuen App-Symbol prüfen, dass beide
Prüfsummen gleich sind:

```bash
curl -s "https://xn--plietsche-plnn-rsb.de/icon.png?v=$(date +%s)" | shasum -a 256
shasum -a 256 mobile/assets/icon.png
```

Öffnungszeiten stehen hier und in `store.hours_json`; beide Stellen pflegen.
