# Wie das Backend ausgeliefert wird

Stand: 14.09.2026.

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
| `pocketbase/Dockerfile` | Setzt auf `ghcr.io/muchobien/pocketbase:0.22.21` auf und kopiert `pb_hooks/` und `pb_migrations/` hinein. Die Version des Basis-Abbilds bleibt gepinnt. |
| `docker-compose.portainer.yml` | Der Stack, der in Produktion läuft. Eigenes Abbild, **nur `pb_data` gemountet**. |
| `docker-compose.yml` | Lokale und dokumentarische Fassung: fremdes Abbild, Hooks als Bind-Mount. Läuft in Produktion **nicht**. |
| `.github/workflows/deploy.yml` | Der Ablauf oben. |
| `.github/scripts/deploy-verify.py` | Die Nachher-Prüfung. |
| `tests/deploy-verify.test.js` | Deren Tests. |

### Das Test-Gate

Die Backend-Tests laufen als eigener Job **in derselben Workflow-Datei**, und
der Deploy-Job hängt per `needs` daran — ohne `always()`. Rote Tests, kein
Deploy.

Der naheliegende Weg über `workflow_run` an `tests.yml` wurde bewusst nicht
genommen: Er startet einen zweiten, entkoppelten Lauf, der in der Oberfläche
nicht am Push hängt, und er läuft gegen den Stand des Standard-Branch statt
gegen den auslösenden Commit. Beides ist genau die Sorte Feinheit, die still
das Falsche ausliefert. Dass die Backend-Tests dadurch zweimal laufen, ist der
Preis; sie brauchen unter einer Minute.

### Die Vollständigkeitsprüfung

Vor dem Push ins Register wird geprüft, ob alle sechs Hook-Dateien vorhanden
und nicht leer sind und ob mindestens 19 Migrationen im Build-Kontext liegen.
Das ist der Gedanke der Hennstedt-Seite („mindestens 50 Seiten gebaut, sonst
`exit 1`"): Ein unvollständiger Build fällt sonst nicht auf. Fehlt eine
Hook-Datei, startet PocketBase trotzdem und meldet sich gesund — es rechnet nur
niemand mehr Punkte aus.

Die Migrationen werden als **Anzahl** geprüft und nicht einzeln aufgezählt.
Eine Liste müsste bei jeder neuen Migration nachgezogen werden und würde
vergessen; die Untergrenze wächst nur, wenn jemand sie bewusst anhebt.

### Die Nachher-Prüfung

`deploy-verify.py` ruft unangemeldet fünf Endpunkte ab und prüft je Migration
ein Schemamerkmal — nicht „ist die Migration vermerkt", sondern „ist das, was
sie bewirken sollte, wirksam". Das fängt auch einen Fehlschlag mitten in einer
Migration ab.

| Prüfung | Erwartet | Belegt |
|---|---|---|
| `GET /api/collections/store_secrets/records` | 403 | Das Türgeheimnis liegt in einer eigenen, für niemanden lesbaren Sammlung |
| `GET /api/collections/store/records` | 200, `totalItems: 0` | `store` verlangt eine Anmeldung |
| `GET /api/collections/items/records` | 200, `totalItems: 0` | Die Leseregel auf `items` greift |
| `GET /api/collections/action_counts/records` | 200, `totalItems: 0` | Die Besitzprüfung greift |
| `GET /api/health` | 200 | Die Instanz antwortet |

**Die Falle, um die es dabei geht:** PocketBase antwortet auf eine Regel, die
nichts durchlässt, mit **HTTP 200 und einer leeren Liste** — nicht mit 403. Ein
403 kommt nur bei `listRule: null`. Wer nur Statuscodes prüft, hält eine offene
Sammlung für geschlossen: Eine Sammlung ganz ohne Leseregel liefert ebenfalls
200, nur mit Inhalt. Bei den 200ern wird deshalb zusätzlich `totalItems == 0`
verlangt.

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

Die drei Vorlagen (Passwort zurücksetzen, Adresse bestätigen, Willkommen) sind
auf Deutsch hinterlegt — PocketBase liefert sie ab Werk auf Englisch aus.

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

**Was es bewusst nicht gibt: einen automatischen Rückwärtsgang.** Migrationen
sind nicht folgenlos umkehrbar. Schlägt der Verify fehl, bleibt der Stand
stehen und der Lauf ist rot — ein Container, der steht, ist besser als ein
Schema, das jemand halb zurückgedreht hat.
