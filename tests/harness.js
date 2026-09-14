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

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const HOOKS_DIR = path.join(__dirname, '..', 'pocketbase', 'pb_hooks');

// ── Datensatz ──────────────────────────────────────────────────
// Bildet die Record-Schnittstelle nach, die die Hooks tatsächlich benutzen:
// get(feld), set(feld, wert) und id.
let idCounter = 0;
function nextId(prefix) {
  idCounter += 1;
  return `${prefix}${String(idCounter).padStart(12, '0')}`;
}

// Zahlenfelder: PocketBase liefert für ein nicht gesetztes Zahlenfeld den
// Nullwert des Typs (0), nicht den Leerstring. Die Hooks prüfen mit `== null`
// auf „nicht gesetzt", was bei '' nicht anschlägt — der Harness muss diesen
// Unterschied abbilden, sonst greifen Standardwerte im Test nie.
const NUMBER_FIELDS = new Set([
  'points',
  'points_total',
  'streak_weeks',
  'points_awarded',
  'items_count',
  'count',
  'progress',
  'trigger_value',
  'points_reward',
  'multiplier',
  'mult_visit',
  'mult_take',
  'mult_bring',
  'pts_checkin',
  'pts_take',
  'pts_bring',
  'max_items_take',
  'geofence_radius_m',
  'gps_lat',
  'gps_lng',
  'gps_distance_m',
  'lat',
  'lng',
  'tier_bronze',
  'tier_silber',
  'tier_gold',
  'tier_platin',
  'tier_diamant',
  'reward_bronze',
  'reward_silber',
  'reward_gold',
  'reward_platin',
  'reward_diamant',
]);

class FakeRecord {
  constructor(collection, data) {
    this.collectionName = collection;
    this._data = Object.assign({}, data);
    this.id = this._data.id || nextId('rec');
    delete this._data.id;
  }

  get(field) {
    const v = this._data[field];
    if (v !== undefined) return v;
    return NUMBER_FIELDS.has(field) ? 0 : '';
  }

  set(field, value) {
    this._data[field] = value;
  }

  // Momentaufnahme für Assertions.
  data() {
    return Object.assign({ id: this.id }, this._data);
  }
}

// ── Filter ─────────────────────────────────────────────────────
// Die Hooks bauen PocketBase-Filter als Zeichenkette zusammen. Für die Tests
// reicht eine Auswertung der tatsächlich vorkommenden Formen:
//   feld = "wert"   feld != ""   feld > 0   feld >= "…"   feld <= "…"   1=1
// verknüpft mit &&. Alles andere lässt der Harness bewusst scheitern, statt
// still ein falsches Ergebnis zu liefern.
// Erkennt die Datumsformen, die in diesem Projekt vorkommen, und gibt sie als
// Millisekunden zurück — sonst null.
//
// Bewusst eng gefasst: Nur "JJJJ-MM-TT" mit optionaler Uhrzeit, getrennt durch
// "T" oder Leerzeichen. Damit bleiben SKUs, Namen und andere Texte, die zufällig
// mit einer Zahl beginnen, vom Datumsvergleich unberührt.
const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?)?Z?$/;

function asTimestamp(value) {
  const s = `${value}`.trim();
  if (!TIMESTAMP_RE.test(s)) return null;
  // Trenner vereinheitlichen, damit beide Schreibweisen denselben Zeitpunkt
  // ergeben. Ohne Zeitzonenangabe liest PocketBase UTC — "Z" ergänzen, sonst
  // legt Node die lokale Zeitzone zugrunde und der Vergleich verschiebt sich.
  let normalized = s.replace(' ', 'T');
  if (!normalized.endsWith('Z')) normalized += 'Z';
  const ms = Date.parse(normalized);
  return isNaN(ms) ? null : ms;
}

function matchesFilter(record, filter) {
  const expr = `${filter || ''}`.trim();
  if (expr === '' || expr === '1=1') return true;

  return expr.split('&&').every((partRaw) => {
    const part = partRaw.trim();
    const m = part.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*(>=|<=|!=|=|>|<)\s*(.+)$/);
    if (!m) throw new Error(`Harness: Filter nicht unterstützt: ${part}`);

    const [, field, op, rawValue] = m;
    const value = rawValue.trim().replace(/^"(.*)"$/, '$1');
    const actual = record.get(field);

    // Zeitstempel als Zeitpunkt vergleichen, nicht als Text.
    //
    // Die Hooks speichern mit `toISOString()` (Trenner "T"), bauen Filtergrenzen
    // aber mit `.replace('T', ' ')` — so, wie PocketBase Datumsfelder schreibt.
    // Als Zeichenketten verglichen gewinnt der gespeicherte Wert immer, sobald
    // der Datumsteil gleich ist: "T" ist 0x54, das Leerzeichen 0x20. PocketBase
    // vergleicht Datumsfelder als Datum und liegt damit richtig; der Harness
    // muss das nachbilden, sonst ist ein Test an der Tagesgrenze rot, obwohl
    // die Produktion stimmt.
    const aTime = asTimestamp(actual);
    const bTime = asTimestamp(value);
    if (aTime !== null && bTime !== null) {
      switch (op) {
        case '=':
          return aTime === bTime;
        case '!=':
          return aTime !== bTime;
        case '>':
          return aTime > bTime;
        case '<':
          return aTime < bTime;
        case '>=':
          return aTime >= bTime;
        case '<=':
          return aTime <= bTime;
        default:
          throw new Error(`Harness: Operator nicht unterstützt: ${op}`);
      }
    }

    switch (op) {
      case '=':
        return `${actual}` === value;
      case '!=':
        return `${actual}` !== value;
      case '>':
        return Number(actual) > Number(value);
      case '<':
        return Number(actual) < Number(value);
      case '>=':
        return isNaN(Number(value)) ? `${actual}` >= value : Number(actual) >= Number(value);
      case '<=':
        return isNaN(Number(value)) ? `${actual}` <= value : Number(actual) <= Number(value);
      default:
        throw new Error(`Harness: Operator nicht unterstützt: ${op}`);
    }
  });
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
// ihre Eingabereihenfolge. Genau das braucht es hier.
function applySort(rows, sort) {
  const s = `${sort || ''}`.trim();
  if (!s) return rows;
  const desc = s.startsWith('-');
  const field = desc ? s.slice(1) : s;
  return rows.slice().sort((a, b) => {
    const av = a.get(field);
    const bv = b.get(field);
    if (av === bv) return 0;
    const cmp = av > bv ? 1 : -1;
    return desc ? -cmp : cmp;
  });
}

// ── DAO ────────────────────────────────────────────────────────
class FakeDao {
  constructor(store) {
    this.store = store; // { sammlung: [FakeRecord, …] }
    this.saved = [];    // Reihenfolge der Schreibvorgänge, für Assertions
    this.deleted = [];
  }

  _rows(collection) {
    if (!this.store[collection]) this.store[collection] = [];
    return this.store[collection];
  }

  findCollectionByNameOrId(name) {
    return { name, id: `col_${name}` };
  }

  findRecordById(collection, id) {
    const hit = this._rows(collection).find((r) => r.id === `${id}`);
    // PocketBase wirft, wenn nichts gefunden wird — die Hooks verlassen sich
    // darauf und fangen den Fehler ab.
    if (!hit) throw new Error(`Kein Datensatz ${collection}/${id}`);
    return hit;
  }

  findFirstRecordByFilter(collection, filter) {
    const hit = this._rows(collection).find((r) => matchesFilter(r, filter));
    if (!hit) throw new Error(`Kein Datensatz in ${collection} für ${filter}`);
    return hit;
  }

  findFirstRecordByData(collection, field, value) {
    const hit = this._rows(collection).find((r) => `${r.get(field)}` === `${value}`);
    if (!hit) throw new Error(`Kein Datensatz in ${collection} mit ${field}=${value}`);
    return hit;
  }

  // PocketBase nimmt fünf Parameter, der Harness nahm bisher vier: `offset`
  // fiel still unter den Tisch. Alle Aufrufe in den Hooks übergeben ihn (heute
  // durchgehend mit 0), und ein Test, der sich auf Blätterung verlässt, hätte
  // etwas anderes geprüft als die Produktion — grün, während die falsche Seite
  // gelesen wird. Deshalb wird er hier umgesetzt statt ignoriert.
  //
  // Reihenfolge wie in PocketBase: erst filtern, dann sortieren, dann `offset`
  // überspringen, dann auf `limit` kürzen.
  // PocketBase nimmt fünf Parameter, der Harness nahm bisher vier: `offset`
  // fiel still unter den Tisch. Alle Aufrufe in den Hooks übergeben ihn (heute
  // durchgehend mit 0), und ein Test, der sich auf Blätterung verlässt, hätte
  // etwas anderes geprüft als die Produktion — grün, während die falsche Seite
  // gelesen wird. Deshalb wird er hier umgesetzt statt ignoriert.
  //
  // Reihenfolge wie in PocketBase: erst filtern, dann sortieren, dann `offset`
  // überspringen, dann auf `limit` kürzen.
  findRecordsByFilter(collection, filter, sort, limit, offset) {
    const rows = applySort(
      this._rows(collection).filter((r) => matchesFilter(r, filter)),
      sort
    );
    const skip = Number(offset || 0);
    if (!Number.isInteger(skip) || skip < 0) {
      // Bewusst scheitern statt still die erste Seite liefern.
      throw new Error(`Harness: offset muss eine nicht-negative ganze Zahl sein, war: ${offset}`);
    }
    const page = skip > 0 ? rows.slice(skip) : rows;
    return limit && limit > 0 ? page.slice(0, limit) : page;
  }

  saveRecord(record) {
    const rows = this._rows(record.collectionName);
    if (!rows.includes(record)) rows.push(record);
    this.saved.push(record);
    return record;
  }

  deleteRecord(record) {
    const rows = this._rows(record.collectionName);
    const i = rows.indexOf(record);
    if (i >= 0) rows.splice(i, 1);
    this.deleted.push(record);
  }
}

// ── Umgebung aufbauen und Hook laden ───────────────────────────
//
// store: { sammlung: [ {feld: wert}, … ] } — die Datensätze, die es geben soll.
// opts.realPush: lib/push.js echt laden statt ersetzen (siehe require unten).
// Rückgabe: { routes, crons, dao, records, call, runCron, ApiError }
function loadHook(hookFile, store = {}, opts = {}) {
  const realPush = !!opts.realPush;
  const records = {};
  const seeded = {};
  for (const [collection, rows] of Object.entries(store)) {
    seeded[collection] = rows.map((row) => {
      const rec = new FakeRecord(collection, row);
      // Zugriff über den Namen, wenn einer vergeben wurde: records.store, …
      if (row.__name) records[row.__name] = rec;
      return rec;
    });
  }

  const dao = new FakeDao(seeded);
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

    // Record-Konstruktor: new Record(collection) — die Hooks setzen die Felder
    // danach einzeln per set().
    Record: function Record(collection) {
      return new FakeRecord(collection.name, {});
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
    store: seeded,

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
    // Reihenfolge, mit einem nachgebauten Ereignis.
    fireRecordHook(phase, collection, record, { authRecord = null, admin = null } = {}) {
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

    // Alle Datensätze einer Sammlung als einfache Objekte.
    rows(collection) {
      return (seeded[collection] || []).map((r) => r.data());
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

module.exports = { loadHook, FakeRecord, matchesFilter, HOOKS_DIR };
