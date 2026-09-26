// Testumgebung für PocketBase-Hooks.
//
// PocketBase führt die Hooks in einer eigenen JavaScript-Umgebung aus (Goja,
// kein Node). Globale Funktionen wie routerAdd, cronAdd, $app, $apis, ApiError
// oder Record stellt die Laufzeit bereit — in einem Node-Test gibt es sie nicht.
//
// Dieser Harness baut sie nach: ein DAO im Speicher mit den Sammlungen, die die
// Hooks lesen, dazu die Globals. Die Hook-Datei wird über das vm-Modul in diese
// Umgebung geladen; die dabei registrierten Routen und Cronjobs landen in einer
// Liste und lassen sich einzeln aufrufen. Ohne laufende Instanz, ohne Docker.
//
// Maßstab ist PocketBase 0.22.21, wie es auf dem Server läuft. Ein gutmütiger
// Harness macht Tests grün, die in Produktion scheitern würden — deshalb
// verhält er sich an den Stellen, an denen die Hooks sich auf PocketBase
// verlassen, so streng wie das Original:
//
//   - Das Schema (Sammlungen, Felder, Feldtypen, UNIQUE-Indizes) kommt aus
//     pocketbase/pb_migrations/, nicht aus einer Liste im Test. Unbekannte
//     Sammlungen und Felder fallen auf.
//   - Filter werden geparst wie in PocketBase: leerer Filter, unbekanntes Feld
//     oder ein unquotierter Wert rechts sind Fehler.
//   - Datumsfelder werden in PocketBase-Form gespeichert
//     ("2026-09-26 10:00:00.000Z") und im Filter als TEXT verglichen, wie
//     SQLite es tut.
//   - Lesen liefert eine frische Kopie des gespeicherten Stands. Was ein Hook
//     an einem Datensatz ändert, ist erst nach saveRecord für andere sichtbar.
//   - saveRecord kann scheitern: UNIQUE-Verletzung oder ein im Test
//     gestellter Fehler (failSaveOn).

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const HOOKS_DIR = path.join(__dirname, '..', 'pocketbase', 'pb_hooks');
const MIGRATIONS_DIR = path.join(__dirname, '..', 'pocketbase', 'pb_migrations');

// PocketBase meldet „nichts gefunden" mit dem Fehler des SQL-Treibers.
const NO_ROWS = 'sql: no rows in result set';
const BAD_FILTER = 'invalid or empty filter expression';

// ── Schema aus den Migrationen ─────────────────────────────────
//
// Die Migrationen werden in einer nachgebauten Migrationsumgebung ausgeführt
// (wie in read-rules-migration.test.js), nicht geparst: Sie bauen Felder über
// Hilfsfunktionen, Schleifen und nachträgliche addField-Aufrufe zusammen — ein
// Parser müsste all das nachvollziehen und läge beim nächsten Umbau falsch.
// Ausgeführt ergibt sich der Endstand von selbst.
//
// Nachgebaut ist nur, was die Migrationen aufrufen: Dao (Sammlungen finden,
// speichern, löschen), Collection, SchemaField, Record und $security. Die
// Datensatz-Aufrufe der Seed-Migrationen laufen ins Leere — hier interessiert
// nur die Form der Sammlungen, nicht ihr Inhalt.

// Sammlungs-IDs, auf die sich eine Migration wörtlich bezieht. Die
// Verwaltungsoberfläche schreibt ihre Migrationen mit der ID statt dem Namen
// (1782637408_updated_store.js: "8hdpqi33x65ptii" ist `store` in Produktion).
const KNOWN_COLLECTION_IDS = { store: '8hdpqi33x65ptii', users: '_pb_users_auth_' };

// Systemfelder, die PocketBase 0.22 jeder Sammlung mitgibt. Sie stehen in
// keiner Migration, die Hooks und die Filter dürfen sie aber benutzen.
const BASE_SYSTEM_FIELDS = { id: 'text', created: 'date', updated: 'date' };
const AUTH_SYSTEM_FIELDS = {
  username: 'text',
  email: 'email',
  emailVisibility: 'bool',
  verified: 'bool',
  tokenKey: 'text',
  passwordHash: 'text',
  lastResetSentAt: 'date',
  lastVerificationSentAt: 'date',
  lastLoginAlertSentAt: 'date',
};
// Die Indizes, die PocketBase für Auth-Sammlungen selbst anlegt. Leerwerte
// zählen nicht: E-Mail ist `WHERE email != ''`, Benutzername und tokenKey
// füllt PocketBase beim Anlegen selbst aus — im Harness bleiben sie leer.
const AUTH_UNIQUE = [['username'], ['email'], ['tokenKey']];

function parseUniqueIndex(sql) {
  const m = `${sql}`.match(
    /^\s*CREATE\s+UNIQUE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?\w+[`"']?\s+ON\s+[`"']?(\w+)[`"']?\s*\(([^)]*)\)/i
  );
  if (!m) return null;
  return m[2]
    .split(',')
    .map((c) => c.trim().replace(/[`"']/g, '').split(/\s+/)[0])
    .filter(Boolean);
}

let schemaCache = null;

function loadSchema() {
  if (schemaCache) return schemaCache;

  let idCount = 0;
  const genId = () => `mig${String(++idCount).padStart(12, '0')}`;

  class StubSchema {
    constructor(fields) {
      this._fields = [];
      (fields || []).forEach((f) => this.addField(f));
    }
    getFieldByName(name) {
      return this._fields.find((f) => f.name === name) || null;
    }
    getFieldById(id) {
      return this._fields.find((f) => f.id === id) || null;
    }
    // PocketBase ersetzt ein Feld mit derselben ID. Zusätzlich wird hier ein
    // gleichnamiges Feld ersetzt: 1782637408_updated_store.js legt tiers_json
    // mit der Produktions-ID erneut an, die hier eine andere ist — in
    // Produktion ist es dasselbe Feld.
    addField(field) {
      if (!field.id) field.id = genId();
      const i = this._fields.findIndex((f) => f.id === field.id || f.name === field.name);
      if (i >= 0) this._fields[i] = field;
      else this._fields.push(field);
    }
    removeField(id) {
      this._fields = this._fields.filter((f) => f.id !== id);
    }
    fields() {
      return this._fields.slice();
    }
  }

  class SchemaField {
    constructor(def) {
      Object.assign(this, def || {});
      if (!this.options) this.options = {};
    }
  }

  class Collection {
    constructor(data) {
      Object.assign(this, data || {});
      this.id = this.id || KNOWN_COLLECTION_IDS[this.name] || genId();
      this.type = this.type || 'base';
      this.schema = new StubSchema((data && data.schema) || []);
      this.indexes = (data && data.indexes) || [];
    }
  }

  // PocketBase bringt die Auth-Sammlung `users` mit `name` und `avatar` mit;
  // 1700000000_init_schema.js ergänzt nur, was fehlt.
  const collections = [
    new Collection({
      name: 'users',
      type: 'auth',
      schema: [
        new SchemaField({ name: 'name', type: 'text' }),
        new SchemaField({ name: 'avatar', type: 'file', options: { maxSelect: 1 } }),
      ],
    }),
  ];

  const find = (nameOrId) => {
    const c = collections.find((x) => x.name === nameOrId || x.id === nameOrId);
    if (!c) throw new Error(NO_ROWS);
    return c;
  };

  class Dao {
    findCollectionByNameOrId(nameOrId) {
      return find(nameOrId);
    }
    saveCollection(col) {
      const i = collections.findIndex((x) => x.id === col.id);
      if (i >= 0) collections[i] = col;
      else collections.push(col);
      return col;
    }
    deleteCollection(col) {
      const i = collections.findIndex((x) => x.id === col.id);
      if (i >= 0) collections.splice(i, 1);
    }
    // Datensätze: gibt es in dieser Umgebung nicht.
    findFirstRecordByFilter() {
      throw new Error(NO_ROWS);
    }
    findRecordsByFilter() {
      return [];
    }
    findRecordsByExpr() {
      return [];
    }
    saveRecord() {}
    deleteRecord() {}
  }

  class Record {
    set() {}
    get() {
      return null;
    }
  }

  const sandbox = {
    console,
    Object,
    Array,
    String,
    Number,
    Error,
    JSON,
    Dao,
    Collection,
    SchemaField,
    Record,
    $security: { randomString: (n) => 'x'.repeat(n || 8) },
    migrate: null,
  };
  sandbox.globalThis = sandbox;
  const context = vm.createContext(sandbox);

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.js'))
    .sort();
  for (const f of files) {
    const file = path.join(MIGRATIONS_DIR, f);
    let up = null;
    sandbox.migrate = (u) => {
      up = u;
    };
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
    if (typeof up !== 'function') throw new Error(`Harness: Migration ${f} registriert kein up()`);
    up({});
  }

  const schema = {};
  for (const col of collections) {
    const isAuth = col.type === 'auth';
    const fields = {};
    for (const [name, type] of Object.entries(BASE_SYSTEM_FIELDS)) fields[name] = { name, type, system: true };
    if (isAuth) {
      for (const [name, type] of Object.entries(AUTH_SYSTEM_FIELDS)) fields[name] = { name, type, system: true };
    }
    for (const f of col.schema.fields()) {
      fields[f.name] = { name: f.name, type: f.type, options: f.options || {} };
    }
    const unique = [];
    for (const sql of col.indexes || []) {
      const cols = parseUniqueIndex(sql);
      if (cols) unique.push({ columns: cols, skipEmpty: false });
    }
    if (isAuth) for (const cols of AUTH_UNIQUE) unique.push({ columns: cols, skipEmpty: true });
    schema[col.name] = { id: col.id, name: col.name, type: col.type, fields, unique };
  }

  schemaCache = schema;
  return schema;
}

function collectionSchema(nameOrId) {
  const schema = loadSchema();
  const hit =
    schema[nameOrId] || Object.values(schema).find((c) => c.id === nameOrId);
  return hit || null;
}

function requireCollection(name) {
  const c = collectionSchema(name);
  if (!c) {
    throw new Error(
      `${NO_ROWS} (Harness: Sammlung "${name}" gibt es laut pb_migrations/ nicht)`
    );
  }
  return c;
}

// ── Werte wie PocketBase sie speichert ─────────────────────────
//
// PocketBase bringt jeden Wert beim Setzen in die Form seines Feldtyps
// (SchemaField.PrepareValue). Der Harness macht dasselbe; sonst vergleicht ein
// Test Äpfel (was der Hook übergeben hat) mit Birnen (was in der Datenbank
// stünde).

// Wie SQLite eine Zeichenkette als Zahl erkennt.
const NUMERIC_TEXT = /^\s*[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?\s*$/;

// Datumsformen, die PocketBase beim Setzen annimmt: "JJJJ-MM-TT" mit
// optionaler Uhrzeit, getrennt durch "T" oder Leerzeichen, mit optionaler
// Zeitzone. Ohne Zeitzone liest PocketBase UTC.
const DATE_INPUT =
  /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?))?\s*(Z|[+-]\d{2}:?\d{2})?$/;

function isDate(value) {
  return Object.prototype.toString.call(value) === '[object Date]';
}

// "2026-09-26T10:00:00.000Z" → "2026-09-26 10:00:00.000Z", wie PocketBase
// Datumsfelder schreibt und wie `get()` sie zurückgibt.
function toPbDate(value, where) {
  if (value === null || value === undefined) return '';
  let ms;
  if (isDate(value)) {
    ms = value.getTime();
  } else if (typeof value === 'string') {
    const s = value.trim();
    if (s === '') return '';
    const m = s.match(DATE_INPUT);
    if (m) {
      let time = m[2] || '00:00:00';
      if (/^\d{2}:\d{2}$/.test(time)) time += ':00';
      let tz = m[3] || 'Z';
      if (/^[+-]\d{4}$/.test(tz)) tz = `${tz.slice(0, 3)}:${tz.slice(3)}`;
      ms = Date.parse(`${m[1]}T${time}${tz}`);
    } else {
      ms = NaN;
    }
  } else {
    ms = NaN;
  }
  // Bewusste Abweichung: PocketBase macht aus einem unlesbaren Datum still
  // den Leerwert. Im Test soll so ein Wert auffallen, statt zu verschwinden.
  if (Number.isNaN(ms)) {
    throw new Error(`Harness: ${where} ist kein Datum, das PocketBase lesen kann: ${JSON.stringify(value)}`);
  }
  return new Date(ms).toISOString().replace('T', ' ');
}

function toPbNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string' && NUMERIC_TEXT.test(value) && value.trim() === value) return Number(value);
  return 0;
}

function toPbBool(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return ['1', 't', 'T', 'TRUE', 'true', 'True'].includes(value);
  return false;
}

function toPbText(value, where) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  // Bewusste Abweichung: PocketBase speichert für ein Objekt (etwa einen
  // ganzen Datensatz statt seiner ID) still den Leerstring.
  throw new Error(`Harness: ${where} erwartet Text, bekam ${Object.prototype.toString.call(value)}`);
}

// Die Speicherform je Feldtyp.
function kindOf(type) {
  switch (type) {
    case 'number':
      return 'number';
    case 'bool':
      return 'bool';
    case 'date':
      return 'date';
    case 'json':
      return 'json';
    default:
      // text, email, url, editor, select, relation, file — in diesem Schema
      // alle mit maxSelect 1, also ein einzelner Text.
      return 'text';
  }
}

function prepareValue(def, value, where) {
  switch (kindOf(def.type)) {
    case 'number':
      return toPbNumber(value);
    case 'bool':
      return toPbBool(value);
    case 'date':
      return toPbDate(value, where);
    case 'json':
      // Nicht nachgebildet: PocketBase reicht JSON als Rohwert durch. Der
      // Harness speichert, was übergeben wurde.
      return value;
    default:
      return toPbText(value, where);
  }
}

// Der Nullwert des Feldtyps: Das liefert PocketBase für ein nicht gesetztes
// Feld. Die Hooks prüfen teils mit `== null` auf „nicht gesetzt" — das greift
// bei 0, false und '' nicht, und der Harness muss diesen Unterschied abbilden.
function zeroValue(def) {
  switch (kindOf(def.type)) {
    case 'number':
      return 0;
    case 'bool':
      return false;
    default:
      // json: bisheriges Verhalten des Harness, nicht an PocketBase gemessen.
      return '';
  }
}

function clone(v) {
  return v !== null && typeof v === 'object' ? structuredClone(v) : v;
}

// ── Datensatz ──────────────────────────────────────────────────
// Bildet die Record-Schnittstelle nach, die die Hooks tatsächlich benutzen:
// get(feld), set(feld, wert), id und isNew().
let idCounter = 0;
function nextId(prefix) {
  idCounter += 1;
  return `${prefix}${String(idCounter).padStart(12, '0')}`;
}

class FakeRecord {
  constructor(collection, data = {}, opts = {}) {
    const schema = requireCollection(collection);
    this.collectionName = schema.name;
    this._schema = schema;
    this._data = {};
    this._new = opts.isNew !== false;
    const d = Object.assign({}, data);
    delete d.__name;
    this.id = d.id !== undefined && d.id !== null && d.id !== '' ? `${d.id}` : nextId('rec');
    delete d.id;
    for (const [k, v] of Object.entries(d)) this.set(k, v);
  }

  // Aus dem gespeicherten Stand laden — die Werte sind schon in PB-Form.
  static _load(collection, row) {
    const rec = new FakeRecord(collection, {}, { isNew: false });
    rec.id = row.id;
    for (const [k, v] of Object.entries(row)) if (k !== 'id') rec._data[k] = clone(v);
    return rec;
  }

  isNew() {
    return this._new;
  }

  get(field) {
    if (field === 'id') return this.id;
    const def = this._schema.fields[field];
    // PocketBase liefert für ein Feld, das es nicht gibt, null.
    if (!def) return null;
    const v = this._data[field];
    if (v !== undefined) return v;
    return zeroValue(def);
  }

  // Bewusste Abweichung bei unbekannten Feldern: PocketBase hält den Wert
  // im Speicher und verwirft ihn beim Speichern still — nach dem Neuladen ist
  // er weg. Ein Tippfehler im Hook (`set('taken_ta', …)`) ginge so in
  // Produktion unbemerkt verloren, und im Test ebenso. Der Harness wirft
  // deshalb sofort, mit Sammlung und Feldname in der Meldung.
  set(field, value) {
    if (field === 'id') {
      this.id = `${value}`;
      return;
    }
    const def = this._schema.fields[field];
    if (!def) {
      throw new Error(
        `Harness: Feld "${field}" gibt es in der Sammlung "${this.collectionName}" nicht ` +
          '(Schema aus pb_migrations/). PocketBase würde den Wert beim Speichern still verwerfen.'
      );
    }
    this._data[field] = prepareValue(def, value, `${this.collectionName}.${field}`);
  }

  // Momentaufnahme für Assertions: alle Felder des Schemas, wie nach dem
  // Neuladen aus der Datenbank.
  data() {
    const out = { id: this.id };
    for (const [name, def] of Object.entries(this._schema.fields)) {
      if (name === 'id') continue;
      out[name] = clone(this.get(name));
    }
    return out;
  }
}

// ── Filter ─────────────────────────────────────────────────────
//
// Nachgebaut wie PocketBase 0.22 (search.FilterData → fexpr): Ein Ausdruck aus
// Vergleichen `links OP rechts`, verknüpft mit && und ||, Klammern erlaubt.
// Jeder Operand ist
//   - eine Zahl, true/false, null,
//   - ein Text in "…" oder '…',
//   - ein Platzhalter {:name} (Wert aus params),
//   - oder ein Feldname der Sammlung.
// Alles andere ist ein Fehler — auch ein unquotierter Wert rechts
// (`status = pending`): PocketBase liest ihn als Feldnamen, findet keinen und
// lehnt den Filter ab. Ebenso ein leerer Filter und ein unbekanntes Feld.
//
// Verglichen wird wie in SQLite: Zahlen- und Wahrheitsfelder mit numerischer
// Affinität, alle anderen (auch Datumsfelder!) als TEXT. Ein Datum in T-Form
// als Grenze liefert deshalb gegen gespeichertes "2026-09-26 10:00:00.000Z"
// dasselbe falsche Ergebnis wie in Produktion ('T' > ' ').
//
// Relationspfade (a.b), @request/@collection und die Operatoren ~, !~ und ?…
// kommen in den Hooks nicht vor; der Harness lehnt sie ab, statt still falsch
// zu antworten.

function harnessUnsupported(detail) {
  return new Error(`Harness: Filter nicht unterstützt: ${detail}`);
}

function badFilter(detail) {
  return new Error(`${BAD_FILTER} (${detail})`);
}

function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (ch === '(' || ch === ')') {
      tokens.push({ t: ch });
      i += 1;
      continue;
    }
    if (src.startsWith('&&', i) || src.startsWith('||', i)) {
      tokens.push({ t: 'join', v: src.slice(i, i + 2) });
      i += 2;
      continue;
    }
    const op = src.slice(i).match(/^(\?!=|\?>=|\?<=|\?!~|\?=|\?>|\?<|\?~|!=|>=|<=|!~|=|>|<|~)/);
    if (op) {
      tokens.push({ t: 'op', v: op[1] });
      i += op[1].length;
      continue;
    }
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      let out = '';
      while (j < src.length && src[j] !== ch) {
        if (src[j] === '\\' && j + 1 < src.length) {
          out += src[j + 1];
          j += 2;
        } else {
          out += src[j];
          j += 1;
        }
      }
      if (j >= src.length) throw badFilter(`Text ohne schließendes ${ch}`);
      tokens.push({ t: 'text', v: out });
      i = j + 1;
      continue;
    }
    const ph = src.slice(i).match(/^\{:(\w+)\}/);
    if (ph) {
      tokens.push({ t: 'param', v: ph[1] });
      i += ph[0].length;
      continue;
    }
    const num = src.slice(i).match(/^-?\d+(\.\d+)?(?![\w.])/);
    if (num) {
      tokens.push({ t: 'num', v: Number(num[0]) });
      i += num[0].length;
      continue;
    }
    const id = src.slice(i).match(/^[@#]?[\w.:]+/);
    if (id) {
      tokens.push({ t: 'ident', v: id[0] });
      i += id[0].length;
      continue;
    }
    throw badFilter(`unerwartetes Zeichen ${JSON.stringify(ch)}`);
  }
  return tokens;
}

// Operand auflösen. Ergebnis: eine Funktion record → { value, affinity }.
// affinity ist 'NUMERIC', 'TEXT' oder null (Literal ohne Affinität).
function resolveOperand(tok, schema, params) {
  switch (tok.t) {
    case 'num':
      return () => ({ value: tok.v, affinity: null });
    case 'text':
      return () => ({ value: tok.v, affinity: null });
    case 'param': {
      if (!params || !Object.prototype.hasOwnProperty.call(params, tok.v)) {
        throw badFilter(`Platzhalter {:${tok.v}} ohne Wert`);
      }
      const p = params[tok.v];
      let value;
      if (p === null || p === undefined) value = null;
      else if (typeof p === 'boolean') value = p ? 1 : 0;
      else if (typeof p === 'number') value = p;
      else value = `${p}`;
      return () => ({ value, affinity: null });
    }
    case 'ident': {
      const name = tok.v;
      const lower = name.toLowerCase();
      if (lower === 'null') return () => ({ value: null, affinity: null });
      if (lower === 'true') return () => ({ value: 1, affinity: null });
      if (lower === 'false') return () => ({ value: 0, affinity: null });
      if (/[@#.:]/.test(name)) throw harnessUnsupported(`Bezeichner ${name}`);
      const def = schema.fields[name];
      if (!def) {
        throw badFilter(`failed to resolve field "${name}" in ${schema.name}`);
      }
      const kind = kindOf(def.type);
      if (kind === 'number' || kind === 'bool') {
        return (rec) => {
          const v = rec.get(name);
          return { value: kind === 'bool' ? (v ? 1 : 0) : toPbNumber(v), affinity: 'NUMERIC' };
        };
      }
      return (rec) => {
        const v = rec.get(name);
        let value;
        if (v === null || v === undefined) value = '';
        else if (typeof v === 'object') value = JSON.stringify(v);
        else value = `${v}`;
        return { value, affinity: 'TEXT' };
      };
    }
    default:
      throw badFilter(`Operand erwartet, gefunden ${tok.t}${tok.v !== undefined ? ` ${tok.v}` : ''}`);
  }
}

// SQLite: Hat eine Seite numerische Affinität und die andere nicht, bekommt
// die andere numerische Affinität (Text, der wie eine Zahl aussieht, wird zur
// Zahl). Hat eine Seite TEXT-Affinität und die andere keine, wird die andere
// zu Text.
function applyAffinity(l, r) {
  const toNum = (x) => (typeof x.value === 'string' && NUMERIC_TEXT.test(x.value) ? Number(x.value) : x.value);
  const toText = (x) => (typeof x.value === 'number' ? String(x.value) : x.value);
  if (l.affinity === 'NUMERIC' && r.affinity !== 'NUMERIC') r = { value: toNum(r), affinity: r.affinity };
  else if (r.affinity === 'NUMERIC' && l.affinity !== 'NUMERIC') l = { value: toNum(l), affinity: l.affinity };
  else if (l.affinity === 'TEXT' && r.affinity === null) r = { value: toText(r), affinity: r.affinity };
  else if (r.affinity === 'TEXT' && l.affinity === null) l = { value: toText(l), affinity: l.affinity };
  return [l.value, r.value];
}

// Vergleich nach SQLite-Regeln: Zahlen untereinander numerisch, Texte
// bytweise, jede Zahl ist kleiner als jeder Text. null bei NULL.
function sqlCompare(a, b) {
  if (a === null || a === undefined || b === null || b === undefined) return null;
  const an = typeof a === 'number';
  const bn = typeof b === 'number';
  if (an && bn) return a < b ? -1 : a > b ? 1 : 0;
  if (an) return -1;
  if (bn) return 1;
  const as = `${a}`;
  const bs = `${b}`;
  return as < bs ? -1 : as > bs ? 1 : 0;
}

function compileComparison(leftTok, opTok, rightTok, schema, params) {
  const op = opTok.v;
  if (!['=', '!=', '>', '>=', '<', '<='].includes(op)) throw harnessUnsupported(`Operator ${op}`);
  const left = resolveOperand(leftTok, schema, params);
  const right = resolveOperand(rightTok, schema, params);
  return (rec) => {
    let l = left(rec);
    let r = right(rec);
    // PocketBase vergleicht = und != über COALESCE(x, ''): null zählt dort
    // wie der Leerstring.
    if (op === '=' || op === '!=') {
      if (l.value === null) l = { value: '', affinity: l.affinity };
      if (r.value === null) r = { value: '', affinity: r.affinity };
    }
    const [a, b] = applyAffinity(l, r);
    const c = sqlCompare(a, b);
    if (c === null) return false;
    switch (op) {
      case '=':
        return c === 0;
      case '!=':
        return c !== 0;
      case '>':
        return c > 0;
      case '>=':
        return c >= 0;
      case '<':
        return c < 0;
      default:
        return c <= 0;
    }
  };
}

function compileFilter(collection, filter, params) {
  const schema = requireCollection(collection);
  const src = `${filter === null || filter === undefined ? '' : filter}`;
  if (src.trim() === '') throw new Error(BAD_FILTER);
  const tokens = tokenize(src);
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function parseOr() {
    let node = parseAnd();
    while (peek() && peek().t === 'join' && peek().v === '||') {
      next();
      const rhs = parseAnd();
      const lhs = node;
      node = (rec) => lhs(rec) || rhs(rec);
    }
    return node;
  }
  function parseAnd() {
    let node = parsePrimary();
    while (peek() && peek().t === 'join' && peek().v === '&&') {
      next();
      const rhs = parsePrimary();
      const lhs = node;
      node = (rec) => lhs(rec) && rhs(rec);
    }
    return node;
  }
  function parsePrimary() {
    const tok = peek();
    if (!tok) throw badFilter('Ausdruck endet zu früh');
    if (tok.t === '(') {
      next();
      const inner = parseOr();
      if (!peek() || peek().t !== ')') throw badFilter('fehlende schließende Klammer');
      next();
      return inner;
    }
    const leftTok = next();
    const opTok = next();
    if (!opTok || opTok.t !== 'op') throw badFilter(`Operator nach ${leftTok.v} erwartet`);
    const rightTok = next();
    if (!rightTok) throw badFilter(`rechte Seite nach ${opTok.v} fehlt`);
    return compileComparison(leftTok, opTok, rightTok, schema, params);
  }

  const pred = parseOr();
  if (pos !== tokens.length) throw badFilter(`unerwartet: ${JSON.stringify(tokens[pos].v || tokens[pos].t)}`);
  return pred;
}

function matchesFilter(record, filter, params) {
  return compileFilter(record.collectionName, filter, params)(record);
}

// Sortierung nachbilden.
//
// Absteigend wird absteigend sortiert — nicht aufsteigend sortiert und dann
// umgedreht. Der Unterschied zeigt sich bei Gleichstand: `.reverse()` dreht
// gleiche Werte gegeneinander um, und der Harness lieferte dann eine andere
// Reihenfolge als PocketBase. Konkret betrifft das findActiveCampaign
// (sortiert nach "-multiplier"): Bei zwei Aktionen mit demselben Faktor nimmt
// PocketBase die erste, der Harness nahm die letzte — die Tests hätten eine
// andere Aktion geprüft als die, die im Laden gilt.
//
// Array.prototype.sort ist seit ES2019 stabil, gleiche Werte behalten also
// ihre Eingabereihenfolge. Genau das braucht es hier. Mehrere Felder
// ("-a,b") werden der Reihe nach verglichen; ein unbekanntes Feld ist, wie in
// PocketBase, ein Fehler.
function applySort(rows, sort, schema) {
  const s = `${sort || ''}`.trim();
  if (!s) return rows;
  const keys = s.split(',').map((part) => {
    const p = part.trim();
    const desc = p.startsWith('-');
    const field = desc || p.startsWith('+') ? p.slice(1) : p;
    if (!schema.fields[field]) throw new Error(`invalid sort field "${field}" in ${schema.name}`);
    return { field, desc };
  });
  return rows.slice().sort((a, b) => {
    for (const { field, desc } of keys) {
      const norm = (v) => (typeof v === 'boolean' ? (v ? 1 : 0) : v);
      const c = sqlCompare(norm(a.get(field)), norm(b.get(field))) || 0;
      if (c !== 0) return desc ? -c : c;
    }
    return 0;
  });
}

// ── DAO ────────────────────────────────────────────────────────
//
// Gespeichert werden Zeilen (einfache Objekte in PB-Form), nicht die
// Datensatz-Objekte selbst. Jedes Lesen liefert eine frische Kopie — wie
// PocketBase, das jedes Mal aus der Datenbank lädt. Was ein Hook an einem
// geladenen Datensatz ändert, ohne ihn zu speichern, sieht niemand sonst; und
// wer einen veralteten Datensatz speichert, überschreibt die ganze Zeile.
class FakeDao {
  constructor() {
    this.tables = {};   // { sammlung: [ zeile, … ] }
    this.saved = [];    // Reihenfolge der Schreibvorgänge, für Assertions
    this.deleted = [];
    this._saveFailures = [];
  }

  _table(collection) {
    const schema = requireCollection(collection);
    if (!this.tables[schema.name]) this.tables[schema.name] = [];
    return this.tables[schema.name];
  }

  _load(collection, row) {
    return FakeRecord._load(collection, row);
  }

  _all(collection) {
    return this._table(collection).map((row) => this._load(collection, row));
  }

  // Zeile aus einem Datensatz: alle Felder des Schemas.
  _rowOf(record) {
    return Object.assign({}, record.data());
  }

  _checkUnique(schema, row, table) {
    for (const idx of schema.unique) {
      const values = idx.columns.map((c) => (c === 'id' ? row.id : row[c]));
      if (idx.skipEmpty && values.some((v) => v === '' || v === null || v === undefined)) continue;
      const clash = table.find(
        (other) =>
          other.id !== row.id &&
          idx.columns.every((c, i) => sqlCompare(c === 'id' ? other.id : other[c], values[i]) === 0)
      );
      if (clash) {
        throw new Error(
          `UNIQUE constraint failed: ${idx.columns.map((c) => `${schema.name}.${c}`).join(', ')}`
        );
      }
    }
  }

  // Zeile einfügen, ohne die Fehlerquellen von saveRecord — für die
  // Ausgangsdaten eines Tests. UNIQUE wird trotzdem geprüft: Eine Fixture,
  // die PocketBase so gar nicht speichern könnte, prüft einen Zustand, den
  // es in Produktion nicht gibt.
  _seed(record) {
    const schema = record._schema;
    const table = this._table(schema.name);
    const row = this._rowOf(record);
    const now = toPbDate(new Date(), 'jetzt');
    if (!row.created) row.created = now;
    if (!row.updated) row.updated = now;
    if (table.some((r) => r.id === row.id)) {
      throw new Error(`Harness: Fixture verletzt UNIQUE constraint failed: ${schema.name}.id (${row.id})`);
    }
    try {
      this._checkUnique(schema, row, table);
    } catch (e) {
      throw new Error(`Harness: Fixture verletzt ${e.message} (Datensatz ${row.id})`);
    }
    table.push(row);
  }

  findCollectionByNameOrId(nameOrId) {
    const schema = collectionSchema(nameOrId);
    if (!schema) throw new Error(NO_ROWS);
    return { id: schema.id, name: schema.name, type: schema.type };
  }

  findRecordById(collection, id) {
    const row = this._table(collection).find((r) => r.id === `${id}`);
    // PocketBase wirft, wenn nichts gefunden wird — die Hooks verlassen sich
    // darauf und fangen den Fehler ab.
    if (!row) throw new Error(NO_ROWS);
    return this._load(collection, row);
  }

  // Der Filter wird VOR dem Lesen geprüft, wie in PocketBase: Ein kaputter
  // Filter scheitert auch auf einer leeren Sammlung.
  findFirstRecordByFilter(collection, filter, params) {
    const pred = compileFilter(collection, filter, params);
    const hit = this._all(collection).find(pred);
    if (!hit) throw new Error(NO_ROWS);
    return hit;
  }

  findFirstRecordByData(collection, field, value) {
    const schema = requireCollection(collection);
    if (!schema.fields[field]) {
      throw new Error(`no such column: ${field} (Harness: Sammlung ${schema.name})`);
    }
    const hit = this._all(collection).find((r) => `${r.get(field)}` === `${value}`);
    if (!hit) throw new Error(NO_ROWS);
    return hit;
  }

  // PocketBase nimmt fünf Parameter (plus optionale Platzhalterwerte), der
  // Harness nahm bisher vier: `offset` fiel still unter den Tisch. Alle
  // Aufrufe in den Hooks übergeben ihn (heute durchgehend mit 0), und ein
  // Test, der sich auf Blätterung verlässt, hätte etwas anderes geprüft als
  // die Produktion — grün, während die falsche Seite gelesen wird.
  //
  // Reihenfolge wie in PocketBase: erst filtern, dann sortieren, dann `offset`
  // überspringen, dann auf `limit` kürzen.
  findRecordsByFilter(collection, filter, sort, limit, offset, params) {
    const schema = requireCollection(collection);
    const pred = compileFilter(collection, filter, params);
    const rows = applySort(this._all(collection).filter(pred), sort, schema);
    const skip = Number(offset || 0);
    if (!Number.isInteger(skip) || skip < 0) {
      // Bewusst scheitern statt still die erste Seite liefern.
      throw new Error(`Harness: offset muss eine nicht-negative ganze Zahl sein, war: ${offset}`);
    }
    const page = skip > 0 ? rows.slice(skip) : rows;
    return limit && limit > 0 ? page.slice(0, limit) : page;
  }

  // Fehlerquelle für Tests: Jeder saveRecord auf `collection`, für den
  // `predicate(record)` wahr ist (ohne Prädikat: jeder), scheitert mit
  // `message`. Damit lässt sich prüfen, was ein Hook hinterlässt, wenn ein
  // Schreibvorgang mitten in einer Folge scheitert. Rückgabe: Funktion, die
  // die Fehlerquelle wieder entfernt.
  failSaveOn(collection, predicate, message) {
    requireCollection(collection);
    const entry = {
      collection,
      predicate: predicate || (() => true),
      message: message || `Harness: gestellter Fehler beim Speichern in ${collection}`,
    };
    this._saveFailures.push(entry);
    return () => {
      this._saveFailures = this._saveFailures.filter((e) => e !== entry);
    };
  }

  saveRecord(record) {
    const schema = record._schema;
    for (const f of this._saveFailures) {
      if (f.collection === schema.name && f.predicate(record)) throw new Error(f.message);
    }
    const table = this._table(schema.name);
    const row = this._rowOf(record);
    const i = table.findIndex((r) => r.id === row.id);
    const now = toPbDate(new Date(), 'jetzt');

    if (record.isNew()) {
      // Ein neuer Datensatz mit vergebener ID ist ein INSERT — SQLite lehnt
      // die doppelte ID ab.
      if (i >= 0) throw new Error(`UNIQUE constraint failed: ${schema.name}.id`);
      if (!row.created) row.created = now;
      if (!row.updated) row.updated = now;
    } else {
      // Bewusste Abweichung: PocketBase schickt ein UPDATE ins Leere, wenn es
      // die Zeile nicht (mehr) gibt, und meldet keinen Fehler. Im Test ist das
      // fast immer eine unvollständige Fixture — deshalb laut.
      if (i < 0) {
        throw new Error(`Harness: ${schema.name}/${row.id} gibt es nicht, das UPDATE ginge ins Leere`);
      }
      row.updated = now;
    }

    this._checkUnique(schema, row, table);

    if (i >= 0) table[i] = row;
    else table.push(row);
    record._data.created = row.created;
    record._data.updated = row.updated;
    record._new = false;
    this.saved.push(record);
    return record;
  }

  deleteRecord(record) {
    const table = this._table(record.collectionName);
    const i = table.findIndex((r) => r.id === record.id);
    if (i >= 0) table.splice(i, 1);
    this.deleted.push(record);
  }
}

// ── Umgebung aufbauen und Hook laden ───────────────────────────
//
// store: { sammlung: [ {feld: wert}, … ] } — die Datensätze, die es geben soll.
//   Nur Sammlungen und Felder aus dem Schema; `__name` legt einen Zugriff
//   über h.records.<name> an.
// opts.realPush: lib/push.js echt laden statt ersetzen (siehe require unten).
// Rückgabe: { routes, crons, dao, records, call, runCron, failSaveOn, … }
function loadHook(hookFile, store = {}, opts = {}) {
  const realPush = !!opts.realPush;
  const dao = new FakeDao();
  const named = {};
  for (const [collection, rows] of Object.entries(store)) {
    requireCollection(collection);
    dao._table(collection);
    for (const row of rows) {
      const rec = new FakeRecord(collection, row);
      dao._seed(rec);
      if (row.__name) named[row.__name] = { collection, id: rec.id };
    }
  }

  // h.records.<name>: bei jedem Zugriff frisch aus dem gespeicherten Stand
  // geladen, wie ein Neuladen in der App. Gelöschte Datensätze sind undefined.
  const records = new Proxy(
    {},
    {
      get(_, key) {
        if (typeof key !== 'string' || !named[key]) return undefined;
        const { collection, id } = named[key];
        const row = dao._table(collection).find((r) => r.id === id);
        return row ? dao._load(collection, row) : undefined;
      },
      has(_, key) {
        return typeof key === 'string' && !!named[key];
      },
      ownKeys() {
        return Object.keys(named);
      },
      getOwnPropertyDescriptor(_, key) {
        return named[key] ? { enumerable: true, configurable: true } : undefined;
      },
    }
  );

  // h.store.<sammlung>: die gespeicherten Datensätze, frisch geladen.
  const storeView = new Proxy(
    {},
    {
      get(_, key) {
        if (typeof key !== 'string' || !collectionSchema(key)) return undefined;
        return dao._all(key);
      },
    }
  );

  const routes = {};
  const crons = {};
  const pushed = [];
  const httpCalls = [];    // die an Expo gestellten Anfragen
  const httpResponses = []; // gestellte Antworten, der Reihe nach
  const libCache = {};
  const recordHooks = { beforeCreate: [], beforeUpdate: [], afterUpdate: [] };

  class ApiError extends Error {
    constructor(status, message) {
      super(message);
      this.status = status;
      this.message = message;
    }
  }

  const sandbox = {
    console,
    Date,
    Math,
    JSON,
    parseInt,
    parseFloat,
    isNaN,
    Number,
    String,
    Object,
    Array,
    Error,

    __hooks: HOOKS_DIR,
    ApiError,

    // Record-Konstruktor: new Record(collection[, daten]) — die Hooks setzen
    // die Felder danach einzeln per set().
    Record: function Record(collection, data) {
      const name = collection && typeof collection === 'object' ? collection.name : collection;
      return new FakeRecord(name, data || {});
    },

    $app: {
      dao: () => dao,
    },

    $apis: {
      // Wird pro Aufruf über den Kontext gefüllt (siehe call()).
      requestInfo: (c) => ({ data: c.__body || {} }),
    },

    routerAdd: (method, pathSpec, handler) => {
      routes[`${method} ${pathSpec}`] = handler;
    },

    cronAdd: (name, expr, handler) => {
      crons[name] = { expr, handler };
    },

    // Record-Hooks werden nach Sammlung gesammelt und im Test einzeln mit
    // einem Ereignis aufgerufen (siehe fireRecordHook).
    onRecordBeforeCreateRequest: (handler, collection) => {
      recordHooks.beforeCreate.push({ collection, handler });
    },
    onRecordBeforeUpdateRequest: (handler, collection) => {
      recordHooks.beforeUpdate.push({ collection, handler });
    },
    onRecordAfterUpdateRequest: (handler, collection) => {
      recordHooks.afterUpdate.push({ collection, handler });
    },

    // Der echte Versand geht über $http.send an Expo. Hier wird nur die
    // Antwort gestellt: Ein Test darf keine Nachrichten verschicken, aber die
    // Auswertung der Quittungen (tote Token entfernen) soll laufen.
    //
    // httpResponses wird pro Aufruf abgearbeitet; ist nichts hinterlegt,
    // quittiert Expo jede Nachricht der Reihe nach mit "ok".
    $http: {
      send: (req) => {
        httpCalls.push(req);
        if (httpResponses.length) {
          const next = httpResponses.shift();
          if (next instanceof Error) throw next;
          return next;
        }
        const anzahl = JSON.parse(req.body).length;
        return { json: { data: new Array(anzahl).fill({ status: 'ok' }) } };
      },
    },

    require: (spec) => {
      // Die Hooks laden ihre Bibliotheken über require(`${__hooks}/lib/…`).
      //
      // Der Push-Versand wird standardmäßig ersetzt: Ein Test darf keine
      // Nachrichten senden, und die meisten Tests interessiert nur, DASS
      // gesendet wurde (h.pushed).
      //
      // Mit realPush: true wird lib/push.js dagegen echt geladen — nur
      // $http.send ist dann gestellt. Nur so laufen die Zeilen, die
      // entscheiden, WER eine Nachricht bekommt: die Zuordnung von Kategorie
      // zu Opt-in-Feld und die Segmente. Das ist eine Einwilligungsfrage; ein
      // Stub kann sie nicht beantworten.
      if (spec.endsWith('/lib/push.js') && !realPush) {
        return {
          tokensForUser: () => [],
          collectTokens: () => [],
          send: (targets, title, body, link) => {
            pushed.push({ targets, title, body, link });
          },
        };
      }
      // Zwischenspeichern: Hook und Test müssen dieselbe Instanz benutzen,
      // sonst arbeiten sie auf verschiedenen Zuständen.
      if (!libCache[spec]) libCache[spec] = loadLib(spec, sandbox);
      return libCache[spec];
    },
  };
  sandbox.globalThis = sandbox;

  const context = vm.createContext(sandbox);
  const file = path.join(HOOKS_DIR, hookFile);
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });

  return {
    dao,
    // Die Fachlogik-Bibliothek in derselben Umgebung — für Tests der reinen
    // Rechenlogik. Als Objekt zurückgegeben, damit die this-Bindung der
    // Methoden erhalten bleibt (points.js ruft sich intern über this auf).
    lib: sandbox.require(`${HOOKS_DIR}/lib/points.js`),
    // Der Push-Versand, in derselben Umgebung. Mit realPush ist das die echte
    // Bibliothek, sonst der Stub.
    push: sandbox.require(`${HOOKS_DIR}/lib/push.js`),
    records,
    routes,
    crons,
    pushed,
    // Die an Expo gestellten Anfragen und die Warteschlange der Antworten.
    httpCalls,
    httpResponses,
    ApiError,
    store: storeView,

    // Siehe FakeDao.failSaveOn.
    failSaveOn: (collection, predicate, message) => dao.failSaveOn(collection, predicate, message),

    // Route aufrufen. Gibt { status, body } zurück; ein ApiError wird
    // durchgereicht, damit der Test ihn mit expect(...).toThrow prüfen kann.
    call(routeKey, { body = {}, authRecord = null, admin = null } = {}) {
      const handler = routes[routeKey];
      if (!handler) throw new Error(`Harness: Route ${routeKey} nicht registriert`);

      let result;
      const c = {
        __body: body,
        get: (key) => {
          if (key === 'authRecord') return authRecord;
          if (key === 'admin') return admin;
          return null;
        },
        json: (status, payload) => {
          result = { status, body: payload };
          return result;
        },
      };
      handler(c);
      return result;
    },

    // Record-Hook aufrufen: die fuer die Sammlung registrierten Handler in
    // Reihenfolge, mit einem nachgebauten Ereignis. In den Update-Phasen ist
    // der Datensatz — wie in PocketBase — kein neuer mehr.
    fireRecordHook(phase, collection, record, { authRecord = null, admin = null } = {}) {
      if (phase === 'beforeUpdate' || phase === 'afterUpdate') record._new = false;
      const event = {
        record,
        httpContext: {
          get: (key) => {
            if (key === 'authRecord') return authRecord;
            if (key === 'admin') return admin;
            return null;
          },
        },
      };
      for (const hook of recordHooks[phase]) {
        if (hook.collection === collection) hook.handler(event);
      }
      return record;
    },

    // Neuen Datensatz erzeugen, wie ihn PocketBase vor dem Anlegen reicht.
    newRecord(collection, data = {}) {
      return new FakeRecord(collection, data);
    },

    runCron(name) {
      const job = crons[name];
      if (!job) throw new Error(`Harness: Cronjob ${name} nicht registriert`);
      return job.handler();
    },

    // Alle gespeicherten Zeilen einer Sammlung als einfache Objekte.
    rows(collection) {
      return dao._table(collection).map((row) => structuredClone(row));
    },
  };
}

// Bibliotheken (lib/points.js) laufen in derselben Umgebung wie der Hook: Sie
// benutzen dieselben Globals ($app, Record, __hooks) und exportieren über
// module.exports.
function loadLib(spec, sandbox) {
  const file = spec.startsWith(HOOKS_DIR) ? spec : path.join(HOOKS_DIR, spec);
  const moduleObj = { exports: {} };
  const libSandbox = Object.assign(Object.create(null), sandbox, {
    module: moduleObj,
    exports: moduleObj.exports,
  });
  libSandbox.globalThis = libSandbox;
  const context = vm.createContext(libSandbox);
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  return moduleObj.exports;
}

module.exports = {
  loadHook,
  loadSchema,
  FakeRecord,
  matchesFilter,
  toPbDate,
  HOOKS_DIR,
};
