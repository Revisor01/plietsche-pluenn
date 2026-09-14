// Tests für die Abzeichen-Logik in lib/points.js.
//
// Hier liegen laut CHANGELOG die meisten bisherigen Fehler: Stufen, die der
// Server vergab, aber die App nicht zeigte; Fortschritt, der als veraltete
// Kopie stehen blieb; Abzeichen, die stumm ausfielen. Die Logik ist über
// mehrere Methoden verteilt, die einander aufrufen — deshalb hier direkt
// geprüft und nicht nur über die Routen.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const { loadHook } = createRequire(import.meta.url)('./harness.js');

// Die Bibliothek läuft in derselben Umgebung wie ein Hook. scan.pb.js dient
// nur als Träger; benutzt wird ausschließlich das zurückgegebene lib-Objekt.
function setup(store = {}) {
  const h = loadHook('scan.pb.js', {
    store: [Object.assign({ __name: 'store', pts_checkin: 10, pts_take: 5 }, store.store || {})],
    users: store.users || [{ __name: 'user', id: 'u1', points_total: 0 }],
    badges: store.badges || [],
    user_badges: store.user_badges || [],
    visits: store.visits || [],
    points_log: store.points_log || [],
    campaigns: store.campaigns || [],
    action_counts: store.action_counts || [],
    items: [],
  });
  return h;
}

// Ein gestuftes Abzeichen mit aufsteigenden Schwellen.
const GESTUFT = {
  id: 'b1',
  name: 'Sammler',
  kind: 'tiered',
  trigger_type: 'visits',
  tier_bronze: 5,
  tier_silber: 10,
  tier_gold: 25,
  tier_platin: 50,
  tier_diamant: 100,
  reward_bronze: 10,
  reward_silber: 20,
  reward_gold: 50,
  reward_platin: 100,
  reward_diamant: 200,
};

function besuche(n, userId = 'u1') {
  return Array.from({ length: n }, (_, i) => ({
    id: `v${i}`,
    user: userId,
    checkin_at: new Date(2026, 0, 1 + i).toISOString(),
  }));
}

describe('badgeTiers — welche Stufen ein Abzeichen hat', () => {
  it('liefert alle fuenf Stufen in fester Reihenfolge', () => {
    const h = setup({ badges: [GESTUFT] });
    const tiers = h.lib.badgeTiers(h.store.badges[0]);
    expect(tiers.map((t) => t.tier)).toEqual(['bronze', 'silber', 'gold', 'platin', 'diamant']);
    expect(tiers.map((t) => t.at)).toEqual([5, 10, 25, 50, 100]);
  });

  it('laesst leere Stufen weg', () => {
    // Warum manche Abzeichen Diamant hatten und andere nicht: ein leeres Feld.
    const h = setup({
      badges: [{ id: 'b1', name: 'Kurz', tier_bronze: 5, tier_silber: 10 }],
    });
    const tiers = h.lib.badgeTiers(h.store.badges[0]);
    expect(tiers.map((t) => t.tier)).toEqual(['bronze', 'silber']);
  });

  it('begrenzt auf die Zahl der gepflegten Raenge', () => {
    // Wer einen Rang entfernt, sieht eine Stufe weniger — der Server darf sie
    // dann auch nicht mehr vergeben.
    const h = setup({
      store: { tiers_json: [1, 2, 3] },
      badges: [GESTUFT],
    });
    const tiers = h.lib.badgeTiers(h.store.badges[0]);
    expect(tiers.map((t) => t.tier)).toEqual(['bronze', 'silber', 'gold']);
  });

  it('schneidet vor dem Aussortieren leerer Stufen ab', () => {
    // Die Reihenfolge ist entscheidend: erst auf die Zahl der Raenge kuerzen,
    // dann leere entfernen. Ein Abzeichen, bei dem nur Diamant gefuellt ist,
    // verliert diese Stufe bei drei Raengen vollstaendig — sonst ruecke sie
    // faelschlich auf Platz eins.
    const h = setup({
      store: { tiers_json: [1, 2, 3] },
      badges: [{ id: 'b1', name: 'Nur Diamant', tier_diamant: 100 }],
    });
    expect(h.lib.badgeTiers(h.store.badges[0])).toEqual([]);
  });

  it('nimmt fuenf Stufen an, wenn keine Raenge gepflegt sind', () => {
    const h = setup({ badges: [GESTUFT] });
    expect(h.lib.tierSlotCount()).toBe(5);
  });

  it('begrenzt die Stufenzahl nach oben auf fuenf', () => {
    const h = setup({ store: { tiers_json: [1, 2, 3, 4, 5, 6, 7] }, badges: [GESTUFT] });
    expect(h.lib.tierSlotCount()).toBe(5);
  });

  // PocketBase gibt ein json-Feld je nach Schreibweg als Array ODER als
  // Zeichenkette zurueck. Wird die Zeichenkette nicht ausgepackt, zaehlt die
  // Laenge Zeichen statt Raenge — und die Stufen darueber fallen stumm aus.
  it('liest die Raenge auch als Zeichenkette', () => {
    const h = setup({
      store: { tiers_json: '[{"at":150},{"at":750},{"at":1500}]' },
      badges: [GESTUFT],
    });
    expect(h.lib.tierSlotCount()).toBe(3);
  });

  it('nimmt bei leerer Rangliste als Zeichenkette fuenf Stufen an', () => {
    // Der schaedliche Fall: '[]' hat zwei Zeichen. Ohne Auspacken blieben nur
    // Bronze und Silber uebrig — Gold, Platin und Diamant waeren fuer jedes
    // gestufte Abzeichen unerreichbar, samt der Punkte dahinter.
    const h = setup({ store: { tiers_json: '[]' }, badges: [GESTUFT] });
    expect(h.lib.tierSlotCount()).toBe(5);
    const tiers = h.lib.badgeTiers(h.store.badges[0]);
    expect(tiers.map((t) => t.tier)).toEqual(['bronze', 'silber', 'gold', 'platin', 'diamant']);
  });

  it('nimmt bei unlesbarer Rangliste fuenf Stufen an', () => {
    // Kaputter Inhalt darf nicht heimlich Stufen kosten.
    const h = setup({ store: { tiers_json: 'nicht json' }, badges: [GESTUFT] });
    expect(h.lib.tierSlotCount()).toBe(5);
  });
});

describe('reachedTier — welche Stufe erreicht ist', () => {
  function stufe(progress, store = {}) {
    const h = setup(Object.assign({ badges: [GESTUFT] }, store));
    return h.lib.reachedTier(h.store.badges[0], progress);
  }

  it('gibt ohne Fortschritt keine Stufe', () => {
    expect(stufe(0)).toBe('none');
  });

  it('gibt knapp unter der ersten Schwelle noch keine Stufe', () => {
    expect(stufe(4)).toBe('none');
  });

  it('gibt genau auf der Schwelle die Stufe', () => {
    // Die Schwelle ist erreicht, nicht ueberschritten.
    expect(stufe(5)).toBe('bronze');
    expect(stufe(10)).toBe('silber');
    expect(stufe(100)).toBe('diamant');
  });

  it('gibt zwischen zwei Schwellen die untere Stufe', () => {
    expect(stufe(24)).toBe('silber');
  });

  it('bleibt oberhalb der hoechsten Schwelle bei der hoechsten Stufe', () => {
    expect(stufe(9999)).toBe('diamant');
  });
});

describe('computeProgress — woraus sich der Fortschritt ergibt', () => {
  it('zaehlt Besuche vollstaendig', () => {
    // Die Zaehlung war einmal auf die ersten Eintraege begrenzt, wodurch der
    // Fortschritt ab einem bestimmten Punkt stehen blieb.
    const h = setup({
      badges: [{ id: 'b1', trigger_type: 'visits' }],
      visits: besuche(120),
    });
    expect(h.lib.computeProgress(h.records.user, h.store.badges[0])).toBe(120);
  });

  it('zaehlt nur die Besuche der eigenen Person', () => {
    const h = setup({
      badges: [{ id: 'b1', trigger_type: 'visits' }],
      visits: [...besuche(3, 'u1'), ...besuche(7, 'u2')],
    });
    expect(h.lib.computeProgress(h.records.user, h.store.badges[0])).toBe(3);
  });

  it('zaehlt gescannte Teile ueber den Punkte-Verlauf', () => {
    const h = setup({
      badges: [{ id: 'b1', trigger_type: 'scans' }],
      points_log: [
        { id: 'p1', user: 'u1', kind: 'scan', points: 30 },
        { id: 'p2', user: 'u1', kind: 'scan', points: 30 },
        { id: 'p3', user: 'u1', kind: 'checkin', points: 10 },
        { id: 'p4', user: 'u2', kind: 'scan', points: 30 },
      ],
    });
    expect(h.lib.computeProgress(h.records.user, h.store.badges[0])).toBe(2);
  });

  it('zaehlt gebrachte Teile getrennt von gescannten', () => {
    const h = setup({
      badges: [{ id: 'b1', trigger_type: 'items_brought' }],
      points_log: [
        { id: 'p1', user: 'u1', kind: 'bring', points: 5 },
        { id: 'p2', user: 'u1', kind: 'scan', points: 30 },
      ],
    });
    expect(h.lib.computeProgress(h.records.user, h.store.badges[0])).toBe(1);
  });

  it('leitet die Serie aus den Besuchen ab, nicht aus dem Zaehlerfeld', () => {
    // "Durchhalter" stand auf 1/2 Wochen, obwohl seit Wochen niemand da war:
    // Der Wert kam aus einem Feld beim Nutzer statt aus den echten Besuchen.
    const h = setup({
      users: [{ __name: 'user', id: 'u1', streak_weeks: 7, streak_last_visit: '2026-01-01' }],
      badges: [{ id: 'b1', trigger_type: 'streak_weeks' }],
      visits: [],
    });
    expect(h.lib.computeProgress(h.records.user, h.store.badges[0])).toBe(0);
  });

  it('gibt fuer ein Aktions-Abzeichen ohne verknuepfte Aktion 0', () => {
    const h = setup({ badges: [{ id: 'b1', trigger_type: 'action_participation' }] });
    expect(h.lib.computeProgress(h.records.user, h.store.badges[0])).toBe(0);
  });

  it('liest den Stand einer verknuepften Aktion', () => {
    const h = setup({
      badges: [{ id: 'b1', trigger_type: 'action_participation', campaign: 'c1' }],
      action_counts: [{ id: 'ac1', user: 'u1', campaign: 'c1', count: 4 }],
    });
    expect(h.lib.computeProgress(h.records.user, h.store.badges[0])).toBe(4);
  });

  it('gibt bei unbekanntem Ausloeser 0', () => {
    const h = setup({ badges: [{ id: 'b1', trigger_type: 'season_window' }] });
    expect(h.lib.computeProgress(h.records.user, h.store.badges[0])).toBe(0);
  });
});

describe('checkBadges — gestufte Abzeichen', () => {
  it('legt einen Fortschrittseintrag an, auch ohne erreichte Stufe', () => {
    const h = setup({ badges: [GESTUFT], visits: besuche(2) });
    h.lib.checkBadges(h.records.user);
    const ubs = h.rows('user_badges');
    expect(ubs).toHaveLength(1);
    expect(ubs[0].progress).toBe(2);
    expect(ubs[0].current_tier).toBe('none');
  });

  it('vergibt die erste Stufe samt Bonus', () => {
    const h = setup({ badges: [GESTUFT], visits: besuche(5) });
    h.lib.checkBadges(h.records.user);
    expect(h.rows('user_badges')[0].current_tier).toBe('bronze');
    expect(h.records.user.get('points_total')).toBe(10);
  });

  it('belohnt beim Ueberspringen jede Stufe einzeln', () => {
    // Von null auf 25 Besuche: Bronze, Silber und Gold auf einmal.
    // 10 + 20 + 50 = 80.
    const h = setup({ badges: [GESTUFT], visits: besuche(25) });
    h.lib.checkBadges(h.records.user);
    expect(h.rows('user_badges')[0].current_tier).toBe('gold');
    expect(h.records.user.get('points_total')).toBe(80);
    // Eine Zeile je Stufe im Verlauf.
    const badgeZeilen = h.rows('points_log').filter((p) => p.kind === 'badge');
    expect(badgeZeilen.map((p) => p.label)).toEqual([
      'Sammler — bronze',
      'Sammler — silber',
      'Sammler — gold',
    ]);
  });

  it('belohnt beim naechsten Aufstieg nur die neu erreichten Stufen', () => {
    const h = setup({
      badges: [GESTUFT],
      visits: besuche(10),
      user_badges: [{ id: 'ub1', user: 'u1', badge: 'b1', progress: 5, current_tier: 'bronze' }],
    });
    h.lib.checkBadges(h.records.user);
    // Nur Silber (20), nicht noch einmal Bronze.
    expect(h.records.user.get('points_total')).toBe(20);
    expect(h.rows('user_badges')[0].current_tier).toBe('silber');
  });

  it('vergibt dieselbe Stufe nicht zweimal', () => {
    const h = setup({
      badges: [GESTUFT],
      visits: besuche(7),
      user_badges: [{ id: 'ub1', user: 'u1', badge: 'b1', progress: 5, current_tier: 'bronze' }],
    });
    h.lib.checkBadges(h.records.user);
    expect(h.records.user.get('points_total')).toBe(0);
    expect(h.rows('user_badges')[0].current_tier).toBe('bronze');
  });

  it('nimmt bei sinkendem Fortschritt keine Stufe zurueck', () => {
    // Die Stufe ist verdient; nur der angezeigte Stand sinkt.
    const h = setup({
      badges: [GESTUFT],
      visits: besuche(3),
      user_badges: [{ id: 'ub1', user: 'u1', badge: 'b1', progress: 12, current_tier: 'silber' }],
    });
    h.lib.checkBadges(h.records.user);
    const ub = h.rows('user_badges')[0];
    expect(ub.current_tier).toBe('silber');
    expect(ub.progress).toBe(3);
    // Und es gibt dafuer keine Punkte.
    expect(h.records.user.get('points_total')).toBe(0);
  });

  it('haelt den Zeitpunkt der ersten Stufe fest und ueberschreibt ihn nicht', () => {
    const h = setup({
      badges: [GESTUFT],
      visits: besuche(10),
      user_badges: [
        {
          id: 'ub1',
          user: 'u1',
          badge: 'b1',
          progress: 5,
          current_tier: 'bronze',
          unlocked_at: '2026-01-15T10:00:00.000Z',
        },
      ],
    });
    h.lib.checkBadges(h.records.user);
    expect(h.rows('user_badges')[0].unlocked_at).toBe('2026-01-15T10:00:00.000Z');
  });

  it('vergibt keine Stufe, die es nach dem Entfernen eines Rangs nicht mehr gibt', () => {
    // Der Server hielt sich frueher nicht an die Zahl der Raenge und vergab
    // im Hintergrund weiter, was die App nicht mehr anzeigte.
    const h = setup({
      store: { tiers_json: [1, 2] },
      badges: [GESTUFT],
      visits: besuche(30),
    });
    h.lib.checkBadges(h.records.user);
    expect(h.rows('user_badges')[0].current_tier).toBe('silber');
    // Nur Bronze und Silber zahlen: 10 + 20.
    expect(h.records.user.get('points_total')).toBe(30);
  });
});

describe('checkBadges — Einzel-Abzeichen', () => {
  const EINZEL = {
    id: 'b1',
    name: 'Erster Besuch',
    kind: 'single',
    trigger_type: 'visits',
    trigger_value: 1,
    points_reward: 25,
  };

  it('vergibt es beim Erreichen der Schwelle', () => {
    const h = setup({ badges: [EINZEL], visits: besuche(1) });
    h.lib.checkBadges(h.records.user);
    const ub = h.rows('user_badges')[0];
    expect(ub.current_tier).toBe('gold');
    expect(h.records.user.get('points_total')).toBe(25);
  });

  it('vergibt es unterhalb der Schwelle nicht', () => {
    const h = setup({ badges: [Object.assign({}, EINZEL, { trigger_value: 5 })], visits: besuche(4) });
    h.lib.checkBadges(h.records.user);
    expect(h.rows('user_badges')[0].current_tier).toBe('none');
    expect(h.records.user.get('points_total')).toBe(0);
  });

  it('zahlt den Bonus nur einmal', () => {
    const h = setup({
      badges: [EINZEL],
      visits: besuche(3),
      user_badges: [{ id: 'ub1', user: 'u1', badge: 'b1', progress: 1, current_tier: 'gold' }],
    });
    h.lib.checkBadges(h.records.user);
    expect(h.records.user.get('points_total')).toBe(0);
  });

  it('vergibt Treue- und Aktions-Abzeichen nicht von selbst', () => {
    // Die laufen ueber ihre eigenen naechtlichen Aufgaben; sonst kaeme das
    // Abzeichen zum falschen Zeitpunkt.
    const h = setup({
      badges: [
        { id: 'b1', name: 'Treue', kind: 'single', trigger_type: 'years_active', trigger_value: 1 },
        {
          id: 'b2',
          name: 'Dabei',
          kind: 'single',
          trigger_type: 'action_participation',
          campaign: 'c1',
          trigger_value: 1,
        },
      ],
      visits: besuche(50),
      action_counts: [{ id: 'ac1', user: 'u1', campaign: 'c1', count: 9 }],
    });
    h.lib.checkBadges(h.records.user);
    for (const ub of h.rows('user_badges')) expect(ub.current_tier).toBe('none');
    expect(h.records.user.get('points_total')).toBe(0);
  });
});

describe('grantBadge — ausdrueckliche Vergabe', () => {
  const EINZEL = { id: 'b1', name: 'Treue', kind: 'single', points_reward: 100 };

  it('vergibt das Abzeichen und meldet Erfolg', () => {
    const h = setup({ badges: [EINZEL] });
    expect(h.lib.grantBadge(h.records.user, h.store.badges[0])).toBe(true);
    const ub = h.rows('user_badges')[0];
    expect(ub.current_tier).toBe('gold');
    expect(ub.progress).toBe(1);
    expect(h.records.user.get('points_total')).toBe(100);
  });

  it('vergibt ein bereits vergebenes Abzeichen nicht erneut', () => {
    const h = setup({
      badges: [EINZEL],
      user_badges: [{ id: 'ub1', user: 'u1', badge: 'b1', progress: 1, current_tier: 'gold' }],
    });
    expect(h.lib.grantBadge(h.records.user, h.store.badges[0])).toBe(false);
    expect(h.records.user.get('points_total')).toBe(0);
  });

  it('vergibt ein begonnenes, aber unerreichtes Abzeichen', () => {
    const h = setup({
      badges: [EINZEL],
      user_badges: [{ id: 'ub1', user: 'u1', badge: 'b1', progress: 0, current_tier: 'none' }],
    });
    expect(h.lib.grantBadge(h.records.user, h.store.badges[0])).toBe(true);
    expect(h.records.user.get('points_total')).toBe(100);
  });
});
