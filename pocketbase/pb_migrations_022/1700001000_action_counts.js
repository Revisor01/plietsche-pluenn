/// <reference path="../pb_data/types.d.ts" />

// Per-user, per-campaign contribution counter. A staff member, when approving
// an item, can mark it as "counts toward action X" — that bumps the submitter's
// count for that campaign. Progress (tiered) action_participation badges read
// from here: 4× → bronze, 8× → silber, etc.
//
// Also: items gain an optional `campaign` link so an approval can record which
// action a brought item belongs to (and avoid double counting on re-approval).

migrate(
  (db) => {
    const dao = new Dao(db);

    const campaigns = dao.findCollectionByNameOrId('campaigns');
    const users = dao.findCollectionByNameOrId('users');

    const ac = new Collection({
      name: 'action_counts',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: null, // server-only (hooks)
      updateRule: null,
      deleteRule: null,
      schema: [
        new SchemaField({ name: 'user', type: 'relation', required: true, options: { collectionId: users.id, maxSelect: 1, cascadeDelete: true } }),
        new SchemaField({ name: 'campaign', type: 'relation', required: true, options: { collectionId: campaigns.id, maxSelect: 1, cascadeDelete: true } }),
        new SchemaField({ name: 'count', type: 'number', options: { min: 0 } }),
      ],
      indexes: ['CREATE UNIQUE INDEX idx_actioncounts_user_campaign ON action_counts (user, campaign)'],
    });
    dao.saveCollection(ac);

    // items: which campaign an approved item was credited to (set on approval).
    const items = dao.findCollectionByNameOrId('items');
    if (!items.schema.getFieldByName('campaign')) {
      items.schema.addField(new SchemaField({ name: 'campaign', type: 'relation', options: { collectionId: campaigns.id, maxSelect: 1, cascadeDelete: false } }));
      dao.saveCollection(items);
    }
  },
  (db) => {
    const dao = new Dao(db);
    try { dao.deleteCollection(dao.findCollectionByNameOrId('action_counts')); } catch (_) {}
    const items = dao.findCollectionByNameOrId('items');
    const f = items.schema.getFieldByName('campaign');
    if (f) { items.schema.removeField(f.id); dao.saveCollection(items); }
  },
);
