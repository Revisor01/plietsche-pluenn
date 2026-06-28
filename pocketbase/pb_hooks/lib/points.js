// Shared business logic for points, streaks, campaigns, badges.
// Imported by hook files via require(__hooks + '/lib/points.js').

// Central point values — adjust here. Bringing and taking are equally valued;
// campaigns add a multiplier on top. Self-entered items earn a bonus per entry.
const POINTS = {
  checkin: 10,
  takePerItem: 5, // scanning / "took N" via stepper
  bringPerItem: 5, // confirmed brought item (same value as taking)
  selfEntryBonus: 10, // extra per self-entered (approved) item, on top of bringPerItem
};

const TIER_ORDER = ['none', 'bronze', 'silber', 'gold', 'platin', 'diamant'];

module.exports = {
  POINTS,
  TIER_ORDER,

  // Find the highest-multiplier campaign active right now for this user.
  findActiveCampaign(now) {
    const iso = now.toISOString().replace('T', ' ');
    try {
      return $app
        .dao()
        .findFirstRecordByFilter('campaigns', `starts_at <= "${iso}" && ends_at >= "${iso}"`, { sort: '-multiplier' });
    } catch (_) {
      return null;
    }
  },

  // Award points: write points_log, then recompute users.points_total from the
  // log sum (source of truth). Recomputing — instead of incrementing in memory —
  // keeps points_total self-healing: it can never drift from points_log, even
  // across multiple awardPoints() calls in one request or a stale user object.
  awardPoints(user, points, kind, label, refId) {
    const dao = $app.dao();
    const col = dao.findCollectionByNameOrId('points_log');
    const rec = new Record(col);
    rec.set('user', user.id);
    rec.set('points', points);
    rec.set('kind', kind);
    rec.set('label', label || '');
    if (refId) rec.set('ref_id', refId);
    dao.saveRecord(rec);

    this.recomputeTotal(user);
  },

  // Recompute points_total as the sum of all points_log rows for this user.
  // Mutates the passed user object in place and persists it.
  recomputeTotal(user) {
    const dao = $app.dao();
    let total = 0;
    try {
      const rows = dao.findRecordsByFilter('points_log', `user = "${user.id}"`);
      for (const r of rows) total += r.get('points') || 0;
    } catch (_) {
      total = user.get('points_total') || 0;
    }
    user.set('points_total', total);
    dao.saveRecord(user);
  },

  // Has the user already created a visit today? (no double check-in bonus)
  hasVisitToday(userId, now) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const startIso = start.toISOString().replace('T', ' ');
    try {
      const rows = $app
        .dao()
        .findRecordsByFilter('visits', `user = "${userId}" && checkin_at >= "${startIso}"`, '-checkin_at', 1);
      return rows.length > 0;
    } catch (_) {
      return false;
    }
  },

  // Create a visit + award check-in bonus + update streak. Returns awarded points.
  // Guards against a double check-in race (fast double-tap / retry): re-checks
  // hasVisitToday immediately before inserting the visit, so two concurrent
  // requests can't both create a visit + bonus for the same day.
  doCheckin(user, now, opts) {
    opts = opts || {};
    // Race guard: another request may have created today's visit between the
    // caller's check and here. If so, only count extra stepper items, no bonus.
    if (this.hasVisitToday(user.id, now)) {
      const camp2 = this.findActiveCampaign(now);
      const mult2 = camp2 ? camp2.get('multiplier') : 1.0;
      const itemsCount2 = Math.max(0, parseInt(opts.itemsCount || 0, 10));
      const stepperOnly = Math.round(itemsCount2 * this.POINTS.takePerItem * mult2);
      if (stepperOnly > 0) {
        this.awardPoints(user, stepperOnly, 'checkin', `${itemsCount2} Teile mitgenommen`, null);
      }
      return { points: stepperOnly, visitId: null, deduped: true };
    }

    const camp = this.findActiveCampaign(now);
    const mult = camp ? camp.get('multiplier') : 1.0;
    const itemsCount = Math.max(0, parseInt(opts.itemsCount || 0, 10));

    const visitsCol = $app.dao().findCollectionByNameOrId('visits');
    const visit = new Record(visitsCol);
    visit.set('user', user.id);
    visit.set('checkin_at', now.toISOString());
    visit.set('items_count', itemsCount);
    if (opts.lat != null) visit.set('gps_lat', opts.lat);
    if (opts.lng != null) visit.set('gps_lng', opts.lng);
    if (opts.distance != null) visit.set('gps_distance_m', Math.round(opts.distance));
    if (camp) visit.set('campaign', camp.id);

    const checkinPts = Math.round(this.POINTS.checkin * mult);
    const stepperPts = Math.round(itemsCount * this.POINTS.takePerItem * mult);
    visit.set('points_awarded', checkinPts + stepperPts);
    $app.dao().saveRecord(visit);

    this.awardPoints(user, checkinPts, 'checkin', 'Check-In im Laden', visit.id);
    if (stepperPts > 0) {
      this.awardPoints(user, stepperPts, 'checkin', `${itemsCount} Teile mitgenommen`, visit.id);
    }
    this.updateStreak(user, now);
    return { points: checkinPts + stepperPts, visitId: visit.id };
  },

  // ISO week number for streak comparison.
  isoWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return d.getUTCFullYear() * 100 + week;
  },

  updateStreak(user, visitDate) {
    const lastStr = `${user.get('streak_last_visit')}`.trim();
    const current = user.get('streak_weeks') || 0;
    if (!lastStr) {
      user.set('streak_weeks', 1);
    } else {
      const lastWeek = this.isoWeek(new Date(lastStr));
      const thisWeek = this.isoWeek(visitDate);
      if (thisWeek === lastWeek) {
        // same week, no change
      } else if (thisWeek - lastWeek === 1 || (thisWeek % 100 === 1 && lastWeek % 100 >= 52)) {
        user.set('streak_weeks', current + 1);
      } else {
        user.set('streak_weeks', 1);
      }
    }
    user.set('streak_last_visit', visitDate.toISOString());
    $app.dao().saveRecord(user);
  },

  // Tier thresholds + rewards for a badge, ordered bronze→platin.
  badgeTiers(badge) {
    return [
      { tier: 'bronze', at: badge.get('tier_bronze') || 0, reward: badge.get('reward_bronze') || 0 },
      { tier: 'silber', at: badge.get('tier_silber') || 0, reward: badge.get('reward_silber') || 0 },
      { tier: 'gold', at: badge.get('tier_gold') || 0, reward: badge.get('reward_gold') || 0 },
      { tier: 'platin', at: badge.get('tier_platin') || 0, reward: badge.get('reward_platin') || 0 },
      { tier: 'diamant', at: badge.get('tier_diamant') || 0, reward: badge.get('reward_diamant') || 0 },
    ].filter((t) => t.at > 0);
  },

  // Highest tier reached for a given raw progress value.
  reachedTier(badge, progress) {
    let reached = 'none';
    for (const t of this.badgeTiers(badge)) {
      if (progress >= t.at) reached = t.tier;
    }
    return reached;
  },

  checkBadges(user) {
    const dao = $app.dao();
    let badges;
    try {
      badges = dao.findRecordsByFilter('badges', '1=1');
    } catch (_) {
      return;
    }
    for (const badge of badges) {
      let ub;
      try {
        ub = dao.findFirstRecordByFilter('user_badges', `user = "${user.id}" && badge = "${badge.id}"`);
      } catch (_) {
        const col = dao.findCollectionByNameOrId('user_badges');
        ub = new Record(col);
        ub.set('user', user.id);
        ub.set('badge', badge.id);
        ub.set('progress', 0);
        ub.set('current_tier', 'none');
      }

      const kind = `${badge.get('kind') || 'tiered'}`;
      const progress = this.computeProgress(user, badge);
      ub.set('progress', progress);

      if (kind === 'single') {
        // One-time award: granted once the (single) threshold is met. Awards the
        // optional points_reward bonus once, sets current_tier='gold' as the
        // "earned" marker. years_active / action_participation are granted by
        // their own routines (grantBadge), not here.
        const need = badge.get('trigger_value') || 1;
        const already = `${ub.get('current_tier') || 'none'}` !== 'none';
        const triggerType = `${badge.get('trigger_type')}`;
        const autoEval = triggerType !== 'years_active' && triggerType !== 'action_participation';
        if (autoEval && !already && progress >= need) {
          const bonus = badge.get('points_reward') || 0;
          if (bonus > 0) this.awardPoints(user, bonus, 'badge', `${badge.get('name')}`, badge.id);
          ub.set('current_tier', 'gold');
          ub.set('unlocked_at', new Date().toISOString());
        }
        dao.saveRecord(ub);
        continue;
      }

      const newTier = this.reachedTier(badge, progress);
      const oldTier = `${ub.get('current_tier') || 'none'}`;

      // Award points for every tier crossed since last check (skip on downgrade).
      if (TIER_ORDER.indexOf(newTier) > TIER_ORDER.indexOf(oldTier)) {
        const tiers = this.badgeTiers(badge);
        for (const t of tiers) {
          if (TIER_ORDER.indexOf(t.tier) > TIER_ORDER.indexOf(oldTier) && TIER_ORDER.indexOf(t.tier) <= TIER_ORDER.indexOf(newTier)) {
            if (t.reward > 0) {
              this.awardPoints(user, t.reward, 'badge', `${badge.get('name')} — ${t.tier}`, badge.id);
            }
          }
        }
        ub.set('current_tier', newTier);
        // First unlock timestamp = when bronze (or first tier) was reached.
        if (`${ub.get('unlocked_at')}`.trim() === '') ub.set('unlocked_at', new Date().toISOString());
      }
      dao.saveRecord(ub);
    }
  },

  // Explicitly grant a single badge to a user (idempotent). Used by the
  // years-active year-end routine and action-participation grants.
  grantBadge(user, badge) {
    const dao = $app.dao();
    let ub;
    try {
      ub = dao.findFirstRecordByFilter('user_badges', `user = "${user.id}" && badge = "${badge.id}"`);
      if (`${ub.get('current_tier') || 'none'}` !== 'none') return false; // already granted
    } catch (_) {
      const col = dao.findCollectionByNameOrId('user_badges');
      ub = new Record(col);
      ub.set('user', user.id);
      ub.set('badge', badge.id);
    }
    ub.set('progress', 1);
    ub.set('current_tier', 'gold');
    ub.set('unlocked_at', new Date().toISOString());
    dao.saveRecord(ub);
    const bonus = badge.get('points_reward') || 0;
    if (bonus > 0) this.awardPoints(user, bonus, 'badge', `${badge.get('name')}`, badge.id);
    return true;
  },

  computeProgress(user, badge) {
    const dao = $app.dao();
    const type = badge.get('trigger_type');
    try {
      if (type === 'visits') {
        return dao.findRecordsByFilter('visits', `user = "${user.id}"`).length;
      }
      if (type === 'scans') {
        return dao.findRecordsByFilter('points_log', `user = "${user.id}" && kind = "scan"`).length;
      }
      if (type === 'items_brought') {
        // Sum confirmed brought items across all confirmed bringings.
        let total = 0;
        const rows = dao.findRecordsByFilter('bringings', `user = "${user.id}" && status = "confirmed"`);
        for (const r of rows) total += r.get('confirmed_count') || 0;
        return total;
      }
      if (type === 'streak_weeks') {
        return user.get('streak_weeks') || 0;
      }
    } catch (_) {
      return 0;
    }
    return 0;
  },

  // Haversine distance in metres.
  distanceM(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const toRad = (x) => (x * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },
};
