/// <reference path="../pb_data/types.d.ts" />

// Das Schema von Plietsche Plünn als Ganzes, für PocketBase 0.40.
//
// Ersetzt die 20 Migrationen unter pocketbase/pb_migrations_022/. Die sind
// gegen die 0.22-Schnittstelle geschrieben (`new Dao(db)`, `SchemaField`) und
// laufen unter 0.40 nicht mehr. Die offizielle Upgrade-Anleitung sieht dafür
// einen Sammlungs-Snapshot vor; genau das ist diese Datei.
//
// Wie sie entstanden ist (gemessen am 26.09.2026, nachvollziehbar):
//   1. PocketBase 0.22.21 auf leerem pb_data mit allen 20 alten Migrationen.
//   2. PocketBase 0.40.4 darüber gestartet, Migrationsordner leer — das hebt
//      die Datenbank mit den eingebauten System-Migrationen auf 0.40.
//   3. `pocketbase migrate collections` erzeugt den Snapshot.
//   4. Nachbearbeitet: siehe die beiden Punkte unten.
//
// Zwei Eingriffe gegenüber dem rohen Snapshot, beide wegen Produktion:
//
//   a) IDs werden auf den Bestand umgeschrieben (unten, vor dem Import).
//      Die alten Migrationen haben Sammlungen und Felder mit ZUFÄLLIGEN IDs
//      angelegt. Produktion hat also andere IDs als dieser Snapshot.
//      importCollections sucht Sammlungen und Felder über die ID — ohne das
//      Umschreiben hielte es `items` für neu, legte sie ein zweites Mal an
//      und scheiterte am doppelten Namen (bzw. legte Felder doppelt an).
//      Deshalb: Gibt es eine Sammlung gleichen Namens schon, übernimmt der
//      Snapshot ihre ID und die IDs ihrer Felder (über den Feldnamen), und
//      Relationen zeigen auf die ID, die es wirklich gibt.
//
//   b) Nur Schema, keine Einstellungen. Übernommen werden je Sammlung Name,
//      Typ, Regeln, Felder, Indizes und bei `users` die Anmeldeart. NICHT
//      übernommen: Mail-Vorlagen, Token-Laufzeiten, authAlert, OTP, MFA,
//      OAuth2. importCollections legt die übergebenen Werte über die
//      bestehende Sammlung — was fehlt, bleibt, wie es ist. So überschreibt
//      der Snapshot in Produktion weder die deutschen Mail-Vorlagen noch die
//      eingestellte Anmeldedauer. Auf einer frischen Installation gelten dort
//      die PocketBase-Vorgaben; was wir davon anders wollen, stellt
//      1790500200_settings.js ein.
//
// Systemsammlungen (_superusers, _mfas, _otps, _externalAuths,
// _authOrigins) sind nicht enthalten; PocketBase legt sie selbst an.
//
// importCollections(…, false): Sammlungen und Felder, die hier NICHT stehen,
// bleiben erhalten. Nichts wird gelöscht.

migrate((app) => {
  const snapshot = [
    {
      "id": "_pb_users_auth_",
      "name": "users",
      "type": "auth",
      "system": false,
      "listRule": "id = @request.auth.id",
      "viewRule": "id = @request.auth.id",
      "createRule": "",
      "updateRule": "id = @request.auth.id",
      "deleteRule": "id = @request.auth.id",
      "authRule": "",
      "manageRule": null,
      "passwordAuth": {
        "enabled": true,
        "identityFields": [
          "email",
          "username"
        ]
      },
      "fields": [
        {
          "autogeneratePattern": "[a-z0-9]{15}",
          "help": "",
          "hidden": false,
          "id": "text3208210256",
          "max": 15,
          "min": 15,
          "name": "id",
          "pattern": "^[a-z0-9]+$",
          "presentable": false,
          "primaryKey": true,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "cost": 10,
          "help": "",
          "hidden": true,
          "id": "password901924565",
          "max": 0,
          "min": 8,
          "name": "password",
          "pattern": "",
          "presentable": false,
          "required": true,
          "system": true,
          "type": "password"
        },
        {
          "autogeneratePattern": "[a-zA-Z0-9_]{50}",
          "help": "",
          "hidden": true,
          "id": "text2504183744",
          "max": 60,
          "min": 30,
          "name": "tokenKey",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "exceptDomains": [],
          "help": "",
          "hidden": false,
          "id": "email3885137012",
          "name": "email",
          "onlyDomains": [],
          "presentable": false,
          "required": false,
          "system": true,
          "type": "email"
        },
        {
          "help": "",
          "hidden": false,
          "id": "bool1547992806",
          "name": "emailVisibility",
          "presentable": false,
          "required": false,
          "system": true,
          "type": "bool"
        },
        {
          "help": "",
          "hidden": false,
          "id": "bool256245529",
          "name": "verified",
          "presentable": false,
          "required": false,
          "system": true,
          "type": "bool"
        },
        {
          "autogeneratePattern": "users[0-9]{6}",
          "help": "",
          "hidden": false,
          "id": "text4166911607",
          "max": 150,
          "min": 3,
          "name": "username",
          "pattern": "^[\\w][\\w\\.\\-]*$",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "users_name",
          "max": 0,
          "min": 0,
          "name": "name",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "help": "",
          "hidden": false,
          "id": "users_avatar",
          "maxSelect": 1,
          "maxSize": 5242880,
          "mimeTypes": [
            "image/jpeg",
            "image/png",
            "image/svg+xml",
            "image/gif",
            "image/webp"
          ],
          "name": "avatar",
          "presentable": false,
          "protected": false,
          "required": false,
          "system": false,
          "thumbs": [],
          "type": "file"
        },
        {
          "help": "",
          "hidden": false,
          "id": "xmtjurxy",
          "maxSelect": 1,
          "name": "role",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "select",
          "values": [
            "visitor",
            "volunteer",
            "admin"
          ]
        },
        {
          "help": "",
          "hidden": false,
          "id": "rvihqqxo",
          "max": null,
          "min": 0,
          "name": "points_total",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "help": "",
          "hidden": false,
          "id": "7e2pnurm",
          "max": null,
          "min": 0,
          "name": "streak_weeks",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "help": "",
          "hidden": false,
          "id": "zeautmnj",
          "max": "",
          "min": "",
          "name": "streak_last_visit",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "date"
        },
        {
          "help": "",
          "hidden": false,
          "id": "p1ajjswa",
          "max": "",
          "min": "",
          "name": "streak_grace_until",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "date"
        },
        {
          "help": "",
          "hidden": false,
          "id": "u7u3s3wl",
          "name": "onboarding_complete",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "bool"
        },
        {
          "help": "",
          "hidden": false,
          "id": "xcyyokwn",
          "name": "push_streak_enabled",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "bool"
        },
        {
          "help": "",
          "hidden": false,
          "id": "ou71zexf",
          "name": "push_campaign_enabled",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "bool"
        },
        {
          "help": "",
          "hidden": false,
          "id": "9nl1tet5",
          "name": "push_badge_enabled",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "bool"
        },
        {
          "help": "",
          "hidden": false,
          "id": "aehtzlky",
          "name": "push_other_enabled",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "bool"
        },
        {
          "hidden": false,
          "id": "autodate2990389176",
          "name": "created",
          "onCreate": true,
          "onUpdate": false,
          "presentable": false,
          "system": false,
          "type": "autodate"
        },
        {
          "hidden": false,
          "id": "autodate3332085495",
          "name": "updated",
          "onCreate": true,
          "onUpdate": true,
          "presentable": false,
          "system": false,
          "type": "autodate"
        }
      ],
      "indexes": [
        "CREATE UNIQUE INDEX `__pb_users_auth__username_idx` ON `users` (username COLLATE NOCASE)",
        "CREATE UNIQUE INDEX `__pb_users_auth__email_idx` ON `users` (`email`) WHERE `email` != ''",
        "CREATE UNIQUE INDEX `__pb_users_auth__tokenKey_idx` ON `users` (`tokenKey`)"
      ]
    },
    {
      "id": "u0f4gt9jprxg7jz",
      "name": "items",
      "type": "base",
      "system": false,
      "listRule": "(@request.auth.id != \"\" && (status = \"approved\" || status = \"\" || created_by = @request.auth.id)) || @request.auth.role = \"volunteer\" || @request.auth.role = \"admin\"",
      "viewRule": "(@request.auth.id != \"\" && (status = \"approved\" || status = \"\" || created_by = @request.auth.id)) || @request.auth.role = \"volunteer\" || @request.auth.role = \"admin\"",
      "createRule": "@request.auth.id != \"\"",
      "updateRule": "@request.auth.role = \"volunteer\" || @request.auth.role = \"admin\"",
      "deleteRule": "@request.auth.role = \"admin\"",
      "fields": [
        {
          "autogeneratePattern": "[a-z0-9]{15}",
          "help": "",
          "hidden": false,
          "id": "text3208210256",
          "max": 15,
          "min": 15,
          "name": "id",
          "pattern": "^[a-z0-9]+$",
          "presentable": false,
          "primaryKey": true,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "fdjrvz16",
          "max": 32,
          "min": 0,
          "name": "sku",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "mog6yfk3",
          "max": 80,
          "min": 0,
          "name": "title",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": false,
          "type": "text"
        },
        {
          "help": "",
          "hidden": false,
          "id": "svbdogpo",
          "maxSelect": 1,
          "name": "category",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "select",
          "values": [
            "damen-oberteil",
            "damen-hose",
            "damen-kleid",
            "damen-schuhe",
            "herren-oberteil",
            "herren-hose",
            "herren-schuhe",
            "kinder",
            "accessoires",
            "sonstiges"
          ]
        },
        {
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "pxlxc4w9",
          "max": 16,
          "min": 0,
          "name": "size",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "help": "",
          "hidden": false,
          "id": "21wi9zvf",
          "maxSelect": 1,
          "name": "condition",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "select",
          "values": [
            "neu",
            "sehr-gut",
            "gut",
            "gebraucht"
          ]
        },
        {
          "help": "",
          "hidden": false,
          "id": "sukpa87z",
          "maxSelect": 1,
          "maxSize": 4194304,
          "mimeTypes": [
            "image/jpeg",
            "image/png",
            "image/webp"
          ],
          "name": "photo",
          "presentable": false,
          "protected": false,
          "required": false,
          "system": false,
          "thumbs": [
            "400x400"
          ],
          "type": "file"
        },
        {
          "help": "",
          "hidden": false,
          "id": "e2s5tbug",
          "max": null,
          "min": 0,
          "name": "points",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "2b0giztl",
          "max": 64,
          "min": 0,
          "name": "qr_code",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "help": "",
          "hidden": false,
          "id": "ittlu8qh",
          "name": "is_showcase",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "bool"
        },
        {
          "help": "",
          "hidden": false,
          "id": "5pmi25zo",
          "max": null,
          "min": null,
          "name": "showcase_position",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "y826uc93",
          "max": 200,
          "min": 0,
          "name": "note",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "help": "",
          "hidden": false,
          "id": "oa6zvdud",
          "max": "",
          "min": "",
          "name": "taken_at",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "date"
        },
        {
          "help": "",
          "hidden": false,
          "id": "nbumll9j",
          "max": "",
          "min": "",
          "name": "archived_at",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "date"
        },
        {
          "cascadeDelete": false,
          "collectionId": "_pb_users_auth_",
          "help": "",
          "hidden": false,
          "id": "bhntvvf7",
          "maxSelect": 1,
          "minSelect": 0,
          "name": "created_by",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "relation"
        },
        {
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "pmqvh5ce",
          "max": 120,
          "min": 0,
          "name": "location",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "help": "",
          "hidden": false,
          "id": "sjdstjxw",
          "name": "stays_external",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "bool"
        },
        {
          "help": "",
          "hidden": false,
          "id": "xblzdwpi",
          "maxSelect": 1,
          "name": "status",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "select",
          "values": [
            "pending",
            "approved",
            "archived"
          ]
        },
        {
          "help": "",
          "hidden": false,
          "id": "9zglqalf",
          "name": "brought_awarded",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "bool"
        },
        {
          "cascadeDelete": false,
          "collectionId": "z77g5guzzkbp2tf",
          "help": "",
          "hidden": false,
          "id": "fx8udx3m",
          "maxSelect": 1,
          "minSelect": 0,
          "name": "campaign",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "relation"
        },
        {
          "hidden": false,
          "id": "autodate2990389176",
          "name": "created",
          "onCreate": true,
          "onUpdate": false,
          "presentable": false,
          "system": false,
          "type": "autodate"
        },
        {
          "hidden": false,
          "id": "autodate3332085495",
          "name": "updated",
          "onCreate": true,
          "onUpdate": true,
          "presentable": false,
          "system": false,
          "type": "autodate"
        }
      ],
      "indexes": [
        "CREATE UNIQUE INDEX idx_items_sku ON items (sku)",
        "CREATE INDEX idx_items_qr ON items (qr_code)",
        "CREATE INDEX idx_items_showcase ON items (is_showcase)",
        "CREATE INDEX idx_items_status ON items (status)"
      ]
    },
    {
      "id": "z77g5guzzkbp2tf",
      "name": "campaigns",
      "type": "base",
      "system": false,
      "listRule": "@request.auth.id != \"\"",
      "viewRule": "@request.auth.id != \"\"",
      "createRule": "@request.auth.role = \"admin\"",
      "updateRule": "@request.auth.role = \"admin\"",
      "deleteRule": "@request.auth.role = \"admin\"",
      "fields": [
        {
          "autogeneratePattern": "[a-z0-9]{15}",
          "help": "",
          "hidden": false,
          "id": "text3208210256",
          "max": 15,
          "min": 15,
          "name": "id",
          "pattern": "^[a-z0-9]+$",
          "presentable": false,
          "primaryKey": true,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "mhwgi6br",
          "max": 80,
          "min": 0,
          "name": "name",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": false,
          "type": "text"
        },
        {
          "help": "",
          "hidden": false,
          "id": "la1avfw5",
          "max": null,
          "min": 1,
          "name": "multiplier",
          "onlyInt": false,
          "presentable": false,
          "required": true,
          "system": false,
          "type": "number"
        },
        {
          "help": "",
          "hidden": false,
          "id": "irymstjb",
          "max": "",
          "min": "",
          "name": "starts_at",
          "presentable": false,
          "required": true,
          "system": false,
          "type": "date"
        },
        {
          "help": "",
          "hidden": false,
          "id": "pbfn8lzw",
          "max": "",
          "min": "",
          "name": "ends_at",
          "presentable": false,
          "required": true,
          "system": false,
          "type": "date"
        },
        {
          "help": "",
          "hidden": false,
          "id": "ae8t1ena",
          "maxSelect": 1,
          "name": "target_role",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "select",
          "values": [
            "all",
            "visitor",
            "streak2plus",
            "inactive14d"
          ]
        },
        {
          "cascadeDelete": false,
          "collectionId": "_pb_users_auth_",
          "help": "",
          "hidden": false,
          "id": "kzui1ogd",
          "maxSelect": 1,
          "minSelect": 0,
          "name": "created_by",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "relation"
        },
        {
          "cascadeDelete": false,
          "collectionId": "gtl4r3f5v9uiguc",
          "help": "",
          "hidden": false,
          "id": "yczpf5pb",
          "maxSelect": 1,
          "minSelect": 0,
          "name": "badge",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "relation"
        },
        {
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "pckhzazg",
          "max": 200,
          "min": 0,
          "name": "description",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "help": "",
          "hidden": false,
          "id": "kqzohjwy",
          "max": null,
          "min": 0,
          "name": "mult_visit",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "help": "",
          "hidden": false,
          "id": "wx2xzthv",
          "max": null,
          "min": 0,
          "name": "mult_take",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "help": "",
          "hidden": false,
          "id": "pkqiwzrz",
          "max": null,
          "min": 0,
          "name": "mult_bring",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "t6ntnydc",
          "max": 9,
          "min": 0,
          "name": "color",
          "pattern": "^#?[0-9a-fA-F]{6}$",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "hidden": false,
          "id": "autodate2990389176",
          "name": "created",
          "onCreate": true,
          "onUpdate": false,
          "presentable": false,
          "system": false,
          "type": "autodate"
        },
        {
          "hidden": false,
          "id": "autodate3332085495",
          "name": "updated",
          "onCreate": true,
          "onUpdate": true,
          "presentable": false,
          "system": false,
          "type": "autodate"
        }
      ],
      "indexes": [
        "CREATE INDEX idx_campaigns_window ON campaigns (starts_at, ends_at)"
      ]
    },
    {
      "id": "ujctk8m97frgzla",
      "name": "visits",
      "type": "base",
      "system": false,
      "listRule": "user = @request.auth.id || @request.auth.role = \"admin\"",
      "viewRule": "user = @request.auth.id || @request.auth.role = \"admin\"",
      "createRule": null,
      "updateRule": null,
      "deleteRule": null,
      "fields": [
        {
          "autogeneratePattern": "[a-z0-9]{15}",
          "help": "",
          "hidden": false,
          "id": "text3208210256",
          "max": 15,
          "min": 15,
          "name": "id",
          "pattern": "^[a-z0-9]+$",
          "presentable": false,
          "primaryKey": true,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "cascadeDelete": true,
          "collectionId": "_pb_users_auth_",
          "help": "",
          "hidden": false,
          "id": "qlcfgk3y",
          "maxSelect": 1,
          "minSelect": 0,
          "name": "user",
          "presentable": false,
          "required": true,
          "system": false,
          "type": "relation"
        },
        {
          "help": "",
          "hidden": false,
          "id": "9ty9v8xq",
          "max": "",
          "min": "",
          "name": "checkin_at",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "date"
        },
        {
          "help": "",
          "hidden": false,
          "id": "o9a24we1",
          "max": null,
          "min": 0,
          "name": "items_count",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "help": "",
          "hidden": false,
          "id": "etfcsmns",
          "max": null,
          "min": null,
          "name": "gps_lat",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "help": "",
          "hidden": false,
          "id": "kz8td020",
          "max": null,
          "min": null,
          "name": "gps_lng",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "help": "",
          "hidden": false,
          "id": "0gl8fp80",
          "max": null,
          "min": null,
          "name": "gps_distance_m",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "cascadeDelete": false,
          "collectionId": "z77g5guzzkbp2tf",
          "help": "",
          "hidden": false,
          "id": "ihpotpyl",
          "maxSelect": 1,
          "minSelect": 0,
          "name": "campaign",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "relation"
        },
        {
          "help": "",
          "hidden": false,
          "id": "zc1m4iik",
          "max": null,
          "min": null,
          "name": "points_awarded",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "hidden": false,
          "id": "autodate2990389176",
          "name": "created",
          "onCreate": true,
          "onUpdate": false,
          "presentable": false,
          "system": false,
          "type": "autodate"
        },
        {
          "hidden": false,
          "id": "autodate3332085495",
          "name": "updated",
          "onCreate": true,
          "onUpdate": true,
          "presentable": false,
          "system": false,
          "type": "autodate"
        }
      ],
      "indexes": [
        "CREATE INDEX idx_visits_user ON visits (user)"
      ]
    },
    {
      "id": "23zudc8jqzo7pv7",
      "name": "points_log",
      "type": "base",
      "system": false,
      "listRule": "user = @request.auth.id || @request.auth.role = \"admin\"",
      "viewRule": "user = @request.auth.id || @request.auth.role = \"admin\"",
      "createRule": null,
      "updateRule": null,
      "deleteRule": null,
      "fields": [
        {
          "autogeneratePattern": "[a-z0-9]{15}",
          "help": "",
          "hidden": false,
          "id": "text3208210256",
          "max": 15,
          "min": 15,
          "name": "id",
          "pattern": "^[a-z0-9]+$",
          "presentable": false,
          "primaryKey": true,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "cascadeDelete": true,
          "collectionId": "_pb_users_auth_",
          "help": "",
          "hidden": false,
          "id": "of0tvmwr",
          "maxSelect": 1,
          "minSelect": 0,
          "name": "user",
          "presentable": false,
          "required": true,
          "system": false,
          "type": "relation"
        },
        {
          "help": "",
          "hidden": false,
          "id": "lthxm7q1",
          "max": null,
          "min": null,
          "name": "points",
          "onlyInt": false,
          "presentable": false,
          "required": true,
          "system": false,
          "type": "number"
        },
        {
          "help": "",
          "hidden": false,
          "id": "rzca4pm9",
          "maxSelect": 1,
          "name": "kind",
          "presentable": false,
          "required": true,
          "system": false,
          "type": "select",
          "values": [
            "checkin",
            "scan",
            "bring",
            "badge",
            "streak",
            "campaign",
            "adjustment"
          ]
        },
        {
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "xjezirgw",
          "max": 80,
          "min": 0,
          "name": "label",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "ib3ppvos",
          "max": 64,
          "min": 0,
          "name": "ref_id",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "hidden": false,
          "id": "autodate2990389176",
          "name": "created",
          "onCreate": true,
          "onUpdate": false,
          "presentable": false,
          "system": false,
          "type": "autodate"
        },
        {
          "hidden": false,
          "id": "autodate3332085495",
          "name": "updated",
          "onCreate": true,
          "onUpdate": true,
          "presentable": false,
          "system": false,
          "type": "autodate"
        }
      ],
      "indexes": [
        "CREATE INDEX idx_pointslog_user ON points_log (user, created)"
      ]
    },
    {
      "id": "gtl4r3f5v9uiguc",
      "name": "badges",
      "type": "base",
      "system": false,
      "listRule": "@request.auth.id != \"\"",
      "viewRule": "@request.auth.id != \"\"",
      "createRule": "@request.auth.role = \"admin\"",
      "updateRule": "@request.auth.role = \"admin\"",
      "deleteRule": "@request.auth.role = \"admin\"",
      "fields": [
        {
          "autogeneratePattern": "[a-z0-9]{15}",
          "help": "",
          "hidden": false,
          "id": "text3208210256",
          "max": 15,
          "min": 15,
          "name": "id",
          "pattern": "^[a-z0-9]+$",
          "presentable": false,
          "primaryKey": true,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "xyvvm3q8",
          "max": 48,
          "min": 0,
          "name": "slug",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "0as3pvrn",
          "max": 80,
          "min": 0,
          "name": "name",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "ec7mzhg5",
          "max": 200,
          "min": 0,
          "name": "description",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "help": "",
          "hidden": false,
          "id": "5zorb8do",
          "maxSelect": 1,
          "name": "category",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "select",
          "values": [
            "bringer",
            "holer",
            "besucher",
            "saison",
            "streak",
            "meilenstein"
          ]
        },
        {
          "help": "",
          "hidden": false,
          "id": "dbqjo1t3",
          "maxSelect": 1,
          "name": "tier",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "select",
          "values": [
            "bronze",
            "silber",
            "gold",
            "platin",
            "diamant"
          ]
        },
        {
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "4alby7kl",
          "max": 48,
          "min": 0,
          "name": "icon",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "help": "",
          "hidden": false,
          "id": "ydyhekmc",
          "maxSelect": 1,
          "name": "trigger_type",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "select",
          "values": [
            "visits",
            "scans",
            "streak_weeks",
            "items_brought",
            "season_window",
            "items_in_period",
            "years_active",
            "action_participation"
          ]
        },
        {
          "help": "",
          "hidden": false,
          "id": "vqrdmpac",
          "max": null,
          "min": 0,
          "name": "trigger_value",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "abt7uhkv",
          "max": 5,
          "min": 0,
          "name": "season_start",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "tc8lwt5k",
          "max": 5,
          "min": 0,
          "name": "season_end",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "help": "",
          "hidden": false,
          "id": "nkhwgdyl",
          "max": null,
          "min": 0,
          "name": "points_reward",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "help": "",
          "hidden": false,
          "id": "myimywib",
          "name": "is_visible",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "bool"
        },
        {
          "help": "",
          "hidden": false,
          "id": "veo80wfe",
          "max": null,
          "min": 0,
          "name": "tier_bronze",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "help": "",
          "hidden": false,
          "id": "zasszmoi",
          "max": null,
          "min": 0,
          "name": "tier_silber",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "help": "",
          "hidden": false,
          "id": "yrg32o6r",
          "max": null,
          "min": 0,
          "name": "tier_gold",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "help": "",
          "hidden": false,
          "id": "flqxgdax",
          "max": null,
          "min": 0,
          "name": "tier_platin",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "help": "",
          "hidden": false,
          "id": "yakkjnhk",
          "max": null,
          "min": 0,
          "name": "reward_bronze",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "help": "",
          "hidden": false,
          "id": "5bh4lsaa",
          "max": null,
          "min": 0,
          "name": "reward_silber",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "help": "",
          "hidden": false,
          "id": "mp7omc0s",
          "max": null,
          "min": 0,
          "name": "reward_gold",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "help": "",
          "hidden": false,
          "id": "wdcnfl1i",
          "max": null,
          "min": 0,
          "name": "reward_platin",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "help": "",
          "hidden": false,
          "id": "emrgc1az",
          "maxSelect": 1,
          "name": "kind",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "select",
          "values": [
            "tiered",
            "single"
          ]
        },
        {
          "cascadeDelete": false,
          "collectionId": "z77g5guzzkbp2tf",
          "help": "",
          "hidden": false,
          "id": "hnmsq7km",
          "maxSelect": 1,
          "minSelect": 0,
          "name": "campaign",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "relation"
        },
        {
          "help": "",
          "hidden": false,
          "id": "8efmcgop",
          "max": null,
          "min": 0,
          "name": "tier_diamant",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "help": "",
          "hidden": false,
          "id": "haphwpsx",
          "max": null,
          "min": 0,
          "name": "reward_diamant",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "help": "",
          "hidden": false,
          "id": "epgtzrak",
          "name": "is_secret",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "bool"
        },
        {
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "gokztglq",
          "max": 9,
          "min": 0,
          "name": "color",
          "pattern": "^#?[0-9a-fA-F]{6}$",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "hidden": false,
          "id": "autodate2990389176",
          "name": "created",
          "onCreate": true,
          "onUpdate": false,
          "presentable": false,
          "system": false,
          "type": "autodate"
        },
        {
          "hidden": false,
          "id": "autodate3332085495",
          "name": "updated",
          "onCreate": true,
          "onUpdate": true,
          "presentable": false,
          "system": false,
          "type": "autodate"
        }
      ],
      "indexes": [
        "CREATE UNIQUE INDEX idx_badges_slug ON badges (slug)"
      ]
    },
    {
      "id": "999g7zpeb6sicz6",
      "name": "user_badges",
      "type": "base",
      "system": false,
      "listRule": "user = @request.auth.id || @request.auth.role = \"admin\"",
      "viewRule": "user = @request.auth.id || @request.auth.role = \"admin\"",
      "createRule": null,
      "updateRule": null,
      "deleteRule": null,
      "fields": [
        {
          "autogeneratePattern": "[a-z0-9]{15}",
          "help": "",
          "hidden": false,
          "id": "text3208210256",
          "max": 15,
          "min": 15,
          "name": "id",
          "pattern": "^[a-z0-9]+$",
          "presentable": false,
          "primaryKey": true,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "cascadeDelete": true,
          "collectionId": "_pb_users_auth_",
          "help": "",
          "hidden": false,
          "id": "0yrr0hsf",
          "maxSelect": 1,
          "minSelect": 0,
          "name": "user",
          "presentable": false,
          "required": true,
          "system": false,
          "type": "relation"
        },
        {
          "cascadeDelete": true,
          "collectionId": "gtl4r3f5v9uiguc",
          "help": "",
          "hidden": false,
          "id": "ra7y7eu3",
          "maxSelect": 1,
          "minSelect": 0,
          "name": "badge",
          "presentable": false,
          "required": true,
          "system": false,
          "type": "relation"
        },
        {
          "help": "",
          "hidden": false,
          "id": "puopgcpg",
          "max": "",
          "min": "",
          "name": "unlocked_at",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "date"
        },
        {
          "help": "",
          "hidden": false,
          "id": "wifgtwpi",
          "max": null,
          "min": 0,
          "name": "progress",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "help": "",
          "hidden": false,
          "id": "elkiwihx",
          "maxSelect": 1,
          "name": "current_tier",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "select",
          "values": [
            "none",
            "bronze",
            "silber",
            "gold",
            "platin",
            "diamant"
          ]
        },
        {
          "hidden": false,
          "id": "autodate2990389176",
          "name": "created",
          "onCreate": true,
          "onUpdate": false,
          "presentable": false,
          "system": false,
          "type": "autodate"
        },
        {
          "hidden": false,
          "id": "autodate3332085495",
          "name": "updated",
          "onCreate": true,
          "onUpdate": true,
          "presentable": false,
          "system": false,
          "type": "autodate"
        }
      ],
      "indexes": [
        "CREATE UNIQUE INDEX idx_userbadges_unique ON user_badges (user, badge)"
      ]
    },
    {
      "id": "ghlbnbtepw8xghj",
      "name": "push_devices",
      "type": "base",
      "system": false,
      "listRule": "user = @request.auth.id || @request.auth.role = \"admin\"",
      "viewRule": "user = @request.auth.id || @request.auth.role = \"admin\"",
      "createRule": "user = @request.auth.id",
      "updateRule": "user = @request.auth.id",
      "deleteRule": "user = @request.auth.id",
      "fields": [
        {
          "autogeneratePattern": "[a-z0-9]{15}",
          "help": "",
          "hidden": false,
          "id": "text3208210256",
          "max": 15,
          "min": 15,
          "name": "id",
          "pattern": "^[a-z0-9]+$",
          "presentable": false,
          "primaryKey": true,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "cascadeDelete": true,
          "collectionId": "_pb_users_auth_",
          "help": "",
          "hidden": false,
          "id": "5ug1p7bi",
          "maxSelect": 1,
          "minSelect": 0,
          "name": "user",
          "presentable": false,
          "required": true,
          "system": false,
          "type": "relation"
        },
        {
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "so1qc3zr",
          "max": 128,
          "min": 0,
          "name": "expo_token",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": false,
          "type": "text"
        },
        {
          "help": "",
          "hidden": false,
          "id": "ci8icyxe",
          "maxSelect": 1,
          "name": "platform",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "select",
          "values": [
            "ios",
            "android"
          ]
        },
        {
          "help": "",
          "hidden": false,
          "id": "b6wmjy7m",
          "max": "",
          "min": "",
          "name": "last_seen",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "date"
        },
        {
          "hidden": false,
          "id": "autodate2990389176",
          "name": "created",
          "onCreate": true,
          "onUpdate": false,
          "presentable": false,
          "system": false,
          "type": "autodate"
        },
        {
          "hidden": false,
          "id": "autodate3332085495",
          "name": "updated",
          "onCreate": true,
          "onUpdate": true,
          "presentable": false,
          "system": false,
          "type": "autodate"
        }
      ],
      "indexes": [
        "CREATE UNIQUE INDEX idx_pushdevices_token ON push_devices (expo_token)"
      ]
    },
    {
      "id": "b77mjuowraffk9x",
      "name": "push_messages",
      "type": "base",
      "system": false,
      "listRule": "@request.auth.role = \"admin\"",
      "viewRule": "@request.auth.role = \"admin\"",
      "createRule": "@request.auth.role = \"admin\"",
      "updateRule": "@request.auth.role = \"admin\"",
      "deleteRule": "@request.auth.role = \"admin\"",
      "fields": [
        {
          "autogeneratePattern": "[a-z0-9]{15}",
          "help": "",
          "hidden": false,
          "id": "text3208210256",
          "max": 15,
          "min": 15,
          "name": "id",
          "pattern": "^[a-z0-9]+$",
          "presentable": false,
          "primaryKey": true,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "gbpcaruc",
          "max": 100,
          "min": 0,
          "name": "title",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "sihwj8wc",
          "max": 240,
          "min": 0,
          "name": "body",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": false,
          "type": "text"
        },
        {
          "help": "",
          "hidden": false,
          "id": "ajciordk",
          "maxSelect": 1,
          "name": "target_segment",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "select",
          "values": [
            "all",
            "streak2plus",
            "inactive14d",
            "by_role"
          ]
        },
        {
          "help": "",
          "hidden": false,
          "id": "o2swslsk",
          "maxSelect": 1,
          "name": "target_role",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "select",
          "values": [
            "visitor",
            "volunteer",
            "admin"
          ]
        },
        {
          "help": "",
          "hidden": false,
          "id": "sysruyxl",
          "max": "",
          "min": "",
          "name": "scheduled_at",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "date"
        },
        {
          "help": "",
          "hidden": false,
          "id": "om65p5n6",
          "max": "",
          "min": "",
          "name": "sent_at",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "date"
        },
        {
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "ahgne1sp",
          "max": 120,
          "min": 0,
          "name": "deep_link",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "cascadeDelete": false,
          "collectionId": "_pb_users_auth_",
          "help": "",
          "hidden": false,
          "id": "abxndbb7",
          "maxSelect": 1,
          "minSelect": 0,
          "name": "sent_by",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "relation"
        },
        {
          "help": "",
          "hidden": false,
          "id": "odya6f0r",
          "max": null,
          "min": 0,
          "name": "send_attempts",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "hidden": false,
          "id": "autodate2990389176",
          "name": "created",
          "onCreate": true,
          "onUpdate": false,
          "presentable": false,
          "system": false,
          "type": "autodate"
        },
        {
          "hidden": false,
          "id": "autodate3332085495",
          "name": "updated",
          "onCreate": true,
          "onUpdate": true,
          "presentable": false,
          "system": false,
          "type": "autodate"
        }
      ],
      "indexes": []
    },
    {
      "id": "3sl5eyeqbu0yrok",
      "name": "store",
      "type": "base",
      "system": false,
      "listRule": "@request.auth.id != \"\"",
      "viewRule": "@request.auth.id != \"\"",
      "createRule": "@request.auth.role = \"admin\"",
      "updateRule": "@request.auth.role = \"admin\"",
      "deleteRule": "@request.auth.role = \"admin\"",
      "fields": [
        {
          "autogeneratePattern": "[a-z0-9]{15}",
          "help": "",
          "hidden": false,
          "id": "text3208210256",
          "max": 15,
          "min": 15,
          "name": "id",
          "pattern": "^[a-z0-9]+$",
          "presentable": false,
          "primaryKey": true,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "jdjm01ky",
          "max": 80,
          "min": 0,
          "name": "name",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "z0pi6irw",
          "max": 200,
          "min": 0,
          "name": "address",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "help": "",
          "hidden": false,
          "id": "auet5zwp",
          "max": null,
          "min": null,
          "name": "lat",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "help": "",
          "hidden": false,
          "id": "b1gnann5",
          "max": null,
          "min": null,
          "name": "lng",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "2fbql4s5",
          "max": 40,
          "min": 0,
          "name": "phone",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "help": "",
          "hidden": false,
          "id": "klan2unl",
          "maxSize": 2000000,
          "name": "hours_json",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "json"
        },
        {
          "help": "",
          "hidden": false,
          "id": "im3s1lf1",
          "maxSelect": 1,
          "maxSize": 4194304,
          "mimeTypes": [
            "image/jpeg",
            "image/png",
            "image/webp"
          ],
          "name": "cover_photo",
          "presentable": false,
          "protected": false,
          "required": false,
          "system": false,
          "thumbs": [],
          "type": "file"
        },
        {
          "help": "",
          "hidden": false,
          "id": "zh5cznzo",
          "max": null,
          "min": 0,
          "name": "geofence_radius_m",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "51liyks6",
          "max": 128,
          "min": 0,
          "name": "checkin_qr_secret",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "help": "",
          "hidden": false,
          "id": "bl11bn8k",
          "maxSize": 20000,
          "name": "tiers_json",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "json"
        },
        {
          "help": "",
          "hidden": false,
          "id": "4bd0gkju",
          "max": null,
          "min": 0,
          "name": "pts_checkin",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "help": "",
          "hidden": false,
          "id": "kojymxfm",
          "max": null,
          "min": 0,
          "name": "pts_take",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "help": "",
          "hidden": false,
          "id": "5rpqfwfu",
          "max": null,
          "min": 0,
          "name": "pts_bring",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "help": "",
          "hidden": false,
          "id": "6et4srfm",
          "max": null,
          "min": 0,
          "name": "max_items_take",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "gpp5kt06",
          "max": 64,
          "min": 0,
          "name": "timezone",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "hidden": false,
          "id": "autodate2990389176",
          "name": "created",
          "onCreate": true,
          "onUpdate": false,
          "presentable": false,
          "system": false,
          "type": "autodate"
        },
        {
          "hidden": false,
          "id": "autodate3332085495",
          "name": "updated",
          "onCreate": true,
          "onUpdate": true,
          "presentable": false,
          "system": false,
          "type": "autodate"
        }
      ],
      "indexes": []
    },
    {
      "id": "b22v8u9cmop2rgg",
      "name": "needs",
      "type": "base",
      "system": false,
      "listRule": "@request.auth.id != \"\"",
      "viewRule": "@request.auth.id != \"\"",
      "createRule": "@request.auth.role = \"volunteer\" || @request.auth.role = \"admin\"",
      "updateRule": "@request.auth.role = \"volunteer\" || @request.auth.role = \"admin\"",
      "deleteRule": "@request.auth.role = \"volunteer\" || @request.auth.role = \"admin\"",
      "fields": [
        {
          "autogeneratePattern": "[a-z0-9]{15}",
          "help": "",
          "hidden": false,
          "id": "text3208210256",
          "max": 15,
          "min": 15,
          "name": "id",
          "pattern": "^[a-z0-9]+$",
          "presentable": false,
          "primaryKey": true,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "aw3ub6i0",
          "max": 80,
          "min": 0,
          "name": "title",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "gt2rviqc",
          "max": 300,
          "min": 0,
          "name": "detail",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "pdjy90ga",
          "max": 40,
          "min": 0,
          "name": "icon",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "help": "",
          "hidden": false,
          "id": "lfd61ucw",
          "name": "is_active",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "bool"
        },
        {
          "help": "",
          "hidden": false,
          "id": "dbv9wp4m",
          "max": null,
          "min": null,
          "name": "sort",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "k1z8hkdu",
          "max": 9,
          "min": 0,
          "name": "color",
          "pattern": "^#?[0-9a-fA-F]{6}$",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "cascadeDelete": false,
          "collectionId": "z77g5guzzkbp2tf",
          "help": "",
          "hidden": false,
          "id": "khk3qfr3",
          "maxSelect": 1,
          "minSelect": 0,
          "name": "campaign",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "relation"
        },
        {
          "hidden": false,
          "id": "autodate2990389176",
          "name": "created",
          "onCreate": true,
          "onUpdate": false,
          "presentable": false,
          "system": false,
          "type": "autodate"
        },
        {
          "hidden": false,
          "id": "autodate3332085495",
          "name": "updated",
          "onCreate": true,
          "onUpdate": true,
          "presentable": false,
          "system": false,
          "type": "autodate"
        }
      ],
      "indexes": [
        "CREATE INDEX idx_needs_active ON needs (is_active)"
      ]
    },
    {
      "id": "jly2nbfrtgrbz4o",
      "name": "action_counts",
      "type": "base",
      "system": false,
      "listRule": "user = @request.auth.id || @request.auth.role = \"admin\"",
      "viewRule": "user = @request.auth.id || @request.auth.role = \"admin\"",
      "createRule": null,
      "updateRule": null,
      "deleteRule": null,
      "fields": [
        {
          "autogeneratePattern": "[a-z0-9]{15}",
          "help": "",
          "hidden": false,
          "id": "text3208210256",
          "max": 15,
          "min": 15,
          "name": "id",
          "pattern": "^[a-z0-9]+$",
          "presentable": false,
          "primaryKey": true,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "cascadeDelete": true,
          "collectionId": "_pb_users_auth_",
          "help": "",
          "hidden": false,
          "id": "oxknfpl8",
          "maxSelect": 1,
          "minSelect": 0,
          "name": "user",
          "presentable": false,
          "required": true,
          "system": false,
          "type": "relation"
        },
        {
          "cascadeDelete": true,
          "collectionId": "z77g5guzzkbp2tf",
          "help": "",
          "hidden": false,
          "id": "1vkeae9w",
          "maxSelect": 1,
          "minSelect": 0,
          "name": "campaign",
          "presentable": false,
          "required": true,
          "system": false,
          "type": "relation"
        },
        {
          "help": "",
          "hidden": false,
          "id": "nhivqqgc",
          "max": null,
          "min": 0,
          "name": "count",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "hidden": false,
          "id": "autodate2990389176",
          "name": "created",
          "onCreate": true,
          "onUpdate": false,
          "presentable": false,
          "system": false,
          "type": "autodate"
        },
        {
          "hidden": false,
          "id": "autodate3332085495",
          "name": "updated",
          "onCreate": true,
          "onUpdate": true,
          "presentable": false,
          "system": false,
          "type": "autodate"
        }
      ],
      "indexes": [
        "CREATE UNIQUE INDEX idx_actioncounts_user_campaign ON action_counts (user, campaign)"
      ]
    },
    {
      "id": "qlp2wbzi23x4d0w",
      "name": "store_secrets",
      "type": "base",
      "system": false,
      "listRule": null,
      "viewRule": null,
      "createRule": null,
      "updateRule": null,
      "deleteRule": null,
      "fields": [
        {
          "autogeneratePattern": "[a-z0-9]{15}",
          "help": "",
          "hidden": false,
          "id": "text3208210256",
          "max": 15,
          "min": 15,
          "name": "id",
          "pattern": "^[a-z0-9]+$",
          "presentable": false,
          "primaryKey": true,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "sjfsxsvw",
          "max": 128,
          "min": 0,
          "name": "checkin_qr_secret",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "hidden": false,
          "id": "autodate2990389176",
          "name": "created",
          "onCreate": true,
          "onUpdate": false,
          "presentable": false,
          "system": false,
          "type": "autodate"
        },
        {
          "hidden": false,
          "id": "autodate3332085495",
          "name": "updated",
          "onCreate": true,
          "onUpdate": true,
          "presentable": false,
          "system": false,
          "type": "autodate"
        }
      ],
      "indexes": []
    }
  ];

  // ── a) IDs auf den Bestand umschreiben ──────────────────────
  const idMap = {};
  for (const col of snapshot) {
    let existing = null;
    try {
      existing = app.findCollectionByNameOrId(col.name);
    } catch (_) {
      // gibt es noch nicht → wird mit der ID aus dem Snapshot angelegt
    }
    if (!existing) continue;

    idMap[col.id] = existing.id;
    col.id = existing.id;

    for (const field of col.fields) {
      const found = existing.fields.getByName(field.name);
      if (found) field.id = found.getId();
    }
  }

  for (const col of snapshot) {
    for (const field of col.fields) {
      if (field.type === 'relation' && idMap[field.collectionId]) {
        field.collectionId = idMap[field.collectionId];
      }
    }
  }

  return app.importCollections(snapshot, false);
}, (app) => {
  // Kein Rückweg. Das Schema wieder abzubauen hieße, Daten zu löschen.
  // Zurück geht es nur über eine Sicherung (siehe docs/deploy.md).
  return null;
});
