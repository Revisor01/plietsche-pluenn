/// <reference path="../pb_data/types.d.ts" />

// Seed: store singleton + starter badges. Idempotent (skips if rows exist).

migrate(
  (db) => {
    const dao = new Dao(db);

    // ─── store singleton ───────────────────────────────────────
    let storeExists = false;
    try {
      dao.findFirstRecordByFilter('store', '1=1');
      storeExists = true;
    } catch (_) {}
    if (!storeExists) {
      const storeCol = dao.findCollectionByNameOrId('store');
      const rec = new Record(storeCol);
      rec.set('name', 'Plietsche Plünn');
      rec.set('address', 'Kirchengemeinde Lokstedt, Hamburg');
      rec.set('lat', 53.6045);
      rec.set('lng', 9.9476);
      rec.set('phone', '');
      rec.set('hours_json', { mo: null, di: '15-18', mi: null, do: '15-18', fr: null, sa: '10-13', so: null });
      rec.set('geofence_radius_m', 150);
      rec.set('checkin_qr_secret', $security.randomString(32));
      dao.saveRecord(rec);
    }

    // ─── starter badges ────────────────────────────────────────
    const badges = [
      { slug: 'moin-macher', name: 'Moin-Macher', description: '5 Check-Ins im Laden', category: 'besucher', tier: 'bronze', icon: 'door', trigger_type: 'visits', trigger_value: 5, points_reward: 50 },
      { slug: 'stammgast', name: 'Stammgast', description: '20 Check-Ins', category: 'besucher', tier: 'silver', icon: 'door', trigger_type: 'visits', trigger_value: 20, points_reward: 100 },
      { slug: 'sammler', name: 'Sammler', description: '10 Teile gescannt', category: 'holer', tier: 'bronze', icon: 'qr', trigger_type: 'scans', trigger_value: 10, points_reward: 50 },
      { slug: 'fundgrube', name: 'Fundgrube', description: '50 Teile gescannt', category: 'holer', tier: 'gold', icon: 'qr', trigger_type: 'scans', trigger_value: 50, points_reward: 200 },
      { slug: 'durchhalter', name: 'Durchhalter', description: '4 Wochen Streak', category: 'streak', tier: 'silver', icon: 'flame', trigger_type: 'streak_weeks', trigger_value: 4, points_reward: 100 },
      { slug: 'treue-seele', name: 'Treue Seele', description: '12 Wochen Streak', category: 'streak', tier: 'gold', icon: 'flame', trigger_type: 'streak_weeks', trigger_value: 12, points_reward: 300 },
    ];
    const badgeCol = dao.findCollectionByNameOrId('badges');
    for (const b of badges) {
      let exists = false;
      try {
        dao.findFirstRecordByFilter('badges', `slug = "${b.slug}"`);
        exists = true;
      } catch (_) {}
      if (exists) continue;
      const rec = new Record(badgeCol);
      Object.keys(b).forEach((k) => rec.set(k, b[k]));
      rec.set('is_visible', true);
      dao.saveRecord(rec);
    }
  },
  (db) => {
    const dao = new Dao(db);
    for (const slug of ['moin-macher', 'stammgast', 'sammler', 'fundgrube', 'durchhalter', 'treue-seele']) {
      try {
        dao.deleteRecord(dao.findFirstRecordByFilter('badges', `slug = "${slug}"`));
      } catch (_) {}
    }
  },
);
