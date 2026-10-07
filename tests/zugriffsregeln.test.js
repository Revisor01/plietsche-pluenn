// Zugriffsregeln und Türgeheimnis — geprüft am Schema, das eine Instanz
// wirklich bekommt.
//
// Warum hier Migrationen geprüft werden, obwohl es sonst um Hooks geht:
// Die Zugriffsregel IST die Sicherheitsmaßnahme. Steht sie falsch, ist ein
// Weg offen, und kein Hook-Test fällt deswegen um. In PocketBase heißt der
// Leerstring bei listRule/viewRule „alle, auch ohne Anmeldung", null heißt
// „nur Superuser". Der Unterschied ist eine Zeichenkette.
//
// Quelle der Wahrheit ist seit PocketBase 0.40 der Sammlungs-Snapshot
// (pocketbase/pb_migrations/*_collections_snapshot.js) samt den Migrationen
// danach. Diese Datei führt sie alle in einer kleinen nachgebauten Umgebung
// aus — wie tests/harness.js, nur dass hier die Regeln und die angelegten
// Datensätze festgehalten werden, die der Harness nicht braucht.
//
// Bis 26.09.2026 standen hier (und in store-secret-migration.test.js) Tests
// für die drei 0.22-Migrationen, die diese Zusagen eingeführt haben
// (1782690000_store_secret_collection, 1782710000_tighten_read_rules).
// Entfallen sind die Tests, die nur deren MECHANIK prüften: Rückbau über
// down(), zweiter Durchlauf, Übertragung des Türgeheimnisses aus dem alten
// Feld store.checkin_qr_secret. Diese Migrationen liegen jetzt als Historie
// in pocketbase/pb_migrations_022/ und laufen auf keiner Instanz mehr: Die
// Produktion hat sie längst angewendet (samt Übertragung des Geheimnisses),
// neue Instanzen starten mit dem Snapshot. Geblieben sind die ZUSAGEN — der
// Endstand der Regeln, ihre Auswertung für konkrete Konten und Datensätze,
// und dass eine frische Installation ihr Türgeheimnis nur in store_secrets
// ablegt.
//
// Gegen das echte Binary über HTTP prüft dasselbe
// tests/integration/zugriffsregeln.test.js.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
const fs = require_('node:fs');
const path = require_('node:path');
const vm = require_('node:vm');
const crypto = require_('node:crypto');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'pocketbase', 'pb_migrations');

// ── Nachgebaute Migrationsumgebung ─────────────────────────────
//
// Führt den Snapshot und alle Migrationen danach aus, in Dateinamen-Reihenfolge
// wie PocketBase. Nachgebaut ist nur, was die Migrationen aufrufen; ein Aufruf,
// den es hier nicht gibt, wirft — lieber rot als still falsch.
//
// `vorher` legt Datensätze an, die schon vor dem ersten Lauf da sind (so sieht
// eine Instanz aus, die ihr Türgeheimnis längst hat).
function migrationFiles() {
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.js')).sort();
  const start = files.findIndex((f) => /_collections_snapshot\.js$/.test(f));
  if (start < 0) throw new Error('kein *_collections_snapshot.js in pocketbase/pb_migrations/');
  return files.slice(start);
}

function frischeInstallation(vorher = {}) {
  const collections = [];
  const rows = {};
  const zufall = [];

  for (const [name, list] of Object.entries(vorher)) rows[name] = list.map((d) => ({ _col: name, _data: { ...d } }));

  const mitFeldzugriff = (col) => {
    Object.defineProperty(col.fields, 'getByName', {
      value: (n) => col.fields.find((f) => f.name === n) || null,
    });
    Object.defineProperty(col.fields, 'add', {
      value: (...fs_) => {
        for (const f of fs_) {
          const i = col.fields.findIndex((x) => x.name === f.name);
          if (i >= 0) col.fields[i] = f;
          else col.fields.push(f);
        }
      },
    });
    Object.defineProperty(col.fields, 'removeByName', {
      value: (n) => {
        const i = col.fields.findIndex((x) => x.name === n);
        if (i >= 0) col.fields.splice(i, 1);
      },
    });
    if (col.type === 'auth') {
      // Vorgaben einer FRISCHEN 0.40-Installation (gemessen 26.09.2026,
      // siehe 1790500200_settings.js). Der Snapshot bringt sie bewusst nicht mit.
      col.authAlert = col.authAlert || { enabled: true };
      col.authToken = col.authToken || { duration: 432000 };
      col.verificationToken = col.verificationToken || { duration: 86400 };
    }
    return col;
  };

  const find = (nameOrId) => {
    const c = collections.find((x) => x.name === nameOrId || x.id === nameOrId);
    if (!c) throw new Error('sql: no rows in result set');
    return c;
  };

  class Record {
    constructor(col) {
      this._col = col.name;
      this._data = {};
    }
    set(k, v) {
      this._data[k] = v;
    }
    get(k) {
      return this._data[k] === undefined ? '' : this._data[k];
    }
  }

  const app = {
    findCollectionByNameOrId: find,
    importCollections: (list, deleteMissing) => {
      if (deleteMissing !== false) throw new Error('importCollections nur mit deleteMissing=false erwartet');
      for (const raw of list) {
        const col = mitFeldzugriff(JSON.parse(JSON.stringify(raw)));
        const i = collections.findIndex((x) => x.id === col.id || x.name === col.name);
        if (i >= 0) collections[i] = col;
        else collections.push(col);
      }
    },
    findFirstRecordByFilter: (name, filter) => {
      if (filter !== '1=1') throw new Error(`Filter hier nicht nachgebaut: ${filter}`);
      find(name);
      const list = rows[name] || [];
      if (!list.length) throw new Error('sql: no rows in result set');
      return list[0];
    },
    save: (model) => {
      if (model instanceof Record) {
        (rows[model._col] = rows[model._col] || []).push(model);
      } else if (!collections.includes(model)) {
        throw new Error(`save: unbekanntes Modell ${model && model.name}`);
      }
    },
  };

  const sandbox = {
    console,
    Object,
    Array,
    String,
    Number,
    Error,
    JSON,
    Record,
    // Die typisierten Feldklassen der JSVM (new BoolField({...}) usw.).
    ...Object.fromEntries(
      Object.entries({
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
      }).map(([cls, type]) => [
        cls,
        function Feld(data) {
          return Object.assign({}, data, { type });
        },
      ])
    ),
    $security: {
      randomString: (n) => {
        const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const s = Array.from(crypto.randomBytes(n), (b) => alphabet[b % alphabet.length]).join('');
        zufall.push(s);
        return s;
      },
    },
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
    up(app);
  }

  const sammlung = (name) => find(name);
  const zeilen = (name) => (rows[name] || []).map((r) => ({ ...r._data }));
  return { sammlung, zeilen, zufall };
}

// ── Regel-Auswertung ───────────────────────────────────────────
// Wertet einen PocketBase-Regelausdruck aus, so weit die Regeln dieses Repos
// ihn nutzen: Vergleiche über Datensatzfelder und @request.auth.*, verknüpft
// mit &&, || und Klammern. Alles, was nicht erkannt wird, wirft — still
// falsch zu antworten wäre schlimmer als rot zu werden.
//
// PocketBase bindet && stärker als ||, wie in den meisten Sprachen. Genau
// diese Rangfolge macht den Unterschied zwischen „angemeldet UND freigegeben"
// und „freigegeben, egal ob angemeldet".
//
// `auth` ist das angemeldete Konto ({ id, role }) oder null für unangemeldet.
// Superuser umgehen die Regeln ganz; das bildet `darf()` nicht ab — ein
// Konto mit role "admin" ist KEIN Superuser.
function darf(regel, datensatz, auth) {
  // null heißt in PocketBase: nur Superuser, kein Weg über die API.
  if (regel === null || regel === undefined) return false;
  const expr = `${regel}`.trim();
  // Der Leerstring heißt: für alle offen, auch ohne Anmeldung.
  if (expr === '') return true;

  // Klammerbewusstes Zerlegen an einem Verknüpfer der obersten Ebene.
  const teile = (text, verknuepfer) => {
    const out = [];
    let tiefe = 0;
    let start = 0;
    for (let i = 0; i < text.length; i += 1) {
      const c = text[i];
      if (c === '(') tiefe += 1;
      else if (c === ')') tiefe -= 1;
      else if (tiefe === 0 && text.startsWith(verknuepfer, i)) {
        out.push(text.slice(start, i));
        i += verknuepfer.length - 1;
        start = i + 1;
      }
    }
    out.push(text.slice(start));
    return out.map((t) => t.trim());
  };

  const wert = (ausdruck) => {
    if (ausdruck === '@request.auth.id') return auth ? auth.id : '';
    if (ausdruck === '@request.auth.role') return auth ? `${auth.role}` : '';
    if (/^@/.test(ausdruck)) throw new Error(`Unbekannter Platzhalter: ${ausdruck}`);
    if (/^".*"$/.test(ausdruck)) return ausdruck.slice(1, -1);
    // Sonst: ein Feld des Datensatzes.
    if (!(ausdruck in datensatz)) throw new Error(`Feld fehlt im Testdatensatz: ${ausdruck}`);
    return `${datensatz[ausdruck]}`;
  };

  const auswerten = (text) => {
    const t = text.trim();

    // || bindet schwächer als && — deshalb zuerst danach zerlegen.
    const oder = teile(t, '||');
    if (oder.length > 1) return oder.some(auswerten);

    const und = teile(t, '&&');
    if (und.length > 1) return und.every(auswerten);

    // Ein einzelner geklammerter Ausdruck: Klammern abstreifen.
    if (t.startsWith('(') && t.endsWith(')')) return auswerten(t.slice(1, -1));

    const m = t.match(/^(\S+)\s*(!=|=)\s*(.+)$/);
    if (!m) throw new Error(`Regel nicht auswertbar: ${t}`);
    const [, links, op, rechts] = m;
    const a = wert(links);
    const b = wert(rechts.trim());
    return op === '=' ? a === b : a !== b;
  };

  return auswerten(expr);
}

// Konten für die Prüfung.
const BESUCHER = { id: 'u_besucher', role: 'visitor' };
const FREMDER = { id: 'u_fremd', role: 'visitor' };
const HELFER = { id: 'u_helfer', role: 'volunteer' };
const ADMIN = { id: 'u_admin', role: 'admin' };
const UNANGEMELDET = null;

// Einmal für alle Regel-Tests: die Regeln hängen nicht vom Datenbestand ab.
const schema = frischeInstallation();
const regeln = (name) => {
  const c = schema.sammlung(name);
  return {
    listRule: c.listRule,
    viewRule: c.viewRule,
    createRule: c.createRule,
    updateRule: c.updateRule,
    deleteRule: c.deleteRule,
  };
};

describe('Die Regel-Auswertung selbst', () => {
  // Der Prüfer ist Testwerkzeug — steht er falsch, gehen die Regel-Tests grün
  // durch, obwohl die Regel offen ist. Deshalb bekommt er eigene Proben.
  const satz = { status: 'approved', created_by: 'u_besucher' };

  it('unterscheidet null von Leerstring', () => {
    expect(darf(null, satz, ADMIN)).toBe(false);
    expect(darf('', satz, UNANGEMELDET)).toBe(true);
  });

  it('bindet && stärker als ||', () => {
    const regel = '@request.auth.id != "" && status = "approved" || @request.auth.role = "admin"';
    expect(darf(regel, satz, BESUCHER)).toBe(true);
    expect(darf(regel, satz, UNANGEMELDET)).toBe(false);
    expect(darf(regel, { status: 'pending', created_by: '' }, ADMIN)).toBe(true);
  });

  it('achtet auf Klammern', () => {
    const geklammert = '(@request.auth.id != "" && status = "approved")';
    expect(darf(geklammert, satz, BESUCHER)).toBe(true);
    expect(darf(geklammert, satz, UNANGEMELDET)).toBe(false);
  });

  it('wirft bei allem, was es nicht versteht', () => {
    expect(() => darf('status ~ "app"', satz, BESUCHER)).toThrow();
    expect(() => darf('@request.headers.x = "1"', satz, BESUCHER)).toThrow();
    expect(() => darf('gibtsnicht = "x"', satz, BESUCHER)).toThrow();
  });
});

describe('Türgeheimnis: store_secrets', () => {
  it('ist für jeden Weg über die API gesperrt', () => {
    // Verbotener Fall. null heißt „nur Superuser"; der Leerstring wäre
    // „alle, auch unangemeldet" — der kritische Befund vom August.
    expect(regeln('store_secrets')).toEqual({
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
    });
  });

  it('bleibt auch einem Konto mit role "admin" verschlossen', () => {
    // Die Admin-Rolle ist ein Feld am Konto, kein Superuser. Das Türgeheimnis
    // liest nur der Scan-Hook serverseitig.
    const r = regeln('store_secrets');
    for (const konto of [UNANGEMELDET, BESUCHER, HELFER, ADMIN]) {
      expect(darf(r.listRule, {}, konto)).toBe(false);
      expect(darf(r.viewRule, {}, konto)).toBe(false);
    }
  });

  it('hat das Feld checkin_qr_secret, in das der Scan-Hook schaut', () => {
    const f = schema.sammlung('store_secrets').fields.getByName('checkin_qr_secret');
    expect(f.type).toBe('text');
  });
});

describe('Laden: store', () => {
  it('ist nur für Angemeldete lesbar', () => {
    const r = regeln('store');
    expect(r.listRule).toBe('@request.auth.id != ""');
    expect(r.viewRule).toBe('@request.auth.id != ""');
    // Verbotener Fall: unangemeldet.
    expect(darf(r.listRule, {}, UNANGEMELDET)).toBe(false);
    expect(darf(r.viewRule, {}, UNANGEMELDET)).toBe(false);
    // Erlaubter Fall: Öffnungszeiten, Adresse und Punktwerte für die App.
    expect(darf(r.listRule, {}, BESUCHER)).toBe(true);
  });

  it('lässt nur das Team schreiben', () => {
    const r = regeln('store');
    expect(r.createRule).toBe('@request.auth.role = "admin"');
    expect(r.updateRule).toBe('@request.auth.role = "admin"');
    expect(r.deleteRule).toBe('@request.auth.role = "admin"');
    expect(darf(r.updateRule, {}, BESUCHER)).toBe(false);
    expect(darf(r.updateRule, {}, HELFER)).toBe(false);
  });
});

describe('Frische Installation: wo das Türgeheimnis landet', () => {
  it('legt genau ein zufälliges Geheimnis in store_secrets an', () => {
    const inst = frischeInstallation();
    const secrets = inst.zeilen('store_secrets');
    expect(secrets).toHaveLength(1);
    expect(secrets[0].checkin_qr_secret).toMatch(/^[A-Za-z0-9]{32}$/);
    // Es stammt aus $security.randomString — kein fester Wert im Repo.
    expect(inst.zufall).toEqual([secrets[0].checkin_qr_secret]);
  });

  it('legt KEIN Geheimnis im lesbaren Laden-Datensatz ab', () => {
    const inst = frischeInstallation();
    const stores = inst.zeilen('store');
    expect(stores).toHaveLength(1);
    expect(stores[0].name).toBe('Plietsche Plünn');
    // Nicht gesetzt — weder das Geheimnis noch sonst ein Wert.
    expect('checkin_qr_secret' in stores[0]).toBe(false);
  });

  it('würfelt je Installation neu', () => {
    const a = frischeInstallation().zeilen('store_secrets')[0].checkin_qr_secret;
    const b = frischeInstallation().zeilen('store_secrets')[0].checkin_qr_secret;
    expect(a).not.toBe(b);
  });

  it('tauscht ein vorhandenes Geheimnis beim Deploy nicht aus', () => {
    // Die Produktion hat ihr Geheimnis längst. Ein Deploy darf es nicht
    // ersetzen — sonst wäre jeder Tür-QR-Code danach ungültig.
    const inst = frischeInstallation({
      store: [{ name: 'Laden in Produktion' }],
      store_secrets: [{ checkin_qr_secret: 'vorhandenes-geheimnis' }],
    });
    expect(inst.zeilen('store_secrets')).toEqual([{ checkin_qr_secret: 'vorhandenes-geheimnis' }]);
    expect(inst.zeilen('store')).toEqual([{ name: 'Laden in Produktion' }]);
    expect(inst.zufall).toEqual([]);
  });
});

describe('Besuche: visits', () => {
  it('lässt niemanden Besuche über die API anlegen', () => {
    // Verbotener Fall: Besuche entstehen nur im Scan-Hook. Jeder Wert außer
    // null — auch der Leerstring — wäre ein Weg, sich Punkte selbst zu bauen.
    const r = regeln('visits');
    expect(r.createRule).toBeNull();
    expect(r.updateRule).toBeNull();
    expect(r.deleteRule).toBeNull();
    for (const konto of [BESUCHER, HELFER, ADMIN]) {
      expect(darf(r.createRule, { user: konto.id }, konto)).toBe(false);
    }
  });

  it('zeigt eigene Besuche, fremde nicht', () => {
    const r = regeln('visits');
    expect(r.listRule).toBe('user = @request.auth.id || @request.auth.role = "admin"');
    expect(r.viewRule).toBe(r.listRule);
    expect(darf(r.listRule, { user: BESUCHER.id }, BESUCHER)).toBe(true);
    expect(darf(r.listRule, { user: FREMDER.id }, BESUCHER)).toBe(false);
    expect(darf(r.viewRule, { user: FREMDER.id }, BESUCHER)).toBe(false);
    expect(darf(r.listRule, { user: FREMDER.id }, HELFER)).toBe(false);
    expect(darf(r.listRule, { user: FREMDER.id }, UNANGEMELDET)).toBe(false);
    expect(darf(r.viewRule, { user: FREMDER.id }, ADMIN)).toBe(true);
  });
});

describe('Punkteverlauf: points_log', () => {
  it('zeigt eigene Buchungen, fremde nicht', () => {
    const r = regeln('points_log');
    expect(r.listRule).toBe('user = @request.auth.id || @request.auth.role = "admin"');
    expect(r.viewRule).toBe(r.listRule);
    expect(darf(r.listRule, { user: BESUCHER.id }, BESUCHER)).toBe(true);
    expect(darf(r.listRule, { user: FREMDER.id }, BESUCHER)).toBe(false);
    expect(darf(r.viewRule, { user: FREMDER.id }, BESUCHER)).toBe(false);
    expect(darf(r.listRule, { user: FREMDER.id }, UNANGEMELDET)).toBe(false);
    expect(darf(r.listRule, { user: FREMDER.id }, ADMIN)).toBe(true);
  });

  it('lässt niemanden Buchungen über die API schreiben', () => {
    const r = regeln('points_log');
    expect(r.createRule).toBeNull();
    expect(r.updateRule).toBeNull();
    expect(r.deleteRule).toBeNull();
  });
});

describe('Aktivitätsprofile: action_counts', () => {
  it('gibt fremde Teilnahmezahlen nicht heraus', () => {
    // Verbotener Fall: So war es gemessen — ein Besucherkonto bekam alle
    // Zeilen der Instanz samt fremder Nutzer-ID.
    const r = regeln('action_counts');
    const fremd = { user: FREMDER.id };
    expect(darf(r.listRule, fremd, BESUCHER)).toBe(false);
    expect(darf(r.viewRule, fremd, BESUCHER)).toBe(false);
    expect(darf(r.listRule, fremd, HELFER)).toBe(false);
  });

  it('lässt eigene Teilnahmezahlen und den Admin-Blick zu', () => {
    const r = regeln('action_counts');
    expect(darf(r.listRule, { user: BESUCHER.id }, BESUCHER)).toBe(true);
    expect(darf(r.viewRule, { user: BESUCHER.id }, BESUCHER)).toBe(true);
    expect(darf(r.listRule, { user: FREMDER.id }, ADMIN)).toBe(true);
  });

  it('lässt niemanden über die API schreiben', () => {
    const r = regeln('action_counts');
    expect(r.createRule).toBeNull();
    expect(r.updateRule).toBeNull();
    expect(r.deleteRule).toBeNull();
  });
});

describe('Einreichungen und Standortangaben: items', () => {
  // Die Datensätze bilden nach, was in der Instanz steht.
  const fremdePending = { status: 'pending', created_by: FREMDER.id };
  // Freigegeben, bleibt aber bei der Familie zu Hause; die Privatadresse
  // steht im Feld `location`.
  const fremdesExternesTeil = { status: 'approved', created_by: FREMDER.id };
  const freigegeben = { status: 'approved', created_by: HELFER.id };
  const altbestand = { status: '', created_by: '' };
  const eigenePending = { status: 'pending', created_by: BESUCHER.id };
  const fremdArchiviert = { status: 'archived', created_by: FREMDER.id };

  it('hält fremde Einreichungen von Besucher:innen fern', () => {
    const r = regeln('items');
    expect(darf(r.listRule, fremdePending, BESUCHER)).toBe(false);
    expect(darf(r.viewRule, fremdePending, BESUCHER)).toBe(false);
    expect(darf(r.listRule, fremdArchiviert, BESUCHER)).toBe(false);
  });

  it('lässt niemanden unangemeldet an den Bestand', () => {
    const r = regeln('items');
    expect(darf(r.listRule, freigegeben, UNANGEMELDET)).toBe(false);
    expect(darf(r.listRule, altbestand, UNANGEMELDET)).toBe(false);
  });

  it('zeigt freigegebene Teile und den Altbestand jedem angemeldeten Konto', () => {
    // Laden-Tab und „neu im Laden"; der Altbestand stammt aus der Zeit vor
    // dem status-Feld und steht teils im Schaufenster.
    const r = regeln('items');
    expect(darf(r.listRule, freigegeben, BESUCHER)).toBe(true);
    expect(darf(r.viewRule, freigegeben, BESUCHER)).toBe(true);
    expect(darf(r.listRule, altbestand, BESUCHER)).toBe(true);
  });

  it('zeigt eigene Einreichungen in jedem Status', () => {
    const r = regeln('items');
    expect(darf(r.listRule, eigenePending, BESUCHER)).toBe(true);
    expect(darf(r.listRule, { status: 'archived', created_by: BESUCHER.id }, BESUCHER)).toBe(true);
  });

  it('zeigt dem Team weiterhin alles', () => {
    const r = regeln('items');
    for (const konto of [HELFER, ADMIN]) {
      expect(darf(r.listRule, fremdePending, konto)).toBe(true);
      expect(darf(r.listRule, fremdesExternesTeil, konto)).toBe(true);
      expect(darf(r.listRule, fremdArchiviert, konto)).toBe(true);
    }
  });

  it('setzt list- und viewRule auf denselben Ausdruck', () => {
    // Sonst wäre über den Einzelabruf zu bekommen, was die Liste verbirgt.
    const r = regeln('items');
    expect(r.viewRule).toBe(r.listRule);
  });

  it('schreibt den Regelausdruck im Wortlaut fest', () => {
    // Die Klammern um den Anmelde-Zweig trennen die Regel von einer Öffnung,
    // und sie gehen beim Umformulieren als Erstes verloren.
    expect(regeln('items').listRule).toBe(
      '(@request.auth.id != "" && (status = "approved" || status = "" ||' +
        ' created_by = @request.auth.id))' +
        ' || @request.auth.role = "volunteer" || @request.auth.role = "admin"'
    );
  });

  it('lässt Einreichen offen und Freigeben beim Team', () => {
    const r = regeln('items');
    expect(r.createRule).toBe('@request.auth.id != ""');
    expect(r.updateRule).toBe('@request.auth.role = "volunteer" || @request.auth.role = "admin"');
    expect(r.deleteRule).toBe('@request.auth.role = "admin"');
    expect(darf(r.updateRule, eigenePending, BESUCHER)).toBe(false);
  });
});

describe('Push-Nachrichten: push_messages', () => {
  it('liegen ganz beim Team', () => {
    const r = regeln('push_messages');
    for (const regel of Object.values(r)) expect(regel).toBe('@request.auth.role = "admin"');
    expect(darf(r.listRule, {}, BESUCHER)).toBe(false);
    expect(darf(r.listRule, {}, HELFER)).toBe(false);
    expect(darf(r.listRule, {}, ADMIN)).toBe(true);
  });
});
