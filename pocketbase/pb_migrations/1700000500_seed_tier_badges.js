/// <reference path="../pb_data/types.d.ts" />

// Replace the flat starter badges with 4 tier badges (bronze/silber/gold/platin).
// Thresholds from the original v1.2 REQUIREMENTS + platin as the 4th step.

migrate(
  (db) => {
    const dao = new Dao(db);

    // Remove old flat badges (and their user_badges) so the set is clean.
    const oldSlugs = ['moin-macher', 'stammgast', 'sammler', 'fundgrube', 'durchhalter', 'treue-seele'];
    for (const slug of oldSlugs) {
      try {
        const b = dao.findFirstRecordByFilter('badges', `slug = "${slug}"`);
        // delete dependent user_badges first
        try {
          const ubs = dao.findRecordsByFilter('user_badges', `badge = "${b.id}"`);
          for (const ub of ubs) dao.deleteRecord(ub);
        } catch (_) {}
        dao.deleteRecord(b);
      } catch (_) {}
    }

    const tierBadges = [
      {
        slug: 'bringer',
        name: 'Bringer',
        description: 'Teile in den Laden gebracht',
        category: 'bringer',
        icon: 'gift',
        trigger_type: 'items_brought',
        b: 10, s: 25, g: 50, p: 100,
        rb: 50, rs: 100, rg: 200, rp: 500,
      },
      {
        slug: 'holer',
        name: 'Holer',
        description: 'Teile mitgenommen',
        category: 'holer',
        icon: 'shirt',
        trigger_type: 'scans',
        b: 10, s: 25, g: 50, p: 100,
        rb: 50, rs: 100, rg: 200, rp: 500,
      },
      {
        slug: 'besucher',
        name: 'Stammgast',
        description: 'Check-Ins im Laden',
        category: 'besucher',
        icon: 'door',
        trigger_type: 'visits',
        b: 5, s: 10, g: 25, p: 50,
        rb: 50, rs: 100, rg: 200, rp: 500,
      },
      {
        slug: 'streak',
        name: 'Durchhalter',
        description: 'Wochen in Folge besucht',
        category: 'streak',
        icon: 'flame',
        trigger_type: 'streak_weeks',
        b: 2, s: 4, g: 8, p: 12,
        rb: 50, rs: 100, rg: 200, rp: 500,
      },
    ];

    const col = dao.findCollectionByNameOrId('badges');
    for (const tb of tierBadges) {
      let exists = false;
      try {
        dao.findFirstRecordByFilter('badges', `slug = "${tb.slug}"`);
        exists = true;
      } catch (_) {}
      if (exists) continue;
      const rec = new Record(col);
      rec.set('slug', tb.slug);
      rec.set('name', tb.name);
      rec.set('description', tb.description);
      rec.set('category', tb.category);
      rec.set('icon', tb.icon);
      rec.set('trigger_type', tb.trigger_type);
      rec.set('tier', 'bronze'); // base display tier
      rec.set('tier_bronze', tb.b);
      rec.set('tier_silber', tb.s);
      rec.set('tier_gold', tb.g);
      rec.set('tier_platin', tb.p);
      rec.set('reward_bronze', tb.rb);
      rec.set('reward_silber', tb.rs);
      rec.set('reward_gold', tb.rg);
      rec.set('reward_platin', tb.rp);
      rec.set('is_visible', true);
      dao.saveRecord(rec);
    }
  },
  (db) => {
    const dao = new Dao(db);
    for (const slug of ['bringer', 'holer', 'besucher', 'streak']) {
      try {
        dao.deleteRecord(dao.findFirstRecordByFilter('badges', `slug = "${slug}"`));
      } catch (_) {}
    }
  },
);
