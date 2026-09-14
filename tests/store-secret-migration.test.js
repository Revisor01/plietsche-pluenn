// Tests für die Migration, die das Türgeheimnis aus der lesbaren
// store-Sammlung herausnimmt.
//
// Warum hier eine Migration getestet wird, obwohl es sonst um Hooks geht:
// Die Zugriffsregel IST die Sicherheitsmaßnahme. Steht sie falsch, ist das
// Geheimnis wieder im Netz, und kein Hook-Test fällt deswegen um. In
// PocketBase bedeutet der Leerstring bei listRule/viewRule „alle, auch ohne
// Anmeldung"; null bedeutet „nur Superuser". Der Unterschied ist eine
// Zeichenkette — genau der Fehler, der hier behoben wird.
//
// Die Migration wird dafür in einer kleinen nachgebauten Umgebung ausgeführt
// (Dao, Collection, SchemaField, Record, $security), wie der Harness es für
// die Hooks tut.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
const fs = require_('node:fs');
const path = require_('node:path');
const vm = require_('node:vm');

const MIGRATION = path.join(
  __dirname,
  '..',
  'pocketbase',
  'pb_migrations',
  '1782690000_store_secret_collection.js'
);

const ALTES_GEHEIMNIS = 'alter-code-aus-dem-netz';

// ── Nachgebaute Migrationsumgebung ─────────────────────────────

class FakeRecord {
  constructor(collectionName, data = {}) {
    this.collectionName = collectionName;
    this._data = Object.assign({}, data);
    this.id = this._data.id || `rec_${Math.random().toString(36).slice(2)}`;
    delete this._data.id;
  }
  get(field) {
    const v = this._data[field];
    return v === undefined ? '' : v;
  }
  set(field, value) {
    this._data[field] = value;
  }
}

function run(setup = {}) {
  // Sammlungen: name → { name, listRule, viewRule, … }
  const collections = Object.assign(
    {
      store: {
        name: 'store',
        id: 'col_store',
        // Der Stand vor der Migration: Leerstring = für alle lesbar.
        listRule: '',
        viewRule: '',
        createRule: '@request.auth.role = "admin"',
        updateRule: '@request.auth.role = "admin"',
        deleteRule: '@request.auth.role = "admin"',
      },
    },
    setup.collections || {}
  );

  const rows = Object.assign({ store: [], store_secrets: [] }, setup.rows || {});
  for (const [name, list] of Object.entries(rows)) {
    rows[name] = list.map((r) => new FakeRecord(name, r));
  }

  const randomCalls = [];

  class Dao {
    findCollectionByNameOrId(name) {
      const col = collections[name];
      if (!col) throw new Error(`Keine Sammlung ${name}`);
      return col;
    }
    saveCollection(col) {
      collections[col.name] = col;
      return col;
    }
    deleteCollection(col) {
      delete collections[col.name];
    }
    findFirstRecordByFilter(name, _filter) {
      const list = rows[name] || [];
      if (!list.length) throw new Error(`Kein Datensatz in ${name}`);
      return list[0];
    }
    saveRecord(rec) {
      if (!rows[rec.collectionName]) rows[rec.collectionName] = [];
      if (!rows[rec.collectionName].includes(rec)) rows[rec.collectionName].push(rec);
      return rec;
    }
  }

  let up = null;
  let down = null;

  const sandbox = {
    console,
    Object,
    Array,
    String,
    Error,
    JSON,
    Dao,
    Record: function Record(col) {
      return new FakeRecord(col.name, {});
    },
    Collection: function Collection(def) {
      return Object.assign({ id: `col_${def.name}` }, def);
    },
    SchemaField: function SchemaField(def) {
      return Object.assign({}, def);
    },
    $security: {
      randomString: (n) => {
        randomCalls.push(n);
        return 'n'.repeat(n);
      },
    },
    migrate: (u, d) => {
      up = u;
      down = d;
    },
  };
  sandbox.globalThis = sandbox;

  vm.runInContext(fs.readFileSync(MIGRATION, 'utf8'), vm.createContext(sandbox), {
    filename: MIGRATION,
  });

  return {
    collections,
    rows,
    randomCalls,
    up: () => up({}),
    down: () => down({}),
  };
}

// ── Tests ──────────────────────────────────────────────────────

describe('Migration: Türgeheimnis in eine gesperrte Sammlung', () => {
  let env;

  beforeEach(() => {
    env = run({
      rows: {
        store: [
          {
            name: 'Plietsche Plünn',
            checkin_qr_secret: ALTES_GEHEIMNIS,
            lat: 54.3025,
            lng: 9.226,
            pts_checkin: 10,
          },
        ],
      },
    });
    env.up();
  });

  it('sperrt die neue Sammlung für jeden Weg über die API', () => {
    // Verbotener Fall. null heißt „nur Superuser"; der Leerstring wäre
    // „alle, auch unangemeldet" — genau der behobene Fehler.
    const sec = env.collections.store_secrets;
    expect(sec).toBeTruthy();
    expect(sec.listRule).toBeNull();
    expect(sec.viewRule).toBeNull();
    expect(sec.createRule).toBeNull();
    expect(sec.updateRule).toBeNull();
    expect(sec.deleteRule).toBeNull();
  });

  it('räumt das Geheimnis aus dem lesbaren Laden-Datensatz', () => {
    expect(env.rows.store[0].get('checkin_qr_secret')).toBe('');
  });

  it('nimmt das bisherige Geheimnis in die gesperrte Sammlung mit', () => {
    // Der Aushang an der Ladentür soll durch die Migration allein nicht
    // ungültig werden — rotiert wird bewusst und getrennt davon.
    expect(env.rows.store_secrets).toHaveLength(1);
    expect(env.rows.store_secrets[0].get('checkin_qr_secret')).toBe(ALTES_GEHEIMNIS);
    expect(env.randomCalls).toEqual([]);
  });

  it('lässt den Laden nur noch von Angemeldeten lesen', () => {
    // Erlaubter Fall: Öffnungszeiten, Adresse und Punktwerte bleiben für
    // angemeldete Nutzer:innen erreichbar.
    expect(env.collections.store.listRule).toBe('@request.auth.id != ""');
    expect(env.collections.store.viewRule).toBe('@request.auth.id != ""');
  });

  it('lässt die Schreibregeln des Ladens unangetastet', () => {
    expect(env.collections.store.createRule).toBe('@request.auth.role = "admin"');
    expect(env.collections.store.updateRule).toBe('@request.auth.role = "admin"');
    expect(env.collections.store.deleteRule).toBe('@request.auth.role = "admin"');
  });
});

describe('Migration: Sonderfälle', () => {
  it('erzeugt ein neues Geheimnis, wenn der Laden keines hatte', () => {
    const env = run({ rows: { store: [{ name: 'Plietsche Plünn', checkin_qr_secret: '' }] } });
    env.up();

    expect(env.randomCalls).toEqual([32]);
    expect(env.rows.store_secrets[0].get('checkin_qr_secret')).toBe('n'.repeat(32));
  });

  it('läuft ein zweites Mal ohne das Geheimnis zu überschreiben', () => {
    // Migrationen können erneut laufen; ein zweiter Durchgang darf den
    // Türcode nicht austauschen.
    const env = run({
      rows: { store: [{ name: 'Plietsche Plünn', checkin_qr_secret: ALTES_GEHEIMNIS }] },
    });
    env.up();
    env.up();

    expect(env.rows.store_secrets).toHaveLength(1);
    expect(env.rows.store_secrets[0].get('checkin_qr_secret')).toBe(ALTES_GEHEIMNIS);
    expect(env.randomCalls).toEqual([]);
  });

  it('stellt beim Rückbau den alten Stand wieder her', () => {
    const env = run({
      rows: { store: [{ name: 'Plietsche Plünn', checkin_qr_secret: ALTES_GEHEIMNIS }] },
    });
    env.up();
    env.down();

    expect(env.collections.store_secrets).toBeUndefined();
    expect(env.rows.store[0].get('checkin_qr_secret')).toBe(ALTES_GEHEIMNIS);
    expect(env.collections.store.listRule).toBe('');
  });
});
