// Expo push helper for Plietsche Plünn.
// Sends to https://exp.host/--/api/v2/push/send and prunes dead tokens.

const EXPO_URL = 'https://exp.host/--/api/v2/push/send';

// ── Kanäle und Dringlichkeit ──────────────────────────────────────────────
//
// QUELLE DER WAHRHEIT: docs/push-channels.md. Diese Tabelle ist die Kopie fürs
// Backend, `mobile/lib/push.ts` hält die Kopie für die App. Die Kennungen
// MÜSSEN in beiden Dateien gleich lauten: Die App legt die Kanäle unter diesen
// Namen an, das Backend adressiert sie. Wer hier etwas ändert, ändert beide
// Stellen und die Tabelle in der Doku — sonst landen Nachrichten wieder im
// Standardkanal.
//
// interruptionLevel ist die iOS-Seite derselben Entscheidung:
//   time-sensitive — darf auch ein Fokus durchbrechen (Serie läuft heute ab)
//   active         — normaler Ton und Banner
//   passive        — still in die Mitteilungszentrale, kein Ton
const CHANNELS = {
  streak: { channelId: 'streak', interruptionLevel: 'time-sensitive' },
  campaign: { channelId: 'campaign', interruptionLevel: 'active' },
  badge: { channelId: 'badge', interruptionLevel: 'active' },
  other: { channelId: 'other', interruptionLevel: 'passive' },
};

// Kategorie → Kanal. Unbekanntes wie „Sonstiges" behandeln, genauso wie die
// Opt-in-Zuordnung oben.
function channelFor(category) {
  return CHANNELS[category] || CHANNELS.other;
}

module.exports = {
  CHANNELS,
  channelFor,

  // Collect Expo push tokens for the users a message targets, honouring each
  // user's per-category opt-in flag. Returns [{token, userId}].
  collectTokens(segment, role, category) {
    const dao = $app.dao();
    // Map message category → user opt-in flag.
    const flag =
      category === 'streak' ? 'push_streak_enabled'
      : category === 'campaign' ? 'push_campaign_enabled'
      : category === 'badge' ? 'push_badge_enabled'
      : 'push_other_enabled';

    let users;
    try {
      users = dao.findRecordsByFilter('users', '1=1', '', 0, 0);
    } catch (_) {
      return [];
    }

    const now = new Date();
    const out = [];
    for (const u of users) {
      if (!u.get(flag)) continue; // opted out of this category

      // Segment filter.
      if (segment === 'by_role' && role && `${u.get('role')}` !== role) continue;
      if (segment === 'streak2plus' && (u.get('streak_weeks') || 0) < 2) continue;
      if (segment === 'inactive14d') {
        const last = `${u.get('streak_last_visit')}`.trim();
        if (last) {
          const days = (now - new Date(last)) / 86400000;
          if (days < 14) continue;
        }
      }

      let devices;
      try {
        devices = dao.findRecordsByFilter('push_devices', `user = "${u.id}"`, '', 0, 0);
      } catch (_) {
        devices = [];
      }
      for (const d of devices) {
        const tok = `${d.get('expo_token')}`.trim();
        if (tok) out.push({ token: tok, userId: u.id, deviceId: d.id });
      }
    }
    return out;
  },

  // Tokens of a single user, honouring their opt-in flag for this category.
  // Used for immediate, personal pushes (points credited) — collectTokens walks
  // every user and is meant for campaigns.
  tokensForUser(user, category) {
    const flag =
      category === 'streak' ? 'push_streak_enabled'
      : category === 'campaign' ? 'push_campaign_enabled'
      : category === 'badge' ? 'push_badge_enabled'
      : 'push_other_enabled';
    if (!user.get(flag)) return [];
    let devices;
    try {
      devices = $app.dao().findRecordsByFilter('push_devices', `user = "${user.id}"`, '', 0, 0);
    } catch (_) {
      return [];
    }
    const out = [];
    for (const d of devices) {
      const tok = `${d.get('expo_token')}`.trim();
      if (tok) out.push({ token: tok, userId: user.id, deviceId: d.id });
    }
    return out;
  },

  // Send a batch of messages to Expo. Removes tokens Expo reports as dead.
  //
  // Rückgabe: { sent, failed }. `failed` zählt die Stapel, die Expo gar nicht
  // erreicht haben — daran erkennt der Aufrufer den Unterschied zwischen „es
  // gab nichts zu senden" und „es ging nicht raus". Ohne diese Unterscheidung
  // gilt eine Nachricht auch dann als verschickt, wenn Expo nicht erreichbar
  // war, und der Cronjob holt sie nie wieder.
  // `category` ist dieselbe Kategorie, mit der die Ziele gesammelt wurden. Sie
  // bestimmt den Android-Kanal und die iOS-Dringlichkeit. Fehlt sie, gilt
  // „Sonstiges" — eine Nachricht geht dann immer noch raus, nur leiser.
  //
  // Kennt ein Gerät den Kanal nicht (App-Stand vor den Kanälen), stellt
  // expo-notifications über seinen Rückfallkanal zu (Wichtigkeit HIGH). Die
  // Nachricht geht also nicht verloren und bleibt hörbar — siehe
  // docs/push-channels.md.
  send(targets, title, body, deepLink, category) {
    if (!targets.length) return { sent: 0, failed: 0 };
    const dao = $app.dao();
    const ch = channelFor(category);
    const messages = targets.map((t) => ({
      to: t.token,
      title,
      body,
      sound: 'default',
      channelId: ch.channelId,
      interruptionLevel: ch.interruptionLevel,
      data: deepLink ? { deep_link: deepLink } : {},
    }));

    // Expo accepts up to 100 messages per request.
    let sent = 0;
    let failed = 0;
    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100);
      try {
        const res = $http.send({
          url: EXPO_URL,
          method: 'POST',
          body: JSON.stringify(batch),
          headers: { 'Content-Type': 'application/json' },
          timeout: 30,
        });
        const data = res.json && res.json.data ? res.json.data : [];
        for (let j = 0; j < data.length; j++) {
          const ticket = data[j];
          if (ticket && ticket.status === 'ok') {
            sent++;
          } else if (ticket && ticket.details && ticket.details.error === 'DeviceNotRegistered') {
            // Prune the dead token.
            try { dao.deleteRecord(dao.findRecordById('push_devices', batch[j]._deviceId || targets[i + j].deviceId)); } catch (_) {}
          }
        }
      } catch (_) {
        // Expo nicht erreichbar. Der Stapel wird als gescheitert vermerkt,
        // damit der Aufrufer die Nachricht stehen lassen und beim nächsten
        // Lauf erneut versuchen kann.
        failed++;
      }
    }
    return { sent, failed };
  },
};
