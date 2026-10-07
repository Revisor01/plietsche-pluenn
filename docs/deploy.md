# Wie das Backend ausgeliefert wird

Stand: 26.09.2026 (Upgrade auf PocketBase 0.40, siehe unten).

Das PocketBase-Backend läuft als Container auf `server.godsapp.de`, Stack
`plietsche-pb` in Portainer. Ausgeliefert wird automatisch bei jedem Push auf
`main`, der `pocketbase/` betrifft.

## Warum es diesen Weg gibt

Vorher wurden `pb_hooks/` und `pb_migrations/` von Hand per `scp` in die
Bind-Mounts des Servers kopiert. Im August lief die Instanz dadurch **vier
Wochen auf einem altem Stand**: Ein im Repo als behoben geführter kritischer
Sicherheitsfehler stand in Produktion weiter offen, und niemand hat es
bemerkt — `/api/health` meldete die ganze Zeit „gesund".

Daraus folgen die beiden Eigenschaften, auf die es hier ankommt:

1. **Die Dateien stecken im Abbild, nicht in einem Verzeichnis auf dem Host.**
   Der Stand des Containers ist damit per Konstruktion der Stand eines
   Commits. Es gibt keinen Schritt mehr, den jemand vergessen kann.
2. **Nach dem Deploy wird geprüft, ob der neue Stand wirklich anliegt** — und
   zwar nicht, ob der Server läuft, sondern ob jede Migration wirksam ist.

## Der Ablauf

```
Push auf main (pocketbase/**)
   → Tests laufen (npm test)            rot ⇒ Schluss, kein Deploy
   → Vollständigkeitsprüfung             fehlt etwas ⇒ Schluss
   → Abbild bauen, zu ghcr.io schieben
   → Portainer-Webhook (POST)            Server zieht selbst
   → Verify gegen die laufende Instanz   stimmt nicht ⇒ Lauf rot
```

Kein SSH. In der CI liegt kein Zugang zu einer Maschine, auf der auch Authentik
und Nextcloud laufen — der Server holt sich das Abbild selbst ab, angestoßen
durch einen Webhook, der nichts anderes kann als diesen einen Stack neu
ausrollen.

### Die beteiligten Dateien

| Datei | Wofür |
|---|---|
| `pocketbase/Dockerfile` | Setzt auf `ghcr.io/muchobien/pocketbase:0.40.4` auf und kopiert `pb_hooks/` und `pb_migrations/` hinein. Die Version des Basis-Abbilds bleibt gepinnt. `pb_migrations_022/` kommt nicht hinein. |
| `docker-compose.portainer.yml` | Der Stack, der in Produktion läuft. Eigenes Abbild, **nur `pb_data` gemountet**. |
| `docker-compose.yml` | Lokale und dokumentarische Fassung: fremdes Abbild, Hooks als Bind-Mount. Läuft in Produktion **nicht**. |
| `.github/workflows/deploy.yml` | Der Ablauf oben. |
| `.github/scripts/deploy-verify.py` | Die Nachher-Prüfung. |
| `tests/deploy-verify.test.js` | Deren Tests. |
| `tests/integration/` | Tests gegen das echte PocketBase-Binary in der Version des Abbilds (`npm run test:integration`). |

### Das Test-Gate

Die Backend-Tests laufen als eigener Job **in derselben Workflow-Datei**, und
der Deploy-Job hängt per `needs` daran — ohne `always()`. Rote Tests, kein
Deploy. Zum Gate gehören zwei Läufe: `npm test` (die Fachlogik im Harness)
und `npm run test:integration` (Migrationen, Hooks, Leseregeln und die
Antwortformen der eigenen Routen gegen das echte Binary, 0.40.4). Der zweite
fängt, was der Harness nicht sehen kann — etwa eine Migration, die unter der
gepinnten PocketBase-Version nicht durchläuft und die Instanz nicht mehr
hochkommen lässt.

Der naheliegende Weg über `workflow_run` an `tests.yml` wurde bewusst nicht
genommen: Er startet einen zweiten, entkoppelten Lauf, der in der Oberfläche
nicht am Push hängt, und er läuft gegen den Stand des Standard-Branch statt
gegen den auslösenden Commit. Beides ist genau die Sorte Feinheit, die still
das Falsche ausliefert. Dass die Backend-Tests dadurch zweimal laufen, ist der
Preis; sie brauchen unter einer Minute.

### Die Vollständigkeitsprüfung

Vor dem Push ins Register wird geprüft, ob alle sechs Hook-Dateien vorhanden
und nicht leer sind, ob der Sammlungs-Snapshot
(`pb_migrations/1790500000_collections_snapshot.js`) da ist und ob mindestens
drei Migrationen im Build-Kontext liegen. (Bis zum Upgrade auf 0.40 waren es
mindestens 19 Einzelmigrationen; die liegen jetzt in `pb_migrations_022/`.)
Das ist der Gedanke der Hennstedt-Seite („mindestens 50 Seiten gebaut, sonst
`exit 1`"): Ein unvollständiger Build fällt sonst nicht auf. Fehlt eine
Hook-Datei, startet PocketBase trotzdem und meldet sich gesund — es rechnet nur
niemand mehr Punkte aus.

Die Migrationen werden als **Anzahl** geprüft und nicht einzeln aufgezählt.
Eine Liste müsste bei jeder neuen Migration nachgezogen werden und würde
vergessen; die Untergrenze wächst nur, wenn jemand sie bewusst anhebt.

### Die Nachher-Prüfung

`deploy-verify.py` ruft unangemeldet sechs Endpunkte ab (mit `ERWARTETER_COMMIT` sieben) und prüft je Migration
ein Schemamerkmal — nicht „ist die Migration vermerkt", sondern „ist das, was
sie bewirken sollte, wirksam". Das fängt auch einen Fehlschlag mitten in einer
Migration ab.

| Prüfung | Erwartet | Belegt |
|---|---|---|
| `GET /api/collections/store_secrets/records` | 403 | Das Türgeheimnis liegt in einer eigenen, für niemanden lesbaren Sammlung |
| `GET /api/collections/store/records` | 200, `totalItems: 0` | `store` verlangt eine Anmeldung |
| `GET /api/collections/items/records` | 200, `totalItems: 0` | Die Leseregel auf `items` greift |
| `GET /api/collections/action_counts/records` | 200, `totalItems: 0` | Die Besitzprüfung greift |
| `GET /api/collections/_superusers/records` | 403 | PocketBase 0.40 läuft. Unter 0.22 gibt es die Sammlung nicht (404) — ohne diese Zeile wäre ein Deploy, das noch auf dem alten Abbild steht, fünfmal grün |
| `GET /api/health` | 200 | Die Instanz antwortet |
| `GET /api/pp/version` | 200, `commit` = ausgelieferter Commit | Die geladenen Hooks stammen aus diesem Commit |

**Die Falle, um die es dabei geht:** PocketBase antwortet auf eine Regel, die
nichts durchlässt, mit **HTTP 200 und einer leeren Liste** — nicht mit 403. Ein
403 kommt nur bei `listRule: null`. Wer nur Statuscodes prüft, hält eine offene
Sammlung für geschlossen: Eine Sammlung ganz ohne Leseregel liefert ebenfalls
200, nur mit Inhalt. Bei den 200ern wird deshalb zusätzlich `totalItems == 0`
verlangt.

**Der Commit der Hooks.** Die sechs Schemamerkmale sehen eine Änderung, die
nur `pb_hooks/` betrifft, nicht: Läuft noch das alte Abbild, stimmt das Schema
trotzdem. Das Dockerfile schreibt deshalb beim Bauen den Commit nach
`/pb_hooks/lib/build.js`, `GET /api/pp/version` liefert ihn aus, und der Deploy
übergibt dem Skript den erwarteten Wert als `ERWARTETER_COMMIT`. Weil die
Datei in `/pb_hooks` liegt und nicht in einer Umgebungsvariablen, fiele auch
ein Bind-Mount auf, der die Hooks mit einem alten Stand überdeckt. Von Hand
ohne die Variable aufgerufen, prüft das Skript nur die Schemamerkmale.

Das Skript wartet mit Wiederholungen auf den Neustart (24 Runden im Abstand von
fünf Sekunden) — der Webhook antwortet sofort, der Container braucht danach
Sekunden für Ziehen, Starten und Migrationen.

## Einmalige Umstellung — das muss von Hand passieren

**Das ist der Handgriff, ohne den die ganze Automatik wirkungslos bleibt.**

Der bisherige Stack mountet drei Verzeichnisse vom Host:

```yaml
volumes:
  - ./pb_data:/pb_data
  - ./pb_hooks:/pb_hooks          # ← muss weg
  - ./pb_migrations:/pb_migrations # ← muss weg
```

Die beiden unteren Bind-Mounts **überdecken die Dateien im Abbild**. Bleiben
sie stehen, zieht der Server zwar brav das neue Abbild, startet den Container
neu — und läuft weiter auf dem Stand, der in
`/opt/stacks/plietsche-pb/pb_hooks/` liegt. Der Verify würde das melden, aber
erst nach jedem Deploy aufs Neue.

> **Eingerichtet und in Betrieb seit 14.09.2026.** Die Schritte unten sind
> ausgeführt; sie stehen hier als Beschreibung des Aufbaus und als Anleitung,
> falls der Stack einmal neu aufgesetzt werden muss.
>
> Belegt durch den ersten vollständigen Lauf: Tests grün, Abbild gebaut und
> nach GHCR geschoben, Webhook ausgelöst, Container um 19:55 neu erstellt
> (vorher 19:51), Verify nach fünf Wartrunden mit allen fünf Merkmalen grün.
> Der Datenbestand blieb unverändert; die App liefert angemeldet weiterhin
> Ladeninfos, Schaufenster (8), Laden (14), Punkte und Abzeichen.
>
> Abweichungen von der ursprünglichen Planung:
> - Das GHCR-Paket ist **öffentlich**, weil das Repository öffentlich ist —
>   eine Registry-Anmeldung in Portainer erübrigt sich damit.
> - Der Webhook hängt am **Stack** (Feld `Webhook`), nicht am Container.
>   Ein Container-Webhook (`webhookType: 1`) ist für Docker Swarm gedacht und
>   scheitert hier mit „This node is not a swarm manager".
> - `/opt/stacks/plietsche-pb/pb_hooks/` und `.../pb_migrations/` sind
>   entfernt (gesichert unter `/root/backups/plietsche-pb/`). Im
>   Stack-Verzeichnis liegt nur noch `pb_data`.

Schritt für Schritt:

1. **Paket im Register sichtbar machen.** Das Repo ist privat, das Abbild
   landet unter `ghcr.io/revisor01/plietsche-pluenn/pocketbase`. Der Server
   muss es ziehen dürfen — entweder das Paket auf öffentlich stellen (es
   enthält nur Hooks und Migrationen, keine Geheimnisse) oder in Portainer
   eine Registry-Anmeldung für `ghcr.io` mit einem Lesetoken hinterlegen.
2. **Webhook in Portainer anlegen:** Stack `plietsche-pb` → Reiter *Webhooks* →
   Webhook erzeugen. Die URL als GitHub-Secret `PORTAINER_WEBHOOK_URL`
   hinterlegen.
3. **Stack-Inhalt ersetzen** durch `docker-compose.portainer.yml` aus diesem
   Repo. Dabei verschwinden die beiden Bind-Mounts. `PB_ENCRYPTION_KEY` und
   `TZ` bleiben, wie sie sind.

   > **Der Pfad zu `pb_data` muss absolut bleiben.** Portainer führt den Stack
   > nicht in `/opt/stacks/plietsche-pb` aus, sondern in einem eigenen
   > Arbeitsverzeichnis (gemessen: `/data/compose/264/v2`). Ein relatives
   > `./pb_data` zeigt dort auf ein leeres Verzeichnis: PocketBase legt eine
   > neue, leere Datenbank an, und der gesamte Bestand — Konten, Punkte,
   > Abzeichen — ist nicht mehr eingebunden. In der Datei steht deshalb
   > `/opt/stacks/plietsche-pb/pb_data:/pb_data`. Beim Einfügen in Portainer
   > nicht auf einen relativen Pfad „vereinfachen".
   >
   > Gegenprobe nach dem Ausrollen, bevor irgendetwas gelöscht wird:
   > ```bash
   > docker inspect plietsche-pocketbase \
   >   --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{println}}{{end}}'
   > ```
   > Dort muss `/opt/stacks/plietsche-pb/pb_data` stehen, und die App muss
   > angemeldet weiterhin Punkte und Abzeichen zeigen.
4. **Ein Mal ausrollen** und den Verify von Hand laufen lassen:
   ```bash
   python3 .github/scripts/deploy-verify.py https://pb.xn--plietsche-plnn-rsb.de
   ```
5. Die Verzeichnisse `/opt/stacks/plietsche-pb/pb_hooks/` und
   `.../pb_migrations/` erst löschen, wenn ein automatischer Lauf sauber
   durchgelaufen ist. Danach sind sie totes Gewicht — und solange sie
   dastehen, ist die Versuchung groß, wieder von Hand hineinzukopieren.

`pb_data/` bleibt unangetastet. Dort liegt die Datenbank.

## Geheimnisse

| Name | Wo | Wofür |
|---|---|---|
| `PORTAINER_WEBHOOK_URL` | GitHub-Secret | Der Webhook, der den Stack neu ausrollt. Fehlt er, bricht der Lauf ab. |
| `GITHUB_TOKEN` | von GitHub gestellt | Anmeldung bei ghcr.io. Nichts einzurichten, `permissions: packages: write` genügt. |
| `PB_ENCRYPTION_KEY` | Portainer-Stack-ENV | Wie bisher. Nicht im Repo, nicht in der CI. |

Mehr nicht. Kein SSH-Schlüssel, kein Portainer-API-Token, kein
Superuser-Zugang — der Verify liest ausschließlich unangemeldet.

## Mailversand

Die App verschickt E-Mails, wenn jemand sein Passwort zurücksetzt, seine
Adresse ändert oder sie bestätigt. Der Versand hängt **nicht** am Repo: Er
steht in den Einstellungen der laufenden PocketBase-Instanz und wird bei einer
Neuinstallation nicht mitgeliefert.

| | |
|---|---|
| Postfach | `noreply@plietsche-plünn.de` (Mailbox bei KeyHelp auf der App-Domain) |
| SMTP | `server.godsapp.de:587`, STARTTLS, `AUTH PLAIN` |
| Zugangsdaten | `PLIETSCHE_MAIL_USER` / `PLIETSCHE_MAIL_PASS` in `~/.claude/secrets.env` |
| Absendername | Plietsche Plünn |

Die drei Vorlagen (Passwort zurücksetzen, Adresse bestätigen, Adresswechsel
bestätigen) sind auf Deutsch hinterlegt — PocketBase liefert sie ab Werk auf
Englisch aus. Die Quelle ist `pocketbase/mail-vorlagen.py`.

Seit PocketBase 0.40 hängen die Vorlagen an der Sammlung `users`, nicht mehr
unter `meta` in den Einstellungen. Einspielen:

```bash
python3 pocketbase/mail-vorlagen.py > /tmp/vorlagen.json
curl -X PATCH "https://pb.xn--plietsche-plnn-rsb.de/api/collections/users" \
     -H "Authorization: <Superuser-Token>" \
     -H "Content-Type: application/json" --data @/tmp/vorlagen.json
```

Der alte Weg (`PATCH /api/settings` mit `meta.verificationTemplate`) antwortet
unter 0.40 mit 200 und **ändert nichts** — gemessen am 26.09.2026.

Beim Upgrade übernimmt PocketBase die Vorlagen selbst: Es setzt den
bisherigen `actionUrl` an die Stelle von `{ACTION_URL}`. Das Ergebnis ist
Byte für Byte das, was das Skript heute erzeugt (gemessen), die Links haben
weiter die Form `<appUrl>/_/#/auth/confirm-<fall>/<token>`, und
`web/konto.html` versteht sie unverändert.

Die englische Mail „Login from a new location", die 0.40 bei jeder Anmeldung
von einem neuen Gerät verschickt, schaltet `1790500200_settings.js` ab.

**Nach einer Neuinstallation der Instanz zu prüfen:** SMTP eingeschaltet,
Absender gesetzt, Vorlagen auf Deutsch. Sonst verspricht die App eine Mail,
die nie ankommt — genau dieser Zustand bestand bis zum 16.09.2026
unbemerkt.

## Im Störfall von Hand ausliefern

**Erste Wahl: den Workflow von Hand starten.** Actions → *Deploy Backend* →
*Run workflow*. Derselbe Weg, dieselbe Prüfung.

**Wenn GitHub nicht kann** — Abbild lokal bauen und schieben:

```bash
docker build -t ghcr.io/revisor01/plietsche-pluenn/pocketbase:latest ./pocketbase
docker push ghcr.io/revisor01/plietsche-pluenn/pocketbase:latest
curl -f -X POST "<PORTAINER_WEBHOOK_URL>"
python3 .github/scripts/deploy-verify.py https://pb.xn--plietsche-plnn-rsb.de
```

Der letzte Schritt gehört dazu. Ohne ihn ist man wieder da, wo das Problem
angefangen hat.

**Zurück auf einen älteren Stand:** Jeder Lauf schiebt neben `:latest` auch
einen Tag mit dem Commit-SHA. In Portainer das Abbild im Stack auf
`ghcr.io/revisor01/plietsche-pluenn/pocketbase:<sha>` setzen und ausrollen.

> **Nicht über die Grenze 0.22 → 0.40 hinweg.** Ein Abbild von vor dem
> Upgrade startet auf der gehobenen Datenbank zwar und meldet sich gesund,
> aber niemand kann sich mehr anmelden. Zurück geht es dort nur über eine
> Sicherung — siehe „Upgrade auf 0.40".

**Was es bewusst nicht gibt: einen automatischen Rückwärtsgang.** Migrationen
sind nicht folgenlos umkehrbar. Schlägt der Verify fehl, bleibt der Stand
stehen und der Lauf ist rot — ein Container, der steht, ist besser als ein
Schema, das jemand halb zurückgedreht hat.

## Upgrade auf 0.40

PocketBase 0.22.21 → 0.40.4. Gemessen am 26.09.2026 mit beiden Binarys auf
einer Kopie, die wie Produktion aufgebaut war: alle 20 alten Migrationen,
verschlüsselte Einstellungen, deutsche Mail-Vorlagen, Anmeldedauer 30 Tage,
Konten, Teile, ein Check-in. **Gegen die Produktion selbst ist nichts davon
gemessen.**

### Was sich im Repo ändert

- Die 20 alten Migrationen liegen in `pocketbase/pb_migrations_022/` (mit
  README, warum sie bleiben). Sie laufen unter 0.40 nicht mehr.
- `pb_migrations/` enthält drei Dateien:
  - `1790500000_collections_snapshot.js` — das ganze Schema als
    Sammlungs-Snapshot, wie es die offizielle Upgrade-Anleitung vorsieht.
    **Er schreibt vor dem Import die IDs auf den Bestand um.** Die alten
    Migrationen haben Sammlungen und Felder mit zufälligen IDs angelegt;
    Produktion hat andere IDs als der Snapshot. Ohne das Umschreiben bricht
    der Import ab — gemessen: `failed to save collection "items": UNIQUE
    constraint failed: _collections.name`, der Server kommt nicht hoch.
    Außerdem enthält er nur Schema (Regeln, Felder, Indizes, Anmeldeart),
    keine Einstellungen: Mail-Vorlagen und Token-Laufzeiten der Produktion
    bleiben unangetastet.
  - `1790500100_seed.js` — Laden, Türgeheimnis, Abzeichen für eine frische
    Installation. Greift je Sammlung nur, wenn sie leer ist.
  - `1790500200_settings.js` — schaltet die Mail „Login from a new location"
    ab; setzt auf einer frischen Installation den Bestätigungslink auf eine
    Woche (die Mail verspricht das) und die Anmeldung auf 30 Tage wie in
    Produktion. Beides nur, wenn noch die 0.40-Vorgabe dasteht.
- `pocketbase/Dockerfile`: `ghcr.io/muchobien/pocketbase:0.40.4`. Das Abbild
  hat einen neuen Einstiegspunkt (`entrypoint.sh`); mit unseren Argumenten
  ergibt sich derselbe Aufruf wie bisher (`serve --dir=/pb_data
  --hooksDir=/pb_hooks`, Migrationen aus `/pb_migrations`). **Der Stack in
  Portainer muss nicht angepasst werden.**
- `deploy-verify.py` prüft zusätzlich `/api/collections/_superusers/records`
  auf 403 — das Merkmal, dass wirklich 0.40 läuft.

### Messergebnisse

| Fall | Ergebnis |
|---|---|
| Frische Installation (leeres `pb_data`) | Alle drei Migrationen laufen, 13 Sammlungen, Laden und Türgeheimnis (32 Zeichen, zufällig) und vier Abzeichen angelegt. Gesund nach 0,3 bis 2,5 s. Schema feldweise wie bei der gehobenen Kopie; Unterschiede nur in Einstellungen (Laufzeit von Datei-Token, OAuth2-Feldzuordnung, OAuth2 ist aus). |
| Kopie der 0.22-Datenbank, **ein** Start mit dem neuen Abbild (wie in Produktion) | System-Upgrade und unsere drei Migrationen in einem Start, gesund nach 0,1 bis 2,9 s (fünf Läufe). Schema feldweise gegen den reinen Upgrade-Stand: **1 Abweichung** — `users.authAlert.enabled` true → false, gewollt. Sammlungs- und Feld-IDs: **0 Abweichungen**. Mail-Vorlagen, Anmeldedauer (30 Tage), Datensätze je Sammlung, Türgeheimnis: unverändert. |
| Dieselbe Kopie zweistufig (erst ohne Migrationen, dann mit) | Identisch mit dem einstufigen Fall. |
| Snapshot ein zweites Mal auf dieselbe Datenbank | 0 Abweichungen — er ist idempotent. |
| Snapshot **ohne** ID-Umschreibung auf der Kopie | Abbruch, Server startet nicht (siehe oben). |
| 0.22 auf der gehobenen Datenbank | Startet, `/api/health` 200 — aber Einstellungen weg (`no such column: key`), Anmeldung schlägt fehl („Failed to authenticate"). |
| Rückweg per Sicherung | `pb_data` leeren, Sicherung auspacken, 0.22 starten: Anmeldung und Punktestand wieder da. |

Die gehobene Datenbank verlangt denselben `PB_ENCRYPTION_KEY` wie bisher. Ohne
ihn bricht schon das System-Upgrade ab (`failed to fetch old settings:
invalid settings db data or missing encryption key`), und der Server startet
nicht.

### Ablauf für die Produktion

1. **Sicherung über die API, vorher.** Noch unter 0.22:
   ```bash
   TOKEN=$(curl -s -X POST "$PB/api/admins/auth-with-password" \
     -H 'Content-Type: application/json' \
     -d '{"identity":"<admin>","password":"<passwort>"}' | jq -r .token)
   curl -f -X POST "$PB/api/backups" -H "Authorization: $TOKEN" \
     -H 'Content-Type: application/json' -d '{"name":"vor_040.zip"}'
   ```
   Die Datei liegt danach in `/opt/stacks/plietsche-pb/pb_data/backups/`.
   Zusätzlich vom Server wegkopieren — sie liegt sonst im selben Verzeichnis,
   das das Upgrade verändert.
2. **Schema der Produktion gegen den Snapshot vergleichen**, bevor
   ausgerollt wird: `GET /api/collections` (Superuser) exportieren und
   feldweise gegen `1790500000_collections_snapshot.js` halten. Der Snapshot
   stammt aus einer Datenbank, die mit den Migrationen des Repos aufgebaut
   wurde. Hat jemand in Produktion am Schema etwas im Adminbereich geändert,
   das nicht in einer Migration steht, setzt der Import es auf den Stand des
   Repos zurück (Regeln, Feldoptionen). Zusätzliche Felder und Sammlungen
   bleiben erhalten — gelöscht wird nichts.
3. **Ausrollen wie immer** (Push auf `main` bzw. Workflow von Hand). Beim
   ersten Start mit dem neuen Abbild passiert in einem Durchgang:
   PocketBase hebt die Datenbank auf 0.40 (System-Migrationen `…_v0.23_migrate*`
   und folgende; die Admins werden zu `_superusers`, die Einstellungen
   wandern zum Teil in die Sammlung `users`), danach laufen unsere drei
   Migrationen. Die 20 alten stehen weiter in `_migrations`; das stört nicht.
4. **Verify** läuft automatisch; `_superusers` → 403 belegt 0.40.
5. **Von Hand nachsehen** (Superuser, Adminbereich unter `/_/`):
   Anmeldung mit dem bisherigen Admin-Konto (es ist jetzt ein Superuser),
   SMTP an, Vorlagen auf Deutsch, `users` → „Auth alert" aus.
   In der App: anmelden, Punkte und Abzeichen sichtbar, ein Scan.

**Bestehende Anmeldungen in der App.** 0.40 weist Token aus 0.22 ab: Ein
vor dem Upgrade ausgestellter Token bekommt danach 401 (gemessen). Grund ist
allein der Typ im Token (`authRecord` statt `auth`) — der Signaturschlüssel
(tokenKey des Kontos + Anmeldegeheimnis) wandert beim Upgrade unverändert
mit, **sofern `PB_ENCRYPTION_KEY` gesetzt ist**; nur dann kann das Upgrade die
alten Einstellungen lesen (nachgerechnet: HMAC mit dem übernommenen
Geheimnis ergibt genau die Signatur des alten Tokens). Eine Middleware
(`pb_hooks/compat.pb.js`) hat die alten Token für den Übergang angenommen.
**Entfernt am 07.10.2026**, noch am Tag des Upgrades: Produktion hatte nur
Testkonten, eine Übergangszeit war nicht nötig. Seitdem prüft
`tests/integration/alte-token.test.js` gegen das echte Binary, dass ein
alter Token nichts mehr öffnet und eine frische Anmeldung schon.

> **Ausgeführt am 07.10.2026** (Commit `829d4bc`, ein Mittwoch, Laden zu).
> Vorher: Sicherung `vor_040_20261007.zip` über die API, zusätzlich lokal
> abgelegt; Schema der Produktion feldweise gegen den Snapshot verglichen —
> einzige Abweichung die drei `users`-Indizes, die 0.40 ausdrücklich anlegt.
> Nachher gemessen: `/api/pp/version` meldet `829d4bc`, `_superusers` 403,
> Superuser-Anmeldung mit dem bisherigen Admin-Konto, SMTP an, Vorlagen
> deutsch, `authAlert` aus, Datenbestand wie in der Sicherung (27 Teile),
> Anmeldung und Punkte in der App, Türgeheimnis für Besucher nicht lesbar.
>
> **Anmeldedauer 14 Tage, nicht 30.** Die Produktion stand schon vor dem
> Upgrade auf 1209600 s (aus der Sicherung gelesen); die Annahme „30 Tage"
> oben stammte aus der Testkopie. Das Upgrade hat den Wert übernommen.
> Die Übergangsregel für alte Token (`compat.pb.js`) ist noch am selben Tag
> entfernt worden, weil es nur Testkonten gab.
>
> Zeitzone im Container nachgemessen (siehe „Offene Punkte" unten).

### Zurückrollen

**Nur per Sicherung.** Das Abbild von vorher auf der gehobenen Datenbank
startet und meldet sich gesund, aber es kann niemand mehr anmelden (siehe
Messung). Der Verify fällt dabei durch (`_superusers` → 404), ein
automatischer Rückweg ist das also nicht.

1. Stack stoppen.
2. Inhalt von `/opt/stacks/plietsche-pb/pb_data/` beiseitelegen (nicht
   löschen, bis der Rückweg geprüft ist), die Sicherung dorthin auspacken:
   `unzip vor_040.zip -d /opt/stacks/plietsche-pb/pb_data/`.
3. Im Stack das Abbild auf den SHA-Tag vor dem Upgrade setzen und ausrollen.
4. Alles, was nach der Sicherung geschrieben wurde (Check-ins, Punkte), ist
   damit weg. Deshalb das Upgrade nicht während der Öffnungszeiten.

### Rate-Limiting — vorbereitet, nicht eingeschaltet

PocketBase 0.40 bringt ein Rate-Limit mit, ab Werk aus. Es zählt je IP. Hinter
unserem Weg (Apache → Traefik → Container) sieht PocketBase ohne weitere
Einstellung **nur die IP des Proxys** — alle Nutzer:innen teilten sich ein
Kontingent, und ein voller Laden sperrte sich beim Anmelden selbst aus.
Gemessen: `remoteIP` und `userIP` im Log sind ohne `trustedProxy` beide die
Adresse der Gegenstelle.

Deshalb ist es **nicht** per Migration eingeschaltet. Vorgehen:

1. **Messen, welcher Kopf die echte IP trägt.** Der Apache-vHost setzt
   `RequestHeader set X-Real-IP %{REMOTE_ADDR}s` (überschreibt, was der
   Client schickt — nicht fälschbar). Ob Traefik den Kopf durchreicht, hängt
   an `forwardedHeaders.trustedIPs` seines Einstiegspunkts: Vertraut Traefik
   dem Apache nicht, ersetzt es `X-Real-Ip` und `X-Forwarded-For` durch die
   eigene Sicht. Probe: `trustedProxy.headers = ["X-Real-IP"]` setzen, von
   einem bekannten Anschluss eine Anfrage schicken, im Log (`/_/#/logs`) das
   Feld `userIP` ansehen. Steht dort die eigene öffentliche IP, stimmt es.
   Steht dort eine 127.x/172.x-Adresse, muss zuerst Traefik angepasst werden.
2. **Nicht `X-Forwarded-For` mit `useLeftmostIP`.** Der linkste Eintrag kommt
   vom Client und ist frei fälschbar.
3. **Erst dann** einschalten, mit vorsichtigen Regeln (Einstellungen →
   Rate limits):

   | Label | Zielgruppe | Fenster | Höchstens | Warum |
   |---|---|---|---|---|
   | `users:authWithPassword` | `@guest` | 60 s | 20 | Passwort-Raten bremsen. 20, weil das WLAN im Laden für viele Handys eine einzige IP ist. |
   | `users:requestPasswordReset` | alle | 300 s | 5 | Mail-Flut an fremde Adressen verhindern. |

   Die Voreinstellungen von 0.40 (`*:auth` 2 in 3 s, `*:create` 20 in 5 s)
   sind für einen vollen Laden hinter einer IP zu knapp — nicht einfach das
   Häkchen setzen.

Die Label-Schreibweise ist gegen 0.40.4 gemessen: Die Einstellungen werden mit
200 angenommen, der vierte Login-Versuch derselben `X-Real-IP` bei
Höchstwert 3 bekommt 429, eine andere IP im selben Fenster nicht.

### Empfehlung, nicht umgesetzt

- **MFA für Superuser** (`_superusers` → MFA, zweiter Faktor per OTP-Mail).
  Nicht per Migration: Auf einer frischen Installation ohne Mailversand würde
  sie den Adminbereich versperren. Nach dem Upgrade von Hand einschalten,
  sobald SMTP geprüft ist.
- **`migrate history-sync`** räumt die 20 alten Einträge aus `_migrations`.
  Nicht nötig, ändert nichts am Verhalten.

### Offene Punkte, die in Produktion zu messen sind

- **Zeitzone der nächtlichen Aufgaben.** Das 0.40-Abbild bringt erstmals
  `tzdata` mit; das 0.22-Abbild hatte keine Zeitzonendaten, und keines der
  Binarys bettet sie ein. `TZ=Europe/Berlin` im Stack wirkt damit
  vermutlich erst ab jetzt — die Aufgaben um 3:05, 3:20 und 3:40 liefen dann
  bisher nach UTC (5:05 Berliner Sommerzeit) und künftig nach Berliner Uhr.
  Fachlich unkritisch (Tagesgrenzen rechnet die Fachlogik aus
  `store.timezone`), aber vor und nach dem Upgrade mit `date` im Container
  gegenprüfen.
  **Gemessen 07.10.2026 nach dem Upgrade:** `date` im Container zeigt
  20:37 CEST bei 18:37 UTC, `TZ=Europe/Berlin`, `/usr/share/zoneinfo` ist
  vorhanden. Die Aufgaben laufen damit ab jetzt um 3:05, 3:20 und 3:40
  Berliner Zeit.
- **Fehlermeldungen bekommen einen Punkt.** 0.40 macht aus jeder
  `ApiError`-Meldung einen Satz: „Du bist nicht im Laden" kommt als „Du bist
  nicht im Laden." an (gemessen). Die App zeigt den Text wörtlich; ihre
  Deutsch-Erkennung trifft weiterhin.
