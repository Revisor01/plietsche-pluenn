/// <reference path="../pb_data/types.d.ts" />

// Das Türgeheimnis raus aus der öffentlich lesbaren store-Sammlung.
//
// Ausgangslage: `store` wurde in 1700000000_init_schema.js mit
// listRule/viewRule als Leerstring angelegt. In PocketBase heißt der
// Leerstring "für alle zugänglich, auch ohne Anmeldung" — nicht "niemand".
// Damit stand `checkin_qr_secret` (der Code am Aushang an der Ladentür)
// unangemeldet im Netz, zusammen mit Standort und Geofence-Radius des Ladens.
//
// Warum eine eigene Sammlung und nicht nur eine strengere Regel auf `store`:
// PocketBase-Regeln wirken auf ganze Datensätze, nicht auf einzelne Felder.
// Der `fields`-Parameter der API wählt zwar Felder aus, wird aber vom Client
// gesetzt — wer ihn weglässt, bekommt alles. Solange das Geheimnis in `store`
// liegt, kann es jede Person lesen, die `store` überhaupt lesen darf. Es
// gehört also in eine eigene Sammlung, die niemand über die API sieht.
//
// Ergebnis:
//   store_secrets  listRule/viewRule/createRule/updateRule/deleteRule = null
//                  → nur Superuser und die serverseitigen Hooks (die am DAO
//                    vorbei an den Regeln arbeiten).
//   store          listRule/viewRule = '@request.auth.id != ""'
//                  → Öffnungszeiten, Adresse, Punktwerte und Ränge sehen
//                    angemeldete Nutzer:innen weiterhin. Vor der Anmeldung
//                    braucht die App keine Ladendaten (Login, Registrierung
//                    und Onboarding lesen `store` nicht).
//
// Additiv: `store.checkin_qr_secret` bleibt als Feld bestehen, wird aber
// geleert. Der Scan-Hook liest ab jetzt aus `store_secrets`.

migrate(
  (db) => {
    const dao = new Dao(db);

    // ─── store_secrets anlegen ─────────────────────────────────
    let secrets;
    try {
      secrets = dao.findCollectionByNameOrId('store_secrets');
    } catch (_) {
      secrets = new Collection({
        name: 'store_secrets',
        type: 'base',
        // null = nur Superuser. Kein Weg über die REST-API, für niemanden.
        listRule: null,
        viewRule: null,
        createRule: null,
        updateRule: null,
        deleteRule: null,
        schema: [
          new SchemaField({ name: 'checkin_qr_secret', type: 'text', options: { max: 128 } }),
        ],
        indexes: [],
      });
      dao.saveCollection(secrets);
    }

    // ─── Geheimnis umziehen ────────────────────────────────────
    let store = null;
    try {
      store = dao.findFirstRecordByFilter('store', '1=1');
    } catch (_) {}

    let row = null;
    try {
      row = dao.findFirstRecordByFilter('store_secrets', '1=1');
    } catch (_) {}

    if (!row) {
      row = new Record(secrets);
      // Den bisherigen Wert übernehmen, damit der Aushang an der Ladentür
      // weiter gilt. Steht dort nichts, wird ein neuer erzeugt.
      const existing = store ? `${store.get('checkin_qr_secret') || ''}`.trim() : '';
      row.set('checkin_qr_secret', existing || $security.randomString(32));
      dao.saveRecord(row);
    }

    // Altfeld leeren — der Wert darf nicht in der lesbaren Sammlung
    // zurückbleiben. Das Feld selbst bleibt (additiv), damit ältere
    // Schreibwege nicht auf einen fehlenden Namen laufen.
    if (store && `${store.get('checkin_qr_secret') || ''}` !== '') {
      store.set('checkin_qr_secret', '');
      dao.saveRecord(store);
    }

    // ─── store auf angemeldet umstellen ────────────────────────
    const storeCol = dao.findCollectionByNameOrId('store');
    storeCol.listRule = '@request.auth.id != ""';
    storeCol.viewRule = '@request.auth.id != ""';
    dao.saveCollection(storeCol);
  },
  (db) => {
    const dao = new Dao(db);

    // Geheimnis zurückschreiben, damit ein Rückbau den Laden nicht lahmlegt.
    try {
      const row = dao.findFirstRecordByFilter('store_secrets', '1=1');
      const store = dao.findFirstRecordByFilter('store', '1=1');
      store.set('checkin_qr_secret', `${row.get('checkin_qr_secret') || ''}`);
      dao.saveRecord(store);
    } catch (_) {}

    try {
      dao.deleteCollection(dao.findCollectionByNameOrId('store_secrets'));
    } catch (_) {}

    try {
      const storeCol = dao.findCollectionByNameOrId('store');
      storeCol.listRule = '';
      storeCol.viewRule = '';
      dao.saveCollection(storeCol);
    } catch (_) {}
  }
);
