/// <reference path="../pb_data/types.d.ts" />

// Ladenzeitzone auf dem store-Datensatz.
//
// Tagesgrenze, Kalenderwoche und Jahreszahl sind fachliche Größen: Sie hängen
// davon ab, wann es im Laden Mitternacht ist — nicht davon, wie der Host
// konfiguriert ist, auf dem der Container gerade läuft. Bisher wurden sie aus
// der Prozess-Zeitzone abgeleitet; der Container läuft in UTC, der Laden steht
// in Deutschland.
//
// Additiv: ein neues Feld mit Standardwert. Kein bestehendes Feld ändert Typ
// oder Namen, keine Antwortform verschiebt sich.

migrate(
  (db) => {
    const dao = new Dao(db);
    const store = dao.findCollectionByNameOrId('store');
    if (!store.schema.getFieldByName('timezone')) {
      store.schema.addField(
        new SchemaField({ name: 'timezone', type: 'text', options: { max: 64 } })
      );
      dao.saveCollection(store);
    }

    try {
      const s = dao.findFirstRecordByFilter('store', '1=1');
      if (!`${s.get('timezone') || ''}`.trim()) {
        s.set('timezone', 'Europe/Berlin');
        dao.saveRecord(s);
      }
    } catch (_) {}
  },
  (db) => {
    const dao = new Dao(db);
    const store = dao.findCollectionByNameOrId('store');
    const field = store.schema.getFieldByName('timezone');
    if (field) {
      store.schema.removeField(field.id);
      dao.saveCollection(store);
    }
  }
);
