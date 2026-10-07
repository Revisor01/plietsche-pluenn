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
  // Wie oft eine Nachricht erneut versucht wird, bevor sie abgehakt wird. Ohne
  // Grenze liefe der Job jede Minute gegen dieselbe unerreichbare Adresse.
  // Steht im Handler, weil PocketBase ihn in einer eigenen Umgebung ausführt —
  // eine Konstante oben in der Datei wäre dort nicht definiert.
  const MAX_SEND_ATTEMPTS = 5;
  const push = require(`${__hooks}/lib/push.js`);
  const nowIso = new Date().toISOString().replace('T', ' ');
  let due;
  try {
    due = $app.findRecordsByFilter('push_messages', 'sent_at = "" && scheduled_at <= {:now}', 'scheduled_at', 20, 0, {
      now: nowIso,
    });
  } catch (_) {
    return;
  }
  for (const msg of due) {
    const segment = `${msg.get('target_segment') || 'all'}`;
    const role = `${msg.get('target_role') || ''}`;
    // Manual broadcasts count as the "other"/campaign category for opt-in.
    const targets = push.collectTokens(segment, role, 'campaign');
    const res = push.send(targets, `${msg.get('title')}`, `${msg.get('body')}`, `${msg.get('deep_link') || ''}`, 'campaign') || {};

    // Scheitert der Versand, bleibt sent_at leer — der Filter oben holt die
    // Nachricht dann im nächsten Lauf wieder. Vorher galt sie als verschickt,
    // sobald der Versuch gelaufen war: Eine Ankündigung „Heute geschlossen"
    // lief ins Leere, während im Verwaltungsbereich ein Häkchen stand.
    //
    // „Gescheitert" heißt: Expo war nicht erreichbar (res.failed). Eine
    // Nachricht ohne Empfänger:innen ist dagegen erledigt — da gibt es nichts
    // zu wiederholen.
    if (res.failed > 0) {
      const attempts = (msg.get('send_attempts') || 0) + 1;
      msg.set('send_attempts', attempts);
      // Nach der letzten Wiederholung abhaken, sonst läuft der Job jede Minute
      // weiter dagegen. Dass es nicht geklappt hat, steht am Zähler.
      if (attempts >= MAX_SEND_ATTEMPTS) msg.set('sent_at', new Date().toISOString());
      $app.saveNoValidate(msg);
      continue;
    }

    msg.set('sent_at', new Date().toISOString());
    $app.saveNoValidate(msg);
  }
});

// ── 2. Reset stale streaks ─────────────────────────────────────
// A streak survives if the last visit was this week or last week (1-week grace).
// Anyone who hasn't visited in > 1 full week loses their streak.
cronAdd('streak-reset', '5 3 * * *', () => {
  const lib = require(`${__hooks}/lib/points.js`);
  const now = new Date();
  const thisWeek = lib.isoWeek(now);
  let users;
  try {
    users = $app.findRecordsByFilter('users', 'streak_weeks > 0', '', 0, 0);
  } catch (_) {
    return;
  }
  for (const u of users) {
    const last = `${u.get('streak_last_visit')}`.trim();
    if (!last) {
      u.set('streak_weeks', 0);
      $app.saveNoValidate(u);
      // user_badges.progress is a cache — without this the old streak count
      // stays visible ("1/2 Wochen in Folge") even though the streak is gone.
      try { lib.checkBadges(u); } catch (_) {}
      continue;
    }
    const lastWeek = lib.isoWeek(new Date(last));
    // Allow current week and the immediately preceding week (grace).
    // „Vorwoche" beantwortet lib.isWeekAdjacent — dieselbe Prüfung, die auch
    // updateStreak und streakFromVisits benutzen. Sie kennt die Länge des
    // Vorjahres, sodass eine ausgelassene 53. Woche als Lücke gilt.
    if (thisWeek !== lastWeek && !lib.isWeekAdjacent(lastWeek, thisWeek)) {
      u.set('streak_weeks', 0);
      $app.saveNoValidate(u);
      try { lib.checkBadges(u); } catch (_) {}
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
  let camps;
  try {
    camps = $app.findRecordsByFilter('campaigns', 'badge != ""', '', 0, 0);
  } catch (_) {
    return;
  }
  for (const camp of camps) {
    const badgeId = `${camp.get('badge')}`;
    let badge;
    try { badge = $app.findRecordById('badges', badgeId); } catch (_) { continue; }

    // Gestufte Badges laufen ausschließlich über computeProgress/checkBadges —
    // grantBadge würde sie sofort auf Gold setzen und die Stufen überspringen.
    if (`${badge.get('kind')}` === 'tiered') {
      let counts = [];
      try {
        counts = $app.findRecordsByFilter('action_counts', 'campaign = {:camp} && count > 0', '', 0, 0, { camp: camp.id });
      } catch (_) {}
      for (const c of counts) {
        try { lib.checkBadges($app.findRecordById('users', `${c.get('user')}`)); } catch (_) {}
      }
      continue;
    }

    const seen = {};
    const grant = (uid) => {
      if (!uid || seen[uid]) return;
      seen[uid] = true;
      try { lib.grantBadge($app.findRecordById('users', uid), badge); } catch (_) {}
    };

    // a) Wer der Aktion ein Teil beigesteuert hat.
    try {
      const counts = $app.findRecordsByFilter('action_counts', 'campaign = {:camp} && count > 0', '', 0, 0, { camp: camp.id });
      for (const c of counts) grant(`${c.get('user')}`);
    } catch (_) {}

    // b) Wer im Aktionszeitraum da war.
    const start = `${camp.get('starts_at')}`.replace('T', ' ');
    const end = `${camp.get('ends_at')}`.replace('T', ' ');
    try {
      const visits = $app.findRecordsByFilter(
        'visits',
        'checkin_at >= {:start} && checkin_at <= {:end}',
        '',
        0,
        0,
        { start, end }
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
  const now = new Date();
  // Datum in der Ladenzeitzone, nicht in der des Servers.
  const heute = lib.storeParts(now);
  if (heute.month !== 11 || heute.day !== 31) return; // only Dec 31

  let badges;
  try {
    badges = $app.findRecordsByFilter('badges', 'kind = "single" && trigger_type = "years_active"', '', 0, 0);
  } catch (_) { return; }
  if (!badges.length) return;

  let users;
  try { users = $app.findRecordsByFilter('users', '1=1', '', 0, 0); } catch (_) { return; }

  for (const u of users) {
    let visits;
    try { visits = $app.findRecordsByFilter('visits', 'user = {:user}', '', 0, 0, { user: u.id }); } catch (_) { continue; }
    const years = {};
    for (const v of visits) {
      const d = new Date(`${v.get('checkin_at')}`);
      if (isNaN(d.getTime())) continue;
      // Ein Besuch am 1.1. um 00:30 Ortszeit gehört ins neue Jahr.
      years[lib.storeParts(d).year] = true;
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
