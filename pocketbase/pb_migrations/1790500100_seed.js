/// <reference path="../pb_data/types.d.ts" />

// Startbestand nur für eine frische Installation, je Teil nur bei leerer Sammlung; Werte wie in pb_hooks/lib/points.js.

migrate((app) => {
  const isEmpty = (name) => {
    try {
      app.findFirstRecordByFilter(name, '1=1');
      return false;
    } catch (_) {
      return true;
    }
  };

  // ── Laden ────────────────────────────────────────────────────
  if (isEmpty('store')) {
    const rec = new Record(app.findCollectionByNameOrId('store'));
    rec.set('name', 'Plietsche Plünn');
    rec.set('address', 'Kirchengemeinde Lokstedt, Hamburg');
    rec.set('lat', 53.6045);
    rec.set('lng', 9.9476);
    rec.set('phone', '');
    rec.set('hours_json', { mo: null, di: '15-18', mi: null, do: '15-18', fr: null, sa: '10-13', so: null });
    rec.set('geofence_radius_m', 150);
    rec.set('pts_checkin', 10);
    rec.set('pts_take', 5);
    rec.set('pts_bring', 5);
    rec.set('max_items_take', 7);
    rec.set('tiers_json', [
      { name: 'Bronze', at: 150 },
      { name: 'Silber', at: 750 },
      { name: 'Gold', at: 1500 },
      { name: 'Platin', at: 3000 },
      { name: 'Diamant', at: 6000 },
    ]);
    rec.set('timezone', 'Europe/Berlin');
    app.save(rec);
  }

  // ── Türgeheimnis zufällig je Installation, nie im Repo ──
  if (isEmpty('store_secrets')) {
    const rec = new Record(app.findCollectionByNameOrId('store_secrets'));
    rec.set('checkin_qr_secret', $security.randomString(32));
    app.save(rec);
  }

  // ── Abzeichen ───────────────────────────────────────────────
  if (isEmpty('badges')) {
    const col = app.findCollectionByNameOrId('badges');
    const tiered = [
      { slug: 'bringer', name: 'Bringer', description: 'Teile in den Laden gebracht', category: 'bringer', icon: 'gift', trigger_type: 'items_brought', t: [10, 25, 50, 100] },
      { slug: 'holer', name: 'Holer', description: 'Teile mitgenommen', category: 'holer', icon: 'shirt', trigger_type: 'scans', t: [10, 25, 50, 100] },
      { slug: 'besucher', name: 'Stammgast', description: 'Check-Ins im Laden', category: 'besucher', icon: 'door', trigger_type: 'visits', t: [5, 10, 25, 50] },
      { slug: 'streak', name: 'Durchhalter', description: 'Wochen in Folge besucht', category: 'streak', icon: 'flame', trigger_type: 'streak_weeks', t: [2, 4, 8, 12] },
    ];
    for (const b of tiered) {
      const rec = new Record(col);
      rec.set('slug', b.slug);
      rec.set('name', b.name);
      rec.set('description', b.description);
      rec.set('category', b.category);
      rec.set('icon', b.icon);
      rec.set('trigger_type', b.trigger_type);
      rec.set('kind', 'tiered');
      rec.set('tier', 'bronze');
      rec.set('tier_bronze', b.t[0]);
      rec.set('tier_silber', b.t[1]);
      rec.set('tier_gold', b.t[2]);
      rec.set('tier_platin', b.t[3]);
      rec.set('reward_bronze', 50);
      rec.set('reward_silber', 100);
      rec.set('reward_gold', 200);
      rec.set('reward_platin', 500);
      rec.set('is_visible', true);
      app.save(rec);
    }
  }
}, (app) => {
  // Kein Rückweg, an Laden und Abzeichen hängen schnell echte Daten.
  return null;
});
