# Landingpage

Die öffentliche Seite unter **plietsche-plünn.de** (Punycode:
`xn--plietsche-plnn-rsb.de`), mit und ohne `www`.

Eine einzelne statische Datei, kein Bauvorgang, keine Abhängigkeiten. Inhalte
stammen aus der Seite der Kirchengemeinde
(`kirche-hennstedt.de/gemeindeleben/plietsche-pluenn/`) und aus dem
`store`-Datensatz im Backend.

## Auslieferung

Stack `plietsche-web` (Portainer, nginx), Dateien liegen auf dem Server unter
`/opt/stacks/plietsche-web/site/`. Traefik übernimmt die Domains.

Ändern und neu ausliefern:

```bash
scp web/index.html root@server.godsapp.de:/opt/stacks/plietsche-web/site/
scp mobile/assets/icon.png root@server.godsapp.de:/opt/stacks/plietsche-web/site/
```

Nginx liest die Dateien bei jeder Anfrage; ein Neustart ist nicht nötig.

Das Symbol wird bewusst nicht doppelt im Repo gehalten — es ist dasselbe wie
`mobile/assets/icon.png` und wird von dort kopiert.

## Was hier gepflegt werden muss

- **Öffnungszeiten** stehen als HTML in der Seite und zusätzlich im
  `store`-Datensatz (`hours_json`), den die App liest. Wer sie ändert, muss an
  beide Stellen — die Seite zieht sie nicht aus dem Backend.
- **„Bald verfügbar"**: Sobald die App in den Stores ist, gehören dort die
  echten Links hin.

## Vorgeschichte

Bis zum 14.09.2026 bediente der Container `plietsche-backend` diese Domains —
das alte Express-Backend, das im Mai 2026 durch PocketBase ersetzt wurde. Es
lief seither ohne Aufgabe weiter: Die zugehörige Postgres-Datenbank war leer,
ein Push-Job scheiterte jeden Freitag an `relation "stores" does not exist`,
und die Domain lieferte im Browser `Cannot GET /`.

`plietsche-pluenn.godsapp.de` wurde dabei nicht übernommen: Für diese Adresse
gab es nie ein eigenes Zertifikat (ausgeliefert wurde das von
`server.godsapp.de`), sie war nur eine interne Ausweichadresse.
