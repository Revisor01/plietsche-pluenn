// Tests für Serien (Wochen in Folge) und Aktionen in lib/points.js.
//
// Beides rechnet mit ISO-Wochen und Zeitfenstern — die Stellen, an denen
// Grenzfälle wie der Jahreswechsel leicht durchrutschen. Laut CHANGELOG hing
// die Serie einmal an einem Zählerfeld statt an den tatsächlichen Besuchen.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const { loadHook } = createRequire(import.meta.url)('./harness.js');

function setup(store = {}) {
  return loadHook('scan.pb.js', {
    store: [Object.assign({ __name: 'store', pts_checkin: 10, pts_take: 5 }, store.store || {})],
    users: store.users || [
      { __name: 'user', id: 'u1', role: 'visitor', points_total: 0, streak_weeks: 0, streak_last_visit: '' },
    ],
    visits: store.visits || [],
    campaigns: store.campaigns || [],
    action_counts: store.action_counts || [],
    points_log: [],
    badges: [],
    user_badges: [],
    items: [],
  });
}

// Ein Datum n Wochen vor heute — die Serienlogik rechnet gegen die aktuelle
// Woche, feste Kalenderdaten wären deshalb bereits morgen falsch.
function vorWochen(n) {
  return new Date(Date.now() - n * 7 * 86400000);
}

function besuch(id, wochenZurueck, userId = 'u1') {
  return { id, user: userId, checkin_at: vorWochen(wochenZurueck).toISOString() };
}

describe('isoWeek — Woche als Zahl', () => {
  const h = setup();

  it('kodiert Jahr und Woche als eine Zahl', () => {
    // 2026*100 + Kalenderwoche.
    expect(h.lib.isoWeek(new Date('2026-09-10'))).toBe(202637);
    expect(h.lib.isoWeek(new Date('2026-01-01'))).toBe(202601);
  });

  it('rechnet Tage am Jahresende der richtigen Woche zu', () => {
    // 2026 hat 53 Kalenderwochen; der 31.12. gehoert noch zu KW 53.
    expect(h.lib.isoWeek(new Date('2026-12-31'))).toBe(202653);
    // Der 4.1.2027 ist bereits KW 1 des neuen Jahres.
    expect(h.lib.isoWeek(new Date('2027-01-04'))).toBe(202701);
  });

  it('gibt allen Tagen derselben Woche dieselbe Zahl', () => {
    const mo = h.lib.isoWeek(new Date('2026-09-07'));
    const so = h.lib.isoWeek(new Date('2026-09-13'));
    expect(mo).toBe(so);
  });
});

describe('isWeekAdjacent — folgen zwei Wochen aufeinander?', () => {
  const h = setup();

  it('erkennt die direkt folgende Woche', () => {
    expect(h.lib.isWeekAdjacent(202637, 202638)).toBe(true);
  });

  it('verneint bei einer Luecke', () => {
    expect(h.lib.isWeekAdjacent(202637, 202639)).toBe(false);
  });

  it('verneint rueckwaerts', () => {
    expect(h.lib.isWeekAdjacent(202638, 202637)).toBe(false);
  });

  it('traegt ueber den Jahreswechsel', () => {
    // KW 53/2026 -> KW 1/2027: ohne Sonderfall waere die Differenz 48.
    expect(h.lib.isWeekAdjacent(202653, 202701)).toBe(true);
    // Auch aus einem Jahr mit 52 Wochen heraus.
    expect(h.lib.isWeekAdjacent(202052, 202101)).toBe(true);
  });

  it('verneint einen Sprung ueber zwei Jahreswechsel', () => {
    expect(h.lib.isWeekAdjacent(202553, 202701)).toBe(false);
  });

  it('ist am Jahreswechsel eine Woche nachsichtig', () => {
    // 2026 hat 53 Wochen: Zwischen KW 52/2026 und KW 1/2027 liegt KW 53,
    // die Serie bleibt hier trotzdem bestehen. Festgehalten als tatsaechliches
    // Verhalten — die Nachsicht faellt zugunsten der Nutzer:innen aus.
    expect(h.lib.isWeekAdjacent(202652, 202701)).toBe(true);
  });
});

describe('streakFromVisits — Serie aus den Besuchen', () => {
  it('gibt ohne Besuche 0', () => {
    const h = setup();
    expect(h.lib.streakFromVisits(h.records.user)).toBe(0);
  });

  it('ignoriert ein Zaehlerfeld ohne Besuche', () => {
    // Ohne Besuch gibt es keinen Fortschritt — auch nicht, wenn ein alter
    // Zaehlerstand herumliegt.
    const h = setup({
      users: [{ __name: 'user', id: 'u1', streak_weeks: 9, streak_last_visit: '2026-01-01' }],
    });
    expect(h.lib.streakFromVisits(h.records.user)).toBe(0);
  });

  it('zaehlt einen Besuch in dieser Woche als 1', () => {
    const h = setup({ visits: [besuch('v1', 0)] });
    expect(h.lib.streakFromVisits(h.records.user)).toBe(1);
  });

  it('zaehlt mehrere Besuche derselben Woche nur einmal', () => {
    // Drei Besuche am selben Tag sind eine Woche, nicht drei.
    const heute = new Date().toISOString();
    const h = setup({
      visits: [
        { id: 'v1', user: 'u1', checkin_at: heute },
        { id: 'v2', user: 'u1', checkin_at: heute },
        { id: 'v3', user: 'u1', checkin_at: heute },
      ],
    });
    expect(h.lib.streakFromVisits(h.records.user)).toBe(1);
  });

  it('ueberspringt Besuche ohne Zeitstempel', () => {
    const h = setup({
      visits: [besuch('v1', 0), { id: 'v2', user: 'u1', checkin_at: '' }],
    });
    expect(h.lib.streakFromVisits(h.records.user)).toBe(1);
  });

  it('zaehlt aufeinanderfolgende Wochen zusammen', () => {
    const h = setup({ visits: [besuch('v1', 0), besuch('v2', 1), besuch('v3', 2)] });
    expect(h.lib.streakFromVisits(h.records.user)).toBe(3);
  });

  it('bricht bei einer ausgelassenen Woche ab', () => {
    // Diese und letzte Woche zaehlen, die drei davor sind abgeschnitten.
    const h = setup({
      visits: [besuch('v1', 0), besuch('v2', 1), besuch('v4', 4), besuch('v5', 5)],
    });
    expect(h.lib.streakFromVisits(h.records.user)).toBe(2);
  });

  it('laesst eine Serie mit letztem Besuch in der Vorwoche gelten', () => {
    const h = setup({ visits: [besuch('v1', 1), besuch('v2', 2)] });
    expect(h.lib.streakFromVisits(h.records.user)).toBe(2);
  });

  it('gibt 0, wenn der letzte Besuch zu lange her ist', () => {
    const h = setup({ visits: [besuch('v1', 3), besuch('v2', 4)] });
    expect(h.lib.streakFromVisits(h.records.user)).toBe(0);
  });

  it('zaehlt nur die Besuche der eigenen Person', () => {
    const h = setup({
      visits: [besuch('v1', 0), besuch('f1', 1, 'u2'), besuch('f2', 2, 'u2')],
    });
    expect(h.lib.streakFromVisits(h.records.user)).toBe(1);
  });
});

describe('updateStreak — Serie beim Check-in fortschreiben', () => {
  it('startet bei 1, wenn es noch keinen Besuch gab', () => {
    const h = setup();
    h.lib.updateStreak(h.records.user, new Date('2026-09-10'));
    expect(h.records.user.get('streak_weeks')).toBe(1);
  });

  it('aendert bei einem zweiten Besuch derselben Woche nichts', () => {
    const h = setup({
      users: [{ __name: 'user', id: 'u1', streak_weeks: 3, streak_last_visit: '2026-09-07T10:00:00.000Z' }],
    });
    h.lib.updateStreak(h.records.user, new Date('2026-09-10'));
    expect(h.records.user.get('streak_weeks')).toBe(3);
  });

  it('zaehlt in der Folgewoche hoch', () => {
    const h = setup({
      users: [{ __name: 'user', id: 'u1', streak_weeks: 3, streak_last_visit: '2026-09-03T10:00:00.000Z' }],
    });
    h.lib.updateStreak(h.records.user, new Date('2026-09-10'));
    expect(h.records.user.get('streak_weeks')).toBe(4);
  });

  it('zaehlt ueber den Jahreswechsel hoch', () => {
    const h = setup({
      users: [{ __name: 'user', id: 'u1', streak_weeks: 8, streak_last_visit: '2026-12-31T10:00:00.000Z' }],
    });
    h.lib.updateStreak(h.records.user, new Date('2027-01-04'));
    expect(h.records.user.get('streak_weeks')).toBe(9);
  });

  it('faengt nach einer Luecke wieder bei 1 an', () => {
    const h = setup({
      users: [{ __name: 'user', id: 'u1', streak_weeks: 12, streak_last_visit: '2026-08-01T10:00:00.000Z' }],
    });
    h.lib.updateStreak(h.records.user, new Date('2026-09-10'));
    expect(h.records.user.get('streak_weeks')).toBe(1);
  });

  it('setzt eine Serie ueber eine Luecke von zwei Jahren fort', () => {
    // BEFUND, nicht gewuenschtes Verhalten: updateStreak wiederholt die
    // Bedingung aus isWeekAdjacent, laesst dabei aber die Pruefung weg, dass
    // genau ein Jahr dazwischenliegt. Wer Ende 2025 zuletzt da war und Anfang
    // 2027 wiederkommt, behaelt seine Serie und zaehlt sogar hoch.
    // isWeekAdjacent(202552, 202701) sagt korrekt false; streakFromVisits
    // wuerde fuer dieselbe Person 1 liefern. Die beiden widersprechen sich.
    const h = setup({
      users: [{ __name: 'user', id: 'u1', streak_weeks: 7, streak_last_visit: '2025-12-26T10:00:00.000Z' }],
    });
    h.lib.updateStreak(h.records.user, new Date('2027-01-04T10:00:00.000Z'));
    expect(h.records.user.get('streak_weeks')).toBe(8);
    // Zum Vergleich die Funktion, die es richtig macht:
    expect(h.lib.isWeekAdjacent(202552, 202701)).toBe(false);
  });

  it('haelt den Zeitpunkt des Besuchs fest', () => {
    const h = setup();
    const wann = new Date('2026-09-10T14:30:00.000Z');
    h.lib.updateStreak(h.records.user, wann);
    expect(h.records.user.get('streak_last_visit')).toBe(wann.toISOString());
  });
});

describe('campaignMult — Faktoren einer Aktion', () => {
  function camp(h) {
    return h.store.campaigns[0];
  }

  it('gibt ohne Aktion den Faktor 1', () => {
    const h = setup();
    expect(h.lib.campaignMult(null, 'take')).toBe(1.0);
  });

  it('liest je Handlung das passende Feld', () => {
    const h = setup({
      campaigns: [{ id: 'c1', mult_visit: 2, mult_take: 3, mult_bring: 4, multiplier: 1 }],
    });
    expect(h.lib.campaignMult(camp(h), 'visit')).toBe(2);
    expect(h.lib.campaignMult(camp(h), 'take')).toBe(3);
    expect(h.lib.campaignMult(camp(h), 'bring')).toBe(4);
  });

  it('faellt auf den alten Gesamtfaktor zurueck', () => {
    // Aeltere Aktionen haben nur ein Feld fuer alle Handlungen.
    const h = setup({ campaigns: [{ id: 'c1', multiplier: 2 }] });
    expect(h.lib.campaignMult(camp(h), 'take')).toBe(2);
    expect(h.lib.campaignMult(camp(h), 'visit')).toBe(2);
  });

  it('gibt 1, wenn nichts gesetzt ist', () => {
    const h = setup({ campaigns: [{ id: 'c1' }] });
    expect(h.lib.campaignMult(camp(h), 'take')).toBe(1.0);
  });
});

describe('campaignApplies — fuer wen eine Aktion gilt', () => {
  function pruefe(campFelder, userFelder = {}) {
    const h = setup({
      users: [Object.assign({ __name: 'user', id: 'u1', role: 'visitor' }, userFelder)],
      campaigns: [Object.assign({ id: 'c1' }, campFelder)],
    });
    return h.lib.campaignApplies(h.store.campaigns[0], h.records.user, new Date());
  }

  it('gilt fuer alle, wenn nichts eingeschraenkt ist', () => {
    expect(pruefe({ target_segment: 'all' })).toBe(true);
    expect(pruefe({})).toBe(true);
  });

  it('gilt nur fuer die gewaehlte Rolle', () => {
    expect(pruefe({ target_segment: 'by_role', target_role: 'volunteer' }, { role: 'volunteer' })).toBe(true);
    expect(pruefe({ target_segment: 'by_role', target_role: 'volunteer' }, { role: 'visitor' })).toBe(false);
  });

  it('gilt ab zwei Wochen Serie', () => {
    expect(pruefe({ target_segment: 'streak2plus' }, { streak_weeks: 2 })).toBe(true);
    expect(pruefe({ target_segment: 'streak2plus' }, { streak_weeks: 1 })).toBe(false);
  });

  it('gilt fuer laenger Abwesende', () => {
    const lange = new Date(Date.now() - 20 * 86400000).toISOString();
    const kuerzlich = new Date(Date.now() - 3 * 86400000).toISOString();
    expect(pruefe({ target_segment: 'inactive14d' }, { streak_last_visit: lange })).toBe(true);
    expect(pruefe({ target_segment: 'inactive14d' }, { streak_last_visit: kuerzlich })).toBe(false);
  });

  it('gilt fuer jemanden, der noch nie da war, als abwesend', () => {
    expect(pruefe({ target_segment: 'inactive14d' }, { streak_last_visit: '' })).toBe(true);
  });
});

describe('bumpActionCount — Teilnahme mitzaehlen', () => {
  it('zaehlt, worauf die Aktion Bonus gibt', () => {
    const h = setup({ campaigns: [{ id: 'c1', mult_bring: 2, multiplier: 1 }] });
    h.lib.bumpActionCount(h.records.user, h.store.campaigns[0], 'bring', 1);
    const counts = h.rows('action_counts');
    expect(counts).toHaveLength(1);
    expect(counts[0].count).toBe(1);
  });

  it('zaehlt nicht, worauf die Aktion keinen Bonus gibt', () => {
    // Steht Holen auf x1, ist Holen keine Teilnahme.
    const h = setup({ campaigns: [{ id: 'c1', mult_take: 1, mult_bring: 2, multiplier: 1 }] });
    h.lib.bumpActionCount(h.records.user, h.store.campaigns[0], 'take', 1);
    expect(h.rows('action_counts')).toHaveLength(0);
  });

  it('rechnet mehrere Teile auf einmal dazu', () => {
    const h = setup({ campaigns: [{ id: 'c1', mult_take: 3, multiplier: 1 }] });
    h.lib.bumpActionCount(h.records.user, h.store.campaigns[0], 'take', 4);
    expect(h.rows('action_counts')[0].count).toBe(4);
  });

  it('zaehlt auf einen bestehenden Stand weiter', () => {
    const h = setup({
      campaigns: [{ id: 'c1', mult_bring: 2, multiplier: 1 }],
      action_counts: [{ id: 'ac1', user: 'u1', campaign: 'c1', count: 3 }],
    });
    h.lib.bumpActionCount(h.records.user, h.store.campaigns[0], 'bring', 2);
    expect(h.rows('action_counts')).toHaveLength(1);
    expect(h.rows('action_counts')[0].count).toBe(5);
  });

  it('tut ohne Aktion nichts', () => {
    const h = setup();
    h.lib.bumpActionCount(h.records.user, null, 'bring', 1);
    expect(h.rows('action_counts')).toHaveLength(0);
  });
});

describe('findActiveCampaign — welche Aktion gerade laeuft', () => {
  const jetzt = new Date();
  const gestern = new Date(jetzt.getTime() - 86400000).toISOString();
  const morgen = new Date(jetzt.getTime() + 86400000).toISOString();

  it('findet eine laufende Aktion', () => {
    const h = setup({
      campaigns: [{ id: 'c1', name: 'Laeuft', starts_at: gestern, ends_at: morgen, multiplier: 2 }],
    });
    const c = h.lib.findActiveCampaign(jetzt, h.records.user);
    expect(c && c.id).toBe('c1');
  });

  it('findet keine bereits beendete Aktion', () => {
    const vorwoche = new Date(jetzt.getTime() - 8 * 86400000).toISOString();
    const vorgestern = new Date(jetzt.getTime() - 2 * 86400000).toISOString();
    const h = setup({
      campaigns: [{ id: 'c1', starts_at: vorwoche, ends_at: vorgestern, multiplier: 2 }],
    });
    expect(h.lib.findActiveCampaign(jetzt, h.records.user)).toBe(null);
  });

  it('findet keine erst kuenftige Aktion', () => {
    const inZwei = new Date(jetzt.getTime() + 2 * 86400000).toISOString();
    const inZehn = new Date(jetzt.getTime() + 10 * 86400000).toISOString();
    const h = setup({ campaigns: [{ id: 'c1', starts_at: inZwei, ends_at: inZehn, multiplier: 2 }] });
    expect(h.lib.findActiveCampaign(jetzt, h.records.user)).toBe(null);
  });

  it('ueberspringt eine Aktion, die fuer diese Person nicht gilt', () => {
    const h = setup({
      users: [{ __name: 'user', id: 'u1', role: 'visitor', streak_weeks: 0 }],
      campaigns: [
        { id: 'c1', starts_at: gestern, ends_at: morgen, multiplier: 3, target_segment: 'streak2plus' },
        { id: 'c2', starts_at: gestern, ends_at: morgen, multiplier: 2, target_segment: 'all' },
      ],
    });
    const c = h.lib.findActiveCampaign(jetzt, h.records.user);
    expect(c && c.id).toBe('c2');
  });

  it('nimmt ohne Person die erste laufende Aktion', () => {
    const h = setup({
      campaigns: [
        { id: 'c1', starts_at: gestern, ends_at: morgen, multiplier: 3, target_segment: 'streak2plus' },
      ],
    });
    const c = h.lib.findActiveCampaign(jetzt, null);
    expect(c && c.id).toBe('c1');
  });
});
