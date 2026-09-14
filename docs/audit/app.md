# Audit: App (mobile/)

> **Abgenommen am 14.09.2026.** Der Stand jedes einzelnen Befunds — behoben,
> bewusst offen, offen oder hinfällig — steht in [`ABNAHME.md`](ABNAHME.md),
> jeweils am Code belegt. Behobene Befunde sind zusätzlich hier markiert;
> gelöscht wurde nichts.

**Datum:** 14.09.2026
**Umfang:** `mobile/app/` (Screens, 27 Dateien), `mobile/components/` (Komponenten inkl. `ui/`), `mobile/lib/` (Bibliothek, vollständig). Ausgenommen: `mobile/ios/`, `mobile/android/`, `node_modules`.
**Grundlage:** `CLAUDE.md` (Projektregeln), Gegenprobe gegen `pocketbase/pb_migrations/` und `pocketbase/pb_hooks/`, wo ein Befund von Server-Berechtigungen abhängt.
**Methode:** Jeder Befund ist am Code belegt (Datei:Zeile). Befunde, die sich nur aus der App nicht entscheiden ließen, wurden gegen das Backend geprüft und sind dort entsprechend vermerkt.

---

## Befunde

### [KRITISCH] Abmelden räumt weder den Query-Cache noch den Push-Token auf — das nächste Konto sieht fremde Daten — **BEHOBEN 14.09.2026**

> **Behoben am 14.09.2026.** `logout` (`useAuth.ts:82-90`) ist jetzt async und
> arbeitet in der empfohlenen Reihenfolge: `await unregisterPushToken()` in
> `try/catch` (ein Gerät ohne Netz muss trotzdem herauskommen), dann
> `pb.authStore.clear()`, dann `queryClient.clear()`. Damit hat
> `unregisterPushToken` auch seinen ersten Aufrufer.
>
> **Ungetestet:** Für `mobile/` gibt es keine Testinfrastruktur.

**Fundstelle:** `mobile/lib/hooks/useAuth.ts:68`, `mobile/app/(visitor)/settings/account.tsx:264`, `mobile/app/(visitor)/settings/store.tsx:137`, `mobile/lib/queryClient.ts:3-11`

```ts
// useAuth.ts:68
logout: () => pb.authStore.clear(),
```

```tsx
// account.tsx:264 — einziger Aufrufer, ohne jede Nachbereitung
<Pressable onPress={logout}>
```

`logout` löscht ausschließlich den Auth-Store. Der `QueryClient` ist ein Modul-Singleton (`queryClient.ts:3`), der über die gesamte App-Laufzeit bestehen bleibt; er wird beim Abmelden nirgends geleert. Ebenso wenig wird `unregisterPushToken()` aus `lib/push.ts:87` gerufen — die Funktion existiert, hat aber im ganzen Repo keinen Aufrufer:

```
$ grep -rn "unregisterPushToken" mobile/app mobile/lib mobile/components
mobile/lib/push.ts:87:export async function unregisterPushToken(): Promise<void> {
```

**Fehlerszenario A (fremde Daten):** Auf dem Ladentablet meldet sich Helferin A ab, Besucherin B meldet sich an. Die Caches `['me']`, `['points_log', 300]`, `['user_badges']`, `['my_items']`, `['all_items']`, `['pending_items']` tragen noch die Daten von A. Da `queryClient.ts:6` `staleTime: 30_000` setzt und die meisten dieser Hooks kein `refetchOnMount: 'always'` haben (nur `showcase`, `recent_items`, `store_items` haben es, siehe `useData.ts:22,54,71`), rendert B bis zu 30 Sekunden lang **A's Punktestand, A's Punkteverlauf und A's Abzeichen**. Auf der Startseite steht dann „Moin, \<Name von A\>!" (`index.tsx:84`) über A's Punktezahl im Ring.

**Fehlerszenario B (Push an die falsche Person):** Der Expo-Push-Token bleibt nach dem Abmelden auf A's Konto registriert. Beim nächsten Anmelden von B registriert `registerPushToken()` (`(visitor)/_layout.tsx:9-11`) denselben Token zusätzlich auf B. Das Gerät empfängt danach Streak-Erinnerungen und Abzeichen-Meldungen für **beide** Konten — inklusive Mitteilungen über A's Punkte, obwohl A das Gerät nicht mehr benutzt. Das ist zugleich ein Datenschutzproblem: die DSGVO-Opt-out-Funktion, für die `unregisterPushToken` ausdrücklich gebaut wurde (Kommentar `push.ts:86`), läuft nie.

**Empfehlung:** `logout` zu einer async-Funktion machen, die in dieser Reihenfolge arbeitet: `await unregisterPushToken()` (Fehler schlucken, es darf das Abmelden nicht blockieren) → `pb.authStore.clear()` → `queryClient.clear()`. Der `QueryClient` muss dafür in `useAuth` erreichbar sein (Import aus `lib/queryClient` genügt, da Singleton). Tests: ein Test, der nach `logout()` prüft, dass `queryClient.getQueryData(['me'])` `undefined` ist, und einer, der den Aufruf von `unregisterPushToken` belegt.

---

### [HOCH] Freigeben, Ablehnen und Archivieren aktualisieren die Startseite nicht — der Zähler „Teile warten" bleibt falsch stehen — **BEHOBEN 14.09.2026**

> **Behoben am 14.09.2026.** `invalidateItems(qc)` (`lib/queryClient.ts:21-33`)
> invalidiert alle sechs abhängigen Schlüssel an einer Stelle; benutzt in
> `items/review.tsx:149`, `items/index.tsx:147`, `items/[id].tsx:151` und
> `items/new.tsx:105`.
>
> **Ungetestet:** Für `mobile/` gibt es keine Testinfrastruktur.

**Fundstelle:** `mobile/app/(visitor)/items/review.tsx:145-148`, `mobile/app/(visitor)/index.tsx:42-43`, `mobile/lib/hooks/useData.ts:107-120`

```tsx
// review.tsx:145 — invalidiert NUR 'showcase', nicht 'pending_items'
const onDone = async () => {
  await refetch();
  await qc.invalidateQueries({ queryKey: ['showcase'] });
};
```

`refetch()` aktualisiert nur die Instanz der Query auf **diesem** Screen. Der Zähler auf der Startseite liest dieselbe Query über einen eigenen Hook-Aufruf:

```tsx
// index.tsx:42
const { data: pending } = usePendingItems();
const openCount = pending?.length ?? 0;
```

`refetch()` einer Query-Instanz schreibt zwar in denselben Cache-Eintrag `['pending_items']` — solange die Startseite gemountet ist, kommt der neue Wert an. Die Startseite ist als erster Tab aber nicht durchgehend gemountet, wenn die Freigabe über den Deep-Link `/(visitor)/items/review` (erlaubt in `push.ts:57`) oder aus dem Inventar erreicht wurde. Zusätzlich fehlen die weiteren betroffenen Schlüssel: `['recent_items', 6]` und `['store_items']` zeigen freigegebene Teile (`useData.ts:51-80`, Filter `status = "approved"`), werden nach einer Freigabe aber nirgends invalidiert.

Dieselbe Lücke in der Gegenrichtung: `items/index.tsx:143-147` invalidiert `['showcase']` und `['pending_items']`, aber **nicht** `['recent_items']` und `['store_items']`.

**Fehlerszenario:** Eine Helferin tippt auf der Startseite auf die orange Karte „3 Teile warten", gibt alle drei frei und geht zurück. Die Karte zeigt weiter „3 Teile warten" in Warnfarbe, obwohl nichts mehr offen ist. Sie tippt erneut, findet eine leere Liste („Nichts zu prüfen"), und hält das für einen Fehler. Ebenso: das eben freigegebene Teil taucht unter „Neu im Laden" nicht auf, bis die 30 Sekunden `staleTime` abgelaufen sind und der Screen neu mountet.

**Empfehlung:** Eine gemeinsame Hilfsfunktion für „Bestand hat sich geändert", die alle abhängigen Schlüssel invalidiert: `['pending_items']`, `['all_items']`, `['showcase']`, `['recent_items']`, `['store_items']`, `['my_items']`. Sie von `review.tsx:145`, `items/index.tsx:143`, `items/[id].tsx:148` und `items/new.tsx:103` aus benutzen. Test: nach einer simulierten Freigabe prüfen, dass genau diese Schlüssel als invalidiert markiert sind (auf die Liste prüfen, nicht auf „mindestens einer").

---

### [HOCH] Ein Volunteer kann eine Ankündigung mit Push anlegen — die Push scheitert immer, weil `push_messages` nur Admins gehört

**Fundstelle:** `mobile/app/(visitor)/settings/account.tsx:242`, `mobile/app/(visitor)/admin/needs.tsx:137-148`, `mobile/lib/api.ts:81-90`; gegengeprüft in `pocketbase/pb_migrations/1700000000_init_schema.js:294-299` und `1700000700_badge_kinds_actions.js:59-65`

```tsx
// account.tsx:242 — der Aushang-Link ist für isStaff offen, nicht nur für isAdmin
<AdminLink icon="search" label="Aushang & Ankündigungen" onPress={() => router.push('/(visitor)/admin/needs?...')} />
{isAdmin && <AdminLink icon="medal" label="Abzeichen" ... />}
```

```ts
// api.ts:81 — schreibt in push_messages
export async function sendPushNow(title: string, body: string, deepLink?: string): Promise<void> {
  await pb.collection('push_messages').create({ ... });
}
```

Die Berechtigungen im Backend stehen dazu quer:

```js
// pb_migrations/1700000000_init_schema.js:294-299 — push_messages
name: 'push_messages',
listRule: '@request.auth.role = "admin"',
createRule: '@request.auth.role = "admin"',

// pb_migrations/1700000700_badge_kinds_actions.js:59-63 — needs
name: 'needs',
createRule: '@request.auth.role = "volunteer" || @request.auth.role = "admin"',
```

Ein Volunteer darf `needs` anlegen, aber **nicht** `push_messages`. Der Schalter „Als Push senden" (`needs.tsx:146`) wird ihm trotzdem angeboten.

**Fehlerszenario:** Eine Helferin (Rolle `volunteer`) legt vor dem Öffnungstag die Ankündigung „Heute geschlossen" an und schaltet „Als Push senden" ein, damit niemand umsonst kommt. Der Aushang wird gespeichert, die Push wird vom Server mit 403 abgewiesen. Sie sieht den Hinweis aus `needs.tsx:52` — „Die Push konnte nicht gesendet werden: …" — mit einer technischen englischen Meldung dahinter (siehe Befund zu `e?.message`). Sie schließt daraus, dass es ein vorübergehender Fehler war, versucht es erneut und verlässt sich am Ende darauf, dass die Leute informiert sind. Es kommt niemand an.

**Empfehlung:** Entweder den Push-Schalter in `needs.tsx:137` auf `isAdmin` einschränken (dann sieht ein Volunteer erst gar keine Funktion, die er nicht hat), oder `push_messages.createRule` im Backend auf `volunteer || admin` erweitern — additiv per neuer Migration. Die Entscheidung ist fachlich: Darf das Team pushen oder nur die Leitung? Tests je nach Weg: ein Test für den erlaubten und einer für den verbotenen Fall (Projektregel für Sicherheitsfixes).

---

### [HOCH] Englische Fehlermeldungen aus dem SDK landen in deutschen Dialogen — **BEHOBEN 14.09.2026**

> **Behoben am 14.09.2026.** `errorText(e, fallback)` in `mobile/lib/errors.ts`
> reicht deutsche Server-Meldungen durch, erkennt die SDK-Sätze und bildet
> Netz-, Berechtigungs- und Validierungsfehler auf deutsche Texte ab. An allen
> 14 Stellen eingesetzt; ein `grep` findet keinen rohen `e?.message`-Durchgriff
> mehr.
>
> **Ungetestet:** Für `mobile/` gibt es keine Testinfrastruktur.

**Fundstelle:** 14 Stellen, u.a. `mobile/app/(visitor)/items/new.tsx:113`, `items/[id].tsx:186`, `items/review.tsx:36,61`, `items/index.tsx:46`, `admin/badges.tsx:154,172`, `admin/actions.tsx:104`, `admin/needs.tsx:52,57`, `admin/tiers.tsx:96`, `settings/account.tsx:126,148`, `mobile/app/scan.tsx:73`

```tsx
// items/new.tsx:113
Alert.alert('Fehler', e?.message ?? 'Konnte das Teil nicht einstellen.');
```

Der deutsche Rückfalltext greift nur, wenn `e.message` `null`/`undefined` ist. Der PocketBase-Client setzt `message` aber **immer** — belegt im installierten SDK (`pocketbase@0.22.1`, `ClientResponseError`-Konstruktor):

```
$ grep -o "Something went wrong while processing your request\.\|The request was autocancelled[^\"]*" \
    mobile/node_modules/pocketbase/dist/pocketbase.es.mjs | sort -u
Something went wrong while processing your request.
The request was autocancelled. You can find more info in https://github.com/pocketbase/js-sdk#auto-cancellation.
```

Damit ist der deutsche Text praktisch toter Code: Bei jedem Fehler, für den der Server keine eigene Meldung liefert (Netzwerkabbruch, 403, 500, abgebrochener Request), erscheint stattdessen der englische SDK-Satz. Das verstößt gegen die Projektregel „Nutzertexte in der App auf Deutsch — auch Fehlermeldungen aus dem Backend" (`CLAUDE.md`, Abschnitt Sprache).

**Fehlerszenario:** Eine Besucherin im Laden hat schlechtes Netz und reicht ein Teil ein. Der Upload scheitert. Statt „Konnte das Teil nicht einstellen." liest sie in einem Dialog mit der Überschrift „Fehler" den Satz „Failed to connect to the PocketBase server. Try changing the SDK URL from localhost to 127.0.0.1 (https://github.com/pocketbase/js-sdk/issues/21)." — ein Entwicklerhinweis samt GitHub-Link, der ihr sagt, sie solle eine SDK-URL ändern.

Dass die selbstgebauten Routen deutsche Meldungen liefern, ändert daran nichts: `pb_hooks/scan.pb.js` ist vorbildlich deutsch („Du bist nicht im Laden", „Schon mitgenommen"), aber die generischen CRUD-Routen, über die Einstellen, Freigeben und Speichern laufen, sind es nicht.

**Empfehlung:** Eine zentrale Funktion `errorText(e, fallback)` in `lib/format.ts` oder `lib/api.ts`, die die bekannten englischen SDK-Sätze und jeden nicht-deutschen Text auf den übergebenen deutschen Rückfalltext abbildet, und zusätzlich HTTP-Status-typische Fälle übersetzt (403 → „Dafür fehlt dir die Berechtigung.", Netzwerkfehler → „Keine Verbindung. Bist du online?"). Alle 14 Stellen darauf umstellen. Test: die Funktion mit einem `ClientResponseError` ohne Server-Message füttern und auf den exakten deutschen Text prüfen.

---

### [MITTEL] Der Fortschrittsring auf der Startseite kann eine veraltete Punktzahl zeigen — `syncTotal` schreibt in ein Feld, das der Ring nicht liest

**Fundstelle:** `mobile/app/scan.tsx:19-25,68-70`, `mobile/lib/hooks/useData.ts:6-16`, `mobile/app/(visitor)/index.tsx:38,55`

```ts
// scan.tsx:19 — schreibt den frischen Stand in den Auth-Store
function syncTotal(total: number) {
  const rec = pb.authStore.record;
  if (rec && typeof total === 'number') {
    rec.points_total = total;
    pb.authStore.save(pb.authStore.token, rec);
  }
}
```

Der Kommentar darüber (`scan.tsx:16-18`) begründet das damit, dass „useAuth()-Konsumenten … es sofort widerspiegeln". Die Startseite liest ihre Punkte aber gar nicht aus `useAuth`, sondern aus der Query:

```tsx
// index.tsx:38,55
const { data: user } = useCurrentUser();
const total = user?.points_total ?? 0;
```

```ts
// useData.ts:6-16 — eigener Cache-Eintrag ['me'], unabhängig vom authStore
export function useCurrentUser() {
  return useQuery({ queryKey: ['me'], ... });
}
```

Der `syncTotal`-Pfad ist damit für den Ring wirkungslos. Was ihn tatsächlich aktualisiert, ist `qc.refetchQueries({ queryKey: ['me'] })` in `scan.tsx:70` — und das läuft, wie es soll. Der Befund ist deshalb nicht „der Ring bleibt stehen", sondern: Es gibt einen zweiten, stillen Schreibpfad auf dieselbe Zahl, der bei jedem Scan einen `authStore.onChange` auslöst und damit in `useAuth.ts:15-18` ein `setUser` in **jeder** gemounteten Komponente mit `useAuth` anstößt. Das sind derzeit `_layout.tsx:61` (RootNavigator), `settings/account.tsx:102` und `settings/store.tsx:33`.

**Fehlerszenario:** Bei jedem Scan re-rendert der RootNavigator. Sein Guard-Effekt (`_layout.tsx:89-102`) hat `segments` in den Abhängigkeiten und läuft mit. Solange `isAuthenticated` und `onboarding_complete` stimmen, passiert nichts Sichtbares — aber der Pfad ist unnötig und die Begründung im Kommentar trifft nicht mehr zu. Wenn eine spätere Änderung den Ring wieder auf `useAuth` umstellt, sind beide Quellen im Rennen: `syncTotal` schreibt den Wert *vor* dem `invalidateQueries`, `['me']` liefert danach den Serverwert.

**Empfehlung:** `syncTotal` entfernen und sich auf `refetchQueries({ queryKey: ['me'] })` verlassen — das ist bereits da und ist die Quelle, die der Ring liest. Falls ein sofortiger optimistischer Wert gewünscht ist, gehört er als `qc.setQueryData(['me'], ...)` in denselben Cache, nicht in den Auth-Store. Vorher: ein Test, der den bisherigen Punktestand nach einem Scan absichert (Projektregel: „Nichts an der App-Logik ändern, solange kein Test den bisherigen Stand absichert").

---

### [MITTEL] Aktionen anlegen oder ändern aktualisiert den Aushang auf der Startseite nicht — **BEHOBEN 14.09.2026**

> **Behoben am 14.09.2026.** `invalidateCampaigns(qc)`
> (`lib/queryClient.ts:39-45`) deckt `['campaigns']` (Präfix, trifft beide
> Listen), `['campaign','active']` und `['needs','active']` ab; benutzt in
> `admin/actions.tsx:175`.
>
> **Ungetestet:** Für `mobile/` gibt es keine Testinfrastruktur.

**Fundstelle:** `mobile/app/(visitor)/admin/actions.tsx:181-185`, `mobile/lib/hooks/useData.ts:152-164`, `mobile/app/(visitor)/index.tsx:41`

```tsx
// actions.tsx:181 — invalidiert ['campaign','active'], die Startseite liest aber ['campaigns','active-list']
const onSaved = async () => {
  setOpenId(null); setCreating(false);
  await refetch();
  await qc.invalidateQueries({ queryKey: ['campaign', 'active'] });
};
```

Es gibt zwei getrennte Queries mit unterschiedlichen Schlüsseln:

```ts
// useData.ts:123 — Einzel-Aktion
queryKey: ['campaign', 'active'],
// useData.ts:154 — Liste für den Aushang, das ist die, die index.tsx nutzt
queryKey: ['campaigns', 'active-list'],
```

`['campaign', 'active']` ist ein anderer Schlüssel als `['campaigns', 'active-list']` — die Präfix-Invalidierung greift hier nicht, weil sich schon das erste Element unterscheidet (`campaign` vs. `campaigns`). Die Startseite (`index.tsx:41`) liest ausschließlich `useActiveCampaigns()`. Zusätzlich hängt `['needs', 'active']` davon ab: `index.tsx:60-61` blendet Ankündigungen aus, sobald die verknüpfte Aktion läuft — ändert sich der Zeitraum einer Aktion, ändert sich damit auch, welche Ankündigungen sichtbar sind.

Bemerkenswert: Der Gegenweg ist korrekt gebaut — `admin/needs.tsx:168` invalidiert `['needs', 'active']`, also genau den Schlüssel, den die Startseite liest.

**Fehlerszenario:** Ein Admin legt am Samstagmorgen die Aktion „Winterkleidung ×2" mit Start heute an und geht zurück zur Startseite, um zu prüfen, wie sie aussieht. Der Aushang zeigt sie nicht. Er hält die Aktion für nicht gespeichert, legt sie ein zweites Mal an — und hat sie nun doppelt im Aushang stehen, beide Male mit demselben Bonus.

**Empfehlung:** In `actions.tsx:181` zusätzlich `['campaigns']` (Präfix, deckt beide Listen ab) und `['needs', 'active']` invalidieren. Test: nach einem simulierten Speichern prüfen, dass `['campaigns', 'active-list']` als invalidiert markiert ist.

---

### [MITTEL] Ein Besucher lädt bei jedem Start der Startseite alle offenen Freigaben — inklusive fremder Namen

**Fundstelle:** `mobile/app/(visitor)/index.tsx:39,42-43`, `mobile/lib/hooks/useData.ts:107-120`; gegengeprüft in `pocketbase/pb_migrations/1700000600_item_location_status.js:33`

```tsx
// index.tsx:39,42 — isStaff wird berechnet, die Query läuft aber für ALLE
const isStaff = user?.role === 'volunteer' || user?.role === 'admin';
const { data: pending } = usePendingItems();
```

```ts
// useData.ts:107 — enabled prüft nur, ob überhaupt jemand angemeldet ist
export function usePendingItems() {
  return useQuery({
    queryKey: ['pending_items'],
    enabled: pb.authStore.isValid,
    queryFn: async () => {
      const res = await pb.collection('items').getList(1, 100, {
        filter: 'status = "pending"', sort: 'created', expand: 'created_by',
      });
```

Das Ergebnis wird in der UI korrekt hinter `isStaff` versteckt (`index.tsx:243`) — die Anfrage läuft trotzdem. Sie ist auch nicht vom Server abgewiesen: `items.listRule` ist seit `1700000600_item_location_status.js:33` `'@request.auth.id != ""'`, jede angemeldete Person darf listen. Mit `expand: 'created_by'` kommen dabei die **Namen der einreichenden Personen** mit in die Antwort.

**Fehlerszenario:** Eine Besucherin öffnet die App. Ihr Gerät lädt im Hintergrund bis zu 100 noch nicht freigegebene Teile samt Titel, Foto-Verweis, interner Standortangabe (`location`, laut Kommentar in `items/[id].tsx:119-120` ausdrücklich intern) und den Klarnamen der Einreichenden. Nichts davon wird ihr angezeigt, aber alles liegt im Speicher ihres Geräts und im Query-Cache — und ist über jede Stelle erreichbar, die den Cache liest. Für sie ist es außerdem eine überflüssige Anfrage bei jedem Start.

**Empfehlung:** `usePendingItems` einen Parameter geben (`usePendingItems(enabled: boolean)`) und in `index.tsx:42` `isStaff` durchreichen. Der Schutz gehört fachlich zusätzlich ins Backend — die `listRule` für `items` erlaubt derzeit jedem Angemeldeten, den kompletten Bestand inklusive `pending` und `location` zu lesen. Das ist ein eigener Befund für ein Backend-Audit und hier nur als Ursache benannt, nicht als Auftrag.

---

### [MITTEL] Der Scanner verwirft den ersten Code, wenn der Standort langsam kommt

**Fundstelle:** `mobile/app/scan.tsx:59-64,45-57`, `mobile/components/QRScanner.tsx:15-25`

```tsx
// scan.tsx:59
const onScanned = async (data: string) => {
  if (busy || result || error) return;
  setBusy(true);
  try {
    const coords = await getCoords();   // kann mehrere Sekunden dauern
    const res = await scan({ qr_code: data, ...coords });
```

```tsx
// QRScanner.tsx:18-25 — Sperre läuft nach 1500 ms ab, unabhängig von busy
const handle = (result: { data: string }) => {
  if (!active || lockRef.current) return;
  lockRef.current = true;
  onScanned(result.data);
  setTimeout(() => { lockRef.current = false; }, 1500);
};
```

`getCoords()` ruft `Location.getCurrentPositionAsync` (`scan.tsx:52`) ohne Timeout auf. Im Laden — drinnen, oft ohne GPS-Sicht — dauert das regelmäßig deutlich länger als 1500 ms. Die Kamera bleibt währenddessen scharf: `active` ist `!result && !error && !busy` (`scan.tsx:110`), und `busy` ist zwar `true`, aber die interne Sperre `lockRef` läuft nach 1,5 Sekunden aus. Die zweite Auslösung wird dann in `onScanned:60` von `if (busy …) return` geschluckt — **still**, ohne jede Rückmeldung.

**Fehlerszenario:** Eine Besucherin hält die Kamera auf das Etikett einer Jacke. Die Standortermittlung hängt. Sie sieht nur den Spinner (`scan.tsx:129`), hält das für „nicht erkannt" und richtet die Kamera neu aus — die Sperre ist abgelaufen, der zweite Treffer wird verworfen. Nach mehreren Sekunden kommt endlich die Antwort für den **ersten** Scan. Verwirrender ist der umgekehrte Fall: Sie gibt auf und schwenkt auf ein anderes Teil, kurz darauf erscheint die Erfolgsmeldung für die Jacke, die sie gar nicht mehr in der Hand hält — mit Punkten, die für das falsche Teil gebucht sind.

Verschärfend: `getCoords` hat keine Zeitgrenze, und `addExtraItems` (`scan.tsx:80-98`) ruft dieselbe Funktion noch einmal, direkt nachdem der Check-in sie schon gebraucht hat.

**Empfehlung:** `getCoords` eine harte Zeitgrenze geben (`Promise.race` gegen ein Timeout von ca. 3 s, danach `{}` zurückgeben — der Server behandelt fehlende Koordinaten bereits, siehe `scan.pb.js:53`) und die Sperre in `QRScanner` an `active` koppeln statt an einen festen Timer, damit sie so lange hält, wie der Scan läuft. Vorher ein Test, der den heutigen Ablauf festschreibt.

---

### [NIEDRIG] Das Erfolgs-Sheet nach dem Scan zeigt „undefined Wochen Streak", wenn der Server das Feld nicht liefert

**Fundstelle:** `mobile/app/scan.tsx:204-208`, `mobile/lib/api.ts:9-15`

```tsx
// scan.tsx:206
{result.already_checked_in
  ? 'Du warst heute schon da.'
  : `+${result.points} Punkte · ${result.streak_weeks} Wochen Streak`}
```

`streak_weeks` ist in `ScanResult` als optional deklariert (`api.ts:12: streak_weeks?: number;`), wird hier aber ohne Rückfallwert in einen Template-String gesetzt. Ein fehlendes Feld ergibt die Zeichenkette `"undefined"`. Dasselbe gilt eine Zeile darunter für `result.points` und in `scan.tsx:172` für `result.label` (in `api.ts:13` ebenfalls optional) — dort rendert `undefined` immerhin als leerer Text statt als Wort.

**Fehlerszenario:** Nach einem Check-in liest die Besucherin im Erfolgs-Sheet „+10 Punkte · undefined Wochen Streak". Kein Absturz, aber eine sichtbar kaputte Meldung an der Stelle, an der die App den Erfolg feiern soll.

Der Fall ist heute unwahrscheinlich, weil `scan.pb.js` das Feld liefert. Er wird wahrscheinlich, sobald eine Backend-Änderung das Feld bei einem Sonderfall weglässt — und genau davor warnt die Projektregel „Ausgelieferte Apps nie brechen": Die App im Store liest die Antwort so, wie sie hier steht, auch in einem Jahr.

**Empfehlung:** `result.streak_weeks ?? 0` und `result.points ?? 0` schreiben; für `result.label` einen deutschen Rückfalltext („Teil mitgenommen"). Test: `ScanResult` ohne `streak_weeks` rendern und prüfen, dass kein „undefined" im Text steht.

---

### [NIEDRIG] Beim Anlegen einer Ankündigung wird der Erfolgs-Hinweis zweimal übereinandergelegt

**Fundstelle:** `mobile/app/(visitor)/admin/needs.tsx:48-55`

```tsx
if (push && !need) {
  try {
    await sendPushNow(...);
  } catch (e: any) {
    Alert.alert('Aushang gespeichert', 'Die Push konnte nicht gesendet werden: ' + (e?.message ?? 'Fehler'));
  }
}
onSaved();
```

Nach dem `Alert.alert` läuft `onSaved()` sofort weiter und schließt den Editor (`needs.tsx:166-167`). Der Dialog bleibt stehen, während der Screen darunter den Zustand wechselt. Auf Android wird ein `Alert` außerdem nicht in die Warteschlange gestellt: Steht schon einer offen, ersetzt oder verwirft das System ihn.

**Fehlerszenario:** Eine Helferin legt eine Ankündigung mit Push an, die Push scheitert (siehe Befund „Volunteer kann nicht pushen"). Sie sieht kurz einen Dialog, während der Editor darunter schon zuklappt — je nach Timing tippt sie den Dialog weg, ohne ihn gelesen zu haben, und geht davon aus, dass die Push raus ist.

**Empfehlung:** `onSaved()` in den `onPress`-Handler des Alert-Buttons ziehen, damit der Screen erst wechselt, wenn der Hinweis quittiert wurde — so wie es `items/new.tsx:105-111` bereits vormacht (`[{ text: 'OK', onPress: goBack }]`).

---

### [NIEDRIG] Die Kategorie-Auswahl im Teil-Editor zeigt rohe Schlüssel statt Klartext

**Fundstelle:** `mobile/app/(visitor)/items/[id].tsx:19-22,248-252`

```tsx
// [id].tsx:19 — rohe Schlüssel
const CATEGORIES = [
  'damen-oberteil', 'damen-hose', 'damen-kleid', 'damen-schuhe',
  'herren-oberteil', 'herren-hose', 'herren-schuhe', 'kinder', 'accessoires', 'sonstiges',
];
```

```tsx
// [id].tsx:250 — {c} ist der Schlüssel, nicht das Label
<Pill bg={...} color={...}>{c}</Pill>
```

Die App hat für genau diesen Zweck eine Übersetzung: `categoryLabel('damen-hose')` liefert „Damen · Hosen" (`lib/format.ts:43-48`) und ist im selben Screen bereits importiert (`[id].tsx:13` — `groupLabel`, `typeLabel` werden in der Besucheransicht benutzt). Nur der Staff-Editor umgeht sie.

Zusätzlich weicht die harte Liste von der einzigen Quelle in `lib/format.ts:9-25` ab: Dort gibt es `kinder-oberteil` nicht, hier fehlt umgekehrt `herren-kleid`. Der Kommentar in `format.ts:5` nennt sich selbst ausdrücklich „eine einzige Quelle für die ganze App".

**Fehlerszenario:** Eine Helferin bearbeitet ein Teil und soll die Kategorie korrigieren. Statt „Damen · Hosen" liest sie zehn Pillen mit „damen-hose", „herren-oberteil", „accessoires" — Datenbankschlüssel in Kleinschreibung mit Bindestrichen. Sie muss raten, was „sonstiges" von „accessoires" unterscheidet, und sieht nicht, dass die Liste andere Werte anbietet als das Formular beim Einstellen.

**Empfehlung:** Die Auswahl aus `CATEGORY_GROUPS` / `CATEGORY_TYPES` aufbauen (wie in `items/new.tsx:173-196`) und mit `categoryLabel(c)` beschriften. Die lokale `CATEGORIES`-Konstante entfällt damit.

---

## Was geprüft und für in Ordnung befunden wurde

**Auth-Fluss und geschützte Routen.** Der Einstieg ist doppelt abgesichert: `app/index.tsx:20-22` entscheidet selbst per `Redirect`, der Guard in `_layout.tsx:89-102` greift zusätzlich. Beide warten korrekt auf `ready`, das aus `useAuth.ts:15-19` kommt — mit `onChange(..., true)` für den Sofortaufruf und einem 800-ms-Timeout als Netz, falls kein gespeicherter Zustand existiert. Der Effekt räumt beides sauber auf (`useAuth.ts:20-23`). Registrierung meldet anschließend an (`useAuth.ts:33-42`), Passwortwechsel meldet nach dem serverseitigen Token-Verfall neu an (`useAuth.ts:64-66`) — beides notwendig und richtig.

**Deep Links aus Push-Nachrichten.** `lib/push.ts:51-73` behandelt die Nutzlast konsequent als fremde Eingabe: feste Erlaubnisliste, dazu ein eng gefasster regulärer Ausdruck für Teil-IDs (`^\/\(visitor\)\/items\/[A-Za-z0-9_-]+$`), alles andere öffnet nur die App. Zusätzlich wird geprüft, dass es ein echter Tipp war und keine Verwerfung (`actionIdentifier`, `push.ts:64-66`). Der Link wird erst ausgeführt, wenn Anmeldung und Onboarding durch sind (`_layout.tsx:105-113`) — mit Aufräumen des Timers.

**Aufräumen von Listenern und Timern.** Durchgehend korrekt: Notification-Listener (`_layout.tsx:82-87`), Font-Timeout (`_layout.tsx:138-141`), Cold-Start-Deep-Link mit `cancelled`-Flag gegen Zustandsänderungen nach dem Unmount (`_layout.tsx:72-78`), Barrierefreiheits-Listener der Tab-Leiste mit `alive`-Flag und `sub?.remove()` (`TabBar.tsx:60-72`), Toast-Timer (`Toast.tsx:28-35`). Kein Listener ohne Gegenstück gefunden.

> **Richtigstellung 14.09.2026 (Abnahme).** Der hier gelobte
> „Barrierefreiheits-Listener der Tab-Leiste" ist
> `AccessibilityInfo.isReduceTransparencyEnabled` und schaltet nur den
> Glas-Effekt um — er ist **kosmetisch und trägt zur Bedienbarkeit mit
> Screenreader nichts bei**. Das Aufräumen des Listeners ist korrekt, die
> Einordnung unter Barrierefreiheit war es nicht. Die App hat in Wahrheit
> **null** Barrierefreiheits-Auszeichnungen: kein `accessibilityLabel`,
> `accessibilityRole`, `accessibilityHint` oder `accessibilityState` in 65
> Dateien, bei 128 interaktiven Elementen. Siehe `ABNAHME.md`, Befunde B-1
> bis B-11.

**Absicherung der Punkte gegen Manipulation aus der App.** `points_total`, `streak_weeks`, `streak_last_visit` und `role` werden serverseitig auf den gespeicherten Wert zurückgesetzt, wenn ein Client sie zu ändern versucht (`pb_hooks/defaults.pb.js:26-44`). Die App versucht das an keiner Stelle. Die Rangleiter in `lib/format.ts:167-186` behandelt den Fall „noch kein Rang" korrekt (`current` ist `'—'`, der Fortschritt zählt von 0 zur ersten Schwelle) und klemmt den Fortschritt auf 0..1.

**Rechenlogik für Abzeichen.** `badgeTierInfo` (`format.ts:99-149`) filtert Stufen ohne Ziel heraus, behandelt den Fall „alle Stufen geschafft" getrennt und schützt gegen Division durch null (`span > 0 ? … : 0`). `badgeTierSlots` (`format.ts:89-97`) kappt korrekt bei fünf Stufen und fällt auf die internen Namen zurück, wenn ein Rang keinen Namen trägt. `nextTier` sortiert die Leiter defensiv, statt sich auf die Reihenfolge in der Datenbank zu verlassen.

**Absturzrisiken bei Listen.** Alle `.map`/`.filter`-Aufrufe auf Serverdaten sind über `?? []` oder `?.` abgesichert: `index.tsx:60-61`, `badges.tsx:184,199`, `points.tsx:53,75`, `store.tsx:143,152`, `items/index.tsx:150`, `showcase.tsx:66`, sowie alle Admin-Listen. `itemThumb` prüft `item.photo` vor dem Aufruf (`format.ts:251-254`). `initials` fängt fehlende Namen ab (`format.ts:267-272`).

**Farbwerte aus der Datenbank.** `normalizeHex` (`format.ts:391-397`) validiert streng gegen `^[0-9a-fA-F]{6}$` und gibt bei allem anderen `null` zurück; `withAlpha` und `lighten` bauen darauf auf und haben eigene Rückfallwerte. Ein kaputter Hex-Wert im Admin kann damit keine ungültige Farbe an React Native durchreichen.

**Wiederherstellung der Formularzustände.** Die Hydrierungs-Effekte sind bewusst auf die ID abhängig statt auf das ganze Objekt (`items/[id].tsx:53` → `[item?.id]`, `settings/account.tsx:116` → `[user?.id]`, `admin/tiers.tsx:50` → `[store?.id]`). Das ist richtig: Mit dem vollen Objekt in der Abhängigkeitsliste würde jeder Refetch die Eingaben der Nutzerin überschreiben, während sie tippt. Einzige Abweichung: `settings/push.tsx:43` hängt am ganzen `user` — dort sind es aber Schalter ohne Tippeingabe, und der Zustand wird bei jeder Änderung ohnehin optimistisch gesetzt und bei Fehlschlag zurückgenommen (`push.tsx:45-53`).

**Der Hinweis gegen Fokusverlust in `Screen`.** `components/ui/Screen.tsx:56-58` warnt ausdrücklich davor, den Wrapper als Inline-Komponente zu definieren, und rendert beide Zweige direkt. Der Code hält sich daran. Dieselbe Falle wurde in keinem der 27 Screens gefunden.

**Eindeutigkeit der SVG-Verlaufs-IDs.** `GradientRing` (`ui/GradientRing.tsx:30-32`) erzeugt die ID aus Größe, Strichstärke und einem optionalen Schlüssel, und die Abzeichen-Ansicht übergibt die Badge-ID (`badges.tsx:230`, `badges.tsx:67`). Ohne das würden sich zwei gleich große Ringe mit verschiedenen Farben gegenseitig überschreiben — der Kommentar benennt genau das.

**Schutz der internen Standortangabe in der Besucheransicht.** `items/[id].tsx:119-123` zeigt `item.location` normalen Nutzerinnen nicht an, mit einem Kommentar, der die Absicht festhält. Die Besucheransicht rendert ausschließlich unkritische Felder. (Dass die Angabe über die Sammelabfrage trotzdem auf dem Gerät landet, ist als eigener Befund oben erfasst.)

**Der Druckbogen für QR-Etiketten.** `lib/qrsheet.ts` maskiert alle eingesetzten Werte gegen HTML-Einschleusung (`esc`, Zeile 21-27), bettet die Codes als `data:`-URI ein (damit der Bogen ohne Netz vollständig ist) und hat einen Rückfallweg, wenn der Teilen-Dialog fehlt (`qrsheet.ts:94-99`). Die leere Auswahl wird vorher abgefangen (`items/index.tsx:169-172`).

**Deutsche Nutzertexte außerhalb der SDK-Meldungen.** Sämtliche fest verdrahteten Texte in Screens und Komponenten sind deutsch, einschließlich der Fehlertexte der Anmeldung („Klappt nich", „Fehlt noch was") und der Backend-Meldungen aus `pb_hooks/scan.pb.js` („Du bist nicht im Laden", „Schon mitgenommen", „Noch nicht freigegeben"). Datums- und Zahlenformate nutzen durchgehend `de-DE` (`format.ts:189,264`, `points.tsx:142`, `store.tsx:148`). Der einzige Verstoß ist der oben beschriebene Durchgriff auf `e?.message`.
