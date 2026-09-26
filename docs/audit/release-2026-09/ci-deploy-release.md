# Release-Audit: Auslieferung und Store-Reife

| | |
|---|---|
| Datum | 26.09.2026 |
| Stand | Commit `06b68dc8` („feat(app): Symbolauswahl bleibt als Funktion", 19.09.2026), Branch `main`, Arbeitsverzeichnis sauber |
| Umfang | `.github/workflows/*.yml`, `.github/scripts/*.py`, `.github/dependabot.yml`, `pocketbase/Dockerfile`, `pocketbase/.dockerignore`, `docker-compose*.yml`, `mobile/app.json`, `mobile/eas.json`, `mobile/.nvmrc`, `mobile/.npmrc`, `mobile/ios/*`, `mobile/babel.config.js`, `mobile/metro.config.js`, `docs/deploy.md`, `docs/store-release.md`, `docs/push-channels.md`, `web/*`, `.gitignore`, `mobile/.gitignore` |
| Vorgehen | Jede Datei vollständig gelesen. Skripte ohne Netz und ohne Geheimnisse mit Testdaten ausgeführt (Wegwerf-Repos, gestellte `build.gradle`, fehlende Argumente). Expo-Vorgaben aus dem vorhandenen `mobile/node_modules/` gelesen, nicht geraten. Kein Zugang zu GitHub-Secrets, EAS, App Store Connect, Google Play oder dem Server — was nur dort prüfbar ist, steht als solches markiert. |
| Kennzeichnung | **reproduziert** = lokal ausgeführt und beobachtet; **aus Code gelesen** = am Quelltext belegt, nicht ausgeführt |

Die Vorgänger-Berichte `docs/audit/ci-deploy.md`, `deploy-muster.md` und `ABNAHME.md` (14.09.2026) wurden zur Einordnung gelesen. Von den dort als offen geführten Punkten ist M-1 (`setup-node` im `pruefung`-Job) inzwischen behoben (`release.yml:90-94`). Nichts wurde ungeprüft übernommen.

---

## Zusammenfassung

Die Auslieferungskette ist in einem deutlich besseren Zustand als vor zwei Wochen: Alle sieben verwendeten Actions sind auf Commit-SHA gepinnt, die Berechtigungen sind minimal, kein Geheimnis wird in ein Protokoll geschrieben, und das Backend wird seit dem 14.09. automatisch als Abbild ausgeliefert und danach gegen die laufende Instanz geprüft. Die Aussage in `CLAUDE.md`, Hooks würden von Hand kopiert, ist seit diesem Datum überholt und sollte dort korrigiert werden.

Für einen **Store-Release ist der Stand aber noch nicht reif**. Drei Befunde wiegen schwer: Erstens würden die Google-Play-Hinweise für die aktuelle Fassung aus acht Design-Commit-Betreffs bestehen („Glaslinse mit P hoch 2 als App-Symbol", „Quelle jetzt als SVG"), während „Konto löschen" und „Passwort vergessen" gar nicht vorkommen — reproduziert gegen die echte Historie. Zweitens fehlt im Repo jede Web-Adresse für Datenschutzerklärung, Impressum und Kontolöschung; Google Play verlangt die Löschadresse seit 2024 verbindlich, beide Stores die Datenschutz-URL. Drittens prüft der Deploy-Verify nur zwei von zwanzig Migrationen und keinen Commit-Bezug, sodass ein Container auf dem Stand vom 14.09. heute noch als „angekommen" gilt.

Dazu kommen Störungen mittlerer Schwere, die eine Apple-Prüfung verzögern können: ein englischer Foto-Berechtigungstext, den Expo still einfügt, ein weißer Splash-Screen ohne Bild, ein CHANGELOG-Versprechen (dunkles/getöntes Symbol), das die Konfiguration nicht mehr einlöst, und ein fehlendes Demo-Konto samt Erklärung, warum der Reviewer nicht einchecken kann.

**Empfehlung: kein Release aus diesem Stand.** Erst C-1 bis C-4 schließen (zwei Tage Arbeit, kein Umbau), dann einen Probelauf über `play-internal.yml` und einen TestFlight-Build, dann `release.yml` mit Freigabe `draft`.

---

## Befund-Tabelle

| ID | Kurztitel | Schwere | Nachweis |
|---|---|---|---|
| C-1 | Store-Hinweise bestehen aus rohen Commit-Betreffs; Nutzer-relevante Punkte fallen heraus | HOCH | reproduziert |
| C-2 | Keine Web-Adresse für die Kontolöschung (Play-Pflicht) | HOCH | aus Code gelesen |
| C-3 | Keine Datenschutzerklärung und kein Impressum unter einer URL | HOCH | aus Code gelesen |
| C-4 | Deploy-Verify erkennt einen veralteten Container ab Stand 14.09. nicht | HOCH | aus Code gelesen |
| C-5 | TestFlight- und Play-Workflows ohne Test-Gate; Release ohne App-Typprüfung | MITTEL | aus Code gelesen |
| C-6 | iOS-Fototext englisch, Mikrofon-Text überflüssig — durch automatisch angewandtes Plugin | MITTEL | aus Code gelesen |
| C-7 | Splash-Screen weiß und ohne Bild | MITTEL | aus Code gelesen |
| C-8 | CHANGELOG verspricht dunkles/getöntes iOS-Symbol, Konfiguration liefert es nicht mehr | MITTEL | aus Code gelesen |
| C-9 | Kein Demo-Konto und keine Reviewer-Erklärung zum Check-in dokumentiert | MITTEL | aus Code gelesen |
| C-10 | Landingpage-Auslieferung von Hand; `konto.html` und nginx-Regel nicht in der Anleitung | MITTEL | aus Code gelesen |
| C-11 | Abbild: Basis per Tag statt Digest, kein Nicht-Root-Nutzer, keine Sicherungsstrategie | MITTEL | aus Code gelesen |
| C-12 | Dokumentation widerspricht sich (Repo-Sichtbarkeit, Handkopie, Store-Stand) | MITTEL | aus Code gelesen |
| C-13 | Skripte ohne Argumente enden mit Stacktrace; drei Skripte ohne Tests | NIEDRIG | reproduziert |
| C-14 | `Podfile.lock` im Repo, aber wirkungslos | NIEDRIG | aus Code gelesen |
| C-15 | Release- und Test-Workflows können gleichzeitig dieselbe Store-Nummer ziehen | NIEDRIG | aus Code gelesen |
| C-16 | Geheimnisdateien bleiben auf dem Runner; Passwörter als Prozessargumente | NIEDRIG | aus Code gelesen |
| C-17 | `legacy-peer-deps` und unbegründete `overrides` | NIEDRIG | aus Code gelesen |

KRITISCH: 0 · HOCH: 4 · MITTEL: 8 · NIEDRIG: 5

---

## Befunde im Einzelnen

### C-1 — Store-Hinweise bestehen aus rohen Commit-Betreffs [HOCH, reproduziert]

**Beschreibung.** `release-notes.py` baut die Texte für „Was ist neu" bei Google Play und TestFlight aus den Commit-Betreffs seit dem letzten erfolgreichen Lauf. Der Filter kennt nur die Typen `chore|ci|test|docs|refactor|style|build` (`release-notes.py:26`) und die Bereiche `ci|deps|deps-dev|build|test|tests` (`:27`). Alles andere geht durch — auch `design:`, `revert:`, `perf:`, Merge-Commits, `wip` und der Breaking-Change-Marker `fix!:`. Zusätzlich werden nur die **acht neuesten** Punkte genommen (`:81`), unabhängig davon, ob sie für Nutzer:innen etwas bedeuten.

**Fundstelle.** `.github/scripts/release-notes.py:26-28, 61-63, 81`.

**Nachweis (reproduziert).** Aufruf im Repo mit `SEIT_COMMIT=38b3725` (der Commit, der `1.0.0 (33)` schließt), Ziel `play`:

```
- Symbolauswahl bleibt als Funktion
- Symbol-Vorschauen kleiner, Rahmen ohne schwarze Kanten
- Umschalter fuer drei Symbol-Entwuerfe
- gestaltete Systemmails und eigene Bestaetigungsseiten
- Bestaetigungsmail nach der Registrierung
- App-Symbol in allen neun Erscheinungen
- App-Symbol in groesserem Schnitt, Quelle jetzt als SVG
- Glaslinse mit P hoch 2 als App-Symbol
```

Nicht enthalten, obwohl im CHANGELOG unter „Neu": Konto löschen, Passwort vergessen, E-Mail bestätigen, Filter „Neu"/„Schaufenster", Standort wird nicht mehr gespeichert. Alle liegen jenseits der ersten acht. Die Betreffs stehen in Commit-Transliteration („fuer", „groesserem", „Bestaetigungsmail") — so stünden sie im Store.

Wegwerf-Repo mit gestellten Commits: `design: Arbeitsfassungen fuer Illustrator`, `revert(a11y): …`, `perf(app): …`, `wip`, `Merge branch main`, `fix!: Geheimnis aus der Antwort entfernen (CVE-2026-1234, siehe internes Ticket #12)` — **alle sechs** landen im Text, beim letzten bleibt sogar die Vorsilbe `fix!:` stehen, weil `VORSILBE` (`:28`) das `!` nicht kennt.

**Auswirkung.** Der Text geht bei `release.yml` ungeprüft in die Produktionsspur (`release.yml:356-365`). Nutzer:innen lesen Entwurfsnotizen der Gestaltung statt der neuen Funktionen; im schlechteren Fall interne Ticketnummern oder Sicherheitshinweise.

**Empfehlung.** Für `release.yml` die Eingabe `hinweis` **verpflichtend** machen (`required: true`) oder die Hinweise aus dem `[Unreleased]`-Block des CHANGELOG erzeugen — der ist bereits „aus Nutzersicht" geschrieben und ist laut `CLAUDE.md` die Pflichtquelle. Mindestens: `design`, `revert`, `perf`, `wip`, Merge-Commits ausfiltern, `VORSILBE` um `!?` ergänzen, und die Auswahl nicht bei acht Punkten abschneiden, sondern `feat` vor `fix` reihen. Für den ersten Store-Release den Text von Hand eintragen.

### C-2 — Keine Web-Adresse für die Kontolöschung [HOCH, aus Code gelesen]

**Beschreibung.** Google Play verlangt seit 2024 für jede App mit Kontoerstellung im Formular „Datensicherheit" eine **Web-Adresse**, unter der Nutzer:innen die Löschung anstoßen können — zusätzlich zur Löschung in der App. Im Repo gibt es keine solche Seite. `web/konto.html` bedient ausschließlich die drei Mail-Fälle `verification`, `password-reset`, `email-change` (`konto.html:110-113`, Verzweigung `:231-241`); die Landingpage `web/index.html` hat keinen Abschnitt zu Konto oder Löschung (`index.html:160-190`).

Die Löschung **in der App** ist vorhanden und auffindbar: Profil (Startseite → Avatar/Name, `app/(visitor)/index.tsx:87,105`) → ganz unten „Konto löschen" mit Passwortabfrage und Rückfrage (`app/(visitor)/settings/account.tsx:465-513`, `lib/hooks/useAuth.ts:131-143`). Die Sammlungen `visits`, `points`, `user_badges`, `push_devices` hängen mit `cascadeDelete: true` am Nutzer (`1700000000_init_schema.js:148,180,249,278`); Teile bleiben bewusst ohne Personenbezug stehen (`:94,127`, CHANGELOG-Eintrag „Konto löschen").

**Fundstelle.** `web/konto.html:110-113, 231-241`; `web/index.html:160-190`; fehlend: eine Route `/konto-loeschen` o. ä.

**Auswirkung.** Ohne die Adresse lässt sich das Datensicherheits-Formular nicht vollständig ausfüllen; ohne vollständiges Formular nimmt Google keine Veröffentlichung an. Apple verlangt keine Web-Adresse, akzeptiert aber ebenfalls nur eine in der App auffindbare Löschung (5.1.1(v)) — die ist gegeben.

**Empfehlung.** Eine statische Seite `web/konto-loeschen.html` (oder Abschnitt in `konto.html` ohne Token): Was wird gelöscht, wie (in der App unter Profil) und als Rückfall ein Mail-Weg mit Frist. Adresse in `docs/store-release.md` unter „In der Play Console vorbereiten" aufnehmen. In `nginx-konto.conf` eine `location` ergänzen.

### C-3 — Keine Datenschutzerklärung und kein Impressum unter einer URL [HOCH, aus Code gelesen]

**Beschreibung.** Beide Stores verlangen bei der Einreichung eine öffentlich erreichbare Datenschutzerklärung; App Store Connect zusätzlich eine Support-URL. Das Repo enthält einen ausführlichen Datenschutz-Abschnitt in `README.md:186-230` (Verantwortlicher, verarbeitete Daten, Betroffenenrechte) — aber keine Web-Seite dafür. `web/index.html` hat weder Datenschutz noch Impressum (Fußzeile `index.html:184-187` verweist nur auf `kirche-hennstedt.de`). Für eine in Deutschland betriebene Seite mit App-Angebot ist das Impressum ohnehin Pflicht (§ 5 DDG).

Ob das README als URL taugt, hängt an der Repo-Sichtbarkeit — und dazu widerspricht sich `docs/deploy.md` (siehe C-12). Ein GitHub-README ist ohnehin keine belastbare Adresse für ein Store-Formular.

**Fundstelle.** `web/index.html:184-187` (kein Link); `README.md:186-230` (Text vorhanden, nicht ausgeliefert); `docs/store-release.md:60` nennt die Anforderung, ohne eine Adresse zu haben.

**Auswirkung.** Ohne Datenschutz-URL keine Einreichung. Kein Verzögerungsrisiko, sondern ein Blocker im Formular.

**Empfehlung.** `web/datenschutz.html` und `web/impressum.html` aus dem README-Text ableiten, in der Fußzeile der Landingpage verlinken, Support-Adresse (Mail aus `index.html:155` oder README) festlegen. Die drei URLs in `docs/store-release.md` eintragen.

### C-4 — Deploy-Verify erkennt einen veralteten Container ab Stand 14.09. nicht [HOCH, aus Code gelesen]

**Beschreibung.** `deploy.yml` baut das Abbild, schiebt es als `:latest` und `:<sha>` nach GHCR (`deploy.yml:139-141`), stößt den Portainer-Webhook an (`:150-158`) und lässt `deploy-verify.py` gegen die Produktion laufen (`:169-170`). Der Stack zieht `:latest` (`docker-compose.portainer.yml:28`). Der Verify prüft fünf Merkmale (`deploy-verify.py:50-74`): drei belegen zwei Migrationen vom 14.09. (`store_secrets`, `tighten_read_rules`), eins ist `/api/health`. Von den **zwanzig** Migrationen sind das zwei; die jüngste (`1782720000_push_send_attempts.js`) und alle Hook-Änderungen seit dem 14.09. werden nicht geprüft. Es gibt kein Merkmal, das den ausgelieferten Commit identifiziert — anders als im eigenen Vorbild (`deploy-muster.md`, Abschnitt A.4: `GIT_SHA` als Build-Arg, `/api/status` liefert `commit`).

Damit ist genau die Falle wieder offen, die der Workflow schließen sollte: Zieht Portainer aus irgendeinem Grund kein neues Abbild (das Muster-Dokument nennt den Fall „pull successful, alter Container läuft weiter" bei `:latest` ausdrücklich, A.1), meldet der Verify grün — solange der Container irgendeinen Stand ab dem 14.09. fährt.

Die Vollständigkeitsprüfung vor dem Push (`deploy.yml:95-121`) ist in Ordnung: sechs Hook-Dateien namentlich, Migrationen als Untergrenze 19 (aktuell 20).

**Fundstelle.** `deploy-verify.py:50-74`; `pocketbase/Dockerfile:16-26` (kein `ARG GIT_SHA`); `docker-compose.portainer.yml:28`.

**Auswirkung.** Der Lauf kann grün sein, obwohl der Server auf einem alten Stand steht — die Projektgeschichte zeigt, dass das wochenlang unbemerkt bleibt. Für den Store-Release ist das mittelbar relevant: Die App 1.0.0 setzt Hooks voraus, die seit dem 14.09. dazukamen (E-Mail-Bestätigung, Push-Versuche).

**Empfehlung.** Im Dockerfile `ARG GIT_SHA` und `ENV PP_GIT_SHA` setzen, in `deploy.yml` mit `build-args: GIT_SHA=${{ github.sha }}` übergeben; ein kleiner Hook `GET /api/pp/version` liefert `{commit}` (neue, additive Route, dokumentiert in `docs/openapi.yaml`); `deploy-verify.py` verlangt `commit == erwarteter SHA`. Bis dahin: Je neuer Migration eine Zeile in `PRUEFUNGEN` — als Regel in `CLAUDE.md` festhalten.

### C-5 — TestFlight- und Play-Workflows ohne Test-Gate; Release ohne App-Typprüfung [MITTEL, aus Code gelesen]

**Beschreibung.** `testflight.yml` und `play-internal.yml` haben je einen einzigen Job ohne `needs` und ohne Testschritt (`testflight.yml:39-45`, `play-internal.yml:66-72`). `release.yml` prüft im Job `pruefung` nur die Backend-Tests (`release.yml:96-99`), nicht die TypeScript-Prüfung der App, die `tests.yml:42-61` für Pushes kennt. Ob ein Branch-Schutz `tests.yml` zur Pflicht macht, ist im Repo nicht sichtbar.

**Auswirkung.** Ein Stand, bei dem `tsc` rot ist, kann in TestFlight, in eine Play-Spur und — sofern er baut — in den Store gelangen. Der Build bricht bei Typfehlern nicht zwingend ab (Metro/Babel prüfen keine Typen).

**Empfehlung.** In `release.yml` den `pruefung`-Job um `npm ci --legacy-peer-deps && npx tsc --noEmit` in `mobile/` ergänzen; in `testflight.yml`/`play-internal.yml` denselben Job als `needs` vorschalten (kostet etwa zwei Minuten, spart einen 60-Minuten-Build).

### C-6 — iOS-Fototext englisch, Mikrofon-Text überflüssig [MITTEL, aus Code gelesen]

**Beschreibung.** Die App nutzt `expo-image-picker` (`app/(visitor)/items/new.tsx:58-63`, `items/[id].tsx:147-149`), aber das Paket steht nicht in `plugins` (`app.json:35-77`). Expo wendet es trotzdem an: `expo-image-picker` steht in der Liste `legacyExpoPlugins` (`@expo/prebuild-config/build/plugins/withDefaultPlugins.js:185`), die `withLegacyExpoPlugins` für installierte Pakete ohne Optionen ausführt (`:205-207`). Ohne Optionen schreibt das Plugin `NSPhotoLibraryUsageDescription = "Allow $(PRODUCT_NAME) to access your photos"` und `NSMicrophoneUsageDescription = "Allow $(PRODUCT_NAME) to access your microphone"` in die Info.plist (`expo-image-picker/plugin/build/withImagePicker.js:7-9, 50-52`). Kamera und Standort sind dagegen sauber auf Deutsch (`app.json:15-16, 40, 46`).

**Auswirkung.** Apple 5.1.1(i) verlangt eine Zweckangabe, die den konkreten Nutzen erklärt; ein englischer Standardtext in einer deutschen App fällt Reviewern auf und ist ein häufiger Grund für eine Rückfrage. Der Mikrofon-Text erklärt eine Berechtigung, die die App nie nutzt.

**Empfehlung.** `["expo-image-picker", {"photosPermission": "Plietsche Plünn lädt aus deiner Fotomediathek das Bild eines Teils, das du vorbeibringst.", "microphonePermission": false}]` in `plugins`. `microphonePermission: false` blockiert auf Android zugleich `RECORD_AUDIO` (`withImagePicker.js:18-19`).

**Android-Seite, geprüft und in Ordnung:** Das Manifest von `expo-image-picker` fordert `READ_EXTERNAL_STORAGE`/`WRITE_EXTERNAL_STORAGE` nur bis API 32 und **kein** `READ_MEDIA_IMAGES` (`expo-image-picker/android/src/main/AndroidManifest.xml:7-8`); die Auswahl läuft über den System-Photo-Picker (`photopicker_activity` `:16-19`). Die Play-Richtlinie zu breiten Foto-Berechtigungen ist damit eingehalten.

### C-7 — Splash-Screen weiß und ohne Bild [MITTEL, aus Code gelesen]

**Beschreibung.** `expo-splash-screen` steht ohne Optionen in `plugins` (`app.json:50`), und `app.json` hat keinen `splash`-Block. Die Vorgaben des Plugins: `backgroundColor: '#ffffff'`, `image: undefined`, `imageWidth: 100` (`expo-splash-screen/plugin/build/getIosSplashConfig.js:11-14`, `getAndroidSplashConfig.js:10-12`). `mobile/assets/splash-icon.png` (1024×1024, RGBA) liegt ungenutzt im Repo.

**Auswirkung.** Der Start zeigt eine weiße Fläche statt Marke und Farbe (`#27b092` aus `app.json:23`). Kein Ablehnungsgrund, aber der erste Eindruck im Review und bei jedem Start.

**Empfehlung.** `["expo-splash-screen", {"image": "./assets/splash-icon.png", "imageWidth": 200, "backgroundColor": "#27b092", "resizeMode": "contain"}]`.

### C-8 — CHANGELOG verspricht dunkles/getöntes iOS-Symbol, Konfiguration liefert es nicht mehr [MITTEL, aus Code gelesen]

**Beschreibung.** `CHANGELOG.md:12` (Unreleased → Geändert): „Das Symbol passt sich dem Bildschirm an: Auf einem dunklen Homescreen erscheint es gedämpft … wer seine Symbole einfärben lässt, bekommt eine dafür gezeichnete Fassung." Dafür führte Commit `01ddb46` `"icon": {light, dark, tinted}` ein; Commit `729bfa0` (18.09.) setzte `icon` wieder auf den String `"./assets/icon.png"` (`app.json:9`) und fügte stattdessen `expo-alternate-app-icons` mit vier Varianten hinzu (`app.json:56-76`). `icon-dark.png` und `icon-tinted.png` liegen ungenutzt in `mobile/assets/`. Der CHANGELOG-Satz wurde nicht zurückgenommen. (Der Android-Teil des Satzes stimmt: `monochromeImage` ist gesetzt, `app.json:26`.)

**Auswirkung.** Ein Versprechen im Änderungsprotokoll — der Quelle für Store-Texte laut `CLAUDE.md` —, das der Build nicht einlöst.

**Empfehlung.** Entweder `ios.icon: {light, dark, tinted}` zusätzlich setzen (verträgt sich mit `expo-alternate-app-icons`) oder den CHANGELOG-Satz auf Android beschränken.

### C-9 — Kein Demo-Konto und keine Reviewer-Erklärung zum Check-in dokumentiert [MITTEL, aus Code gelesen]

**Beschreibung.** Die App verlangt eine Anmeldung; das ist nach Apple 5.1.1 zulässig, weil Punkte, Serien und Abzeichen personengebunden sind. Der Reviewer braucht dann ein Demo-Konto **und** eine Erklärung, warum die Kernfunktion (Check-in per QR-Code an der Ladentür in Hennstedt, mit Geofence — `scan.pb.js:44-45, 87`) im Review nicht auslösbar ist. `docs/store-release.md:62` nennt nur für Play „App-Zugriff (Testzugang …)"; für Apple gibt es keinen Hinweis, keinen Textbaustein, keine Angabe, wer das Konto anlegt und wo die Zugangsdaten liegen (nicht im Repo — richtig so, aber der Ort muss genannt werden).

„Sign in with Apple" ist **nicht** nötig: Es gibt nur E-Mail/Passwort, kein `authWithOAuth2` in `lib/` oder `app/` (grep ohne Treffer).

**Empfehlung.** Abschnitt „App Review" in `docs/store-release.md`: Demo-Konto (Rolle Besucher:in, mit ein paar Punkten und Abzeichen), Review-Notes-Text auf Englisch, der Check-in, Geofence und Push erklärt, Hinweis auf Kontolöschung im Profil. Optional ein Test-QR-Code, der nur für das Demo-Konto gilt.

### C-10 — Landingpage-Auslieferung von Hand; `konto.html` und nginx-Regel nicht in der Anleitung [MITTEL, aus Code gelesen]

**Beschreibung.** `web/README.md:16-21` beschreibt die Auslieferung als `scp` von **`index.html` und `icon.png`**. Seit `fef88d6` (18.09.) gibt es `web/konto.html` und `web/nginx-konto.conf`; beide fehlen in der Anleitung. Die Mail-Links von PocketBase zeigen fest auf `<appUrl>/_/#/auth/confirm-…` (`nginx-konto.conf:66-72`, `konto.html:119-123`) und funktionieren nur, wenn `konto.html` **und** die `location /_/`-Regel auf dem Server liegen. Ob sie dort liegen, ist nur außerhalb prüfbar. Es ist dieselbe Drift-Ursache, die das Backend bis zum 14.09. hatte — die eigene Warnung dazu steht in `web/README.md:28-32` (Symbol zwei Fassungen hinterher).

**Auswirkung.** Fehlt eine der beiden Dateien, enden „Passwort vergessen", „Adresse bestätigen" und „Adresse ändern" auf einer 404-Seite — drei Funktionen, die der Store-Release als neu ausweist.

**Empfehlung.** Anleitung um beide Dateien ergänzen und eine Prüfzeile (`curl -sI https://xn--plietsche-plnn-rsb.de/_/ | head -1` → 200) aufnehmen. Mittelfristig `web/` in einen Stack-Deploy wie das Backend überführen.

### C-11 — Abbild: Basis per Tag statt Digest, kein Nicht-Root-Nutzer, keine Sicherungsstrategie [MITTEL, aus Code gelesen]

**Beschreibung.**
- `FROM ghcr.io/muchobien/pocketbase:0.22.21` (`Dockerfile:16`) pinnt auf einen **Tag**, nicht auf einen Digest. Ein Tag ist beweglich; der Kommentar darüber begründet die Version, nicht die Unveränderlichkeit. Keine Prüfsumme — bei einem Fremdabbild ist der Digest die einzige Prüfsumme.
- Kein `USER` im Dockerfile; ob das Basisabbild als Root läuft, ist ohne Zugriff nicht feststellbar.
- `HEALTHCHECK` nur in den Compose-Dateien (`docker-compose.portainer.yml:52-56`), nicht im Abbild — in Ordnung, weil der Stack die Quelle ist.
- Keine Sicherungsstrategie für `pb_data` in `docs/deploy.md`: Erwähnt ist nur die einmalige Sicherung vom 14.09. (`deploy.md:141`). Ein Rollback ist als Abbild-Wechsel beschrieben (`deploy.md:234-241`), aber ausdrücklich ohne Rückweg für Migrationen — ohne regelmäßige DB-Sicherung ist ein fehlgeschlagener Migrationslauf nicht reparierbar.
- `.dockerignore` schließt `pb_data/` aus (`:7`) — richtig und begründet.
- Beide Compose-Dateien tragen dieselben Grenzen (`mem_limit: 512m`, `cpus: 1.0`, `logging max-size 10m/3`), `restart: unless-stopped`, `TZ`, keinen `ports:`-Block, Traefik-Labels ohne TLS-Angabe (TLS liegt bei Traefik/KeyHelp, `docker-compose.yml:11`). Sie driften **nicht**; die Unterschiede sind beabsichtigt und in den Köpfen beider Dateien erklärt.

**Empfehlung.** `FROM …:0.22.21@sha256:<digest>` (Dependabot hebt Digest-Pins an, wenn `docker` als Ökosystem in `dependabot.yml` ergänzt wird — fehlt dort). Nächtliche Sicherung von `pb_data` dokumentieren (PocketBase hat eine eingebaute Backup-Funktion, die in den Einstellungen zeitgesteuert läuft — Stand außerhalb prüfbar). Vor jedem Deploy mit Migration eine Sicherung, als Schritt in `deploy.md`.

### C-12 — Dokumentation widerspricht sich [MITTEL, aus Code gelesen]

| Aussage | Stelle | Gegenaussage | Stelle |
|---|---|---|---|
| „Das GHCR-Paket ist öffentlich, weil das Repository öffentlich ist" | `docs/deploy.md:134` | „Das Repo ist privat" | `docs/deploy.md:145`; `docs/audit/ci-deploy.md:26` („PRIVATE" am 14.09.) |
| „Auf dem Server gibt es kein Git-Arbeitsverzeichnis — Hooks und Migrationen werden von Hand kopiert" | `CLAUDE.md`, Abschnitt „Ein Fix im Repo ist kein Fix auf dem Server" | Seit 14.09. Auslieferung als Abbild, Handkopie ausdrücklich abgeschafft | `deploy.yml:3-15`, `docs/deploy.md:123-141` |
| „Android: noch nicht eingereicht" | `TECH.md:186` | versionCode 1 liegt in der Spur `internal` | `docs/store-release.md:49` |
| Mail-Zugangsdaten liegen in `~/.claude/secrets.env` | `docs/deploy.md:206` | `CLAUDE.md`: keine Ablageorte von Zugangsdaten im Repo (vgl. altes H-1) | — |

**Auswirkung.** Wer nach `CLAUDE.md` arbeitet, kopiert Hooks per `scp` in Bind-Mounts, die es nicht mehr gibt — und merkt es nicht, weil der Verify weiter grün ist (C-4). Die Repo-Sichtbarkeit entscheidet, ob README-Adressen (C-3) und `TEAM_ID`/`ASC_APP_ID` (`release.yml:58-60`) öffentlich sind — beides ist ohne Sichtbarkeit nicht zu bewerten.

**Empfehlung.** `CLAUDE.md` auf den Abbild-Weg umschreiben (Handgriff ist jetzt: „nach jedem Push auf `pocketbase/**` den Deploy-Lauf ansehen"), Sichtbarkeit einmal feststellen und beide Stellen in `deploy.md` angleichen, Pfadangabe in `deploy.md:206` durch „außerhalb des Repos" ersetzen.

### C-13 — Skripte ohne Argumente enden mit Stacktrace; drei Skripte ohne Tests [NIEDRIG, reproduziert]

**Nachweis (reproduziert, ohne Netz).**

| Aufruf | Ergebnis | Exit |
|---|---|---|
| `deploy-verify.py` ohne Argument | „Aufruf: deploy-verify.py <basis-url>" | 2 |
| `deploy-verify.py pb.example` | „Basis-URL muss mit http:// … beginnen" | 2 |
| `play-version.py` ohne Argumente | `IndexError: list index out of range` (`play-version.py:22`) | 1 |
| `upload-play.py` ohne Argumente | `IndexError` (`upload-play.py:34`) | 1 |
| `asc-build-number.py` ohne Env | `KeyError: 'ASC_KEY_ID'` (`asc-build-number.py:22`) | 1 |
| `upload-play.py … ` mit `PLAY_RELEASE_STATUS=inProgress` | „ist unbekannt. Erlaubt sind: draft, completed." — vor jedem Netzzugriff | 2 |
| `android-signing.py` gegen gestellte `build.gradle` | Release-Block auf `ppRelease` umgestellt, Debug-Block unverändert | 0 |
| `android-signing.py`, Release-Block ohne `signingConfig` | lesbare Meldung | 1 |
| `android-signing.py` ohne `app/build.gradle` | „lief prebuild durch?" | 1 |
| `release-notes.py`, `VORGABE` 600 Zeichen, Ziel `play` | auf 480 Zeichen gekürzt | 0 |

Die Netz-Fehlerpfade (`hole()`, `oeffne()`, `call()`) geben Statuscode und Antwortkörper aus und enden mit Exit 1 (`asc-build-number.py:64-76`, `play-version.py:30-47`, `upload-play.py:94-112`) — aus Code gelesen, nicht ausgeführt. Leere Antworten: `asc-build-number.py:112` und `play-version.py:102` liefern bei leerer Liste `1` — richtig für ein erstes Release. Gleichstand ist unmöglich (immer `max+1`); ein Rücksprung wird nicht erkannt, ist aber auch nicht nötig, weil beide Stores ohnehin aufsteigende Nummern verlangen. Version-Bump `1.0.0 → 1.1.0` berührt die Nummern nicht: `buildNumber`/`versionCode` laufen versionsunabhängig weiter — das passt zu Apple (Build-Nummer muss je Version eindeutig sein; global aufsteigend erfüllt das) und zu Google.

**Unbelegt:** `asc-build-number.py`, `play-version.py`, `android-signing.py` haben keine Tests unter `tests/` (`ls tests | grep -E 'asc|play-version|android-signing'` leer); `upload-play.py` nur für den Status-Wächter (`upload-play-status.test.js`).

**Empfehlung.** `argparse` mit Hilfetext in allen drei Skripten; je ein Prozess-Test wie bei `release-notes.test.js` (Netz per lokalem HTTP-Server ersetzen, wie es die Abnahme für N-2/N-3 von Hand getan hat).

### C-14 — `Podfile.lock` im Repo, aber wirkungslos [NIEDRIG, aus Code gelesen]

`mobile/ios/Podfile`, `Podfile.lock` und `.xcode.env` sind versioniert (`git ls-files mobile/ios`), obwohl `mobile/.gitignore:40` `/ios` ausschließt (sie wurden mit `e73cf5f` erzwungen). Beide iOS-Workflows führen `expo prebuild --platform ios --clean` aus (`testflight.yml:121`, `release.yml:165`), was `ios/` löscht und neu erzeugt — das Lockfile aus dem Repo spielt keine Rolle, `pod install` löst bei jedem Lauf frei auf. `Podfile.properties.json` fehlt, daher gilt `ios.deploymentTarget` = 16.4 aus dem Template (`Podfile:152`), passend zu `README.md:96`. `use_frameworks` ist nicht gesetzt (`Podfile:177-178`, nur bedingt). Entweder die drei Dateien entfernen oder das Lockfile nach dem Prebuild zurückkopieren, damit es wirkt.

### C-15 — Release- und Test-Workflows können gleichzeitig dieselbe Store-Nummer ziehen [NIEDRIG, aus Code gelesen]

Concurrency-Gruppen: `deploy-backend` (`deploy.yml:35-37`), `testflight` (`testflight.yml:30-32`), `play` (`play-internal.yml:59-61`), `release` (`release.yml:53-55`). `release.yml` und `play-internal.yml` laufen also parallel; beide berechnen `versionCode = max+1` aus derselben Play-Abfrage (`play-version.py:100-103`) und würden dieselbe Nummer eintragen — der zweite Upload scheitert nach 40 Minuten Build. Gleiches für `testflight` gegen den iOS-Job von `release`. Eine gemeinsame Gruppe `store-android` bzw. `store-ios` je Job löst das.

### C-16 — Geheimnisdateien bleiben auf dem Runner; Passwörter als Prozessargumente [NIEDRIG, aus Code gelesen]

- `/tmp/gplay-sa.json` (`play-internal.yml:110`, `release.yml:294`), `/tmp/release.jks` (`:150`, `:320`) und `~/.appstoreconnect/private_keys/AuthKey_*.p8` (`testflight.yml:80`, `release.yml:136`) werden nach dem Lauf nicht gelöscht. `dist.p12` wird gelöscht (`:139`, `:183`). Auf GitHub-gehosteten Runnern ist das Dateisystem flüchtig — akzeptabel, aber ein `if: always()`-Aufräumschritt kostet nichts und schützt bei einem Wechsel auf eigene Runner.
- Keystore- und Schlüsselpasswörter gehen als `-PPP_KEYSTORE_PASSWORD=$KS_PASS` an Gradle (`play-internal.yml:170-174`, `release.yml:331-335`) und sind damit in der Prozessliste sichtbar. GitHub maskiert Secret-Werte im Protokoll; ein Kommentar begründet die Wahl (`play-internal.yml:163-165`). Alternative: Umgebungsvariablen `ORG_GRADLE_PROJECT_PP_KEYSTORE_PASSWORD`, die Gradle gleichwertig als Projekt-Property liest.
- Kein `echo` eines Secret-Werts, kein `set -x`, kein Python-`print` eines Geheimnisses gefunden (alle `echo`-Zeilen der vier Workflows durchgesehen; die Inline-Skripte drucken höchstens HTTP-Antwortkörper, `testflight.yml:306`).
- Service-Account-Pfad und Paketname als Argumente (`play-version.py <json> <paket>`) — Pfad und Name sind keine Geheimnisse; der Inhalt wird per Datei gelesen. In Ordnung.

### C-17 — `legacy-peer-deps` und unbegründete `overrides` [NIEDRIG, aus Code gelesen]

- `mobile/.npmrc:1` `legacy-peer-deps=true` und `npm ci --legacy-peer-deps` in allen App-Jobs (`tests.yml:56`, `testflight.yml:72`, `play-internal.yml:98`, `release.yml:128, 287`). Begründung steht als Kommentar (`tests.yml:54-55`). Risiko: Peer-Konflikte werden nicht mehr gemeldet; ein `npx expo install --check` als CI-Schritt würde das ausgleichen.
- `mobile/package.json:56-67` `overrides` für `browserslist`, `brace-expansion`, `decode-uri-component`, `metro*` (fest `0.84.6`), `@xmldom/xmldom`, `xcode.uuid` — ohne Kommentar oder Verweis. Vermutlich Audit-Fixes; ohne Begründung weiß beim nächsten SDK-Sprung niemand, welche noch nötig sind. Die Metro-Festlegung ist die riskanteste: Sie überstimmt, was `expo@57` mitbringt.
- `.nvmrc` (22), `engines` (`>=22.12.0`, Root-`package.json:13-15`), Workflow-Node 22 — stimmig.
- `dependabot.yml`: npm `/mobile` (wöchentlich, eng gefasst, Begründungen vorhanden), npm `/` (wöchentlich), `github-actions` (monatlich). Kein `docker`-Ökosystem (siehe C-11).
- `babel.config.js` (`react-native-worklets/plugin` als letztes) und `metro.config.js` (Standard) sind unauffällig.

---

## Workflow-Aktionen und Pinning

Alle `uses:` in allen fünf Workflows. SHA-Pinning ist überall vorhanden; ob der jeweilige SHA tatsächlich zum kommentierten Tag gehört, ist ohne Netz nicht prüfbar (Vorgänger-Bericht gibt an, sie am 14.09. über die GitHub-API abgeglichen zu haben).

| Action | Pin | Kommentar | Verwendet in |
|---|---|---|---|
| `actions/checkout` | `3d3c42e5…` (SHA) | v7.0.1 | `tests.yml:27,46`, `deploy.yml:65,84`, `testflight.yml:47`, `play-internal.yml:74`, `release.yml:70,109,267` |
| `actions/setup-node` | `82076278…` (SHA) | v7.0.0 | `tests.yml:29,48`, `deploy.yml:67`, `testflight.yml:62`, `play-internal.yml:90`, `release.yml:90,120,279` |
| `actions/setup-python` | `5fda3b95…` (SHA) | v7.0.0 | `deploy.yml:160` |
| `actions/setup-java` | `b6effb05…` (SHA) | v5.7.0 | `play-internal.yml:79`, `release.yml:271` |
| `gradle/actions/setup-gradle` | `9c971963…` (SHA) | v6.3.0 | `play-internal.yml:85`, `release.yml:277` |
| `docker/login-action` | `dbcb8138…` (SHA) | v4.6.0 | `deploy.yml:124` |
| `docker/build-push-action` | `53b7df96…` (SHA) | v7.3.0 | `deploy.yml:134` |

**Berechtigungen:** `tests.yml`, `testflight.yml`, `play-internal.yml`, `release.yml`: `contents: read` (`:19`, `:27`, `:56`, `:50`). `deploy.yml`: `contents: read`, `packages: write` (`:39-41`) — nötig für GHCR, gilt für beide Jobs, könnte auf den Deploy-Job beschränkt werden (Hygiene). Kein `pull_request_target`, kein `id-token`, kein `actions: write`.

**Trigger:** `tests.yml` bei Push/PR auf `main`; `deploy.yml` bei Push auf `main` mit Pfadfilter `pocketbase/**`, `docker-compose.portainer.yml`, sich selbst, `deploy-verify.py` (`deploy.yml:17-27`) plus `workflow_dispatch`; die drei Store-Workflows nur `workflow_dispatch`. `release.yml` verlangt das Abtippen der Version gegen `app.json` (`release.yml:72-84`) — wirksam gegen Fehlklicks.

**`if: always()`** nur an den vier „Zusammenfassung"-Schritten (`testflight.yml:351`, `play-internal.yml:237`, `release.yml:245,368`) — schreiben nur in `$GITHUB_STEP_SUMMARY`. **`continue-on-error`** kommt nicht vor.

**Was `deploy.yml` automatisch tut und was manuell bleibt:** Automatisch: Tests → Vollständigkeitsprüfung → Abbild bauen und nach GHCR schieben (`:latest` + `:<sha>`) → Portainer-Webhook → Verify gegen `https://pb.xn--plietsche-plnn-rsb.de`. Manuell bleiben: die einmalige Stack-Umstellung (erledigt laut `deploy.md:123`), das Zurückrollen auf einen SHA-Tag in Portainer, jede Änderung an PocketBase-**Einstellungen** (SMTP, Vorlagen, `appUrl` — `deploy.md:195-215`) und die gesamte Landingpage (`web/README.md`). Der Verify prüft **keine Prüfsummen** und **keinen Commit**, sondern Schemamerkmale zweier Migrationen (C-4).

---

## Store-Anforderungen

| Anforderung | Stand im Repo | Fundstelle |
|---|---|---|
| Kontolöschung in der App (Apple 5.1.1(v), Play) | vorhanden, auffindbar: Startseite → Profil → unten | `account.tsx:465-513`, `useAuth.ts:131-143`, `index.tsx:87,105` |
| Web-Adresse zur Kontolöschung (Play, seit 2024) | **fehlt** | C-2 |
| Datenschutzerklärungs-URL (beide Stores) | Text im README, **keine URL** | C-3, `README.md:186-230` |
| Impressum (§ 5 DDG) | **fehlt** auf der Landingpage | `web/index.html:184-187` |
| Support-URL (Apple) | Landingpage mit Telefon/Mail vorhanden, nicht als Support benannt | `web/index.html:150-156` |
| Login-Pflicht zulässig (Apple 5.1.1) | plausibel (personengebundene Punkte); Demo-Konto/Review-Notes **nicht dokumentiert** | C-9 |
| „Sign in with Apple" | nicht nötig — nur E-Mail/Passwort, kein OAuth | grep `authWithOAuth2` leer |
| Push-Berechtigung erst nach Erklärung | Onboarding erklärt vor Anfrage; danach nur Wiederholung bei bereits erteilter/verweigerter Berechtigung (iOS fragt nicht erneut) | `permissions.tsx:30-36, 67-73`; `push.ts:97-101`; `(visitor)/_layout.tsx:9-11` |
| Standort nur „When in Use" | ja; kein `NSLocationAlways*`, Android nur Vordergrund-Anfrage | `app.json:16,46`; `permissions.tsx:26` |
| Standort FINE + COARSE (Android) | beide deklariert (`expo-location` fordert sie ohnehin); Koordinaten werden an den Server **übertragen**, aber nicht gespeichert | `app.json:31-32`; `expo-location/…/AndroidManifest.xml:2-3`; `scan.pb.js:44-45,87`; CHANGELOG „Standort nicht mehr gespeichert" → im Data-Safety-Formular als „erhoben, nicht gespeichert / ephemer" angeben |
| Kamera-Text (iOS) | deutsch, konkret | `app.json:15,40` |
| Foto-Text (iOS) | **englischer Standardtext**, Mikrofon-Text überflüssig | C-6 |
| Foto-Berechtigung (Android, Play-Policy) | kein `READ_MEDIA_IMAGES`; System-Photo-Picker | `expo-image-picker/…/AndroidManifest.xml:7-8,16-19` |
| `ITSAppUsesNonExemptEncryption` | `false` gesetzt | `app.json:17` |
| `NSUserTrackingUsageDescription` / Tracking-SDK | nicht nötig; kein Analytics/Sentry/Firebase in `package.json` | grep leer |
| Privacy Manifest (`PrivacyInfo.xcprivacy`) | von `react-native` und Expo-Modulen mitgeliefert, Aggregation eingeschaltet; eigenes Manifest nicht nötig (kein eigener Zugriff auf Required-Reason-APIs) | `Podfile:185`; 12 Dateien unter `node_modules` |
| Background-Mode `remote-notification`, `aps-environment` | vom `expo-notifications`-Plugin gesetzt | `withNotificationsIOS.js:11-12, 31-36`; `app.json:52` |
| Associated Domains / Universal Links | **nicht konfiguriert**, nur Schema `pp` (`app.json:6`); Mail-Links führen bewusst auf die Web-Seite `konto.html`, nicht in die App — stimmig, kein Befund | `nginx-konto.conf:66-72` |
| targetSdk 36 (Play-Frist 31.08.2026) | erfüllt über React Native 0.86 (`targetSdk = "36"`), ohne `expo-build-properties` | `react-native/gradle/libs.versions.toml:3-6`; `TECH.md:42` |
| Edge-to-Edge (Android 15/16) | SDK 57 liefert es standardmäßig; kein Opt-out in `app.json` | — (nur außerhalb am Gerät prüfbar) |
| Adaptive Icon | Vorder-/Hintergrund/Monochrom je 1024×1024, Hintergrundfarbe gesetzt | `app.json:22-27`; `file mobile/assets/*.png` |
| iOS-Symbol ohne Alpha | `icon.png` 1024×1024 RGB; vier Alternativen ebenso | `file` |
| Alternate Icons nur iOS | ja, Client prüft `supportsAlternateIcons` | `app.json:56-76`; `account.tsx:125` |
| Dunkles/getöntes iOS-Symbol | im CHANGELOG versprochen, **nicht konfiguriert** | C-8 |
| Splash | **weiß, ohne Bild** | C-7 |
| `predictiveBackGestureEnabled` | `false` — zulässig, bewusst | `app.json:28` |
| Version / Build-Nummern | `version` 1.0.0 in `app.json:7`; `buildNumber`/`versionCode` kommen aus den Stores (`asc-build-number.py`, `play-version.py`); `eas.json` `appVersionSource: remote` + `autoIncrement` betrifft nur EAS-Builds, die kein Workflow nutzt — kein Konflikt | `eas.json:92,106` |
| Alterseinstufung, Data-Safety-Angaben, Store-Eintrag | nur außerhalb prüfbar; Datenkatalog im README als Vorlage nutzbar | `README.md:197-224` |

---

## Vor-Release-Checkliste

Zeichen: ✔ im Repo erledigt · ✘ im Repo offen · ? nur außerhalb prüfbar

**Auslieferungskette**
- ✔ Actions auf SHA gepinnt, Berechtigungen minimal, keine Geheimnisse im Protokoll
- ✔ Backend-Deploy automatisch mit Test-Gate und Nachher-Prüfung
- ✘ C-4: Verify um Commit-Merkmal erweitern (oder je Migration eine Prüfzeile nachziehen)
- ✘ C-5: `tsc --noEmit` vor Store-Jobs; Test-Gate in `testflight.yml`/`play-internal.yml`
- ✘ C-15: gemeinsame Concurrency-Gruppen je Plattform
- ? Branch-Schutz auf `main` verlangt `tests.yml`
- ? SHA ↔ Tag der sieben Actions stimmt (GitHub-API)
- ? Portainer zieht bei `:latest` tatsächlich neu (Container-Erstellzeit nach dem letzten Lauf vergleichen)

**Store-Texte und Pflichtseiten**
- ✘ C-1: `hinweis` beim Release verpflichtend oder aus CHANGELOG erzeugen; Filter erweitern
- ✘ C-2: Web-Seite zur Kontolöschung
- ✘ C-3: Datenschutzerklärung, Impressum, Support-Adresse als URLs
- ✘ C-8: CHANGELOG-Satz zum dunklen Symbol korrigieren oder `ios.icon` setzen
- ✘ `[Unreleased]` zu `[1.0.0 (xx)]` schließen, sobald die Build-Nummer feststeht (CLAUDE.md, CHANGELOG-Pflicht)
- ? Store-Eintrag, Screenshots, Feature-Grafik, Inhaltsbewertung, Data-Safety (`store-release.md:53-64`)

**App-Konfiguration**
- ✘ C-6: `expo-image-picker` mit deutschem `photosPermission`, `microphonePermission: false`
- ✘ C-7: Splash mit Bild und Markenfarbe
- ✔ Kamera-/Standort-Texte deutsch, `ITSAppUsesNonExemptEncryption`, Push-Plugin, Adaptive Icon, targetSdk 36
- ? Edge-to-Edge und Schalter-Optik auf Android 15/16 am Gerät

**App Review**
- ✘ C-9: Demo-Konto und Review-Notes in `docs/store-release.md` beschreiben
- ? Demo-Konto in der Produktion angelegt, Zugangsdaten außerhalb des Repos hinterlegt
- ? Apple: Schlüssel `7X8W499AAK` widerrufen (alter Befund K-1, seit 14.09. offen)

**Server und Web**
- ✘ C-10: `web/README.md` um `konto.html`/`nginx-konto.conf` ergänzen
- ? `konto.html` und `location /_/` liegen auf dem Server (`curl -sI …/_/`)
- ? SMTP, Absender, deutsche Vorlagen in der Instanz (`deploy.md:212-215`)
- ✘ C-11: Digest-Pin, Sicherungsstrategie dokumentieren
- ? Sicherung von `pb_data` vor dem Release-Deploy

**Dokumentation**
- ✘ C-12: `CLAUDE.md` (Abbild-Weg), `deploy.md` (Sichtbarkeit, Pfadangabe), `TECH.md:186` angleichen

**Ablauf des Releases selbst** (aus `store-release.md:47-79`, geprüft gegen die Workflows — stimmig)
1. `play-internal.yml` mit `probelauf: true` nach jedem Workflow-Umbau
2. `testflight.yml` für die iOS-Testfassung
3. `release.yml`: Version abtippen, `beide`, Freigabe **`draft`** (erste Play-Veröffentlichung), `hinweis` von Hand
4. Play Console: Entwurf prüfen und freigeben; App Store Connect: Version anlegen, Build binden, Review-Notes, einreichen

---

## Geprüft und in Ordnung

- **Pinning und Rechte** aller fünf Workflows (siehe Tabelle). Kein beweglicher Tag mehr.
- **Kein Geheimnis im Arbeitsbaum:** `git ls-files` findet keine `.p8/.p12/.jks/.pem/.mobileprovision`; `git grep` nach Schlüsselblöcken und Token-Mustern trifft nur `upload-play.py:65` (Feldname `private_key`, kein Wert). `.gitignore` (`:9-16, 30-33, 54-55`) und `mobile/.gitignore` (`:12-19, 31, 34`) decken die Muster ab.
- **Geheimnisse kommen aus `secrets.*`**, Dateien werden per `base64 --decode` in Dateien geschrieben, nicht per `echo` ins Protokoll. `dist.p12` wird gelöscht. `WEBHOOK_URL` fehlt → Lauf bricht mit Meldung ab (`deploy.yml:154-157`); `curl -f` macht HTTP-Fehler rot (`:158`).
- **Concurrency** je Workflow ohne `cancel-in-progress` für Deploys und Uploads — richtig, ein angefangener Deploy soll zu Ende laufen (`deploy.yml:31-37`); `tests.yml` bricht veraltete Läufe ab (`:15-17`).
- **Test-Gate im Deploy** über `needs: tests` ohne `always()` (`deploy.yml:78-82`); Begründung gegen `workflow_run` steht im Kopf (`:47-60`) und ist richtig.
- **Vollständigkeitsprüfung** vor dem Push: sechs Hook-Dateien namentlich, Migrationen ≥ 19 (aktuell 20) (`deploy.yml:95-121`).
- **`.dockerignore`** schließt `pb_data/` aus (`:7`) — mit dem konkreten Vorfall als Begründung.
- **Compose-Dateien** driften nicht; Unterschiede sind beabsichtigt und erklärt; keine offenen Ports; `PB_ENCRYPTION_KEY` aus der Umgebung; `TZ` gesetzt; Grenzen für Speicher, CPU und Protokoll; absoluter `pb_data`-Pfad mit Warnung (`docker-compose.portainer.yml:45-51`).
- **`upload-play.py`:** Status-Wächter vor dem ersten Netzzugriff (`:86-89`), 500-Zeichen-Prüfung vor dem Edit (`:123-126`), Edit wird im Fehlerfall und im Probelauf verworfen (`:146-163`), nur `draft`/`completed` (kein Teil-Rollout — bewusst, `:40-43`). Track kommt vom Workflow (`internal` Vorgabe, `production` nur bewusst; `release.yml:364-365` fest `production`).
- **`release-notes.py`:** 480/3900 Zeichen mit Rand zu den Store-Grenzen; Umlaute bleiben erhalten (UTF-8, reproduziert mit „Knöpfe zurück"); Rückfall auf 20 Commits, wenn `SEIT_COMMIT` unbekannt (`:43-49`); `VORGABE` hat Vorrang (`:68-71`). Der Probelauf-Filter aus dem alten H-3 ist wirksam (`play-internal.yml:195-207`) und getestet (`play-vergleichsstand.test.js`).
- **`asc-build-number.py`:** bricht bei nicht-numerischen Nummern ab statt still zu rechnen (`:98-102`), warnt am `limit=200` (`:107-110`). **`play-version.py`:** räumt die Bearbeitung im `finally` auf, ohne den eigentlichen Fehler zu verdecken (`:107-112`).
- **`android-signing.py`:** `findProperty` mit Rückfall, ersetzt nur den Release-Block, ist idempotent (`:35-37`) — reproduziert.
- **Xcode-Wahl** schließt Beta-Installationen aus (ITMS-90111, `testflight.yml:53-59`); `set -o pipefail` vor `| tail` (`:148, 173`); `manageAppVersionAndBuildNumber = false` verhindert, dass Xcode die Nummer überschreibt (`:185`).
- **`.nvmrc`/`engines`/Workflow-Node** stimmig auf 22; `setup-node` in allen Jobs, auch im `pruefung`-Job (altes M-1 behoben, `release.yml:90-94`).
- **Dependabot** eng und begründet gefasst; Ausschlüsse decken die SDK-gebundenen Pakete und PocketBase 0.22.
- **Migrationen additiv**, `1782710000_tighten_read_rules` und `1782690000_store_secret_collection` durch Verify gedeckt.

---

## Unklar / nur außerhalb prüfbar

- Sichtbarkeit des GitHub-Repos (privat/öffentlich) — entscheidet über C-3 und darüber, ob `TEAM_ID`/`ASC_APP_ID`/`owner: r3visor`/`projectId` öffentlich sind (allesamt keine Geheimnisse, aber Adressierung).
- Ob die sieben SHA-Pins zu den kommentierten Versionen gehören.
- Branch-Schutz auf `main` (Pflicht-Checks, Review-Pflicht).
- Welche GitHub-Secrets hinterlegt sind (`PORTAINER_WEBHOOK_URL`, `ASC_*`, `IOS_DIST_P12_*`, `GPLAY_SA_JSON_BASE64`, `ANDROID_*`), ob das Verteilungszertifikat noch gültig ist und ob der alte ASC-Schlüssel `7X8W499AAK` widerrufen wurde.
- Ob Portainer bei `:latest` zuverlässig neu zieht (Container-Erstellzeit nach dem letzten `deploy.yml`-Lauf).
- Ob `konto.html` und `nginx-konto.conf` auf dem Server liegen (`/opt/stacks/plietsche-web/site/`) und ob `appUrl` in PocketBase auf `https://xn--plietsche-plnn-rsb.de` zeigt.
- SMTP-Einstellungen, deutsche Vorlagen, Sicherungsplan (PocketBase-Backups) in der laufenden Instanz.
- Ob das Basisabbild `muchobien/pocketbase:0.22.21` als Root läuft.
- Store-Formulare: Alterseinstufung, Data-Safety, Store-Eintrag, Screenshots, Demo-Konto, Datenschutz-URL — alles in App Store Connect bzw. Play Console.
- Wie viele Builds in App Store Connect liegen (Grenze `limit=200`, `asc-build-number.py:104-110`).
- Edge-to-Edge-Darstellung und Splash am echten Android-16-Gerät.
- Ob die überstimmten Metro-Versionen (`overrides`) mit `expo@57.0.22` noch zusammenpassen — `npx expo install --check` wurde hier nicht ausgeführt (kein `npm install` im Auftrag).

---

*Es wurde kein Projektcode verändert. Wegwerf-Dateien liegen ausschließlich unter dem Scratchpad-Verzeichnis `ci-deploy/`.*
