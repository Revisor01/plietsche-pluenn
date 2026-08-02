/// <reference path="../pb_data/types.d.ts" />

// Scheduled jobs for Plietsche Plünn.
//   1. push-scheduled   — every minute: send due push_messages (scheduled_at past, not sent)
//   2. streak-reset      — daily: zero out streaks of users inactive > 1 week
//   3. action-badges     — daily: grant action_participation badges after campaign end
//   4. year-badges        — daily: on Dec 31, grant years_active loyalty badges
//
// PocketBase cron uses standard 5-field cron expressions (server local time).

// ── 1. Deliver scheduled push messages ─────────────────────────
cronAdd('push-scheduled', '* * * * *', () => {
  const push = require(`${__hooks}/lib/push.js`);
  const dao = $app.dao();
  const nowIso = new Date().toISOString().replace('T', ' ');
  let due;
  try {
    due = dao.findRecordsByFilter('push_messages', `sent_at = "" && scheduled_at <= "${nowIso}"`, 'scheduled_at', 20, 0);
  } catch (_) {
    return;
  }
  for (const msg of due) {
    const segment = `${msg.get('target_segment') || 'all'}`;
    const role = `${msg.get('target_role') || ''}`;
    // Manual broadcasts count as the "other"/campaign category for opt-in.
    const targets = push.collectTokens(segment, role, 'campaign');
    push.send(targets, `${msg.get('title')}`, `${msg.get('body')}`, `${msg.get('deep_link') || ''}`);
    msg.set('sent_at', new Date().toISOString());
    dao.saveRecord(msg);
  }
});

// ── 2. Reset stale streaks ─────────────────────────────────────
// A streak survives if the last visit was this week or last week (1-week grace).
// Anyone who hasn't visited in > 1 full week loses their streak.
cronAdd('streak-reset', '5 3 * * *', () => {
  const lib = require(`${__hooks}/lib/points.js`);
  const dao = $app.dao();
  const now = new Date();
  const thisWeek = lib.isoWeek(now);
  let users;
  try {
    users = dao.findRecordsByFilter('users', 'streak_weeks > 0', '', 0, 0);
  } catch (_) {
    return;
  }
  for (const u of users) {
    const last = `${u.get('streak_last_visit')}`.trim();
    if (!last) { u.set('streak_weeks', 0); dao.saveRecord(u); continue; }
    const lastWeek = lib.isoWeek(new Date(last));
    // Allow current week and the immediately preceding week (grace).
    if (thisWeek - lastWeek > 1 && !(thisWeek % 100 === 1 && lastWeek % 100 >= 52)) {
      u.set('streak_weeks', 0);
      dao.saveRecord(u);
    }
  }
});

// ── 3. Grant action-participation badges (Sicherheitsnetz) ─────
// Der Regelfall läuft sofort: Beim Freigeben eines gebrachten Teils zählt
// defaults.pb.js action_counts hoch und ruft checkBadges — das Badge kommt
// also direkt, nicht erst nach Aktionsende.
//
// Dieser Job fängt nur die Fälle ab, die dabei durchrutschen können:
//   - Teilnahme durch reinen Besuch (kein gebrachtes Teil)
//   - Aktion/Badge erst nachträglich verknüpft, Beiträge lagen schon vor
// Läuft deshalb über LAUFENDE und beendete Aktionen, nicht nur beendete.
cronAdd('action-badges', '20 3 * * *', () => {
  const lib = require(`${__hooks}/lib/points.js`);
  const dao = $app.dao();
  let camps;
  try {
    camps = dao.findRecordsByFilter('campaigns', `badge != ""`, '', 0, 0);
  } catch (_) {
    return;
  }
  for (const camp of camps) {
    const badgeId = `${camp.get('badge')}`;
    let badge;
    try { badge = dao.findRecordById('badges', badgeId); } catch (_) { continue; }

    // Gestufte Badges laufen ausschließlich über computeProgress/checkBadges —
    // grantBadge würde sie sofort auf Gold setzen und die Stufen überspringen.
    if (`${badge.get('kind')}` === 'tiered') {
      let counts = [];
      try {
        counts = dao.findRecordsByFilter('action_counts', `campaign = "${camp.id}" && count > 0`, '', 0, 0);
      } catch (_) {}
      for (const c of counts) {
        try { lib.checkBadges(dao.findRecordById('users', `${c.get('user')}`)); } catch (_) {}
      }
      continue;
    }

    const seen = {};
    const grant = (uid) => {
      if (!uid || seen[uid]) return;
      seen[uid] = true;
      try { lib.grantBadge(dao.findRecordById('users', uid), badge); } catch (_) {}
    };

    // a) Wer der Aktion ein Teil beigesteuert hat.
    try {
      const counts = dao.findRecordsByFilter('action_counts', `campaign = "${camp.id}" && count > 0`, '', 0, 0);
      for (const c of counts) grant(`${c.get('user')}`);
    } catch (_) {}

    // b) Wer im Aktionszeitraum da war.
    const start = `${camp.get('starts_at')}`.replace('T', ' ');
    const end = `${camp.get('ends_at')}`.replace('T', ' ');
    try {
      const visits = dao.findRecordsByFilter(
        'visits',
        `checkin_at >= "${start}" && checkin_at <= "${end}"`,
        '',
        0,
        0
      );
      for (const v of visits) grant(`${v.get('user')}`);
    } catch (_) {}
  }
});

// ── 4. Year-end loyalty badges (years_active) ──────────────────
// Runs daily but only acts on Dec 31. Counts distinct calendar years in which
// the user had at least one visit; grants single-badges whose trigger_value is
// reached. A year with no visits breaks the count (it's "years active", total).
cronAdd('year-badges', '40 3 * * *', () => {
  const lib = require(`${__hooks}/lib/points.js`);
  const dao = $app.dao();
  const now = new Date();
  if (now.getMonth() !== 11 || now.getDate() !== 31) return; // only Dec 31

  let badges;
  try {
    badges = dao.findRecordsByFilter('badges', `kind = "single" && trigger_type = "years_active"`, '', 0, 0);
  } catch (_) { return; }
  if (!badges.length) return;

  let users;
  try { users = dao.findRecordsByFilter('users', '1=1', '', 0, 0); } catch (_) { return; }

  for (const u of users) {
    let visits;
    try { visits = dao.findRecordsByFilter('visits', `user = "${u.id}"`, '', 0, 0); } catch (_) { continue; }
    const years = {};
    for (const v of visits) {
      const y = new Date(`${v.get('checkin_at')}`).getFullYear();
      if (!isNaN(y)) years[y] = true;
    }
    const activeYears = Object.keys(years).length;
    for (const badge of badges) {
      const need = badge.get('trigger_value') || 1;
      if (activeYears >= need) {
        try { lib.grantBadge(u, badge); } catch (_) {}
      }
    }
  }
});
