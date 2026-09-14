# Wie kommt Code auf den Server? Zwei Vorbilder und ein Vorschlag

Untersucht am 14.09.2026. Gelesen wurden `/Users/simonluthe/Documents/konfi-quest`
und `/Users/simonluthe/Documents/moin-kark`; in beiden Repos wurde nichts verändert.

Anlass ist ein konkretes Problem in diesem Projekt: Das Backend läuft als
PocketBase-Container auf `server.godsapp.de`, Stack `plietsche-pb` unter
`/opt/stacks/plietsche-pb/`. Dort liegt **kein Git-Arbeitsverzeichnis** — die
Hooks und Migrationen wurden bisher von Hand per `scp` kopiert. Die Instanz lief
dadurch vier Wochen auf einem alten Stand, und ein im Repo als behoben geführter
kritischer Sicherheitsfehler stand in Produktion weiter offen.

Die Frage ist also nicht nur „wie kommt der Code hin", sondern vor allem: **woran
merkt man, dass er angekommen ist.**

---

## Muster A — konfi-quest

### A.1 Wie der Code auf den Server kommt

Der Weg führt über eine Container-Registry und die Portainer-API. Der Server zieht
nie selbst aus Git; er bekommt ein fertiges Abbild vorgesetzt.

**Auslöser:** Push auf `main`, eingeschränkt auf bestimmte Pfade
(`.github/workflows/ci.yml:3-30` — `backend/**`, `frontend/**`, `init-scripts/**`,
`scripts/**`, `docs/api/**`, `docs/handbuch/**`, `e2e/**`, `playwright.config.ts`,
die Workflow-Datei selbst). Zusätzlich `workflow_dispatch` von Hand.

Die Pfadliste ist zweimal nachgeschärft worden, und beide Male steht der Grund als
Kommentar darüber: Am 24.08.2026 fiel auf, dass eine Änderung an `scripts/` keinen
Lauf auslöste und damit auch keine Images gebaut wurden; am 05.09.2026 dasselbe für
`e2e/**` — ein Fix für einen roten E2E-Test wurde gepusht, und es passierte
schlicht nichts, während der rote Lauf davor Build und Deploy übersprungen hatte.
„Damit blieb der Betrieb still auf einem alten Stand." Das ist dasselbe Versagen,
das plietsche-pluenn gerade erlebt hat, nur mit anderer Ursache.

**Ablauf Schritt für Schritt:**

1. **Drei Testjobs parallel** — `backend-test` (Vitest gegen ein Postgres im
   Service-Container, Daten im tmpfs), `frontend-test` (Lint auf den im PR
   geänderten Dateien, Frischecheck der erzeugten Doku, Vitest), `e2e-test`
   (Playwright gegen einen per Compose hochgefahrenen Stack).
2. **`build-and-push`** (`ci.yml:299-341`) hängt per `needs` an allen dreien. Ohne
   `always()` — sind die Tests rot, läuft der Build gar nicht erst. Gebaut werden
   zwei Images (Backend, Frontend) über eine Matrix, gepusht nach `ghcr.io`, getaggt
   mit `latest` **und** dem kurzen Commit-SHA. Der volle SHA geht als Build-Arg
   `GIT_SHA` ins Backend-Image.
3. **`deploy`** (`ci.yml:343-503`) hängt an `build-and-push`. Er holt den
   Compose-Text des Stacks über `GET /api/stacks/249/file`, schreibt darin per
   `perl` jeden Image-Tag auf den SHA-Tag dieses Builds um, und schickt ihn per
   `PUT /api/stacks/249?endpointId=1` mit `pullImage: true` zurück.

Zwei Kommentare an dieser Stelle erklären, warum es so umständlich ist, und beide
sind teuer gelernt:

- Der Stack-**Webhook** zieht bei diesem dateibasierten (nicht-Git-)Stack das neue
  Image nicht zuverlässig. Zuverlässig ist nur `update_stack` mit `pullImage: true`.
- **`:latest` reicht nicht.** Docker behält das lokale `:latest`, meldet aber „pull
  successful" — der alte Container läuft weiter (Portainer #13173/#6289). Nur ein
  eindeutiger Tag erzwingt den Pull. Genau deshalb der Tag-Rewrite.

**Nebenweg:** `notfall-deploy.yml` rollt von Hand einen bereits gebauten Tag aus,
ohne Tests, ohne Build. Er prüft vorab per `docker manifest inspect`, ob das Image
auf ghcr überhaupt existiert, und bricht sonst ab — „Produktion bleibt unverändert,
das ist der sichere Ausgang". Der Auslösende und sein Grund landen in der
Lauf-Zusammenfassung.

**Nicht scharf:** `deploy/rolling-deploy.sh` ist ein Entwurf für einen
Zero-Downtime-Tausch der zwei Backend-Replicas. Der Kopf der Datei nennt zwei
ungelöste Punkte (15 s 502/503 beim Tausch, weil Traefik den toten Container erst
nach dem Healthcheck-Intervall aus dem Pool nimmt; und das `:latest`-Problem von
oben). Bis das geklärt ist, läuft der reguläre Weg mit kurzer Lücke.

### A.2 Authentifizierung

Zwei Mechanismen, kein SSH:

| Wofür | Mechanismus | Geheimnis |
|---|---|---|
| Push nach ghcr.io | `docker/login-action`, Benutzer `github.actor` | eingebauter `GITHUB_TOKEN`, Job-Recht `packages: write` |
| Redeploy | Portainer-REST-API, Header `X-API-Key` | `secrets.PORTAINER_URL`, `secrets.PORTAINER_API_KEY` |

Beide Deploy-Workflows setzen zusätzlich `STACK_ID: "249"` und `ENDPOINT_ID: "1"`
als Klartext-Env — keine Geheimnisse, nur Adressierung. Der globale
`permissions`-Block steht auf `contents: read`; `packages: write` wird nur im
Build-Job job-lokal übersteuert.

### A.3 Was übertragen wird

Nur Abbilder. Der Server bekommt keinen Quelltext: Die CI baut zwei Docker-Images,
schiebt sie nach ghcr, und Portainer zieht sie. Übertragen wird ins Deployment
lediglich der **Compose-Text** — und auch der nicht aus dem Repo, sondern aus dem
Stack selbst gelesen, verändert und zurückgeschrieben.

Bemerkenswert: `deploy/compose.konfi_quest.yml` ist ausdrücklich nur eine
Referenzkopie; die Quelle der Wahrheit bleibt der Portainer-Stack 249. Das Repo
beschreibt die Produktion, es definiert sie nicht.

### A.4 Nachher-Prüfung

Hier liegt die eigentliche Stärke des Musters. Der Deploy gilt erst als gelungen,
wenn die **laufende Instanz den erwarteten Commit meldet**:

```
GET https://konfi-quest.de/api/status
→ { status, version, commit, uptimeSeconds, checks: { database }, responseTimeMs }
```

Die Route (`backend/createApp.js:332-355`) prüft die Datenbank mit `SELECT 1` und
gibt `commit` aus `process.env.GIT_SHA` zurück — gesetzt zur Build-Zeit über
`ARG GIT_SHA` im Dockerfile (`backend/Dockerfile:22-24`). Der Wert ist damit
fälschungssicher an das Abbild gebunden: Läuft der alte Container, steht dort der
alte SHA.

Der Verify-Block pollt bis zu zwölfmal alle 10 Sekunden und verlangt
`checks.database == "ok"` **und** `commit == github.sha`. Das Ganze in bis zu drei
Redeploy-Runden — das fängt das Rennen ab, dass das Image auf ghcr erst Sekunden
nach dem Build verfügbar ist und der erste Pull noch den alten Stand zieht.
Bleibt die Prüfung erfolglos, endet der Job mit `::error::` und rot.

Ein Detail, das Nachdenken verrät: Die Commit-Prüfung läuft nur, wenn der Push
tatsächlich `backend/` angefasst hat (sonst ändert sich das Backend-Image nicht und
der Commit bliebe zu Recht alt). Und der Diff geht über den **gesamten gepushten
Bereich** `github.event.before..HEAD`, nicht `HEAD~1..HEAD`. Auch das ist gelernt:
Am 09.06.2026 wurde Migration 093 nicht deployt, weil der letzte Commit des Pushes
ein reiner Doku-Commit war.

**Rollback: nein.** Bei Fehlschlag bleibt der Stand stehen, wie er ist, und der
Lauf wird rot. Zurückgerollt wird von Hand, und dafür gibt es den Notfall-Deploy
mit einem älteren Tag. Das ist eine vertretbare Entscheidung — ein automatischer
Rollback über eine Datenbank hinweg, deren Migrationen schon gelaufen sind, wäre
gefährlicher als das Stehenbleiben.

### A.5 Migrationen

Ein Runner im Prozess, beim Serverstart (`backend/database.js`):

- Zeile 116-129: Beim Laden des Moduls `SELECT NOW()`, dann `runMigrations(pool)`.
  Nur eine unerreichbare Datenbank ist ein harter Startfehler.
- Zeile 21-51: `pg_advisory_lock(723001)` auf einer eigenen Verbindung — nötig,
  weil `backend`, `backend2` und `backend-test` gleichzeitig starten können. Legt
  `schema_migrations (name PK, applied_at)` an.
- Zeile 53-111: liest `backend/migrations/*.sql` sortiert, überspringt, was schon
  vermerkt ist, und führt jede Migration **samt ihres Vermerks in einer
  Transaktion** aus.

Und hier die Lücke, die für unseren Übertrag die wichtigste Beobachtung des ganzen
Berichts ist:

> **Fehlgeschlagene Migrationen sind nicht blockierend** (`database.js:87-99`).
> Rollback, laut loggen, weiter mit der nächsten — der Server startet trotzdem.

`/api/status` prüft nur `SELECT 1`, nicht den Migrationsstand. Ein Container, dessen
Migration gescheitert ist, meldet `checks.database: "ok"`, der Commit stimmt, der
Deploy gilt als verifiziert — **und das Schema ist trotzdem nicht da.** Der Fehler
steht nur im Container-Log, wo ihn niemand sucht, solange der Lauf grün ist.

Der Commit-Vergleich beweist: „dieser Code läuft". Er beweist nicht: „dieses Schema
liegt an." Wer das Muster übernimmt, muss diese Lücke mitübernehmen — oder sie
schließen.

Ein Abgleich existiert, aber nur im Werkzeugkasten, nicht im Deploy:
`backend/tests/schema/refresh-schema.sh:44` holt sich die Migrationsliste der
Produktion per SSH, und `schemaDrift.test.js:141` vergleicht sie.

### A.6 Einschätzung

**Gut:**

- Das Test-Gate ist echt. Rote Tests → kein Build → kein Deploy, ohne `always()`
  und ohne Hintertür. Die E2E-Suite hängt seit dem 31.08.2026 mit drin, und der
  Kommentar sagt ausdrücklich: Flattert sie, gehört der Test repariert, nicht das
  Gate aufgemacht.
- Der Commit-Verify ist die richtige Antwort auf genau unser Problem. Ein Deploy,
  der nicht angekommen ist, wird rot — nicht grün mit stillem Fehlschlag.
- Unveränderliche Tags statt `:latest`. Aus Schaden gelernt und begründet
  dokumentiert.
- Der Notfall-Weg prüft vorab, ob es das Image gibt, statt blind zu deployen.
- Die Kommentare sind ein Betriebstagebuch. Fast jede Absonderlichkeit trägt ein
  Datum und einen Vorfall. Das ist der Grund, warum dieses Muster überhaupt so gut
  nachvollziehbar ist.

**Umständlich:**

- Der Deploy-Job ist ein rund 160-zeiliges Shell-Skript mit eingebettetem Python
  und einem `perl`-Einzeiler, der YAML per Regex umschreibt. Es funktioniert, aber
  jede Änderung daran ist heikel, und es gibt keinen Test dafür.
- Compose-Datei im Repo ist nur „Referenzkopie". Die Wahrheit liegt in Portainer.
  Wer den Stack dort von Hand ändert, hat einen Stand, den kein Repo kennt — das
  ist dieselbe Klasse von Problem, die plietsche-pluenn gerade hatte, nur eine
  Ebene höher.
- Die Pfadfilter haben zweimal Deploys verschluckt. Ein Filter, der zu wenig
  auslöst, fällt nicht auf: Es passiert einfach nichts.
- Die Migrationslücke aus A.5.
- **Nebenbefund, außerhalb des Auftrags, aber zu ernst zum Weglassen:** In der
  Historie des **öffentlichen** Repos `Revisor01/konfi-quest` stehen fünf
  Produktions-Geheimnisse im Klartext. Der Commit `ac6880aa` vom 20.08.2026
  („fix(security): Produktions-Secrets aus dem Repo entfernen") hat sie aus dem
  Arbeitsstand genommen, aber nicht aus der Historie — er ist Vorfahr von
  `origin/main` und damit für jede Person abrufbar. Betroffen sind das
  Postgres-Passwort, `JWT_SECRET`, `QR_SECRET`, `LOSUNG_API_KEY` und das
  SMTP-Passwort.

  > **Richtigstellung vom 14.09.2026: Die Werte sind nicht mehr gültig.**
  >
  > Der Befund oben stützte sich auf die lokale `portainer-stack.yml` im
  > Arbeitsverzeichnis — eine Datei, die weder versioniert noch aktuell ist
  > (sie steht in `.gitignore:127`). Sie konserviert den Stand von **vor** der
  > Rotation und ist deshalb kein Beleg für den Betrieb.
  >
  > Gegen die laufenden Container gemessen (`docker inspect`, Vergleich über
  > SHA-256-Fingerabdrücke, ohne die Werte zu notieren): **keiner der sechs
  > stimmt überein.** Teilweise unterscheiden sich sogar die Längen — es sind
  > neu erzeugte Werte. Der Betreiber hatte sie bereits gedreht.
  >
  > Was bleibt: Die alten, inzwischen wertlosen Werte stehen weiterhin in der
  > öffentlichen Historie. Das ist Hygiene, kein Risiko; ein Umschreiben der
  > Historie (Force-Push, alle Klone unbrauchbar) steht dafür nicht im
  > Verhältnis. Entscheidung vom 14.09.2026: so belassen.
  >
  > **Die Lehre gehört zum Bericht:** Eine Datei im Arbeitsverzeichnis ist kein
  > Systemzustand. Wer über Produktionsgeheimnisse urteilt, misst gegen die
  > Produktion — sonst entsteht genau dieser Fehlalarm.

---

## Muster B — moin-kark

### B.1 Wie der Code auf den Server kommt

Gar nicht automatisch. Der Deploy ist eine dokumentierte Handarbeit in drei
Schritten (`README.md:285-334`).

**Auslöser:** ein Mensch, der die Befehle aus dem README abtippt. Die CI
(`.github/workflows/ci.yml`) läuft bei Push auf `main`, bei jedem Pull Request und
montags um 6:00 UTC — sie prüft Typen, Tests und Abhängigkeiten. **Ein Deploy-Job
existiert nicht.** Die beiden anderen Workflows (`ios-release.yml`,
`android-release.yml`) betreffen die Stores, nicht den Server.

**Ablauf:**

1. Quelltext per `rsync -az --delete` nach
   `/opt/stacks/moinkark-api/build/`, ohne `node_modules`, `.git`, `.env`, Logs und
   `apps/app`.
2. Per SSH auf dem Server `docker build -f apps/api/Dockerfile -t moinkark-api:latest .`
   — das Abbild entsteht **auf dem Server**, nicht in der CI. Der Build-Kontext ist
   der Monorepo-Wurzel, damit `packages/shared` mitkommt.
3. Container neu erstellen über Portainer („Redeploy" in der Oberfläche oder per
   Portainer-MCP `redeploy_stack`).

Das README warnt an dieser Stelle ausdrücklich, und das ist eine nützliche Warnung:
`docker restart moinkark-api` reicht **nicht** — das startet den alten Container mit
dem alten Abbild neu, das frisch gebaute wird nie übernommen. (Das ist im Kern
dieselbe Falle wie das `:latest`-Problem bei konfi-quest, nur an anderer Stelle.)

Landingpage und Web-App gehen denselben Weg ohne Container: `rsync -az --delete`
direkt in den KeyHelp-Docroot.

### B.2 Authentifizierung

SSH als `root@server.godsapp.de`, mit dem Schlüssel, der auf Simons Rechner liegt.
Keine CI-Geheimnisse, keine Deploy-Keys, kein Registry-Token — weil keine Maschine
außer der eigenen deployt.

Die Anwendungsgeheimnisse (14 ChurchDesk-Tokens, `ADMIN_TOKEN`) liegen als
Portainer-Stack-ENV am Stack `moinkark-api` und werden über
`${CD_TOKEN_…:-}`-Platzhalter in die Compose-Datei gereicht. Das Repo enthält sie
nicht; die Compose-Datei sagt das auch ausdrücklich („Tokens werden über
Portainer-Stack-ENV / .env injiziert (NIE im Repo)").

### B.3 Was übertragen wird

Der halbe Quelltext: alles außer `node_modules`, `.git`, `.env`, Logs und der
Mobil-App. Mit `--delete`, das Verzeichnis auf dem Server ist also ein Spiegel.
Gebaut wird daraus auf dem Server.

### B.4 Nachher-Prüfung

**Keine im Deploy-Weg.** Es gibt keinen Health-Verify, keinen Smoke-Test und keinen
Abgleich, der belegt, dass der neue Stand läuft — weil es keinen automatisierten
Ablauf gibt, an den man ihn hängen könnte. Wer deployt, schaut hin.

Eine einzige Prüfanweisung steht im README, und die betrifft die Web-App, nicht die
API: Nach dem Deploy nachsehen, ob `/maplibre-gl-worker.mjs` HTTP 200 liefert.
Fehlt die Datei, bleibt die Karte leer — „ohne eine einzige Fehlermeldung". Wieder
ein stiller Ausfall, wieder als Warnung festgehalten.

Rollback: keiner. Zurück ginge nur über ein erneutes `rsync` eines älteren Standes
samt Neubau.

### B.5 Migrationen

Keine Datenbank, keine Migrationen. Die API ist ein lesender ChurchDesk-Aggregator
mit einem Cache; Zustand gibt es nur in Form der über `/admin` gepflegten
Orts-Korrekturen, die in einem benannten Volume unter `/data` liegen und
Container-Neubauten überleben.

### B.6 Einschätzung

**Gut:**

- Kein Geheimnis verlässt den Rechner. Es gibt keinen CI-Zugang zum Server, den
  jemand missbrauchen könnte, und keinen Deploy-Key in einem GitHub-Tresor.
- Das Dockerfile nimmt `npm ci --omit=dev` und begründet es: Ein Redeploy zieht
  exakt die Versionen aus der Lock-Datei, nicht stillschweigend neuere
  Caret-Stände — sonst kann Produktion brechen, ohne dass sich das Repo geändert
  hat. Das ist genau die richtige Sorge.
- Der Container läuft als `node`, nicht als root, und das Volume gehört ihm.
- Die drei Deploy-Befehle stehen vollständig und kopierbar im README, samt der
  beiden Fallen, in die man sonst tritt.

**Umständlich — und für uns der entscheidende Punkt:**

- **Der Server kann auf einem beliebigen Stand stehen, und niemand merkt es.**
  Es gibt keine Verbindung zwischen „ist auf `main` gemergt" und „läuft in
  Produktion". Kein Commit-Marker, kein Abgleich, keine Prüfung. Das ist exakt das
  Versagen, das plietsche-pluenn gerade vier Wochen lang hatte — hier ist es
  bauartbedingt und nicht einmal ein Fehler, sondern der Entwurf.
- Der Deploy hängt an einer Maschine und einem Menschen. Wer nicht an Simons
  Rechner sitzt, kann nicht ausliefern.
- Die Tests in der CI sind kein Gate. Sie können rot sein, und der Deploy von Hand
  läuft trotzdem.
- Bauen auf dem Server bindet Produktions-CPU und -RAM und macht das Ergebnis vom
  Zustand der Maschine abhängig (Docker-Cache, freier Platz). Ein Abbild aus der
  CI ist reproduzierbar, eines aus einem gewachsenen Build-Verzeichnis nur
  wahrscheinlich.
- `rsync --delete` als `root` in ein Pfad-Argument ist eine Zeile, bei der ein
  Tippfehler teuer wird.

---

## Vergleich

| | Muster A — konfi-quest | Muster B — moin-kark |
|---|---|---|
| Auslöser | Push auf `main` (pfadgefiltert) | Mensch am Rechner |
| Weg auf die Maschine | Image über ghcr.io, Portainer zieht | `rsync` + `docker build` auf dem Server |
| Anmeldung | `GITHUB_TOKEN` (ghcr), Portainer-API-Key | SSH als root, lokaler Schlüssel |
| Geheimnisse | `PORTAINER_URL`, `PORTAINER_API_KEY` | keine in der CI; App-Tokens als Stack-ENV |
| Übertragen wird | fertiges Abbild + Compose-Text | Quelltext ohne `node_modules`/`.git` |
| Test-Gate | ja, hart (`needs` ohne `always()`) | nein |
| Nachher-Prüfung | `checks.database == ok` **und** `commit == github.sha`, bis zu 3 Runden | keine |
| Bei Fehlschlag | Lauf rot, Stand bleibt; Notfall-Deploy von Hand | nichts |
| Migrationen | Runner beim Start, Advisory-Lock, `schema_migrations` — **Fehlschlag blockiert nicht** | keine Datenbank |
| Aufwand | hoch (rund 160 Zeilen Deploy-Logik) | niedrig (drei Befehle im README) |

Der Unterschied, auf den es ankommt, ist nicht Registry gegen rsync. Es ist die
Zeile **„Nachher-Prüfung"**. Muster A weiß nach jedem Deploy, welcher Stand läuft,
und sagt es laut, wenn es der falsche ist. Muster B weiß es nie.

Genau das ist der Grund, warum die plietsche-pluenn-Instanz vier Wochen lang
unbemerkt alt sein konnte: Sie wurde nach Muster B betrieben, ohne dessen einzige
Absicherung — einen Menschen, der unmittelbar danach hinsieht.

---

## Empfehlung für plietsche-pluenn

**Muster A**, aber in der abgespeckten Form, die zu PocketBase passt.

### Warum A und nicht B

B hat einen echten Vorzug — kein Zugang zum Server in einem fremden Tresor — und
wäre bei einem Projekt vertretbar, das täglich von Hand angefasst wird. Hier nicht.
Der eingetretene Schaden war nicht „der Deploy war mühsam", sondern „niemand hat
gemerkt, dass keiner stattgefunden hat". B kann das bauartbedingt nicht bemerken.
A kann es, und zwar im selben Lauf, in dem der Deploy passiert.

Dazu kommt ein Umstand, der für uns günstig ist: PocketBase braucht **kein Bauen**.
Der Container ist ein fest gepinntes Fremdabbild
(`ghcr.io/muchobien/pocketbase:0.22.21`), und alles Eigene sind Dateien in
`pb_hooks/` und `pb_migrations/`. Damit entfällt der ganze aufwendige Teil von
Muster A — Registry, Matrix-Build, Tag-Rewrite per Regex, das
`:latest`-Pull-Problem. Übrig bleibt der Teil, der den Wert trägt: **ausliefern und
danach beweisen, dass es angekommen ist.**

### Was einzurichten wäre

#### 1. Dateien

**`.github/workflows/deploy.yml`** (neu). Auslöser:

```yaml
on:
  push:
    branches: [main]
    paths:
      - 'pocketbase/pb_hooks/**'
      - 'pocketbase/pb_migrations/**'
      - 'docker-compose.yml'
      - '.github/workflows/deploy.yml'
  workflow_dispatch:
```

Die Workflow-Datei selbst gehört in die Liste — bei konfi-quest hat genau dieses
Detail zweimal Deploys verschluckt.

Der Job hängt per `needs` am bestehenden Testlauf. Dafür ist der einfachste Weg,
die beiden Jobs aus `tests.yml` in denselben Workflow zu ziehen oder `deploy.yml`
über `workflow_run` an `Tests` zu hängen; die erste Variante ist unkomplizierter zu
lesen. Entscheidend ist: **Ohne `always()`.** Rote Tests, kein Deploy.

Schritte:

1. Checkout.
2. `rsync -az --delete` von `pocketbase/pb_hooks/` und `pocketbase/pb_migrations/`
   nach `/opt/stacks/plietsche-pb/pb_hooks/` bzw. `.../pb_migrations/`. **Zwei
   getrennte Aufrufe mit je eigenem Ziel** — nie `--delete` auf das
   Stack-Verzeichnis als Ganzes, dort liegt `pb_data`.
3. Container neu starten, damit PocketBase die Hooks neu lädt und die Migrationen
   ausführt — per Portainer-API, `POST /api/endpoints/1/docker/containers/<id>/restart`,
   oder schlicht `docker restart plietsche-pocketbase` über dieselbe SSH-Sitzung.
   Ein Neustart genügt hier, weil sich das Abbild nicht ändert; die
   `docker restart`-Falle aus beiden Vorbildern greift nur, wenn ein neues Abbild
   übernommen werden soll.
4. **Verify** (siehe unten). Schlägt er fehl: `exit 1`, Lauf rot.

**`.github/scripts/deploy-verify.py`** (neu) — die Nachher-Prüfung als eigenes
Skript statt als Shell-Block im YAML. Das ist der eine Punkt, an dem ich von
Muster A bewusst abweiche: Dort ist die Verify-Logik in den Workflow eingebettet
und damit untestbar. Als Skript lässt sie sich so testen, wie es CLAUDE.md für
`.github/scripts/` ohnehin beschreibt — als Prozess aufrufen, mit gestellten
Antworten.

**`tests/deploy-verify.test.js`** (neu) — Tests dazu. Mindestens: erkennt einen
fehlenden Schemamarker, erkennt eine offene Regel, meldet Erfolg nur bei
vollständiger Übereinstimmung. Keine weichen Assertions.

**`docs/openapi.yaml`**, **`CHANGELOG.md`**, **`README.md`** — mitziehen, sobald
der Weg steht. Für den CHANGELOG ist das ein Fall für „Sonstiges": Dass die
Auslieferung jetzt automatisch läuft, merken Nutzer:innen nur mittelbar. Dass
Sicherheitsregeln künftig ohne Verzug ankommen, ist dagegen aus Nutzersicht
erzählbar.

#### 2. Geheimnisse

Nur zwei, je nach gewähltem Weg:

| Name | Wofür |
|---|---|
| `DEPLOY_SSH_KEY` | privater Teil eines **eigens erzeugten** Deploy-Schlüssels für `rsync`/`ssh` |
| `DEPLOY_HOST_KEY` | der `known_hosts`-Eintrag des Servers, damit nicht blind verbunden wird |

Alternativ, wenn der Dateitransfer über Portainer laufen soll statt über SSH:
`PORTAINER_URL` und `PORTAINER_API_KEY` wie bei konfi-quest. Das trägt aber nicht
weit — die Portainer-API kann einen Stack neu ausrollen, sie kann keine Dateien in
ein Bind-Mount legen. Für diesen Aufbau bleibt SSH der einzige gangbare Weg für
Schritt 2; Portainer ist dann höchstens für Schritt 3 die schönere Variante.

**Nicht `root` verwenden.** Ein eigener Benutzer, dessen Schlüssel in
`authorized_keys` auf ein `command=`-Präfix festgelegt ist, das nur den
`rsync`-Empfang auf die beiden Zielverzeichnisse zulässt. Ein CI-Schlüssel mit
Root-Zugang auf eine Maschine, auf der auch Authentik und Nextcloud laufen, ist
ein zu großer Hebel für das, was hier erreicht werden soll. Muster B nimmt root,
aber dort liegt der Schlüssel auf einem einzelnen Rechner und nicht in einem
Tresor, auf den jeder Workflow-Lauf zugreift.

#### 3. Trigger

Push auf `main`, pfadgefiltert, hinter dem Test-Gate. Zusätzlich
`workflow_dispatch` für den Fall, dass von Hand nachgeholt werden muss.

#### 4. Prüfschritte — der Kern

Ein Health-Check auf `/api/health` **reicht hier ausdrücklich nicht.** Die Instanz
war vier Wochen lang durchgehend gesund und trotzdem falsch. `/api/health` liefert
heute:

```
{"message":"API is healthy.","code":200,"data":{"canBackup":true}}
```

Dasselbe hätte sie auch die vier Wochen über geliefert.

PocketBase führt beim Start alle Dateien aus `pb_migrations/` aus, die es noch
nicht kennt, und vermerkt sie in `_migrations`. Diese Tabelle ist über die API
nicht ohne Superuser-Anmeldung lesbar — und einen Superuser-Zugang in einen
GitHub-Tresor zu legen, wäre ein deutlich größeres Zugeständnis als der Nutzen
rechtfertigt.

**Der bessere Weg: je Migration ein Schemamerkmal unangemeldet prüfen.** Nicht „ist
die Migration vermerkt", sondern „ist das, was sie bewirken sollte, tatsächlich
wirksam". Das ist die stärkere Aussage, weil sie auch einen Fehlschlag mitten in
einer Migration auffliegen lässt — genau die Lücke, die konfi-quest offen hat.

Für diese Instanz nachgemessen am 14.09.2026, unangemeldet gegen
`https://pb.xn--plietsche-plnn-rsb.de`:

| Prüfung | Erwartet | Gemessen | Beweist |
|---|---|---|---|
| `POST /api/collections/visits/records` | **403** | 403 | `1782710000_tighten_read_rules` — `createRule: null` liegt an |
| `GET /api/collections/store_secrets/records` | **403** | 403 | `1782690000_store_secret_collection` — Sammlung existiert und ist für niemanden lesbar |
| `GET /api/collections/store/records` | 200, `totalItems: 0` | 200, `totalItems: 0` | `store` verlangt eine Anmeldung; unangemeldet kommt nichts zurück |
| `GET /api/collections/items/records` | 200, `totalItems: 0` | 200, `totalItems: 0` | `items`-Leseregel greift |
| `GET /api/collections/action_counts/records` | 200, `totalItems: 0` | 200, `totalItems: 0` | Besitzprüfung greift |

Ein Unterschied ist dabei wichtig genug, um ihn festzuhalten, weil eine naive
Prüfung daran scheitert: **PocketBase antwortet auf eine Regel, die nichts
durchlässt, mit HTTP 200 und einer leeren Liste — nicht mit 403.** Ein 403 kommt
nur, wenn die Regel `null` ist (Sammlung für niemanden außer Superuser). Wer auf
Statuscodes allein prüft, hält eine offene Sammlung für geschlossen. Das Skript
muss deshalb bei den 200ern zusätzlich `totalItems == 0` verlangen.

Das ist zugleich das Gegenstück zum Commit-Verify aus Muster A: Dort belegt der
zurückgemeldete SHA, dass der erwartete Code läuft. Hier belegt jede Prüfung, dass
eine bestimmte Migration angekommen ist. Wäre diese Prüfung im August schon
gelaufen, hätte sie die vier Wochen am ersten Tag rot gemeldet.

**Zusätzlich ein Marker für die Hooks.** Die Migrationen lassen sich so prüfen, die
Hooks nicht — `pb_hooks/` verändert kein Schema. Der saubere Weg ist eine winzige
eigene Route, etwa `GET /api/pp/version`, die eine im Repo gepflegte Kennung
zurückgibt (den Commit-SHA, den der Deploy vorher in eine Datei neben die Hooks
schreibt). Sie ist das PocketBase-Gegenstück zu `/api/status`:

- neue Route, nichts Bestehendes ändert sich — der Vertrag der ausgelieferten Apps
  bleibt unberührt;
- unangemeldet abrufbar, weil sie nichts verrät, was nicht ohnehin im öffentlichen
  Verhalten steckt (falls das unerwünscht ist: hinter Team-Rolle legen und im
  Verify anmelden);
- im selben Commit in `docs/openapi.yaml` eintragen, wie CLAUDE.md es verlangt.

Damit prüft der Verify beides: **Hooks** über den zurückgemeldeten Commit,
**Migrationen** über die Schemamerkmale. Erst wenn alles stimmt, ist der Lauf grün.

Wie bei Muster A gehört der Verify in eine Warteschleife (PocketBase braucht nach
dem Neustart ein paar Sekunden, und die Migrationen laufen dabei) — etwa zwölf
Versuche im Abstand von fünf Sekunden. Nach konfi-quests Vorbild sollte eine
gescheiterte Runde einen zweiten Neustart auslösen dürfen, bevor endgültig rot
gemeldet wird.

#### 5. Rollback

Keinen bauen. Bei Fehlschlag bleibt der Stand stehen und der Lauf ist rot — wie bei
Muster A. Migrationen sind nicht folgenlos umkehrbar, ein automatischer Rückwärts-
gang wäre gefährlicher als ein stehengebliebener Container. Was stattdessen hilft,
ist das Gegenstück zum Notfall-Deploy: ein `workflow_dispatch` mit einem
Commit-SHA als Eingabe, der den Stand dieses Commits ausliefert. Das ist derselbe
Weg wie der reguläre, nur mit anderem Checkout, und kostet kaum zusätzliche Zeilen.

### Was NICHT übernommen werden sollte

- **Registry, Image-Bau, Tag-Rewrite.** Es gibt nichts zu bauen. Der
  `perl`-Einzeiler, der YAML per Regex umschreibt, und die drei Redeploy-Runden
  gegen das ghcr-Propagations-Rennen lösen Probleme, die hier nicht existieren.
  Wer sie mitnimmt, erbt den Wartungsaufwand ohne den Nutzen.
- **`deploy/rolling-deploy.sh`.** Zero-Downtime mit zwei Replicas ist bei einer
  PocketBase-Instanz mit eingebettetem SQLite auf einem Bind-Mount ohnehin nicht zu
  haben — zwei Prozesse auf derselben Datei wäre ein Datenverlust mit Ansage. Und
  bei konfi-quest ist das Skript selbst nach eigenem Bekunden noch nicht fertig.
- **Compose nur als „Referenzkopie".** Bei konfi-quest ist die Wahrheit der
  Portainer-Stack, und das Repo beschreibt ihn bloß. Genau diese Trennung ist eine
  Ursache der Klasse von Problem, die wir hier gerade abstellen wollen. Für
  plietsche-pluenn sollte `docker-compose.yml` im Repo die Quelle bleiben und der
  Stack daraus gespeist werden.
- **Geheimnisse im Klartext in einer Compose-Datei**, auch nicht in einer
  ignorierten. Bei konfi-quest ist genau daraus der Nebenbefund aus A.6 entstanden:
  einmal committet, für immer in der Historie. `${PB_ENCRYPTION_KEY}` aus der
  Umgebung, wie es die heutige `docker-compose.yml` schon richtig macht, bleibt.
- **Root-SSH aus der CI** (Muster B nimmt root, aber ohne CI). Eingeschränkter
  Benutzer mit `command=`-Festlegung.
- **Bauen auf dem Server** (Muster B). Entfällt hier ohnehin.
- **Migrationsfehler nur ins Log schreiben** (Muster A, `database.js:87-99`). Das
  ist die Schwachstelle des Vorbilds, nicht seine Stärke. Der Schemamerkmal-Verify
  oben ist die Antwort darauf.

### Reihenfolge

1. `GET /api/pp/version` bauen, mit Test und Eintrag in `docs/openapi.yaml`.
2. `deploy-verify.py` samt Tests schreiben und **gegen die heute laufende Instanz
   erproben** — sie ist inzwischen auf dem richtigen Stand, das Skript muss also
   grün melden. Danach gegenprobieren: eine Erwartung verschärfen, die die Instanz
   nicht erfüllt, und sicherstellen, dass das Skript rot wird.
3. Deploy-Benutzer auf dem Server anlegen, Schlüssel erzeugen, `authorized_keys`
   einschränken, beide Geheimnisse in GitHub hinterlegen.
4. `deploy.yml` bauen, zuerst mit `workflow_dispatch` allein, von Hand auslösen.
5. Erst wenn ein Lauf von Hand sauber durchgelaufen ist, den Push-Auslöser scharf
   schalten.
6. README, TECH.md und CHANGELOG nachziehen.

Schritt 2 vor Schritt 4 ist Absicht: Die Prüfung muss stehen, bevor die
Auslieferung automatisch läuft. Sonst hat man eine Maschine, die schneller falsche
Stände erzeugt, als vorher jemand richtige kopiert hat.
