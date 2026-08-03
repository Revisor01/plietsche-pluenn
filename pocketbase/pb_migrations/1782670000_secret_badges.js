/// <reference path="../pb_data/types.d.ts" />

// badges.is_secret — geheimes Badge.
//
// Abgrenzung zum bestehenden is_visible:
//   is_visible = false → Badge ist komplett aus der App genommen (Entwurf,
//        ausrangiert). Auch wer es erfüllt hat, sieht es nicht.
//   is_secret  = true  → Badge zählt normal, wird aber erst benannt, wenn es
//        verdient ist. Vorher steht in der Sammlung eine graue Kachel ohne
//        Namen und ohne Fortschritt — man sieht, dass es etwas gibt.
//
// Beides ist unabhängig: ein geheimes Badge kann zusätzlich unsichtbar sein.

migrate(
  (db) => {
    const dao = new Dao(db);
    const badges = dao.findCollectionByNameOrId('badges');
    if (!badges.schema.getFieldByName('is_secret')) {
      badges.schema.addField(
        new SchemaField({
          name: 'is_secret',
          type: 'bool',
          required: false,
        })
      );
      dao.saveCollection(badges);
    }
  },
  (db) => {
    const dao = new Dao(db);
    try {
      const badges = dao.findCollectionByNameOrId('badges');
      const f = badges.schema.getFieldByName('is_secret');
      if (f) {
        badges.schema.removeField(f.id);
        dao.saveCollection(badges);
      }
    } catch (_) {}
  }
);
