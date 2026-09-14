// Tests für die An- und Abmeldung von Push-Token.
//
// Ein Token gehört immer genau einer Person. Wandert ein Gerät weiter oder
// meldet sich jemand anders darauf an, muss der Eintrag umziehen — sonst
// bekäme die falsche Person die Benachrichtigungen.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const { loadHook } = createRequire(import.meta.url)('./harness.js');

const REGISTER = 'POST /api/pp/push/register';
const UNREGISTER = 'POST /api/pp/push/unregister';
const TOKEN = 'ExponentPushToken[abc123]';

function setup(devices = []) {
  return loadHook('push.pb.js', {
    users: [
      { __name: 'user', id: 'user1', role: 'visitor' },
      { __name: 'other', id: 'user2', role: 'visitor' },
    ],
    push_devices: devices,
  });
}

describe('Anmelden', () => {
  it('weist einen Aufruf ohne Anmeldung mit 401 ab', () => {
    const h = setup();
    let err;
    try {
      h.call(REGISTER, { body: { expo_token: TOKEN }, authRecord: null });
    } catch (e) {
      err = e;
    }
    expect(err.status).toBe(401);
  });

  it('weist einen leeren Token mit 400 ab', () => {
    const h = setup();
    let err;
    try {
      h.call(REGISTER, { body: { expo_token: '   ' }, authRecord: h.records.user });
    } catch (e) {
      err = e;
    }
    expect(err.status).toBe(400);
    expect(err.message).toBe('Kein Token');
    expect(h.rows('push_devices')).toHaveLength(0);
  });

  it('legt einen neuen Token an', () => {
    const h = setup();
    const res = h.call(REGISTER, {
      body: { expo_token: TOKEN, platform: 'android' },
      authRecord: h.records.user,
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    const devices = h.rows('push_devices');
    expect(devices).toHaveLength(1);
    expect(devices[0].expo_token).toBe(TOKEN);
    expect(devices[0].user).toBe('user1');
    expect(devices[0].platform).toBe('android');
  });

  it('nimmt iOS an, wenn keine Plattform angegeben ist', () => {
    const h = setup();
    h.call(REGISTER, { body: { expo_token: TOKEN }, authRecord: h.records.user });
    expect(h.rows('push_devices')[0].platform).toBe('ios');
  });

  it('wertet eine unbekannte Plattform als iOS', () => {
    const h = setup();
    h.call(REGISTER, {
      body: { expo_token: TOKEN, platform: 'windows' },
      authRecord: h.records.user,
    });
    expect(h.rows('push_devices')[0].platform).toBe('ios');
  });

  it('legt denselben Token nicht doppelt an', () => {
    const h = setup([{ id: 'd1', expo_token: TOKEN, user: 'user1', platform: 'ios' }]);
    h.call(REGISTER, { body: { expo_token: TOKEN }, authRecord: h.records.user });
    expect(h.rows('push_devices')).toHaveLength(1);
  });

  it('schreibt einen bekannten Token auf die anmeldende Person um', () => {
    // Wechselt das Geraet die Besitzerin, darf die alte keine
    // Benachrichtigungen mehr dafuer bekommen.
    const h = setup([{ id: 'd1', expo_token: TOKEN, user: 'user1', platform: 'ios' }]);
    h.call(REGISTER, { body: { expo_token: TOKEN }, authRecord: h.records.other });

    const devices = h.rows('push_devices');
    expect(devices).toHaveLength(1);
    expect(devices[0].user).toBe('user2');
  });

  it('vermerkt, wann der Token zuletzt gesehen wurde', () => {
    const h = setup();
    const vorher = Date.now();
    h.call(REGISTER, { body: { expo_token: TOKEN }, authRecord: h.records.user });
    const nachher = Date.now();

    // Geprueft wird das WANN, nicht nur das DASS: Der Zeitstempel muss in der
    // Zeitspanne des Aufrufs liegen. Sonst kaeme auch ein fester Wert durch,
    // und die Angabe waere wertlos — an ihr haengt, welche Geraete als
    // verwaist gelten.
    const gesehen = Date.parse(`${h.rows('push_devices')[0].last_seen}`);
    expect(Number.isNaN(gesehen)).toBe(false);
    expect(gesehen).toBeGreaterThanOrEqual(vorher);
    expect(gesehen).toBeLessThanOrEqual(nachher);
  });

  it('frischt den Zeitpunkt bei einer erneuten Anmeldung auf', () => {
    // Die Gegenprobe: Ein alter Eintrag darf nicht stehen bleiben.
    const h = setup([
      { id: 'd1', expo_token: TOKEN, user: 'user1', platform: 'ios', last_seen: '2020-01-01T00:00:00.000Z' },
    ]);
    const vorher = Date.now();
    h.call(REGISTER, { body: { expo_token: TOKEN }, authRecord: h.records.user });

    const gesehen = Date.parse(`${h.rows('push_devices')[0].last_seen}`);
    expect(gesehen).toBeGreaterThanOrEqual(vorher);
  });
});

describe('Abmelden', () => {
  it('weist einen Aufruf ohne Anmeldung mit 401 ab', () => {
    const h = setup();
    let err;
    try {
      h.call(UNREGISTER, { body: { expo_token: TOKEN }, authRecord: null });
    } catch (e) {
      err = e;
    }
    expect(err.status).toBe(401);
  });

  it('entfernt den eigenen Token', () => {
    const h = setup([{ id: 'd1', expo_token: TOKEN, user: 'user1', platform: 'ios' }]);
    const res = h.call(UNREGISTER, { body: { expo_token: TOKEN }, authRecord: h.records.user });
    expect(res.body).toEqual({ ok: true });
    expect(h.rows('push_devices')).toHaveLength(0);
  });

  it('entfernt den Token einer anderen Person nicht', () => {
    // Sonst koennte man Fremde per Token-Angabe stummschalten.
    const h = setup([{ id: 'd1', expo_token: TOKEN, user: 'user1', platform: 'ios' }]);
    const res = h.call(UNREGISTER, { body: { expo_token: TOKEN }, authRecord: h.records.other });
    expect(res.body).toEqual({ ok: true });
    expect(h.rows('push_devices')).toHaveLength(1);
    expect(h.rows('push_devices')[0].user).toBe('user1');
  });

  it('meldet Erfolg, auch wenn der Token gar nicht hinterlegt war', () => {
    // Die App soll sich abmelden koennen, ohne zu wissen, ob je etwas ankam.
    const h = setup();
    const res = h.call(UNREGISTER, { body: { expo_token: TOKEN }, authRecord: h.records.user });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('weist einen leeren Token mit 400 ab', () => {
    const h = setup();
    let err;
    try {
      h.call(UNREGISTER, { body: {}, authRecord: h.records.user });
    } catch (e) {
      err = e;
    }
    expect(err.status).toBe(400);
  });
});

// Der Token kommt aus dem Anfragekoerper und landete ungeprueft in einem
// Suchausdruck. Ein Anfuehrungszeichen darin bricht aus dem Ausdruck aus:
// Mit `x" || user = "…` laesst sich die Besitzpruefung beim Abmelden
// aushebeln oder ein fremdes Geraet auf das eigene Konto umschreiben — die
// andere Person bekaeme keine Nachrichten mehr, der Angreifer ihre.
describe('Token-Form — verbotene und erlaubte Faelle', () => {
  const BOESE = [
    ['Anfuehrungszeichen und ODER', 'x" || user = "user1'],
    ['nur ein Anfuehrungszeichen', 'Exponent"Token'],
    ['Backslash', 'ExponentPushToken[a\\b]'],
    ['Leerzeichen und Klammerbruch', 'x" && id != "'],
    ['voellig fremdes Format', 'irgendwas'],
  ];

  for (const [name, token] of BOESE) {
    it(`weist beim Anmelden einen Token mit ${name} ab`, () => {
      const h = setup([{ id: 'd1', expo_token: TOKEN, user: 'user1', platform: 'ios' }]);
      let err;
      try {
        h.call(REGISTER, { body: { expo_token: token }, authRecord: h.records.other });
      } catch (e) {
        err = e;
      }
      expect(err.status).toBe(400);
      expect(err.message).toBe('Ungueltiger Token');
      // Der fremde Eintrag bleibt unberuehrt bei seiner Besitzerin.
      const devices = h.rows('push_devices');
      expect(devices).toHaveLength(1);
      expect(devices[0].user).toBe('user1');
      expect(devices[0].expo_token).toBe(TOKEN);
    });

    it(`weist beim Abmelden einen Token mit ${name} ab`, () => {
      const h = setup([{ id: 'd1', expo_token: TOKEN, user: 'user1', platform: 'ios' }]);
      let err;
      try {
        h.call(UNREGISTER, { body: { expo_token: token }, authRecord: h.records.other });
      } catch (e) {
        err = e;
      }
      expect(err.status).toBe(400);
      expect(h.rows('push_devices')).toHaveLength(1);
      expect(h.rows('push_devices')[0].user).toBe('user1');
    });
  }

  // Der erlaubte Fall: genau die Formen, die die App tatsaechlich schickt.
  const ECHT = [
    ['ExponentPushToken', 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]'],
    ['ExpoPushToken', 'ExpoPushToken[yyyyyyyyyyyyyyyyyyyyyy]'],
    ['mit Binde- und Unterstrich', 'ExponentPushToken[a-b_c123]'],
  ];

  for (const [name, token] of ECHT) {
    it(`nimmt einen echten Token an (${name})`, () => {
      const h = setup();
      const res = h.call(REGISTER, { body: { expo_token: token }, authRecord: h.records.user });
      expect(res.status).toBe(200);
      const devices = h.rows('push_devices');
      expect(devices).toHaveLength(1);
      expect(devices[0].expo_token).toBe(token);
      expect(devices[0].user).toBe('user1');
    });

    it(`meldet einen echten Token wieder ab (${name})`, () => {
      const h = setup([{ id: 'd1', expo_token: token, user: 'user1', platform: 'ios' }]);
      const res = h.call(UNREGISTER, { body: { expo_token: token }, authRecord: h.records.user });
      expect(res.status).toBe(200);
      expect(h.rows('push_devices')).toHaveLength(0);
    });
  }
});
