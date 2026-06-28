// Expo push helper for Plietsche Plünn.
// Sends to https://exp.host/--/api/v2/push/send and prunes dead tokens.

const EXPO_URL = 'https://exp.host/--/api/v2/push/send';

module.exports = {
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

  // Send a batch of messages to Expo. Removes tokens Expo reports as dead.
  send(targets, title, body, deepLink) {
    if (!targets.length) return { sent: 0 };
    const dao = $app.dao();
    const messages = targets.map((t) => ({
      to: t.token,
      title,
      body,
      sound: 'default',
      data: deepLink ? { deep_link: deepLink } : {},
    }));

    // Expo accepts up to 100 messages per request.
    let sent = 0;
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
        // network error — skip this batch, try next run
      }
    }
    return { sent };
  },
};
