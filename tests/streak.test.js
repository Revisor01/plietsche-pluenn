// Tests für Serien (Wochen in Folge) und Aktionen in lib/points.js.
//
// Beides rechnet mit ISO-Wochen und Zeitfenstern — die Stellen, an denen
// Grenzfälle wie der Jahreswechsel leicht durchrutschen. Laut CHANGELOG hing
// die Serie einmal an einem Zählerfeld statt an den tatsächlichen Besuchen.

import { describe, it, expect, afterEach, vi } from 'vitest';
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
    // 2026 hat 53 Wochen, KW 53 ist also die letzte Woche des Jahres.
    expect(h.lib.isWeekAdjacent(202653, 202701)).toBe(true);
    // Auch aus einem Jahr mit 52 Wochen heraus: 2025 endet mit KW 52.
    expect(h.lib.isWeekAdjacent(202552, 202601)).toBe(true);
    // 2020 hatte 53 Wochen, 2021 beginnt danach.
    expect(h.lib.isWeekAdjacent(202053, 202101)).toBe(true);
  });

  it('verneint einen Sprung ueber zwei Jahreswechsel', () => {
    expect(h.lib.isWeekAdjacent(202553, 202701)).toBe(false);
  });

  it('reisst, wenn die 53. Woche uebersprungen wurde', () => {
    // 2026 hat 53 Kalenderwochen. Zwischen KW 52/2026 und KW 1/2027 liegt
    // KW 53 — eine echte Lucke, die Serie darf hier nicht weiterlaufen.
    expect(h.lib.isWeekAdjacent(202652, 202701)).toBe(false);
    // Dasselbe fuer 2020, ebenfalls ein 53-Wochen-Jahr.
    expect(h.lib.isWeekAdjacent(202052, 202101)).toBe(false);
  });

  it('kennt die Laenge des jeweiligen Jahres', () => {
    // 2025 hat 52 Wochen: eine KW 53/2025 gibt es nicht, sie kann also auch
    // nicht Vorgaengerin von KW 1/2026 sein.
    expect(h.lib.isWeekAdjacent(202553, 202601)).toBe(false);
    // 2032 hat wieder 53 Wochen (Schaltjahr, beginnt an einem Donnerstag).
    expect(h.lib.isWeekAdjacent(203253, 203301)).toBe(true);
    expect(h.lib.isWeekAdjacent(203252, 203301)).toBe(false);
    // 2015 hatte 53 Wochen, 2014 nur 52.
    expect(h.lib.isWeekAdjacent(201452, 201501)).toBe(true);
    expect(h.lib.isWeekAdjacent(201553, 201601)).toBe(true);
    expect(h.lib.isWeekAdjacent(201552, 201601)).toBe(false);
  });
});

describe('isoWeeksInYear — wie viele Kalenderwochen ein Jahr hat', () => {
  const h = setup();

  it('gibt 53 fuer die Jahre, die eine 53. Woche haben', () => {
    // ISO 8601: 53 Wochen, wenn der 1. Januar ein Donnerstag ist oder ein
    // Schaltjahr an einem Mittwoch beginnt.
    expect(h.lib.isoWeeksInYear(2015)).toBe(53);
    expect(h.lib.isoWeeksInYear(2020)).toBe(53);
    expect(h.lib.isoWeeksInYear(2026)).toBe(53);
    expect(h.lib.isoWeeksInYear(2032)).toBe(53);
  });

  it('gibt 52 fuer die uebrigen Jahre', () => {
    expect(h.lib.isoWeeksInYear(2024)).toBe(52);
    expect(h.lib.isoWeeksInYear(2025)).toBe(52);
    expect(h.lib.isoWeeksInYear(2027)).toBe(52);
    expect(h.lib.isoWeeksInYear(2028)).toBe(52);
  });

  it('stimmt mit der Woche des 28. Dezember ueberein', () => {
    // Der 28.12. liegt nach ISO 8601 immer in der letzten Woche des Jahres.
    for (let jahr = 2015; jahr <= 2040; jahr++) {
      const letzte = h.lib.isoWeek(new Date(Date.UTC(jahr, 11, 28, 12, 0, 0))) % 100;
      expect(h.lib.isoWeeksInYear(jahr)).toBe(letzte);
    }
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

describe('streakFromVisits — Jahreswechsel mit 53 Kalenderwochen', () => {
  // Die Serie wird gegen die laufende Woche gerechnet. Fuer den Jahreswechsel
  // braucht es deshalb einen festen Zeitpunkt, sonst waere der Fall nur an
  // wenigen Tagen im Jahr pruefbar.
  afterEach(() => {
    vi.useRealTimers();
  });

  function amTag(iso) {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(iso));
  }

  function besuchAm(id, iso) {
    return { id, user: 'u1', checkin_at: new Date(iso).toISOString() };
  }

  it('zaehlt die 53. Woche als Bindeglied mit', () => {
    // 2026 hat KW 53 (28.12.2026 bis 3.1.2027). Wer in KW 51, 52, 53 und
    // KW 1/2027 da war, hat vier Wochen in Folge.
    amTag('2027-01-06T12:00:00.000Z'); // KW 1/2027
    const h = setup({
      visits: [
        besuchAm('v1', '2026-12-15T12:00:00.000Z'), // KW 51
        besuchAm('v2', '2026-12-22T12:00:00.000Z'), // KW 52
        besuchAm('v3', '2026-12-29T12:00:00.000Z'), // KW 53
        besuchAm('v4', '2027-01-05T12:00:00.000Z'), // KW 1/2027
      ],
    });
    expect(h.lib.streakFromVisits(h.records.user)).toBe(4);
  });

  it('bricht ab, wenn die 53. Woche fehlt', () => {
    // Dieselben Wochen ohne KW 53: Die Serie beginnt mit KW 1/2027 neu.
    amTag('2027-01-06T12:00:00.000Z');
    const h = setup({
      visits: [
        besuchAm('v1', '2026-12-15T12:00:00.000Z'), // KW 51
        besuchAm('v2', '2026-12-22T12:00:00.000Z'), // KW 52
        besuchAm('v4', '2027-01-05T12:00:00.000Z'), // KW 1/2027
      ],
    });
    expect(h.lib.streakFromVisits(h.records.user)).toBe(1);
  });

  it('traegt ueber ein Jahr mit nur 52 Wochen', () => {
    // 2025 endet mit KW 52; KW 1/2026 folgt unmittelbar darauf.
    amTag('2026-01-07T12:00:00.000Z'); // KW 2/2026
    const h = setup({
      visits: [
        besuchAm('v1', '2025-12-15T12:00:00.000Z'), // KW 51
        besuchAm('v2', '2025-12-22T12:00:00.000Z'), // KW 52
        besuchAm('v3', '2025-12-30T12:00:00.000Z'), // KW 1/2026
        besuchAm('v4', '2026-01-06T12:00:00.000Z'), // KW 2/2026
      ],
    });
    expect(h.lib.streakFromVisits(h.records.user)).toBe(4);
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
    // 31.12.2026 liegt in KW 53/2026, dem letzten der 53 Wochen dieses Jahres.
    const h = setup({
      users: [{ __name: 'user', id: 'u1', streak_weeks: 8, streak_last_visit: '2026-12-31T10:00:00.000Z' }],
    });
    h.lib.updateStreak(h.records.user, new Date('2027-01-04'));
    expect(h.records.user.get('streak_weeks')).toBe(9);
  });

  it('zaehlt auch aus einem Jahr mit 52 Wochen heraus hoch', () => {
    // 2025 endet mit KW 52 (29.12.2025 liegt schon in KW 1/2026 — deshalb
    // der 22.12.), danach folgt unmittelbar KW 1/2026.
    const h = setup({
      users: [{ __name: 'user', id: 'u1', streak_weeks: 4, streak_last_visit: '2025-12-22T10:00:00.000Z' }],
    });
    h.lib.updateStreak(h.records.user, new Date('2026-01-02T10:00:00.000Z'));
    expect(h.records.user.get('streak_weeks')).toBe(5);
  });

  it('faengt wieder bei 1 an, wenn die 53. Woche ausgelassen wurde', () => {
    // 2026 hat 53 Kalenderwochen. Letzter Besuch am 21.12.2026 (KW 52), die
    // Woche vom 28.12. bis 3.1. (KW 53) ausgelassen, am 4.1.2027 (KW 1) wieder
    // da: dazwischen fehlt eine ganze Woche, die Serie beginnt neu.
    const h = setup({
      users: [{ __name: 'user', id: 'u1', streak_weeks: 5, streak_last_visit: '2026-12-21T10:00:00.000Z' }],
    });
    h.lib.updateStreak(h.records.user, new Date('2027-01-04T10:00:00.000Z'));
    expect(h.records.user.get('streak_weeks')).toBe(1);
  });

  it('faengt nach einer Luecke wieder bei 1 an', () => {
    const h = setup({
      users: [{ __name: 'user', id: 'u1', streak_weeks: 12, streak_last_visit: '2026-08-01T10:00:00.000Z' }],
    });
    h.lib.updateStreak(h.records.user, new Date('2026-09-10'));
    expect(h.records.user.get('streak_weeks')).toBe(1);
  });

  it('faengt nach einer Luecke von zwei Jahren wieder bei 1 an', () => {
    // Wer Ende 2025 zuletzt da war und erst Anfang 2027 wiederkommt, hat ein
    // ganzes Jahr ausgelassen — auch wenn die Wochennummern (52 -> 1) auf den
    // ersten Blick aufeinanderzufolgen scheinen.
    const h = setup({
      users: [{ __name: 'user', id: 'u1', streak_weeks: 7, streak_last_visit: '2025-12-26T10:00:00.000Z' }],
    });
    h.lib.updateStreak(h.records.user, new Date('2027-01-04T10:00:00.000Z'));
    expect(h.records.user.get('streak_weeks')).toBe(1);
    // Dieselbe Auskunft gibt die gemeinsame Pruefung:
    expect(h.lib.isWeekAdjacent(202552, 202701)).toBe(false);
  });

  it('haelt den Zeitpunkt des Besuchs fest', () => {
    const h = setup();
    const wann = new Date('2026-09-10T14:30:00.000Z');
    h.lib.updateStreak(h.records.user, wann);
    expect(h.records.user.get('streak_last_visit')).toBe(wann.toISOString());
  });
});

describe('Jahreswechsel: alle drei Aufrufstellen urteilen gleich', () => {
  // Die Regel „welche Woche folgt auf welche" wurde frueher an drei Stellen
  // getrennt nachgebaut: in isWeekAdjacent, in updateStreak und im
  // Reset-Cron. Dieser Block haelt fest, dass sie jetzt dasselbe sagen.
  afterEach(() => {
    vi.useRealTimers();
  });

  const faelle = [
    // [Beschreibung, letzter Besuch, neuer Besuch, zusammenhaengend?]
    ['KW 53/2026 -> KW 1/2027', '2026-12-29T12:00:00.000Z', '2027-01-05T12:00:00.000Z', true],
    ['KW 52/2026 -> KW 1/2027 (KW 53 fehlt)', '2026-12-21T12:00:00.000Z', '2027-01-05T12:00:00.000Z', false],
    ['KW 52/2025 -> KW 1/2026', '2025-12-22T12:00:00.000Z', '2025-12-30T12:00:00.000Z', true],
    ['KW 52/2025 -> KW 1/2027 (ein Jahr Luecke)', '2025-12-22T12:00:00.000Z', '2027-01-05T12:00:00.000Z', false],
  ];

  for (const [was, letzter, neuer, zusammen] of faelle) {
    it(`${was}: ${zusammen ? 'zusammenhaengend' : 'Luecke'}`, () => {
      const letzteWoche = setup().lib.isoWeek(new Date(letzter));
      const neueWoche = setup().lib.isoWeek(new Date(neuer));

      // 1. Die gemeinsame Pruefung selbst.
      expect(setup().lib.isWeekAdjacent(letzteWoche, neueWoche)).toBe(zusammen);

      // 2. updateStreak: zaehlt hoch oder faengt bei 1 an.
      const hu = setup({
        users: [{ __name: 'user', id: 'u1', streak_weeks: 5, streak_last_visit: letzter }],
      });
      hu.lib.updateStreak(hu.records.user, new Date(neuer));
      expect(hu.records.user.get('streak_weeks')).toBe(zusammen ? 6 : 1);

      // 3. streakFromVisits: zaehlt beide Wochen oder nur die neue.
      vi.useFakeTimers();
      vi.setSystemTime(new Date(neuer));
      const hv = setup({
        visits: [
          { id: 'v1', user: 'u1', checkin_at: new Date(letzter).toISOString() },
          { id: 'v2', user: 'u1', checkin_at: new Date(neuer).toISOString() },
        ],
      });
      expect(hv.lib.streakFromVisits(hv.records.user)).toBe(zusammen ? 2 : 1);
      vi.useRealTimers();
    });
  }
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

  // Zwei Aktionen duerfen sich ueberschneiden — das Schema verbietet es nicht,
  // und die Auswahl laeuft ausdruecklich ueber mehrere Zeilen. Entscheidend ist
  // dann, dass die Aktion gewinnt, die tatsaechlich mehr Punkte bringt, und
  // nicht die mit dem hoechsten Wert im alten Sammelfeld.
  describe('zwei Aktionen gleichzeitig', () => {
    it('nimmt die Aktion mit dem hoeheren Holen-Faktor', () => {
      const h = setup({
        campaigns: [
          { id: 'c1', name: 'klein', starts_at: gestern, ends_at: morgen, multiplier: 5, mult_take: 1 },
          { id: 'c2', name: 'gross', starts_at: gestern, ends_at: morgen, multiplier: 1, mult_take: 10 },
        ],
      });
      const c = h.lib.findActiveCampaign(jetzt, h.records.user);
      expect(c && c.id).toBe('c2');
      expect(h.lib.campaignMult(c, 'take')).toBe(10);
    });

    it('nimmt die Aktion mit dem hoeheren Bringen-Faktor', () => {
      const h = setup({
        campaigns: [
          { id: 'c1', starts_at: gestern, ends_at: morgen, multiplier: 4 },
          { id: 'c2', starts_at: gestern, ends_at: morgen, mult_bring: 6 },
        ],
      });
      const c = h.lib.findActiveCampaign(jetzt, h.records.user);
      expect(c && c.id).toBe('c2');
      expect(h.lib.campaignMult(c, 'bring')).toBe(6);
    });

    it('nimmt weiterhin den hoeheren alten Sammelfaktor, wenn keine neuen Felder gepflegt sind', () => {
      const h = setup({
        campaigns: [
          { id: 'c1', starts_at: gestern, ends_at: morgen, multiplier: 2 },
          { id: 'c2', starts_at: gestern, ends_at: morgen, multiplier: 7 },
        ],
      });
      expect(h.lib.findActiveCampaign(jetzt, h.records.user).id).toBe('c2');
    });

    it('ueberspringt die staerkere Aktion, wenn sie fuer diese Person nicht gilt', () => {
      // Zielgruppe schlaegt Faktor: Eine Aktion nur fuer Serien ab zwei Wochen
      // darf einer Neuen nicht zufallen, auch wenn sie mehr Punkte braechte.
      const h = setup({
        users: [{ __name: 'user', id: 'u1', role: 'visitor', streak_weeks: 0 }],
        campaigns: [
          { id: 'c1', starts_at: gestern, ends_at: morgen, mult_take: 9, target_segment: 'streak2plus' },
          { id: 'c2', starts_at: gestern, ends_at: morgen, mult_take: 2, target_segment: 'all' },
        ],
      });
      const c = h.lib.findActiveCampaign(jetzt, h.records.user);
      expect(c && c.id).toBe('c2');
      expect(h.lib.campaignMult(c, 'take')).toBe(2);
    });

    it('zaehlt die Teilnahme an der staerkeren Aktion mit', () => {
      // Der Folgeschaden aus dem Befund: Gewinnt die schwaechere Aktion, liegt
      // ihr Faktor bei 1, bumpActionCount zaehlt nicht — und das zugehoerige
      // Aktions-Abzeichen bleibt aus.
      const h = setup({
        campaigns: [
          { id: 'c1', starts_at: gestern, ends_at: morgen, multiplier: 5, mult_take: 1 },
          { id: 'c2', starts_at: gestern, ends_at: morgen, multiplier: 1, mult_take: 10 },
        ],
      });
      const c = h.lib.findActiveCampaign(jetzt, h.records.user);
      h.lib.bumpActionCount(h.records.user, c, 'take', 1);
      const zeilen = h.rows('action_counts');
      expect(zeilen).toHaveLength(1);
      expect(zeilen[0].campaign).toBe('c2');
      expect(zeilen[0].count).toBe(1);
    });
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
