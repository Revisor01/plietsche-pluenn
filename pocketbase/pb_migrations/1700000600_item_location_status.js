/// <reference path="../pb_data/types.d.ts" />

// Items "einstellen" feature:
//  - location:       free-text where the item is (shelf, or "bei Familie X")
//  - stays_external: large items that stay with their owner, not in the shop
//  - status:         draft → pending → approved → archived
//
// Approval flow: staff (volunteer/admin) create items as "approved" directly;
// visitors may create items but only as "pending" — a volunteer/admin approves
// them later. createRule now allows any authenticated user; the status guard
// (visitors forced to "pending") is enforced in pb_hooks/items.pb.js.

migrate(
  (db) => {
    const dao = new Dao(db);
    const items = dao.findCollectionByNameOrId('items');

    const addField = (def) => {
      if (!items.schema.getFieldByName(def.name)) items.schema.addField(new SchemaField(def));
    };

    addField({ name: 'location', type: 'text', options: { max: 120 } });
    addField({ name: 'stays_external', type: 'bool', options: {} });
    addField({
      name: 'status',
      type: 'select',
      options: { maxSelect: 1, values: ['pending', 'approved', 'archived'] },
    });

    // Any authenticated user may create (visitor submissions allowed). The hook
    // forces visitor-created items to status="pending". Updates stay staff-only
    // so visitors can't approve their own items.
    items.createRule = '@request.auth.id != ""';
    items.updateRule = '@request.auth.role = "volunteer" || @request.auth.role = "admin"';

    const idx = 'CREATE INDEX idx_items_status ON items (status)';
    if (!items.indexes.includes(idx)) items.indexes = items.indexes.concat(idx);

    dao.saveCollection(items);
  },
  (db) => {
    const dao = new Dao(db);
    const items = dao.findCollectionByNameOrId('items');
    ['location', 'stays_external', 'status'].forEach((n) => {
      const f = items.schema.getFieldByName(n);
      if (f) items.schema.removeField(f.id);
    });
    items.createRule = '@request.auth.role = "volunteer" || @request.auth.role = "admin"';
    items.updateRule = '@request.auth.role = "volunteer" || @request.auth.role = "admin"';
    dao.saveCollection(items);
  },
);
