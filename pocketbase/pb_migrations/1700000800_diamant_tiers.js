/// <reference path="../pb_data/types.d.ts" />

// Add a 5th tier "diamant" to badges, and make the global point ranks
// (the home-screen rank ring) admin-configurable via store.tiers_json.

migrate(
  (db) => {
    const dao = new Dao(db);

    // ── badges: diamant tier ─────────────────────────────────
    const badges = dao.findCollectionByNameOrId('badges');
    const addBadgeField = (def) => {
      if (!badges.schema.getFieldByName(def.name)) badges.schema.addField(new SchemaField(def));
    };
    addBadgeField({ name: 'tier_diamant', type: 'number', options: { min: 0 } });
    addBadgeField({ name: 'reward_diamant', type: 'number', options: { min: 0 } });
    // Extend the tier select used elsewhere.
    const tierField = badges.schema.getFieldByName('tier');
    if (tierField) {
      tierField.options = { maxSelect: 1, values: ['bronze', 'silber', 'gold', 'platin', 'diamant'] };
    }
    dao.saveCollection(badges);

    // ── user_badges: current_tier select must allow diamant ──
    const ub = dao.findCollectionByNameOrId('user_badges');
    const ct = ub.schema.getFieldByName('current_tier');
    if (ct) {
      ct.options = { maxSelect: 1, values: ['none', 'bronze', 'silber', 'gold', 'platin', 'diamant'] };
      dao.saveCollection(ub);
    }

    // ── store: configurable global point ranks ───────────────
    const store = dao.findCollectionByNameOrId('store');
    const tj = store.schema.getFieldByName('tiers_json');
    if (!tj) {
      store.schema.addField(new SchemaField({ name: 'tiers_json', type: 'json', options: { maxSize: 20000 } }));
      dao.saveCollection(store);
    } else if (!tj.options || !tj.options.maxSize) {
      // Fix a 0-byte json field created without an explicit size limit.
      tj.options = { maxSize: 20000 };
      dao.saveCollection(store);
    }
    // Seed defaults onto the existing store record (Bronze→Diamant).
    try {
      const rec = dao.findFirstRecordByFilter('store', '1=1');
      if (rec && !rec.get('tiers_json')) {
        rec.set('tiers_json', [
          { name: 'Bronze', at: 0 },
          { name: 'Silber', at: 750 },
          { name: 'Gold', at: 1500 },
          { name: 'Platin', at: 3000 },
          { name: 'Diamant', at: 6000 },
        ]);
        dao.saveRecord(rec);
      }
    } catch (_) {}
  },
  (db) => {
    const dao = new Dao(db);
    const badges = dao.findCollectionByNameOrId('badges');
    ['tier_diamant', 'reward_diamant'].forEach((n) => {
      const f = badges.schema.getFieldByName(n);
      if (f) badges.schema.removeField(f.id);
    });
    dao.saveCollection(badges);
    const store = dao.findCollectionByNameOrId('store');
    const f = store.schema.getFieldByName('tiers_json');
    if (f) { store.schema.removeField(f.id); dao.saveCollection(store); }
  },
);
