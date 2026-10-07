/// <reference path="../pb_data/types.d.ts" />

// Tier badges: one badge progresses through bronze → silber → gold → platin.
// Each badge carries 4 thresholds + 4 rewards. user_badges tracks current_tier.

migrate(
  (db) => {
    const dao = new Dao(db);

    // ── badges: add per-tier thresholds + rewards ──────────────
    const badges = dao.findCollectionByNameOrId('badges');
    const addField = (def) => {
      if (!badges.schema.getFieldByName(def.name)) badges.schema.addField(new SchemaField(def));
    };
    addField({ name: 'tier_bronze', type: 'number', options: { min: 0 } });
    addField({ name: 'tier_silber', type: 'number', options: { min: 0 } });
    addField({ name: 'tier_gold', type: 'number', options: { min: 0 } });
    addField({ name: 'tier_platin', type: 'number', options: { min: 0 } });
    addField({ name: 'reward_bronze', type: 'number', options: { min: 0 } });
    addField({ name: 'reward_silber', type: 'number', options: { min: 0 } });
    addField({ name: 'reward_gold', type: 'number', options: { min: 0 } });
    addField({ name: 'reward_platin', type: 'number', options: { min: 0 } });

    // Extend tier select to include platin (replaces old single-tier field usage).
    const tierField = badges.schema.getFieldByName('tier');
    if (tierField) {
      tierField.options = { maxSelect: 1, values: ['bronze', 'silber', 'gold', 'platin'] };
    }

    // Extend trigger_type with items_brought.
    const trig = badges.schema.getFieldByName('trigger_type');
    if (trig) {
      trig.options = {
        maxSelect: 1,
        values: ['visits', 'scans', 'streak_weeks', 'items_brought', 'season_window', 'items_in_period'],
      };
    }
    dao.saveCollection(badges);

    // ── user_badges: current_tier ──────────────────────────────
    const ub = dao.findCollectionByNameOrId('user_badges');
    if (!ub.schema.getFieldByName('current_tier')) {
      ub.schema.addField(
        new SchemaField({
          name: 'current_tier',
          type: 'select',
          options: { maxSelect: 1, values: ['none', 'bronze', 'silber', 'gold', 'platin'] },
        }),
      );
      dao.saveCollection(ub);
    }

    // ── points_log: add 'bring' kind ───────────────────────────
    const pl = dao.findCollectionByNameOrId('points_log');
    const kind = pl.schema.getFieldByName('kind');
    if (kind) {
      kind.options = {
        maxSelect: 1,
        values: ['checkin', 'scan', 'bring', 'badge', 'streak', 'campaign', 'adjustment'],
      };
      dao.saveCollection(pl);
    }
  },
  (db) => {
    const dao = new Dao(db);
    const badges = dao.findCollectionByNameOrId('badges');
    for (const f of [
      'tier_bronze',
      'tier_silber',
      'tier_gold',
      'tier_platin',
      'reward_bronze',
      'reward_silber',
      'reward_gold',
      'reward_platin',
    ]) {
      const field = badges.schema.getFieldByName(f);
      if (field) badges.schema.removeField(field.id);
    }
    dao.saveCollection(badges);
    const ub = dao.findCollectionByNameOrId('user_badges');
    const ct = ub.schema.getFieldByName('current_tier');
    if (ct) {
      ub.schema.removeField(ct.id);
      dao.saveCollection(ub);
    }
  },
);
