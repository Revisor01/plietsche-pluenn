// Tests für den Push-Versand selbst (lib/push.js).
//
// Warum das hier eigene Tests braucht: In dieser Datei steht, WER eine
// Benachrichtigung bekommt. Jede Nachricht hat eine Kategorie (Serie, Aktion,
// Abzeichen, Sonstiges), und jede Person hat pro Kategorie einen Schalter.
// Wer „nur Serien-Erinnerungen" eingestellt hat, darf keine Aktions-Nachricht
// bekommen — das ist eine Einwilligung, keine Anzeigefrage.
//
// Ein Vertippen bei der Zuordnung (push_badge_enabled statt
// push_campaign_enabled) fällt sonst niemandem auf, bis sich jemand beschwert.
// Deshalb steht hier zu jeder Kategorie beides: der erlaubte und der
// verbotene Fall.
//
// Die übrigen Tests ersetzen lib/push.js durch einen Stub — ein Test darf
// keine echten Nachrichten verschicken. Hier wird die Bibliothek stattdessen
// echt geladen (realPush), und nur der Versandkanal $http.send ist gestellt.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const { loadHook } = createRequire(import.meta.url)('./harness.js');

// Ein Aufbau mit echt geladener Push-Bibliothek.
function setup(users = [], devices = []) {
  return loadHook(
    'push.pb.js',
    { users, push_devices: devices },
    { realPush: true }
  );
}

// Eine Person mit allen vier Schaltern aus, die genannten an.
function person(id, an = [], extra = {}) {
  return Object.assign(
    {
      __name: id,
      id,
      role: 'visitor',
      push_streak_enabled: an.includes('streak'),
      push_campaign_enabled: an.includes('campaign'),
      push_badge_enabled: an.includes('badge'),
      push_other_enabled: an.includes('other'),
    },
    extra
  );
}

const KATEGORIEN = [
  { kategorie: 'streak', schalter: 'streak' },
  { kategorie: 'campaign', schalter: 'campaign' },
  { kategorie: 'badge', schalter: 'badge' },
  // Alles ohne eigene Kategorie landet auf „Sonstiges".
  { kategorie: 'sonstiges', schalter: 'other' },
  { kategorie: '', schalter: 'other' },
];

describe('collectTokens: Kategorie und Einwilligung', () => {
  for (const { kategorie, schalter } of KATEGORIEN) {
    it(`schickt "${kategorie || '(ohne)'}" an jemanden, der ${schalter} eingeschaltet hat`, () => {
      const h = setup([person('u1', [schalter])], [{ id: 'd1', user: 'u1', expo_token: 'TOK1' }]);
      const ziele = h.push.collectTokens('all', '', kategorie);
      expect(ziele).toEqual([{ token: 'TOK1', userId: 'u1', deviceId: 'd1' }]);
    });

    it(`schickt "${kategorie || '(ohne)'}" nicht an jemanden, der ${schalter} ausgeschaltet hat`, () => {
      // Der verbotene Fall: alle ANDEREN Schalter an, nur der zuständige aus.
      const andere = ['streak', 'campaign', 'badge', 'other'].filter((s) => s !== schalter);
      const h = setup([person('u1', andere)], [{ id: 'd1', user: 'u1', expo_token: 'TOK1' }]);
      expect(h.push.collectTokens('all', '', kategorie)).toEqual([]);
    });
  }

  it('trennt zwei Personen mit verschiedenen Einstellungen sauber', () => {
    // Die Probe aufs Exempel: dieselbe Nachricht, zwei Empfängerinnen, nur
    // eine hat zugestimmt.
    const h = setup(
      [person('u1', ['campaign']), person('u2', ['streak'])],
      [
        { id: 'd1', user: 'u1', expo_token: 'TOK1' },
        { id: 'd2', user: 'u2', expo_token: 'TOK2' },
      ]
    );
    expect(h.push.collectTokens('all', '', 'campaign').map((t) => t.token)).toEqual(['TOK1']);
    expect(h.push.collectTokens('all', '', 'streak').map((t) => t.token)).toEqual(['TOK2']);
  });

  it('sammelt alle Geräte einer Person', () => {
    const h = setup([person('u1', ['badge'])], [
      { id: 'd1', user: 'u1', expo_token: 'TOK1' },
      { id: 'd2', user: 'u1', expo_token: 'TOK2' },
    ]);
    expect(h.push.collectTokens('all', '', 'badge').map((t) => t.token)).toEqual(['TOK1', 'TOK2']);
  });

  it('überspringt einen leeren Token', () => {
    const h = setup([person('u1', ['badge'])], [
      { id: 'd1', user: 'u1', expo_token: '   ' },
      { id: 'd2', user: 'u1', expo_token: 'TOK2' },
    ]);
    expect(h.push.collectTokens('all', '', 'badge').map((t) => t.token)).toEqual(['TOK2']);
  });

  it('liefert nichts, wenn jemand zugestimmt hat, aber kein Gerät hinterlegt ist', () => {
    const h = setup([person('u1', ['badge'])], []);
    expect(h.push.collectTokens('all', '', 'badge')).toEqual([]);
  });
});

describe('collectTokens: Zielgruppen', () => {
  it('by_role liefert nur die Personen mit der genannten Rolle', () => {
    const h = setup(
      [
        person('u1', ['campaign'], { role: 'volunteer' }),
        person('u2', ['campaign'], { role: 'visitor' }),
      ],
      [
        { id: 'd1', user: 'u1', expo_token: 'TOK1' },
        { id: 'd2', user: 'u2', expo_token: 'TOK2' },
      ]
    );
    expect(h.push.collectTokens('by_role', 'volunteer', 'campaign').map((t) => t.token))
      .toEqual(['TOK1']);
  });

  it('by_role ohne Rollenangabe zielt auf alle', () => {
    const h = setup(
      [person('u1', ['campaign'], { role: 'volunteer' }), person('u2', ['campaign'])],
      [
        { id: 'd1', user: 'u1', expo_token: 'TOK1' },
        { id: 'd2', user: 'u2', expo_token: 'TOK2' },
      ]
    );
    expect(h.push.collectTokens('by_role', '', 'campaign').map((t) => t.token))
      .toEqual(['TOK1', 'TOK2']);
  });

  it('streak2plus lässt eine Serie von 1 aus und nimmt 2 mit', () => {
    const h = setup(
      [
        person('u1', ['campaign'], { streak_weeks: 1 }),
        person('u2', ['campaign'], { streak_weeks: 2 }),
        person('u3', ['campaign'], { streak_weeks: 9 }),
      ],
      [
        { id: 'd1', user: 'u1', expo_token: 'TOK1' },
        { id: 'd2', user: 'u2', expo_token: 'TOK2' },
        { id: 'd3', user: 'u3', expo_token: 'TOK3' },
      ]
    );
    expect(h.push.collectTokens('streak2plus', '', 'campaign').map((t) => t.token))
      .toEqual(['TOK2', 'TOK3']);
  });

  it('inactive14d lässt einen Besuch von gestern aus und nimmt 20 Tage mit', () => {
    const gestern = new Date(Date.now() - 86400000).toISOString();
    const vor20 = new Date(Date.now() - 20 * 86400000).toISOString();
    const h = setup(
      [
        person('u1', ['campaign'], { streak_last_visit: gestern }),
        person('u2', ['campaign'], { streak_last_visit: vor20 }),
      ],
      [
        { id: 'd1', user: 'u1', expo_token: 'TOK1' },
        { id: 'd2', user: 'u2', expo_token: 'TOK2' },
      ]
    );
    expect(h.push.collectTokens('inactive14d', '', 'campaign').map((t) => t.token))
      .toEqual(['TOK2']);
  });

  it('inactive14d nimmt mit, wer noch nie da war', () => {
    // Ohne hinterlegten Besuch gibt es keine 14 Tage zu unterschreiten.
    const h = setup([person('u1', ['campaign'], { streak_last_visit: '' })], [
      { id: 'd1', user: 'u1', expo_token: 'TOK1' },
    ]);
    expect(h.push.collectTokens('inactive14d', '', 'campaign').map((t) => t.token))
      .toEqual(['TOK1']);
  });

  it('die Zielgruppe hebelt die Einwilligung nicht aus', () => {
    // Wer in der Zielgruppe liegt, aber abbestellt hat, bekommt nichts.
    const h = setup([person('u1', ['streak'], { streak_weeks: 5 })], [
      { id: 'd1', user: 'u1', expo_token: 'TOK1' },
    ]);
    expect(h.push.collectTokens('streak2plus', '', 'campaign')).toEqual([]);
  });
});

describe('tokensForUser', () => {
  it('liefert die Geräte der Person, wenn die Kategorie eingeschaltet ist', () => {
    const h = setup([person('u1', ['streak'])], [{ id: 'd1', user: 'u1', expo_token: 'TOK1' }]);
    expect(h.push.tokensForUser(h.records.u1, 'streak'))
      .toEqual([{ token: 'TOK1', userId: 'u1', deviceId: 'd1' }]);
  });

  it('liefert nichts, wenn die Person diese Kategorie abbestellt hat', () => {
    const h = setup([person('u1', ['campaign', 'badge', 'other'])], [
      { id: 'd1', user: 'u1', expo_token: 'TOK1' },
    ]);
    expect(h.push.tokensForUser(h.records.u1, 'streak')).toEqual([]);
  });

  it('nimmt nur die eigenen Geräte, nicht die fremden', () => {
    const h = setup(
      [person('u1', ['streak']), person('u2', ['streak'])],
      [
        { id: 'd1', user: 'u1', expo_token: 'TOK1' },
        { id: 'd2', user: 'u2', expo_token: 'TOK2' },
      ]
    );
    expect(h.push.tokensForUser(h.records.u1, 'streak').map((t) => t.token)).toEqual(['TOK1']);
  });

  it('ordnet jede Kategorie demselben Schalter zu wie collectTokens', () => {
    // Beide Wege müssen dieselbe Einwilligung lesen — sonst bekäme jemand die
    // persönliche Nachricht, die er über den Rundruf abbestellt hat.
    for (const { kategorie, schalter } of KATEGORIEN) {
      const h = setup([person('u1', [schalter])], [{ id: 'd1', user: 'u1', expo_token: 'TOK1' }]);
      expect(h.push.tokensForUser(h.records.u1, kategorie).map((t) => t.token)).toEqual(['TOK1']);

      const andere = ['streak', 'campaign', 'badge', 'other'].filter((s) => s !== schalter);
      const h2 = setup([person('u1', andere)], [{ id: 'd1', user: 'u1', expo_token: 'TOK1' }]);
      expect(h2.push.tokensForUser(h2.records.u1, kategorie)).toEqual([]);
    }
  });
});

describe('send', () => {
  const ZIEL = { token: 'TOK1', userId: 'u1', deviceId: 'd1' };

  it('schickt nichts los, wenn es keine Empfänger:innen gibt', () => {
    const h = setup();
    expect(h.push.send([], 'Titel', 'Text', '')).toEqual({ sent: 0 });
    expect(h.httpCalls).toHaveLength(0);
  });

  it('baut die Nachricht, wie Expo sie erwartet', () => {
    const h = setup([person('u1', ['streak'])], [{ id: 'd1', user: 'u1', expo_token: 'TOK1' }]);
    expect(h.push.send([ZIEL], 'Moin!', '10 Punkte', '/(visitor)/points')).toEqual({ sent: 1 });

    expect(h.httpCalls).toHaveLength(1);
    expect(h.httpCalls[0].method).toBe('POST');
    expect(h.httpCalls[0].url).toBe('https://exp.host/--/api/v2/push/send');
    expect(JSON.parse(h.httpCalls[0].body)).toEqual([
      {
        to: 'TOK1',
        title: 'Moin!',
        body: '10 Punkte',
        sound: 'default',
        data: { deep_link: '/(visitor)/points' },
      },
    ]);
  });

  it('lässt data leer, wenn es kein Ziel in der App gibt', () => {
    const h = setup();
    h.push.send([ZIEL], 'Moin!', 'Text', '');
    expect(JSON.parse(h.httpCalls[0].body)[0].data).toEqual({});
  });

  it('teilt mehr als 100 Nachrichten in Stapel auf', () => {
    // Expo nimmt höchstens 100 pro Anfrage an.
    const h = setup();
    const ziele = [];
    for (let i = 0; i < 250; i++) ziele.push({ token: `TOK${i}`, userId: 'u1', deviceId: `d${i}` });
    expect(h.push.send(ziele, 'Titel', 'Text', '')).toEqual({ sent: 250 });
    expect(h.httpCalls).toHaveLength(3);
    expect(JSON.parse(h.httpCalls[0].body)).toHaveLength(100);
    expect(JSON.parse(h.httpCalls[2].body)).toHaveLength(50);
  });

  it('entfernt ein Gerät, das Expo als abgemeldet meldet', () => {
    const h = setup([person('u1', ['streak'])], [
      { id: 'd1', user: 'u1', expo_token: 'TOK1' },
      { id: 'd2', user: 'u1', expo_token: 'TOK2' },
    ]);
    h.httpResponses.push({
      json: {
        data: [
          { status: 'ok' },
          { status: 'error', details: { error: 'DeviceNotRegistered' } },
        ],
      },
    });
    const ergebnis = h.push.send(
      [
        { token: 'TOK1', userId: 'u1', deviceId: 'd1' },
        { token: 'TOK2', userId: 'u1', deviceId: 'd2' },
      ],
      'Titel',
      'Text',
      ''
    );
    expect(ergebnis).toEqual({ sent: 1 });
    // Genau das tote Gerät ist weg, das lebende bleibt.
    expect(h.rows('push_devices').map((d) => d.id)).toEqual(['d1']);
  });

  it('lässt ein Gerät stehen, wenn Expo einen anderen Fehler meldet', () => {
    // Nur DeviceNotRegistered heißt „das Gerät gibt es nicht mehr". Ein
    // MessageRateExceeded darf niemanden abmelden.
    const h = setup([person('u1', ['streak'])], [{ id: 'd1', user: 'u1', expo_token: 'TOK1' }]);
    h.httpResponses.push({
      json: { data: [{ status: 'error', details: { error: 'MessageRateExceeded' } }] },
    });
    expect(h.push.send([ZIEL], 'Titel', 'Text', '')).toEqual({ sent: 0 });
    expect(h.rows('push_devices')).toHaveLength(1);
  });

  it('übersteht einen Netzwerkfehler, ohne den Aufrufer mitzureißen', () => {
    // Ein fehlgeschlagener Versand darf keinen Check-in zurückrollen.
    const h = setup([person('u1', ['streak'])], [{ id: 'd1', user: 'u1', expo_token: 'TOK1' }]);
    h.httpResponses.push(new Error('Netz weg'));
    expect(h.push.send([ZIEL], 'Titel', 'Text', '')).toEqual({ sent: 0 });
    expect(h.rows('push_devices')).toHaveLength(1);
  });

  it('meldet 0, wenn Expo eine Antwort ohne Quittungen schickt', () => {
    const h = setup();
    h.httpResponses.push({ json: {} });
    expect(h.push.send([ZIEL], 'Titel', 'Text', '')).toEqual({ sent: 0 });
  });

  it('ordnet die Quittungen des zweiten Stapels den richtigen Geräten zu', () => {
    // Befund aus dem Audit, hier festgehalten: push.js liest
    // `batch[j]._deviceId` — ein Feld, das beim Bauen der Nachrichten nie
    // gesetzt wird. Die Zuordnung trägt allein der ||-Rückfall über
    // `targets[i + j]`. Dieser Test prüft die Wirkung, nicht die Schreibweise:
    // Meldet Expo im ZWEITEN Stapel das 105. Gerät als abgemeldet, muss genau
    // dieses verschwinden — nicht das fünfte.
    const geraete = [];
    const ziele = [];
    for (let i = 0; i < 110; i++) {
      geraete.push({ id: `d${i}`, user: 'u1', expo_token: `TOK${i}` });
      ziele.push({ token: `TOK${i}`, userId: 'u1', deviceId: `d${i}` });
    }
    const h = setup([person('u1', ['streak'])], geraete);

    // Erster Stapel: alle 100 in Ordnung.
    h.httpResponses.push({ json: { data: new Array(100).fill({ status: 'ok' }) } });
    // Zweiter Stapel: zehn Geräte, das sechste (Index 5 = d105) ist tot.
    const zweiter = new Array(10).fill(null).map((_, j) =>
      j === 5 ? { status: 'error', details: { error: 'DeviceNotRegistered' } } : { status: 'ok' }
    );
    h.httpResponses.push({ json: { data: zweiter } });

    expect(h.push.send(ziele, 'Titel', 'Text', '')).toEqual({ sent: 109 });
    const uebrig = h.rows('push_devices').map((d) => d.id);
    expect(uebrig).toHaveLength(109);
    expect(uebrig).not.toContain('d105');
    expect(uebrig).toContain('d5');
  });
});
