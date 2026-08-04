// Shared business logic for points, streaks, campaigns, badges.
// Imported by hook files via require(__hooks + '/lib/points.js').

// Fallback point values, used only if the store singleton has none configured.
// The live values are admin-editable on the store record (pts_checkin/…).
const POINTS = {
  checkin: 10,
  takePerItem: 5, // scanning / "took N" via stepper
  bringPerItem: 5, // confirmed brought item (same value as taking)
  selfEntryBonus: 10, // extra per self-entered (approved) item, on top of bringPerItem
};

const DEFAULT_MAX_ITEMS_TAKE = 7; // internal rule: max items taken per visit

const TIER_ORDER = ['none', 'bronze', 'silber', 'gold', 'platin', 'diamant'];

module.exports = {
  POINTS,
  TIER_ORDER,
  DEFAULT_MAX_ITEMS_TAKE,

  // Read admin-configured point values + item cap from the store singleton,
  // falling back to POINTS defaults when a value isn't set.
  config() {
    let s;
    try {
      s = $app.dao().findFirstRecordByFilter('store', '1=1');
    } catch (_) {
      s = null;
    }
    const val = (field, def) => {
      const v = s ? s.get(field) : 0;
      return v && v > 0 ? v : def;
    };
    return {
      checkin: val('pts_checkin', POINTS.checkin),
      takePerItem: val('pts_take', POINTS.takePerItem),
      bringPerItem: val('pts_bring', POINTS.bringPerItem),
      maxItemsTake: val('max_items_take', DEFAULT_MAX_ITEMS_TAKE),
    };
  },

  // Per-type multiplier for an active campaign. type ∈ 'visit' | 'take' | 'bring'.
  // Uses the new mult_<type> field, falling back to the legacy single multiplier,
  // then 1.0. A campaign only boosts a type if that factor is > 1.
  campaignMult(camp, type) {
    if (!camp) return 1.0;
    const field = type === 'visit' ? 'mult_visit' : type === 'take' ? 'mult_take' : 'mult_bring';
    const v = camp.get(field);
    if (v && v > 0) return v;
    const legacy = camp.get('multiplier');
    return legacy && legacy > 0 ? legacy : 1.0;
  },

  // Find the highest-multiplier campaign active right now that applies to this
  // user. Honours target_role: 'all' (everyone), 'by_role'+target_role,
  // 'streak2plus' (streak >= 2), 'inactive14d' (no visit in 14 days).
  // Pass user=null to ignore targeting (e.g. for display lookups).
  findActiveCampaign(now, user) {
    const iso = now.toISOString().replace('T', ' ');
    let rows;
    try {
      rows = $app
        .dao()
        .findRecordsByFilter('campaigns', `starts_at <= "${iso}" && ends_at >= "${iso}"`, '-multiplier', 0, 0);
    } catch (_) {
      return null;
    }
    for (const c of rows) {
      if (!user || this.campaignApplies(c, user, now)) return c;
    }
    return null;
  },

  campaignApplies(camp, user, now) {
    const seg = `${camp.get('target_segment') || camp.get('target_role') || 'all'}`;
    if (seg === 'all' || seg === '') return true;
    if (seg === 'by_role') return `${user.get('role')}` === `${camp.get('target_role')}`;
    if (seg === 'streak2plus') return (user.get('streak_weeks') || 0) >= 2;
    if (seg === 'inactive14d') {
      const last = `${user.get('streak_last_visit')}`.trim();
      if (!last) return true;
      return (now - new Date(last)) / 86400000 >= 14;
    }
    // Unknown role values (visitor/volunteer/admin) → treat as by_role.
    if (seg === 'visitor' || seg === 'volunteer' || seg === 'admin') {
      return `${user.get('role')}` === seg;
    }
    return true;
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

  // Teilnahme an einer Aktion mitzählen — Grundlage für Aktions-Abzeichen.
  //
  // Gezählt wird, worauf die Aktion tatsächlich einen Bonus gibt: Steht
  // "Bringen" auf ×2, zählt jedes gebrachte Teil; steht "Holen" auf ×1, zählt
  // Holen nicht. So entscheidet die Aktion selbst, was Teilnahme bedeutet —
  // vorher zählte immer nur Bringen, unabhängig von den gesetzten Faktoren.
  //
  // `amount` erlaubt mehrere Teile auf einmal (Stepper beim Check-in).
  bumpActionCount(user, camp, type, amount) {
    if (!user || !camp) return;
    if (this.campaignMult(camp, type) <= 1) return; // kein Bonus → keine Teilnahme
    const n = Math.max(0, parseInt(amount == null ? 1 : amount, 10));
    if (!n) return;
    const dao = $app.dao();
    try {
      let cnt;
      try {
        cnt = dao.findFirstRecordByFilter('action_counts', `user = "${user.id}" && campaign = "${camp.id}"`);
      } catch (_) {
        cnt = new Record(dao.findCollectionByNameOrId('action_counts'));
        cnt.set('user', user.id);
        cnt.set('campaign', camp.id);
        cnt.set('count', 0);
      }
      cnt.set('count', (cnt.get('count') || 0) + n);
      dao.saveRecord(cnt);
    } catch (_) {}
  },

  // Create a visit + award check-in bonus + update streak. Returns awarded points.
  // Guards against a double check-in race (fast double-tap / retry): re-checks
  // hasVisitToday immediately before inserting the visit, so two concurrent
  // requests can't both create a visit + bonus for the same day.
  doCheckin(user, now, opts) {
    opts = opts || {};
    const cfg = this.config();
    const camp = this.findActiveCampaign(now, user);
    const multVisit = this.campaignMult(camp, 'visit');
    const multTake = this.campaignMult(camp, 'take');
    // Hard cap: never award / record more than the configured max items taken.
    const rawCount = Math.max(0, parseInt(opts.itemsCount || 0, 10));
    const itemsCount = Math.min(rawCount, cfg.maxItemsTake);

    // Race guard: another request may have created today's visit between the
    // caller's check and here. If so, only count extra stepper items, no bonus.
    if (this.hasVisitToday(user.id, now)) {
      const stepperOnly = Math.round(itemsCount * cfg.takePerItem * multTake);
      if (stepperOnly > 0) {
        this.awardPoints(user, stepperOnly, 'checkin', `${itemsCount} Teile mitgenommen`, null);
      }
      // Der Besuch zählt hier nicht noch einmal — die Teile schon.
      if (camp && itemsCount > 0) this.bumpActionCount(user, camp, 'take', itemsCount);
      return { points: stepperOnly, visitId: null, deduped: true };
    }

    const visitsCol = $app.dao().findCollectionByNameOrId('visits');
    const visit = new Record(visitsCol);
    visit.set('user', user.id);
    visit.set('checkin_at', now.toISOString());
    visit.set('items_count', itemsCount);
    if (opts.lat != null) visit.set('gps_lat', opts.lat);
    if (opts.lng != null) visit.set('gps_lng', opts.lng);
    if (opts.distance != null) visit.set('gps_distance_m', Math.round(opts.distance));
    if (camp) visit.set('campaign', camp.id);

    const checkinPts = Math.round(cfg.checkin * multVisit);
    const stepperPts = Math.round(itemsCount * cfg.takePerItem * multTake);
    visit.set('points_awarded', checkinPts + stepperPts);
    $app.dao().saveRecord(visit);

    this.awardPoints(user, checkinPts, 'checkin', 'Check-In im Laden', visit.id);
    if (stepperPts > 0) {
      this.awardPoints(user, stepperPts, 'checkin', `${itemsCount} Teile mitgenommen`, visit.id);
    }
    // Teilnahme zählen — je nachdem, worauf die Aktion Bonus gibt.
    if (camp) {
      this.bumpActionCount(user, camp, 'visit', 1);
      if (itemsCount > 0) this.bumpActionCount(user, camp, 'take', itemsCount);
    }

    this.updateStreak(user, now);
    this.pushCheckinConfirmation(user, checkinPts + stepperPts, itemsCount);
    return { points: checkinPts + stepperPts, visitId: visit.id };
  },

  // Immediate confirmation that the points landed, so the user sees a result
  // without opening the app. Mentions the streak once it's actually running
  // (2+ weeks — "1 week in a row" isn't a streak worth celebrating).
  // Never throws: a failed push must not roll back a valid check-in.
  pushCheckinConfirmation(user, points, itemsCount) {
    try {
      if (points <= 0) return;
      const push = require(`${__hooks}/lib/push.js`);
      const targets = push.tokensForUser(user, 'streak');
      if (!targets.length) return;

      const streak = user.get('streak_weeks') || 0;
      let body = `${points} Punkte gutgeschrieben`;
      if (itemsCount > 0) {
        body += ` — Check-in und ${itemsCount} ${itemsCount === 1 ? 'Teil' : 'Teile'}`;
      }
      if (streak >= 2) {
        body += `. ${streak} Wochen in Folge — weiter so!`;
      } else {
        body += '.';
      }
      push.send(targets, 'Moin!', body, '/(visitor)/points');
    } catch (_) {
      // ignore
    }
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

  // Current streak derived from the visits table: how many consecutive ISO weeks
  // up to now (or last week, grace period) the user has actually checked in.
  // Returns 0 when there are no visits at all — this is the value badge progress
  // is based on, so a user who never checked in can never show streak progress.
  streakFromVisits(user) {
    let visits;
    try {
      visits = $app.dao().findRecordsByFilter(
        'visits', `user = "${user.id}"`, '-checkin_at', 0, 0
      );
    } catch (_) {
      return 0;
    }
    if (!visits || !visits.length) return 0;

    // Unique ISO weeks that have at least one visit, newest first.
    const weeks = [];
    for (const v of visits) {
      const raw = `${v.get('checkin_at')}`.trim();
      if (!raw) continue;
      const w = this.isoWeek(new Date(raw));
      if (weeks.indexOf(w) === -1) weeks.push(w);
    }
    if (!weeks.length) return 0;
    weeks.sort((a, b) => b - a);

    const thisWeek = this.isoWeek(new Date());
    // Streak is alive if the newest visit week is this week or the one before.
    if (!this.isWeekAdjacent(weeks[0], thisWeek) && weeks[0] !== thisWeek) return 0;

    let count = 1;
    for (let i = 1; i < weeks.length; i++) {
      if (this.isWeekAdjacent(weeks[i], weeks[i - 1])) count++;
      else break;
    }
    return count;
  },

  // True when `later` is exactly one ISO week after `earlier` (handles year wrap).
  isWeekAdjacent(earlier, later) {
    if (later - earlier === 1) return true;
    return later % 100 === 1 && earlier % 100 >= 52 && Math.floor(later / 100) - Math.floor(earlier / 100) === 1;
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

  // Wie viele Stufen es überhaupt gibt — so viele Ränge unter „Punkte & Ränge"
  // gepflegt sind (höchstens fünf, denn so viele Spalten hat ein Abzeichen).
  // Ohne diese Grenze vergäbe der Server eine Stufe weiter, die die App nach
  // dem Entfernen eines Rangs nicht mehr anzeigt.
  tierSlotCount() {
    try {
      const s = $app.dao().findFirstRecordByFilter('store', '1=1');
      const t = s ? s.get('tiers_json') : null;
      const n = t && t.length ? t.length : 5;
      return Math.max(1, Math.min(5, n));
    } catch (_) {
      return 5;
    }
  },

  // Tier thresholds + rewards for a badge, ordered bronze→diamant.
  badgeTiers(badge) {
    return [
      { tier: 'bronze', at: badge.get('tier_bronze') || 0, reward: badge.get('reward_bronze') || 0 },
      { tier: 'silber', at: badge.get('tier_silber') || 0, reward: badge.get('reward_silber') || 0 },
      { tier: 'gold', at: badge.get('tier_gold') || 0, reward: badge.get('reward_gold') || 0 },
      { tier: 'platin', at: badge.get('tier_platin') || 0, reward: badge.get('reward_platin') || 0 },
      { tier: 'diamant', at: badge.get('tier_diamant') || 0, reward: badge.get('reward_diamant') || 0 },
    ]
      .slice(0, this.tierSlotCount())
      .filter((t) => t.at > 0);
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
        return dao.findRecordsByFilter('visits', `user = "${user.id}"`, '', 0, 0).length;
      }
      if (type === 'scans') {
        return dao.findRecordsByFilter('points_log', `user = "${user.id}" && kind = "scan"`, '', 0, 0).length;
      }
      if (type === 'items_brought') {
        // Count approved brought items (one bring-points_log row per item).
        return dao.findRecordsByFilter('points_log', `user = "${user.id}" && kind = "bring"`, '', 0, 0).length;
      }
      if (type === 'streak_weeks') {
        // Derived from actual visits, not from users.streak_weeks: that field is
        // client-writable and survives as a stale cache when the reset cron runs
        // between two checkBadges calls. No visits => no streak, always.
        return this.streakFromVisits(user);
      }
      if (type === 'action_participation') {
        // Contributions to the campaign this badge is linked to.
        const campId = `${badge.get('campaign') || ''}`.trim();
        if (!campId) return 0;
        try {
          const rec = dao.findFirstRecordByFilter('action_counts', `user = "${user.id}" && campaign = "${campId}"`);
          return rec.get('count') || 0;
        } catch (_) {
          return 0;
        }
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
