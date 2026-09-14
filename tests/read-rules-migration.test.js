// Tests für die Migration, die drei Lesewege zumacht: selbstgebaute Besuche,
// fremde Aktivitätsprofile, fremde Einreichungen samt Standortangabe.
//
// Warum hier eine Migration getestet wird, obwohl es sonst um Hooks geht:
// Die Zugriffsregel IST die Sicherheitsmaßnahme. Steht sie falsch, ist der
// Weg wieder offen, und kein Hook-Test fällt deswegen um — dieselbe
// Begründung wie in store-secret-migration.test.js.
//
// Zwei Ebenen werden geprüft:
//   1. Der Endstand der Regeln nach der Migration (der Wortlaut).
//   2. Was die Regel für konkrete Konten und Datensätze bedeutet — dafür
//      wertet `darf()` den Regelausdruck gegen einen Datensatz und ein
//      angemeldetes Konto aus. Ein Wortlaut-Vergleich allein würde nicht
//      zeigen, ob die Regel auch das Richtige durchlässt.

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
  '1782710000_tighten_read_rules.js'
);

// ── Nachgebaute Migrationsumgebung ─────────────────────────────
// Der Stand VOR der Migration, so wie ihn die laufende Instanz am 14.09.2026
// zeigte (als Superuser über /api/collections gelesen).
function run() {
  const collections = {
    visits: {
      name: 'visits',
      listRule: 'user = @request.auth.id || @request.auth.role = "admin"',
      viewRule: 'user = @request.auth.id || @request.auth.role = "admin"',
      createRule: 'user = @request.auth.id',
      updateRule: null,
      deleteRule: null,
    },
    action_counts: {
      name: 'action_counts',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: null,
      updateRule: null,
      deleteRule: null,
    },
    items: {
      name: 'items',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.role = "volunteer" || @request.auth.role = "admin"',
      deleteRule: '@request.auth.role = "admin"',
    },
  };

  let up = null;
  let down = null;

  const sandbox = {
    console,
    Object,
    Array,
    String,
    Error,
    JSON,
    Dao: class Dao {
      findCollectionByNameOrId(name) {
        const col = collections[name];
        if (!col) throw new Error(`Keine Sammlung ${name}`);
        return col;
      }
      saveCollection(col) {
        collections[col.name] = col;
        return col;
      }
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

  return { collections, up: () => up({}), down: () => down({}) };
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

describe('Die Regel-Auswertung selbst', () => {
  // Der Prüfer ist Testwerkzeug — steht er falsch, gehen die Regel-Tests grün
  // durch, obwohl die Regel offen ist. Deshalb bekommt er eigene Proben.
  const satz = { status: 'approved', created_by: 'u_besucher' };

  it('unterscheidet null von Leerstring', () => {
    expect(darf(null, satz, ADMIN)).toBe(false);
    expect(darf('', satz, UNANGEMELDET)).toBe(true);
  });

  it('bindet && stärker als ||', () => {
    // Ohne diese Rangfolge wäre 'angemeldet && freigegeben || Team' etwas
    // anderes, als PocketBase daraus liest.
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

describe('Migration: selbstgebaute Besuche', () => {
  let env;
  beforeEach(() => {
    env = run();
    env.up();
  });

  it('lässt niemanden mehr Besuche über die API anlegen', () => {
    // Verbotener Fall. null heißt „nur Superuser"; jeder andere Wert — auch
    // der Leerstring — wäre ein Weg über die REST-API.
    expect(env.collections.visits.createRule).toBeNull();

    const besuch = { user: BESUCHER.id };
    expect(darf(env.collections.visits.createRule, besuch, BESUCHER)).toBe(false);
    expect(darf(env.collections.visits.createRule, besuch, ADMIN)).toBe(false);
    expect(darf(env.collections.visits.createRule, besuch, HELFER)).toBe(false);
  });

  it('lässt Besucher:innen ihre eigenen Besuche weiterhin lesen', () => {
    // Erlaubter Fall: Die Punkte-Übersicht zeigt den eigenen Verlauf.
    const eigener = { user: BESUCHER.id };
    const fremder = { user: FREMDER.id };
    expect(darf(env.collections.visits.listRule, eigener, BESUCHER)).toBe(true);
    expect(darf(env.collections.visits.listRule, fremder, BESUCHER)).toBe(false);
    expect(darf(env.collections.visits.viewRule, fremder, ADMIN)).toBe(true);
  });

  it('lässt die übrigen Regeln der Besuche unangetastet', () => {
    expect(env.collections.visits.listRule).toBe(
      'user = @request.auth.id || @request.auth.role = "admin"'
    );
    expect(env.collections.visits.updateRule).toBeNull();
    expect(env.collections.visits.deleteRule).toBeNull();
  });
});

describe('Migration: Aktivitätsprofile aus action_counts', () => {
  let env;
  beforeEach(() => {
    env = run();
    env.up();
  });

  it('gibt fremde Teilnahmezahlen nicht mehr heraus', () => {
    // Verbotener Fall: Genau das war gemessen — ein Besucherkonto bekam
    // beide Zeilen der Instanz samt fremder Nutzer-ID.
    const fremd = { user: FREMDER.id };
    expect(darf(env.collections.action_counts.listRule, fremd, BESUCHER)).toBe(false);
    expect(darf(env.collections.action_counts.viewRule, fremd, BESUCHER)).toBe(false);
    expect(darf(env.collections.action_counts.listRule, fremd, HELFER)).toBe(false);
  });

  it('lässt eigene Teilnahmezahlen und den Admin-Blick zu', () => {
    // Erlaubter Fall.
    const eigen = { user: BESUCHER.id };
    const fremd = { user: FREMDER.id };
    expect(darf(env.collections.action_counts.listRule, eigen, BESUCHER)).toBe(true);
    expect(darf(env.collections.action_counts.viewRule, eigen, BESUCHER)).toBe(true);
    expect(darf(env.collections.action_counts.listRule, fremd, ADMIN)).toBe(true);
  });

  it('lässt die Schreibseite zu, wie sie war', () => {
    expect(env.collections.action_counts.createRule).toBeNull();
    expect(env.collections.action_counts.updateRule).toBeNull();
    expect(env.collections.action_counts.deleteRule).toBeNull();
  });
});

describe('Migration: Einreichungen und Standortangaben', () => {
  let env;
  beforeEach(() => {
    env = run();
    env.up();
  });

  // Die Datensätze bilden nach, was in der Instanz steht.
  const fremdePendingMitAdresse = {
    status: 'pending',
    created_by: FREMDER.id,
  };
  const fremdesExternesTeil = {
    // Das gemessene Teil: freigegeben, bleibt aber bei der Familie zu Hause,
    // die Privatadresse steht im Feld `location`.
    status: 'approved',
    created_by: FREMDER.id,
  };
  const freigegeben = { status: 'approved', created_by: HELFER.id };
  const altbestand = { status: '', created_by: '' };
  const eigenePending = { status: 'pending', created_by: BESUCHER.id };
  const fremdArchiviert = { status: 'archived', created_by: FREMDER.id };

  it('hält fremde Einreichungen von Besucher:innen fern', () => {
    // Verbotener Fall: der Kern des Befunds. Eine fremde pending-Einreichung
    // darf ein Besucherkonto weder listen noch einzeln abrufen.
    expect(darf(env.collections.items.listRule, fremdePendingMitAdresse, BESUCHER)).toBe(false);
    expect(darf(env.collections.items.viewRule, fremdePendingMitAdresse, BESUCHER)).toBe(false);
  });

  it('hält fremde archivierte Teile von Besucher:innen fern', () => {
    expect(darf(env.collections.items.listRule, fremdArchiviert, BESUCHER)).toBe(false);
  });

  it('lässt niemanden unangemeldet an den Bestand', () => {
    expect(darf(env.collections.items.listRule, freigegeben, UNANGEMELDET)).toBe(false);
    expect(darf(env.collections.items.listRule, altbestand, UNANGEMELDET)).toBe(false);
  });

  it('zeigt freigegebene Teile weiterhin jedem angemeldeten Konto', () => {
    // Erlaubter Fall 1: der Laden-Tab und „neu im Laden".
    expect(darf(env.collections.items.listRule, freigegeben, BESUCHER)).toBe(true);
    expect(darf(env.collections.items.viewRule, freigegeben, BESUCHER)).toBe(true);
  });

  it('zeigt den Altbestand ohne status-Feld weiterhin', () => {
    // Erlaubter Fall 2: 15 Datensätze der Instanz stammen aus der Zeit vor
    // dem status-Feld, einer davon steht im Schaufenster. Ohne diese
    // Bedingung verschwände er dort — ein Funktionsfehler, kein Gewinn.
    expect(darf(env.collections.items.listRule, altbestand, BESUCHER)).toBe(true);
  });

  it('zeigt eigene Einreichungen in jedem Status', () => {
    // Erlaubter Fall 3: „meine Teile" zeigt auch, was noch zu prüfen ist.
    expect(darf(env.collections.items.listRule, eigenePending, BESUCHER)).toBe(true);
    expect(
      darf(env.collections.items.listRule, { status: 'archived', created_by: BESUCHER.id }, BESUCHER)
    ).toBe(true);
  });

  it('zeigt dem Team weiterhin alles', () => {
    // Erlaubter Fall 4: Freigabe-Liste und Bestandsansicht.
    for (const konto of [HELFER, ADMIN]) {
      expect(darf(env.collections.items.listRule, fremdePendingMitAdresse, konto)).toBe(true);
      expect(darf(env.collections.items.listRule, fremdesExternesTeil, konto)).toBe(true);
      expect(darf(env.collections.items.listRule, fremdArchiviert, konto)).toBe(true);
    }
  });

  it('lässt die Schreibregeln der Teile unangetastet', () => {
    // Einreichen bleibt für alle Angemeldeten offen, Freigeben beim Team.
    expect(env.collections.items.createRule).toBe('@request.auth.id != ""');
    expect(env.collections.items.updateRule).toBe(
      '@request.auth.role = "volunteer" || @request.auth.role = "admin"'
    );
    expect(env.collections.items.deleteRule).toBe('@request.auth.role = "admin"');
  });

  it('setzt list- und viewRule auf denselben Ausdruck', () => {
    // Sonst wäre über den Einzelabruf zu bekommen, was die Liste verbirgt.
    expect(env.collections.items.viewRule).toBe(env.collections.items.listRule);
  });

  it('schreibt den Regelausdruck im Wortlaut fest', () => {
    // Der Wortlaut gehört mit in den Test: Die Klammern um den
    // Anmelde-Zweig sind das, was die Regel von einer Öffnung trennt, und
    // sie gehen beim Umformulieren als Erstes verloren.
    expect(env.collections.items.listRule).toBe(
      '(@request.auth.id != "" && (status = "approved" || status = "" ||' +
        ' created_by = @request.auth.id))' +
        ' || @request.auth.role = "volunteer" || @request.auth.role = "admin"'
    );
  });
});

describe('Migration: Rückbau', () => {
  it('stellt alle drei Sammlungen auf den vorherigen Stand zurück', () => {
    const env = run();
    const vorher = JSON.parse(JSON.stringify(env.collections));
    env.up();
    env.down();
    expect(env.collections).toEqual(vorher);
  });
});
