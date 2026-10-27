// Expo-Push mit Bereinigung toter Token; immer über $app, daher nie in einer Transaktion.

const EXPO_URL = 'https://exp.host/--/api/v2/push/send';

// ── Kanäle: Quelle docs/push-channels.md, Kennungen gleich wie in mobile/lib/push.ts; interruptionLevel ist die iOS-Seite ──
const CHANNELS = {
  streak: { channelId: 'streak', interruptionLevel: 'time-sensitive' },
  campaign: { channelId: 'campaign', interruptionLevel: 'active' },
  badge: { channelId: 'badge', interruptionLevel: 'active' },
  other: { channelId: 'other', interruptionLevel: 'passive' },
};

// Unbekanntes wie „Sonstiges“.
function channelFor(category) {
  return CHANNELS[category] || CHANNELS.other;
}

module.exports = {
  CHANNELS,
  channelFor,

  // Token der Zielgruppe mit Opt-in je Kategorie, [{token, userId}].
  collectTokens(segment, role, category) {
    // Map message category → user opt-in flag.
    const flag =
      category === 'streak' ? 'push_streak_enabled'
      : category === 'campaign' ? 'push_campaign_enabled'
      : category === 'badge' ? 'push_badge_enabled'
      : 'push_other_enabled';

    let users;
    try {
      users = $app.findRecordsByFilter('users', '1=1', '', 0, 0);
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
        devices = $app.findRecordsByFilter('push_devices', 'user = {:user}', '', 0, 0, { user: u.id });
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

  // Token einer Person mit Opt-in, für persönliche Bestätigungen.
  tokensForUser(user, category) {
    const flag =
      category === 'streak' ? 'push_streak_enabled'
      : category === 'campaign' ? 'push_campaign_enabled'
      : category === 'badge' ? 'push_badge_enabled'
      : 'push_other_enabled';
    if (!user.get(flag)) return [];
    let devices;
    try {
      devices = $app.findRecordsByFilter('push_devices', 'user = {:user}', '', 0, 0, { user: user.id });
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

  // Gibt { sent, failed } zurück, damit der Aufrufer „nichts zu senden“ von „ging nicht raus“ unterscheidet; `category` wählt Kanal und Dringlichkeit.
  send(targets, title, body, deepLink, category) {
    if (!targets.length) return { sent: 0, failed: 0 };
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
            try { $app.delete($app.findRecordById('push_devices', batch[j]._deviceId || targets[i + j].deviceId)); } catch (_) {}
          }
        }
      } catch (_) {
        // Als gescheitert vermerken, damit der nächste Lauf es erneut versucht.
        failed++;
      }
    }
    return { sent, failed };
  },
};
