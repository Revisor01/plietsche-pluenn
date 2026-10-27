// Geteilte Logik für Punkte, Serien, Aktionen und Abzeichen; per require(__hooks + '/lib/points.js').

// Rückfallwerte, wenn der store-Datensatz keine Punkte trägt.
const POINTS = {
  checkin: 10,
  takePerItem: 5, // scanning / "took N" via stepper
  bringPerItem: 5, // confirmed brought item (same value as taking)
  selfEntryBonus: 10, // extra per self-entered (approved) item, on top of bringPerItem
};

// Höchstzahl je Tag in der Ladenzeitzone, wenn store.max_items_take fehlt.
const DEFAULT_MAX_ITEMS_TAKE = 7;

// Rückfall-Radius des Geofence in Metern.
const DEFAULT_GEOFENCE_RADIUS_M = 150;

const TIER_ORDER = ['none', 'bronze', 'silber', 'gold', 'platin', 'diamant'];

// ── Ladenzeitzone: von Hand gerechnet, weil Goja kein Intl hat und der Container in UTC läuft ──
const DEFAULT_STORE_TZ = 'Europe/Berlin';

// Puffer für die gelesene Zeitzone (siehe storeTimezone).
const TZ_CACHE_MS = 30000;
const tzCache = { value: null, at: 0 };

// Letzter Sonntag eines Monats, als UTC-Millisekunden zur angegebenen Stunde.
function lastSundayUtc(year, month, hourUtc) {
  // Der 1. des Folgemonats, einen Tag zurück = letzter Tag des Monats.
  const d = new Date(Date.UTC(year, month + 1, 0, hourUtc, 0, 0, 0));
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.getTime();
}

// Versatz der Ladenzeitzone gegenüber UTC, in Minuten, für diesen Zeitpunkt.
function storeOffsetMinutes(ms, tz) {
  if (tz === 'UTC') return 0;
  // Nur Europe/Berlin wird gerechnet; andere Angaben fallen darauf zurück.
  const year = new Date(ms).getUTCFullYear();
  const dstStart = lastSundayUtc(year, 2, 1); // letzter Sonntag im März, 01:00 UTC
  const dstEnd = lastSundayUtc(year, 9, 1); // letzter Sonntag im Oktober, 01:00 UTC
  return ms >= dstStart && ms < dstEnd ? 120 : 60;
}

module.exports = {
  POINTS,
  TIER_ORDER,
  DEFAULT_MAX_ITEMS_TAKE,
  DEFAULT_GEOFENCE_RADIUS_M,
  DEFAULT_STORE_TZ,

  // ── In Transaktionen alles über txApp; afterCommit für Push erst nach dem Festschreiben ──
  app() {
    return this._app || $app;
  },

  withApp(app, afterCommit) {
    const bound = Object.create(this);
    bound._app = app;
    bound._afterCommit = afterCommit || null;
    return bound;
  },

  // Zeitzone aus dem store-Datensatz, kurz gepuffert, sonst eine Abfrage je Besuch.
  storeTimezone() {
    const now = Date.now();
    if (tzCache.value && now - tzCache.at < TZ_CACHE_MS) return tzCache.value;
    let tz = DEFAULT_STORE_TZ;
    try {
      const s = this.app().findFirstRecordByFilter('store', '1=1');
      tz = (s ? `${s.get('timezone') || ''}`.trim() : '') || DEFAULT_STORE_TZ;
    } catch (_) {
      tz = DEFAULT_STORE_TZ;
    }
    tzCache.value = tz;
    tzCache.at = now;
    return tz;
  },

  // Für Tests, die die Zeitzone im Betrieb umstellen.
  forgetStoreTimezone() {
    tzCache.value = null;
    tzCache.at = 0;
  },

  // Datumsteile in der Ladenzeitzone: { year, month (0-11), day, hour, minute, second, weekday (0=So) }.
  storeParts(date) {
    const ms = date.getTime();
    const shifted = new Date(ms + storeOffsetMinutes(ms, this.storeTimezone()) * 60000);
    return {
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth(),
      day: shifted.getUTCDate(),
      hour: shifted.getUTCHours(),
      minute: shifted.getUTCMinutes(),
      second: shifted.getUTCSeconds(),
      weekday: shifted.getUTCDay(),
    };
  },

  // Mitternacht Ortszeit als UTC-Zeitpunkt, direkt vergleichbar mit den Zeitstempeln.
  storeDayStart(date) {
    const p = this.storeParts(date);
    // Zweimal schätzen, damit es auch in den Umstellungsnächten stimmt.
    const naive = Date.UTC(p.year, p.month, p.day, 0, 0, 0, 0);
    const tz = this.storeTimezone();
    let ms = naive - storeOffsetMinutes(date.getTime(), tz) * 60000;
    ms = naive - storeOffsetMinutes(ms, tz) * 60000;
    return new Date(ms);
  },

  // Punktwerte und Grenze aus dem store-Datensatz, sonst POINTS.
  config() {
    let s;
    try {
      s = this.app().findFirstRecordByFilter('store', '1=1');
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
      // Schalter „Unbegrenzt" (Migration 1790500300). Fehlt das Feld, ist es aus.
      itemsTakeUnlimited: !!(s && s.get('items_take_unlimited') === true),
    };
  },

  // ── Tagesgrenze mitgenommener Teile: Zähler aus visits.items_count plus QR-Scans aus points_log, beides nur serverseitig geschrieben ──
  itemsTakenToday(userId, now) {
    const start = this.storeDayStart(now).toISOString().replace('T', ' ');
    const app = this.app();
    let total = 0;
    try {
      const visits = app.findRecordsByFilter(
        'visits',
        'user = {:user} && checkin_at >= {:start}',
        '',
        0,
        0,
        { user: userId, start }
      );
      for (const v of visits) total += v.get('items_count') || 0;
    } catch (_) {}
    try {
      const scans = app.findRecordsByFilter(
        'points_log',
        'user = {:user} && kind = "scan" && created >= {:start}',
        '',
        0,
        0,
        { user: userId, start }
      );
      total += scans.length;
    } catch (_) {}
    return total;
  },

  // Wirft 400 über der Tagesgrenze; der Satz vorn ist der, den ausgelieferte Apps anzeigen.
  assertItemsTakeAllowed(userId, now, adding, cfg) {
    cfg = cfg || this.config();
    if (cfg.itemsTakeUnlimited) return;
    const max = cfg.maxItemsTake;
    const taken = this.itemsTakenToday(userId, now);
    if (taken + adding <= max) return;
    let msg = `Höchstens ${max} Teile pro Besuch.`;
    if (taken > 0) {
      const left = Math.max(0, max - taken);
      msg +=
        left === 0
          ? ' Für heute ist die Grenze erreicht.'
          : ` Heute ${left === 1 ? 'geht' : 'gehen'} noch ${left} ${left === 1 ? 'Teil' : 'Teile'}.`;
    }
    throw new ApiError(400, msg);
  },

  // Damit itemsTakenToday sie beim nächsten Scan mitzählt.
  addItemsToTodaysVisit(userId, now, n) {
    if (!n || n <= 0) return;
    const start = this.storeDayStart(now).toISOString().replace('T', ' ');
    const app = this.app();
    let visit;
    try {
      visit = app.findFirstRecordByFilter('visits', 'user = {:user} && checkin_at >= {:start}', {
        user: userId,
        start,
      });
    } catch (_) {
      return;
    }
    visit.set('items_count', (visit.get('items_count') || 0) + n);
    app.saveNoValidate(visit);
  },

  // Faktor je Typ ('visit' | 'take' | 'bring') aus mult_<type>, sonst `multiplier`, sonst 1.
  campaignMult(camp, type) {
    if (!camp) return 1.0;
    const field = type === 'visit' ? 'mult_visit' : type === 'take' ? 'mult_take' : 'mult_bring';
    const v = camp.get(field);
    if (v && v > 0) return v;
    const legacy = camp.get('multiplier');
    return legacy && legacy > 0 ? legacy : 1.0;
  },

  // Der höchste der drei Faktoren entscheidet zwischen gleichzeitigen Aktionen.
  campaignBestMult(camp) {
    return Math.max(
      this.campaignMult(camp, 'visit'),
      this.campaignMult(camp, 'take'),
      this.campaignMult(camp, 'bring')
    );
  },

  // Stärkste laufende Aktion für die Person nach wirksamem Faktor, nicht nach dem alten `multiplier`; user=null ignoriert die Zielgruppe.
  findActiveCampaign(now, user) {
    const iso = now.toISOString().replace('T', ' ');
    let rows;
    try {
      rows = this.app().findRecordsByFilter(
        'campaigns',
        'starts_at <= {:now} && ends_at >= {:now}',
        '-multiplier',
        0,
        0,
        { now: iso }
      );
    } catch (_) {
      return null;
    }
    // Stabil, damit die Auswahl von Lauf zu Lauf gleich bleibt.
    const sorted = rows
      .map((c, i) => ({ c, i, m: this.campaignBestMult(c) }))
      .sort((a, b) => (b.m - a.m) || (a.i - b.i))
      .map((x) => x.c);
    for (const c of sorted) {
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

  // points_total aus der Summe von points_log neu rechnen statt hochzählen, damit es nie abweicht.
  awardPoints(user, points, kind, label, refId) {
    const app = this.app();
    const col = app.findCollectionByNameOrId('points_log');
    const rec = new Record(col);
    rec.set('user', user.id);
    rec.set('points', points);
    rec.set('kind', kind);
    rec.set('label', label || '');
    if (refId) rec.set('ref_id', refId);
    app.saveNoValidate(rec);

    this.recomputeTotal(user);
  },

  // Ändert und speichert das übergebene User-Objekt.
  recomputeTotal(user) {
    const app = this.app();
    let total = 0;
    try {
      const rows = app.findRecordsByFilter('points_log', 'user = {:user}', '', 0, 0, { user: user.id });
      for (const r of rows) total += r.get('points') || 0;
    } catch (_) {
      total = user.get('points_total') || 0;
    }
    user.set('points_total', total);
    app.saveNoValidate(user);
  },

  // Has the user already created a visit today? (no double check-in bonus)
  hasVisitToday(userId, now) {
    // Tagesgrenze ist Mitternacht im Laden, nicht Mitternacht des Servers.
    const start = this.storeDayStart(now);
    const startIso = start.toISOString().replace('T', ' ');
    try {
      const rows = this.app().findRecordsByFilter(
        'visits',
        'user = {:user} && checkin_at >= {:start}',
        '-checkin_at',
        1,
        0,
        { user: userId, start: startIso }
      );
      return rows.length > 0;
    } catch (_) {
      return false;
    }
  },

  // Zählt nur, worauf die Aktion Bonus gibt; `amount` für mehrere Teile.
  bumpActionCount(user, camp, type, amount) {
    if (!user || !camp) return;
    if (this.campaignMult(camp, type) <= 1) return; // kein Bonus → keine Teilnahme
    const n = Math.max(0, parseInt(amount == null ? 1 : amount, 10));
    if (!n) return;
    const app = this.app();
    try {
      let cnt;
      try {
        cnt = app.findFirstRecordByFilter('action_counts', 'user = {:user} && campaign = {:camp}', {
          user: user.id,
          camp: camp.id,
        });
      } catch (_) {
        cnt = new Record(app.findCollectionByNameOrId('action_counts'));
        cnt.set('user', user.id);
        cnt.set('campaign', camp.id);
        cnt.set('count', 0);
      }
      cnt.set('count', (cnt.get('count') || 0) + n);
      app.saveNoValidate(cnt);
    } catch (_) {}
  },

  // Besuch, Bonus und Serie; prüft hasVisitToday direkt vor dem Anlegen gegen Doppel-Check-ins.
  doCheckin(user, now, opts) {
    opts = opts || {};
    const cfg = this.config();
    const camp = this.findActiveCampaign(now, user);
    const multVisit = this.campaignMult(camp, 'visit');
    const multTake = this.campaignMult(camp, 'take');
    // Nie mehr als die Höchstzahl; die Tagessumme prüft der Aufrufer.
    const rawCount = Math.max(0, parseInt(opts.itemsCount || 0, 10));
    const itemsCount = cfg.itemsTakeUnlimited ? rawCount : Math.min(rawCount, cfg.maxItemsTake);

    // Gibt es den Besuch schon, nur die Stepper-Teile zählen, kein Bonus.
    if (this.hasVisitToday(user.id, now)) {
      const stepperOnly = Math.round(itemsCount * cfg.takePerItem * multTake);
      if (stepperOnly > 0) {
        this.awardPoints(user, stepperOnly, 'checkin', `${itemsCount} Teile mitgenommen`, null);
      }
      // Der Besuch zählt hier nicht noch einmal — die Teile schon.
      if (camp && itemsCount > 0) this.bumpActionCount(user, camp, 'take', itemsCount);
      this.addItemsToTodaysVisit(user.id, now, itemsCount);
      return { points: stepperOnly, visitId: null, deduped: true };
    }

    const visitsCol = this.app().findCollectionByNameOrId('visits');
    const visit = new Record(visitsCol);
    visit.set('user', user.id);
    visit.set('checkin_at', now.toISOString());
    visit.set('items_count', itemsCount);
    // Datenminimierung: nur der Abstand, keine Koordinaten; gps_lat/gps_lng bleiben für alte Besuche im Schema.
    if (opts.distance != null) visit.set('gps_distance_m', Math.round(opts.distance));
    if (camp) visit.set('campaign', camp.id);

    const checkinPts = Math.round(cfg.checkin * multVisit);
    const stepperPts = Math.round(itemsCount * cfg.takePerItem * multTake);
    visit.set('points_awarded', checkinPts + stepperPts);
    this.app().saveNoValidate(visit);

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

  // Sofortige Bestätigung, Serie erst ab zwei Wochen; wirft nie, ein Push darf keinen Check-in zurückrollen.
  pushCheckinConfirmation(user, points, itemsCount) {
    // In einer Transaktion erst nach dem Festschreiben senden, dann über $app.
    if (this._afterCommit) {
      const base = module.exports;
      this._afterCommit.push(() => base.pushCheckinConfirmation(user, points, itemsCount));
      return;
    }
    try {
      if (points <= 0) return;
      const push = require(`${__hooks}/lib/push.js`);
      const targets = push.tokensForUser(user, 'streak');
      if (!targets.length) return;

      const streak = user.get('streak_weeks') || 0;
      let body = `${points} Punkte gutgeschrieben`;
      if (itemsCount > 0) {
        body += ` – Check-in und ${itemsCount} ${itemsCount === 1 ? 'Teil' : 'Teile'}`;
      }
      if (streak >= 2) {
        body += `. ${streak} Wochen in Folge – weiter so!`;
      } else {
        body += '.';
      }
      push.send(targets, 'Moin!', body, '/(visitor)/points', 'streak');
    } catch (_) {
      // ignore
    }
  },

  // ISO-Woche, Tag in der Ladenzeitzone.
  isoWeek(date) {
    const p = this.storeParts(date);
    const d = new Date(Date.UTC(p.year, p.month, p.day));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return d.getUTCFullYear() * 100 + week;
  },

  // Serie aus den Besuchen bis jetzt oder letzte Woche; ohne Besuche 0, darauf beruht der Abzeichen-Fortschritt.
  streakFromVisits(user) {
    let visits;
    try {
      visits = this.app().findRecordsByFilter('visits', 'user = {:user}', '-checkin_at', 0, 0, {
        user: user.id,
      });
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

  // 52 oder 53 ISO-Wochen: 53, wenn der 28. Dezember in KW 53 fällt; keine Näherung, sonst läuft eine Serie über eine Lücke.
  isoWeeksInYear(year) {
    const jan1 = new Date(Date.UTC(year, 0, 1)).getUTCDay(); // 0 = Sonntag
    const schaltjahr = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return jan1 === 4 || (schaltjahr && jan1 === 3) ? 53 : 52;
  },

  // Ob `later` genau eine ISO-Woche nach `earlier` liegt, die einzige Stelle dafür.
  isWeekAdjacent(earlier, later) {
    if (later - earlier === 1) return true;
    // KW 1 folgt auf KW 52 oder 53 des Vorjahres.
    if (later % 100 !== 1) return false;
    const earlierYear = Math.floor(earlier / 100);
    if (Math.floor(later / 100) - earlierYear !== 1) return false;
    return earlier % 100 === this.isoWeeksInYear(earlierYear);
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
      } else if (this.isWeekAdjacent(lastWeek, thisWeek)) {
        user.set('streak_weeks', current + 1);
      } else {
        user.set('streak_weeks', 1);
      }
    }
    user.set('streak_last_visit', visitDate.toISOString());
    this.app().saveNoValidate(user);
  },

  // So viele Stufen wie gepflegte Ränge, höchstens fünf, sonst vergäbe der Server eine Stufe, die die App nicht zeigt.
  tierSlotCount() {
    try {
      const s = this.app().findFirstRecordByFilter('store', '1=1');
      const t = this.asArray(s ? s.get('tiers_json') : null);
      // Leere Liste heißt nicht gepflegt, also fünf Stufen.
      const n = t && t.length ? t.length : 5;
      return Math.max(1, Math.min(5, n));
    } catch (_) {
      return 5;
    }
  },

  // json-Felder kommen als Array oder Zeichenkette, auf einer Zeichenkette zählte `.length` Zeichen.
  asArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      const s = value.trim();
      if (!s) return null;
      try {
        const parsed = JSON.parse(s);
        return Array.isArray(parsed) ? parsed : null;
      } catch (_) {
        return null;
      }
    }
    return null;
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

  // Abzeichen-Bonus als zusätzliches Feld, `points` bleibt für ausgelieferte Apps; hier statt in scan.pb.js, weil Handler isoliert laufen.
  awardBadgesAndCountBonus(user, userId) {
    const vorher = this.app().findRecordById('users', userId).get('points_total') || 0;
    this.checkBadges(user);
    const nachher = this.app().findRecordById('users', userId).get('points_total') || 0;
    const diff = nachher - vorher;
    return diff > 0 ? diff : 0;
  },

  checkBadges(user) {
    const app = this.app();
    let badges;
    try {
      badges = app.findRecordsByFilter('badges', '1=1', '', 0, 0);
    } catch (_) {
      return;
    }
    for (const badge of badges) {
      let ub;
      try {
        ub = app.findFirstRecordByFilter('user_badges', 'user = {:user} && badge = {:badge}', {
          user: user.id,
          badge: badge.id,
        });
      } catch (_) {
        const col = app.findCollectionByNameOrId('user_badges');
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
        // Einmal-Abzeichen; years_active und action_participation vergeben eigene Routinen.
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
        app.saveNoValidate(ub);
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
              this.awardPoints(user, t.reward, 'badge', `${badge.get('name')} – ${t.tier}`, badge.id);
            }
          }
        }
        ub.set('current_tier', newTier);
        // First unlock timestamp = when bronze (or first tier) was reached.
        if (`${ub.get('unlocked_at')}`.trim() === '') ub.set('unlocked_at', new Date().toISOString());
      }
      app.saveNoValidate(ub);
    }
  },

  // Vergibt ein einzelnes Abzeichen idempotent.
  grantBadge(user, badge) {
    const app = this.app();
    let ub;
    try {
      ub = app.findFirstRecordByFilter('user_badges', 'user = {:user} && badge = {:badge}', {
        user: user.id,
        badge: badge.id,
      });
      if (`${ub.get('current_tier') || 'none'}` !== 'none') return false; // already granted
    } catch (_) {
      const col = app.findCollectionByNameOrId('user_badges');
      ub = new Record(col);
      ub.set('user', user.id);
      ub.set('badge', badge.id);
    }
    ub.set('progress', 1);
    ub.set('current_tier', 'gold');
    ub.set('unlocked_at', new Date().toISOString());
    app.saveNoValidate(ub);
    const bonus = badge.get('points_reward') || 0;
    if (bonus > 0) this.awardPoints(user, bonus, 'badge', `${badge.get('name')}`, badge.id);
    return true;
  },

  computeProgress(user, badge) {
    const app = this.app();
    const type = badge.get('trigger_type');
    const own = { user: user.id };
    try {
      if (type === 'visits') {
        return app.findRecordsByFilter('visits', 'user = {:user}', '', 0, 0, own).length;
      }
      if (type === 'scans') {
        return app.findRecordsByFilter('points_log', 'user = {:user} && kind = "scan"', '', 0, 0, own).length;
      }
      if (type === 'items_brought') {
        // Count approved brought items (one bring-points_log row per item).
        return app.findRecordsByFilter('points_log', 'user = {:user} && kind = "bring"', '', 0, 0, own).length;
      }
      if (type === 'streak_weeks') {
        // Aus den Besuchen, nicht aus streak_weeks, das als veralteter Cache stehen bleiben kann.
        return this.streakFromVisits(user);
      }
      if (type === 'action_participation') {
        // Contributions to the campaign this badge is linked to.
        const campId = `${badge.get('campaign') || ''}`.trim();
        if (!campId) return 0;
        try {
          const rec = app.findFirstRecordByFilter('action_counts', 'user = {:user} && campaign = {:camp}', {
            user: user.id,
            camp: campId,
          });
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

  // Entfernung zum Laden oder null ohne Standort; „Du bist nicht im Laden“ ist in docs/openapi.yaml zugesagt, nicht ändern.
  assertInGeofence(store, lat, lng) {
    if (lat == null || lng == null) return null;
    const distance = this.distanceM(lat, lng, store.get('lat'), store.get('lng'));
    const radius = store.get('geofence_radius_m') || DEFAULT_GEOFENCE_RADIUS_M;
    if (distance > radius) throw new ApiError(400, 'Du bist nicht im Laden');
    return distance;
  },
};
