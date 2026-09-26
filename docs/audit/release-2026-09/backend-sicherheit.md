# Release-Audit 2026-09 — Backend-Sicherheit und Datenschutz

| | |
|---|---|
| Datum | 26.09.2026 |
| Geprüfter Stand | Commit `06b68dc` (`feat(app): Symbolauswahl bleibt als Funktion`), Branch `main` |
| Umfang | `pocketbase/pb_migrations/` (19 Migrationen), `pocketbase/pb_hooks/` (4 Hooks, 2 Bibliotheken), `pocketbase/mail-vorlagen.py`, `pocketbase/Dockerfile`, beide Compose-Dateien, `web/` (Landingpage, Konto-Seite, nginx), Konto-Flüsse in `mobile/lib/hooks/useAuth.ts` und den zugehörigen Screens, Geheimnisse im Repo und in der Git-Historie, Datenschutz-Angaben in `README.md`/`TECH.md` |
| Vorgehen | Jede Migration in Reihenfolge gelesen und den Endstand der Regeln je Sammlung abgeleitet; Hooks und Web-Skripte auf Authentifizierung, Autorisierung, Eingabevalidierung und Filter-Injektion durchgesehen; die vier gefährlichsten Fälle mit `tests/harness.js` als Probetests nachgestellt (10 Proben, alle wie erwartet, Datei nach dem Lauf gelöscht); Versionsstand von PocketBase gegen dessen Changelog geprüft; Git-Historie stichprobenartig auf Geheimnis-Muster durchsucht (nur gezählt, nichts ausgegeben) |
| Testsuite des Repos | 470 Tests in 22 Dateien, alle grün |

> **Code-Stand, nicht Produktion.** Es gab für dieses Audit keinen Zugang zur laufenden Instanz. Alle Aussagen beschreiben, was der Code im Repo tut. Ob die Instanz unter `pb.xn--plietsche-plnn-rsb.de` genau diesen Stand fährt und welche Einstellungen dort *außerhalb* des Repos gesetzt sind (Regeln der `users`-Sammlung, `appUrl`, SMTP, Log-Aufbewahrung, Backups), lässt sich von hier nicht sagen. Die Liste am Ende („Auf der Produktion nachzumessen") ist deshalb Teil des Befunds, nicht Anhang — siehe `CLAUDE.md`, „Ein Fix im Repo ist kein Fix auf dem Server".

Kennzeichnung je Befund: **reproduziert** = mit einem Probetest gegen den Hook oder die Migrationsdatei gezeigt; **aus Code gelesen** = aus der Quelle abgeleitet, ohne Ausführung.

---

## Zusammenfassung

Der Stand ist deutlich besser als am 14.09.: Türgeheimnis ausgelagert, Besuche nicht mehr fälschbar, Aktivitätsprofile und fremde Einreichungen geschlossen, Push-Token vor dem Filter geprüft, Koordinaten werden nicht mehr gespeichert, und die neuen Konto-Flüsse (Bestätigungsmail, Passwort-Reset, Kontolöschung) sind sauber gebaut — Passwortprüfung vor dem Löschen, Token nur im URL-Fragment, keine Nutzereingabe in `innerHTML`. Die eigenen Routen bauen keinen Filter mehr aus ungeprüften Nutzerwerten.

Zwei Dinge sind trotzdem **KRITISCH** und sollten vor dem Release behoben werden. Erstens: Die Registrierung übernimmt `role`, `points_total` und `streak_weeks` aus dem Anfragekörper — der Hook setzt nur Standardwerte, wenn nichts mitkommt, und die `createRule` der `users`-Sammlung (am 14.09. auf der Instanz als Leerstring gemessen) begrenzt die Felder nicht. Wer sich registriert, kann sich als `admin` mit beliebigem Punktestand anlegen; die Instanz kennt für `users` keine versionierte Regel. Zweitens: Bei „Verbleibt bei mir" ist die Abholadresse Pflichtfeld und landet in `items.location`. Sobald das Teil freigegeben ist, darf es jedes angemeldete Konto lesen — inklusive Adresse. Die App blendet das Feld nur aus. Der Fix vom 14.09. (Z-3) hat die *pending*-Einreichungen geschlossen, die freigegebenen externen Teile nicht.

**HOCH** sind der Versionsstand (PocketBase 0.22.21 ist 34 Patch-Stände hinter dem letzten 0.22.55; darunter der Backport für CVE-2024-45338 und ein Drossel für Filter-Anfragen) und die fehlende Datenschutzerklärung: weder App noch Webseite verlinken eine, und die Angaben in `README.md` sind in zwei Punkten falsch („keine Adresse", „Koordinaten werden gespeichert"). Beides brauchen Apple und Google für die Freigabe.

**Release-Empfehlung für diesen Bereich: Nicht freigeben, bevor S-1 und S-2 behoben und auf der Instanz nachgemessen sind.** S-1 ist eine Migration plus zwei Zeilen im Hook, S-2 eine Regeländerung oder ein zweites Feld — beides ist an einem Tag zu schaffen. S-3 (PocketBase-Update) und S-5 (Datenschutzerklärung) gehören in denselben Release, weil die Store-Prüfung daran hängt.

---

## Regel-Tabelle je Sammlung (Endstand nach allen 19 Migrationen)

Notation: `auth` = `@request.auth.id != ""`; `owner|admin` = `user = @request.auth.id || @request.auth.role = "admin"`; `staff` = `@request.auth.role = "volunteer" || @request.auth.role = "admin"`; `admin` = `@request.auth.role = "admin"`; `null` = nur Superuser/Hooks; `''` = offen für alle, auch unangemeldet. In Klammern die Migration, die den Wert zuletzt gesetzt hat (Kurzform: `init` = `1700000000_init_schema.js`).

| Sammlung | listRule | viewRule | createRule | updateRule | deleteRule |
|---|---|---|---|---|---|
| **users** | *keine Migration* — PocketBase-Standard `id = @request.auth.id` (14.09. auf der Instanz gemessen) | dito | *keine Migration* — Standard `''` (gemessen) | *keine Migration* — Standard `id = @request.auth.id` (gemessen) | dito |
| items | `(auth && (status = "approved" \|\| status = "" \|\| created_by = @request.auth.id)) \|\| staff` (`1782710000:82-84,102`) | dito (`1782710000:103`) | `auth` (`1700000600:33`) | `staff` (`1700000600:34`) | `admin` (`init:50`) |
| campaigns | `auth` (`init:109`) | `auth` (`init:110`) | `admin` (`init:111`) | `admin` (`init:112`) | `admin` (`init:113`) |
| visits | `owner\|admin` (`init:138`) | `owner\|admin` (`init:139`) | `null` (`1782710000:93`) | `null` (`init:141`) | `null` (`init:142`) |
| points_log | `owner\|admin` (`init:170`) | `owner\|admin` (`init:171`) | `null` (`init:172`) | `null` (`init:173`) | `null` (`init:174`) |
| badges | `auth` (`init:200`) | `auth` (`init:201`) | `admin` (`init:202`) | `admin` (`init:203`) | `admin` (`init:204`) |
| user_badges | `owner\|admin` (`init:239`) | `owner\|admin` (`init:240`) | `null` (`init:241`) | `null` (`init:242`) | `null` (`init:243`) |
| push_devices | `owner\|admin` (`init:268`) | `owner\|admin` (`init:269`) | `user = @request.auth.id` (`init:270`) | `user = @request.auth.id` (`init:271`) | `user = @request.auth.id` (`init:272`) |
| push_messages | `admin` (`init:296`) | `admin` (`init:297`) | `admin` (`init:298`) | `admin` (`init:299`) | `admin` (`init:300`) |
| store | `auth` (`1782690000:87`) | `auth` (`1782690000:88`) | `admin` (`init:333`) | `admin` (`init:334`) | `admin` (`init:335`) |
| needs | `auth` (`1700000700:61`) | `auth` (`1700000700:62`) | `staff` (`1700000700:63`) | `staff` (`1700000700:64`) | `staff` (`1700000700:65`) |
| action_counts | `owner\|admin` (`1782710000:97`) | `owner\|admin` (`1782710000:98`) | `null` (`1700001000:23`) | `null` (`1700001000:24`) | `null` (`1700001000:25`) |
| store_secrets | `null` (`1782690000:44`) | `null` (`:45`) | `null` (`:46`) | `null` (`:47`) | `null` (`:48`) |

### Bewertung je Sammlung

**Kann ein angemeldeter Besucher fremde Daten lesen?**

- `users`: nein, sofern der gemessene Standard steht — `listRule`/`viewRule` `id = @request.auth.id` gibt nur das eigene Konto heraus. Versteckte Felder: PocketBase liefert `passwordHash` und `tokenKey` nie aus; `email` fremder Konten nur bei `emailVisibility = true` (Standard `false`). Alle selbst angelegten Felder (`init:18-38`: `name`, `role`, `avatar`, `points_total`, `streak_weeks`, `streak_last_visit`, `streak_grace_until`, `onboarding_complete`, vier `push_*_enabled`) sind **nicht** `hidden` — keine Migration setzt das Attribut (`grep -rn hidden pocketbase/` ohne Treffer). Sie sind heute nur deshalb nicht fremd lesbar, weil die (unversionierte) Regel es verhindert. → S-4.
- `items`: **ja, teilweise** — freigegebene Teile mit `stays_external` tragen in `location` die Abholadresse (→ S-2); `created_by` (Nutzer-ID) fremder freigegebener Teile ist sichtbar, der Expand auf `users` scheitert an deren `viewRule` (am 14.09. gemessen).
- `visits`, `points_log`, `user_badges`, `action_counts`, `push_devices`: nein — Besitzprüfung.
- `campaigns`, `badges`, `needs`, `store`: nur Betriebsdaten, keine Personendaten. `badges` gibt geheime Abzeichen samt Name/Schwelle heraus (Z-8, unverändert, NIEDRIG).
- `push_messages`, `store_secrets`: nein.

**Kann ein Besucher punkte-/abzeichenrelevante Daten schreiben?**

- `users.points_total`/`streak_weeks`/`role` per Update: nein — `defaults.pb.js:26-44` dreht jede Änderung zurück (reproduziert, Probe S-4). **Per Registrierung: ja** (→ S-1).
- `visits`, `points_log`, `user_badges`, `action_counts`: nein (`createRule null`).
- `items.points`: Besucher nein (`updateRule staff`); beim Anlegen kann ein Besucher `points` mitschicken (`defaults.pb.js:69` setzt nur den Rückfall 30), das Teil ist aber `pending` und erst nach Freigabe scannbar (`scan.pb.js:131-132`) — die Freigabe durch das Team ist die Prüfung. Vertretbar, sollte dem Team aber bewusst sein (der Punktwert kommt vom Einreichenden).
- `store`, `campaigns`, `badges`: nein (`admin`).

**Kann ein Helfer (`volunteer`) mehr als er soll?**

- Er kann Teile anlegen (sofort `approved`, `defaults.pb.js:79-81`), Punktwert frei setzen (kein Maximum, `init:84` nur `min: 0`) und das Teil selbst scannen → eigene Punkte in beliebiger Höhe (→ S-9). Aktionen (`campaigns`) und Abzeichen bleiben `admin`. `needs` darf er löschen (Z-6, unverändert).
- Rollen vergeben: **nirgends in der App**. `grep -rn "role:" mobile/` findet nur `role: 'visitor'` in `useAuth.ts:41`. Rollen werden im PocketBase-Admin-UI (Superuser) gesetzt. Der Hook lässt einen Admin fremde `role`-Werte ändern (`defaults.pb.js:39`), die `updateRule` (`id = @request.auth.id`) lässt ihn aber gar nicht an fremde Datensätze — der Zweig ist heute tot.

**Push:**

- `push_devices`: fremde Token weder lesbar noch löschbar (Besitzprüfung auf allen fünf Regeln; `/api/pp/push/unregister` filtert zusätzlich `user = auth.id`, `push.pb.js:62`).
- `push_messages`: `createRule admin` — kein Besucher, kein Helfer kann eine Nachricht an alle auslösen; `api.ts:81-90` (`sendPushNow`) läuft gegen diese Regel.

---

## Befund-Tabelle

| ID | Kurztitel | Schwere | Nachweis |
|---|---|---|---|
| S-1 | Registrierung übernimmt `role`, `points_total`, `streak_weeks` aus dem Anfragekörper | **KRITISCH** | reproduziert (Hook); Regelstand aus Messung 14.09. |
| S-2 | Abholadresse externer Teile nach Freigabe für alle Angemeldeten lesbar | **KRITISCH** | reproduziert (Regelauswertung) |
| S-3 | PocketBase 0.22.21: 34 Patch-Stände hinter 0.22.55, CVE-2024-45338 ungefixt, keine Drossel | **HOCH** | aus Code gelesen, gegen PocketBase-Changelog geprüft |
| S-4 | Regeln der `users`-Sammlung nicht versioniert | **HOCH** | aus Code gelesen |
| S-5 | Keine Datenschutzerklärung in App und Web; README-Angaben falsch | **HOCH** | aus Code gelesen |
| S-6 | Geofence: Koordinaten ohne Typprüfung, `NaN` gilt als „im Laden"; ohne Koordinaten keine Prüfung | **MITTEL** | reproduziert |
| S-7 | Kein Rate-Limit: Login, Passwort-Reset, `/api/pp/scan`, Admin-UI öffentlich | **MITTEL** | aus Code gelesen |
| S-8 | Domain-Schreibweisen: `appUrl`-Beispiel und App-Rückfall zeigen auf nicht registrierte Hosts | **MITTEL** | aus Code gelesen, DNS-Stichprobe |
| S-9 | Helfer setzt `items.points` unbegrenzt und scannt selbst | **MITTEL** | aus Code gelesen |
| S-10 | Alt-Koordinaten in `visits.gps_lat/gps_lng` bleiben gespeichert | **MITTEL** | aus Code gelesen |
| S-11 | Konto-Seite ohne Security-Header (CSP, Referrer-Policy, X-Frame-Options, nosniff) | **MITTEL** | aus Code gelesen |
| S-12 | Container läuft als root; Basisimage ohne `USER` | **MITTEL** | aus Code gelesen (Basisimage: aktuelles Dockerfile des Anbieters) |
| S-13 | `TECH.md` behauptet verschlüsselte Datenbank; Backup-Konzept nicht im Repo | **MITTEL** | aus Code gelesen |
| S-14 | Kontolöschung: Adresse und Foto eingereichter Teile bleiben; CHANGELOG-Text unvollständig | **NIEDRIG** | aus Code gelesen |
| S-15 | Altes Türgeheimnis in der Git-Historie eines öffentlichen Repos | **NIEDRIG** | aus Historie gelesen (Wert nicht ausgegeben) |
| S-16 | Push-Token-Übernahme durch `register`; Kommentar zur Kategorie veraltet | **NIEDRIG** | aus Code gelesen |
| S-17 | Übertrag aus dem 14.09.: Z-5, Z-6, Z-7, Z-8 unverändert offen | **NIEDRIG** | aus Code gelesen |

---

## Befunde im Einzelnen

### S-1 [KRITISCH] Registrierung übernimmt `role`, `points_total` und `streak_weeks` aus dem Anfragekörper

**Beschreibung.** `POST /api/collections/users/records` ist die Registrierung. Der Hook `onRecordBeforeCreateRequest` in `pocketbase/pb_hooks/defaults.pb.js:6-19` setzt Standardwerte **nur, wenn nichts mitgeschickt wurde**:

```js
if (!r.get('role')) r.set('role', 'visitor');            // :8
if (r.get('points_total') == null) r.set('points_total', 0);  // :9
if (r.get('streak_weeks') == null) r.set('streak_weeks', 0);  // :10
```

Ein Anfragekörper `{ email, password, passwordConfirm, role: "admin", points_total: 999999 }` geht unverändert durch. Der Schreibschutz in `defaults.pb.js:26-44` greift nur bei **Updates**. Auf Regelebene begrenzt nichts die Felder: Die `createRule` der `users`-Sammlung wird von keiner Migration gesetzt (`grep -rn "users" pocketbase/pb_migrations/*.js | grep -i rule` ohne Treffer) und wurde am 14.09. auf der Instanz als `''` gemessen (`docs/audit/ABNAHME.md:336`) — offen, ohne Feldbeschränkung.

`tests/defaults.test.js:53-73` dokumentiert das Verhalten ausdrücklich („laesst einen mitgeschickten Punktestand stehen — der Schutz liegt in der createRule") und verweist auf eine `createRule`, die es im Repo nicht gibt. `tests/defaults.test.js:39-42` („behaelt eine bereits gesetzte Rolle") schreibt die Übernahme der Rolle sogar als gewünschtes Verhalten fest.

**Fundstellen.** `pocketbase/pb_hooks/defaults.pb.js:8-10`; keine Regel-Migration für `users`; `docs/audit/ABNAHME.md:333-339` (gemessene Regeln); `tests/defaults.test.js:39-42, 53-73`.

**Auswirkung.** Jede Person kann sich ohne weitere Voraussetzung als `admin` registrieren. Damit: Punktwerte und Ränge für alle ändern (`store`), Aktionen mit ×3 anlegen, Abzeichen anlegen, Push an alle Geräte senden (`push_messages`), alle Teile löschen, alle Besuche/Punkteverläufe/Abzeichen **aller** Personen lesen (`owner|admin`-Regeln), fremde Push-Token lesen. Ohne `admin`, nur mit `points_total`: Rang und Rangliste manipuliert. Der Befund Z-1 vom 14.09. („entwarnt") betraf allein das *Lesen* fremder Konten; die Schreibseite der Registrierung wurde nicht gemessen.

**Nachweis (reproduziert).** Probetest gegen `defaults.pb.js` mit `tests/harness.js`, `fireRecordHook('beforeCreate', 'users', …, { authRecord: null })`:

- `{ role: 'admin' }` → `role` bleibt `admin`.
- `{ points_total: 999999, streak_weeks: 52 }` → beide Werte bleiben stehen.
- Gegenprobe ohne Angaben → `visitor`, `0`, `0`.

Die Regelebene ist nicht im Harness prüfbar; sie stützt sich auf die Messung vom 14.09. (siehe „Auf der Produktion nachzumessen", Punkt 1).

**Empfehlung.**
1. Im Hook unbedingt setzen, nicht bedingt: `r.set('role', 'visitor'); r.set('points_total', 0); r.set('streak_weeks', 0); r.set('streak_last_visit', ''); r.set('streak_grace_until', '')` — es gibt keinen legitimen Client, der bei der Registrierung etwas anderes schickt (`useAuth.ts:36-42` schickt `role: 'visitor'`, kann entfallen). Test in `tests/defaults.test.js` umkehren (verbotener Fall: `role: 'admin'` → `visitor`).
2. Zusätzlich die Regel versionieren (→ S-4), z. B. `createRule: '@request.data.role = "" || @request.data.role = "visitor"'` — die zweite Verteidigungslinie, wie sie bei `points_total` per Update schon besteht.
3. Auf der Instanz prüfen, ob es bereits Konten mit `role != visitor` gibt, die niemand angelegt hat (Punkt 1 der Messliste).

### S-2 [KRITISCH] Abholadresse externer Teile ist nach Freigabe für alle Angemeldeten lesbar

**Beschreibung.** Beim Einreichen mit „Verbleibt bei mir" ist der Standort Pflicht (`mobile/app/(visitor)/items/new.tsx:81-88, 300`), im Code als „Abholadresse" bezeichnet, und wird in `items.location` gespeichert (`api.ts:126`). Die Leseregel nach `1782710000_tighten_read_rules.js:82-84` lautet:

```
(@request.auth.id != "" && (status = "approved" || status = "" || created_by = @request.auth.id))
  || @request.auth.role = "volunteer" || @request.auth.role = "admin"
```

Sobald das Team das Teil freigibt (`status = "approved"`), darf jedes angemeldete Konto den vollständigen Datensatz lesen — PocketBase-Regeln wirken auf Datensätze, nicht auf Felder (so steht es zu Recht in `1782690000_store_secret_collection.js:12-16`). Die App blendet `location` aus (`mobile/app/(visitor)/items/[id].tsx:124-125`: „ist INTERN und wird einem normalen Nutzer NIE gezeigt") — das ist dieselbe Oberflächen-Filterung, die der Befund Z-3 vom 14.09. für *pending*-Teile bereits als unzureichend erkannt hat (`1782710000:45-52`). Die Migration hat den `pending`-Fall geschlossen und den `approved`-Fall offen gelassen; gerade externe Teile sind aber dafür gedacht, im Laden-Tab **sichtbar** zu sein (CHANGELOG 1.0.0: „Extern gelagerte Teile im Laden sichtbar").

**Fundstellen.** `pocketbase/pb_migrations/1782710000_tighten_read_rules.js:82-84`; `mobile/app/(visitor)/items/new.tsx:81-88, 300-318`; `mobile/lib/api.ts:126`; `mobile/app/(visitor)/items/[id].tsx:124-125`; `README.md:214` („Wer ein Teil selbst in den Laden bringt, gibt keine Adresse an" — für externe Teile falsch).

**Auswirkung.** `GET /api/collections/items/records?filter=stays_external=true` mit einem beliebigen Besucherkonto liefert Privatadressen der Einreichenden (mit dem Teil als Anlass: „Kinderwagen, bei Fam. X, Deichstr. 4"). Das ist eine Offenlegung personenbezogener Daten gegenüber Dritten ohne Rechtsgrundlage. Zusätzlich bleibt die Adresse nach einer Kontolöschung im Teil stehen (→ S-14).

**Nachweis (reproduziert).** Probetest: `1782710000_tighten_read_rules.js` in der nachgebauten Migrationsumgebung aus `tests/read-rules-migration.test.js` ausgeführt und die resultierende `items.listRule`/`viewRule` mit dem dortigen Auswerter `darf()` gegen den Datensatz `{ status: 'approved', created_by: 'u_fremd', stays_external: true, location: 'bei Fam. X, Deichstr. 4' }` und ein fremdes Besucherkonto geprüft → **lesbar** (`true`). Gegenproben: dasselbe Teil als `pending` → nicht lesbar; unangemeldet → nicht lesbar.

**Empfehlung.** Zwei Wege, der zweite ist der saubere:
1. Regel: `location` nur für Team — geht nicht feldweise. Also die Adresse aus `items` herausnehmen: eigenes Feld/Sammlung `item_contacts` (`item`, `address`, Regeln `staff`), `items.location` für externe Teile leer lassen oder nur „extern" eintragen. Additiv (neues Feld, alte Apps lesen weiter `location`), Migration kopiert bestehende Adressen um und leert das Altfeld — dasselbe Muster wie beim Türgeheimnis.
2. Bis dahin als Sofortmaßnahme: `stays_external`-Teile aus dem `approved`-Zweig der Regel ausnehmen (`… && stays_external = false …`) — dann verschwinden sie aus dem Laden-Tab für Besucher; das ist ein Funktionsverlust, aber kein Datenschutzverstoß.
3. `README.md:214` und die Datenschutzangaben (→ S-5) korrigieren.

### S-3 [HOCH] PocketBase 0.22.21 ist veraltet — CVE-2024-45338 ungefixt, keine Drossel gegen Filter-Anfragen

**Beschreibung.** `pocketbase/Dockerfile:16` und `docker-compose.yml:15` pinnen `ghcr.io/muchobien/pocketbase:0.22.21`. Der 0.22-Zweig von PocketBase endete bei **0.22.55**. Zwischen 0.22.21 und 0.22.55 liegen laut PocketBase-Changelog (`CHANGELOG_16_22.md`, abgerufen 26.09.2026) unter anderem:

- **0.22.29:** Backport des Fixes für **CVE-2024-45338** (`golang.org/x/net`, HTML-Parsing; PocketBase nutzt es für die HTML→Text-Umwandlung der Mails).
- **0.22.25:** „randomized throttle on failed filter list requests" — eine Drossel gegen Seitenkanal-Angriffe über Filterausdrücke, von Sicherheitsforschern angemahnt.
- Diverse Fehlerbehebungen bei Backups und Logs.

Die Begründung im Dockerfile („Migrationen und Hooks sind gegen genau diese Version geschrieben", `:12-15`) ist für Minor-Sprünge richtig, für Patch-Stände nicht: 0.22.x ist API-kompatibel. Dependabot (`.github/dependabot.yml:16-75`) überwacht `npm` und `github-actions`, **nicht `docker`** — der Basisimage-Stand veraltet unbemerkt.

Ein Rate-Limiter ist in PocketBase erst ab 0.23 enthalten; in 0.22 gibt es keinen (→ S-7).

**Fundstellen.** `pocketbase/Dockerfile:16`; `docker-compose.yml:15`; `docker-compose.portainer.yml:28` (eigenes Abbild, baut auf dem gepinnten auf); `.github/dependabot.yml`.

**Auswirkung.** Bekannte Schwachstelle in einer Bibliothek, die im Mailpfad läuft; fehlende Härtung gegen Ausforschung über Filter. Für Store-Fragebögen („aktuelle Sicherheitsupdates") heikel.

**Nachweis.** Aus Code gelesen; Versionsvergleich gegen den offiziellen Changelog.

**Empfehlung.** Auf **0.22.55** heben (Patch, ohne Migrations-Risiko; Testsuite und `deploy-verify.py` laufen lassen). Mittelfristig 0.23+ planen — dort gibt es Rate-Limits und feldweise `hidden`-Regeln, aber die Migrations-API ändert sich (eigene Umstellung, kein Nebenbei). Dependabot um `package-ecosystem: docker`, `directory: /pocketbase` ergänzen.

### S-4 [HOCH] Regeln der `users`-Sammlung sind nicht versioniert

**Beschreibung.** Keine der 19 Migrationen setzt eine Regel auf `users`; `1700000000_init_schema.js:12-40` fügt nur Felder hinzu. Der am 14.09. gemessene Stand (`ABNAHME.md:333-339`) ist der PocketBase-Standard, aber er steht nirgends im Repo: Ein Klick im Admin-UI ändert ihn unbemerkt, eine Neuinstallation hat ihn oder nicht, kein Review sieht ihn, `deploy-verify.py` prüft ihn nicht (`.github/scripts/deploy-verify.py`, PRUEFUNGEN enthält `users` nicht). S-1 hängt genau an dieser Regel. Der 14.09. hat den Befund (Z-1) entwarnt und die Versionierung als „eigenen Punkt" offen gelassen (`ABNAHME.md:358-361`); er ist offen geblieben.

**Fundstellen.** `pocketbase/pb_migrations/*.js` (kein Treffer); `.github/scripts/deploy-verify.py` (keine `users`-Prüfung).

**Auswirkung.** Der einzige Schutz gegen das Lesen fremder E-Mail-Adressen, Namen und Punktestände ist eine Einstellung, die niemand im Repo sieht.

**Empfehlung.** Migration `…_users_rules.js`, die die fünf Regeln explizit setzt (Standardwerte plus die `createRule`-Beschränkung aus S-1) — idempotent, additiv. Test nach dem Muster `tests/read-rules-migration.test.js`. In `deploy-verify.py` eine Prüfung ergänzen: `GET /api/collections/users/records` unangemeldet → 200 mit `totalItems: 0` (die Falle mit 200 statt 403 ist dort schon beschrieben).

### S-5 [HOCH] Keine Datenschutzerklärung in App und Web; README-Angaben falsch

**Beschreibung.** `grep -rn -i 'datenschutz|privacy|impressum' mobile/app mobile/components mobile/lib web/` liefert **keinen Treffer**. Die App hat keinen Link, die Registrierung (`mobile/app/(auth)/register.tsx`) keinen Hinweis, die Landingpage `web/index.html` weder Impressum noch Datenschutz. Die einzige Datenschutz-Prosa steht in `README.md:186-212` — im Repo, nicht für Nutzer:innen erreichbar — und ist in zwei Punkten falsch:

- `README.md:204`: „Beim Check-in: Koordinaten und Abstand zum Laden" — Koordinaten werden seit `23c5d65` (16.09.) nicht mehr gespeichert (`lib/points.js:325-329`).
- `README.md:214`: „Wer ein Teil selbst in den Laden bringt, gibt keine Adresse an" — für „Verbleibt bei mir" ist die Adresse Pflicht (S-2).
- Nicht genannt: Geräte-Token als Personendatum ist genannt, aber nicht die Server-Logs (IP-Adresse, Nutzer-ID je Anfrage, Aufbewahrung nach PocketBase-Einstellung), nicht die Fotos eingereichter Teile als mögliche Personendaten, nicht das Mindestalter.

`docs/store-release.md:60` nennt die Datenschutz-URL selbst als Voraussetzung für Google Play. Apple verlangt zusätzlich die Kontolöschung *in der App* — die ist vorhanden (`account.tsx:465-528`).

**Verarbeitete personenbezogene Daten laut Schema** (für die Erklärung):

| Sammlung | Felder |
|---|---|
| `users` | E-Mail, Name, Avatar-Foto, Rolle, Punktestand, Serie (`streak_weeks`, `streak_last_visit`, `streak_grace_until`), Onboarding, vier Push-Einwilligungen, `verified`; PocketBase-intern `username`, `passwordHash`, `tokenKey`, `lastResetSentAt`, `lastVerificationSentAt` |
| `visits` | Nutzer, Zeitpunkt, Teilezahl, **`gps_lat`/`gps_lng` (Altbestand, → S-10)**, `gps_distance_m` (gerundeter Abstand), Aktion, Punkte |
| `points_log` | Nutzer, Zeitpunkt, Punkte, Art, Bezeichnung (Titel des mitgenommenen Teils im Klartext, `scan.pb.js:152-153`) |
| `user_badges`, `action_counts` | Nutzer, Fortschritt/Teilnahmezahl |
| `push_devices` | Nutzer, Expo-Token, Plattform, `last_seen` |
| `items` | `created_by`, `location` (**Abholadresse bei externen Teilen**), Foto, Notiz |
| PocketBase `_logs` | IP-Adresse, User-Agent, Auth-ID, Pfad je Anfrage; Aufbewahrung nur in den Instanz-Einstellungen |

**Fundstellen.** `README.md:186-212`; `docs/store-release.md:56-61`; `web/index.html:185-188` (Footer ohne Impressum/Datenschutz); `mobile/app/(auth)/register.tsx`.

**Auswirkung.** Informationspflicht (Art. 13 DSGVO) nicht erfüllt; Store-Freigabe scheitert an der fehlenden URL; Fragebogen „Datensicherheit"/„App Privacy" lässt sich nicht wahrheitsgemäß ausfüllen, solange S-2 und S-10 offen sind.

**Nachweis.** Aus Code gelesen.

**Empfehlung.** Datenschutzerklärung als `web/datenschutz.html` (Verantwortlicher = Kirchengemeinde als Betreiber, nicht die Privatadresse aus `README.md:190-192`), verlinkt aus `web/index.html`, aus der Registrierung und aus Konto → Profil; Mindestalter festlegen (für Kirchengemeinde-Angebote üblich 16, sonst Einwilligung der Eltern) und in Registrierung abfragen oder erklären; README-Absatz korrigieren oder auf die Erklärung verweisen. Aufbewahrungsfrist für Logs und Löschkonzept (S-14) hineinschreiben.

### S-6 [MITTEL] Geofence: keine Typprüfung der Koordinaten, `NaN` gilt als „im Laden"; ohne Koordinaten keine Prüfung

**Beschreibung.** `scan.pb.js:44-45` übernimmt `gps_lat`/`gps_lng` ungeprüft. `lib/points.js:685-691` prüft nur `== null`; alles andere geht in `distanceM()`. Bei Zeichenketten ergibt Haversine `NaN`, und `NaN > radius` ist `false` → der Check-in geht durch, `visit.gps_distance_m` wird `Math.round(NaN)` = `NaN` (`points.js:329`). Ohne Koordinaten findet **keine** Prüfung statt (`:686`) — bewusst so entschieden (`scan.tsx:34-41`: nach 3 s ohne GPS wird ohne Koordinaten gescannt; `openapi.yaml:115-118` sagt es zu).

Ehrliche Einordnung, was gegen einen Client mit gefälschtem GPS möglich ist: **nichts Serverseitiges.** Koordinaten kommen vom Client; wer sie fälschen kann, kann sie auch weglassen. Die einzige Prüfung, die trägt, ist der Türcode — ein statischer QR-Aushang (`store_secrets.checkin_qr_secret`, 32 Zufallszeichen). Wer ihn einmal fotografiert hat, kann von überall täglich einchecken (Replay), bis er rotiert wird; eine Rotation ist nirgends vorgesehen (kein Cron, kein Admin-Knopf). Das ist eine bewusste Abwägung für einen Gemeindeladen und als solche vertretbar — sie sollte aber benannt sein, und die Fehlerfälle sollten nicht *zusätzlich* Löcher öffnen.

Zeitvergleich: `qr === doorSecret` (`scan.pb.js:84`) ist kein konstantzeitiger Vergleich; bei 32 Zufallszeichen über Netz praktisch nicht ausnutzbar (Hygiene). Fehlermeldungen: Ein falscher Türcode fällt in den Teile-Zweig und liefert `404 Unbekannter QR-Code` — verrät nichts über das Geheimnis (reproduziert).

**Fundstellen.** `pocketbase/pb_hooks/scan.pb.js:44-45, 84, 87, 137`; `pocketbase/pb_hooks/lib/points.js:685-691, 329`; `mobile/app/scan.tsx:34-58`.

**Auswirkung.** Ein Client kann mit `gps_lat: "x"` den Geofence auch dann passieren, wenn er Koordinaten schickt; ein `NaN` in einem Zahlenfeld kann beim Speichern in PocketBase scheitern (dann 500 statt Check-in). Der Replay des Türcodes ist der eigentliche, hingenommene Schwachpunkt.

**Nachweis (reproduziert).** Probe gegen `scan.pb.js`: Berlin-Koordinaten → `400 Du bist nicht im Laden` (Gegenprobe); `gps_lat: 'abc', gps_lng: 'def'` → `200`, `type: checkin`, `points: 10`, `visits[0].gps_distance_m` ist `NaN`; ohne Koordinaten → `200`, `points: 10`.

**Empfehlung.** `Number.isFinite(lat) && Number.isFinite(lng)` verlangen, sonst `400`; Wertebereich (−90…90 / −180…180) prüfen. Rotation des Türcodes vorsehen (Admin-Knopf oder monatlicher Cron, neuer Aushang) und dokumentieren, dass der Code der eigentliche Schutz ist. Optional: Check-in nur innerhalb der Öffnungszeiten (`store.hours_json` liegt vor) — das nimmt dem Replay von zu Hause den größten Teil der Wirkung.

### S-7 [MITTEL] Kein Rate-Limit — Login, Passwort-Reset, Scan und Admin-UI

**Beschreibung.** PocketBase 0.22 hat keinen Rate-Limiter (erst 0.23). Im Repo gibt es keine Traefik-Middleware (`docker-compose.portainer.yml:75-78`: nur Router und Port). Damit sind unbegrenzt: `auth-with-password` (Passwort-Raten), `request-password-reset`/`request-verification` (Mail-Flut an fremde Adressen — die Route nimmt jede Adresse an, `useAuth.ts:83-85`; PocketBase drosselt nur je Konto über `lastResetSentAt`), `/api/pp/scan` (Raten des Türcodes — bei 32 Zufallszeichen aussichtslos, aber Last), und das Admin-UI unter `/_/` auf dem PocketBase-Host (Superuser-Login öffentlich erreichbar).

**Fundstellen.** `docker-compose.portainer.yml:75-78`; `pocketbase/pb_hooks/scan.pb.js:35-42`.

**Empfehlung.** Traefik `ratelimit`-Middleware auf dem Router (z. B. 30/min je IP, Burst 60) und `/_/` auf dem PB-Host per IP-Allowlist oder Basic-Auth-Middleware absichern; oder S-3 zum Anlass nehmen und mit 0.23+ die eingebauten Limits nutzen.

### S-8 [MITTEL] Drei Domain-Schreibweisen; zwei davon lösen nicht auf

**Beschreibung.** Im Repo stehen nebeneinander: `pb.xn--plietsche-plnn-rsb.de` (Compose-Labels, `web/konto.html:116`, Workflows, `openapi.yaml:76` — **löst auf**), `pb.plietschepluenn.de` (Rückfall in `mobile/lib/pb.ts:23`, wenn `EXPO_PUBLIC_PB_URL` fehlt — **löst nicht auf**, DNS-Stichprobe 26.09.), `plietsche-pluenn.de` (Kommentar zum `appUrl`-Beispiel in `pocketbase/mail-vorlagen.py:13-15` — **löst nicht auf**). Die Store-Workflows setzen die URL korrekt (`testflight.yml:112-120`, `play-internal.yml:137-144`), der Rückfall greift also nur in Entwicklungs-Builds. Der `appUrl`-Wert selbst steht in den Instanz-Einstellungen, nicht im Repo.

**Auswirkung.** Wer `plietschepluenn.de` oder `plietsche-pluenn.de` registriert, empfängt im schlechtesten Fall Anmeldedaten (Dev-Build ohne `.env`) oder Reset-/Bestätigungs-Token (falls `appUrl` auf die ASCII-Schreibweise zeigt). Ob Letzteres der Fall ist, lässt sich nur auf der Instanz sehen.

**Empfehlung.** Rückfall in `pb.ts:23` auf die Punycode-Adresse ändern oder ganz entfernen (ohne URL laut werden statt still woandershin senden); Kommentar in `mail-vorlagen.py` korrigieren; beide ASCII-Varianten entweder registrieren und umleiten oder nirgends nennen. Messung: siehe Punkt 6 der Liste.

### S-9 [MITTEL] Helfer kann `items.points` unbegrenzt setzen und das Teil selbst scannen

**Beschreibung.** `items.points` hat nur `min: 0` (`init:84`). Ein `volunteer` darf Teile anlegen (sofort `approved`, `defaults.pb.js:79-81`) und ändern (`updateRule staff`). Er kann also ein Teil mit `points: 100000` anlegen und es selbst scannen: `scan.pb.js:150` rechnet `item.get('points') * multTake`, `awardPoints` schreibt am Schreibschutz vorbei (serverseitig). Der Punktestand ist für Ränge/Rangliste sichtbar.

**Auswirkung.** Vertrauensmodell „Helfer sind ehrlich" — für einen Gemeindeladen tragbar, aber ohne jede Obergrenze auch ein Tippfehler-Risiko (30000 statt 30).

**Empfehlung.** `max` am Feld (z. B. 500) per additiver Migration; optional Bring-/Scan-Punkte für Teile, die die scannende Person selbst angelegt hat, ausschließen (`item.created_by === auth.id` → kein Punktezuwachs).

### S-10 [MITTEL] Alt-Koordinaten in `visits.gps_lat/gps_lng` bleiben gespeichert

**Beschreibung.** Seit `23c5d65` werden Koordinaten nicht mehr geschrieben (`points.js:325-329`), die Felder bleiben „damit alte Besuche lesbar bleiben". Für Besuche vor dem 16.09. stehen die genauen Standorte weiterhin in der Datenbank — der CHANGELOG verspricht: „festgehalten wird … nur noch, wie weit du vom Laden entfernt warst, nicht mehr, wo genau du standest" (`CHANGELOG.md`, Unreleased/Geändert). Für Neu-Besuche stimmt das, für den Bestand nicht. Datenminimierung gilt auch rückwirkend, wenn der Zweck (Prüfung vor Ort) erfüllt ist.

**Fundstellen.** `pocketbase/pb_hooks/lib/points.js:325-329`; `1700000000_init_schema.js:152-153`.

**Empfehlung.** Additive Migration, die `gps_lat`/`gps_lng` in allen Besuchen leert (die Felder bleiben, additiv); danach Feld-Entfernung, wenn keine alte App sie mehr liest (`grep -rn gps_lat mobile/` zeigt: nur `scan.tsx`/`api.ts` beim **Senden**, nirgends beim Lesen — Entfernen ist also gefahrlos).

### S-11 [MITTEL] Konto-Seite ohne Security-Header

**Beschreibung.** `web/nginx-konto.conf` setzt keinen einzigen Sicherheits-Header: kein `Content-Security-Policy`, kein `X-Content-Type-Options: nosniff`, kein `Referrer-Policy`, kein `X-Frame-Options`/`frame-ancestors`. `konto.html` verarbeitet Reset-Token und Passwörter. Der Code selbst ist sauber: Token nur aus `location.hash` (`konto.html:124-127`), `fall` per `[a-z-]+` gematcht und nur verglichen, `innerHTML` nur mit statischen Zeichenketten (`:129-140, 164-173, 191-202`), Token nur im JSON-Body an die fest verdrahtete HTTPS-Adresse (`:142-149`). Ein Fragment erreicht weder Server noch Referer — Token-Leak über Logs ist damit ausgeschlossen. Aber: Ohne CSP schützt nichts, wenn die Seite je ein fremdes Skript lädt oder eine Lücke bekommt; ohne `frame-ancestors` lässt sich das Passwortformular einbetten (Clickjacking).

**Fundstellen.** `web/nginx-konto.conf:1-26`; `web/konto.html:110-233`.

**Empfehlung.** In nginx: `add_header Content-Security-Policy "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self'; connect-src https://pb.xn--plietsche-plnn-rsb.de; frame-ancestors 'none'; base-uri 'none'" always;` (oder Skript in eine Datei auslagern und `'unsafe-inline'` streichen), `X-Content-Type-Options nosniff`, `Referrer-Policy no-referrer`, `X-Frame-Options DENY`. HSTS liegt bei Traefik — prüfen (Punkt 8).

### S-12 [MITTEL] Container läuft als root

**Beschreibung.** `pocketbase/Dockerfile` setzt keinen `USER`; das Basisimage `muchobien/pocketbase` hat in seinem aktuellen Dockerfile (Anbieter-Repo, abgerufen 26.09.2026) ebenfalls keinen — Alpine, Binary nach `/usr/local/bin`, `ENTRYPOINT`. PocketBase läuft damit als root im Container. Ports sind nicht nach außen veröffentlicht (kein `ports:`), nur das Traefik-Netz; Speicher- und CPU-Grenzen sind gesetzt (`portainer.yml:73-74`). Ob das Tag `0.22.21` dieselbe Dockerfile-Fassung hat, ist aus dem Repo nicht zu sehen (→ Unklar).

**Empfehlung.** `USER 65532:65532` (oder eigener User) im eigenen Dockerfile plus passende Rechte auf `/pb_data`; `read_only: true` mit `tmpfs` für `/tmp`; `cap_drop: [ALL]`; `security_opt: [no-new-privileges:true]`.

### S-13 [MITTEL] `TECH.md` behauptet eine verschlüsselte Datenbank; Backup-Konzept nicht im Repo

**Beschreibung.** `TECH.md:102`: „PocketBase mit SQLite, verschlüsselt über `PB_ENCRYPTION_KEY`". Das stimmt nicht: `--encryptionEnv` (`docker-compose.yml:19`) verschlüsselt ausschließlich die **Einstellungen** (SMTP-Passwort, S3-Schlüssel) in der Datenbank — nicht die Datenbank selbst. `pb_data/data.db` liegt im Klartext unter `/opt/stacks/plietsche-pb/pb_data`, ebenso jedes Backup davon. Ein Backup-Konzept steht nirgends im Repo; `ABNAHME.md:96` und `deploy.md:140` erwähnen einmalige Handsicherungen unter `/root/backups/`. PocketBase kann geplante Backups (Einstellungen → Backups, optional S3) — ob sie eingerichtet sind, ist unbekannt.

**Empfehlung.** `TECH.md` korrigieren; Backup-Plan dokumentieren (PocketBase-Cron-Backup, verschlüsselte Ablage, Aufbewahrung, Restore-Test) und in die Messliste aufnehmen (Punkt 9). Verschlüsselung ruhender Daten über das Dateisystem/Volume, wenn gewünscht.

### S-14 [NIEDRIG] Kontolöschung: Adresse und Foto eingereichter Teile bleiben; CHANGELOG-Text unvollständig

**Beschreibung.** Die Löschung ist die PocketBase-eigene Route (`DELETE /api/collections/users/records/:id`, `useAuth.ts:146`), abgesichert durch `deleteRule id = @request.auth.id` (Standard, unversioniert → S-4) und die Passwortprüfung davor (`useAuth.ts:137`, Test `tests/account-delete.test.js:34-42`). Kaskade: `visits`, `points_log`, `user_badges`, `push_devices`, `action_counts` haben `cascadeDelete: true` (`init:148, 180, 249, 278`; `1700001000:27`) und gehen mit. `items.created_by`, `campaigns.created_by`, `push_messages.sent_by` haben `cascadeDelete: false` (`init:94, 127, 320`) — PocketBase leert den Verweis. Der CHANGELOG-Satz „Teile, die schon im Laden sind, bleiben dort ohne Bezug zur Person" ist für den **Verweis** richtig. Nicht erfasst: bei externen Teilen bleibt die **Adresse** in `location` (S-2), ggf. ein Foto mit Personen, und die Einträge in PocketBase-`_logs` (IP, Auth-ID) bis zum Ablauf der Aufbewahrung. Der Auth-Token bleibt formal bis zum Ablauf gültig, ist aber ohne Datensatz wertlos.

**Empfehlung.** Beim Löschen (Hook `onRecordAfterDeleteRequest` auf `users`) `location` externer Teile des Kontos leeren oder die Teile archivieren; CHANGELOG-Satz ergänzen („… Adresse und Foto werden dabei entfernt"); Log-Aufbewahrung in der Datenschutzerklärung nennen.

### S-15 [NIEDRIG] Altes Türgeheimnis in der Git-Historie eines öffentlichen Repos

**Beschreibung.** Commit `bd23c4f` (14.09.) entfernt das echte `checkin_qr_secret` aus `docs/audit/backend.md` und vermerkt die Rotation. Der Wert steht in der Historie weiter; das Repo ist inzwischen öffentlich (`deploy.md:134-135`). Solange rotiert wurde (laut Commit-Message ja — nicht von hier prüfbar), ist der Wert wertlos. Sonstige Muster (`BEGIN PRIVATE KEY`, `ghp_`, `AKIA`, `sshpass`, `PB_ENCRYPTION_KEY=`) finden in der Historie nur Dokumentationstext (`e73cf5f` → `docs/audit/*.md`, `tests/*`), keine echten Werte. `.gitignore` deckt `.env`, `*.p8`, `*.p12`, `*.jks`, `google-services.json`, `test-qrcodes.html` ab. Workflows beziehen alle Geheimnisse aus GitHub-Secrets (`testflight.yml:75-145`, `play-internal.yml:103-157`, `deploy.yml:128-152`). Der Apple-Key-Vorfall K-1 (lokaler Stash) ist laut `ABNAHME.md:290` behoben; ob der Schlüssel `7X8W499AAK` widerrufen wurde, ist weiterhin nicht aus dem Repo ersichtlich.

**Empfehlung.** Bestätigen, dass der aktuelle Türcode ≠ dem Wert in `git show bd23c4f^:docs/audit/backend.md` ist (Punkt 3 der Messliste). Keine History-Rewrite nötig.

### S-16 [NIEDRIG] Push-Token-Übernahme durch `register`; veralteter Kommentar zur Kategorie

**Beschreibung.** `/api/pp/push/register` schreibt einen bereits bekannten Token auf das anfragende Konto um (`push.pb.js:36-44`) — gewollt für Gerätewechsel, aber wer den Expo-Token eines fremden Geräts kennt, kann ihn auf sich umhängen und die Person von Mitteilungen abschneiden. Expo-Token sind nicht geheim im engen Sinn (sie liegen in Logs, Debug-Ausgaben). Geringes Risiko. Dazu: `api.ts:78-80` sagt, manuelle Aushang-Pushs liefen als Kategorie `other`; `cron.pb.js:29-31` sendet sie als `campaign`. Fachlich ist `campaign` („Aktionen und Ankündigungen", `push.ts:31-34`) richtig — der Kommentar ist falsch und könnte bei der nächsten Änderung zur falschen Einwilligungs-Zuordnung führen.

**Empfehlung.** Kommentar korrigieren. Für die Übernahme: `last_seen` des alten Eintrags prüfen und bei sehr frischem Eintrag (< 1 h) beide Konten behalten, oder es bewusst so lassen und dokumentieren.

### S-17 [NIEDRIG] Übertrag vom 14.09.: Z-5, Z-6, Z-7, Z-8 unverändert

Geprüft und unverändert vorgefunden: **Z-5** (`items.status` nur eine Regel tief — kein Update-Hook, `defaults.pb.js:26` bleibt auf `users`), **Z-6** (`needs.deleteRule` `staff`, `1700000700:65`), **Z-7** (Rückfall auf `store.checkin_qr_secret`, `scan.pb.js:67` — ein wieder befülltes Altfeld stünde für alle Angemeldeten lesbar), **Z-8** (`badges.listRule auth` gibt geheime Abzeichen preis). Einschätzungen des 14.09. gelten weiter; keine Verschärfung.

---

## Geprüft und in Ordnung

- **Filter-Injektion in den Routen:** Alle Filter in den Hooks setzen entweder serverseitige Werte ein (`user.id`, `camp.id`, ISO-Zeit aus `new Date()`: `points.js:184, 241, 258, 282, 551, 611, 633-653`; `cron.pb.js:22, 107, 121, 138, 148, 172, 181`; `push.js:72, 96`) oder prüfen den Nutzerwert vorher streng (`push.pb.js:14-19`, Regex `^Expo(?:nent)?PushToken\[[A-Za-z0-9_-]+\]$`, dann `:39, :62`). Der QR-Code geht über `findFirstRecordByData` (`scan.pb.js:123`), nicht in einen Filterstring.
- **Authentifizierung der eigenen Routen:** `scan.pb.js:37-38`, `push.pb.js:26-27, 54-55` weisen ohne `authRecord` mit 401 ab (bestehende Tests `tests/scan.test.js:70-76`).
- **Schreibschutz per Update:** `defaults.pb.js:26-44` dreht `points_total`, `streak_weeks`, `streak_last_visit`, `role` zurück; Admin-Ausnahme nur für fremde Datensätze (`:39`) — Selbstbeförderung ausgeschlossen (reproduziert, Probe S-4; bestehende Tests `tests/defaults.test.js:99-150`).
- **Türgeheimnis:** liegt in `store_secrets` (alle Regeln `null`, `1782690000:44-48`), Altfeld wird geleert (`:80-83`), `store` verlangt Anmeldung (`:87-88`); `deploy-verify.py` prüft beides unangemeldet.
- **Besuche:** `createRule null` (`1782710000:93`), nur `doCheckin()` über den Admin-DAO (`points.js:321-333`); Race-Guard gegen Doppelbonus (`:308-318`); Tageslimit `max_items_take` beidseitig (`scan.pb.js:71-75`, `points.js:305-306`).
- **Push:** `push_messages` durchgehend `admin`; `unregister` löscht nur eigene Token (`push.pb.js:62`); tote Token werden entfernt (`push.js:155-157`); Einwilligungs-Flags werden je Kategorie geprüft (`push.js:41-57, 88-93`; Tests `tests/push-lib.test.js`).
- **Konto-Seite `web/konto.html`:** Token nur aus dem Fragment, nie im `innerHTML`, nie in einer URL, nur per `fetch` an die fest verdrahtete HTTPS-Adresse (`:116, 124-149`); kein Open Redirect (keine Weiterleitung); `noindex` (`:7`); E-Mail-Wechsel verlangt Passwort (`:161-187`).
- **Mail-Vorlagen `mail-vorlagen.py`:** reine Konstanten, kein Nutzerwert im Template; `{ACTION_URL}` als einziger Platzhalter (`:64`); Links mit `rel="noopener"`.
- **Konto-Flüsse in der App:** Registrierung schickt nur `email`, `password`, `passwordConfirm`, `name`, `role: 'visitor'` (`useAuth.ts:36-42`); Bestätigungsmail nur an die eigene Adresse (`:74-78`, Test `tests/email-verify.test.js:57-62`); Passwort-Reset mit neutraler Antwort (`:83-85`, `login.tsx`, Test `account-delete.test.js:87-96`); Passwortwechsel verlangt `oldPassword` (`:90-94`); Kontolöschung prüft das Passwort vor dem Löschen und meldet den Push-Token vorher ab (`:131-149`, Tests `account-delete.test.js`); `logout` leert Auth-Store und Query-Cache (`:111-119`).
- **Fehlermeldungen:** deutsche Nutzertexte ohne Interna (`scan.pb.js:38, 42, 53, 73, 125-132`; `points.js:689`); ein Datenbankfehler wird zu „Laden nicht konfiguriert" (`:52-54`), nicht zum Stacktrace.
- **Logging in den Hooks:** kein `console.log`, kein `$app.logger` in `pb_hooks/` — Geheimnis und Token landen nicht in eigenen Logzeilen.
- **Betrieb:** keine `ports:`-Veröffentlichung, nur das Traefik-Netz; `PB_ENCRYPTION_KEY` aus der Umgebung (`docker-compose*.yml`), nicht im Repo; Log-Rotation und Ressourcengrenzen gesetzt; Hooks/Migrationen im Abbild, nicht per Hand kopiert (`Dockerfile:18-26`); CI-Deploy ohne SSH und ohne Superuser-Zugang (`deploy.md:184-193`).
- **Geheimnisse im Repo:** `grep` nach Schlüssel-, Token- und Passwort-Mustern über den Arbeitsbaum ohne echten Treffer (nur Muster-Beschreibungen in `docs/audit/ci-deploy.md:499-500` und Dummy-Werte in Tests); `root@server.godsapp.de` in `web/README.md:19-20` und `docs/audit/deploy-muster.md:262` ist eine Adresse ohne Zugangsdaten.

---

## Unklar / zu klären

1. **Tatsächliche `users`-Regeln auf der Instanz heute.** Die Messung ist vom 14.09.; seither kann sich im Admin-UI alles geändert haben (S-1, S-4).
2. **`appUrl` in den PocketBase-Einstellungen.** Entscheidet, wohin die Links in Bestätigungs- und Reset-Mails führen (S-8). Wenn dort die ASCII-Schreibweise steht, laufen Token auf eine nicht registrierte Domain.
3. **Aufbewahrung der PocketBase-Logs** (`Settings → Logs → Max days`, Standard in 0.22: 5 Tage; ob IP-Adressen protokolliert werden: `Logs → IP`). Steht nicht im Repo; gehört in die Datenschutzerklärung.
4. **Backups:** ob PocketBase-Backups (Cron, Zielort) eingerichtet sind, ob sie verschlüsselt liegen, ob ein Restore je getestet wurde (S-13).
5. **Rotation des Türcodes** seit `bd23c4f` tatsächlich erfolgt (S-15).
6. **`USER` im Basisimage-Tag 0.22.21** (S-12): das aktuelle Dockerfile des Anbieters hat keinen; der Stand des alten Tags wurde nicht geprüft.
7. **HSTS / TLS-Konfiguration bei Traefik** und ob der Traefik-Router für `pb.…` zusätzliche Middlewares trägt (S-7, S-11) — Traefik-Konfiguration liegt nicht im Repo.
8. **Widerruf des Apple-Schlüssels `7X8W499AAK`** (K-1 vom 14.09.) — nur bei Apple prüfbar.
9. **Mindestalter / Zielgruppe** für die Store-Fragebögen — fachliche Entscheidung des Betreibers.

---

## Auf der Produktion nachzumessen

Alle Messungen ohne Zugangsdaten beschrieben; `BASE=https://pb.xn--plietsche-plnn-rsb.de`. Wo ein Konto nötig ist: ein eigens angelegtes Testkonto, danach als Superuser löschen — wie am 14.09.

1. **S-1, Registrierung mit Rolle (der wichtigste Punkt):**
   `curl -s -X POST $BASE/api/collections/users/records -H 'Content-Type: application/json' -d '{"email":"audit-s1@example.invalid","password":"…12+ Zeichen…","passwordConfirm":"…","name":"Audit","role":"admin","points_total":424242}'`
   Erwartung nach dem Fix: 400 oder `role: "visitor"`, `points_total: 0`. Heute erwartet: 200 mit `role: "admin"`. Danach als Superuser in `users` filtern: `role != "visitor"` — jedes Konto, das das Team nicht kennt, ist ein Vorfall. Testkonto löschen.
2. **S-4, `users`-Regeln lesen:** als Superuser `GET $BASE/api/collections/users` → die fünf Regeln notieren und mit der Tabelle oben vergleichen. Unangemeldet `GET $BASE/api/collections/users/records` → erwartet 200, `totalItems: 0`. Mit Besucher-Token → `totalItems: 1`, nur das eigene Konto.
3. **S-2, Adresse externer Teile:** mit Besucher-Token `GET "$BASE/api/collections/items/records?filter=stays_external=true&fields=id,title,location,created_by"` → heute erwartet: Adressen fremder Personen sichtbar. Nach dem Fix: `location` leer oder keine Treffer.
4. **S-6, Geofence-Typprüfung:** mit Besucher-Token `POST $BASE/api/pp/scan -d '{"qr_code":"<Türcode>","gps_lat":"abc","gps_lng":"def"}'` → heute 200 (Check-in), nach dem Fix 400. Achtung: erzeugt einen echten Besuch — Testkonto verwenden. Gegenprobe mit Berlin-Koordinaten → 400 „Du bist nicht im Laden".
5. **S-3, Versionsstand:** `docker image inspect ghcr.io/revisor01/plietsche-pluenn/pocketbase:latest --format '{{.Config.Labels}}'` bzw. im Container `pocketbase --version` → nach dem Update `0.22.55`. `curl -s $BASE/api/health` liefert die Version nicht.
6. **S-8, Mail-Links:** mit dem Testkonto `POST $BASE/api/collections/users/request-password-reset -d '{"email":"…"}'` und im Postfach prüfen, auf welchen Host der Knopf zeigt — erwartet `https://xn--plietsche-plnn-rsb.de/_/#/auth/confirm-password-reset/…` (oder `plietsche-plünn.de`), **nicht** `plietsche-pluenn.de`. `dig plietsche-pluenn.de` und `dig pb.plietschepluenn.de` → NXDOMAIN bestätigen oder Domains registrieren.
7. **S-7, Drossel:** 50× hintereinander `POST $BASE/api/collections/users/auth-with-password` mit falschem Passwort → heute erwartet: alle 400, keine 429. Nach Traefik-Middleware: 429 ab dem Limit. Dasselbe für `GET $BASE/_/` (Admin-UI erreichbar? → Allowlist).
8. **S-11, Header der Konto-Seite:** `curl -sI https://xn--plietsche-plnn-rsb.de/konto` → `content-security-policy`, `x-content-type-options`, `referrer-policy`, `x-frame-options`, `strict-transport-security` vorhanden?
9. **S-13, Backups und Logs:** als Superuser Einstellungen → Backups (Cron gesetzt? Ziel? letzte Sicherung?) und → Logs (Max days, IP-Logging) ablesen; `ls -la /opt/stacks/plietsche-pb/pb_data/backups/`.
10. **S-10, Alt-Koordinaten:** als Superuser `GET "$BASE/api/collections/visits/records?filter=gps_lat!=0&fields=id,created"` → Anzahl notieren; nach der Bereinigungsmigration 0.
11. **S-12, Prozessnutzer:** `docker exec plietsche-pocketbase id` → heute `uid=0`; nach dem Fix ≠ 0.
12. **S-15, Türcode rotiert:** Wert aus `git show bd23c4f^:docs/audit/backend.md` (nur lokal, nicht ausgeben) mit dem aktuellen `store_secrets`-Eintrag vergleichen → muss verschieden sein.
13. **Nach jedem Deploy weiterhin:** `python3 .github/scripts/deploy-verify.py $BASE` — und die Prüfliste dort um `users` (Punkt 2) erweitern.
