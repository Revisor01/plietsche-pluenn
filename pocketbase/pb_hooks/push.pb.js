/// <reference path="../pb_data/types.d.ts" />

// POST /api/pp/push/register — upsert the caller's Expo push token.
// Body: { expo_token, platform? }
// Uses the admin DAO so the unique-token upsert works even though the
// push_devices list rule is restricted to the owner.
routerAdd('POST', '/api/pp/push/register', (c) => {
  const auth = c.get('authRecord');
  if (!auth) throw new ApiError(401, 'Nicht angemeldet');

  const data = $apis.requestInfo(c).data;
  const token = `${data.expo_token || ''}`.trim();
  if (!token) throw new ApiError(400, 'Kein Token');
  const platform = `${data.platform || 'ios'}`.trim();

  const dao = $app.dao();
  let rec;
  try {
    // One row per token; move it to the current user if it already exists.
    rec = dao.findFirstRecordByFilter('push_devices', `expo_token = "${token}"`);
  } catch (_) {
    rec = new Record(dao.findCollectionByNameOrId('push_devices'));
    rec.set('expo_token', token);
  }
  rec.set('user', auth.id);
  rec.set('platform', platform === 'android' ? 'android' : 'ios');
  rec.set('last_seen', new Date().toISOString());
  dao.saveRecord(rec);

  return c.json(200, { ok: true });
});

// POST /api/pp/push/unregister — remove the caller's token (DSGVO opt-out).
routerAdd('POST', '/api/pp/push/unregister', (c) => {
  const auth = c.get('authRecord');
  if (!auth) throw new ApiError(401, 'Nicht angemeldet');
  const data = $apis.requestInfo(c).data;
  const token = `${data.expo_token || ''}`.trim();
  if (!token) throw new ApiError(400, 'Kein Token');
  const dao = $app.dao();
  try {
    const rec = dao.findFirstRecordByFilter('push_devices', `expo_token = "${token}" && user = "${auth.id}"`);
    dao.deleteRecord(rec);
  } catch (_) {}
  return c.json(200, { ok: true });
});
