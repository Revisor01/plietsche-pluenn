/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("8hdpqi33x65ptii")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ie4hjxqi",
    "name": "tiers_json",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 20000
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("8hdpqi33x65ptii")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ie4hjxqi",
    "name": "tiers_json",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 0
    }
  }))

  return dao.saveCollection(collection)
})
