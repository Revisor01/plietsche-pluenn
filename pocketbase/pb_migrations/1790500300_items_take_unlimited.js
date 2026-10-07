/// <reference path="../pb_data/types.d.ts" />

// Schalter „Unbegrenzt" für die Höchstzahl mitgenommener Teile (store).
//
// Seit 26.09.2026 gilt store.max_items_take pro Besuch, also pro Tag in der
// Ladenzeitzone, über alle Scans (Zähler an der Tür und per QR gescannte
// Teile). Der Laden soll die Grenze auch ganz abschalten können — dafür
// dieses Feld. Vorgabe false: Eine Instanz verhält sich nach der Migration
// wie vorher, bis jemand den Schalter umlegt.
//
// Additiv: Es kommt nur ein Feld dazu, nichts Bestehendes wird geändert.
// Ausgelieferte Apps kennen das Feld nicht; sie lesen es nicht und schreiben
// es nicht (savePointConfig schickt nur die Felder, die es nennt), ein alter
// Admin-Screen setzt den Schalter also nicht versehentlich zurück.
//
// Idempotent: Steht das Feld schon da — etwa weil ein späterer Snapshot es
// enthält —, bleibt die Sammlung unverändert.

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
