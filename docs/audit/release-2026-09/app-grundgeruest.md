# Release-Audit 2026-09 — App-Grundgerüst (Einstieg, Sitzung, Datenzugriff, Push, Konto)

| | |
|---|---|
| **Datum** | 26.09.2026 |
| **Stand** | Commit `06b68dc` („feat(app): Symbolauswahl bleibt als Funktion", 19.09.2026), Arbeitsverzeichnis ohne Änderungen an `mobile/` |
| **Umfang** | `mobile/app/_layout.tsx`, `app/index.tsx`, `app/(auth)/*`, `app/(onboarding)/*`, `app/(visitor)/_layout.tsx`, `app/(visitor)/settings/account.tsx`, `app/(visitor)/settings/push.tsx`, `app/scan.tsx`, `components/TabBar.tsx`, `lib/pb.ts`, `lib/api.ts`, `lib/errors.ts`, `lib/queryClient.ts`, `lib/types.ts`, `lib/push.ts`, `lib/hooks/*`, `app.json`, `.env.example`, Deep Links (`pp://`, `web/konto.html`). Gegenseite: `pocketbase/pb_migrations/*`, `pb_hooks/scan.pb.js`, `pb_hooks/push.pb.js`, `pb_hooks/defaults.pb.js`, `pb_hooks/lib/push.js`, `docs/openapi.yaml`, `docs/push-channels.md`. |
| **Nicht im Umfang** | Fachscreens (Laden, Teile, Abzeichen, Admin-Editoren) außer dort, wo sie am Grundgerüst hängen (Rollen-Gating, Cache-Invalidierung). Backend-Logik nur als Vertragspartner. |
| **Vorgehen** | Vollständiges Lesen der genannten Dateien; Abgleich jedes Aufrufs in `lib/api.ts` / `lib/hooks/useData.ts` mit Schema und Regeln in den Migrationen sowie mit `docs/openapi.yaml`; Typprüfung `npx tsc --noEmit -p mobile/tsconfig.json` (0 Fehler, `node_modules` war vorhanden); Blick in installierte Bibliotheken (`pocketbase` 0.22.1, `expo` 57.0.22, `expo-router` 57.0.21, `expo-notifications` 57.0.18, `@expo/prebuild-config`) für Verhalten, das im App-Code nur benutzt, aber nicht sichtbar ist. **Kein Zugriff auf die laufende Instanz** — nichts wurde gegen Produktion gemessen. Frühere Berichte (`docs/audit/app.md`, `ABNAHME.md`) nur zur Orientierung; jede Aussage unten ist am heutigen Code nachgeprüft. |
| **Kennzeichnung** | *reproduziert* = Werkzeug hat es gezeigt (tsc, bestehender Test, Quelltext einer Bibliothek) · *aus Code gelesen* = Ablauf aus dem Quelltext hergeleitet, nicht auf einem Gerät nachgestellt |

## Zusammenfassung

Das Grundgerüst der App ist in weiten Teilen solide: Die Sitzung liegt im SecureStore und wird beim Abmelden und Löschen sauber geräumt (Push-Token abgemeldet, Auth-Store geleert, Query-Cache verworfen), die Fehlertexte aus dem Backend werden auf Deutsch durchgereicht, die Cache-Invalidierung nach Scan und Bestandsänderungen ist vollständig, die Push-Kanäle stimmen mit Backend und Doku überein, und die Typprüfung läuft ohne Fehler durch. Der Vertragsabgleich App ↔ Backend zeigt nur eine sachliche Lücke: Das Feld `bonus_points`, das das Backend seit dem 14.09. liefert, wird von der App nicht gelesen — die verwirrende Anzeige „+10 Punkte" bei einem Sprung um 510 ist damit im Client weiterhin da.

Zwei Befunde wiegen schwer. **Erstens (KRITISCH):** Die Registrierung nimmt eine vom Client mitgeschickte Rolle an. Die App selbst sendet `visitor`, aber jede Person kann mit der offenen `users.createRule` und dem Standardwert-Hook, der eine gesetzte Rolle nur ergänzt statt erzwingt, ein Konto als `admin` anlegen — ein bestehender Test sichert dieses Verhalten sogar als gewollt ab. Das ist ein Backend-Fehler, gehört aber zur hier geprüften Frage „kann der Client `role` mitschicken". **Zweitens (HOCH):** Die App kennt nur den lokalen Ablauf ihres JWT. Wird die Sitzung serverseitig ungültig — nach dem neuen Passwort-Reset auf einem anderen Gerät, nach Konto-Löschung, nach Ablauf der Token-Laufzeit trotz täglicher Nutzung — bleibt sie in einem leeren Zustand („Moin, du!", keine Daten) und leitet nicht zum Login; ein 401 wird nirgends behandelt, `authRefresh` läuft nie beim Start.

Dazu kommen mittlere Befunde: Team- und Admin-Bildschirme sind per Deep Link für Besucher:innen erreichbar (das Backend blockt Schreibzugriffe, die Oberfläche aber nicht); der Start-Guard hält die Sitzung eine Runde lang für leer und schickt Angemeldete kurz zum Login; die Push-Berechtigung wird direkt nach dem Onboarding entgegen der dortigen Zusage ungefragt angefordert; der Login sagt bei jedem Fehler „Passwort stimmt nicht", auch offline; es gibt keinen Refetch bei Rückkehr in den Vordergrund, weshalb der Bestätigungshinweis nach dem Mail-Klick stehen bleibt; die eingebaute Rückfall-Adresse zeigt auf einen falschen Host.

**Release-Empfehlung für den Bereich:** **Nicht freigeben, bevor A-1 im Backend behoben und ausgeliefert ist** (Hook plus `createRule`; ein Fix im Repo zählt laut Projektregeln erst nach Abgleich mit dem Server). A-2 sollte in denselben Build (401 → Auth-Store leeren, `authRefresh` beim Start). Die mittleren Befunde sind einzeln kleine Eingriffe; A-3, A-6 und A-7 sind für Nutzer:innen am sichtbarsten und sollten mit.

## Befund-Tabelle

| ID | Kurztitel | Schwere | Nachweis |
|---|---|---|---|
| A-1 | Registrierung nimmt mitgeschickte `role` (und `streak_weeks`) an — Selbstregistrierung als `admin` möglich | KRITISCH | Code + bestehender Test + Messung der Abnahme (nicht selbst gegen Produktion) |
| A-2 | Serverseitig ungültige Sitzung wird nicht erkannt: kein 401-Handler, kein `authRefresh`, App bleibt leer statt zum Login zu führen | HOCH | aus Code gelesen |
| A-3 | `bonus_points` aus der Scan-Antwort wird nicht angezeigt — „+10 Punkte" bei Sprung um 510 | MITTEL | aus Code gelesen, Vertragsabgleich |
| A-4 | Admin-/Team-Bildschirme ohne Rollenprüfung, per `pp://`-Deep-Link für Besucher:innen erreichbar | MITTEL | aus Code gelesen |
| A-5 | `ready` in `useAuth` ist sofort wahr — Guard schickt Angemeldete beim Kaltstart kurz zum Login | MITTEL | reproduziert (SDK-Quelltext) + aus Code gelesen |
| A-6 | Push-Berechtigung wird direkt nach dem Onboarding ungefragt angefordert | MITTEL | aus Code gelesen |
| A-7 | Login meldet bei jedem Fehler „E-Mail oder Passwort stimmt nicht" — auch offline, 429, 500 | MITTEL | aus Code gelesen |
| A-8 | Kein Refetch bei Rückkehr in den Vordergrund; Bestätigungshinweis bleibt nach Mail-Klick stehen | MITTEL | aus Code gelesen |
| A-9 | Rückfall-URL in `pb.ts` zeigt auf einen falschen Host | MITTEL | aus Code gelesen |
| A-10 | Abmelden und Konto löschen hängen an einem Netzaufruf zu Expo; Abmelden-Knopf ohne Wartezustand | MITTEL | aus Code gelesen |
| A-11 | Onboarding „Fertig" scheitert stumm | MITTEL | aus Code gelesen |
| A-12 | Fotozugriffs-Text auf iOS englisch und generisch (`expo-image-picker` nicht als Plugin konfiguriert) | MITTEL | reproduziert (Plugin-Quelltext) |
| A-13 | Unbekannte Routen zeigen den englischen Standardbildschirm „Unmatched Route" | NIEDRIG | reproduziert (Bibliotheks-Quelltext) |
| A-14 | Filter-Strings per Template statt `pb.filter()` | NIEDRIG | aus Code gelesen |
| A-15 | Listen-Obergrenzen (100 / 300) ohne Nachladen | NIEDRIG | aus Code gelesen |
| A-16 | `types.ts` weicht vom Schema ab (fehlende Felder, `bring` fehlt bei `PointsLog.kind`) | NIEDRIG | aus Code gelesen |
| A-17 | ErrorBoundary zeigt Stacktrace an Nutzer:innen | NIEDRIG | aus Code gelesen |
| A-18 | Doppeltippen auf „Scannen" kann zwei Scanner-Modals stapeln | NIEDRIG | aus Code gelesen |
| A-19 | Push-Schalter: Speicherfehler wird stumm zurückgesetzt | NIEDRIG | aus Code gelesen |
| A-20 | Android-Hardware-Zurück auf versteckten Tab-Routen springt zur Startseite | NIEDRIG | aus Code gelesen |
| A-21 | `Linking.openURL('tel:…')` ohne Fehlerbehandlung | NIEDRIG | aus Code gelesen |

Summe: 1 KRITISCH, 1 HOCH, 10 MITTEL, 9 NIEDRIG.

## Befunde im Einzelnen

### A-1 · Registrierung nimmt mitgeschickte `role` an — Selbstregistrierung als `admin` möglich · KRITISCH

**Beschreibung.** Die App sendet bei der Registrierung `email`, `password`, `passwordConfirm`, `name` und ausdrücklich `role: 'visitor'` (`mobile/lib/hooks/useAuth.ts:35-42`). Das ist harmlos. Aber nichts erzwingt diesen Wert: Der Standardwert-Hook setzt die Rolle nur, wenn keine mitkommt — `if (!r.get('role')) r.set('role', 'visitor');` (`pocketbase/pb_hooks/defaults.pb.js:249`). Die Erstellungsregel der `users`-Sammlung ist laut Abnahme-Messung leer, also für alle offen (`docs/audit/ABNAHME.md:336`: `users.createRule = ''`), und keine Migration setzt sie (`grep -rn "createRule" pocketbase/pb_migrations | grep users` — kein Treffer). Ein direkter `POST /api/collections/users/records` mit `role: "admin"` legt damit ein Admin-Konto an. Der Schreibschutz für `role` greift nur beim **Ändern** (`defaults.pb.js:267-285`), nicht beim Anlegen. Dasselbe gilt für `streak_weeks`: `r.get('streak_weeks') == null` ist bei einem Zahlenfeld nie wahr (Zahlenfelder stehen ohne Angabe auf 0, wie `tests/defaults.test.js:44-46` selbst festhält), ein mitgeschickter Wert bleibt stehen. `points_total` wird beim ersten Punktezugang aus `points_log` neu gerechnet und ist deshalb weniger kritisch.

Der bestehende Test `tests/defaults.test.js:40-42` („behaelt eine bereits gesetzte Rolle") sichert dieses Verhalten als gewollt ab — vermutlich gedacht für das Anlegen von Team-Konten im Admin-UI (Superuser). Für die offene Registrierung ist er falsch.

**Fundstellen.** `pocketbase/pb_hooks/defaults.pb.js:247-260`; `mobile/lib/hooks/useAuth.ts:35-42`; `pocketbase/pb_migrations/1700000200_role_optional.js:3-4` (Kommentar: „new visitors register without sending it" — Annahme, keine Durchsetzung); `docs/audit/ABNAHME.md:333-338`.

**Auswirkung aus Nutzersicht.** Wer die API kennt, gibt sich Admin-Rechte: Teile freigeben, archivieren, löschen; Abzeichen, Aktionen und Punktwerte ändern; Push-Nachrichten an alle Geräte senden (`push_messages.createRule = admin`); fremde Besuche, Punkteverläufe, Abzeichen und Push-Geräte lesen (`|| @request.auth.role = "admin"` in `visits`, `points_log`, `user_badges`, `push_devices`, `action_counts`). Das ist die Definition von „Admin-Funktion für Besucher".

**Nachweis.** Code gelesen; das Verhalten ist durch den bestehenden Test `tests/defaults.test.js:40-42` im Harness belegt (dort mit `volunteer`, die Logik unterscheidet nicht nach Wert); die offene Erstellungsregel ist am 14.09. gegen die Instanz gemessen worden (`ABNAHME.md:336`). Ich habe **nicht** selbst gegen Produktion registriert — das wäre ein Eingriff (Admin-Konto in der Produktionsdatenbank).

**Empfehlung.** Zwei Riegel, beide im Backend: (1) Im Hook `onRecordBeforeCreateRequest` für `users` die Rolle **erzwingen**, wenn die Anfrage nicht vom Superuser kommt (`e.httpContext.get('admin')`): `r.set('role', 'visitor')`, dazu `points_total`, `streak_weeks`, `streak_last_visit`, `streak_grace_until` auf ihre Startwerte. (2) `users.createRule` versionieren, z. B. `@request.data.role = "" || @request.data.role = "visitor"`, damit die Regel auch ohne Hook hält. Den Test `behaelt eine bereits gesetzte Rolle` in „behält die Rolle nur, wenn der Superuser anlegt" umschreiben und je einen Test für den verbotenen (Client sendet `admin`) und den erlaubten Fall ergänzen (Regel „Sicherheitsfix" in CLAUDE.md). Nach dem Deploy gegen die Instanz messen: Registrierung mit `role: "admin"` muss `visitor` ergeben. Bestehende Konten auf unerwartete Rollen prüfen.

### A-2 · Serverseitig ungültige Sitzung wird nicht erkannt · HOCH

**Beschreibung.** `isAuthenticated` ist `pb.authStore.isValid && !!user` (`mobile/lib/hooks/useAuth.ts:31`); `isValid` prüft im SDK nur, ob das JWT lokal abgelaufen ist (`pocketbase.es.mjs`: `get isValid(){return!isTokenExpired(this.token)}`). Es gibt keinen `beforeSend`/`afterSend`-Hook, keinen 401-Handler und keinen `authRefresh` beim Start (`grep -rn "authRefresh\|afterSend\|beforeSend" mobile/lib mobile/app` — einziger Treffer ist `useAuth.ts:63` nach `updateName`). Der Kommentar in `lib/pb.ts:25-28` („Auto-refresh expired token on auth change") steht über einem leeren Callback. Wird das Token serverseitig ungültig — PocketBase erneuert beim Passwortwechsel den `tokenKey`, wie der Code selbst weiß (`useAuth.ts:95`) — bleibt `isAuthenticated` wahr, jede Abfrage scheitert mit 401, `useCurrentUser` liefert `undefined`, und der Root-Guard sieht keinen Grund zum Eingreifen.

**Fundstellen.** `mobile/lib/hooks/useAuth.ts:12-31`; `mobile/lib/pb.ts:25-28`; `mobile/app/_layout.tsx:106-119` (Guard prüft nur `isAuthenticated`); `mobile/lib/hooks/useData.ts:6-16`; `mobile/app/(visitor)/index.tsx:38-84` (kein `error`-Zustand, Titel wird „Moin, du!").

**Auswirkung aus Nutzersicht.** Drei realistische Wege: (a) Passwort über „Passwort vergessen" auf dem Web (`web/konto.html:190-221`) zurückgesetzt, App auf dem Handy war noch angemeldet — oder ein zweites Gerät; (b) Passwortänderung in der App, die Neuanmeldung danach (`useAuth.ts:96-97`) scheitert am Netz; (c) Ablauf der Token-Laufzeit (PocketBase-Standard 14 Tage für Auth-Sammlungen; die Instanz wurde nicht gemessen) — weil nie erneuert wird, trifft es auch Menschen, die die App täglich nutzen. In allen Fällen: Startseite mit „Moin, du!", leerer Ring, keine Teile; Scan meldet „Du bist nicht mehr angemeldet. Bitte melde dich neu an." (`errors.ts:91-92`), aber niemand führt zum Login. Der einzige Ausweg ist Avatar → Profil → „Abmelden" (funktioniert, weil es lokal räumt; `unregisterPushToken` scheitert dabei still mit 401, der Token bleibt in `push_devices`).

**Nachweis.** Aus Code gelesen; SDK-Verhalten von `isValid` aus dem installierten Paket bestätigt.

**Empfehlung.** Beim Start, wenn `isValid`, einmal `pb.collection('users').authRefresh()` aufrufen; scheitert es mit 401/403, `pb.authStore.clear()` (der Guard leitet dann zum Login). Zusätzlich global: `pb.afterSend` oder ein QueryClient-`onError`, das bei Status 401 den Auth-Store leert und den Cache verwirft. Für den Passwortwechsel in der App: `authWithPassword` in `try` und bei Fehler ebenfalls leeren, damit kein halb-gültiger Zustand bleibt. Bonus: `authRefresh` verlängert die Sitzung — Vielnutzer:innen bleiben angemeldet.

### A-3 · `bonus_points` aus der Scan-Antwort wird nicht angezeigt · MITTEL

**Beschreibung.** Seit `262abfd` (14.09.) liefert `POST /api/pp/scan` in beiden Antwortformen `bonus_points` — die Punkte aus Abzeichen, die der Scan freigeschaltet hat (`pocketbase/pb_hooks/scan.pb.js:101,115,171`; `docs/openapi.yaml:420-431`: „Wer beides zeigen will, rechnet `points + bonus_points`"). Die App kennt das Feld nicht: `ScanResult` (`mobile/lib/api.ts:4-16`) hat es nicht, das Erfolgs-Sheet zeigt `+${result.points ?? 0} Punkte` (`mobile/app/scan.tsx:182,214`).

**Auswirkung aus Nutzersicht.** Genau die im Backend-Audit beschriebene Verwirrung besteht im Client fort: Beim ersten Besuch steht „+10 Punkte" im Sheet, der Kontostand springt um 510. Die Commit-Nachricht von `262abfd` verweist ausdrücklich auf `scan.tsx:91,182` als die Stelle, die nachziehen soll — das ist nicht passiert.

**Nachweis.** Vertragsabgleich Backend-Antwort ↔ `ScanResult`; aus Code gelesen.

**Empfehlung.** `bonus_points?: number` in `ScanResult` aufnehmen; im Sheet `points + bonus_points` zeigen oder eine zweite Zeile „+500 Punkte durch Abzeichen ‚Stammgast'". Optional-Feld, damit ein älteres Backend weiter funktioniert.

### A-4 · Admin-/Team-Bildschirme ohne Rollenprüfung, per Deep Link erreichbar · MITTEL

**Beschreibung.** Die Routen `admin/badges`, `admin/actions`, `admin/tiers`, `admin/needs`, `items/review`, `items/index` sind versteckte Tabs (`mobile/app/(visitor)/_layout.tsx:27-34`). Die Einstiege sind rollenabhängig (`settings/account.tsx:416-430`, `TabBar.tsx:45,77`), die Ziele selbst prüfen die Rolle nicht: `admin/badges.tsx`, `admin/actions.tsx`, `admin/tiers.tsx` importieren `useCurrentUser` gar nicht (grep über `app/(visitor)/admin/*.tsx`: nur `needs.tsx:36-38` liest die Rolle, und nur für den Push-Schalter). Der Root-Guard kennt nur Anmeldung und Onboarding (`_layout.tsx:106-119`). Mit `scheme: "pp"` (`app.json`) bildet expo-router jede Datei auf einen Link ab; `pp://admin/tiers` öffnet für ein Besucherkonto den Editor für Punktwerte und Ränge.

**Auswirkung aus Nutzersicht.** Keine Rechteausweitung: Die Backend-Regeln lassen Schreibzugriffe mit 403 scheitern („Dafür fehlt dir die Berechtigung", `errors.ts:93-94`), und die Lesezugriffe zeigen nur, was ohnehin lesbar ist (Abzeichen, Aktionen, Ladendaten; `items/review` liefert Besucher:innen nur eigene Einreichungen). Aber die Oberfläche wirkt wie ein offenes Verwaltungsfenster, jedes Speichern schlägt fehl, und das Team wird irgendwann gefragt, warum „der Admin-Bereich nicht geht". Die Push-Deep-Links sind davon sauber getrennt (Allow-List `lib/push.ts:125-132`).

**Nachweis.** Aus Code gelesen; Deep Link nicht auf einem Gerät nachgestellt.

**Empfehlung.** In `(visitor)/_layout.tsx` oder in einem `admin/_layout.tsx` die Rolle prüfen und Unberechtigte per `<Redirect href="/(visitor)" />` zurückschicken; alternativ ein `<Redirect>` am Kopf jeder Admin-Datei. `useCurrentUser` liefert die Rolle bereits aus dem Cache.

### A-5 · `ready` ist sofort wahr — Guard schickt Angemeldete beim Kaltstart kurz zum Login · MITTEL

**Beschreibung.** `useAuth` abonniert den Auth-Store mit `fireImmediately = true` und setzt im Callback `setReady(true)` (`mobile/lib/hooks/useAuth.ts:17-20`). Das SDK ruft den Callback dann **synchron beim Abonnieren** mit dem aktuellen Zustand auf (`pocketbase.es.mjs`: `onChange(e,t=!1){…t&&e(this.token,this.record)…}`). Beim Kaltstart ist der Store zu diesem Zeitpunkt noch leer — `AsyncAuthStore` lädt `initial` asynchron aus dem SecureStore und ruft erst danach `save()` auf, was den zweiten `onChange` auslöst. `ready` wird also sofort wahr mit `user = null`; der Guard (`_layout.tsx:112-114`) und `index.tsx:20` leiten zu `/(auth)/login`; sobald die Hydration fertig ist, leitet der Guard nach `/(visitor)`. Der 800-ms-Zeitschutz (`useAuth.ts:21`) ist damit wirkungslos, der Kommentar darüber beschreibt ein Verhalten, das nicht eintritt.

**Auswirkung aus Nutzersicht.** Ein Angemeldeter sieht nach dem Splash für die Dauer des SecureStore-Lesens (typisch 50–300 ms, auf älteren Android-Geräten mehr) den Login-Bildschirm aufblitzen, bevor die Startseite kommt. Der Kommentar in `index.tsx:6-8` („guarantees we never hang on the spinner if the guard effect misfires") deutet an, dass hier schon einmal herumgedoktert wurde.

**Nachweis.** SDK-Verhalten reproduziert (Quelltext des installierten Pakets), Ablauf aus Code gelesen.

**Empfehlung.** `ready` erst setzen, wenn die Hydration abgeschlossen ist: die `initial`-Promise in `pb.ts` exportieren (`const hydrated = SecureStore.getItemAsync(AUTH_KEY)`, an `AsyncAuthStore` übergeben und `.then(() => …)` abwarten) oder `fireImmediately` weglassen und nur bei leerem SecureStore per Timeout freigeben. Danach den Kommentar und den Fallback in `index.tsx` bereinigen.

### A-6 · Push-Berechtigung wird direkt nach dem Onboarding ungefragt angefordert · MITTEL

**Beschreibung.** Das Onboarding verspricht „Zwei kleine Bitten — Beides nur, wenn du willst" und fragt Push nur auf Tipp (`mobile/app/(onboarding)/permissions.tsx:56-59, 30-36`). Direkt nach „Fertig" mountet `(visitor)/_layout.tsx` und ruft `registerPushToken()` (`_layout.tsx:9-11`), das bei nicht erteilter Berechtigung `requestPermissionsAsync()` aufruft (`lib/push.ts:97-102`).

**Auswirkung aus Nutzersicht.** Wer im Onboarding nicht getippt hat (Status „unbestimmt"), bekommt auf iOS auf der Startseite sofort den Systemdialog — Sekunden nach der Zusage, es sei freiwillig. Wer bewusst abgelehnt hat, bekommt auf iOS keinen zweiten Dialog (System), auf Android 13+ unter Umständen noch einmal. Der Zeitpunkt (erster Screen, ohne Kontext) ist außerdem der schlechteste für die Annahmequote.

**Nachweis.** Aus Code gelesen.

**Empfehlung.** In `registerPushToken` nur registrieren, wenn `getPermissionsAsync()` bereits `granted` meldet; das Anfragen dem Onboarding und der Einstellungsseite „Benachrichtigungen" überlassen (dort ein Knopf „Mitteilungen erlauben", wenn nicht erteilt).

### A-7 · Login meldet bei jedem Fehler „E-Mail oder Passwort stimmt nicht" · MITTEL

**Beschreibung.** `login.tsx:28-29` fängt jeden Fehler und zeigt denselben Text. `lib/errors.ts` unterscheidet Status 0 (kein Netz), 429 („Zu viele Versuche"), ≥500 — wird hier aber nicht benutzt.

**Auswirkung aus Nutzersicht.** Offline oder bei Serverproblemen tippt jemand mehrfach ein richtiges Passwort neu ein, im Zweifel bis zum „Passwort vergessen".

**Nachweis.** Aus Code gelesen.

**Empfehlung.** `errorText(e, 'E-Mail oder Passwort stimmt nicht. Versuch es nochmal.')` verwenden; PocketBase antwortet auf falsche Zugangsdaten mit 400 ohne Feldfehler, dann greift genau dieser Rückfalltext, alle anderen Fälle bekommen ihren eigenen Satz.

### A-8 · Kein Refetch bei Rückkehr in den Vordergrund · MITTEL

**Beschreibung.** `refetchOnWindowFocus: false` (`lib/queryClient.ts:8`), und es gibt keine Anbindung von TanStack Querys `focusManager`/`onlineManager` an `AppState`/NetInfo (grep über `app`, `lib`, `components`: kein Treffer). In React Native bedeutet das: Ein Wechsel in den Hintergrund und zurück löst nie einen Refetch aus; Daten aktualisieren sich nur beim Mounten eines Screens (wenn `staleTime` 30 s abgelaufen ist) oder per Pull-to-Refresh auf der Startseite.

**Auswirkung aus Nutzersicht.** Der neue Bestätigungsablauf zeigt es am deutlichsten: Nutzer:in tippt auf der Startseite „E-Mail-Adresse noch nicht bestätigt" (`index.tsx:102-134`), wechselt in die Mail-App, klickt den Link, die Webseite sagt „Du kannst die App jetzt einfach weiter benutzen" (`web/konto.html:154-155`), zurück in der App steht der Hinweis weiter da — bis zur nächsten Navigation. Ebenso bleiben Punkte nach einem Check-in auf dem Zweitgerät, freigegebene Teile oder eine beendete Aktion stehen. Dieselbe Lücke betrifft „offline": Es gibt keinen Hinweis, dass Daten alt sind; Screens zeigen nur `data` und keinen `error`-Zustand (Startseite `index.tsx:38-46`).

**Nachweis.** Aus Code gelesen.

**Empfehlung.** In `_layout.tsx` einmal `focusManager.setEventListener` mit `AppState` verbinden (Standardrezept der TanStack-Doku für RN) und `refetchOnWindowFocus` auf `true` lassen; optional `onlineManager` mit `@react-native-community/netinfo`. Für die E-Mail-Bestätigung zusätzlich beim Fokus `['me']` invalidieren.

### A-9 · Rückfall-URL zeigt auf einen falschen Host · MITTEL

**Beschreibung.** `lib/pb.ts:23`: `new PocketBase(PB_URL ?? 'https://pb.plietschepluenn.de', store)`. Der echte Host ist `https://pb.xn--plietsche-plnn-rsb.de` (`.env.example`, `docs/openapi.yaml:76`, alle Workflows). Fehlt `EXPO_PUBLIC_PB_URL` beim Bauen, gibt es nur ein `console.warn` (`pb.ts:10-13`), und die App spricht stillschweigend mit einem Host, den es nicht gibt.

**Auswirkung aus Nutzersicht.** In den CI-Workflows ist die Variable gesetzt (`.github/workflows/*.yml`), Produktion ist also nicht betroffen. Ein lokaler oder manueller Build ohne `.env` liefert eine App, die überall „Keine Verbindung zum Laden-Server" zeigt — und niemand sieht am Verhalten, dass es eine Konfigurationslücke ist und kein Netzproblem.

**Nachweis.** Aus Code gelesen; Host per grep im Repo nirgends sonst zu finden.

**Empfehlung.** Entweder den richtigen Host als Rückfall eintragen oder — besser — ohne Variable laut scheitern (`throw` beim Import in einem Nicht-Dev-Build), damit ein fehlkonfigurierter Build nicht in einen Store gelangt.

### A-10 · Abmelden und Konto löschen hängen an einem Netzaufruf zu Expo · MITTEL

**Beschreibung.** `logout` und `deleteAccount` warten auf `unregisterPushToken()` (`useAuth.ts:113,140`), das zuerst `Notifications.getExpoPushTokenAsync()` aufruft (`lib/push.ts:163-164`). Dieser Aufruf tauscht das Geräte-Token bei Expos Servern gegen ein Expo-Token — ohne Netz läuft er bis zum Timeout der Verbindung. Der Abmelden-Knopf hat keinen Warte- oder Sperrzustand (`settings/account.tsx:445`: `onPress={logout}`), die Reihenfolge ist fachlich richtig begründet (Token abmelden, solange die Anmeldung gilt).

**Auswirkung aus Nutzersicht.** Ohne Netz passiert nach „Abmelden" lange nichts; Mehrfachtippen startet den Vorgang mehrfach. Beim Konto löschen zeigt der Knopf zwar „Wird gelöscht …", der Vorgang selbst hängt aber an derselben Stelle, bevor überhaupt gelöscht wird.

**Nachweis.** Aus Code gelesen; Verhalten von `getExpoPushTokenAsync` laut Expo-Dokumentation.

**Empfehlung.** Den Aufruf mit einem `Promise.race` gegen ein kurzes Timeout (z. B. 3 s) absichern, wie es `scan.tsx:44-60` für den Standort schon macht; das zuletzt registrierte Expo-Token lokal merken und beim Abmelden dieses senden statt es neu zu holen; dem Abmelden-Knopf einen `busy`-Zustand geben.

### A-11 · Onboarding „Fertig" scheitert stumm · MITTEL

**Beschreibung.** `permissions.tsx:38-50`: Scheitert `users.update(…{ onboarding_complete: true })`, wird nur `setFinishing(false)` gesetzt — kein Hinweis, kein Fehlertext.

**Auswirkung aus Nutzersicht.** Ohne Netz oder bei einem 401 (siehe A-2) tippt man auf „Fertig", der Spinner läuft kurz, und es passiert nichts. Kein Weg zurück, kein „Später".

**Nachweis.** Aus Code gelesen.

**Empfehlung.** `Alert.alert('Klappt nich', errorText(e, 'Das Onboarding ließ sich nicht abschließen.'))` im `catch`; optional trotzdem lokal weiterleiten und das Flag beim nächsten Start nachholen.

### A-12 · Fotozugriffs-Text auf iOS englisch und generisch · MITTEL

**Beschreibung.** `expo-image-picker` wird in `items/new.tsx:58` und `items/[id].tsx:147` benutzt, steht aber nicht in `app.json → plugins`; `infoPlist` nennt nur Kamera und Standort (`app.json:14-18`). `@expo/prebuild-config` wendet für `expo-image-picker` sein Legacy-Plugin trotzdem an (`node_modules/@expo/prebuild-config/build/plugins/withDefaultPlugins.js:185`, Liste `legacyExpoPlugins`), und das schreibt ohne Konfiguration den Standardtext `NSPhotoLibraryUsageDescription = 'Allow $(PRODUCT_NAME) to access your photos'` (`node_modules/expo-image-picker/plugin/build/withImagePicker.js:9,50`). Die generierte `Info.plist` liegt nicht im Repo (`mobile/ios/` enthält nur `Podfile`), Nachweis daher über den Plugin-Quelltext.

**Auswirkung aus Nutzersicht.** Beim Fotoauswählen erscheint ein englischer Systemdialog in einer sonst durchgehend deutschen App. Für den App-Review ist ein generischer Zweck-Text ein bekannter Ablehnungsgrund (Guideline 5.1.1).

**Nachweis.** Reproduziert im Sinne von: Plugin-Quelltext gelesen; Build-Ergebnis nicht geprüft.

**Empfehlung.** `["expo-image-picker", { "photosPermission": "Plietsche Plünn braucht Zugriff auf deine Fotos, um ein Bild zum eingestellten Teil zu wählen.", "cameraPermission": "…" }]` in `plugins` aufnehmen; ebenso prüfen, ob `expo-location` Hintergrundtexte oder `expo-notifications` weitere Einträge erzeugen.

### A-13 · Unbekannte Routen zeigen den englischen Standardbildschirm · NIEDRIG

**Beschreibung.** Kein `app/+not-found.tsx` (`ls mobile/app`). expo-router rendert dann seine eigene Ansicht „Unmatched Route — Page could not be found." (`node_modules/expo-router/build/views/Unmatched.js:51`). Erreichbar über einen fehlerhaften Deep Link (`pp://irgendwas`) oder eine veraltete Push-Nachricht, deren Ziel aus der Allow-List fällt (dann greift allerdings `parseDeepLink` und öffnet nur die App).

**Empfehlung.** `+not-found.tsx` mit deutschem Text und Knopf zur Startseite anlegen.

### A-14 · Filter-Strings per Template statt `pb.filter()` · NIEDRIG

**Beschreibung.** `useData.ts:42,198,235` setzen `uid` aus `pb.authStore.record.id` ein, `useData.ts:130,158` die aktuelle Zeit. Beides sind vom Server bzw. Code erzeugte Werte ohne Anführungszeichen — kein Injektionsweg heute. Das SDK bietet `pb.filter('user = {:uid}', { uid })`, das Werte maskiert.

**Empfehlung.** Umstellen, damit die nächste Erweiterung (etwa ein Suchfeld im Laden) nicht versehentlich ungeschützt einsetzt.

### A-15 · Listen-Obergrenzen ohne Nachladen · NIEDRIG

**Beschreibung.** `useMyItems` und `usePendingItems` holen `getList(1, 100)` (`useData.ts:41,112`), `usePointsLog` wird mit 300 aufgerufen (`points.tsx:39`; PocketBase erlaubt bis 500 je Seite). `getFullList` wird für Bestand, Aktionen, Ankündigungen, Abzeichen korrekt benutzt. Der Verlauf schneidet also ab dem 301. Eintrag ab; die Wochen-/Monatssumme (`points.tsx:75`) rechnet nur über die geladenen Einträge — für die jüngsten Zeiträume unkritisch.

**Empfehlung.** Für den Verlauf `useInfiniteQuery` oder mindestens einen Hinweis „ältere Einträge …"; die 100er-Grenzen sind für einen Laden dieser Größe realistisch ausreichend.

### A-16 · `types.ts` weicht vom Schema ab · NIEDRIG

**Beschreibung.** Abgleich gegen `pb_migrations/*`: `PointsLog.kind` (`types.ts:62`) kennt `'bring'` nicht, obwohl es seit `1700000400_tier_badges.js:78-87` vergeben wird — `points.tsx:22-35` fällt für Bring-Punkte auf das Münz-Icon zurück statt ein eigenes zu zeigen. `Item` fehlen `campaign` und `brought_awarded` (`1700001000`, `1700000900`), `approveItem` sendet `campaign` untypisiert (`api.ts:148`). `Badge` fehlen `tier`, `season_start`, `season_end`; `Store` fehlt `timezone`; `ScanResult` fehlt `bonus_points` (A-3). `size`, `condition`, `description`, `address`, `phone` sind als Pflicht typisiert, im Schema optional — PocketBase liefert dann `""`, zur Laufzeit unschädlich, aber die Typen versprechen mehr, als der Server garantiert.

**Empfehlung.** Typen nachziehen; `'bring'` mit eigenem Icon in `iconFor`.

### A-17 · ErrorBoundary zeigt Stacktrace an Nutzer:innen · NIEDRIG

**Beschreibung.** `_layout.tsx:43-75` rendert `error.message` und `error.stack` selektierbar. Für die Fehlersuche im Team praktisch, für Nutzer:innen im Store unschön und potenziell mit internen Pfaden.

**Empfehlung.** Stack nur in `__DEV__` zeigen, sonst eine kurze deutsche Meldung und „Neu versuchen".

### A-18 · Doppeltippen auf „Scannen" kann zwei Scanner stapeln · NIEDRIG

**Beschreibung.** `TabBar.tsx:80-83`: `router.push('/scan')` ohne Sperre; `push` legt in expo-router immer eine neue Instanz auf den Stack. Zwei schnelle Tipps → zwei `fullScreenModal`-Instanzen, „Schließen" zeigt den zweiten Scanner.

**Empfehlung.** `router.navigate('/scan')` (idempotent) oder eine `useRef`-Sperre für ~500 ms.

### A-19 · Push-Schalter: Speicherfehler wird stumm zurückgesetzt · NIEDRIG

**Beschreibung.** `settings/push.tsx:43-51`: Bei Fehler springt der Schalter zurück, ohne Hinweis. Wer offline eine Erinnerung abschalten will, sieht nur einen Schalter, der „nicht bleibt".

**Empfehlung.** `Alert.alert('Klappt nich', errorText(e, 'Einstellung konnte nicht gespeichert werden.'))`.

### A-20 · Android-Hardware-Zurück auf versteckten Tab-Routen · NIEDRIG

**Beschreibung.** Profil, Benachrichtigungen, Laden-Info, Teile, Admin-Bereiche sind Tabs mit `href: null` (`(visitor)/_layout.tsx:23-34`). Der Pfeil in der Kopfzeile geht über `useGoBack` mit `?from=` zur Herkunft (`lib/hooks/useGoBack.ts`). Der Android-Hardware-Zurück-Knopf folgt dagegen dem Tab-Navigator (`backBehavior` Standard `firstRoute`) und springt zur Startseite — aus `items/review` etwa nicht zurück nach `settings/account`, sondern nach Home. Kein `BackHandler` im Projekt (grep ohne Treffer).

**Empfehlung.** Diese Screens in einen Stack innerhalb des Tab-Navigators legen (`(visitor)/settings/_layout.tsx` mit `Stack`), dann funktionieren Pfeil und Hardware-Zurück gleich und `?from=` entfällt.

### A-21 · `Linking.openURL('tel:…')` ohne Fehlerbehandlung · NIEDRIG

**Beschreibung.** `settings/store.tsx:132` — anders als `openMaps` (`:37`) ohne `.catch`. Auf Geräten ohne Telefonie (Tablet, Simulator) unbehandelte Promise-Rejection (gelbe Warnung im Dev-Build, in Produktion still).

**Empfehlung.** `.catch(() => {})` wie bei `openMaps`.

## Geprüft und in Ordnung

- **Typprüfung:** `npx tsc --noEmit -p mobile/tsconfig.json` → 0 Fehler (*reproduziert*, `strict: true`, `typedRoutes: true`).
- **Token-Speicherung:** `AsyncAuthStore` mit `expo-secure-store`, Schlüssel `pp_pb_auth`; `save`/`initial`/`clear` vollständig (`lib/pb.ts:15-23`). `clear` löscht den Eintrag; kein zweiter Speicherort. `.env` ist in beiden `.gitignore`.
- **Abmelden räumt vollständig:** Push-Token abmelden solange Token gilt → Auth-Store leeren → Query-Cache leeren (`useAuth.ts:111-119`); Reihenfolge und Begründung im Kommentar stimmen mit `push.pb.js:228-241` (401 ohne Token) überein. Der Befund „nächstes Konto sieht fremde Daten" aus `docs/audit/app.md` ist damit tatsächlich behoben.
- **Konto löschen:** Passwortprüfung per `authWithPassword` vor dem Löschen (`useAuth.ts:137`), zweistufige Oberfläche mit Rückfrage (`account.tsx:286-316, 470-545`), Rückfragetext nennt, was verschwindet. Das SDK leert den Auth-Store beim Löschen des eigenen Datensatzes selbst (`pocketbase.es.mjs`, `RecordService.delete`), die App leert zusätzlich (`useAuth.ts:147-148`). Kaskaden im Schema (`visits`, `points_log`, `user_badges`, `push_devices`, `action_counts` mit `cascadeDelete: true`; `items.created_by` bewusst ohne) passen zur Beschreibung im Dialog.
- **Registrierung aus der App:** sendet nur `email`, `password`, `passwordConfirm`, `name`, `role: 'visitor'` (`useAuth.ts:35-42`), keine Punkte; Bestätigungsmail erst nach Anmeldung, Fehler dabei geschluckt — sinnvoll, da die Bestätigung kein Zwang ist. Fehlertext „Diese E-Mail ist schon vergeben." greift über `response.data.email` (`register.tsx:30-32`). Passwort-Mindestlänge 8 clientseitig geprüft (`register.tsx:21`).
- **Onboarding einmalig:** Flag `onboarding_complete` liegt am Nutzerdatensatz (Schema `1700000000:34`), wird beim Anlegen durch den Hook auf `false` gesetzt (`defaults.pb.js:252`) und in `permissions.tsx:43` gesetzt; das SDK aktualisiert dabei `authStore.record`, wodurch der Guard sofort greift. Überlebt Neuinstallation und Gerätewechsel.
- **Guard-Logik** (`_layout.tsx:106-119`): nicht angemeldet → Login; angemeldet ohne Onboarding → Welcome; angemeldet in `(auth)`/`(onboarding)` → `(visitor)`. Push-Deep-Link wird bis nach Login/Onboarding zurückgehalten (`_layout.tsx:85-87,122-130`) — richtig gelöst.
- **Passwort-Reset:** neutrale Rückmeldung „Falls es ein Konto gibt" (`login.tsx:63-66`), E-Mail-Format geprüft, Doppelklick über `resetting` gesperrt. Web-Seite `konto.html` bedient alle drei Fälle mit Passwort-Bestätigung beim Adresswechsel (`:161-188`) und Mindestlänge beim neuen Passwort (`:190-221`); die nginx-Regel legt `/_/` auf die Seite (`nginx-konto.conf:9-11`). Dass es keinen Rücksprung `pp://` gibt, ist eine bewusste Entscheidung und auf der Seite verständlich erklärt.
- **E-Mail-Bestätigung:** Stand im Profil (`account.tsx:346-376`), Hinweis auf der Startseite (`index.tsx:102-134`), erneut anfordern nur für die eigene Adresse (`useAuth.ts:74-78`, kein fremdes Postfach beschickbar). Bestätigung nicht erzwungen — deckt sich mit CHANGELOG.
- **Rollen-Gating der Einstiege:** Team-Tab nur für `volunteer`/`admin` (`TabBar.tsx:45,77`), Verwaltung im Profil nur für Team, Abzeichen/Aktionen/Ränge nur für `admin` (`account.tsx:416-430`), Teil-Detail für Besucher:innen als Nur-Lesen (`items/[id].tsx:70`). Backend-Regeln decken alle Schreibwege ab (siehe Vertragsabgleich).
- **Cache-Invalidierung:** nach Scan `qc.invalidateQueries()` gesamt plus `refetchQueries(['me'])` (`scan.tsx:71-72,89-90`) — Punkte, Serie, Abzeichen, Bestand, Laden-Liste alle abgedeckt. Bestandsänderungen über `invalidateItems` mit Präfix-Schlüsseln (`queryClient.ts:21-33`), Aktionen über `invalidateCampaigns` inkl. Aushang (`:39-45`). Teil-Detail ruft zusätzlich `refetch()` (`items/[id].tsx:154-155`).
- **Query-Keys** eindeutig; nutzerbezogene Abfragen (`my_items`, `points_log`, `user_badges`) filtern auf die eigene ID, obwohl die Regeln Admins mehr erlauben würden (`useData.ts:42,194-198,233-235`) — richtig. `staleTime` 30 s, `retry: 1` vertretbar (auch 4xx wird einmal wiederholt, harmlos). Kein Endlos-Retry bei 401.
- **Fehlertexte:** `errorText` reicht deutsche Server-Meldungen durch, bildet Status 0 auf „Keine Verbindung", 401/403/404/413/429/5xx auf deutsche Sätze ab und erkennt die englischen SDK-Eigenmeldungen (`errors.ts:18-26,59-109`). Alle heutigen Meldungen der eigenen Routen (`scan.pb.js`, `push.pb.js`) treffen den Deutsch-Heuristik; `Ungueltiger Token` nicht, ist aber kein Nutzerfall. Scanner, Profil, Admin-Screens nutzen `errorText`.
- **Push-Aufbau:** `setNotificationHandler` mit `shouldShowBanner/shouldShowList` (aktuelle API, `_layout.tsx:27-34`); Android-Kanäle beim Modulstart vor jeder Nachricht (`_layout.tsx:40`, `push.ts:65-79`); Kennungen `streak`/`campaign`/`badge`/`other` identisch in `push.ts:20-55`, `pb_hooks/lib/push.js:19-24` und `docs/push-channels.md`; `projectId` aus `app.json → extra.eas.projectId` (`push.ts:82-87`). Token-Registrierung als Upsert bei jedem Eintritt in den Nutzerbereich, nur auf echten Geräten (`push.ts:92-117`). Deep Links aus Push gegen Allow-List geprüft, nur bei echtem Tipp (`push.ts:134-147`); alle vom Backend gesendeten Ziele (`/(visitor)/points` in `points.js:373`, `defaults.pb.js:389`; Admin-Broadcast ohne Ziel `api.ts:81-90`) sind enthalten. Kalt- und Warmstart getrennt behandelt (`_layout.tsx:89-104`).
- **Push-Einstellungen:** vier Schalter entsprechen den vier Feldern am Nutzer (`push.tsx:12-19` ↔ Schema `1700000000:35-38` ↔ `push.js` Opt-in-Zuordnung); optimistisches Umschalten mit Rücknahme bei Fehler.
- **Konfiguration:** `.env.example` mit richtigem Punycode-Host; nur HTTPS, keine ATS-Ausnahme nötig; `scheme: "pp"`; Kamera- und Standort-Texte deutsch (`app.json` iOS-`infoPlist` und Plugin-Konfiguration identisch); `ITSAppUsesNonExemptEncryption: false`; Android-Berechtigungen auf Kamera und Standort begrenzt.
- **Doppel-Submit:** Login, Registrierung, Onboarding-Abschluss, alle Profil-Aktionen, Scan (`busy`), Nachtragen (`extraBusy`) und Konto löschen sind über `loading`/`busy` gesperrt; `PPButton` ignoriert `onPress` im Lade- oder Sperrzustand (`PPButton.tsx:111,137,156`). Der Scanner selbst re-armt erst, wenn der Elternteil wieder `active` setzt (`QRScanner.tsx:23-31`).
- **Start-Sequenz:** Splash bleibt bis Schriften geladen sind oder 2,5 s vergangen sind (`_layout.tsx:145-165`); Schrift-Rückfall auf Systemschrift ist vertretbar. Fehlerbildschirm kommt ohne eigene Schriften aus (`_layout.tsx:46-48`).
- **Kein Klartext-Geheimnis im App-Code:** `Store`-Typ kennt `checkin_qr_secret` nicht (`types.ts:111-127`), die App liest die Sammlung `store_secrets` nirgends; `git grep` über `mobile/` nach Token, Passwörtern, Admin-Konten ohne Treffer.

## Unklar / zu klären

- **Macht PocketBase 0.22.21 bei `confirm-email-change` und `confirm-password-reset` die Token anderer Geräte ungültig?** Für den Passwortwechsel ja (Code-Kommentar `useAuth.ts:95`, plausibel: `tokenKey` wird erneuert), für den Adresswechsel nicht geprüft. Beides verschärft A-2. Am besten gegen die Instanz messen: Token auf Gerät A, Reset über Web, dann `GET /api/collections/users/auth-refresh` mit dem alten Token.
- **Token-Laufzeit der Instanz** (`users` → Auth-Options `tokenDuration`): Standard 14 Tage, nicht gemessen. Bestimmt, wie oft A-2 ohne fremdes Zutun eintritt.
- **`getLastNotificationResponseAsync` auf Android:** Es gibt Berichte, dass die letzte Antwort bei einem späteren normalen Kaltstart erneut geliefert wird — dann würde die App ungebeten zur Punkte-Seite springen. Auf Gerät prüfen: Push antippen, App komplett beenden, normal öffnen.
- **Größe des SecureStore-Werts:** `AsyncAuthStore` speichert Token **und** kompletten Nutzerdatensatz als JSON. expo-secure-store dokumentiert eine Warnung ab 2048 Bytes auf iOS. Im installierten Paket war keine harte Grenze zu finden; die tatsächliche Größe (Token ~250 Zeichen + Datensatz ~700–900 Zeichen) liegt vermutlich darunter, wurde aber nicht gemessen.
- **`useGoBack` mit fremdem `from`:** Ein Deep Link `pp://settings/account?from=https://…` ruft `router.replace(from)` mit einer externen Adresse auf (`useGoBack.ts:19`). Ob expo-router 57 das extern öffnet oder als unbekannte Route behandelt, wurde nicht geprüft. Empfehlung unabhängig davon: `from` gegen eine Liste interner Routen prüfen.
- **Stand der Produktion:** Laut CLAUDE.md hat die Instanz kein Git-Arbeitsverzeichnis; ob `defaults.pb.js`, `scan.pb.js` (mit `bonus_points`) und die Migrationen dort dem Repo-Stand entsprechen, konnte hier nicht geprüft werden. Für A-1 ist das entscheidend: Ein Fix im Repo zählt erst nach dem Abgleich.

## Vertragsabgleich App ↔ Backend

| Aufruf (App) | Route / Collection | Ergebnis |
|---|---|---|
| `scan({ qr_code, gps_lat?, gps_lng?, items_count? })` (`api.ts:18-28`) | `POST /api/pp/scan` (`scan.pb.js:35-175`, `openapi.yaml:91-272`) | **Anfrage passt.** Antwort: `type`, `points`, `points_total`, `already_checked_in`, `streak_weeks`, `label`, `item_points`, `checkin_points`, `did_checkin` passen; **`bonus_points` fehlt in `ScanResult`** (A-3). Fehlertexte 400/401/404/409/410/500 deutsch und in `errorText` behandelt. |
| `registerPushToken` → `{ expo_token, platform }` (`push.ts:110-113`) | `POST /api/pp/push/register` (`push.pb.js:200-225`) | passt; Token-Form wird serverseitig geprüft, Antwort `{ ok: true }` wird nicht ausgewertet (kein Bedarf). |
| `unregisterPushToken` → `{ expo_token }` (`push.ts:166-169`) | `POST /api/pp/push/unregister` (`push.pb.js:228-241`) | passt; braucht gültiges Token — App ruft es vor dem Leeren auf. |
| `users.authWithPassword(email, password)` | `POST /api/collections/users/auth-with-password` | passt (PocketBase-Standard). |
| `users.create({ email, password, passwordConfirm, name, role })` (`useAuth.ts:36-42`) | `users.createRule = ''` (gemessen 14.09.), Hook `defaults.pb.js:247-260` | **Abweichung:** `role` wird angenommen statt erzwungen (A-1). `onboarding_complete`, Push-Flags setzt der Hook — richtig. |
| `users.requestVerification(email)` / `requestPasswordReset(email)` / `requestEmailChange(newEmail)` | PocketBase-Standardrouten | passen; Bestätigung über `web/konto.html` (`confirm-verification`, `confirm-password-reset`, `confirm-email-change`). |
| `users.update(id, { name })`, `{ onboarding_complete }`, `{ push_*_enabled }`, `{ oldPassword, password, passwordConfirm }` | `users.updateRule = 'id = @request.auth.id'` (gemessen), Hook `defaults.pb.js:267-285` friert `points_total`, `streak_weeks`, `streak_last_visit`, `role` ein | passt; alle Felder existieren im Schema (`1700000000:18-38`). |
| `users.getOne(id)` (`useData.ts:13`) | `viewRule = 'id = @request.auth.id'` | passt; `email`/`verified` sind für den eigenen Datensatz sichtbar. |
| `users.delete(id)` (`useAuth.ts:146`) | `deleteRule = 'id = @request.auth.id'` (gemessen) | passt; Kaskaden wie im Dialog beschrieben. |
| `users.authRefresh()` (`useAuth.ts:63`) | `POST /api/collections/users/auth-refresh` | passt; wird nur nach Namensänderung genutzt (A-2). |
| `items.getList(1, 12, { filter: 'is_showcase = true && taken_at = null && archived_at = null', sort: 'showcase_position' })` | `items` listRule `1782710000` (approved / eigene / Team) | passt; Felder vorhanden (`1700000000:86-90`). |
| `items.getList(1, 100, { filter: created_by = "<uid>", sort: '-created' })` | dito | passt; Grenze 100 (A-15). |
| `items.getList(1, 6, …)` / `items.getFullList({ filter: status = "approved" && taken_at = null && archived_at = null })` | dito | passt; `status` seit `1700000600:137-141`. |
| `items.getOne(id)` | viewRule dito | passt. |
| `items.getFullList({ sort: '-created', expand: 'created_by' })`, `items.getList(1, 100, { filter: 'status = "pending"', expand: 'created_by' })` | Team liest alles; `expand` auf `users` unterliegt `users.viewRule` | passt; bekannter offener Punkt aus `ABNAHME.md:350-356`: `expand` löst für fremde Konten nicht auf (kein Name in der Freigabeliste) — nicht Teil dieses Bereichs. |
| `items.create(FormData: title, category, size?, condition?, points?, note?, location?, stays_external, is_showcase?, photo?)` (`api.ts:118-139`) | `createRule = '@request.auth.id != ""'`; Hook setzt `sku`, `qr_code`, `points`, `status`, `created_by`, erzwingt `is_showcase=false` für Besucher | passt; `category`/`condition` müssen zu den Select-Werten passen (`1700000000:55-78`) — Werte kommen aus `lib/format.ts`, außerhalb des Bereichs. |
| `items.update(id, { status: 'approved', is_showcase?, campaign? })`, `{ is_showcase }`, `{ status: 'archived', is_showcase: false, archived_at }`, `Partial<Item>` | `updateRule = volunteer \|\| admin`; `campaign` seit `1700001000:394-398` | passt; Bring-Punkte über `onRecordAfterUpdateRequest` (`defaults.pb.js:330-397`). |
| `badges.getFullList({ filter: 'is_visible = true', sort: 'tier_bronze' })`, `badges.getFullList({ sort: 'created' })` | `badges` listRule Angemeldete | passt. |
| `badges.create/update/delete(Partial<Badge>)` | Regeln `admin` | passt; `is_secret`, `color`, `kind`, `campaign`, `tier_*`, `reward_*` alle im Schema. |
| `campaigns.getFirstListItem('starts_at <= "<now>" && ends_at >= "<now>"', { sort: '-multiplier' })`, `getFullList(…)`, `getFullList({ sort: '-starts_at' })` | `campaigns` listRule Angemeldete | passt; Zeitformat `YYYY-MM-DD HH:mm:ss.sssZ` entspricht PocketBase-Speicherform. |
| `campaigns.create/update/delete` | Regeln `admin` | passt; `mult_*`, `color`, `badge`, `description` im Schema. |
| `needs.getFullList({ filter: 'is_active = true', sort: 'sort' })`, `getFullList({ sort: 'sort' })`, `create/update/delete` | `needs` (`1700000700:223-240`), Schreiben `volunteer \|\| admin` | passt; `color`, `campaign` seit `1782660000`. |
| `points_log.getList(1, 300, { filter: user = "<uid>", sort: '-created' })` | listRule Eigentümer/Admin | passt; `kind` enthält serverseitig `bring`, Typ nicht (A-16). |
| `user_badges.getFullList({ filter: user = "<uid>", expand: 'badge' })` | listRule Eigentümer/Admin; `badge` Relation | passt; `current_tier` inkl. `diamant` (`1700000800:290-296`). |
| `store.getFirstListItem('')` (`useData.ts:246`) | `store` listRule Angemeldete seit `1782690000:629-632` | passt; `Store`-Typ ohne `checkin_qr_secret` (gut) und ohne `timezone` (A-16). |
| `store.update(id, { tiers_json })`, `store.update(id, { pts_checkin, pts_take, pts_bring, max_items_take })` | `updateRule = admin`; Felder `1782637408`, `1782650000` | passt. |
| `push_messages.create({ title, body, target_segment: 'all', deep_link, scheduled_at, sent_at: '' })` (`api.ts:81-90`) | `createRule = admin`; Felder `1700000000:302-316`; Cron `cron.pb.js:31` liest `deep_link` und sendet als Kategorie `campaign` | passt; nur Admin darf, die Oberfläche zeigt den Schalter auch nur Admins (`needs.tsx:37-38`). |
| Deep Links aus Push (`data.deep_link`) | `push.js:134` sendet `/(visitor)/points` (Serie, Freigabe) bzw. Admin-Text ohne Ziel | passt zur Allow-List `push.ts:125-132`. |

## Prüfspuren

- `npx tsc --noEmit -p mobile/tsconfig.json` → Exit 0, keine Ausgabe (Protokoll im Scratchpad `app-grundgeruest/tsc.txt`).
- `git status` nach dem Audit: nur dieser Bericht neu; keine Änderung an Projektcode (die bereits vorher geänderte `package-lock.json` im Repo-Root stammt nicht aus diesem Audit).
