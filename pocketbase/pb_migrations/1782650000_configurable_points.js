/// <reference path="../pb_data/types.d.ts" />

// Make point values admin-configurable and give campaigns per-type multipliers.
//
// store: pts_checkin / pts_take / pts_bring (point values) + max_items_take
//        (the "max 7 items per visit" internal rule, now editable).
// campaigns: mult_visit / mult_take / mult_bring — a campaign can boost each
//        action type independently (e.g. "Nightshopping: ×3 visit, ×2 take").
//        The legacy single `multiplier` stays as a fallback for old campaigns.

migrate(
  (db) => {
    const dao = new Dao(db);

    const store = dao.findCollectionByNameOrId('store');
    const addStore = (name, def) => {
      if (!store.schema.getFieldByName(name)) {
        store.schema.addField(new SchemaField({ name, type: 'number', options: { min: 0 } }));
      }
    };
    addStore('pts_checkin');
    addStore('pts_take');
    addStore('pts_bring');
    addStore('max_items_take');
    dao.saveCollection(store);

    // Seed defaults onto the existing store singleton (mirror old hardcoded values).
    try {
      const s = dao.findFirstRecordByFilter('store', '1=1');
      if (!s.get('pts_checkin')) s.set('pts_checkin', 10);
      if (!s.get('pts_take')) s.set('pts_take', 5);
      if (!s.get('pts_bring')) s.set('pts_bring', 5);
      if (!s.get('max_items_take')) s.set('max_items_take', 7);
      dao.saveRecord(s);
    } catch (_) {}

    const campaigns = dao.findCollectionByNameOrId('campaigns');
    const addCamp = (name) => {
      if (!campaigns.schema.getFieldByName(name)) {
        campaigns.schema.addField(new SchemaField({ name, type: 'number', options: { min: 0 } }));
      }
    };
    addCamp('mult_visit');
    addCamp('mult_take');
    addCamp('mult_bring');
    dao.saveCollection(campaigns);

    // Backfill new per-type multipliers from the legacy `multiplier` so existing
    // campaigns keep behaving the same (old multiplier applied to everything).
    try {
      const rows = dao.findRecordsByFilter('campaigns', '1=1', '', 0, 0);
      for (const c of rows) {
        const legacy = c.get('multiplier') || 1;
        if (!c.get('mult_visit')) c.set('mult_visit', legacy);
        if (!c.get('mult_take')) c.set('mult_take', legacy);
        if (!c.get('mult_bring')) c.set('mult_bring', legacy);
        dao.saveRecord(c);
      }
    } catch (_) {}
  },
  (db) => {
    const dao = new Dao(db);
    const store = dao.findCollectionByNameOrId('store');
    for (const f of ['pts_checkin', 'pts_take', 'pts_bring', 'max_items_take']) {
      const field = store.schema.getFieldByName(f);
      if (field) store.schema.removeField(field.id);
    }
    dao.saveCollection(store);

    const campaigns = dao.findCollectionByNameOrId('campaigns');
    for (const f of ['mult_visit', 'mult_take', 'mult_bring']) {
      const field = campaigns.schema.getFieldByName(f);
      if (field) campaigns.schema.removeField(field.id);
    }
    dao.saveCollection(campaigns);
  }
);
