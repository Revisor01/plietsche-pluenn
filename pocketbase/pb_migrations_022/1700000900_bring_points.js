/// <reference path="../pb_data/types.d.ts" />

// "Bringen"-Säule: a visitor who submits an item earns bring points once a
// staff member approves it. We flag the item so the points are granted only
// once, even if it's re-approved.

migrate(
  (db) => {
    const dao = new Dao(db);
    const items = dao.findCollectionByNameOrId('items');
    if (!items.schema.getFieldByName('brought_awarded')) {
      items.schema.addField(new SchemaField({ name: 'brought_awarded', type: 'bool', options: {} }));
      dao.saveCollection(items);
    }
  },
  (db) => {
    const dao = new Dao(db);
    const items = dao.findCollectionByNameOrId('items');
    const f = items.schema.getFieldByName('brought_awarded');
    if (f) { items.schema.removeField(f.id); dao.saveCollection(items); }
  },
);
