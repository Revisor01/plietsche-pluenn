/// <reference path="../pb_data/types.d.ts" />

// Drei Lesewege zumachen, die jedem angemeldeten Konto mehr zeigten oder
// erlaubten, als es für die App braucht. Additiv: keine Felder, keine
// Antwortformen, keine Sammlungen ändern sich — nur Regeln.
//
// ─── 1. visits.createRule: 'user = @request.auth.id' → null ───────────────
//
// Bisher konnte sich jedes Konto per POST /api/collections/visits/records
// beliebig viele Besuche auf sich selbst schreiben, mit frei gewähltem
// checkin_at. Am Punktestand ging das vorbei (defaults.pb.js friert
// points_total ein) — an den Abzeichen nicht: computeProgress zählt für
// trigger_type 'visits' schlicht die Zeilen (lib/points.js), und das
// Abzeichen „Stammgast" schüttet je Stufe 50/100/200/500 Punkte aus. Die
// wurden dann serverseitig über awardPoints vergeben, also am Schreibschutz
// vorbei. Wer nie im Laden war, konnte sich so Abzeichen samt Belohnung
// holen.
//
// Am 14.09.2026 gegen die laufende Instanz gemessen: Ein Besucherkonto legte
// einen Besuch an (HTTP 200), der Besuchszähler stieg von 2 auf 3. Der
// Testdatensatz wurde als Superuser wieder entfernt.
//
// null ist richtig, weil der Check-in ausschließlich serverseitig entsteht:
// doCheckin() in lib/points.js schreibt den Besuch über $app.dao(), und der
// Admin-DAO geht an den Regeln vorbei. Kein Client legt Besuche an —
// `grep -rn "visits" mobile/app mobile/lib mobile/components` findet nur die
// Auswahlliste der Abzeichen-Auslöser im Admin-Screen, keinen Schreibweg.
// Eine ausgelieferte App-Version bricht dadurch nicht.
//
// ─── 2. action_counts listRule/viewRule → Besitzprüfung ───────────────────
//
// Die Sammlung trägt user, campaign und count. Bisher konnte jedes Konto für
// jede Person, die je an einer Aktion teilgenommen hat, ID und Anzahl
// abrufen — ein Aktivitätsprofil. Gemessen: Ein Besucherkonto bekam beide
// Zeilen der Instanz, samt fremder Nutzer-ID.
//
// Die Schreibseite war schon zu (1700001000_action_counts.js, alle drei
// null), nur das Lesen blieb offen. Die App liest die Sammlung überhaupt
// nicht (kein Treffer in mobile/); die Abzeichen werden serverseitig
// gerechnet. Neue Regel wie bei den Geschwistersammlungen points_log und
// user_badges.
//
// ─── 3. items listRule/viewRule → nur was die Ansicht braucht ─────────────
//
// Bisher: '@request.auth.id != ""'. Jedes Besucherkonto konnte den kompletten
// Bestand listen, auch fremde pending-Einreichungen und das Feld `location`.
// Bei einem Teil, das beim Einreichenden zu Hause bleibt (stays_external),
// steht dort die Privatadresse. Gemessen: Ein Besucherkonto las
// „bei Fam. Petersen, Deichstr. 4" an einem fremden Teil.
//
// Die App filterte das nur in der Oberfläche (store.tsx) — die API gab es
// trotzdem heraus.
//
// Die neue Regel bildet ab, was die Ansichten wirklich laden:
//   - Laden-Tab, Schaufenster, „neu im Laden": freigegebene Teile
//     (status = "approved") und die Altbestände aus der Zeit vor dem
//     status-Feld (status = "" — 15 Datensätze in der Instanz, einer davon
//     im Schaufenster). Ohne die zweite Bedingung verschwände Altbestand
//     aus dem Schaufenster; das wäre ein Funktionsfehler.
//   - „meine Teile": eigene Einreichungen, in jedem Status.
//   - Freigabe-Liste und Bestandsansicht: volunteer und admin sehen alles.
//
// Die Antwortform bleibt unverändert — es ändert sich nur die Treffermenge,
// und zwar genau um das, was die Oberfläche ohnehin nie zeigte. Geprüft
// gegen die Abfragen in mobile/lib/hooks/useData.ts (useShowcase,
// useRecentItems, useStoreItems, useMyItems, useItem, useAllItems,
// usePendingItems).
//
// Ein Sonderfall ist usePendingItems: Der Home-Screen ruft es für alle
// Konten, zeigt die Zahl aber nur dem Team. Für Besucher:innen liefert die
// Abfrage künftig nur noch eigene Einreichungen statt aller — die Zahl war
// dort ohnehin unsichtbar. Kein Absturz, keine Formänderung.
//
// Die Schreibregeln von items bleiben, wie sie sind: Anlegen für alle
// Angemeldeten (Einreichungen), Ändern nur volunteer/admin, Löschen admin.

// Die Anmeldung steht als eigene Bedingung vor jedem Zweig. Ohne sie wäre
// `status = "approved"` für sich genommen auch unangemeldet wahr — der
// Bestand stünde offen im Netz, und aus einer Verschärfung würde eine
// Öffnung. Der zuständige Test prüft genau diesen Fall.
const ANGEMELDET = '@request.auth.id != ""';
const ITEMS_READ =
  `(${ANGEMELDET} && (status = "approved" || status = "" || created_by = @request.auth.id))` +
  ' || @request.auth.role = "volunteer" || @request.auth.role = "admin"';

const OWNER_OR_ADMIN = 'user = @request.auth.id || @request.auth.role = "admin"';

migrate(
  (db) => {
    const dao = new Dao(db);

    const visits = dao.findCollectionByNameOrId('visits');
    visits.createRule = null;
    dao.saveCollection(visits);

    const counts = dao.findCollectionByNameOrId('action_counts');
    counts.listRule = OWNER_OR_ADMIN;
    counts.viewRule = OWNER_OR_ADMIN;
    dao.saveCollection(counts);

    const items = dao.findCollectionByNameOrId('items');
    items.listRule = ITEMS_READ;
    items.viewRule = ITEMS_READ;
    dao.saveCollection(items);
  },
  (db) => {
    const dao = new Dao(db);

    const visits = dao.findCollectionByNameOrId('visits');
    visits.createRule = 'user = @request.auth.id';
    dao.saveCollection(visits);

    const counts = dao.findCollectionByNameOrId('action_counts');
    counts.listRule = '@request.auth.id != ""';
    counts.viewRule = '@request.auth.id != ""';
    dao.saveCollection(counts);

    const items = dao.findCollectionByNameOrId('items');
    items.listRule = '@request.auth.id != ""';
    items.viewRule = '@request.auth.id != ""';
    dao.saveCollection(items);
  }
);
