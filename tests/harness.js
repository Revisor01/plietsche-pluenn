// Testumgebung für PocketBase-Hooks.
//
// PocketBase führt die Hooks in einer eigenen JavaScript-Umgebung aus (Goja,
// kein Node). Globale Funktionen wie routerAdd, cronAdd, $app, ApiError oder
// Record stellt die Laufzeit bereit — in einem Node-Test gibt es sie nicht.
//
// Dieser Harness baut sie nach: eine App im Speicher mit den Sammlungen, die
// die Hooks lesen, dazu die Globals. Die Hook-Datei wird über das vm-Modul in
// diese Umgebung geladen; die dabei registrierten Routen, Middlewares,
// Record-Hooks und Cronjobs landen in Listen und lassen sich einzeln
// aufrufen. Ohne laufende Instanz, ohne Docker.
//
// Maßstab ist PocketBase 0.40.4 (JSVM-Schnittstelle ab 0.23: $app.save,
// $app.findRecordsByFilter, e.auth, e.requestInfo().body, e.next(), …). Nur
// was die Hooks benutzen, ist nachgebaut — ein Aufruf der alten Schnittstelle
// ($app.dao(), c.get('authRecord'), onRecordBeforeCreateRequest) scheitert
// hier wie in Produktion.
//
// Ein gutmütiger Harness macht Tests grün, die in Produktion scheitern würden
// — deshalb verhält er sich an den Stellen, an denen die Hooks sich auf
// PocketBase verlassen, so streng wie das Original:
//
//   - Das Schema (Sammlungen, Felder, Feldtypen, UNIQUE-Indizes) kommt aus
//     dem Sammlungs-Snapshot in pocketbase/pb_migrations/ und den Migrationen
//     danach, nicht aus einer Liste im Test. Unbekannte Sammlungen und Felder
//     fallen auf.
//   - Filter werden geparst wie in PocketBase: leerer Filter, unbekanntes Feld
//     oder ein unquotierter Wert rechts sind Fehler. Platzhalter {:name}
//     brauchen einen Wert.
//   - Datumsfelder werden in PocketBase-Form gespeichert
//     ("2026-09-26 10:00:00.000Z") und im Filter als TEXT verglichen, wie
//     SQLite es tut.
//   - Lesen liefert eine frische Kopie des gespeicherten Stands. Was ein Hook
//     an einem Datensatz ändert, ist erst nach dem Speichern für andere
//     sichtbar.
//   - Speichern kann scheitern: UNIQUE-Verletzung oder ein im Test gestellter
//     Fehler (failSaveOn).
//   - runInTransaction rollt bei einem Fehler ALLES zurück. Wer innerhalb der
//     Transaktion über $app statt txApp schreibt, bekommt einen Fehler (in
//     PocketBase wartet das auf die eigene Schreibverbindung); wer über $app
//     liest, sieht den Stand vor der Transaktion.
//   - Record-Hooks laufen als Kette: Erst e.next() speichert. Was ein Hook
//     danach am Datensatz ändert, ohne selbst zu speichern, ist verloren —
//     der Test sieht den gespeicherten Stand.

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const HOOKS_DIR = path.join(__dirname, '..', 'pocketbase', 'pb_hooks');
const MIGRATIONS_DIR = path.join(__dirname, '..', 'pocketbase', 'pb_migrations');

// PocketBase meldet „nichts gefunden" mit dem Fehler des SQL-Treibers.
const NO_ROWS = 'sql: no rows in result set';
const BAD_FILTER = 'invalid or empty filter expression';

// Das Anmeldegeheimnis der Sammlung `users` im Harness (users.authToken.secret).
// Tests, die Token signieren, benutzen denselben Wert.
const USERS_TOKEN_SECRET = 'harness-users-authtoken-secret-0123456789';

// ── Schema aus dem Sammlungs-Snapshot ──────────────────────────
//
// Seit PocketBase 0.40 beschreibt ein einziger Snapshot das Schema
// (*_collections_snapshot.js, app.importCollections). Migrationen davor
// stammen aus der 0.22-Zeit und sind durch ihn ersetzt; Migrationen danach
// bauen darauf auf.
//
// Die Dateien werden in einer nachgebauten Migrationsumgebung AUSGEFÜHRT,
// nicht geparst: Der Snapshot schreibt vor dem Import IDs um, spätere
// Migrationen fügen Felder über collection.fields.add() hinzu — ein Parser
// müsste all das nachvollziehen und läge beim nächsten Umbau falsch.
//
// Nachgebaut ist nur, was Migrationen aufrufen: Sammlungen finden, importieren,
// speichern, löschen; Collection mit fields; Feldklassen; Record und
// $security. Datensätze gibt es hier nicht — Seed-Migrationen laufen ins
// Leere, hier interessiert nur die Form der Sammlungen.

// Felder, die PocketBase jeder Auth-Sammlung selbst gibt, falls eine
// Migration sie nicht nennt (der Snapshot nennt sie).
const AUTH_SYSTEM_FIELDS = [
  { name: 'id', type: 'text', system: true, required: true, primaryKey: true },
  { name: 'password', type: 'password', system: true, required: true, hidden: true },
  { name: 'tokenKey', type: 'text', system: true, required: true, hidden: true, autogeneratePattern: '[a-zA-Z0-9]{50}' },
  { name: 'email', type: 'email', system: true },
  { name: 'emailVisibility', type: 'bool', system: true },
  { name: 'verified', type: 'bool', system: true },
];

function parseUniqueIndex(sql) {
  const m = `${sql}`.match(
    /^\s*CREATE\s+UNIQUE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?\w+[`"']?\s+ON\s+[`"']?(\w+)[`"']?\s*\(([^)]*)\)\s*(.*)$/i
  );
  if (!m) return null;
  const columns = m[2]
    .split(',')
    .map((c) => c.trim().replace(/[`"']/g, '').split(/\s+/)[0])
    .filter(Boolean);
  // Teilindex `WHERE spalte != ''`: Leerwerte zählen nicht (E-Mail bei users).
  const skipEmpty = /WHERE\s+[`"']?\w+[`"']?\s*!=\s*''/i.test(m[3] || '');
  return { columns, skipEmpty };
}

let schemaCache = null;

function migrationFiles() {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.js'))
    .sort();
  let start = -1;
  files.forEach((f, i) => {
    if (/_collections_snapshot\.js$/.test(f)) start = i;
  });
  if (start < 0) {
    throw new Error(
      'Harness: kein *_collections_snapshot.js in pocketbase/pb_migrations/ — ' +
        'das Schema für PocketBase 0.40 fehlt.'
    );
  }
  return files.slice(start);
}

function loadSchema() {
  if (schemaCache) return schemaCache;

  let idCount = 0;
  const genId = (prefix) => `${prefix}${String(++idCount).padStart(10, '0')}`;

  class Field {
    constructor(data) {
      Object.assign(this, data || {});
      if (!this.id) this.id = genId(`${this.type || 'field'}`);
    }
    getId() {
      return this.id;
    }
    getName() {
      return this.name;
    }
    type_() {
      return this.type;
    }
  }
  // Die typisierten Feldklassen der JSVM (new TextField({...}) usw.).
  const typed = {};
  for (const [cls, type] of Object.entries({
    TextField: 'text',
    NumberField: 'number',
    BoolField: 'bool',
    EmailField: 'email',
    URLField: 'url',
    EditorField: 'editor',
    DateField: 'date',
    AutodateField: 'autodate',
    SelectField: 'select',
    JSONField: 'json',
    FileField: 'file',
    RelationField: 'relation',
    PasswordField: 'password',
    GeoPointField: 'geoPoint',
  })) {
    typed[cls] = class extends Field {
      constructor(data) {
        super(Object.assign({}, data, { type }));
      }
    };
  }

  class FieldsList {
    constructor(list) {
      this._list = [];
      (list || []).forEach((f) => this.add(f));
    }
    add(...fields) {
      for (const raw of fields) {
        const f = raw instanceof Field ? raw : new Field(raw);
        const i = this._list.findIndex((x) => x.id === f.id || x.name === f.name);
        if (i >= 0) this._list[i] = f;
        else this._list.push(f);
      }
    }
    getByName(name) {
      return this._list.find((f) => f.name === name) || null;
    }
    getById(id) {
      return this._list.find((f) => f.id === id) || null;
    }
    removeByName(name) {
      this._list = this._list.filter((f) => f.name !== name);
    }
    removeById(id) {
      this._list = this._list.filter((f) => f.id !== id);
    }
    fieldNames() {
      return this._list.map((f) => f.name);
    }
    asArray() {
      return this._list.slice();
    }
    get length() {
      return this._list.length;
    }
  }

  class Collection {
    constructor(data) {
      const d = Object.assign({}, data || {});
      const fields = d.fields || [];
      delete d.fields;
      Object.assign(this, d);
      this.type = this.type || 'base';
      this.id = this.id || genId('pbc_');
      this.indexes = (data && data.indexes) || [];
      this.fields = new FieldsList(fields);
      this._ensureSystemFields();
    }
    _ensureSystemFields() {
      if (!this.fields.getByName('id')) {
        this.fields._list.unshift(new Field({ name: 'id', type: 'text', system: true, required: true, primaryKey: true }));
      }
      if (this.type === 'auth') {
        for (const f of AUTH_SYSTEM_FIELDS) if (!this.fields.getByName(f.name)) this.fields.add(new Field(f));
        // Die Optionen einer Auth-Sammlung mit den Vorgaben von PocketBase —
        // Migrationen stellen sie um (1790500200_settings.js etwa authAlert).
        for (const [key, def] of Object.entries({
          authAlert: { enabled: true, emailTemplate: { subject: '', body: '' } },
          authToken: { duration: 604800 },
          passwordResetToken: { duration: 1800 },
          emailChangeToken: { duration: 1800 },
          verificationToken: { duration: 259200 },
          fileToken: { duration: 180 },
          passwordAuth: { enabled: true, identityFields: ['email'] },
          oauth2: { enabled: false },
          otp: { enabled: false, duration: 180, length: 8 },
          mfa: { enabled: false, duration: 1800 },
          verificationTemplate: { subject: '', body: '' },
          resetPasswordTemplate: { subject: '', body: '' },
          confirmEmailChangeTemplate: { subject: '', body: '' },
        })) {
          this[key] = Object.assign({}, def, this[key] || {});
        }
      }
    }
    isAuth() {
      return this.type === 'auth';
    }
  }

  const collections = [];
  const find = (nameOrId) => {
    const c = collections.find((x) => x.name === nameOrId || x.id === nameOrId);
    if (!c) throw new Error(NO_ROWS);
    return c;
  };
  const upsert = (col) => {
    const i = collections.findIndex((x) => x.id === col.id || x.name === col.name);
    if (i >= 0) collections[i] = col;
    else collections.push(col);
  };

  const migApp = {
    findCollectionByNameOrId: (nameOrId) => find(nameOrId),
    // importCollections(liste, deleteMissing): wie PocketBase — vorhandene
    // Sammlungen (über ID, sonst Namen) werden mit dem Import überlagert;
    // Felder, die der Import nicht nennt, bleiben ohne deleteMissing stehen.
    importCollections: (list, deleteMissing) => {
      const imported = [];
      for (const raw of list || []) {
        let existing = null;
        try {
          existing = find(raw.id) || null;
        } catch (_) {
          try {
            existing = find(raw.name);
          } catch (_) {
            existing = null;
          }
        }
        const col = new Collection(raw);
        if (existing && !deleteMissing) {
          for (const f of existing.fields.asArray()) {
            if (!col.fields.getById(f.id) && !col.fields.getByName(f.name)) col.fields.add(f);
          }
        }
        if (existing) {
          const i = collections.indexOf(existing);
          collections.splice(i, 1);
        }
        upsert(col);
        imported.push(col);
      }
      if (deleteMissing) {
        for (const c of collections.slice()) {
          if (!imported.includes(c) && !c.system) collections.splice(collections.indexOf(c), 1);
        }
      }
    },
    save: (model) => {
      if (model instanceof Collection) upsert(model);
    },
    saveNoValidate: (model) => {
      if (model instanceof Collection) upsert(model);
    },
    delete: (model) => {
      if (model instanceof Collection) {
        const i = collections.indexOf(model);
        if (i >= 0) collections.splice(i, 1);
      }
    },
    // Datensätze: gibt es in dieser Umgebung nicht.
    findFirstRecordByFilter: () => {
      throw new Error(NO_ROWS);
    },
    findFirstRecordByData: () => {
      throw new Error(NO_ROWS);
    },
    findRecordById: () => {
      throw new Error(NO_ROWS);
    },
    findRecordsByFilter: () => [],
    countRecords: () => 0,
    runInTransaction: (fn) => fn(migApp),
  };

  class Record {
    constructor(collection) {
      this._collection = collection;
    }
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
    Collection,
    Field,
    ...typed,
    Record,
    $security: { randomString: (n) => 'x'.repeat(n || 8) },
    migrate: null,
  };
  sandbox.globalThis = sandbox;
  const context = vm.createContext(sandbox);

  for (const f of migrationFiles()) {
    const file = path.join(MIGRATIONS_DIR, f);
    let up = null;
    sandbox.migrate = (u) => {
      up = u;
    };
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
    if (typeof up !== 'function') throw new Error(`Harness: Migration ${f} registriert kein up()`);
    up(migApp);
  }

  const schema = {};
  for (const col of collections) {
    // Systemsammlungen (_superusers, _mfas, …) benutzen die Hooks nicht.
    if (col.system || `${col.name}`.startsWith('_')) continue;
    const fields = {};
    for (const f of col.fields.asArray()) {
      fields[f.name] = {
        name: f.name,
        type: f.type,
        system: !!f.system,
        required: !!f.required,
        max: f.max,
        min: f.min,
        values: f.values,
        maxSelect: f.maxSelect,
        autogeneratePattern: f.autogeneratePattern || '',
      };
    }
    const unique = [];
    for (const sql of col.indexes || []) {
      const idx = parseUniqueIndex(sql);
      if (idx) unique.push(idx);
    }
    schema[col.name] = {
      id: col.id,
      name: col.name,
      type: col.type,
      fields,
      unique,
      authToken: col.type === 'auth' ? { secret: USERS_TOKEN_SECRET, duration: (col.authToken || {}).duration } : undefined,
    };
  }

  schemaCache = schema;
  return schema;
}

function collectionSchema(nameOrId) {
  const schema = loadSchema();
  const key = nameOrId && typeof nameOrId === 'object' ? nameOrId.name : nameOrId;
  const hit = schema[key] || Object.values(schema).find((c) => c.id === key);
  return hit || null;
}

function requireCollection(name) {
  const c = collectionSchema(name);
  if (!c) {
    const label = name && typeof name === 'object' ? name.name : name;
    throw new Error(`${NO_ROWS} (Harness: Sammlung "${label}" gibt es laut pb_migrations/ nicht)`);
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
    case 'autodate':
      return 'date';
    case 'json':
    case 'geoPoint':
      return 'json';
    default:
      // text, email, url, editor, password, select, relation, file — in
      // diesem Schema alle mit maxSelect 1, also ein einzelner Text.
      return 'text';
  }
}

function prepareValue(def, value, where) {
  // Mehrfachfelder (maxSelect > 1) speichert PocketBase als Liste. Im Schema
  // gibt es keine; kommt eines dazu, soll das hier auffallen statt still als
  // Text gespeichert zu werden.
  if (def.maxSelect > 1) throw new Error(`Harness: Mehrfachfeld ${where} ist nicht nachgebildet`);
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
// get(feld), set(feld, wert), id, isNew(), isSuperuser(), collection() und
// tokenKey().
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

  // Ein Konto aus `users` ist nie Superuser (die stehen in _superusers).
  isSuperuser() {
    return false;
  }

  collection() {
    return {
      id: this._schema.id,
      name: this._schema.name,
      type: this._schema.type,
      authToken: this._schema.authToken ? Object.assign({}, this._schema.authToken) : undefined,
    };
  }

  tokenKey() {
    return this.get('tokenKey');
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
// Nachgebaut wie PocketBase (search.FilterData → fexpr; gemessen an 0.22.21 und
// 0.40.4, in diesen Punkten gleich): Ein Ausdruck aus
// Vergleichen `links OP rechts`, verknüpft mit && und ||, Klammern erlaubt.
// Jeder Operand ist
//   - eine Zahl, true/false, null,
//   - ein Text in "…" oder '…',
//   - ein Platzhalter {:name} (Wert aus params),
//   - oder ein Feldname der Sammlung.
// Alles andere ist ein Fehler — auch ein unquotierter Wert rechts
// (`status = pending`): PocketBase liest ihn als Feldnamen, findet keinen und
// lehnt den Filter ab. Ebenso ein unbekanntes Feld (0.40.4: „invalid filter
// expression: invalid right operand "pending" - unknown field").
//
// Bewusste Abweichung beim LEEREN Filter: 0.22 lehnte ihn ab, 0.40 liest ihn
// als „kein Filter" und liefert alle Datensätze (gemessen am 26.09.2026). In
// den Hooks ist ein leerer Filter immer ein Fehler — ein zusammengesetzter
// Ausdruck, dem ein Teil fehlt —, und „alle Datensätze" wäre die gefährlichste
// Antwort darauf. Der Harness lehnt ihn deshalb weiter ab.
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

// ── Speicher ───────────────────────────────────────────────────
//
// Gespeichert werden Zeilen (einfache Objekte in PB-Form), nicht die
// Datensatz-Objekte selbst. Jedes Lesen liefert eine frische Kopie — wie
// PocketBase, das jedes Mal aus der Datenbank lädt. Was ein Hook an einem
// geladenen Datensatz ändert, ohne ihn zu speichern, sieht niemand sonst; und
// wer einen veralteten Datensatz speichert, überschreibt die ganze Zeile.
//
// FakeDao ist der Speicher, den die TESTS sehen (h.dao): Er hat die Methoden
// der 0.40-App und zusätzlich saveRecord/deleteRecord als Kurzform für
// Fixtures. Die Hooks sehen ihn nie direkt, sondern nur über appFacade() —
// dort gibt es ausschließlich die 0.40-Schnittstelle.

// Wert für ein Feld mit autogeneratePattern (username, tokenKey). PocketBase
// füllt sie beim Anlegen zufällig; hier fortlaufend, damit zwei Datensätze
// nie zufällig kollidieren. Unterstützt, was im Schema vorkommt: Literale,
// Zeichenklassen [...] und Wiederholungen {n}.
let autogenCounter = 0;
function autogenerate(pattern) {
  autogenCounter += 1;
  let n = autogenCounter;
  let out = '';
  const re = /\[([^\]]+)\](?:\{(\d+)\})?|\\?(.)/g;
  let m;
  while ((m = re.exec(pattern))) {
    if (m[1]) {
      const chars = [];
      const spec = m[1];
      for (let i = 0; i < spec.length; i++) {
        if (spec[i + 1] === '-' && spec[i + 2]) {
          for (let c = spec.charCodeAt(i); c <= spec.charCodeAt(i + 2); c++) chars.push(String.fromCharCode(c));
          i += 2;
        } else {
          chars.push(spec[i]);
        }
      }
      const count = Number(m[2] || 1);
      let part = '';
      for (let i = 0; i < count; i++) {
        part = chars[n % chars.length] + part;
        n = Math.floor(n / chars.length);
      }
      out += part;
    } else {
      out += m[3];
    }
  }
  return out;
}

class FakeDao {
  constructor() {
    this.tables = {}; // { sammlung: [ zeile, … ] }
    this.saved = []; // Reihenfolge der Schreibvorgänge, für Assertions
    this.deleted = [];
    this._saveFailures = [];
    // Während einer Transaktion: der festgeschriebene Stand von davor.
    this._tx = null;
    // Gesetzt, solange $app (nicht txApp) während einer Transaktion liest.
    this._readView = null;
  }

  _view() {
    return this._readView || this.tables;
  }

  _table(collection, view) {
    const schema = requireCollection(collection);
    const tables = view || this.tables;
    if (!tables[schema.name]) tables[schema.name] = [];
    return tables[schema.name];
  }

  _load(collection, row) {
    return FakeRecord._load(collection, row);
  }

  _all(collection, view) {
    return this._table(collection, view || this._view()).map((row) => this._load(collection, row));
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

  // Felder mit autogeneratePattern füllen, wie PocketBase beim Anlegen.
  _autogenerate(schema, record) {
    for (const def of Object.values(schema.fields)) {
      if (def.name === 'id' || !def.autogeneratePattern) continue;
      if (record.get(def.name) === '') record._data[def.name] = autogenerate(def.autogeneratePattern);
    }
  }

  // Zeile einfügen, ohne die Fehlerquellen des Speicherns — für die
  // Ausgangsdaten eines Tests. UNIQUE wird trotzdem geprüft: Eine Fixture,
  // die PocketBase so gar nicht speichern könnte, prüft einen Zustand, den
  // es in Produktion nicht gibt.
  _seed(record) {
    const schema = record._schema;
    const table = this._table(schema.name);
    this._autogenerate(schema, record);
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
    const col = { id: schema.id, name: schema.name, type: schema.type };
    if (schema.authToken) col.authToken = Object.assign({}, schema.authToken);
    col.isAuth = () => schema.type === 'auth';
    return col;
  }

  findRecordById(collection, id) {
    const row = this._table(collection, this._view()).find((r) => r.id === `${id}`);
    // PocketBase wirft, wenn nichts gefunden wird — die Hooks verlassen sich
    // darauf und fangen den Fehler ab.
    if (!row) throw new Error(NO_ROWS);
    return this._load(collection, row);
  }

  // Der Filter wird VOR dem Lesen geprüft, wie in PocketBase: Ein kaputter
  // Filter scheitert auch auf einer leeren Sammlung. Platzhalterwerte kommen
  // als letzte Argumente (…params), wie in PocketBase auch mehrere.
  findFirstRecordByFilter(collection, filter, ...params) {
    const pred = compileFilter(collection, filter, mergeParams(params));
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

  // Reihenfolge wie in PocketBase: erst filtern, dann sortieren, dann `offset`
  // überspringen, dann auf `limit` kürzen. `offset` wird ernst genommen — ein
  // Test, der sich auf Blätterung verlässt, prüft sonst etwas anderes als die
  // Produktion.
  findRecordsByFilter(collection, filter, sort, limit, offset, ...params) {
    const schema = requireCollection(collection);
    const pred = compileFilter(collection, filter, mergeParams(params));
    const rows = applySort(this._all(collection).filter(pred), sort, schema);
    const skip = Number(offset || 0);
    if (!Number.isInteger(skip) || skip < 0) {
      // Bewusst scheitern statt still die erste Seite liefern.
      throw new Error(`Harness: offset muss eine nicht-negative ganze Zahl sein, war: ${offset}`);
    }
    const page = skip > 0 ? rows.slice(skip) : rows;
    return limit && limit > 0 ? page.slice(0, limit) : page;
  }

  // Fehlerquelle für Tests: Jedes Speichern auf `collection`, für das
  // `predicate(record)` wahr ist (ohne Prädikat: jedes), scheitert mit
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

  // $app.saveNoValidate: speichern ohne Feldprüfung — wie unter 0.22
  // dao.saveRecord. Die Hooks schreiben so (siehe lib/points.js).
  saveNoValidate(record) {
    const schema = record._schema;
    for (const f of this._saveFailures) {
      if (f.collection === schema.name && f.predicate(record)) throw new Error(f.message);
    }
    const table = this._table(schema.name);
    if (record.isNew()) this._autogenerate(schema, record);
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

  // $app.save: mit Feldprüfung, wie PocketBase ab 0.23. Nachgebildet sind
  // Pflichtfelder, Höchstlänge von Text und die erlaubten Werte eines
  // Auswahlfelds — genug, damit ein Hook, der auf save umstellt, im Test an
  // denselben Stellen scheitert wie in Produktion.
  save(record) {
    const schema = record._schema;
    const problems = [];
    for (const def of Object.values(schema.fields)) {
      if (def.system || def.type === 'autodate' || def.type === 'password') continue;
      const v = record.get(def.name);
      const empty = v === '' || v === null || v === undefined || v === 0 || v === false;
      if (def.required && empty) problems.push(`${def.name}: cannot be blank`);
      if (typeof v === 'string' && def.max && ['text', 'editor', 'email', 'url'].includes(def.type) && v.length > def.max) {
        problems.push(`${def.name}: must be at most ${def.max} characters`);
      }
      if (def.type === 'select' && v !== '' && Array.isArray(def.values) && !def.values.includes(v)) {
        problems.push(`${def.name}: invalid value ${JSON.stringify(v)}`);
      }
    }
    if (problems.length) throw new Error(`Harness: Validierung ${schema.name}: ${problems.join('; ')}`);
    return this.saveNoValidate(record);
  }

  delete(record) {
    const table = this._table(record.collectionName);
    const i = table.findIndex((r) => r.id === record.id);
    if (i >= 0) table.splice(i, 1);
    this.deleted.push(record);
  }

  // Kurzformen für Tests und Fixtures (die alten Namen).
  saveRecord(record) {
    return this.saveNoValidate(record);
  }

  deleteRecord(record) {
    return this.delete(record);
  }
}

function mergeParams(list) {
  const out = {};
  let any = false;
  for (const p of list || []) {
    if (p && typeof p === 'object') {
      Object.assign(out, p);
      any = true;
    }
  }
  return any ? out : undefined;
}

// Die App, wie ein Hook sie sieht: $app (tx = false) oder txApp (tx = true).
// Nur die 0.40-Methoden, die die Hooks benutzen.
function appFacade(dao, tx) {
  const deadlock = (what) =>
    new Error(
      `Harness: $app.${what} während einer laufenden Transaktion. In PocketBase wartet das auf ` +
        'die einzige Schreibverbindung, die die Transaktion selbst hält — txApp benutzen.'
    );
  // Lesen über $app während einer Transaktion: eigene Verbindung, also der
  // festgeschriebene Stand von vor der Transaktion.
  const read = (fn) => {
    if (tx || !dao._tx) return fn();
    dao._readView = dao._tx.committed;
    try {
      return fn();
    } finally {
      dao._readView = null;
    }
  };
  const write = (what, fn) => {
    if (!tx && dao._tx) throw deadlock(what);
    return fn();
  };

  const app = {
    findCollectionByNameOrId: (nameOrId) => dao.findCollectionByNameOrId(nameOrId),
    findRecordById: (collection, id) => read(() => dao.findRecordById(collection, id)),
    findFirstRecordByFilter: (collection, filter, ...params) =>
      read(() => dao.findFirstRecordByFilter(collection, filter, ...params)),
    findFirstRecordByData: (collection, field, value) =>
      read(() => dao.findFirstRecordByData(collection, field, value)),
    findRecordsByFilter: (collection, filter, sort, limit, offset, ...params) =>
      read(() => dao.findRecordsByFilter(collection, filter, sort, limit, offset, ...params)),
    save: (record) => write('save', () => dao.save(record)),
    saveNoValidate: (record) => write('saveNoValidate', () => dao.saveNoValidate(record)),
    delete: (record) => write('delete', () => dao.delete(record)),
    isTransactional: () => tx,
    // Alles oder nichts: Wirft fn, wird der Stand von vorher wiederhergestellt
    // und der Fehler weitergereicht. Eine Transaktion in der Transaktion
    // (txApp.runInTransaction) läuft in derselben mit.
    runInTransaction: (fn) => {
      if (tx) return fn(app);
      if (dao._tx) throw deadlock('runInTransaction');
      const before = {
        tables: structuredClone(dao.tables),
        saved: dao.saved.length,
        deleted: dao.deleted.length,
      };
      dao._tx = { committed: structuredClone(dao.tables) };
      try {
        fn(appFacade(dao, true));
        dao._tx = null;
      } catch (err) {
        dao.tables = before.tables;
        dao.saved.length = before.saved;
        dao.deleted.length = before.deleted;
        dao._tx = null;
        throw err;
      }
    },
  };
  return app;
}

// Ein Superuser, wie e.auth ihn ab 0.23 liefert: Datensatz aus _superusers,
// ohne Rolle, ohne Konto in `users`.
function superuserRecord(admin) {
  const id = (admin && admin.id) || 'superuser00001';
  return {
    id,
    collectionName: '_superusers',
    isSuperuser: () => true,
    get: (field) => (field === 'id' ? id : null),
    collection: () => ({ id: 'pbc_3142635823', name: '_superusers', type: 'auth' }),
  };
}

// ── JWT wie $security.parseJWT / parseUnverifiedJWT ─────────────
function b64urlJson(part) {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

function parseUnverifiedJWT(token) {
  const parts = `${token}`.split('.');
  if (parts.length !== 3) throw new Error('token is malformed');
  try {
    return b64urlJson(parts[1]);
  } catch (_) {
    throw new Error('token is malformed');
  }
}

// HS256 prüfen und den Ablauf (exp, Sekunden) — wie PocketBase.
function parseJWT(token, key) {
  const parts = `${token}`.split('.');
  if (parts.length !== 3) throw new Error('token is malformed');
  let header;
  try {
    header = b64urlJson(parts[0]);
  } catch (_) {
    throw new Error('token is malformed');
  }
  if (header.alg !== 'HS256') throw new Error('token signature is invalid: signing method is invalid');
  const expected = crypto.createHmac('sha256', `${key}`).update(`${parts[0]}.${parts[1]}`).digest();
  const given = Buffer.from(parts[2], 'base64url');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    throw new Error('token signature is invalid: signature is invalid');
  }
  const claims = b64urlJson(parts[1]);
  if (claims.exp !== undefined && Number(claims.exp) * 1000 <= Date.now()) {
    throw new Error('token has invalid claims: token is expired');
  }
  return claims;
}

// Einen Token signieren (für Tests).
function signJWT(claims, key) {
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const head = enc({ alg: 'HS256', typ: 'JWT' });
  const body = enc(claims);
  const sig = crypto.createHmac('sha256', `${key}`).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
}

// ── Umgebung aufbauen und Hook laden ───────────────────────────
//
// store: { sammlung: [ {feld: wert}, … ] } — die Datensätze, die es geben soll.
//   Nur Sammlungen und Felder aus dem Schema; `__name` legt einen Zugriff
//   über h.records.<name> an.
// opts.realPush: lib/push.js echt laden statt ersetzen (siehe require unten).
// opts.libs: { 'lib/<datei>.js': exports } — Bibliotheken, die es im Repo
//   nicht gibt, sondern erst im Abbild (lib/build.js mit dem Commit). Ohne
//   Eintrag scheitert require() daran wie in einer Instanz ohne die Datei.
// Rückgabe: { routes, crons, dao, app, records, call, runCron, failSaveOn, … }
function loadHook(hookFile, store = {}, opts = {}) {
  const realPush = !!opts.realPush;
  const extraLibs = opts.libs || {};
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
        return dao._all(key, dao.tables);
      },
    }
  );

  const app = appFacade(dao, false);
  const routes = {};
  const middlewares = [];
  const crons = {};
  const pushed = [];
  const httpCalls = []; // die an Expo gestellten Anfragen
  const httpResponses = []; // gestellte Antworten, der Reihe nach
  const libCache = {};
  const recordHooks = { createRequest: [], updateRequest: [] };

  // Fehlerklassen der JSVM. Der Status steht in `status`, wie in PocketBase.
  class ApiError extends Error {
    constructor(status, message, data) {
      super(message);
      this.status = status;
      this.message = message;
      this.data = data || {};
    }
  }
  const errorClass = (status) =>
    class extends ApiError {
      constructor(message, data) {
        super(status, message, data);
      }
    };

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
    BadRequestError: errorClass(400),
    UnauthorizedError: errorClass(401),
    ForbiddenError: errorClass(403),
    NotFoundError: errorClass(404),
    TooManyRequestsError: errorClass(429),
    InternalServerError: errorClass(500),

    // Record-Konstruktor: new Record(collection[, daten]) — die Hooks setzen
    // die Felder danach einzeln per set().
    Record: function Record(collection, data) {
      const name = collection && typeof collection === 'object' ? collection.name : collection;
      return new FakeRecord(name, data || {});
    },

    $app: app,

    $security: {
      parseUnverifiedJWT,
      parseJWT,
      randomString: (n) => crypto.randomBytes(n || 8).toString('hex').slice(0, n || 8),
    },

    routerAdd: (method, pathSpec, handler) => {
      routes[`${method} ${pathSpec}`] = isolate(handler);
    },

    // Globale Middlewares: laufen vor jedem Routen-Handler, in der
    // Reihenfolge ihrer Registrierung, und reichen mit e.next() weiter.
    routerUse: (...handlers) => {
      for (const handler of handlers) middlewares.push(isolate(handler));
    },

    cronAdd: (name, expr, handler) => {
      crons[name] = { expr, handler: isolate(handler) };
    },

    // Record-Request-Hooks, gesammelt nach Sammlung (Tags). Aufgerufen im
    // Test über fireRecordHook.
    onRecordCreateRequest: (handler, ...tags) => {
      recordHooks.createRequest.push({ tags, handler: isolate(handler) });
    },
    onRecordUpdateRequest: (handler, ...tags) => {
      recordHooks.updateRequest.push({ tags, handler: isolate(handler) });
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
      for (const [suffix, exports] of Object.entries(extraLibs)) {
        if (spec.endsWith(`/${suffix}`)) return exports;
      }
      // Zwischenspeichern: Hook und Test müssen dieselbe Instanz benutzen,
      // sonst arbeiten sie auf verschiedenen Zuständen.
      if (!libCache[spec]) libCache[spec] = loadLib(spec, sandbox);
      return libCache[spec];
    },
  };
  sandbox.globalThis = sandbox;

  // Handler-Scope wie in PocketBase: Die Laufzeit serialisiert jeden Handler
  // und führt ihn in einer eigenen Umgebung aus. Funktionen und Konstanten,
  // die oben in der *.pb.js-Datei stehen, sind darin NICHT sichtbar — nur
  // die Globals der Laufzeit (und was per require() geladen wird).
  //
  // Vorher lief die ganze Datei in einem gemeinsamen Kontext, und die
  // Handler sahen die Helfer der Datei. So blieben drei Fehler grün, die in
  // Produktion mit "ReferenceError: … is not defined" scheiterten (Scan,
  // Push-Anmeldung, Zähler des Push-Crons; gemessen gegen PocketBase
  // 0.22.21 am 26.09.2026). Der Handler wird deshalb aus seinem Quelltext
  // in einem frischen Kontext mit nur den Laufzeit-Globals neu erzeugt.
  const laufzeit = { ...sandbox };
  function isolate(handler) {
    const ctx = vm.createContext({ ...laufzeit });
    ctx.globalThis = ctx;
    return vm.runInContext(`(${handler.toString()})`, ctx);
  }

  const context = vm.createContext(sandbox);
  const file = path.join(HOOKS_DIR, hookFile);
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });

  // Das Anfrage-Ereignis (core.RequestEvent), soweit die Hooks es benutzen.
  function requestEvent({ body = {}, authRecord = null, admin = null, headers = {} } = {}) {
    const lowered = {};
    for (const [k, v] of Object.entries(headers || {})) lowered[k.toLowerCase()] = `${v}`;
    const e = {
      auth: admin ? superuserRecord(admin) : authRecord,
      app,
      request: {
        header: { get: (name) => lowered[`${name}`.toLowerCase()] || '' },
      },
      requestInfo: () => ({ body: body, headers: lowered, query: {}, auth: e.auth }),
      hasSuperuserAuth: () => !!(e.auth && e.auth.isSuperuser && e.auth.isSuperuser()),
      next: () => {
        throw new Error('Harness: e.next() ohne weiteren Handler');
      },
    };
    return e;
  }

  // Kette ausführen: Jeder Handler reicht mit e.next() weiter, am Ende steht
  // `final`. Rückgabe: ob `final` erreicht wurde.
  function runChain(e, handlers, final) {
    let reached = false;
    let i = -1;
    const step = () => {
      i += 1;
      if (i < handlers.length) return handlers[i](e);
      reached = true;
      return final();
    };
    e.next = step;
    step();
    return reached;
  }

  return {
    dao,
    // Die App, wie die Hooks sie als $app sehen.
    app,
    // Die Fachlogik-Bibliothek in derselben Umgebung — für Tests der reinen
    // Rechenlogik. Als Objekt zurückgegeben, damit die this-Bindung der
    // Methoden erhalten bleibt (points.js ruft sich intern über this auf).
    lib: sandbox.require(`${HOOKS_DIR}/lib/points.js`),
    // Der Push-Versand, in derselben Umgebung. Mit realPush ist das die echte
    // Bibliothek, sonst der Stub.
    push: sandbox.require(`${HOOKS_DIR}/lib/push.js`),
    records,
    routes,
    middlewares,
    crons,
    pushed,
    // Die an Expo gestellten Anfragen und die Warteschlange der Antworten.
    httpCalls,
    httpResponses,
    ApiError,
    store: storeView,

    // Siehe FakeDao.failSaveOn.
    failSaveOn: (collection, predicate, message) => dao.failSaveOn(collection, predicate, message),

    // Route aufrufen: erst die globalen Middlewares (routerUse), dann der
    // Handler. Gibt { status, body } zurück; ein ApiError wird durchgereicht,
    // damit der Test ihn mit expect(...).toThrow prüfen kann.
    //   authRecord: angemeldetes Konto (e.auth)
    //   admin:      Superuser (e.auth ist dann sein _superusers-Datensatz)
    //   headers:    Anfrage-Köpfe, etwa Authorization
    call(routeKey, { body = {}, authRecord = null, admin = null, headers = {} } = {}) {
      const handler = routes[routeKey];
      if (!handler) throw new Error(`Harness: Route ${routeKey} nicht registriert`);
      let result;
      const e = requestEvent({ body, authRecord, admin, headers });
      e.json = (status, payload) => {
        result = { status, body: payload };
        return result;
      };
      runChain(e, middlewares, () => handler(e));
      return result;
    },

    // Nur die Middlewares durchlaufen und das Ereignis zurückgeben — für
    // Tests, die prüfen, wen eine Middleware als angemeldet einträgt.
    runMiddlewares({ authRecord = null, admin = null, headers = {} } = {}) {
      const e = requestEvent({ authRecord, admin, headers });
      const reached = runChain(e, middlewares, () => {});
      if (!reached) throw new Error('Harness: eine Middleware hat e.next() nicht aufgerufen');
      return e;
    },

    // Record-Request-Hook aufrufen, wie PocketBase bei POST/PATCH auf
    // /api/collections/<sammlung>/records:
    //   phase 'createRequest' | 'updateRequest'
    // Die registrierten Handler der Sammlung laufen als Kette; das letzte
    // e.next() speichert den Datensatz (ohne weitere Hooks). Danach trägt
    // `record` den GESPEICHERTEN Stand: Setzt ein Hook ein Feld erst nach
    // e.next() und speichert nicht selbst, ist die Änderung weg — wie in
    // PocketBase.
    fireRecordHook(phase, collection, record, { authRecord = null, admin = null } = {}) {
      if (!recordHooks[phase]) throw new Error(`Harness: unbekannte Phase ${phase}`);
      if (phase === 'updateRequest') record._new = false;
      const e = requestEvent({ authRecord, admin });
      e.record = record;
      e.collection = dao.findCollectionByNameOrId(collection);
      const handlers = recordHooks[phase]
        .filter((h) => !h.tags.length || h.tags.includes(collection))
        .map((h) => h.handler);
      const reached = runChain(e, handlers, () => dao.saveNoValidate(record));
      if (!reached) {
        throw new Error('Harness: e.next() wurde nicht aufgerufen — PocketBase speichert den Datensatz dann nicht');
      }
      const row = dao._table(collection).find((r) => r.id === record.id);
      record._data = {};
      for (const [k, v] of Object.entries(row)) if (k !== 'id') record._data[k] = clone(v);
      record._new = false;
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
  signJWT,
  USERS_TOKEN_SECRET,
  HOOKS_DIR,
};
