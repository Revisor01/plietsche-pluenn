/// <reference path="../pb_data/types.d.ts" />

// Schalter „Unbegrenzt“ für die Tagesgrenze, additiv mit Vorgabe false, idempotent.

migrate((app) => {
  const store = app.findCollectionByNameOrId('store');
  if (store.fields.getByName('items_take_unlimited')) return;
  store.fields.add(
    new BoolField({
      name: 'items_take_unlimited',
      required: false,
      hidden: false,
      presentable: false,
    })
  );
  app.save(store);
}, (app) => {
  const store = app.findCollectionByNameOrId('store');
  if (!store.fields.getByName('items_take_unlimited')) return;
  store.fields.removeByName('items_take_unlimited');
  app.save(store);
});
