/// <reference path="../pb_data/types.d.ts" />

// Flexible badge system:
//  - badges.kind: 'tiered' (bronze→platin, as before) or 'single' (one award,
//    optional one-off bonus via points_reward).
//  - new trigger types: 'years_active' (loyalty, awarded retroactively each
//    Dec 31 only if the user was active that year) and 'action_participation'
//    (active during a specific campaign window).
//  - badges.campaign: optional FK linking an action-participation badge to a
//    campaign (the action it belongs to).
//  - campaigns.badge: optional FK to the badge granted for taking part.
//  - new collection 'needs': the shop's current "we're looking for …" notices.

migrate(
  (db) => {
    const dao = new Dao(db);

    // ── badges ───────────────────────────────────────────────
    const badges = dao.findCollectionByNameOrId('badges');
    const addBadgeField = (def) => {
      if (!badges.schema.getFieldByName(def.name)) badges.schema.addField(new SchemaField(def));
    };
    addBadgeField({
      name: 'kind',
      type: 'select',
      options: { maxSelect: 1, values: ['tiered', 'single'] },
    });
    addBadgeField({
      name: 'campaign',
      type: 'relation',
      options: { collectionId: dao.findCollectionByNameOrId('campaigns').id, maxSelect: 1, cascadeDelete: false },
    });
    // Extend trigger_type with the new kinds.
    const trig = badges.schema.getFieldByName('trigger_type');
    if (trig) {
      trig.options = {
        maxSelect: 1,
        values: ['visits', 'scans', 'streak_weeks', 'items_brought', 'season_window', 'items_in_period', 'years_active', 'action_participation'],
      };
    }
    dao.saveCollection(badges);

    // ── campaigns: optional linked badge ─────────────────────
    const campaigns = dao.findCollectionByNameOrId('campaigns');
    if (!campaigns.schema.getFieldByName('badge')) {
      campaigns.schema.addField(new SchemaField({
        name: 'badge',
        type: 'relation',
        options: { collectionId: badges.id, maxSelect: 1, cascadeDelete: false },
      }));
    }
    if (!campaigns.schema.getFieldByName('description')) {
      campaigns.schema.addField(new SchemaField({ name: 'description', type: 'text', options: { max: 200 } }));
    }
    dao.saveCollection(campaigns);

    // ── needs: shop wishlist / "Bedarf-Aushang" ──────────────
    const needs = new Collection({
      name: 'needs',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.role = "volunteer" || @request.auth.role = "admin"',
      updateRule: '@request.auth.role = "volunteer" || @request.auth.role = "admin"',
      deleteRule: '@request.auth.role = "volunteer" || @request.auth.role = "admin"',
      schema: [
        new SchemaField({ name: 'title', type: 'text', required: true, options: { max: 80 } }),
        new SchemaField({ name: 'detail', type: 'text', options: { max: 300 } }),
        new SchemaField({ name: 'icon', type: 'text', options: { max: 40 } }),
        new SchemaField({ name: 'is_active', type: 'bool', options: {} }),
        new SchemaField({ name: 'sort', type: 'number', options: {} }),
      ],
      indexes: ['CREATE INDEX idx_needs_active ON needs (is_active)'],
    });
    dao.saveCollection(needs);

    // Default existing badges to 'tiered' so behaviour is unchanged.
    for (const b of dao.findRecordsByExpr('badges')) {
      if (!`${b.get('kind')}`.trim()) {
        b.set('kind', 'tiered');
        dao.saveRecord(b);
      }
    }
  },
  (db) => {
    const dao = new Dao(db);
    try { dao.deleteCollection(dao.findCollectionByNameOrId('needs')); } catch (_) {}
    const badges = dao.findCollectionByNameOrId('badges');
    ['kind', 'campaign'].forEach((n) => {
      const f = badges.schema.getFieldByName(n);
      if (f) badges.schema.removeField(f.id);
    });
    dao.saveCollection(badges);
    const campaigns = dao.findCollectionByNameOrId('campaigns');
    ['badge', 'description'].forEach((n) => {
      const f = campaigns.schema.getFieldByName(n);
      if (f) campaigns.schema.removeField(f.id);
    });
    dao.saveCollection(campaigns);
  },
);
