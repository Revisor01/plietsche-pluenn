/// <reference path="../pb_data/types.d.ts" />

// badges.color — eigene Farbe für ein Abzeichen (#RRGGBB).
//
// Gedacht für Einzel-Abzeichen: Sie stehen außerhalb der Stufenlogik und trugen
// deshalb immer das Gold der obersten Stufe. Mit eigener Farbe hebt sich ein
// besonderes Abzeichen auch optisch von den üblichen ab. Leer = wie bisher.
//
// Gestufte Abzeichen behalten ihre Stufenfarben (Bronze…Diamant) — dort trägt
// die Farbe die erreichte Stufe, nicht das Abzeichen selbst.

migrate(
  (db) => {
    const dao = new Dao(db);
    const badges = dao.findCollectionByNameOrId('badges');
    if (!badges.schema.getFieldByName('color')) {
      badges.schema.addField(
        new SchemaField({
          name: 'color',
          type: 'text',
          required: false,
          options: { max: 9, pattern: '^#?[0-9a-fA-F]{6}$' },
        })
      );
      dao.saveCollection(badges);
    }
  },
  (db) => {
    const dao = new Dao(db);
    try {
      const badges = dao.findCollectionByNameOrId('badges');
      const f = badges.schema.getFieldByName('color');
      if (f) {
        badges.schema.removeField(f.id);
        dao.saveCollection(badges);
      }
    } catch (_) {}
  }
);
