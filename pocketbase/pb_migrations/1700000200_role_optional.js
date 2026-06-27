/// <reference path="../pb_data/types.d.ts" />

// `role` must not be API-required: new visitors register without sending it;
// the defaults hook assigns "visitor". Keep it non-required at the schema level.

migrate(
  (db) => {
    const dao = new Dao(db);
    const users = dao.findCollectionByNameOrId('users');
    const field = users.schema.getFieldByName('role');
    if (field) {
      field.required = false;
      dao.saveCollection(users);
    }
  },
  (db) => {
    const dao = new Dao(db);
    const users = dao.findCollectionByNameOrId('users');
    const field = users.schema.getFieldByName('role');
    if (field) {
      field.required = true;
      dao.saveCollection(users);
    }
  },
);
