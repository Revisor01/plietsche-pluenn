// Tests für die Migration, die push_messages um den Versuchszähler ergänzt.
//
// Der Zähler trägt die Entscheidung, ob eine Nachricht erneut versucht wird.
// Fehlt das Feld auf der Instanz, liest der Cronjob dauerhaft 0, zählt nie
// hoch und läuft jede Minute gegen eine unerreichbare Adresse — ohne dass ein
// Hook-Test deswegen umfällt. Deshalb hier geprüft, wie bei den anderen
// Migrationen auch (siehe store-secret-migration.test.js).
//
// Zweiter Grund: Die Migration muss **additiv** sein. Eine App-Version im
// Store liest push_messages zwar nicht, aber die Regel gilt trotzdem — kein
// bestehendes Feld darf sich ändern, keine Zugriffsregel verschieben.

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
  '1782720000_push_send_attempts.js'
);

// Der Stand vor der Migration: die Felder aus 1700000000_init_schema.js.
const FELDER_VORHER = [
  'title',
  'body',
  'target_segment',
  'target_role',
  'scheduled_at',
  'sent_at',
  'deep_link',
  'sent_by',
];

function run(vorhandeneFelder = FELDER_VORHER) {
  let feldId = 0;
  const felder = vorhandeneFelder.map((name) => ({ id: `f${++feldId}`, name, type: 'text' }));

  const push_messages = {
    name: 'push_messages',
    id: 'col_push_messages',
    listRule: '@request.auth.role = "admin"',
    viewRule: '@request.auth.role = "admin"',
    createRule: '@request.auth.role = "admin"',
    updateRule: '@request.auth.role = "admin"',
    deleteRule: '@request.auth.role = "admin"',
    schema: {
      _felder: felder,
      getFieldByName(name) {
        return felder.find((f) => f.name === name) || null;
      },
      addField(f) {
        felder.push(Object.assign({ id: `f${++feldId}` }, f));
      },
      removeField(id) {
        const i = felder.findIndex((f) => f.id === id);
        if (i >= 0) felder.splice(i, 1);
      },
    },
  };

  const collections = { push_messages };
  const gespeichert = [];

  class Dao {
    findCollectionByNameOrId(name) {
      const col = collections[name];
      if (!col) throw new Error(`Keine Sammlung ${name}`);
      return col;
    }
    saveCollection(col) {
      gespeichert.push(col.name);
      collections[col.name] = col;
      return col;
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
    SchemaField: function SchemaField(def) {
      return Object.assign({}, def);
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
    gespeichert,
    felder: () => felder.map((f) => f.name),
    hoch: () => up({}),
    runter: () => down({}),
  };
}

describe('1782720000_push_send_attempts', () => {
  let m;
  beforeEach(() => {
    m = run();
  });

  it('legt das Feld send_attempts an', () => {
    expect(m.felder()).not.toContain('send_attempts');
    m.hoch();
    expect(m.felder()).toContain('send_attempts');
  });

  it('legt es als optionales Zahlenfeld ohne negative Werte an', () => {
    m.hoch();
    const f = m.collections.push_messages.schema.getFieldByName('send_attempts');
    expect(f.type).toBe('number');
    expect(f.required).toBe(false);
    expect(f.options).toEqual({ min: 0 });
  });

  it('laesst alle bisherigen Felder unberuehrt', () => {
    // Die Kernbedingung: additiv. Kein Feld verschwindet, keins wird umbenannt.
    m.hoch();
    for (const name of FELDER_VORHER) {
      expect(m.felder()).toContain(name);
    }
    expect(m.felder()).toHaveLength(FELDER_VORHER.length + 1);
  });

  it('laesst die Zugriffsregeln unveraendert', () => {
    m.hoch();
    const col = m.collections.push_messages;
    expect(col.listRule).toBe('@request.auth.role = "admin"');
    expect(col.viewRule).toBe('@request.auth.role = "admin"');
    expect(col.createRule).toBe('@request.auth.role = "admin"');
    expect(col.updateRule).toBe('@request.auth.role = "admin"');
    expect(col.deleteRule).toBe('@request.auth.role = "admin"');
  });

  it('legt das Feld nicht doppelt an, wenn es schon da ist', () => {
    // Eine Instanz, auf der die Migration bereits lief oder jemand das Feld
    // von Hand angelegt hat, darf nicht mit zwei gleichnamigen Feldern enden.
    const m2 = run([...FELDER_VORHER, 'send_attempts']);
    m2.hoch();
    expect(m2.felder().filter((n) => n === 'send_attempts')).toHaveLength(1);
    expect(m2.gespeichert).toHaveLength(0);
  });

  it('nimmt das Feld beim Zuruecknehmen wieder heraus', () => {
    m.hoch();
    m.runter();
    expect(m.felder()).not.toContain('send_attempts');
    expect(m.felder()).toEqual(FELDER_VORHER);
  });
});
