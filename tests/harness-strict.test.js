// Prüft den Harness selbst: Wo er so streng ist wie PocketBase 0.22.21.
//
// Ein Audit hat den Harness gegen echtes PocketBase gemessen und zwei Stellen
// gefunden, an denen er gutmütiger war als das Original — Tests liefen grün,
// wo die Produktion scheitert:
//
//   T-5  Filter: leerer Filter, unbekanntes Feld und ein unquotierter Wert
//        rechts wurden still ausgewertet statt abgelehnt. Datumsfelder wurden
//        als Zeitpunkt statt als Text verglichen (siehe harness-time.test.js).
//   T-6  Speichern: saveRecord konnte nie scheitern — kein UNIQUE-Index, keine
//        unbekannten Sammlungen, kein Weg, einen Schreibfehler zu stellen.
//        Die Feldliste stand von Hand im Harness statt aus dem Schema.
//
// Jeder Fall hier ist ein Verhalten von PocketBase, das der Harness jetzt
// nachbildet, oder eine bewusste, im Harness begründete Abweichung.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const { loadHook, loadSchema, FakeRecord, matchesFilter } = createRequire(import.meta.url)('./harness.js');

function setup(store = {}) {
  return loadHook(
    'push.pb.js',
    Object.assign({ users: [{ __name: 'u', id: 'u1', role: 'visitor' }], push_devices: [], items: [] }, store)
  );
}

// ── T-5: Filter ────────────────────────────────────────────────

describe('Harness-Filter: was PocketBase ablehnt', () => {
  it('lehnt einen leeren Filter ab', () => {
    const h = setup({ items: [{ id: 'i1', sku: 'PP-0001', title: 'Jacke' }] });
    expect(() => h.dao.findRecordsByFilter('items', '', '', 0, 0)).toThrow(
      'invalid or empty filter expression'
    );
    expect(() => h.dao.findFirstRecordByFilter('items', '')).toThrow('invalid or empty filter expression');
  });

  it('lehnt einen Filter aus Leerzeichen ab', () => {
    const h = setup();
    expect(() => h.dao.findRecordsByFilter('items', '   ', '', 0, 0)).toThrow(
      'invalid or empty filter expression'
    );
  });

  it('lehnt ein unbekanntes Feld ab', () => {
    const h = setup({ items: [{ id: 'i1', sku: 'PP-0001', title: 'Jacke' }] });
    expect(() => h.dao.findRecordsByFilter('items', 'gibtsnicht = "1"', '', 0, 0)).toThrow(
      /invalid or empty filter expression.*gibtsnicht/
    );
  });

  it('lehnt einen kaputten Filter auch auf einer leeren Sammlung ab', () => {
    // PocketBase prüft den Filter, bevor es liest. Früher wertete der Harness
    // ihn nur je Zeile aus — auf einer leeren Sammlung fiel nichts auf.
    const h = setup();
    expect(h.rows('items')).toHaveLength(0);
    expect(() => h.dao.findRecordsByFilter('items', 'gibtsnicht = "1"', '', 0, 0)).toThrow(
      'invalid or empty filter expression'
    );
  });

  it('liest einen unquotierten Wert rechts als Feldnamen und lehnt ihn ab', () => {
    const h = setup({ items: [{ id: 'i1', sku: 'PP-0001', title: 'Jacke', status: 'pending' }] });
    expect(() => h.dao.findRecordsByFilter('items', 'status = pending', '', 0, 0)).toThrow(
      /invalid or empty filter expression.*pending/
    );
  });

  it('lehnt Operator ohne rechte Seite ab', () => {
    const h = setup();
    expect(() => h.dao.findRecordsByFilter('items', 'status =', '', 0, 0)).toThrow(
      'invalid or empty filter expression'
    );
  });

  it('lehnt einen Platzhalter ohne Wert ab', () => {
    const h = setup();
    expect(() => h.dao.findRecordsByFilter('items', 'status = {:s}', '', 0, 0)).toThrow(
      /invalid or empty filter expression.*\{:s\}/
    );
  });

  it('lehnt ab, was der Harness nicht nachbildet, statt still falsch zu antworten', () => {
    const h = setup();
    expect(() => h.dao.findRecordsByFilter('items', '@request.auth.id != ""', '', 0, 0)).toThrow(
      /Harness: Filter nicht unterstützt/
    );
    expect(() => h.dao.findRecordsByFilter('items', 'title ~ "Jac"', '', 0, 0)).toThrow(
      /Harness: Filter nicht unterstützt: Operator ~/
    );
  });
});

describe('Harness-Filter: was PocketBase annimmt', () => {
  const ITEMS = [
    { id: 'i1', sku: 'PP-0001', qr_code: 'PP-0001', title: 'Jacke', size: '38', points: 5, status: 'approved', is_showcase: true },
    { id: 'i2', sku: 'PP-0002', qr_code: 'ANDERS', title: 'Hose', size: 'M', points: 30, status: 'pending' },
  ];
  const ids = (rows) => rows.map((r) => r.id);

  it('nimmt 1=1 als „alles"', () => {
    const h = setup({ items: ITEMS });
    expect(ids(h.dao.findRecordsByFilter('items', '1=1', '', 0, 0))).toEqual(['i1', 'i2']);
  });

  it('nimmt Text in doppelten und einfachen Anführungszeichen', () => {
    const h = setup({ items: ITEMS });
    expect(ids(h.dao.findRecordsByFilter('items', 'status = "pending"', '', 0, 0))).toEqual(['i2']);
    expect(ids(h.dao.findRecordsByFilter('items', "status = 'pending'", '', 0, 0))).toEqual(['i2']);
  });

  it('vergleicht Feld mit Feld, wenn rechts ein bekanntes Feld steht', () => {
    const h = setup({ items: ITEMS });
    expect(ids(h.dao.findRecordsByFilter('items', 'sku = qr_code', '', 0, 0))).toEqual(['i1']);
  });

  it('nimmt true/false für Wahrheitsfelder', () => {
    const h = setup({ items: ITEMS });
    expect(ids(h.dao.findRecordsByFilter('items', 'is_showcase = true', '', 0, 0))).toEqual(['i1']);
    expect(ids(h.dao.findRecordsByFilter('items', 'is_showcase = false', '', 0, 0))).toEqual(['i2']);
  });

  it('setzt Platzhalter aus params ein', () => {
    const h = setup({ items: ITEMS });
    expect(ids(h.dao.findRecordsByFilter('items', 'status = {:s}', '', 0, 0, { s: 'approved' }))).toEqual(['i1']);
    expect(h.dao.findFirstRecordByFilter('items', 'points >= {:p}', { p: 30 }).id).toBe('i2');
  });

  it('vergleicht mit SQLite-Affinität: Zahl als Text gegen Zahlenfeld numerisch', () => {
    // points ist ein Zahlenfeld: "10" wird zur Zahl, 5 < 10 < 30.
    const h = setup({ items: ITEMS });
    expect(ids(h.dao.findRecordsByFilter('items', 'points > "10"', '', 0, 0))).toEqual(['i2']);
  });

  it('vergleicht mit SQLite-Affinität: Zahl gegen Textfeld als Text', () => {
    // size ist ein Textfeld: 38 wird zu "38".
    const h = setup({ items: ITEMS });
    expect(ids(h.dao.findRecordsByFilter('items', 'size = 38', '', 0, 0))).toEqual(['i1']);
  });

  it('verknüpft mit && und || und beachtet Klammern', () => {
    const h = setup({ items: ITEMS });
    expect(ids(h.dao.findRecordsByFilter('items', 'status = "approved" || points > 10', '', 0, 0))).toEqual(['i1', 'i2']);
    expect(ids(h.dao.findRecordsByFilter('items', 'status = "approved" && points > 10', '', 0, 0))).toEqual([]);
    expect(
      ids(h.dao.findRecordsByFilter('items', '(status = "pending" || status = "approved") && points < 10', '', 0, 0))
    ).toEqual(['i1']);
  });

  it('lehnt ein unbekanntes Sortierfeld ab', () => {
    const h = setup({ items: ITEMS });
    expect(() => h.dao.findRecordsByFilter('items', '1=1', '-gibtsnicht', 0, 0)).toThrow(
      /invalid sort field "gibtsnicht"/
    );
  });

  it('sortiert nach mehreren Feldern', () => {
    const h = setup({
      items: [
        { id: 'a', sku: 'A', status: 'pending', points: 1 },
        { id: 'b', sku: 'B', status: 'approved', points: 1 },
        { id: 'c', sku: 'C', status: 'pending', points: 9 },
      ],
    });
    expect(ids(h.dao.findRecordsByFilter('items', '1=1', 'status,-points', 0, 0))).toEqual(['b', 'c', 'a']);
  });

  it('wertet matchesFilter gegen die Sammlung des Datensatzes aus', () => {
    const rec = new FakeRecord('items', { status: 'pending' });
    expect(matchesFilter(rec, 'status = "pending"')).toBe(true);
    expect(() => matchesFilter(rec, 'checkin_at = ""')).toThrow('invalid or empty filter expression');
  });
});

// ── T-6: Schema und Speichern ──────────────────────────────────

describe('Harness-Schema: aus pb_migrations/ abgeleitet', () => {
  const schema = loadSchema();

  it('kennt die Sammlungen der Migrationen und keine anderen', () => {
    expect(Object.keys(schema).sort()).toEqual([
      'action_counts',
      'badges',
      'campaigns',
      'items',
      'needs',
      'points_log',
      'push_devices',
      'push_messages',
      'store',
      'store_secrets',
      'user_badges',
      'users',
      'visits',
    ]);
  });

  it('nimmt die Feldtypen mit', () => {
    expect(schema.items.fields.taken_at.type).toBe('date');
    expect(schema.items.fields.points.type).toBe('number');
    expect(schema.items.fields.is_showcase.type).toBe('bool');
    expect(schema.items.fields.created_by.type).toBe('relation');
    expect(schema.store.fields.tiers_json.type).toBe('json');
    expect(schema.push_messages.fields.send_attempts.type).toBe('number');
  });

  it('löst die Sammlungs-ID einer Migration auf', () => {
    // 1782637408_updated_store.js spricht `store` mit der Produktions-ID an.
    expect(schema.store.id).toBe('8hdpqi33x65ptii');
    expect(schema.store.fields.timezone.type).toBe('text');
  });

  it('gibt Auth-Sammlungen ihre Systemfelder', () => {
    expect(schema.users.type).toBe('auth');
    const typen = {};
    for (const f of ['id', 'created', 'updated', 'email', 'username', 'verified', 'emailVisibility', 'tokenKey', 'passwordHash', 'lastResetSentAt', 'lastVerificationSentAt']) {
      typen[f] = schema.users.fields[f].type;
    }
    expect(typen).toEqual({
      id: 'text',
      created: 'date',
      updated: 'date',
      email: 'email',
      username: 'text',
      verified: 'bool',
      emailVisibility: 'bool',
      tokenKey: 'text',
      passwordHash: 'text',
      lastResetSentAt: 'date',
      lastVerificationSentAt: 'date',
    });
    expect(schema.items.fields.email).toBe(undefined);
  });

  it('liest die UNIQUE-Indizes', () => {
    expect(schema.push_devices.unique.map((u) => u.columns)).toEqual([['expo_token']]);
    expect(schema.items.unique.map((u) => u.columns)).toEqual([['sku']]);
    expect(schema.user_badges.unique.map((u) => u.columns)).toEqual([['user', 'badge']]);
    expect(schema.action_counts.unique.map((u) => u.columns)).toEqual([['user', 'campaign']]);
    // Nicht-eindeutige Indizes zählen nicht.
    expect(schema.visits.unique).toEqual([]);
  });

  it('kennt kein Feld target_segment an Aktionen', () => {
    // Nur Nachrichten haben es; lib/points.js liest es an Aktionen trotzdem
    // (und fällt dort auf target_role zurück).
    expect(schema.campaigns.fields.target_segment).toBe(undefined);
    expect(schema.push_messages.fields.target_segment.type).toBe('select');
  });
});

describe('Harness-Datensatz: Felder und Werte', () => {
  it('wirft beim Setzen eines unbekannten Felds', () => {
    const rec = new FakeRecord('items', {});
    expect(() => rec.set('taken_ta', '2026-09-26 10:00:00.000Z')).toThrow(
      'Harness: Feld "taken_ta" gibt es in der Sammlung "items" nicht'
    );
  });

  it('liefert für ein unbekanntes Feld null, wie PocketBase', () => {
    expect(new FakeRecord('items', {}).get('gibtsnicht')).toBe(null);
  });

  it('wirft bei einer Fixture mit unbekanntem Feld', () => {
    expect(() => setup({ items: [{ id: 'i1', sku: 'A', gibtsnicht: 1 }] })).toThrow(
      'Harness: Feld "gibtsnicht" gibt es in der Sammlung "items" nicht'
    );
  });

  it('bringt Werte in die Form des Feldtyps', () => {
    const rec = new FakeRecord('items', { points: '5', is_showcase: 'true', size: 38 });
    expect(rec.get('points')).toBe(5);
    expect(rec.get('is_showcase')).toBe(true);
    expect(rec.get('size')).toBe('38');
    rec.set('points', null);
    expect(rec.get('points')).toBe(0);
  });

  it('wirft, wenn ein Textfeld ein Objekt bekommt', () => {
    // Bewusste Abweichung: PocketBase speicherte still den Leerstring — etwa
    // wenn ein Hook den ganzen Datensatz statt seiner ID übergibt.
    const user = new FakeRecord('users', { id: 'u1' });
    const log = new FakeRecord('points_log', {});
    expect(() => log.set('user', user)).toThrow('Harness: points_log.user erwartet Text');
  });
});

describe('Harness-DAO: unbekannte Sammlungen', () => {
  it('findCollectionByNameOrId wirft', () => {
    const h = setup();
    expect(() => h.dao.findCollectionByNameOrId('gibtsnicht')).toThrow('sql: no rows in result set');
    expect(h.dao.findCollectionByNameOrId('8hdpqi33x65ptii').name).toBe('store');
  });

  it('findRecordsByFilter und findFirstRecordByFilter werfen', () => {
    const h = setup();
    expect(() => h.dao.findRecordsByFilter('gibtsnicht', '1=1', '', 0, 0)).toThrow('sql: no rows in result set');
    expect(() => h.dao.findFirstRecordByFilter('gibtsnicht', '1=1')).toThrow('sql: no rows in result set');
    expect(() => h.dao.findRecordById('gibtsnicht', 'x')).toThrow('sql: no rows in result set');
  });

  it('eine Fixture mit unbekannter Sammlung wirft', () => {
    expect(() => setup({ probe: [{ id: 'p1' }] })).toThrow(/Sammlung "probe" gibt es laut pb_migrations\/ nicht/);
  });

  it('findFirstRecordByData wirft bei unbekanntem Feld', () => {
    const h = setup();
    expect(() => h.dao.findFirstRecordByData('items', 'qr', 'x')).toThrow('no such column: qr');
  });
});

describe('Harness-DAO: UNIQUE-Indizes', () => {
  it('lehnt einen zweiten Push-Token mit gleichem Wert ab und schreibt nichts', () => {
    const h = setup({ push_devices: [{ id: 'd1', user: 'u1', expo_token: 'ExponentPushToken[a]' }] });
    const doppelt = h.newRecord('push_devices', { user: 'u1', expo_token: 'ExponentPushToken[a]' });
    expect(() => h.dao.saveRecord(doppelt)).toThrow('UNIQUE constraint failed: push_devices.expo_token');
    expect(h.rows('push_devices').map((d) => d.id)).toEqual(['d1']);
  });

  it('nimmt einen anderen Push-Token an', () => {
    const h = setup({ push_devices: [{ id: 'd1', user: 'u1', expo_token: 'ExponentPushToken[a]' }] });
    h.dao.saveRecord(h.newRecord('push_devices', { id: 'd2', user: 'u1', expo_token: 'ExponentPushToken[b]' }));
    expect(h.rows('push_devices').map((d) => d.id)).toEqual(['d1', 'd2']);
  });

  it('stößt sich beim erneuten Speichern nicht an sich selbst', () => {
    const h = setup({ push_devices: [{ id: 'd1', user: 'u1', expo_token: 'ExponentPushToken[a]' }] });
    const d = h.dao.findRecordById('push_devices', 'd1');
    d.set('platform', 'ios');
    h.dao.saveRecord(d);
    expect(h.rows('push_devices')[0].platform).toBe('ios');
  });

  it('prüft zusammengesetzte Indizes über alle Spalten', () => {
    const h = setup({
      badges: [
        { id: 'b1', slug: 'a' },
        { id: 'b2', slug: 'b' },
      ],
      user_badges: [{ id: 'ub1', user: 'u1', badge: 'b1' }],
    });
    // Andere Kombination: erlaubt.
    h.dao.saveRecord(h.newRecord('user_badges', { user: 'u1', badge: 'b2' }));
    // Gleiche Kombination: abgelehnt.
    expect(() => h.dao.saveRecord(h.newRecord('user_badges', { user: 'u1', badge: 'b1' }))).toThrow(
      'UNIQUE constraint failed: user_badges.user, user_badges.badge'
    );
    expect(h.rows('user_badges')).toHaveLength(2);
  });

  it('lehnt einen neuen Datensatz mit vergebener ID ab', () => {
    const h = setup();
    expect(() => h.dao.saveRecord(h.newRecord('users', { id: 'u1' }))).toThrow('UNIQUE constraint failed: users.id');
  });

  it('lässt leere E-Mail-Adressen bei Konten mehrfach zu, gleiche nicht', () => {
    const h = setup({ users: [{ id: 'u1', email: 'a@example.org' }, { id: 'u2' }] });
    h.dao.saveRecord(h.newRecord('users', { id: 'u3' }));
    expect(() => h.dao.saveRecord(h.newRecord('users', { id: 'u4', email: 'a@example.org' }))).toThrow(
      'UNIQUE constraint failed: users.email'
    );
  });

  it('lehnt eine Fixture ab, die gegen einen Index verstößt', () => {
    // Zwei Teile ohne SKU: In PocketBase stehen beide als "" im eindeutigen
    // Index — so einen Bestand gibt es nicht.
    expect(() => setup({ items: [{ id: 'i1' }, { id: 'i2' }] })).toThrow(
      'Harness: Fixture verletzt UNIQUE constraint failed: items.sku'
    );
  });
});

describe('Harness-DAO: gelesen wird der gespeicherte Stand', () => {
  it('zeigt eine Änderung ohne saveRecord niemandem sonst', () => {
    const h = setup({ items: [{ id: 'i1', sku: 'A', title: 'Jacke' }] });
    const geladen = h.dao.findRecordById('items', 'i1');
    geladen.set('title', 'Mantel');
    expect(h.dao.findRecordById('items', 'i1').get('title')).toBe('Jacke');
    h.dao.saveRecord(geladen);
    expect(h.dao.findRecordById('items', 'i1').get('title')).toBe('Mantel');
  });

  it('überschreibt beim Speichern eines veralteten Datensatzes die ganze Zeile', () => {
    // So verhält sich PocketBase: saveRecord schreibt alle Felder.
    const h = setup({ items: [{ id: 'i1', sku: 'A', title: 'Jacke', points: 5 }] });
    const alt = h.dao.findRecordById('items', 'i1');
    const neu = h.dao.findRecordById('items', 'i1');
    neu.set('points', 50);
    h.dao.saveRecord(neu);
    alt.set('title', 'Mantel');
    h.dao.saveRecord(alt);
    const row = h.rows('items')[0];
    expect(row.title).toBe('Mantel');
    expect(row.points).toBe(5);
  });

  it('setzt created und updated in PocketBase-Form', () => {
    const h = setup();
    const rec = h.newRecord('push_devices', { user: 'u1', expo_token: 't' });
    h.dao.saveRecord(rec);
    expect(h.rows('push_devices')[0].created).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('lehnt das Speichern einer Zeile ab, die es nicht gibt', () => {
    // Bewusste Abweichung: PocketBase schickte das UPDATE still ins Leere.
    const h = setup();
    const rec = h.newRecord('items', { id: 'weg', sku: 'X' });
    rec._new = false;
    expect(() => h.dao.saveRecord(rec)).toThrow('Harness: items/weg gibt es nicht');
  });
});

describe('Harness-DAO: gestellte Speicherfehler (failSaveOn)', () => {
  it('lässt nur passende Schreibvorgänge scheitern und schreibt dann nichts', () => {
    const h = setup({ items: [{ id: 'i1', sku: 'A', title: 'Jacke' }, { id: 'i2', sku: 'B', title: 'Hose' }] });
    h.failSaveOn('items', (r) => r.id === 'i1', 'database is locked');
    const i1 = h.dao.findRecordById('items', 'i1');
    i1.set('title', 'Mantel');
    expect(() => h.dao.saveRecord(i1)).toThrow('database is locked');
    expect(h.dao.findRecordById('items', 'i1').get('title')).toBe('Jacke');

    const i2 = h.dao.findRecordById('items', 'i2');
    i2.set('title', 'Rock');
    h.dao.saveRecord(i2);
    expect(h.dao.findRecordById('items', 'i2').get('title')).toBe('Rock');
  });

  it('lässt sich wieder abschalten', () => {
    const h = setup({ items: [{ id: 'i1', sku: 'A', title: 'Jacke' }] });
    const aus = h.failSaveOn('items');
    const i1 = h.dao.findRecordById('items', 'i1');
    i1.set('title', 'Mantel');
    expect(() => h.dao.saveRecord(i1)).toThrow('Harness: gestellter Fehler beim Speichern in items');
    aus();
    h.dao.saveRecord(i1);
    expect(h.dao.findRecordById('items', 'i1').get('title')).toBe('Mantel');
  });

  it('wirft bei einer unbekannten Sammlung', () => {
    const h = setup();
    expect(() => h.failSaveOn('probe')).toThrow('sql: no rows in result set');
  });
});
