/// <reference path="../pb_data/types.d.ts" />

// Aushang: Farbe frei wählbar + Doppelung zwischen Aktion und Ankündigung lösen.
//
// campaigns.color / needs.color — Akzentfarbe als Hex (#RRGGBB). Leer = die
//        bisherige Standardoptik (Aktion: Marken-Verlauf, Ankündigung: Sky).
//        Bei Aktionen wird der Verlauf auf diese Farbe gezogen.
// needs.campaign — verknüpft eine Ankündigung mit einer Aktion. Solange die
//        Aktion läuft, zeigt die Startseite nur die Aktions-Karte; die
//        Ankündigung erscheint erst wieder, wenn die Aktion vorbei ist.
//        So lässt sich beides pflegen, ohne dass es doppelt im Aushang steht.

migrate(
  (db) => {
    const dao = new Dao(db);

    const hexField = (name) =>
      new SchemaField({
        name,
        type: 'text',
        required: false,
        options: { max: 9, pattern: '^#?[0-9a-fA-F]{6}$' },
      });

    const campaigns = dao.findCollectionByNameOrId('campaigns');
    if (!campaigns.schema.getFieldByName('color')) {
      campaigns.schema.addField(hexField('color'));
      dao.saveCollection(campaigns);
    }

    const needs = dao.findCollectionByNameOrId('needs');
    let needsChanged = false;
    if (!needs.schema.getFieldByName('color')) {
      needs.schema.addField(hexField('color'));
      needsChanged = true;
    }
    if (!needs.schema.getFieldByName('campaign')) {
      needs.schema.addField(
        new SchemaField({
          name: 'campaign',
          type: 'relation',
          required: false,
          options: {
            collectionId: campaigns.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
        })
      );
      needsChanged = true;
    }
    if (needsChanged) dao.saveCollection(needs);
  },
  (db) => {
    const dao = new Dao(db);

    try {
      const campaigns = dao.findCollectionByNameOrId('campaigns');
      if (campaigns.schema.getFieldByName('color')) {
        campaigns.schema.removeField(campaigns.schema.getFieldByName('color').id);
        dao.saveCollection(campaigns);
      }
    } catch (_) {}

    try {
      const needs = dao.findCollectionByNameOrId('needs');
      let changed = false;
      for (const name of ['color', 'campaign']) {
        const f = needs.schema.getFieldByName(name);
        if (f) {
          needs.schema.removeField(f.id);
          changed = true;
        }
      }
      if (changed) dao.saveCollection(needs);
    } catch (_) {}
  }
);
